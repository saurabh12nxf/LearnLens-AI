import os
import datetime
from typing import Optional, Dict, Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db, User

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "learnlens-ai-jwt-secret-key-production-grade-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency to authenticate and extract the active User.
    Raises 401 if unauthenticated or token is expired/invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not auth or not auth.credentials:
        raise credentials_exception

    payload = decode_access_token(auth.credentials)
    if not payload:
        raise credentials_exception

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception

    return user


def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional authentication dependency for flexible testing.
    """
    if not auth or not auth.credentials:
        return None

    payload = decode_access_token(auth.credentials)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return db.query(User).filter(User.id == int(user_id)).first()


def ensure_demo_user(db: Session) -> User:
    """
    Ensures a default demo user exists for immediate evaluation.
    Credentials: demo@learnlens.ai / demo123
    """
    demo_email = "demo@learnlens.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            full_name="Alex Morgan",
            hashed_password=hash_password("demo123"),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Demo user created: demo@learnlens.ai / demo123")
    return user

