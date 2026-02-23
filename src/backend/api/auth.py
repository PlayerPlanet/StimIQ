from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse

from auth import create_session, destroy_session, get_session_expiry, require_session
from config import get_settings
from .schemas import SessionInfoResponse, SessionLoginRequest, SessionLoginResponse


router = APIRouter(prefix="/auth", tags=["auth"])


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.post("/login", response_model=SessionLoginResponse)
async def login(payload: SessionLoginRequest):
    settings = get_settings()
    if payload.password != settings.session_login_password:
        raise _unauthorized()

    session_id, expires_at = create_session()
    body = SessionLoginResponse(
        status="ok",
        message="Session created",
        expires_at=expires_at,
    ).model_dump(mode="json")
    response = JSONResponse(content=body)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        max_age=settings.session_ttl_minutes * 60,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )
    return response


@router.post("/logout")
async def logout(request: Request):
    settings = get_settings()
    session_id = require_session(request)
    destroy_session(session_id)

    response = JSONResponse(content={"status": "ok", "message": "Session cleared"})
    response.delete_cookie(key=settings.session_cookie_name, samesite="lax")
    return response


@router.get("/session", response_model=SessionInfoResponse)
async def session_info(request: Request):
    session_id = require_session(request)
    expires_at = get_session_expiry(session_id)
    if expires_at is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    return SessionInfoResponse(status="ok", expires_at=expires_at)
