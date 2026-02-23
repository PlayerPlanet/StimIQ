const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface PromTestCreate {
  patientId: string;
  testDate: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
}

export interface PromTestRead extends PromTestCreate {
  id: string;
  createdAt: string;
}

export async function createPromTest(data: PromTestCreate): Promise<PromTestRead> {
  const payload = {
    patient_id: data.patientId,
    test_date: data.testDate,
    q1: data.q1,
    q2: data.q2,
    q3: data.q3,
    q4: data.q4,
    q5: data.q5,
    q6: data.q6,
    q7: data.q7,
    q8: data.q8,
    q9: data.q9,
    q10: data.q10,
  };

  const response = await fetch(`${API_BASE_URL}/prom_tests`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create PROM test');
  }

  const result = await response.json();
  return {
    id: result.id,
    patientId: result.patient_id,
    testDate: result.test_date,
    createdAt: result.created_at,
    q1: result.q1,
    q2: result.q2,
    q3: result.q3,
    q4: result.q4,
    q5: result.q5,
    q6: result.q6,
    q7: result.q7,
    q8: result.q8,
    q9: result.q9,
    q10: result.q10,
  };
}

export async function getPromTests(params: {
  patientId: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PromTestRead[]> {
  const searchParams = new URLSearchParams();
  searchParams.append('patient_id', params.patientId);
  if (params.dateFrom) searchParams.append('date_from', params.dateFrom);
  if (params.dateTo) searchParams.append('date_to', params.dateTo);

  const response = await fetch(`${API_BASE_URL}/prom_tests?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to fetch PROM tests');
  }

  const results = await response.json();
  return results.map((prom: any) => ({
    id: prom.id,
    patientId: prom.patient_id,
    testDate: prom.test_date,
    createdAt: prom.created_at,
    q1: prom.q1,
    q2: prom.q2,
    q3: prom.q3,
    q4: prom.q4,
    q5: prom.q5,
    q6: prom.q6,
    q7: prom.q7,
    q8: prom.q8,
    q9: prom.q9,
    q10: prom.q10,
  }));
}
