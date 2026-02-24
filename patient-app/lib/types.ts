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

export interface IMUSample {
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
}

export interface IMUBatchPayload {
  patient_id: string;
  device_id: string;
  session_id: string;
  samples: IMUSample[];
  meta?: {
    user_agent?: string;
    sampling_hz?: number;
  };
}

export interface IMUBatchResponse {
  inserted: number;
  session_id: string;
}
