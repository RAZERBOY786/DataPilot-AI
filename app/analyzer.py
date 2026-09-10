import json
import math
import re
import sqlite3
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd


def _safe_float(v: Any) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, 6)


def _read_sqlite(path: Path) -> pd.DataFrame:
    conn = sqlite3.connect(str(path))
    tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table'", conn)
    if tables.empty:
        conn.close()
        return pd.DataFrame()
    name = tables.iloc[0]["name"]
    df = pd.read_sql_query(f'SELECT * FROM "{name}"', conn)
    conn.close()
    return df


def read_dataframe(file_path: Path, filename: str) -> Optional[pd.DataFrame]:
    """Parse a file with pandas into a DataFrame, or return None on any failure."""
    ext = Path(filename).suffix.lower()
    try:
        if ext == ".csv":
            return pd.read_csv(file_path)
        if ext in (".xlsx", ".xls"):
            return pd.read_excel(file_path)
        if ext == ".json":
            return pd.read_json(file_path)
        if ext == ".parquet":
            return pd.read_parquet(file_path)
        if ext == ".sqlite":
            return _read_sqlite(file_path)
    except Exception:  # noqa: BLE001 - analysis must never crash the app
        return None
    return None


def _infer_type(series: pd.Series) -> str:
    if series.dtype == object or series.dtype.kind == "S":
        sample = series.dropna()
        if sample.empty:
            return "string"
        if pd.to_datetime(sample, errors="coerce").notna().mean() > 0.8:
            return "datetime"
        return "string"
    if series.dtype.kind in "iuf":
        return "numeric"
    if series.dtype.kind == "b":
        return "boolean"
    if series.dtype.kind == "M":
        return "datetime"
    return str(series.dtype)


def _compute_stats(series: pd.Series, dtype: str) -> dict:
    if dtype != "numeric":
        vals = series.dropna()
        if vals.empty:
            return {}
        return {
            "min_length": int(vals.astype(str).str.len().min()) if dtype != "datetime" else None,
            "max_length": int(vals.astype(str).str.len().max()) if dtype != "datetime" else None,
            "unique": int(vals.nunique()),
        }
    nums = pd.to_numeric(series, errors="coerce").dropna()
    if nums.empty:
        return {}
    return {
        "min": _safe_float(nums.min()),
        "max": _safe_float(nums.max()),
        "mean": _safe_float(nums.mean()),
        "median": _safe_float(nums.median()),
        "std": _safe_float(nums.std()),
    }


def _distribution_type(dtype: str, stats: dict) -> str:
    if dtype == "numeric":
        if stats.get("mean") is not None and stats.get("median") is not None:
            if abs(float(stats["mean"]) - float(stats["median"])) < 0.001:
                return "normal"
            if float(stats["mean"]) > float(stats["median"]):
                return "right_skewed"
            return "left_skewed"
        return "unknown"
    if dtype == "datetime":
        return "temporal"
    return "categorical"


def analyze_file(file_path: Path, filename: str) -> dict:
    """Parse a file with pandas and produce row/column counts plus per-column profiles.

    Returns a dict shaped for direct DB inserts and is safe to call on any file.
    """
    ext = Path(filename).suffix.lower()
    try:
        df = read_dataframe(file_path, filename)
    except Exception as exc:  # noqa: BLE001 - we must not fail uploads on parse errors
        df = None

    if df is None:
        if ext not in (".csv", ".xlsx", ".xls", ".json", ".parquet", ".sqlite"):
            return {"row_count": 0, "column_count": 0, "schema": [], "profiles": [], "issues": 0, "error": f"unsupported type {ext}"}
        return {"row_count": 0, "column_count": 0, "schema": [], "profiles": [], "issues": 0, "error": "failed to parse file"}

    if df.empty or df.columns.tolist() in ([0], []):
        cols = list(df.columns)
        return {"row_count": 0, "column_count": len(cols), "schema": [], "profiles": [], "issues": 0, "error": "file contains no rows"}

    row_count = int(len(df))
    profiles = []
    schema = []
    issues = 0
    for col in df.columns:
        series = df[col]
        missing = int(series.isna().sum())
        missing_pct = round(missing / row_count * 100, 1) if row_count else 0.0
        distinct = int(series.nunique(dropna=True)) if row_count else 0
        dtype = _infer_type(series)
        stats = _compute_stats(series, dtype)
        flags = []
        if row_count and missing_pct > 30:
            flags.append("high_missing")
            issues += 1
        if (
            dtype == "numeric"
            and row_count > missing + 1
            and _safe_float(stats.get("std")) is not None
            and float(stats["std"]) == 0
        ):
            flags.append("constant")
            issues += 1
        if row_count and distinct == 1 and row_count > 1:
            flags.append("single_value")
            issues += 1
        if distinct == len(series.dropna()) and missing == 0 and row_count > 1 and distinct > 1:
            flags.append("unique_values")
            issues += 1
        if missing and dtype == "datetime":
            flags.append("temporal_gaps")
            issues += 1
        profiles.append(
            {
                "column_name": str(col),
                "data_type": dtype,
                "distinct_count": distinct,
                "missing_count": missing,
                "missing_pct": missing_pct,
                "stats_json": stats,
                "distribution_type": _distribution_type(dtype, stats),
                "integrity_flags": flags,
            }
        )
        schema.append({"name": str(col), "type": dtype, "nullable": missing > 0})

    return {
        "row_count": row_count,
        "column_count": int(len(df.columns)),
        "schema": schema,
        "profiles": profiles,
        "issues": issues,
        "error": None,
    }


