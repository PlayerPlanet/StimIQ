import type {
  IMUBatchPayload,
  IMUBatchResponse,
  LineFollowSessionCreateRequest,
  LineFollowSessionCreateResponse,
  LineFollowSessionProcessRequest,
  LineFollowSessionProcessResponse,
  LineFollowSessionResult,
  FingerTapSessionCreateRequest,
  FingerTapSessionCreateResponse,
  FingerTapSessionProcessRequest,
  FingerTapSessionProcessResponse,
  FingerTapSessionResult,
  SpeechStepType,
  SpeechRecordingUploadResponse,
} from './types';

/**
 * API base URL – override with EXPO_PUBLIC_API_BASE_URL environment variable.
 * For local development, point this at your backend server.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, credentials: 'include' });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginSession(
  password: string
): Promise<{ status: string; message: string; expires_at: string }> {
  const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error('Failed to create session');
  return response.json();
}

export async function logoutSession(): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to clear session');
}

// ---------------------------------------------------------------------------
// PROM Tests
// ---------------------------------------------------------------------------

export interface PromTestCreate {
  patientId: string;
  testDate: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
}

export interface PromTestRead extends PromTestCreate {
  id: string;
  createdAt: string;
}

export async function createPromTest(data: PromTestCreate): Promise<PromTestRead> {
  const payload = {
    patient_id: data.patientId,
    test_date: data.testDate,
    q1: data.q1,
    q2: data.q2,
    q3: data.q3,
    q4: data.q4,
    q5: data.q5,
    q6: data.q6,
    q7: data.q7,
    q8: data.q8,
    q9: data.q9,
    q10: data.q10,
  };

  const response = await apiFetch(`${API_BASE_URL}/prom_tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { detail?: string }).detail ?? 'Failed to create PROM test');
  }

  const result = await response.json();
  return {
    id: result.id,
    patientId: result.patient_id,
    testDate: result.test_date,
    createdAt: result.created_at,
    q1: result.q1,
    q2: result.q2,
    q3: result.q3,
    q4: result.q4,
    q5: result.q5,
    q6: result.q6,
    q7: result.q7,
    q8: result.q8,
    q9: result.q9,
    q10: result.q10,
  };
}

// ---------------------------------------------------------------------------
// Hand tracking – line follow
// ---------------------------------------------------------------------------

export async function createLineFollowSession(
  data: LineFollowSessionCreateRequest
): Promise<LineFollowSessionCreateResponse> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/line_follow/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(`Create session failed (HTTP ${response.status})`);
  return response.json();
}

export async function processLineFollowSession(
  sessionId: string,
  data: LineFollowSessionProcessRequest
): Promise<LineFollowSessionProcessResponse> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/line_follow/sessions/${sessionId}/process`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(`Process session failed (HTTP ${response.status})`);
  return response.json();
}

export async function getLineFollowSessionResult(
  sessionId: string
): Promise<LineFollowSessionResult> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/line_follow/sessions/${sessionId}/result`
  );
  if (!response.ok)
    throw new Error(`Get session result failed (HTTP ${response.status})`);
  return response.json();
}

// ---------------------------------------------------------------------------
// Hand tracking – finger tap
// ---------------------------------------------------------------------------

export async function createFingerTapSession(
  data: FingerTapSessionCreateRequest
): Promise<FingerTapSessionCreateResponse> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(`Create session failed (HTTP ${response.status})`);
  return response.json();
}

export async function processFingerTapSession(
  sessionId: string,
  data: FingerTapSessionProcessRequest
): Promise<FingerTapSessionProcessResponse> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions/${sessionId}/process`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(`Process session failed (HTTP ${response.status})`);
  return response.json();
}

export async function getFingerTapSessionResult(
  sessionId: string
): Promise<FingerTapSessionResult> {
  const response = await apiFetch(
    `${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions/${sessionId}/result`
  );
  if (!response.ok)
    throw new Error(`Get session result failed (HTTP ${response.status})`);
  return response.json();
}

// ---------------------------------------------------------------------------
// Speech
// ---------------------------------------------------------------------------

export async function uploadSpeechRecordingRaw(data: {
  fileUri: string;
  mimeType: string;
  fileName: string;
  stepType: SpeechStepType;
  sessionId?: string | null;
  patientId?: string | null;
  durationMs?: number | null;
}): Promise<SpeechRecordingUploadResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: data.fileUri,
    type: data.mimeType,
    name: data.fileName,
  } as unknown as Blob);
  formData.append('step_type', data.stepType);
  if (data.sessionId) formData.append('session_id', data.sessionId);
  if (data.patientId) formData.append('patient_id', data.patientId);
  if (typeof data.durationMs === 'number')
    formData.append('duration_ms', String(data.durationMs));

  const response = await apiFetch(`${API_BASE_URL}/v1/speech/recordings/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`Speech upload failed (HTTP ${response.status})`);
  return response.json();
}

// ---------------------------------------------------------------------------
// IMU
// ---------------------------------------------------------------------------

export async function uploadIMUBatch(batch: IMUBatchPayload): Promise<IMUBatchResponse> {
  const response = await apiFetch(`${API_BASE_URL}/patient/imu-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  if (!response.ok)
    throw new Error(`IMU batch upload failed (HTTP ${response.status})`);
  return response.json();
}
