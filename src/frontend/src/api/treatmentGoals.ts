import type { TreatmentGoals, TreatmentGoalsRequest, TreatmentGoalsPreset } from '../lib/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Fetch treatment goals for a specific patient
 */
export async function fetchTreatmentGoals(patientId: string): Promise<TreatmentGoals> {
  const response = await fetch(`${API_BASE_URL}/treatment-goals/${patientId}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch treatment goals: ${response.status} ${body}`);
  }
  return response.json();
}

/**
 * Update treatment goals for a specific patient
 */
export async function updateTreatmentGoals(
  patientId: string,
  goals: TreatmentGoalsRequest
): Promise<TreatmentGoals> {
  const response = await fetch(`${API_BASE_URL}/treatment-goals/${patientId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goals),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to update treatment goals: ${response.status} ${body}`);
  }
  return response.json();
}

/**
 * Fetch available treatment goal presets
 */
export async function fetchTreatmentGoalPresets(): Promise<TreatmentGoalsPreset[]> {
  const response = await fetch(`${API_BASE_URL}/treatment-goals/presets`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch treatment goal presets: ${response.status} ${body}`);
  }
  return response.json();
}