def health_score(issues: int, missing_ratio: float) -> int:
    score = 100 - issues * 4 - int(missing_ratio * 100)
    return max(0, min(100, score))


def _json_safe(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, (float, np.floating)):
        f = _safe_float(v)
        return f
    if isinstance(v, (np.integer,)):
        return int(v)
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, np.ndarray):
        return v.tolist()
    return str(v)


def preview_file(file_path: Path, filename: str, limit: int = 20) -> dict:
    """Return the first `limit` rows of a file as JSON-safe column names + dicts."""
    ext = Path(filename).suffix.lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(file_path, nrows=limit)
        elif ext in (".xlsx", ".xls"):
            df = pd.read_excel(file_path, nrows=limit)
        elif ext == ".json":
            df = pd.read_json(file_path).head(limit)
        elif ext == ".parquet":
            df = pd.read_parquet(file_path).head(limit)
        elif ext == ".sqlite":
            df = _read_sqlite(file_path).head(limit)
        else:
            return {"columns": [], "rows": []}
    except Exception:  # noqa: BLE001
        return {"columns": [], "rows": []}

    df = df.head(limit)
    columns = [{"name": str(c), "type": _infer_type(df[c])} for c in df.columns]
    records = []
    for _, r in df.iterrows():
        records.append({str(c): _json_safe(r[c]) for c in df.columns})
    return {"columns": columns, "rows": records, "returned": len(records)}


# ── Copilot data-question answering (local, no external LLM required) ──

def _fnum(v: Any) -> str:
    if v is None:
        return "—"
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return "—"
        return f"{int(f):,}" if f == int(f) else f"{f:,.2f}"
    except (TypeError, ValueError):
        return str(v)


def _fmt_cell(v: Any) -> str:
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return "—"
    if isinstance(v, (bool, np.bool_)):
        return str(v)
    if isinstance(v, (int, np.integer)):
        return f"{int(v):,}"
    if isinstance(v, (float, np.floating)):
        return _fnum(v)
    s = str(v)
    return s[:60]


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _table(title: str, header: list, rows: list) -> str:
    body = [header] + [[str(c) for c in r] for r in rows]
    widths = [max(len(r[i]) for r in body) for i in range(len(header))]
    out = [] if not title else [title, ""]
    out.append("  ".join(h.ljust(w) for h, w in zip(header, widths)))
    out.append("  ".join("-" * w for w in widths))
    for r in body[1:]:
        out.append("  ".join(r[i].ljust(widths[i]) for i in range(len(header))))
    return "\n".join(out)


def _mentioned_columns(text: str, columns: list) -> list:
    ntext = _norm(text)
    found = []
    for c in columns:
        n = _norm(str(c))
        if len(n) >= 2 and n in ntext:
            found.append(c)
    return found


def _group_column(text: str, df: pd.DataFrame) -> Optional[str]:
    tl = text.lower()
    m = re.search(r"\b(?:by|per|for each|for every|grouped by|group by)\s+([A-Za-z_][\w\s]*?)(?:[,.;]|$)", tl)
    phrase = ""
    if m:
        phrase = re.sub(r"\b(sorted|descending|ascending|top|highest|lowest)\b.*$", "", m.group(1)).strip()
    nonnum = [c for c in df.columns if _infer_type(df[c]) != "numeric"]
    if phrase:
        for c in nonnum:
            if _norm(str(c)) and (phrase.startswith(str(c)) or _norm(str(c)) in _norm(phrase)):
                return c
    mentioned = _mentioned_columns(tl, nonnum)
    if mentioned:
        return mentioned[0]
    return None


AGG_KEYWORDS = [
    ("sum", ["sum", "total", "totals"]),
    ("mean", ["average", "mean", "avg"]),
    ("median", ["median"]),
    ("min", ["minimum", "min of", "lowest value"]),
    ("max", ["maximum", "max of", "highest value"]),
    ("count", ["count", "how many"]),
]


