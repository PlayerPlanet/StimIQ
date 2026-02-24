from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import require_session
from database import initialize_supabase
from config import get_settings
from api import (
    auth_router,
    patients_router,
    imu_router,
    imu_batch_router,
    prom_router,
    clinician_router,
    hand_tracking_router,
    speech_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_supabase()
    yield
    print("🔄 Shutting down...")


app = FastAPI(
    title="StimIQ Backend API",
    description="Backend API for Deep Brain Stimulation parameter optimization",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://stim-iq.vercel.app",
        "stimiq.xyz",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(patients_router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(imu_router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(imu_batch_router, prefix="/api")  # No auth required for demo
app.include_router(prom_router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(clinician_router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(hand_tracking_router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(speech_router, prefix="/api", dependencies=[Depends(require_session)])


@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "StimIQ Backend API is running",
        "version": "0.1.0"
    }


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
