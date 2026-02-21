from .patients import router as patients_router
from .imu import router as imu_router
from .prom import router as prom_router

__all__ = ["patients_router", "imu_router", "prom_router"]
