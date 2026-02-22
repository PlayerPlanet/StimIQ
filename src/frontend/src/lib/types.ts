export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
}

export interface PatientDetail extends Patient {
  // Contact Information
  email?: string | null;
  phone?: string | null;
  
  // Demographics
  gender?: string | null;
  
  // DBS Treatment Information
  diagnosis_date?: string | null;
  implant_date?: string | null;
  device_model?: string | null;
  device_serial?: string | null;
  lead_location?: string | null;
  
  // Clinical Team
  primary_physician?: string | null;
  care_coordinator?: string | null;
  
  // Treatment Status
  treatment_status?: string | null;
  last_programming_date?: string | null;
  next_appointment?: string | null;
}
export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  notes?: string | null;
}

export interface IMUUploadResponse {
  patient_id: string;
  bucket: string;
  file_path: string;
  uploaded_at: string;
}

export interface HypotheticalParameterTuple {
  amplitude_ma: number;
  frequency_hz: number;
  pulse_width_us: number;
  phase_deg: number;
}

export interface HypotheticalSimulationRequest {
  tuple_count: 2 | 4 | 8 | 16;
  parameter_tuples: HypotheticalParameterTuple[];
}

export interface HypotheticalSimulationResponse {
  status: string;
  message: string;
  sampling_hz: number;
  duration_s: number;
  channels: Array<{
    channel_id: number;
    label: string;
    points: Array<{
      time_s: number;
      deviation: number;
    }>;
  }>;
}

export interface DbsTuningChannelRecommendation {
  channel_id: number;
  amplitude: number;
  frequency: number;
  pulse_width_s: number;
  phase_rad: number;
}

export interface DbsTuningWithSimulationResponse {
  patient_id: string;
  recommended_parameters: DbsTuningChannelRecommendation[];
  explanations: string[];
  simulated_data?: HypotheticalSimulationResponse | null;
}

export interface OptimizationStepRequest {
  tuple_count: 2 | 4 | 8 | 16;
  current_parameter_tuples: HypotheticalParameterTuple[];
  include_simulation?: boolean;
}

export interface OptimizationStepResponse {
  status: string;
  message: string;
  step_severity: number;
  next_parameter_tuples: HypotheticalParameterTuple[];
  simulation?: HypotheticalSimulationResponse | null;
}

export interface AgentPromptResponse {
  status: string;
  message: string;
  response_text: string;
}
