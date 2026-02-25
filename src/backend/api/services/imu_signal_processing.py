from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

import numpy as np
from scipy.signal import butter, filtfilt, welch

from config import get_settings
from database import get_supabase
from ..schemas.imu_analysis import (
    IMUAnalysisResponse,
    DataSegment,
    TimelineSegment,
    TimeIntensityPoint,
    SpectrumPoint,
)

BANDPASS_LOW_HZ = 3.0
BANDPASS_HIGH_HZ = 12.0
PEAK_LOW_HZ = 4.0
PEAK_HIGH_HZ = 7.0
FILTER_ORDER = 3
WINDOW_SECONDS = 2.0
POWER_THRESHOLD = 1e-3
DEFAULT_FS_HZ = 50.0
MIN_SAMPLES = 8
OVERLAP_FRACTION = 0.5
MAX_SPECTRUM_HZ = 20.0
GAP_VISUALIZATION_THRESHOLD_SECONDS = 5.0
MINIMUM_TREMOR_ACTIVATION = 5.0  # Power threshold to detect tremor onset/offset
TREMOR_DEACTIVATION_TIME = 2.0  # Seconds required below threshold to end tremor event
MILD_INTENSITY_THRESHOLD = 6.5e+01  # Mild tremor intensity threshold
MEDIUM_INTENSITY_THRESHOLD = 1.5e+02  # Medium tremor intensity threshold


def analyze_imu_tremor(
    user_id: str,
    start_time: datetime,
    end_time: datetime,
) -> IMUAnalysisResponse:
    if end_time <= start_time:
        raise ValueError("end_time must be after start_time")

    rows = _fetch_imu_rows(user_id=user_id, start_time=start_time, end_time=end_time)
    if not rows:
        return IMUAnalysisResponse(
            dominant_frequency=0.0,
            tremor_intensity=0.0,
            tremor_activity_share=0.0,
            mild_tremor_share=0.0,
            medium_tremor_share=0.0,
            intense_tremor_share=0.0,
            average_event_duration_seconds=0.0,
            total_datapoints=0,
            data_segments=[],
            data_continuity_timeline=[],
            actual_start_time=None,
            actual_end_time=None,
            tremor_intensity_timeseries=[],
            power_spectrum=[],
        )

    # Count total datapoints
    total_datapoints = len(rows)

    # Extract raw timestamps before normalization
    raw_timestamps = [_parse_timestamp(row["timestamp"]) for row in rows]
    actual_start_time = raw_timestamps[0]
    actual_end_time = raw_timestamps[-1]

    timestamps, ax, ay, az = _extract_series(rows)
    magnitude = np.sqrt(ax * ax + ay * ay + az * az)
    fs = _estimate_sampling_rate(timestamps)

    # Detect data continuity segments
    data_segments = _detect_data_segments(raw_timestamps, fs)

    # Build continuity timeline with gaps
    data_continuity_timeline = _build_continuity_timeline(data_segments, raw_timestamps[0], raw_timestamps[-1])

    filtered = _bandpass_filter(magnitude, fs)
    dominant_frequency, tremor_intensity = _compute_psd_metrics(filtered, fs)

    # Compute tremor intensity time series with sliding windows
    tremor_intensity_timeseries = _compute_tremor_timeseries(
        filtered, fs, raw_timestamps[0], timestamps
    )

    # Detect tremor events based on intensity thresholds
    tremor_events = _detect_tremor_events(tremor_intensity_timeseries)

    # Compute percentage distribution of tremor intensities
    tremor_percentages = _compute_tremor_percentages(tremor_intensity_timeseries, tremor_events)

    # Compute average event duration
    average_event_duration = _compute_average_event_duration(tremor_events)

    # Compute aggregate power spectrum
    power_spectrum = _compute_aggregate_spectrum(filtered, fs)

    return IMUAnalysisResponse(
        dominant_frequency=dominant_frequency,
        tremor_intensity=tremor_intensity,
        tremor_activity_share=tremor_percentages["tremor_activity_share"],
        mild_tremor_share=tremor_percentages["mild_tremor_share"],
        medium_tremor_share=tremor_percentages["medium_tremor_share"],
        intense_tremor_share=tremor_percentages["intense_tremor_share"],
        average_event_duration_seconds=average_event_duration,
        total_datapoints=total_datapoints,
        data_segments=data_segments,
        data_continuity_timeline=data_continuity_timeline,
        actual_start_time=actual_start_time,
        actual_end_time=actual_end_time,
        tremor_intensity_timeseries=tremor_intensity_timeseries,
        power_spectrum=power_spectrum,
    )


