const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface PromDataEntry {
  test_date: string;
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

export interface AnalysisReportRequest {
  patient_id: string;
  prom_data: PromDataEntry[];
  patient_name?: string;
}

export interface AnalysisReportResponse {
  status: string;
  analysis_text: string;
}

export async function generateAnalysisReport(
  data: AnalysisReportRequest,
): Promise<AnalysisReportResponse> {
  const response = await fetch(`${API_BASE_URL}/patients/analysis-report`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to generate analysis report');
  }

  return response.json();
}
