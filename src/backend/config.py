from functools import lru_cache
from typing import Optional
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_imu_bucket: str = "imu-data"
    supabase_imu_table: str = "imu_data"
    supabase_datapoints_bucket: str = "datapoints"
    supabase_stimuli_table: str = "stimuli"
    supabase_hand_tracking_sessions_table: str = "hand_tracking_line_follow_sessions"
    supabase_hand_tracking_results_table: str = "hand_tracking_line_follow_results"
    bayes_patient_id: Optional[str] = None
    bayes_datapoints_object_path: Optional[str] = None
    loss_model_backend: str = "cnn"
    loss_xgboost_model_path: Optional[str] = None
    loss_baseline_cache_path: Optional[str] = None
    loss_baseline_cache_enabled: bool = True
    auth_required: bool = True
    session_login_password: str
    session_cookie_name: str = "stimiq_session"
    session_ttl_minutes: int = 480
    session_cookie_secure: bool = False
    imu_upload_max_bytes: int = 5_000_000
    api_host: str = "0.0.0.0"
    api_port: int = int(os.getenv("PORT", "8080"))
    api_reload: bool = True

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
    }

    @field_validator("supabase_url", mode="before")
    @classmethod
    def normalize_supabase_url(cls, v: str) -> str:
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("SUPABASE_URL must be a string")

        # Cloud env values sometimes include wrapping quotes or trailing newlines.
        normalized = v.strip().strip("\"'")
        if not normalized.startswith("http://") and not normalized.startswith("https://"):
            raise ValueError("SUPABASE_URL must start with http:// or https://")
        if ".supabase.co" not in normalized:
            raise ValueError("SUPABASE_URL must target a *.supabase.co host")
        return normalized

    @field_validator("supabase_service_role_key", mode="before")
    @classmethod
    def normalize_service_role_key(cls, v: str) -> str:
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY must be a string")
        return v.strip().strip("\"'")

    @field_validator("session_login_password", mode="before")
    @classmethod
    def normalize_session_password(cls, v: str) -> str:
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError("SESSION_LOGIN_PASSWORD must be a string")
        cleaned = v.strip().strip("\"'")
        if len(cleaned) < 8:
            raise ValueError("SESSION_LOGIN_PASSWORD must be at least 8 characters")
        return cleaned

    @field_validator("session_ttl_minutes")
    @classmethod
    def validate_session_ttl(cls, v: int) -> int:
        if v < 5 or v > 7 * 24 * 60:
            raise ValueError("SESSION_TTL_MINUTES must be between 5 and 10080")
        return v

    @field_validator("imu_upload_max_bytes")
    @classmethod
    def validate_imu_upload_max_bytes(cls, v: int) -> int:
        if v < 1_000 or v > 100_000_000:
            raise ValueError("IMU_UPLOAD_MAX_BYTES must be between 1KB and 100MB")
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
