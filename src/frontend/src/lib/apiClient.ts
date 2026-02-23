import type {
  Patient,
  PatientDetail,
  CreatePatientRequest,
  IMUUploadResponse,
  HypotheticalSimulationRequest,
  HypotheticalSimulationResponse,
  DbsTuningWithSimulationResponse,
  OptimizationStepRequest,
  OptimizationStepResponse,
  AgentPromptResponse,
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
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

console.log(`API Client initialized. Base URL: ${API_BASE_URL}`);

/**
 * Get all patients
 * GET /api/patients
 */
export async function getClinicianPatients(): Promise<Patient[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`);
    if (response.ok) {
      return response.json();
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    throw error;
  }
}

/**
 * Get patient detail by ID
 * GET /api/patients/{patientId}
 */
export async function getPatientDetail(patientId: string): Promise<PatientDetail> {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
  if (!response.ok) throw new Error('Patient not found');
  return response.json();
}

/**
 * Create a new patient
 * POST /api/patients
 */
export async function createPatient(data: CreatePatientRequest): Promise<Patient> {
  const response = await fetch(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create patient');
  return response.json();
}

/**
 * Upload IMU data file for a patient
 * POST /api/patients/{patientId}/imu-upload
 */
export async function uploadIMU(
  patientId: string,
  file: File,
  date?: string
): Promise<IMUUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (date) formData.append('date', date);

  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/imu-upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload IMU file');
  return response.json();
}

/**
 * Simulate hypothetical DBS parameters.
 * POST /api/clinician/simulate
 */
export async function simulateHypotheticalParameters(
  data: HypotheticalSimulationRequest
): Promise<HypotheticalSimulationResponse> {
  const response = await fetch(`${API_BASE_URL}/clinician/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Simulation failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Get DBS tuning recommendation and optionally return simulated data for those parameters.
 * GET /api/clinician/dbs_tuning/{patientId}
 */
export async function getDbsTuningWithOptionalSimulation(
  patientId: string,
  options?: {
    includeSimulation?: boolean;
    tupleCount?: 2 | 4 | 8 | 16;
  }
): Promise<DbsTuningWithSimulationResponse> {
  const params = new URLSearchParams();
  if (options?.includeSimulation) {
    params.set('include_simulation', 'true');
  }
  if (options?.tupleCount) {
    params.set('tuple_count', String(options.tupleCount));
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/clinician/dbs_tuning/${patientId}${query ? `?${query}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`DBS tuning request failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Run one closed-loop optimization step.
 * POST /api/clinician/optimize-step
 */
export async function optimizeSimulationStep(
  data: OptimizationStepRequest
): Promise<OptimizationStepResponse> {
  const response = await fetch(`${API_BASE_URL}/clinician/optimize-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Optimize step failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Send free-form prompt to clinician DBS agent.
 * POST /api/clinician/agent-prompt
 */
export async function sendAgentPrompt(prompt: string): Promise<AgentPromptResponse> {
  const response = await fetch(`${API_BASE_URL}/clinician/agent-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Agent prompt failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Create hand tracking line-follow session.
 * POST /api/v1/hand_tracking/line_follow/sessions
 */
export async function createLineFollowSession(
  data: LineFollowSessionCreateRequest
): Promise<LineFollowSessionCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/line_follow/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Create session failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Process hand tracking line-follow session.
 * POST /api/v1/hand_tracking/line_follow/sessions/{sessionId}/process
 */
export async function processLineFollowSession(
  sessionId: string,
  data: LineFollowSessionProcessRequest
): Promise<LineFollowSessionProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/line_follow/sessions/${sessionId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Process session failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Get hand tracking line-follow session result.
 * GET /api/v1/hand_tracking/line_follow/sessions/{sessionId}/result
 */
export async function getLineFollowSessionResult(
  sessionId: string
): Promise<LineFollowSessionResult> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/line_follow/sessions/${sessionId}/result`);

  if (!response.ok) {
    throw new Error(`Get session result failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Create hand tracking finger-tap session.
 * POST /api/v1/hand_tracking/finger_tap/sessions
 */
export async function createFingerTapSession(
  data: FingerTapSessionCreateRequest
): Promise<FingerTapSessionCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Create session failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Process hand tracking finger-tap session.
 * POST /api/v1/hand_tracking/finger_tap/sessions/{sessionId}/process
 */
export async function processFingerTapSession(
  sessionId: string,
  data: FingerTapSessionProcessRequest
): Promise<FingerTapSessionProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions/${sessionId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Process session failed (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Get hand tracking finger-tap session result.
 * GET /api/v1/hand_tracking/finger_tap/sessions/{sessionId}/result
 */
export async function getFingerTapSessionResult(
  sessionId: string
): Promise<FingerTapSessionResult> {
  const response = await fetch(`${API_BASE_URL}/v1/hand_tracking/finger_tap/sessions/${sessionId}/result`);

  if (!response.ok) {
    throw new Error(`Get session result failed (HTTP ${response.status})`);
  }

  return response.json();
}

