from datetime import datetime
from pydantic import BaseModel


class IMUUploadResponse(BaseModel):
    patient_id: str
    bucket: str
    file_path: str
    uploaded_at: datetime
