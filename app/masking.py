"""Dynamic column masking for sensitive (PII) values.

Masks cell values in dataset previews based on the workspace's configured
masking rules. The category that a column maps to is detected from its name
(the default rules key on SSN/national-IDs, email, payment, and geo columns).
"""
import hashlib
import re
import secrets
from typing import Any, Optional

# Column-name / value patterns per masking category. The category keys match
# the ones used in DEFAULT_MASKING_RULES in main.py.
_PATTERNS: dict[str, list[str]] = {
    "ssn": [r"\b\d{9}\b", r"\b\d{3}[- ]\d{2}[- ]\d{4}\b", r"(ssn|social|national.?id|sin|tax.?id|aadhaar)"],
    "email": [r"e-?mail|@[a-z0-9.-]+\.[a-z]{2,}"],
    "payment": [r"(card|cvv|cvc|iban|paypal|account.?num|bank.?acct|routing|ccnum)"],
    "geo": [r"(ip.?address|geo|latitude|lat|longitude|lon|location|coordinates|zip)"],
}

_PSEUDONYMS = [
    "Jordan Blake",
    "Riley Quinn",
    "Casey Morgan",
    "Alex Rivera",
    "Sam Whitfield",
    "Morgan Casey",
    "Taylor Brooks",
    "Jordan Maddox",
]


def category_for(name: Any) -> Optional[str]:
    """Return the masking category a column name belongs to, or None."""
    low = str(name).lower()
    for category, patterns in _PATTERNS.items():
        if any(re.search(p, low) for p in patterns):
            return category
    return None


def mask_value(value: Any, method: Optional[str]) -> Any:
    """Apply a single masking method to one cell value."""
    if method is None or str(method).strip().lower() in ("", "none"):
        return value

    if value is None:
        return None

    raw = str(value)
    method = str(method)

    if method == "SHA-256 Hash":
        digest = hashlib.sha256(raw.encode("utf-8", errors="replace")).hexdigest()
        return f"sha256:{digest[:16]}…"

    if method == "Pseudonymize":
        return secrets.choice(_PSEUDONYMS)

    if method == "Truncate Prefix":
        keep = min(4, len(raw))
        return ("*" * max(4, len(raw) - keep)) + raw[-keep:]

    # "Hard Strip" or anything unrecognized -> full redaction
    return "[REDACTED]"