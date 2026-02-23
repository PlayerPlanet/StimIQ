from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import sqrt
from uuid import UUID, uuid4

from .schemas import (
    FingerTapFrameResult,
    FingerTapMetrics,
    FingerTapQuality,
    FingerTapRequest,
    FingerTapResult,
    LineFollowMetrics,
    LineFollowQuality,
    LineFollowRequest,
    LineFollowResult,
    Point2D,
    WristFrameInput,
    WristFrameResult,
)


def _distance(a: Point2D, b: Point2D) -> float:
    return sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


def _to_tuple(p: Point2D) -> tuple[float, float]:
    return (p.x, p.y)


def _sub(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return (a[0] - b[0], a[1] - b[1])


def _dot(a: tuple[float, float], b: tuple[float, float]) -> float:
    return a[0] * b[0] + a[1] * b[1]


def _norm(a: tuple[float, float]) -> float:
    return sqrt(a[0] ** 2 + a[1] ** 2)


def _slope(x: list[float], y: list[float]) -> float:
    if len(x) != len(y) or len(x) < 2:
        return 0.0
    mx = sum(x) / len(x)
    my = sum(y) / len(y)
    vx = sum((xi - mx) ** 2 for xi in x)
    if vx < 1e-12:
        return 0.0
    cxy = sum((x[i] - mx) * (y[i] - my) for i in range(len(x)))
    return cxy / vx


def _ema_smooth(values: list[float | None], alpha: float) -> list[float | None]:
    out: list[float | None] = []
    prev: float | None = None
    for v in values:
        if v is None:
            out.append(None)
            continue
        prev = v if prev is None else alpha * v + (1.0 - alpha) * prev
        out.append(prev)
    return out


def _estimate_fs_hz(timestamps_s: list[float], fs_hint: float | None = None) -> float:
    if fs_hint is not None and fs_hint > 0:
        return fs_hint
    dt = [timestamps_s[i] - timestamps_s[i - 1] for i in range(1, len(timestamps_s))]
    dt = [x for x in dt if x > 1e-3]
    if not dt:
        return 30.0
    return 1.0 / (sum(dt) / len(dt))


def _find_tap_minima(
    d_s: list[float | None],
    t_s: list[float],
    fs: float,
    min_interval_s: float = 0.12,
    window_s: float = 0.25,
    prom_thresh: float = 0.07,
) -> list[int]:
    n = len(d_s)
    if n < 3:
        return []

    window = max(1, int(window_s * fs))
    last_t = -1e9
    minima: list[int] = []

    for k in range(1, n - 1):
        if d_s[k] is None or d_s[k - 1] is None or d_s[k + 1] is None:
            continue
        if not (d_s[k] <= d_s[k - 1] and d_s[k] < d_s[k + 1]):
            continue

        tk = t_s[k]
        if (tk - last_t) < min_interval_s:
            continue

        left = [v for v in d_s[max(0, k - window):k] if v is not None]
        right = [v for v in d_s[k + 1:min(n, k + window + 1)] if v is not None]
        if not left or not right:
            continue
        prominence = min(max(left), max(right)) - d_s[k]
        if prominence < prom_thresh:
            continue

        minima.append(k)
        last_t = tk

    return minima


def _closest_dev(
    p1: Point2D, p2: Point2D, w: Point2D
) -> tuple[float, float]:
    p1t = _to_tuple(p1)
    p2t = _to_tuple(p2)
    wt = _to_tuple(w)
    u = _sub(p2t, p1t)
    line_len = _norm(u)
    if line_len == 0:
        return 0.0, _distance(w, p1)

    d = (u[0] / line_len, u[1] / line_len)
    rel = _sub(wt, p1t)
    s = _dot(rel, d)
    s_clamped = max(0.0, min(line_len, s))
    c = (p1t[0] + d[0] * s_clamped, p1t[1] + d[1] * s_clamped)
    dev = _norm(_sub(wt, c))
    return s_clamped, dev


def _smooth_frames(
    frames: list[WristFrameInput], alpha: float = 0.45, max_hold_ms: int = 200
) -> list[WristFrameResult]:
    if not frames:
        return []

    sorted_frames = sorted(frames, key=lambda f: f.t_ms)
    out: list[WristFrameResult] = []
    prev_smooth: Point2D | None = None
    prev_t_ms: int | None = None
    hold_anchor: Point2D | None = None

    for f in sorted_frames:
        conf = 1.0 if f.wrist_raw is not None else 0.0
        if f.conf is not None:
            conf = f.conf

        smooth: Point2D | None = None
        if f.wrist_raw is not None:
            if prev_smooth is None:
                smooth = f.wrist_raw
            else:
                sx = alpha * f.wrist_raw.x + (1.0 - alpha) * prev_smooth.x
                sy = alpha * f.wrist_raw.y + (1.0 - alpha) * prev_smooth.y
                smooth = Point2D(x=sx, y=sy)
            hold_anchor = smooth
        elif hold_anchor is not None and prev_t_ms is not None and (f.t_ms - prev_t_ms) <= max_hold_ms:
            smooth = hold_anchor

        prev_smooth = smooth if smooth is not None else prev_smooth
        prev_t_ms = f.t_ms
        out.append(
            WristFrameResult(
                t_ms=f.t_ms,
                wrist_raw=f.wrist_raw,
                wrist_smooth=smooth,
                conf=conf,
            )
        )

    return out


def compute_line_follow_result(session_id: UUID, request: LineFollowRequest) -> LineFollowResult:
    frame_results = _smooth_frames(request.frames)
    total = len(frame_results)
    visible_count = sum(1 for f in frame_results if f.conf > 0.0 and f.wrist_smooth is not None)
    visible_fraction = (visible_count / total) if total > 0 else 0.0

    out_of_frame_count = 0
    valid_points: list[tuple[int, Point2D]] = []
    for f in frame_results:
        p = f.wrist_smooth
        if p is None:
            continue
        valid_points.append((f.t_ms, p))
        if p.x < 0.02 or p.x > 0.98 or p.y < 0.02 or p.y > 0.98:
            out_of_frame_count += 1
    out_of_frame_fraction = (out_of_frame_count / max(1, len(valid_points))) if valid_points else 0.0

    redo_recommended = False
    redo_instructions: list[str] = []
    if visible_fraction < 0.7:
        redo_recommended = True
        redo_instructions.append("Keep your hand visible to the camera during the full test.")
    if out_of_frame_fraction > 0.2:
        redo_recommended = True
        redo_instructions.append("Keep your hand inside the capture area.")
    if not redo_instructions:
        redo_instructions.append("Tracking quality is acceptable.")

    line_length = _distance(request.p1, request.p2)
    path_length = 0.0
    dev_values: list[float] = []
    completed = False
    time_to_complete_ms: int | None = None
    completion_streak = 0
    completion_streak_target = 3

    for i, (t_ms, p) in enumerate(valid_points):
        if i > 0:
            path_length += _distance(valid_points[i - 1][1], p)
        _, dev = _closest_dev(request.p1, request.p2, p)
        dev_values.append(dev)

        d_end = _distance(p, request.p2)
        if d_end <= request.end_radius:
            completion_streak += 1
            if completion_streak >= completion_streak_target and not completed:
                completed = True
                time_to_complete_ms = t_ms
        else:
            completion_streak = 0

    if valid_points:
        result_endpoint = next(
            (p for t, p in valid_points if time_to_complete_ms is not None and t >= time_to_complete_ms),
            valid_points[-1][1],
        )
        d_end_value = _distance(result_endpoint, request.p2)
    else:
        d_end_value = None

    if path_length <= 0:
        straightness_ratio = 0.0
    else:
        straightness_ratio = min(1.0, line_length / path_length)

    metrics = LineFollowMetrics(
        D_end=d_end_value,
        time_to_complete_ms=time_to_complete_ms,
        completed=completed,
        path_length=path_length,
        line_length=line_length,
        straightness_ratio=straightness_ratio,
        mean_perp_dev=(sum(dev_values) / len(dev_values)) if dev_values else 0.0,
        max_perp_dev=max(dev_values) if dev_values else 0.0,
        jerk_rms=None,
    )
    quality = LineFollowQuality(
        visible_fraction=visible_fraction,
        out_of_frame_fraction=out_of_frame_fraction,
        redo_recommended=redo_recommended,
        redo_instructions=redo_instructions,
    )

    return LineFollowResult(
        session_id=session_id,
        tracking_version="line-follow-landmark0-ema-v1",
        frames=frame_results,
        quality=quality,
        metrics=metrics,
        artifacts={},
        created_at=datetime.now(timezone.utc),
    )


def compute_finger_tap_result(session_id: UUID, request: FingerTapRequest) -> FingerTapResult:
    sorted_frames = sorted(request.frames, key=lambda f: f.t_ms)
    timestamps_s = [f.t_ms / 1000.0 for f in sorted_frames]
    total = len(sorted_frames)

    d_norm_raw: list[float | None] = []
    conf_values: list[float] = []
    visible_count = 0

    for frame in sorted_frames:
        has_points = (
            frame.thumb_tip is not None
            and frame.index_tip is not None
            and frame.wrist is not None
            and frame.middle_mcp is not None
        )
        conf = frame.conf if frame.conf is not None else (1.0 if has_points else 0.0)
        conf_values.append(conf)

        if not has_points:
            d_norm_raw.append(None)
            continue

        visible_count += 1
        thumb = frame.thumb_tip
        index = frame.index_tip
        wrist = frame.wrist
        middle_mcp = frame.middle_mcp
        assert thumb is not None and index is not None and wrist is not None and middle_mcp is not None

        d_raw = _distance(thumb, index)
        scale = _distance(wrist, middle_mcp)
        d_norm_raw.append(d_raw / max(scale, 1e-6))

    d_norm_smooth = _ema_smooth(d_norm_raw, alpha=0.3)
    fs = _estimate_fs_hz(timestamps_s)
    tap_indices = _find_tap_minima(d_norm_smooth, timestamps_s, fs=fs)
    tap_times_s = [timestamps_s[k] for k in tap_indices]

    visible_fraction = (visible_count / total) if total > 0 else 0.0
    redo_recommended = False
    redo_instructions: list[str] = []
    if visible_fraction < 0.7:
        redo_recommended = True
        redo_instructions.append("Keep your full hand visible to the camera during the full test.")
    if len(tap_indices) < 5:
        redo_recommended = True
        redo_instructions.append("Tap faster and complete more repetitions for reliable scoring.")
    if not redo_instructions:
        redo_instructions.append("Tracking quality is acceptable.")

    cadence_hz: float | None = None
    cv_iti: float | None = None
    mean_amp: float | None = None
    cv_amp: float | None = None
    decrement_amp_slope: float | None = None
    pause_count: int | None = None
    max_gap_s: float | None = None

    if len(tap_times_s) >= 3:
        itis = [tap_times_s[i] - tap_times_s[i - 1] for i in range(1, len(tap_times_s))]
        mean_iti = sum(itis) / len(itis)
        var_iti = sum((x - mean_iti) ** 2 for x in itis) / len(itis)
        std_iti = sqrt(var_iti)
        cadence_hz = (1.0 / mean_iti) if mean_iti > 1e-6 else 0.0
        cv_iti = (std_iti / mean_iti) if mean_iti > 1e-6 else 0.0

        window = max(1, int(0.25 * fs))
        amps: list[float] = []
        amp_times: list[float] = []
        for tap_idx in tap_indices:
            left = [v for v in d_norm_smooth[max(0, tap_idx - window):tap_idx] if v is not None]
            right = [v for v in d_norm_smooth[tap_idx + 1:min(len(d_norm_smooth), tap_idx + window + 1)] if v is not None]
            center = d_norm_smooth[tap_idx]
            if not left or not right or center is None:
                continue
            amps.append(min(max(left), max(right)) - center)
            amp_times.append(timestamps_s[tap_idx])

        if amps:
            mean_amp = sum(amps) / len(amps)
            var_amp = sum((a - mean_amp) ** 2 for a in amps) / len(amps)
            std_amp = sqrt(var_amp)
            cv_amp = (std_amp / mean_amp) if mean_amp > 1e-6 else 0.0
            decrement_amp_slope = _slope(amp_times, amps) if len(amps) >= 3 else 0.0

        pause_count = sum(1 for x in itis if x > 0.5)
        max_gap_s = max(itis) if itis else 0.0

    frame_results: list[FingerTapFrameResult] = []
    for i, frame in enumerate(sorted_frames):
        frame_results.append(
            FingerTapFrameResult(
                t_ms=frame.t_ms,
                conf=conf_values[i],
                d_norm_raw=d_norm_raw[i],
                d_norm_smooth=d_norm_smooth[i],
            )
        )

    metrics = FingerTapMetrics(
        tap_count=len(tap_indices),
        cadence_hz=cadence_hz,
        cv_iti=cv_iti,
        mean_amp=mean_amp,
        cv_amp=cv_amp,
        decrement_amp_slope=decrement_amp_slope,
        pause_count=pause_count,
        max_gap_s=max_gap_s,
    )
    quality = FingerTapQuality(
        visible_fraction=visible_fraction,
        redo_recommended=redo_recommended,
        redo_instructions=redo_instructions,
    )

    return FingerTapResult(
        session_id=session_id,
        tracking_version="finger-tap-landmarks-ema-v1",
        frames=frame_results,
        tap_indices=tap_indices,
        tap_times_s=tap_times_s,
        quality=quality,
        metrics=metrics,
        artifacts={},
        created_at=datetime.now(timezone.utc),
    )


@dataclass
class SessionRecord:
    request: LineFollowRequest
    result: LineFollowResult | None = None
    status: str = "created"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class InMemoryLineFollowSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[UUID, SessionRecord] = {}

    def create(self, request: LineFollowRequest) -> UUID:
        session_id = uuid4()
        self._sessions[session_id] = SessionRecord(request=request)
        return session_id

    def get(self, session_id: UUID) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def process(self, session_id: UUID) -> LineFollowResult:
        record = self._sessions.get(session_id)
        if record is None:
            raise KeyError(str(session_id))

        result = compute_line_follow_result(session_id=session_id, request=record.request)
        record.result = result
        record.status = "processed"
        return result

    def update_frames(self, session_id: UUID, frames: list[WristFrameInput]) -> None:
        record = self._sessions.get(session_id)
        if record is None:
            raise KeyError(str(session_id))
        record.request.frames = frames
