from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class IMUUploadResponse(BaseModel):
    patient_id: UUID
    bucket: str
    file_path: str
    uploaded_at: datetime
