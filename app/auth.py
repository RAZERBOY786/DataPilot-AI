import os
import secrets
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .database import get_db

# The signing key must NEVER be hard-coded in source. Either supply a strong
# key via the DATAPILOT_SECRET_KEY environment variable, or a fresh random key
# is generated per process — which instantly invalidates every previously
# issued token (including any forged with the old published key).
SECRET_KEY = os.environ.get("DATAPILOT_SECRET_KEY") or secrets.token_hex(32)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Demo mode: when enabled (default) requests without a token fall back to the
# seeded demo workspace. Set DATAPILOT_GUEST_MODE=0 to require a valid JWT.
GUEST_MODE = os.environ.get("DATAPILOT_GUEST_MODE", "1") != "0"

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "jti": secrets.token_urlsafe(16)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def unauthorized(detail: str = "Not authenticated"):
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        if GUEST_MODE:
            return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}
        raise unauthorized()

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        if user_id is None:
            raise JWTError("missing user id")
    except JWTError:
        if GUEST_MODE:
            return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}
        raise unauthorized("Invalid or expired token")

    db = get_db()
    user = db.execute("SELECT id, email, name, role FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if user is None:
        if GUEST_MODE:
            return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}
        raise unauthorized("User no longer exists")
    return dict(user)