def answer_question(text: str, df: Optional[pd.DataFrame], dataset_name: str) -> Optional[str]:
    """Answer a natural-language question about a DataFrame with real computations.

    Returns a formatted markdown string, or None if the question doesn't match
    a supported intent so callers can fall back to templated replies.
    """
    if df is None or df.empty:
        return None
    tl = text.lower()

    # 1) schema / column questions
    if any(k in tl for k in ["what columns", "schema", "which columns", "list columns", "column names", "columns in the data"]):
        rows = []
        for c in df.columns:
            dtype = _infer_type(df[c])
            non_null = int(df[c].count())
            missing = round(df[c].isna().mean() * 100, 1) if len(df) else 0.0
            rows.append([str(c), dtype, f"{non_null:,}", f"{missing}%"])
        return _table(f"Schema of `{dataset_name}` ({len(df):,} rows)", ["column", "type", "non-null", "missing %"], rows)

    # 2) row preview
    m = re.search(r"(?:first|last|top|show|print|display|peek)\s+(\d+)\s*(?:rows?|records?|entries?)?", tl)
    if m:
        n = max(1, min(int(m.group(1)), 50))
        sub = df.tail(n) if "last" in tl else df.head(n)
        rows = [[_fmt_cell(v) for v in r] for r in sub.itertuples(index=False, name=None)]
        return _table(f"{'Last' if 'last' in tl else 'First'} {n} rows of `{dataset_name}`", [str(c) for c in df.columns], rows)

    # 3) overall stats / describe
    if any(k in tl for k in ["describe", "summary", "statistics", "distribution", "stats for", "overview of the data"]):
        numeric = [c for c in df.columns if _infer_type(df[c]) == "numeric"]
        if not numeric:
            return f"`{dataset_name}` has no numeric columns. Columns: {', '.join(map(str, df.columns))}."
        rows = []
        for c in numeric:
            s = pd.to_numeric(df[c], errors="coerce").dropna()
            rows.append([str(c), f"{int(s.count()):,}", _fnum(s.mean()), _fnum(s.min()), _fnum(s.max()), _fnum(s.median()), _fnum(s.std())])
        return _table(f"Summary statistics for `{dataset_name}`", ["column", "count", "mean", "min", "max", "median", "std"], rows)

    # 4) correlations
    if "correlat" in tl:
        numeric = [c for c in df.columns if _infer_type(df[c]) == "numeric"]
        if len(numeric) < 2:
            return f"Need at least 2 numeric columns to compute correlations in `{dataset_name}`."
        num = numeric[:8]
        corr = df[num].corr()
        header = [""] + [str(c)[:14] for c in num]
        rows = [[str(c)[:14]] + [_fnum(corr.iloc[i, j]) for j in range(len(num))] for i, c in enumerate(num)]
        return _table(f"Correlation matrix of `{dataset_name}` (Pearson)", header, rows)

    # 5) aggregation with optional group-by (the core "answer the data" feature)
    agg = next((key for key, kws in AGG_KEYWORDS if any(k in tl for k in kws)), None)
    if agg:
        numeric = [c for c in df.columns if _infer_type(df[c]) == "numeric"]
        mentioned = _mentioned_columns(tl, numeric)
        gb = _group_column(tl, df)
        col = None
        if agg == "count":
            col = next((c for c in mentioned if c not in (gb,)), None)
        else:
            col = mentioned[0] if mentioned else numeric[0]
        rows_limit = 25
        mtop = re.search(r"\btop\s+(\d+)", tl)
        if mtop:
            rows_limit = max(1, min(int(mtop.group(1)), 100))
        label = {"sum": "total", "mean": "average", "median": "median", "min": "minimum", "max": "maximum", "count": "count"}[agg]

        if col is None:
            return f"`{dataset_name}` has **{len(df):,} rows** and **{len(df.columns)} columns**."

        if gb is None:
            vals = pd.to_numeric(df[col], errors="coerce").dropna()
            if agg == "count":
                result = int(vals.count()) if mentioned else len(df)
            elif vals.empty:
                result = None
            else:
                result = {"sum": vals.sum(), "mean": vals.mean(), "median": vals.median(), "min": vals.min(), "max": vals.max()}[agg]
            if result is None:
                return f"No non-null values found in `{col}`."
            return f"The **{label}** of `{col}` in `{dataset_name}` is **{_fnum(result)}**."

        grouped = df[[gb, col]].copy()
        grouped[col] = pd.to_numeric(grouped[col], errors="coerce")
        if agg == "count":
            res = grouped.groupby(gb)[col].agg(["count", "nunique"]).reset_index()
            rows = [[_fmt_cell(r[0]), f"{int(r[1]):,}", f"{int(r[2]):,}"] for r in res.itertuples(index=False, name=None)]
            rows.sort(key=lambda r: -int(r[1].replace(",", "")))
            return _table(f"{label.capitalize()} of records by `{gb}` in `{dataset_name}`", [str(gb), "records", "unique values"], rows[:rows_limit])
        res = grouped.groupby(gb, dropna=False)[col].agg(agg).reset_index()
        rows = [[_fmt_cell(r[0]), _fnum(r[1])] for r in res.itertuples(index=False, name=None)]
        rows.sort(key=lambda r: (r[1] == "—", -float(r[1].replace(",", "")) if r[1] != "—" else 0))
        return _table(f"{label.capitalize()} of `{col}` by `{gb}` in `{dataset_name}`", [str(gb), label], rows[:rows_limit])

    return None