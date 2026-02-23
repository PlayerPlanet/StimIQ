from datetime import datetime, timezone
from typing import List
import logging

from config import get_settings
from database import get_supabase
from ..schemas.imu import IMUSampleIn


logger = logging.getLogger(__name__)


def insert_imu_batch(
    patient_id: str,
    device_id: str,
    session_id: str,
    samples: List[IMUSampleIn],
    meta: dict = None
) -> int:
    """
    Insert a batch of IMU samples into the Supabase imu_data table.
    
    Args:
        patient_id: Patient identifier (e.g., 'imu-demo-user')
        device_id: Device/browser session identifier
        session_id: Tracking session identifier
        samples: List of IMU samples with timestamp (ms), ax, ay, az
        meta: Optional metadata dict (user_agent, sampling_hz, etc.)
    
    Returns:
        Number of samples inserted
    
    Raises:
        ValueError: If samples list is empty
        RuntimeError: If database insertion fails
    """
    if not samples:
        raise ValueError("Samples list cannot be empty")
    
    supabase = get_supabase()
    table_name = get_settings().supabase_imu_table
    
    # Convert each sample to a row for insertion
    rows = []
    for sample in samples:
        # Convert milliseconds since epoch to UTC datetime
        timestamp_dt = datetime.fromtimestamp(sample.timestamp / 1000.0, tz=timezone.utc)
        
        row = {
            "patient_id": patient_id,
            "device_id": device_id,
            "session_id": session_id,
            "timestamp": timestamp_dt.isoformat(),
            "ax": sample.ax,
            "ay": sample.ay,
            "az": sample.az,
            "meta": meta or {},
        }
        rows.append(row)
    
    try:
        # Bulk insert all rows
        response = supabase.table(table_name).insert(rows).execute()
        
        if not response.data:
            raise RuntimeError("Failed to insert IMU samples")
        
        inserted_count = len(response.data)
        
        # Log session start (first batch for this session_id)
        logger.info(
            f"Inserted {inserted_count} IMU samples for patient={patient_id}, "
            f"session={session_id}, device={device_id}"
        )
        
        return inserted_count
        
    except Exception as e:
        logger.error(
            f"Failed to insert IMU batch: {str(e)} "
            f"(patient={patient_id}, session={session_id})"
        )
        raise RuntimeError(f"Database insertion failed: {str(e)}")
