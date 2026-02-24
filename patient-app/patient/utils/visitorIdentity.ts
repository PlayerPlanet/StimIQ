import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITOR_PATIENT_ID_KEY = 'stimiq.visitor_patient_id';
const DATA_COLLECTION_CONSENT_KEY = 'stimiq.data_collection_consent';

export type DataCollectionConsent = 'approved' | 'rejected';

function generateVisitorPatientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Returns the stored visitor patient ID or creates a new one. Async because AsyncStorage is async. */
export async function getOrCreateVisitorPatientId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(VISITOR_PATIENT_ID_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }
    const generated = generateVisitorPatientId();
    await AsyncStorage.setItem(VISITOR_PATIENT_ID_KEY, generated);
    return generated;
  } catch {
    return generateVisitorPatientId();
  }
}

export async function getDataCollectionConsent(): Promise<DataCollectionConsent | null> {
  try {
    const stored = await AsyncStorage.getItem(DATA_COLLECTION_CONSENT_KEY);
    if (stored === 'approved' || stored === 'rejected') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setDataCollectionConsent(
  consent: DataCollectionConsent
): Promise<void> {
  try {
    await AsyncStorage.setItem(DATA_COLLECTION_CONSENT_KEY, consent);
  } catch {
    // ignore storage errors
  }
}
