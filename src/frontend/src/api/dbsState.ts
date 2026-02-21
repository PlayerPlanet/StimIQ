const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface ChannelState {
  channel_id: number;
  amplitude: number;
  voltage: number;
  frequency: number;
  time_on_hours: number;
}

export interface DailyTremorPoint {
  date: string;
  avg_tremor_activity: number;
}

export interface DailyPromPoint {
  date: string;
  avg_prom_score: number;
}

export interface DbsState {
  patient_id: string;
  channels: ChannelState[];
  tremor_timeseries: DailyTremorPoint[];
  prom_timeseries: DailyPromPoint[];
}

export async function fetchDbsState(patientId: string): Promise<DbsState> {
  const response = await fetch(`${API_BASE_URL}/clinician/dbs_state/${patientId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch DBS state: ${response.status}`);
  }
  return response.json();
}
