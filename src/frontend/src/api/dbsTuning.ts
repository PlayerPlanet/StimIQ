const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface ChannelRecommendation {
  channel_id: number;
  amplitude: number;
  voltage: number;
  frequency: number;
  pulse_width_s: number;
  phase_rad: number;
  time_on_hours: number;
}

export interface DbsTuningRecommendation {
  patient_id: string;
  recommended_parameters: ChannelRecommendation[];
  explanations: string[];
}

export async function fetchDbsTuning(patientId: string): Promise<DbsTuningRecommendation> {
  const response = await fetch(`${API_BASE_URL}/clinician/dbs_tuning/${patientId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch DBS tuning: ${response.statusText}`);
  }
  return response.json();
}
