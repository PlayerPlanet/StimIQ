from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import sqrt
from uuid import UUID, uuid4

from .schemas import (
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
