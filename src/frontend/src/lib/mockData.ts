/**
 * Mock data for demo purposes
 * Clinical data with IDs and metrics for Pfizer-inspired UI
 */

export interface PatientSummary {
  id: string;
  patientId: string;
  name: string;
  age: number;
  diagnosis: string;
  status: 'stable' | 'monitor' | 'review';
}

export interface PatientLog {
  id: string;
  logId: string;
  patientId: string;
  date: string;
  symptomSeverity: number; // 1-10
  entryType: 'Tremor Assessment' | 'Medication Adjustment' | 'Routine Check' | 'Adverse Event';
  notesSummary: string;
}

export interface DBSSession {
  id: string;
  sessionId: string;
  date: string;
  duration: number; // minutes
  stimulationAmplitude: number; // mV
  frequency: number; // Hz
  pulseWidth: number; // µs
  notes: string;
}

export interface ModelParameters {
  stimulationAmplitude: number;
  frequency: number;
  pulseWidth: number;
  lastAdjustmentDate: string;
  nextCheckDate: string;
}

export interface PatientMetrics {
  stableDays: number;
  therapyAdjustments: number;
  recentLogsCount: number;
  averageSymptomScore: number;
}

export interface DBSParameterSet {
  stimulationAmplitude: number; // mA
  frequency: number; // Hz
  pulseWidth: number; // µs
}

export interface DBSParameterHistory {
  previous: DBSParameterSet;
  current: DBSParameterSet;
  previousVisitDate: string;
  currentVisitDate: string;
}

export interface TremorTimelinePoint {
  timestamp: string;
  amplitude: number; // 0-10
  stimulationAmplitude: number; // mA
  frequency: number; // Hz
  pulseWidth: number; // µs
}

// Mock patient data
export const mockPatient: PatientSummary = {
  id: 'P001',
  patientId: 'PT-0001',
  name: 'John D.',
  age: 62,
  diagnosis: 'Parkinson\'s Disease',
  status: 'stable',
};

// Mock patient for clinician view - single patient for demo
export const mockPatients: PatientSummary[] = [
  {
    id: 'P001',
    patientId: 'PT-0001',
    name: 'John D.',
    age: 62,
    diagnosis: 'Parkinson\'s Disease',
    status: 'stable',
  },
];

// Mock logs for patient
export const mockPatientLogs: PatientLog[] = [
  {
    id: 'L001',
    logId: 'LOG-2026-02-001',
    patientId: 'PT-0001',
    date: '2026-02-18',
    symptomSeverity: 3,
    entryType: 'Routine Check',
    notesSummary: 'Minimal tremor observed. DBS settings optimal.',
  },
  {
    id: 'L002',
    logId: 'LOG-2026-02-002',
    patientId: 'PT-0001',
    date: '2026-02-15',
    symptomSeverity: 5,
    entryType: 'Medication Adjustment',
    notesSummary: 'Slight increase in stiffness. Morning medication adjusted.',
  },
  {
    id: 'L003',
    logId: 'LOG-2026-02-003',
    patientId: 'PT-0001',
    date: '2026-02-12',
    symptomSeverity: 3,
    entryType: 'Routine Check',
    notesSummary: 'Standard check-in. No issues reported.',
  },
  {
    id: 'L004',
    logId: 'LOG-2026-02-004',
    patientId: 'PT-0001',
    date: '2026-02-08',
    symptomSeverity: 4,
    entryType: 'Tremor Assessment',
    notesSummary: 'Left hand tremor noted. DBS amplitude adjusted.',
  },
  {
    id: 'L005',
    logId: 'LOG-2026-02-005',
    patientId: 'PT-0001',
    date: '2026-02-01',
    symptomSeverity: 2,
    entryType: 'Routine Check',
    notesSummary: 'Excellent week. DBS functioning optimally.',
  },
];

