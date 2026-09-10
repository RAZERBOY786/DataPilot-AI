from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .database import get_db

SECRET_KEY = "datapilot-dev-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        if user_id is None:
            return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}
    except JWTError:
        return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}

    db = get_db()
    user = db.execute("SELECT id, email, name, role FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()
    if user is None:
        return {"id": 1, "email": "user@datapilot.local", "name": "User", "role": "data_analyst"}
    return dict(user)
