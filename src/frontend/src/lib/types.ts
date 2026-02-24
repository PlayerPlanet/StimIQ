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
  treatment_w_motor?: number | null;
  treatment_w_non_motor?: number | null;
  treatment_w_duration?: number | null;
  treatment_w_speech?: number | null;
  treatment_non_motor_diary_ratio?: number | null;
  treatment_goals_notes?: string | null;
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

export interface HandTrackingPoint {
  x: number;
  y: number;
}

export interface HandTrackingWristFrameInput {
  t_ms: number;
  wrist_raw: HandTrackingPoint | null;
  conf?: number | null;
  inferred_hand?: 'LEFT' | 'RIGHT' | 'UNKNOWN' | null;
}

export interface LineFollowSessionCreateRequest {
  test_type: 'LINE_FOLLOW';
  protocol_version: 'v1';
  patient_id?: string | null;
  p1: HandTrackingPoint;
  p2: HandTrackingPoint;
  end_radius: number;
  corridor_radius: number;
  max_duration_ms: number;
  video_ref?: string | null;
  handedness_expected?: string | null;
  camera_orientation?: string | null;
  frames?: HandTrackingWristFrameInput[];
}

export interface LineFollowSessionCreateResponse {
  session_id: string;
  upload_url?: string | null;
  status: 'created' | 'processed';
}

export interface LineFollowSessionProcessRequest {
  frames: HandTrackingWristFrameInput[];
}

export interface LineFollowSessionProcessResponse {
  session_id: string;
  status: 'processed';
}

export interface LineFollowSessionResult {
  session_id: string;
  tracking_version: string;
  frames: Array<{
    t_ms: number;
    wrist_raw: HandTrackingPoint | null;
    wrist_smooth: HandTrackingPoint | null;
    conf: number;
  }>;
  quality: {
    visible_fraction: number;
    out_of_frame_fraction: number;
    redo_recommended: boolean;
    redo_instructions: string[];
  };
  metrics: {
    D_end: number | null;
    time_to_complete_ms: number | null;
    completed: boolean;
    path_length: number;
    line_length: number;
    straightness_ratio: number;
    mean_perp_dev: number;
    max_perp_dev: number;
    jerk_rms: number | null;
  };
  artifacts: Record<string, string>;
  created_at: string;
}

export interface FingerTapFrameInput {
  t_ms: number;
  thumb_tip: HandTrackingPoint | null;
  index_tip: HandTrackingPoint | null;
  wrist: HandTrackingPoint | null;
  middle_mcp: HandTrackingPoint | null;
  conf?: number | null;
  inferred_hand?: 'LEFT' | 'RIGHT' | 'UNKNOWN' | null;
}

export interface FingerTapSessionCreateRequest {
  test_type: 'FINGER_TAP';
  protocol_version: 'v1';
  patient_id?: string | null;
  max_duration_ms: number;
  video_ref?: string | null;
  handedness_expected?: string | null;
  camera_orientation?: string | null;
  frames?: FingerTapFrameInput[];
}

export interface FingerTapSessionCreateResponse {
  session_id: string;
  upload_url?: string | null;
  status: 'created' | 'processed';
}

export interface FingerTapSessionProcessRequest {
  frames: FingerTapFrameInput[];
}

export interface FingerTapSessionProcessResponse {
  session_id: string;
  status: 'processed';
}

export interface FingerTapSessionResult {
  session_id: string;
  tracking_version: string;
  frames: Array<{
    t_ms: number;
    conf: number;
    d_norm_raw: number | null;
    d_norm_smooth: number | null;
  }>;
  tap_indices: number[];
  tap_times_s: number[];
  quality: {
    visible_fraction: number;
    redo_recommended: boolean;
    redo_instructions: string[];
  };
  metrics: {
    tap_count: number;
    cadence_hz: number | null;
    cv_iti: number | null;
    mean_amp: number | null;
    cv_amp: number | null;
    decrement_amp_slope: number | null;
    pause_count: number | null;
    max_gap_s: number | null;
  };
  artifacts: Record<string, string>;
  created_at: string;
}

export type SpeechStepType =
  | 'SUSTAINED_VOWEL'
  | 'STANDARDIZED_SENTENCE'
  | 'RAPID_SYLLABLE_REPETITION';

export interface SpeechRecordingUploadResponse {
  id: string;
  patient_id: string | null;
  session_id: string | null;
  step_type: SpeechStepType;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  duration_ms: number | null;
  transcript: string | null;
}

// Treatment Goals
export interface TreatmentGoals {
  id?: string;
  patient_id: string;
  w_motor: number | null;
  w_non_motor: number | null;
  w_duration: number | null;
  w_speech: number | null;
  non_motor_diary_ratio: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TreatmentGoalsRequest {
  w_motor: number;
  w_non_motor: number;
  w_duration: number;
  w_speech: number;
  non_motor_diary_ratio: number;
  notes?: string | null;
}

export interface TreatmentGoalsPreset {
  name: string;
  description: string;
  w_motor: number;
  w_non_motor: number;
  w_duration: number;
  w_speech: number;
  non_motor_diary_ratio: number;
}

// Predefined treatment goal presets
export const TREATMENT_GOAL_PRESETS: TreatmentGoalsPreset[] = [
  {
    name: 'default',
    description: 'Balanced approach to all severity components',
    w_motor: 0.33,
    w_non_motor: 0.33,
    w_duration: 0.34,
    w_speech: 0.0,
    non_motor_diary_ratio: 0.5,
  },
  {
    name: 'motor_focused',
    description: 'Prioritize motor symptoms',
    w_motor: 0.55,
    w_non_motor: 0.35,
    w_duration: 0.10,
    w_speech: 0.0,
    non_motor_diary_ratio: 0.5,
  },
  {
    name: 'quality_of_life_focused',
    description: 'Prioritize non-motor symptoms',
    w_motor: 0.20,
    w_non_motor: 0.70,
    w_duration: 0.10,
    w_speech: 0.0,
    non_motor_diary_ratio: 0.65,
  },
];
