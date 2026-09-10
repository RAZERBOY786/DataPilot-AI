from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
import os
import shutil
import urllib.request
import urllib.error
from typing import Optional
from uuid import uuid4

from .database import init_db, get_db
from .auth import hash_password, verify_password, create_access_token, get_current_user
from .analyzer import analyze_file, health_score, preview_file, answer_question, read_dataframe
from .models import (
    UserRegister, UserLogin, Token, DatasetCreate, DatasetUpdate,
    ProfileCreate, ConversationCreate, MessageCreate, WorkspaceUpdate,
    TeamInvite, ApiKeyCreate, WebhookCreate,
)

app = FastAPI(title="DataPilot AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    db = get_db()
    db.execute("SELECT 1")
    db.close()
    return {"status": "ok", "service": "DataPilot AI API"}


# ── Stats overview (used by landing + sidebars) ──

@app.get("/api/stats/overview")
def stats_overview(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        "SELECT row_count, column_count, file_size FROM datasets WHERE user_id = ?",
        (user["id"],),
    ).fetchall()
    db.close()
    total_rows = sum(r["row_count"] or 0 for r in rows)
    total_cols = sum(r["column_count"] or 0 for r in rows)
    storage = sum(r["file_size"] or 0 for r in rows)
    return {
        "datasets": len(rows),
        "rows": total_rows,
        "columns": total_cols,
        "storage_bytes": storage,
        "storage_mb": round(storage / 1024 / 1024, 2),
    }


# ── Auth ──

@app.post("/api/auth/register", response_model=Token)
def register(body: UserRegister):
    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        db.close()
        raise HTTPException(409, "Email already registered")
    hashed = hash_password(body.password)
    cur = db.execute(
        "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
        (body.email, body.name, hashed),
    )
    uid = cur.lastrowid
    db.execute("INSERT INTO workspace_settings (user_id) VALUES (?)", (uid,))
    db.commit()
    user = dict(db.execute("SELECT id, email, name, role FROM users WHERE id = ?", (uid,)).fetchone())
    db.close()
    token = create_access_token(user)
    return {"access_token": token, "user": user}


@app.post("/api/auth/login", response_model=Token)
def login(body: UserLogin):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    db.close()
    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    user = {"id": row["id"], "email": row["email"], "name": row["name"], "role": row["role"]}
    token = create_access_token(user)
    return {"access_token": token, "user": user}


@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    return user


# ── Datasets ──

def serialize_dataset(row) -> dict:
    data = dict(row)
    try:
        data["schema_json"] = json.loads(data.get("schema_json") or "{}")
    except json.JSONDecodeError:
        data["schema_json"] = {}
    try:
        data["tags"] = json.loads(data.get("tags") or "[]")
    except json.JSONDecodeError:
        data["tags"] = []
    return data


@app.get("/api/datasets")
def list_datasets(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM datasets WHERE user_id = ? ORDER BY updated_at DESC", (user["id"],)).fetchall()
    db.close()
    return [serialize_dataset(r) for r in rows]


@app.get("/api/datasets/{dataset_id}")
def get_dataset(dataset_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM datasets WHERE id = ? AND user_id = ?", (dataset_id, user["id"])).fetchone()
    db.close()
    if not row:
        raise HTTPException(404, "Dataset not found")
    return serialize_dataset(row)


@app.get("/api/datasets/{dataset_id}/rows")
def preview_rows(dataset_id: int, limit: int = 20, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM datasets WHERE id = ? AND user_id = ?", (dataset_id, user["id"])).fetchone()
    db.close()
    if not row or not row["file_path"]:
        raise HTTPException(404, "Dataset not found")
    path = Path(row["file_path"])
    if not path.exists():
        return {"columns": [], "rows": [], "message": "Source file is missing from disk."}
    data = preview_file(path, row["name"], limit=max(1, min(int(limit), 100)))
    data["dataset_id"] = dataset_id
    return data


@app.post("/api/datasets", response_model=None)
def create_dataset(body: DatasetCreate, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute("INSERT INTO datasets (user_id, name) VALUES (?, ?)", (user["id"], body.name))
    db.commit()
    row = db.execute("SELECT * FROM datasets WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return serialize_dataset(row)


@app.post("/api/datasets/upload", response_model=None)
def upload_dataset(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext = Path(file.filename).suffix.lower()
    allowed = {".csv", ".xlsx", ".xls", ".json", ".parquet", ".sqlite"}
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext} not allowed. Use {', '.join(sorted(allowed))}.")
    filename = f"{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size = dest.stat().st_size

    analysis = analyze_file(dest, file.filename)

    if analysis["error"] is None or (analysis["row_count"] == 0 and analysis["profiles"]):
        missing_ratio = (
            sum(p["missing_pct"] for p in analysis["profiles"]) / len(analysis["profiles"]) / 100
            if analysis["profiles"]
            else 0
        )
        hscore = health_score(analysis["issues"], missing_ratio)
        status = "profiled" if analysis["row_count"] > 0 else "raw"
    else:
        hscore = 0
        status = "raw"

    db = get_db()
    cur = db.execute(
        """INSERT INTO datasets (user_id, name, file_path, file_size, row_count, column_count, status, health_score, schema_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            user["id"], file.filename, str(dest), size,
            analysis["row_count"], analysis["column_count"],
            status, hscore, json.dumps(analysis["schema"] or []),
        ),
    )
    dataset_id = cur.lastrowid

    for p in analysis["profiles"]:
        db.execute(
            """INSERT INTO profiles (dataset_id, column_name, data_type, distinct_count, missing_count,
               missing_pct, stats_json, distribution_type, integrity_flags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                dataset_id, p["column_name"], p["data_type"], p["distinct_count"],
                p["missing_count"], p["missing_pct"],
                json.dumps(p["stats_json"]), p["distribution_type"],
                json.dumps(p["integrity_flags"]),
            ),
        )
    db.commit()
    row = db.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    db.close()
    result = serialize_dataset(row)
    result["profiles_count"] = len(analysis["profiles"])
    result["issues"] = analysis["issues"]
    result["analysis_error"] = analysis["error"]
    return result


@app.put("/api/datasets/{dataset_id}")
def update_dataset(dataset_id: int, body: DatasetUpdate, user=Depends(get_current_user)):
    db = get_db()
    existing = db.execute("SELECT * FROM datasets WHERE id = ? AND user_id = ?", (dataset_id, user["id"])).fetchone()
    if not existing:
        db.close()
        raise HTTPException(404, "Dataset not found")
    db.execute(
        """UPDATE datasets SET
            name = COALESCE(?, name),
            status = COALESCE(?, status),
            tags = COALESCE(?, tags),
            health_score = COALESCE(?, health_score),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?""",
        (body.name, body.status, body.tags, body.health_score, dataset_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    db.close()
    return serialize_dataset(row)


@app.delete("/api/datasets/{dataset_id}")
def delete_dataset(dataset_id: int, user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT file_path FROM datasets WHERE id = ? AND user_id = ?", (dataset_id, user["id"])).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, "Dataset not found")
    db.execute("DELETE FROM profiles WHERE dataset_id = ?", (dataset_id,))
    db.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE dataset_id = ?)", (dataset_id,))
    db.execute("DELETE FROM conversations WHERE dataset_id = ?", (dataset_id,))
    db.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    db.commit()
    db.close()
    if row["file_path"]:
        try:
            Path(row["file_path"]).unlink(missing_ok=True)
        except Exception:  # noqa: BLE001
            pass
    return {"deleted": True, "id": dataset_id}


# ── Profiles ──

@app.get("/api/profiles/dataset/{dataset_id}")
def list_profiles(dataset_id: int, user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        """SELECT p.* FROM profiles p
           JOIN datasets d ON d.id = p.dataset_id
           WHERE p.dataset_id = ? AND d.user_id = ?
           ORDER BY p.id""",
        (dataset_id, user["id"]),
    ).fetchall()
    db.close()
    result = []
    for r in rows:
        d = dict(r)
        try:
            d["stats_json"] = json.loads(d.get("stats_json") or "{}")
        except json.JSONDecodeError:
            d["stats_json"] = {}
        try:
            d["integrity_flags"] = json.loads(d.get("integrity_flags") or "[]")
        except json.JSONDecodeError:
            d["integrity_flags"] = []
        result.append(d)
    return result


@app.post("/api/profiles/dataset/{dataset_id}", response_model=None)
def create_profile(dataset_id: int, body: ProfileCreate, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        """INSERT INTO profiles (dataset_id, column_name, data_type, distinct_count,
           missing_count, missing_pct, stats_json, distribution_type, integrity_flags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (dataset_id, body.column_name, body.data_type, body.distinct_count,
         body.missing_count, body.missing_pct, json.dumps(body.stats_json),
         body.distribution_type, json.dumps(body.integrity_flags)),
    )
    db.commit()
    row = db.execute("SELECT * FROM profiles WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)


@app.delete("/api/profiles/{profile_id}")
def delete_profile(profile_id: int, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
    db.commit()
    db.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Profile not found")
    return {"deleted": True}


@app.delete("/api/profiles/dataset/{dataset_id}")
def clear_profiles(dataset_id: int, user=Depends(get_current_user)):
    db = get_db()
    db.execute("DELETE FROM profiles WHERE dataset_id = ?", (dataset_id,))
    db.commit()
    db.close()
    return {"deleted": True}


# ── Copilot ──

def _workspace_summary(user: dict) -> str:
    db = get_db()
    ds = db.execute(
        "SELECT name, row_count, column_count, health_score, status FROM datasets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 8",
        (user["id"],),
    ).fetchall()
    miss = db.execute(
        """SELECT dataset_id, round(avg(missing_pct),1) AS avg_missing
           FROM profiles
           GROUP BY dataset_id ORDER BY avg_missing DESC LIMIT 3"""
    ).fetchall()
    db.close()
    lines = [f"I found {len(ds)} dataset(s) in your workspace."]
    for d in ds:
        lines.append(
            f"- {d['name']}: {d['row_count']} rows x {d['column_count']} cols, health {d['health_score']}%, status {d['status']}."
        )
    if miss:
        lines.append("Columns with the most missing values: " + ", ".join(str(m["avg_missing"]) + "% (dataset #" + str(m["dataset_id"]) + ")" for m in miss) + ".")
    return "\n".join(lines)


_SYSTEM_PROMPT = """You are DataPilot AI, an expert data-analysis copilot. The user shares a workspace context with their uploaded datasets (name, rows, columns, health score, and column types). Answer their question using that context. When asked for SQL, return it in a markdown ```sql block. When asked about data quality, cite missing percentages and integrity issues. Be concise, concrete, and helpful. If the workspace has no datasets, tell the user to upload one first."""


def _workspace_llm_context(user: dict) -> str:
    db = get_db()
    rows = db.execute(
        "SELECT name, row_count, column_count, health_score, schema_json FROM datasets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5",
        (user["id"],),
    ).fetchall()
    db.close()
    if not rows:
        return "No datasets uploaded yet."
    lines = []
    for r in rows:
        try:
            schema = json.loads(r["schema_json"] or "[]")
        except json.JSONDecodeError:
            schema = []
        cols = ", ".join(f'{c.get("name")} ({c.get("type")})' for c in schema[:20]) or "n/a"
        lines.append(
            f"- {r['name']}: {r['row_count']} rows, {r['column_count']} cols, "
            f"health {r['health_score']}%, columns: {cols}"
        )
    return "\n".join(lines)


def _call_llm(api_key: str, provider: str, user_prompt: str) -> Optional[str]:
    """Call a hosted LLM (Gemini or OpenAI) and return its text, or None on any failure."""
    if provider == "openai":
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
        return body["choices"][0]["message"]["content"].strip()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": _SYSTEM_PROMPT + "\n\n" + user_prompt}]}]}
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode())
    parts = body.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    return text or None


def _copilot_reply(content: str, user: dict) -> str:
    text = content.lower()
    db = get_db()
    ds = db.execute(
        "SELECT id, name, file_path, row_count, column_count, health_score, schema_json, file_size FROM datasets WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5",
        (user["id"],),
    ).fetchall()
    db.close()

    if not ds:
        return (
            "No datasets detected yet. Upload a file (CSV, XLSX, JSON, Parquet, or SQLite) from the Upload page, "
            "and I'll profile it, build a schema dictionary, and surface data-quality issues automatically."
        )

    # 1) Try real data-answer engine first (sums, averages, counts, correlations, previews, schema)
    try:
        df = read_dataframe(Path(ds[0]["file_path"]), ds[0]["name"])
        answer = answer_question(content, df, ds[0]["name"])
        if answer is not None:
            return answer
    except Exception:  # noqa: BLE001 - fall through to templates on any failure
        pass

    if any(k in text for k in ["sql", "query", "query language", "select"]):
        d = ds[0]
        try:
            cols = json.loads(d["schema_json"] or "[]")
        except json.JSONDecodeError:
            cols = []
        col_str = ", ".join(c["name"] for c in cols[:8]) if cols else "(columns available after profiling)"
        return (
            f"Based on `{d['name']}`, here's a starter query:\n\n"
            f"```sql\nSELECT {col_str}\nFROM `{d['name']}`;\n```\n\n"
            f"The dataset has {d['row_count']} rows and {d['column_count']} columns. "
            "I can also compute real totals, averages, and correlations directly from the file — just ask."
        )

    if any(k in text for k in ["missing", "quality", "health", "issue", "null"]):
        db2 = get_db()
        flags = db2.execute(
            """SELECT p.column_name, p.missing_count, p.missing_pct, p.integrity_flags, d.name AS dataset
               FROM profiles p JOIN datasets d ON d.id = p.dataset_id
               WHERE d.user_id = ? AND (p.missing_count > 0 OR p.integrity_flags != '[]')
               ORDER BY p.missing_pct DESC LIMIT 6""",
            (user["id"],),
        ).fetchall()
        db2.close()
        if not flags:
            return "Good news — no missing values or integrity issues detected in your profiles yet."
        lines = []
        for f in flags:
            try:
                fflags = json.loads(f["integrity_flags"] or "[]")
            except json.JSONDecodeError:
                fflags = []
            lines.append(
                f"- `{f['column_name']}` (in {f['dataset']}): {f['missing_count']} missing ({f['missing_pct']}%)"
                + (f" — flags: {', '.join(fflags)}" if fflags else "")
            )
        return "Here are the top data-quality signals I detected:\n\n" + "\n".join(lines)

    return (
        "Here's a snapshot of your workspace right now:\n\n"
        + _workspace_summary(user)
        + "\n\nI can compute real answers for you — try asking: "
        "\"total spent by city\", \"average age\", \"top 10 rows\", \"correlation between columns\", "
        "or \"describe the data\"."
    )


@app.get("/api/copilot/conversations")
def list_conversations(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/copilot/conversations", response_model=None)
def create_conversation(body: ConversationCreate, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        "INSERT INTO conversations (user_id, dataset_id, title) VALUES (?, ?, ?)",
        (user["id"], body.dataset_id, body.title),
    )
    db.commit()
    row = db.execute("SELECT * FROM conversations WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)


@app.get("/api/copilot/conversations/{conv_id}/messages")
def list_messages(conv_id: int, user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at", (conv_id,)).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/copilot/conversations/{conv_id}/messages", response_model=None)
def send_message(
    conv_id: int,
    body: MessageCreate,
    user=Depends(get_current_user),
    api_key: Optional[str] = Header(None, alias="X-LLM-API-KEY"),
    provider: str = Header("gemini", alias="X-LLM-PROVIDER"),
):
    db = get_db()
    db.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, 'user', ?)", (conv_id, body.content))
    reply = None
    if api_key:
        try:
            context = _workspace_llm_context(user)
            user_prompt = f"Workspace context:\n{context}\n\nUser question: {body.content}"
            llm_text = _call_llm(api_key, provider, user_prompt)
            if llm_text:
                reply = llm_text
        except urllib.error.HTTPError as exc:
            status = exc.code
            try:
                detail = exc.read().decode()[:300]
            except Exception:  # noqa: BLE001
                detail = ""
            if status in (400, 401, 403, 429):
                reply = f"⚠️ Your API key was rejected by the LLM provider (HTTP {status}){': ' + detail if detail else ''}. Check the key and try again."
            else:
                reply = None
        except Exception:  # noqa: BLE001 - fall back to local engine on any LLM failure
            reply = None
    if not reply:
        try:
            reply = _copilot_reply(body.content, user)
        except Exception:  # noqa: BLE001
            reply = "I hit an unexpected error while analyzing your workspace. Please try again."
    db.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, 'assistant', ?)", (conv_id, reply))
    db.commit()
    rows = db.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at", (conv_id,)).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.delete("/api/copilot/conversations/{conv_id}")
def delete_conversation(conv_id: int, user=Depends(get_current_user)):
    db = get_db()
    db.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
    cur = db.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conv_id, user["id"]))
    db.commit()
    db.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Conversation not found")
    return {"deleted": True}


# ── Settings ──

DEFAULT_MASKING_RULES = {
    "ssn": {"label": "SSN & National IDs", "mandatory": True, "method": "SHA-256 Hash", "patterns": []},
    "email": {"label": "Email Addresses", "mandatory": True, "method": "Pseudonymize", "patterns": []},
    "payment": {"label": "Payment / CVV", "mandatory": True, "method": "Hard Strip", "patterns": []},
    "geo": {"label": "IP & Geo Data", "mandatory": True, "method": "Truncate Prefix", "patterns": []},
}


@app.get("/api/settings/workspace")
def get_workspace(user=Depends(get_current_user)):
    db = get_db()
    row = db.execute("SELECT * FROM workspace_settings WHERE user_id = ?", (user["id"],)).fetchone()
    if not row:
        db.execute("INSERT INTO workspace_settings (user_id) VALUES (?)", (user["id"],))
        db.commit()
        row = db.execute("SELECT * FROM workspace_settings WHERE user_id = ?", (user["id"],)).fetchone()
    data = dict(row)
    if not data.get("masking_rules"):
        data["masking_rules"] = DEFAULT_MASKING_RULES
    else:
        try:
            data["masking_rules"] = json.loads(data["masking_rules"])
        except json.JSONDecodeError:
            data["masking_rules"] = DEFAULT_MASKING_RULES
    db.close()
    return data


@app.put("/api/settings/workspace")
def update_workspace(body: WorkspaceUpdate, user=Depends(get_current_user)):
    rules = body.masking_rules
    if rules is not None and not isinstance(rules, str):
        rules = json.dumps(rules)
    db = get_db()
    db.execute(
        """UPDATE workspace_settings SET
            llm_engine = COALESCE(?, llm_engine),
            temperature = COALESCE(?, temperature),
            confidence_threshold = COALESCE(?, confidence_threshold),
            zdr_mode = COALESCE(?, zdr_mode),
            schema_verification = COALESCE(?, schema_verification),
            pyodide_sandbox = COALESCE(?, pyodide_sandbox),
            hipaa_shield = COALESCE(?, hipaa_shield),
            dynamic_masking = COALESCE(?, dynamic_masking),
            masking_rules = COALESCE(?, masking_rules)
        WHERE user_id = ?""",
        (body.llm_engine, body.temperature, body.confidence_threshold,
         body.zdr_mode, body.schema_verification, body.pyodide_sandbox,
         body.hipaa_shield, body.dynamic_masking, rules, user["id"]),
    )
    db.commit()
    row = db.execute("SELECT * FROM workspace_settings WHERE user_id = ?", (user["id"],)).fetchone()
    db.close()
    data = dict(row)
    if not data.get("masking_rules"):
        data["masking_rules"] = DEFAULT_MASKING_RULES
    else:
        try:
            data["masking_rules"] = json.loads(data["masking_rules"])
        except json.JSONDecodeError:
            data["masking_rules"] = DEFAULT_MASKING_RULES
    return data


@app.get("/api/settings/team")
def list_team(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM team_members WHERE workspace_owner_id = ?", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/settings/team/invite", response_model=None)
def invite_member(body: TeamInvite, user=Depends(get_current_user)):
    db = get_db()
    existing = db.execute(
        "SELECT id FROM team_members WHERE workspace_owner_id = ? AND email = ?",
        (user["id"], body.email),
    ).fetchone()
    if existing:
        db.close()
        raise HTTPException(409, "Member already invited")
    cur = db.execute(
        "INSERT INTO team_members (workspace_owner_id, email, role) VALUES (?, ?, ?)",
        (user["id"], body.email, body.role),
    )
    db.commit()
    row = db.execute("SELECT * FROM team_members WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)


@app.delete("/api/settings/team/{member_id}")
def remove_member(member_id: int, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        "DELETE FROM team_members WHERE id = ? AND workspace_owner_id = ?",
        (member_id, user["id"]),
    )
    db.commit()
    db.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Member not found")
    return {"deleted": True}


@app.get("/api/settings/api-keys")
def list_api_keys(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute(
        "SELECT id, name, key_prefix, scopes, is_active, created_at FROM api_keys WHERE user_id = ?",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/settings/api-keys", response_model=None)
def create_api_key(body: ApiKeyCreate, user=Depends(get_current_user)):
    import hashlib
    raw_key = "dp_" + uuid4().hex
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12] + "..."
    db = get_db()
    cur = db.execute(
        "INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes) VALUES (?, ?, ?, ?, ?)",
        (user["id"], body.name, key_hash, key_prefix, json.dumps(body.scopes)),
    )
    db.commit()
    db.close()
    return {"id": cur.lastrowid, "name": body.name, "key": raw_key, "key_prefix": key_prefix}


@app.delete("/api/settings/api-keys/{key_id}")
def delete_api_key(key_id: int, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute("DELETE FROM api_keys WHERE id = ? AND user_id = ?", (key_id, user["id"]))
    db.commit()
    db.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Key not found")
    return {"deleted": True}


@app.get("/api/settings/webhooks")
def list_webhooks(user=Depends(get_current_user)):
    db = get_db()
    rows = db.execute("SELECT * FROM webhooks WHERE user_id = ?", (user["id"],)).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/settings/webhooks", response_model=None)
def create_webhook(body: WebhookCreate, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute(
        "INSERT INTO webhooks (user_id, name, url, event) VALUES (?, ?, ?, ?)",
        (user["id"], body.name, body.url, body.event),
    )
    db.commit()
    row = db.execute("SELECT * FROM webhooks WHERE id = ?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(row)


@app.delete("/api/settings/webhooks/{webhook_id}")
def delete_webhook(webhook_id: int, user=Depends(get_current_user)):
    db = get_db()
    cur = db.execute("DELETE FROM webhooks WHERE id = ? AND user_id = ?", (webhook_id, user["id"]))
    db.commit()
    db.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Webhook not found")
    return {"deleted": True}