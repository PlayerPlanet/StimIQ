const VISITOR_PATIENT_ID_STORAGE_KEY = 'stimiq.visitor_patient_id';

function generateVisitorPatientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
}

export function getOrCreateVisitorPatientId(): string {
  if (typeof window === 'undefined') {
    return generateVisitorPatientId();
  }

  const existing = window.localStorage.getItem(VISITOR_PATIENT_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const generated = generateVisitorPatientId();
  window.localStorage.setItem(VISITOR_PATIENT_ID_STORAGE_KEY, generated);
  return generated;
}

