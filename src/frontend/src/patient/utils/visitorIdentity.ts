const VISITOR_PATIENT_ID_STORAGE_KEY = 'stimiq.visitor_patient_id';

function generateVisitorPatientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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
