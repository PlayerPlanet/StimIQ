from functools import lru_cache
from typing import Optional
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_imu_bucket: str = "imu-data"
    supabase_datapoints_bucket: str = "datapoints"
    supabase_stimuli_table: str = "stimuli"
    bayes_patient_id: Optional[str] = None
    bayes_datapoints_object_path: Optional[str] = None
    loss_model_backend: str = "cnn"
    loss_xgboost_model_path: Optional[str] = None
    loss_baseline_cache_path: Optional[str] = None
    loss_baseline_cache_enabled: bool = True
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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
