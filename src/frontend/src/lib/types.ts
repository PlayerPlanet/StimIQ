export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
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
