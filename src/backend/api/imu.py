from datetime import datetime
from typing import Optional
from uuid import UUID
import logging

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from config import get_settings
from database import get_supabase
from .schemas import IMUUploadResponse, IMUBatchIn, IMUBatchResponse
from .services.imu import insert_imu_batch


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["imu"])
batch_router = APIRouter(prefix="/patient", tags=["imu"])


def format_date_for_filename(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H-%M-%S")


@router.post("/{patient_id}/imu-upload", response_model=IMUUploadResponse)
async def upload_imu_file(
    patient_id: UUID,
    file: UploadFile = File(...),
    date: Optional[str] = Form(None)
):
    supabase = get_supabase()
    
    try:
        patient_response = supabase.table("patients").select("id").eq("id", str(patient_id)).execute()
        
        if not patient_response.data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying patient: {str(e)}")
    
    if not file.filename or len(file.filename) > 255:
        raise HTTPException(status_code=400, detail="Invalid file name")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    if date:
        try:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            date_str = format_date_for_filename(parsed_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use ISO format (e.g., 2026-02-21 or 2026-02-21T10:30:00)"
            )
    else:
        date_str = format_date_for_filename(datetime.utcnow())
    
    settings = get_settings()
    bucket_name = settings.supabase_imu_bucket
    file_path = f"patient_{patient_id}/{date_str}.csv"
    
    try:
        file_content = await file.read()
        if len(file_content) > settings.imu_upload_max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large. Maximum allowed size is {settings.imu_upload_max_bytes} bytes",
            )
        
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "text/csv", "upsert": "true"}
        )
        
        return IMUUploadResponse(
            patient_id=patient_id,
            bucket=bucket_name,
            file_path=file_path,
            uploaded_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file to storage: {str(e)}")


@batch_router.post("/imu-batch", response_model=IMUBatchResponse, status_code=201)
async def upload_imu_batch(batch: IMUBatchIn):
    """
    Upload a batch of IMU (accelerometer) samples.
    
    This is a demo endpoint for accelerometer data collection.
    Patient ID is provided in the request body.
    """
    try:
        # Validate non-empty samples
        if not batch.samples:
            raise HTTPException(status_code=400, detail="Samples list cannot be empty")
        
        # Insert the batch into Supabase
        inserted_count = insert_imu_batch(
            patient_id=batch.patient_id,
            device_id=batch.device_id,
            session_id=batch.session_id,
            samples=batch.samples,
            meta=batch.meta
        )
        
        logger.info(
            f"Successfully uploaded IMU batch: {inserted_count} samples, "
            f"session={batch.session_id}, patient={batch.patient_id}"
        )
        
        return IMUBatchResponse(inserted=inserted_count, session_id=batch.session_id)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Runtime error in IMU batch upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to insert IMU data")
    except Exception as e:
        logger.error(f"Unexpected error in IMU batch upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
