import hmac
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)

TOKEN_EXPIRY_HOURS = 24
MAX_LOGIN_ATTEMPTS = 20
LOGIN_WINDOW_SECONDS = 300

# Maps client IP -> list of failed attempt timestamps within the current window.
_login_attempts: dict[str, list[datetime]] = {}


def _check_rate_limit(ip: str) -> None:
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    attempts = [t for t in _login_attempts.get(ip, []) if t > cutoff]
    _login_attempts[ip] = attempts
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        retry_after = int((attempts[0] - cutoff).total_seconds()) + 1
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def _record_failed_attempt(ip: str) -> None:
    _login_attempts.setdefault(ip, []).append(datetime.now(UTC))


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
def login(request: Request, body: LoginRequest) -> dict:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)
    if not hmac.compare_digest(body.password, settings.admin_password):
        _record_failed_attempt(ip)
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"token": create_token()}


@router.get("/me", dependencies=[Depends(require_admin)])
def me() -> dict:
    return {"authenticated": True}