def _fetch_imu_rows(
    user_id: str,
    start_time: datetime,
    end_time: datetime,
) -> list[dict]:
    supabase = get_supabase()
    table_name = get_settings().supabase_imu_table

    response = (
        supabase.table(table_name)
        .select("ax, ay, az, timestamp")
        .eq("patient_id", user_id)
        .gte("timestamp", start_time.isoformat())
        .lte("timestamp", end_time.isoformat())
        .order("timestamp", desc=False)
        .limit(100000)  # Explicit high limit to avoid row truncation
        .execute()
    )

    return response.data or []


def _parse_timestamp(value: str) -> datetime:
    """Parse timestampz format (e.g., '2026-02-25 19:05:47.56+00' or '2026-02-25T19:05:47.56+00:00')."""
    # Handle Z suffix
    value = value.replace("Z", "+00:00")
    # Handle +00 (no colon) by adding :00
    if value.endswith("+00") and not value.endswith("+00:00"):
        value = value[:-3] + "+00:00"
    # Parse using fromisoformat
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        # Fallback: try to parse without timezone info if fromisoformat fails
        # Strip timezone if present and try again
        if "+" in value:
            value = value.split("+")[0]
        if value.endswith("Z"):
            value = value[:-1]
        return datetime.fromisoformat(value)


