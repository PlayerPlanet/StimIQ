from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional
import secrets

from fastapi import HTTPException, Request, status

from config import get_settings

_session_store: dict[str, datetime] = {}
_session_lock = Lock()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_session() -> tuple[str, datetime]:
    settings = get_settings()
    ttl = timedelta(minutes=settings.session_ttl_minutes)
    session_id = secrets.token_urlsafe(48)
    expires_at = _utc_now() + ttl

    with _session_lock:
        _session_store[session_id] = expires_at
    return session_id, expires_at


def get_session_expiry(session_id: str) -> Optional[datetime]:
    with _session_lock:
        return _session_store.get(session_id)


def validate_session(session_id: str) -> bool:
    settings = get_settings()
    ttl = timedelta(minutes=settings.session_ttl_minutes)
    now = _utc_now()

    with _session_lock:
        expires_at = _session_store.get(session_id)
        if expires_at is None:
            return False
        if expires_at <= now:
            _session_store.pop(session_id, None)
            return False

        # Sliding expiration for active sessions.
        _session_store[session_id] = now + ttl
    return True


def destroy_session(session_id: str) -> None:
    with _session_lock:
        _session_store.pop(session_id, None)


def _extract_session_id(request: Request) -> Optional[str]:
    settings = get_settings()
    cookie_token = request.cookies.get(settings.session_cookie_name)
    if cookie_token:
        return cookie_token
    header_token = request.headers.get("X-Session-Id")
    if header_token:
        return header_token
    return None


def require_session(request: Request) -> str:
    session_id = _extract_session_id(request)
    if not session_id or not validate_session(session_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return session_id
