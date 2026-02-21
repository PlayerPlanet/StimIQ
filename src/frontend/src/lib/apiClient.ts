/**
 * API Client
 * Currently returns mock data for demo mode.
 * In production, replace with actual FastAPI integration.
 */

import type {
  PatientSummary,
  PatientLog,
  DBSSession,
  ModelParameters,
  PatientMetrics,
  DBSParameterHistory,
  TremorTimelinePoint,
} from './mockData';
import {
  mockPatient,
  mockPatients,
  mockPatientLogs,
  mockDBSSessions,
  mockModelParameters,
  mockPatientOverview,
  mockPatientMetrics,
  mockDBSParameterHistory,
  mockTremorTimeline,
} from './mockData';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
// const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

console.log(`API Client initialized. Demo Mode: ${isDemoMode}`);

/**
 * Get patient overview/summary
 */
export async function getPatientOverview() {
  if (isDemoMode) {
    return Promise.resolve(mockPatientOverview);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/overview`);
  // return response.json();
  
  return Promise.resolve(mockPatientOverview);
}

/**
 * Get detailed patient information
 */
export async function getPatientDetail(patientId?: string): Promise<PatientSummary> {
  // Demo: look up patient by id
  if (patientId) {
    const match = mockPatients.find((patient) => patient.id === patientId);
    if (match) return Promise.resolve(match);
  }
  return Promise.resolve(mockPatient);
}

/**
 * Get all patients (for clinician dashboard)
 */
export async function getClinicianPatients(): Promise<PatientSummary[]> {
  if (isDemoMode) {
    return Promise.resolve(mockPatients);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients`);
  // return response.json();

  return Promise.resolve(mockPatients);
}

/**
 * Get patient logs (symptom reports, session notes)
 */
export async function getPatientLogs(): Promise<PatientLog[]> {
  if (isDemoMode) {
    return Promise.resolve(mockPatientLogs);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/logs`);
  // return response.json();

  return Promise.resolve(mockPatientLogs);
}

/**
 * Get DBS session history
 */
export async function getDBSSessions(): Promise<DBSSession[]> {
  if (isDemoMode) {
    return Promise.resolve(mockDBSSessions);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/sessions`);
  // return response.json();

  return Promise.resolve(mockDBSSessions);
}

/**
 * Get current DBS model parameters
 */
export async function getModelParameters(): Promise<ModelParameters> {
  if (isDemoMode) {
    return Promise.resolve(mockModelParameters);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/parameters`);
  // return response.json();

  return Promise.resolve(mockModelParameters);
}

/**
 * Update DBS model parameters (demo only - no real backend call)
 */
export async function updateModelParameters(
  parameters: Partial<ModelParameters>
): Promise<ModelParameters> {
  if (isDemoMode) {
    // Mock: return updated parameters
    return Promise.resolve({ ...mockModelParameters, ...parameters });
  }

  // Future: Use real API
  // const response = await fetch(
  //   `${apiBaseUrl}/patients/${patientId}/parameters`,
  //   {
  //     method: 'PATCH',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(parameters),
  //   }
  // );
  // return response.json();

  return Promise.resolve({ ...mockModelParameters, ...parameters });
}

/**
 * Get patient metrics for dashboard tiles
 */
export async function getPatientMetrics(): Promise<PatientMetrics> {
  if (isDemoMode) {
    return Promise.resolve(mockPatientMetrics);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/metrics`);
  // return response.json();

  return Promise.resolve(mockPatientMetrics);
}

/**
 * Get DBS parameter history for before/after comparison
 */
export async function getDBSParameterHistory(): Promise<DBSParameterHistory> {
  if (isDemoMode) {
    return Promise.resolve(mockDBSParameterHistory);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/parameters/history`);
  // return response.json();

  return Promise.resolve(mockDBSParameterHistory);
}

/**
 * Get tremor timeline data from wearable
 */
export async function getTremorTimeline(): Promise<TremorTimelinePoint[]> {
  if (isDemoMode) {
    return Promise.resolve(mockTremorTimeline);
  }

  // Future: Use real API
  // const response = await fetch(`${apiBaseUrl}/patients/${patientId}/tremor-timeline`);
  // return response.json();

  return Promise.resolve(mockTremorTimeline);
}
