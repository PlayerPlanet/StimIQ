from datetime import datetime

from pydantic import BaseModel, Field


class SessionLoginRequest(BaseModel):
    password: str = Field(..., min_length=8, max_length=256)


class SessionLoginResponse(BaseModel):
    status: str
    message: str
    expires_at: datetime


class SessionInfoResponse(BaseModel):
    status: str
    expires_at: datetime
