export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
}

<<<<<<< HEAD
=======
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

>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
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