// Mock DBS sessions
export const mockDBSSessions: DBSSession[] = [
  {
    id: 'S001',
    sessionId: 'SES-2026-02-001',
    date: '2026-02-15',
    duration: 45,
    stimulationAmplitude: 3.2,
    frequency: 130,
    pulseWidth: 60,
    notes: 'Routine maintenance. Patient reported good symptom control.',
  },
  {
    id: 'S002',
    sessionId: 'SES-2026-01-002',
    date: '2026-01-28',
    duration: 60,
    stimulationAmplitude: 3.0,
    frequency: 130,
    pulseWidth: 60,
    notes: 'Slight tremor observed. Amplitude increased by 0.2mV.',
  },
  {
    id: 'S003',
    sessionId: 'SES-2026-01-001',
    date: '2026-01-15',
    duration: 30,
    stimulationAmplitude: 2.8,
    frequency: 130,
    pulseWidth: 60,
    notes: 'Check-up session. All parameters within normal range.',
  },
];

// Mock DBS model parameters
export const mockModelParameters: ModelParameters = {
  stimulationAmplitude: 3.2,
  frequency: 130,
  pulseWidth: 60,
  lastAdjustmentDate: '2026-02-15',
  nextCheckDate: '2026-03-15',
};

// Mock data for patient dashboard overview
export const mockPatientOverview = {
  nextCheckUp: '2026-03-15',
  daysUntilCheckUp: 23,
  recentSymptomSeverity: 3,
  currentDBSStatus: 'optimal',
  lastAdjustment: '2026-02-15',
};

// Mock patient metrics for dashboard tiles
export const mockPatientMetrics: PatientMetrics = {
  stableDays: 42,
  therapyAdjustments: 3,
  recentLogsCount: 12,
  averageSymptomScore: 3.2,
};

// Mock DBS parameter history for visit-based comparison
export const mockDBSParameterHistory: DBSParameterHistory = {
  previous: {
    stimulationAmplitude: 2.8,
    frequency: 125,
    pulseWidth: 60,
  },
  current: {
    stimulationAmplitude: 3.2,
    frequency: 130,
    pulseWidth: 65,
  },
  previousVisitDate: '2026-01-15',
  currentVisitDate: '2026-02-15',
};

// Mock tremor timeline (wearable wrist amplitude over visit window)
// DBS parameters gradually adjusted from previous to current during the visit
export const mockTremorTimeline: TremorTimelinePoint[] = [
  { timestamp: '2026-02-15T08:00:00Z', amplitude: 6.1, stimulationAmplitude: 2.80, frequency: 125, pulseWidth: 60 },
  { timestamp: '2026-02-15T09:00:00Z', amplitude: 5.4, stimulationAmplitude: 2.84, frequency: 125, pulseWidth: 60 },
  { timestamp: '2026-02-15T10:00:00Z', amplitude: 4.9, stimulationAmplitude: 2.88, frequency: 126, pulseWidth: 61 },
  { timestamp: '2026-02-15T11:00:00Z', amplitude: 5.2, stimulationAmplitude: 2.93, frequency: 126, pulseWidth: 61 },
  { timestamp: '2026-02-15T12:00:00Z', amplitude: 4.3, stimulationAmplitude: 2.97, frequency: 127, pulseWidth: 62 },
  { timestamp: '2026-02-15T13:00:00Z', amplitude: 3.9, stimulationAmplitude: 3.01, frequency: 127, pulseWidth: 62 },
  { timestamp: '2026-02-15T14:00:00Z', amplitude: 3.4, stimulationAmplitude: 3.05, frequency: 128, pulseWidth: 63 },
  { timestamp: '2026-02-15T15:00:00Z', amplitude: 3.1, stimulationAmplitude: 3.09, frequency: 129, pulseWidth: 64 },
  { timestamp: '2026-02-15T16:00:00Z', amplitude: 2.8, stimulationAmplitude: 3.13, frequency: 129, pulseWidth: 64 },
  { timestamp: '2026-02-15T17:00:00Z', amplitude: 3.0, stimulationAmplitude: 3.17, frequency: 129, pulseWidth: 64 },
  { timestamp: '2026-02-15T18:00:00Z', amplitude: 2.6, stimulationAmplitude: 3.21, frequency: 130, pulseWidth: 65 },
  { timestamp: '2026-02-15T19:00:00Z', amplitude: 2.4, stimulationAmplitude: 3.20, frequency: 130, pulseWidth: 65 },
];
