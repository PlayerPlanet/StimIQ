from .patients import router as patients_router
from .imu import router as imu_router
<<<<<<< HEAD

__all__ = ["patients_router", "imu_router"]
=======
from .prom import router as prom_router

__all__ = ["patients_router", "imu_router", "prom_router"]
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
