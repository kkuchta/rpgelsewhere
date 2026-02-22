import hmac
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)

TOKEN_EXPIRY_HOURS = 24


def create_token() -> str:
    payload = {
        "sub": "admin",
        "exp": datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> None:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
def login(body: LoginRequest) -> dict:
    if not hmac.compare_digest(body.password, settings.admin_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": create_token()}


@router.get("/me", dependencies=[Depends(require_admin)])
def me() -> dict:
    return {"authenticated": True}
