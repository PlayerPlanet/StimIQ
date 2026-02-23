from datetime import datetime, timezone
from uuid import UUID, uuid4

from config import get_settings
from database import get_supabase
from hand_tracking.schemas import (
    FingerTapFrameInput,
    FingerTapRequest,
    FingerTapResult,
    LineFollowRequest,
    LineFollowResult,
    WristFrameInput,
)
from hand_tracking.service import compute_finger_tap_result, compute_line_follow_result


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sessions_table_name() -> str:
    return get_settings().supabase_hand_tracking_sessions_table


def _results_table_name() -> str:
    return get_settings().supabase_hand_tracking_results_table


def _fetch_session_row(session_id: UUID) -> dict:
    supabase = get_supabase()
    response = (
        supabase.table(_sessions_table_name())
        .select("*")
        .eq("id", str(session_id))
        .limit(1)
        .execute()
    )
    if not response.data:
        raise KeyError(f"Session {session_id} not found")
    return response.data[0]


def create_line_follow_session(payload: LineFollowRequest) -> UUID:
    supabase = get_supabase()
    session_id = uuid4()
    now = _utc_now_iso()

    row = {
        "id": str(session_id),
        "patient_id": str(payload.patient_id) if payload.patient_id is not None else None,
        "status": "created",
        "request_payload": payload.model_dump(mode="json"),
        "created_at": now,
        "updated_at": now,
    }

    response = supabase.table(_sessions_table_name()).insert(row).execute()
    if not response.data:
        raise RuntimeError("Failed to create hand tracking session")
    return session_id


def process_line_follow_session(
    session_id: UUID,
    frames: list[WristFrameInput] | None = None,
) -> None:
    supabase = get_supabase()
    session_row = _fetch_session_row(session_id)
    request_payload = session_row.get("request_payload")
    if not isinstance(request_payload, dict):
        raise ValueError("Session request payload is missing or malformed")
    if request_payload.get("test_type") != "LINE_FOLLOW":
        raise ValueError("Session is not a LINE_FOLLOW session")

    request = LineFollowRequest.model_validate(request_payload)

    if frames:
        request.frames = frames
    elif not request.frames:
        raise ValueError("No frame data available for processing")

    result = compute_line_follow_result(session_id=session_id, request=request)
    now = _utc_now_iso()

    upsert_row = {
        "session_id": str(session_id),
        "result_payload": result.model_dump(mode="json"),
        "created_at": now,
        "updated_at": now,
    }
    supabase.table(_results_table_name()).upsert(upsert_row, on_conflict="session_id").execute()

    supabase.table(_sessions_table_name()).update(
        {
            "status": "processed",
            "request_payload": request.model_dump(mode="json"),
            "updated_at": now,
        }
    ).eq("id", str(session_id)).execute()


def get_line_follow_session_result(session_id: UUID) -> LineFollowResult:
    supabase = get_supabase()

    result_response = (
        supabase.table(_results_table_name())
        .select("result_payload")
        .eq("session_id", str(session_id))
        .limit(1)
        .execute()
    )
    if result_response.data:
        payload = result_response.data[0].get("result_payload")
        if not isinstance(payload, dict):
            raise RuntimeError("Result payload is malformed")
        return LineFollowResult.model_validate(payload)

    session_row = _fetch_session_row(session_id)
    if session_row.get("status") != "processed":
        raise RuntimeError("Session has not been processed yet")
    raise RuntimeError("Session is processed but result payload is missing")


def create_finger_tap_session(payload: FingerTapRequest) -> UUID:
    supabase = get_supabase()
    session_id = uuid4()
    now = _utc_now_iso()

    row = {
        "id": str(session_id),
        "patient_id": str(payload.patient_id) if payload.patient_id is not None else None,
        "status": "created",
        "request_payload": payload.model_dump(mode="json"),
        "created_at": now,
        "updated_at": now,
    }

    response = supabase.table(_sessions_table_name()).insert(row).execute()
    if not response.data:
        raise RuntimeError("Failed to create finger tap session")
    return session_id


def process_finger_tap_session(
    session_id: UUID,
    frames: list[FingerTapFrameInput] | None = None,
) -> None:
    supabase = get_supabase()
    session_row = _fetch_session_row(session_id)
    request_payload = session_row.get("request_payload")
    if not isinstance(request_payload, dict):
        raise ValueError("Session request payload is missing or malformed")
    if request_payload.get("test_type") != "FINGER_TAP":
        raise ValueError("Session is not a FINGER_TAP session")

    request = FingerTapRequest.model_validate(request_payload)

    if frames:
        request.frames = frames
    elif not request.frames:
        raise ValueError("No frame data available for processing")

    result = compute_finger_tap_result(session_id=session_id, request=request)
    now = _utc_now_iso()

    upsert_row = {
        "session_id": str(session_id),
        "result_payload": result.model_dump(mode="json"),
        "created_at": now,
        "updated_at": now,
    }
    supabase.table(_results_table_name()).upsert(upsert_row, on_conflict="session_id").execute()

    supabase.table(_sessions_table_name()).update(
        {
            "status": "processed",
            "request_payload": request.model_dump(mode="json"),
            "updated_at": now,
        }
    ).eq("id", str(session_id)).execute()


def get_finger_tap_session_result(session_id: UUID) -> FingerTapResult:
    supabase = get_supabase()

    result_response = (
        supabase.table(_results_table_name())
        .select("result_payload")
        .eq("session_id", str(session_id))
        .limit(1)
        .execute()
    )
    if result_response.data:
        payload = result_response.data[0].get("result_payload")
        if not isinstance(payload, dict):
            raise RuntimeError("Result payload is malformed")
        return FingerTapResult.model_validate(payload)

    session_row = _fetch_session_row(session_id)
    if session_row.get("status") != "processed":
        raise RuntimeError("Session has not been processed yet")
    raise RuntimeError("Session is processed but result payload is missing")
