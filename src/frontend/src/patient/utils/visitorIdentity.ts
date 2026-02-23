const VISITOR_PATIENT_ID_STORAGE_KEY = 'stimiq.visitor_patient_id';
const DATA_COLLECTION_CONSENT_STORAGE_KEY = 'stimiq.data_collection_consent';

export type DataCollectionConsent = 'approved' | 'rejected';

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

export function getDataCollectionConsent(): DataCollectionConsent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(DATA_COLLECTION_CONSENT_STORAGE_KEY);
  if (stored === 'approved' || stored === 'rejected') {
    return stored;
  }
  return null;
}

export function setDataCollectionConsent(consent: DataCollectionConsent): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DATA_COLLECTION_CONSENT_STORAGE_KEY, consent);
}
