from .patients import router as patients_router
from .imu import router as imu_router
from .prom import router as prom_router
from .clinician import router as clinician_router
from .hand_tracking import router as hand_tracking_router
from .speech import router as speech_router
from .auth import router as auth_router
from .treatment_goals import router as treatment_goals_router

__all__ = [
    "patients_router",
    "imu_router",
    "prom_router",
    "clinician_router",
    "hand_tracking_router",
    "speech_router",
    "auth_router",
    "treatment_goals_router",
]
