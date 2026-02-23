from uuid import UUID

from database import get_supabase

AUTO_PROVISIONED_VISITOR_NOTE_PREFIX = "[auto-provisioned-visitor]"


def ensure_patient_exists(patient_id: UUID | str | None, source: str) -> str | None:
    if patient_id is None:
        return None

    try:
        candidate_uuid = UUID(str(patient_id))
    except ValueError:
        return str(patient_id)

    candidate = str(candidate_uuid)
    supabase = get_supabase()
    existing = (
        supabase.table("patients")
        .select("id")
        .eq("id", candidate)
        .limit(1)
        .execute()
    )
    if existing.data:
        return candidate

    supabase.table("patients").insert(
        {
            "id": candidate,
            "first_name": "Visitor",
            "last_name": "User",
            "notes": f"{AUTO_PROVISIONED_VISITOR_NOTE_PREFIX} source={source}",
        }
    ).execute()
    return candidate


def is_auto_provisioned_visitor_patient(patient_row: dict) -> bool:
    notes = patient_row.get("notes")
    return isinstance(notes, str) and notes.startswith(AUTO_PROVISIONED_VISITOR_NOTE_PREFIX)
