from datetime import date, timedelta
from typing import List
import csv
from io import StringIO

from config import get_settings
from database import get_supabase
from ..schemas.dbs_state import ChannelState, DailyTremorPoint, DailyPromPoint, DbsState

# Note: This import is correct. We're in api/services/, so .. takes us to api/, then .schemas accesses the schemas subpackage


def _generate_mock_timeseries(days: int = 30) -> tuple[List[DailyTremorPoint], List[DailyPromPoint]]:
    """Generate mock timeseries data for the last N days."""
    tremor_points = []
    prom_points = []
    
    today = date.today()
    for i in range(days - 1, -1, -1):
        current_date = today - timedelta(days=i)
        
        # Generate tremor activity with some natural variation
        base_tremor = 5.0
        variation = (i % 7) * 0.3  # Daily pattern
        tremor_value = max(0, min(10, base_tremor + variation - (i % 3) * 0.5))
        
        # Generate PROM score with natural variation
        base_prom = 5.5
        prom_variation = ((i + 2) % 7) * 0.2
        prom_value = max(1, min(7, base_prom + prom_variation - (i % 4) * 0.3))
        
        tremor_points.append(DailyTremorPoint(date=current_date, avg_tremor_activity=round(tremor_value, 2)))
        prom_points.append(DailyPromPoint(date=current_date, avg_prom_score=round(prom_value, 2)))
    
    return tremor_points, prom_points


def _is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _read_csv_rows(text: str, delimiter: str) -> list[list[str]]:
    reader = csv.reader(StringIO(text), delimiter=delimiter)
    return [row for row in reader if any(cell.strip() for cell in row)]


def _parse_latest_params(content: bytes, max_params: int = 16) -> list[float]:
    if not content:
        raise ValueError("CSV content is empty")

    text = content.decode("utf-8", errors="ignore")
    rows = _read_csv_rows(text, ",")
    if rows and len(rows[0]) == 1 and ";" in rows[0][0]:
        rows = _read_csv_rows(text, ";")

    if not rows:
        raise ValueError("CSV contains no rows")

    # Drop header row if it contains any non-numeric entries.
    if any(cell.strip() and not _is_number(cell.strip()) for cell in rows[0]):
        rows = rows[1:]

    if not rows:
        raise ValueError("CSV contains no data rows")

    last_row = rows[-1]
    if len(last_row) < max_params:
        raise ValueError("CSV row does not contain enough parameters")

    values: list[float] = []
    for raw in last_row[:max_params]:
        raw = raw.strip()
        if not raw:
            raise ValueError("CSV parameter is empty")
        values.append(float(raw))
    return values


def get_mock_state_for_patient(patient_id: str) -> DbsState:
    """
    Retrieve DBS state for a patient with mock data.
    
    Args:
        patient_id: The patient ID
        
    Returns:
        DbsState object with channel information and timeseries data
    """
    # Generate mock timeseries data
    tremor_series, prom_series = _generate_mock_timeseries()
    
    # Generate mock channel data (8 channels)
    channels = [
        ChannelState(
            channel_id=1,
            amplitude=2.5,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=2,
            amplitude=2.3,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=3,
            amplitude=2.7,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=4,
            amplitude=2.4,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=5,
            amplitude=2.2,
            frequency=125.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=6,
            amplitude=2.6,
            frequency=135.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=7,
            amplitude=2.9,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelState(
            channel_id=8,
            amplitude=2.3,
            frequency=128.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
    ]
    
    return DbsState(
        patient_id=patient_id,
        channels=channels,
        tremor_timeseries=tremor_series,
        prom_timeseries=prom_series,
    )


def get_dbs_state_for_patient(patient_id: str) -> DbsState:
    """Retrieve DBS state for a patient from the latest CSV entry, fallback to mock."""
    supabase = get_supabase()
    settings = get_settings()

    try:
        bucket = settings.supabase_datapoints_bucket
        object_path = f"{patient_id}.csv"
        content = supabase.storage.from_(bucket).download(object_path)
        if isinstance(content, str):
            content = content.encode("utf-8")
        params = _parse_latest_params(content, max_params=16)

        # The datapoints CSV stores: amp1, freq_hz1, pulse_width_s1, phase_rad1, ..., amp4, ...
        # Format: [amp1, freq_hz1, pulse_width_s1, phase_rad1, amp2, freq_hz2, pulse_width_s2, phase_rad2, ...]
        if len(params) % 4 != 0:
            raise ValueError("CSV parameter count is not a multiple of 4")

        channels: list[ChannelState] = []
        n_channels = len(params) // 4
        for i in range(n_channels):
            base = i * 4
            amplitude = float(params[base])
            frequency = float(params[base + 1])
            pulse_width_s = float(params[base + 2])
            phase_rad = float(params[base + 3])
            channels.append(
                ChannelState(
                    channel_id=i + 1,
                    amplitude=amplitude,
                    frequency=frequency,
                    pulse_width_s=pulse_width_s,
                    phase_rad=phase_rad,
                )
            )

        tremor_series, prom_series = _generate_mock_timeseries()
        return DbsState(
            patient_id=patient_id,
            channels=channels,
            tremor_timeseries=tremor_series,
            prom_timeseries=prom_series,
        )
    except Exception:
        return get_mock_state_for_patient(patient_id)
