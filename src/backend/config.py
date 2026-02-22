from functools import lru_cache
from typing import Optional
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
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    api_reload: bool = True

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
    }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
