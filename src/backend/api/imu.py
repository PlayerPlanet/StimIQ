from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from config import get_settings
from database import get_supabase
from .schemas import IMUUploadResponse


router = APIRouter(prefix="/patients", tags=["imu"])


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
