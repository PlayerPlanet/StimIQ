<<<<<<< HEAD
import type { Patient, CreatePatientRequest, IMUUploadResponse } from './types';
=======
import type { Patient, PatientDetail, CreatePatientRequest, IMUUploadResponse } from './types';
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df

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
<<<<<<< HEAD
export async function getPatientDetail(patientId: string): Promise<Patient> {
=======
export async function getPatientDetail(patientId: string): Promise<PatientDetail> {
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
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

