import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "datapilot.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'data_analyst',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    row_count INTEGER DEFAULT 0,
    column_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'raw',
    health_score INTEGER DEFAULT 0,
    schema_json TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    distinct_count INTEGER DEFAULT 0,
    missing_count INTEGER DEFAULT 0,
    missing_pct REAL DEFAULT 0,
    stats_json TEXT DEFAULT '{}',
    distribution_type TEXT DEFAULT 'unknown',
    integrity_flags TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dataset_id INTEGER,
    title TEXT DEFAULT 'New Analysis',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    scopes TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    event TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_owner_id INTEGER NOT NULL,
    user_id INTEGER,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'data_analyst',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_owner_id) REFERENCES users(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS workspace_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    llm_engine TEXT DEFAULT 'gemini-1.5-pro',
    temperature REAL DEFAULT 0.2,
    confidence_threshold INTEGER DEFAULT 95,
    zdr_mode INTEGER DEFAULT 1,
    schema_verification INTEGER DEFAULT 1,
    pyodide_sandbox INTEGER DEFAULT 1,
    hipaa_shield INTEGER DEFAULT 0,
    dynamic_masking INTEGER DEFAULT 1,
    masking_rules TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)
    for col in ("masking_rules",):
        has = conn.execute(
            "SELECT COUNT(*) FROM pragma_table_info('workspace_settings') WHERE name = ?",
            (col,),
        ).fetchone()[0]
        if not has:
            conn.execute(f"ALTER TABLE workspace_settings ADD COLUMN {col} TEXT")
    conn.commit()
    conn.close()
    print("Database initialized")