def _extract_series(rows: Iterable[dict]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    timestamps = []
    ax = []
    ay = []
    az = []

    for row in rows:
        timestamps.append(_parse_timestamp(row["timestamp"]).timestamp())
        ax.append(float(row["ax"]))
        ay.append(float(row["ay"]))
        az.append(float(row["az"]))

    ts_array = np.array(timestamps, dtype=float)
    if ts_array.size > 0:
        ts_array = ts_array - ts_array[0]

    return (
        ts_array,
        np.array(ax, dtype=float),
        np.array(ay, dtype=float),
        np.array(az, dtype=float),
    )


def _estimate_sampling_rate(timestamps: np.ndarray) -> float:
    if timestamps.size < 2:
        return DEFAULT_FS_HZ

    diffs = np.diff(timestamps)
    diffs = diffs[diffs > 0]
    if diffs.size == 0:
        return DEFAULT_FS_HZ

    median_dt = float(np.median(diffs))
    if not np.isfinite(median_dt) or median_dt <= 0:
        return DEFAULT_FS_HZ

    return float(1.0 / median_dt)


def _bandpass_filter(signal: np.ndarray, fs: float) -> np.ndarray:
    if signal.size < MIN_SAMPLES:
        return signal

    try:
        b, a = butter(FILTER_ORDER, [BANDPASS_LOW_HZ, BANDPASS_HIGH_HZ], btype="band", fs=fs)
        pad_len = 3 * (max(len(a), len(b)) - 1)
        if signal.size <= pad_len:
            return signal
        return filtfilt(b, a, signal)
    except Exception:
        return signal


def _compute_psd_metrics(signal: np.ndarray, fs: float) -> tuple[float, float]:
    if signal.size < MIN_SAMPLES:
        return 0.0, 0.0

    nperseg = min(256, signal.size)
    freqs, psd = welch(signal, fs=fs, nperseg=nperseg)
    band_mask = (freqs >= PEAK_LOW_HZ) & (freqs <= PEAK_HIGH_HZ)

    if not np.any(band_mask):
        return 0.0, 0.0

    band_freqs = freqs[band_mask]
    band_psd = psd[band_mask]
    dominant_frequency = float(band_freqs[np.argmax(band_psd)])
    tremor_intensity = float(np.trapezoid(band_psd, band_freqs))

    return dominant_frequency, tremor_intensity


def _compute_tremor_duration(signal: np.ndarray, fs: float) -> float:
    if signal.size < MIN_SAMPLES:
        return 0.0

    window_len = int(WINDOW_SECONDS * fs)
    if window_len < 1:
        return 0.0

    nperseg = min(256, window_len)
    duration = 0.0

    for start in range(0, signal.size - window_len + 1, window_len):
        window = signal[start : start + window_len]
        freqs, psd = welch(window, fs=fs, nperseg=nperseg)
        band_mask = (freqs >= PEAK_LOW_HZ) & (freqs <= PEAK_HIGH_HZ)
        if not np.any(band_mask):
            continue
        band_power = float(np.trapezoid(psd[band_mask], freqs[band_mask]))
        if band_power > POWER_THRESHOLD:
            duration += WINDOW_SECONDS

    return duration


def _detect_data_segments(
    raw_timestamps: list[datetime],
    fs: float,
) -> list[DataSegment]:
    """Detect continuous data segments by identifying gaps in timestamps."""
    if not raw_timestamps:
        return []

    # Use the same threshold as timeline visualization (5 seconds)
    gap_threshold = GAP_VISUALIZATION_THRESHOLD_SECONDS

    segments = []
    segment_start = raw_timestamps[0]

    for i in range(1, len(raw_timestamps)):
        time_diff = (raw_timestamps[i] - raw_timestamps[i - 1]).total_seconds()
        if time_diff > gap_threshold:
            # Gap detected, close current segment
            segments.append(
                DataSegment(
                    start_time=segment_start,
                    end_time=raw_timestamps[i - 1],
                )
            )
            segment_start = raw_timestamps[i]

    # Add final segment
    segments.append(
        DataSegment(
            start_time=segment_start,
            end_time=raw_timestamps[-1],
        )
    )

    return segments


def _build_continuity_timeline(
    data_segments: list[DataSegment],
    overall_start: datetime,
    overall_end: datetime,
) -> list[TimelineSegment]:
    """Build a timeline showing data segments and gaps >= GAP_VISUALIZATION_THRESHOLD_SECONDS."""
    if not data_segments:
        return []

    timeline = []

    for i, segment in enumerate(data_segments):
        # Add data segment
        timeline.append(
            TimelineSegment(
                start_time=segment.start_time,
                end_time=segment.end_time,
                is_gap=False,
            )
        )

        # Check for gap after this segment (except for the last segment)
        if i < len(data_segments) - 1:
            gap_start = segment.end_time
            gap_end = data_segments[i + 1].start_time
            gap_duration = (gap_end - gap_start).total_seconds()

            if gap_duration >= GAP_VISUALIZATION_THRESHOLD_SECONDS:
                timeline.append(
                    TimelineSegment(
                        start_time=gap_start,
                        end_time=gap_end,
                        is_gap=True,
                    )
                )

    return timeline


def _compute_tremor_timeseries(
    signal: np.ndarray,
    fs: float,
    start_datetime: datetime,
    timestamps: np.ndarray,
) -> list[TimeIntensityPoint]:
    """Compute tremor intensity time series using sliding windows with overlap."""
    if signal.size < MIN_SAMPLES:
        return []

    window_len = int(WINDOW_SECONDS * fs)
    if window_len < 1:
        return []

    step_size = max(1, int(window_len * (1 - OVERLAP_FRACTION)))
    nperseg = min(256, window_len)
    result = []

    for start in range(0, signal.size - window_len + 1, step_size):
        window = signal[start : start + window_len]
        freqs, psd = welch(window, fs=fs, nperseg=nperseg)
        band_mask = (freqs >= PEAK_LOW_HZ) & (freqs <= PEAK_HIGH_HZ)

        if not np.any(band_mask):
            intensity = 0.0
        else:
            intensity = float(np.trapezoid(psd[band_mask], freqs[band_mask]))

        # Window center time
        window_center_idx = start + window_len // 2
        if window_center_idx < len(timestamps):
            center_time_offset = timestamps[window_center_idx]
            center_datetime = start_datetime + timedelta(seconds=float(center_time_offset))
            result.append(
                TimeIntensityPoint(
                    time=center_datetime,
                    intensity=intensity,
                )
            )

    return result


def _compute_aggregate_spectrum(
    signal: np.ndarray,
    fs: float,
) -> list[SpectrumPoint]:
    """Compute aggregated power spectrum by averaging PSDs across overlapping windows."""
    if signal.size < MIN_SAMPLES:
        return []

    window_len = int(WINDOW_SECONDS * fs)
    if window_len < 1:
        return []

    step_size = max(1, int(window_len * (1 - OVERLAP_FRACTION)))
    nperseg = min(256, window_len)

    psd_sum = None
    count = 0

    for start in range(0, signal.size - window_len + 1, step_size):
        window = signal[start : start + window_len]
        freqs, psd = welch(window, fs=fs, nperseg=nperseg)

        if psd_sum is None:
            psd_sum = np.zeros_like(psd)

        psd_sum += psd
        count += 1

    if count == 0 or psd_sum is None:
        return []

    # Average and filter to 0-20 Hz
    psd_avg = psd_sum / count
    freq_mask = freqs <= MAX_SPECTRUM_HZ

    result = [
        SpectrumPoint(
            frequency=float(freqs[i]),
            power=float(psd_avg[i]),
        )
        for i in range(len(freqs))
        if freq_mask[i]
    ]

    return result


def _detect_tremor_events(
    tremor_intensity_timeseries: list[TimeIntensityPoint],
) -> list[dict]:
    """Detect tremor events using a state machine approach.
    
    A tremor event is a continuous period where intensity > MINIMUM_TREMOR_ACTIVATION
    for at least 2 seconds (one window), and ends when intensity drops below threshold
    for TREMOR_DEACTIVATION_TIME.
    
    Returns list of dicts: {start_time, end_time, duration_seconds, peak_intensity, avg_intensity}
    """
    if not tremor_intensity_timeseries:
        return []
    
    events = []
    active_start = None
    below_threshold_start = None
    event_intensities = []
    
    for point in tremor_intensity_timeseries:
        if point.intensity > MINIMUM_TREMOR_ACTIVATION:
            # Above threshold - reset deactivation timer
            below_threshold_start = None
            
            if active_start is None:
                # Start new event
                active_start = point.time
                event_intensities = [point.intensity]
            else:
                # Continue event
                event_intensities.append(point.intensity)
        else:
            # Below threshold
            if active_start is not None:
                if below_threshold_start is None:
                    below_threshold_start = point.time
                else:
                    # Check if we've been below threshold long enough to deactivate
                    time_below = (point.time - below_threshold_start).total_seconds()
                    if time_below >= TREMOR_DEACTIVATION_TIME:
                        # End the current event
                        event = {
                            "start_time": active_start,
                            "end_time": below_threshold_start,
                            "duration_seconds": (below_threshold_start - active_start).total_seconds(),
                            "peak_intensity": float(np.max(event_intensities)),
                            "avg_intensity": float(np.mean(event_intensities)),
                        }
                        events.append(event)
                        active_start = None
                        below_threshold_start = None
                        event_intensities = []
    
    # Handle final event if still active
    if active_start is not None:
        last_time = tremor_intensity_timeseries[-1].time
        event = {
            "start_time": active_start,
            "end_time": last_time,
            "duration_seconds": (last_time - active_start).total_seconds(),
            "peak_intensity": float(np.max(event_intensities)),
            "avg_intensity": float(np.mean(event_intensities)),
        }
        events.append(event)
    
    return events


def _classify_intensity(intensity: float) -> str:
    """Classify intensity into mild, medium, or intense.
    
    Returns: 'mild', 'medium', 'intense'
    """
    if intensity >= MEDIUM_INTENSITY_THRESHOLD:
        return "intense"
    elif intensity >= MILD_INTENSITY_THRESHOLD:
        return "medium"
    else:
        return "mild"


def _compute_tremor_percentages(
    tremor_intensity_timeseries: list[TimeIntensityPoint],
    tremor_events: list[dict],
) -> dict:
    """Compute percentage distribution of tremor intensity levels.
    
    Returns dict with keys:
    - tremor_activity_share: % of time in tremor (relative to window time)
    - mild_tremor_share: % of window time classified as mild
    - medium_tremor_share: % of window time classified as medium
    - intense_tremor_share: % of window time classified as intense
    """
    if not tremor_intensity_timeseries or not tremor_events:
        return {
            "tremor_activity_share": 0.0,
            "mild_tremor_share": 0.0,
            "medium_tremor_share": 0.0,
            "intense_tremor_share": 0.0,
        }
    
    # Calculate window duration (assuming regular intervals)
    if len(tremor_intensity_timeseries) < 2:
        window_duration = 1.0  # default 1 second per window
    else:
        window_duration = (
            tremor_intensity_timeseries[1].time - tremor_intensity_timeseries[0].time
        ).total_seconds()
    
    # Total time above activation threshold (approximated by counting windows)
    total_active_time = len(tremor_intensity_timeseries) * window_duration
    
    # Classify each window and accumulate time
    mild_time = 0.0
    medium_time = 0.0
    intense_time = 0.0
    
    for point in tremor_intensity_timeseries:
        classification = _classify_intensity(point.intensity)
        if classification == "mild":
            mild_time += window_duration
        elif classification == "medium":
            medium_time += window_duration
        elif classification == "intense":
            intense_time += window_duration
    
    # Calculate percentages relative to total active time
    if total_active_time > 0:
        mild_share = 100.0 * mild_time / total_active_time
        medium_share = 100.0 * medium_time / total_active_time
        intense_share = 100.0 * intense_time / total_active_time
    else:
        mild_share = 0.0
        medium_share = 0.0
        intense_share = 0.0
    
    # Tremor activity share = total time with intensity >= MINIMUM_TREMOR_ACTIVATION
    tremor_time = sum(
        window_duration
        for point in tremor_intensity_timeseries
        if point.intensity > MINIMUM_TREMOR_ACTIVATION
    )
    tremor_activity_share = 100.0 * tremor_time / total_active_time if total_active_time > 0 else 0.0
    
    return {
        "tremor_activity_share": tremor_activity_share,
        "mild_tremor_share": mild_share,
        "medium_tremor_share": medium_share,
        "intense_tremor_share": intense_share,
    }


def _compute_average_event_duration(tremor_events: list[dict]) -> float:
    """Compute average duration of tremor events.
    
    Returns: Mean duration in seconds, or 0.0 if no events.
    """
    if not tremor_events:
        return 0.0
    
    total_duration = sum(event["duration_seconds"] for event in tremor_events)
    return total_duration / len(tremor_events)
