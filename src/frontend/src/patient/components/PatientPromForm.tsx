import { useState } from 'react';
import { createPromTest } from '../../api/promTests';
import { promQuestions, scaleLabels } from '../promQuestions';
import { Card } from '../../components/common/Card';

interface FormState {
  patientId: string;
  testDate: string;
  answers: Record<string, number>;
}

interface PatientPromFormProps {
  onPatientIdChange?: (patientId: string) => void;
}

export function PatientPromForm({ onPatientIdChange }: PatientPromFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    patientId: '',
    testDate: today,
    answers: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isFormValid = () => {
    if (!form.patientId.trim()) {
      setValidationError('Patient ID is required');
      return false;
    }
    if (!form.testDate) {
      setValidationError('Date is required');
      return false;
    }
    if (Object.keys(form.answers).length !== promQuestions.length) {
      setValidationError('All questions must be answered');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);

    if (!isFormValid()) return;

    setLoading(true);

    try {
      await createPromTest({
        patientId: form.patientId,
        testDate: form.testDate,
        q1: form.answers.q1,
        q2: form.answers.q2,
        q3: form.answers.q3,
        q4: form.answers.q4,
        q5: form.answers.q5,
        q6: form.answers.q6,
        q7: form.answers.q7,
        q8: form.answers.q8,
        q9: form.answers.q9,
        q10: form.answers.q10,
      });

      setSuccess(true);
      setForm({
        patientId: form.patientId,
        testDate: today,
        answers: {},
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit PROM test';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientIdChange = (value: string) => {
    setForm({ ...form, patientId: value });
    onPatientIdChange?.(value);
    setValidationError(null);
  };

  const handleAnswerChange = (questionId: string, value: number) => {
    setForm({
      ...form,
      answers: {
        ...form.answers,
        [questionId]: value,
      },
    });
    setValidationError(null);
  };

  const answeredCount = Object.keys(form.answers).length;

  return (
    <Card className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-text-main mb-2">Daily PROM Assessment</h2>
        <p className="text-text-muted text-sm">
          Please rate your experience today on a scale of 1 to 7.
        </p>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 font-medium">✓ PROM test submitted successfully</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 font-medium">Error: {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="patientId" className="block text-sm font-semibold text-text-main mb-2">
              Patient ID *
            </label>
            <input
              id="patientId"
              type="text"
              value={form.patientId}
              onChange={(e) => handlePatientIdChange(e.target.value)}
              placeholder="Enter patient ID"
              className="w-full px-3 py-2 border border-border-subtle rounded-md bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label htmlFor="testDate" className="block text-sm font-semibold text-text-main mb-2">
              Test Date *
            </label>
            <input
              id="testDate"
              type="date"
              value={form.testDate}
              onChange={(e) => setForm({ ...form, testDate: e.target.value })}
              className="w-full px-3 py-2 border border-border-subtle rounded-md bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </div>

        {validationError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-amber-700 text-sm font-medium">{validationError}</p>
          </div>
        )}

        <div className="space-y-6">
          {promQuestions.map((question) => (
            <div key={question.id} className="pb-4 border-b border-border-subtle last:border-b-0">
              <div className="mb-3">
                <label className="block text-sm font-semibold text-text-main mb-1">
                  {question.label}
                </label>
                <p className="text-xs text-text-muted">
                  {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
                </p>
              </div>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAnswerChange(question.id, value)}
                    className={`flex-1 py-2 px-2 rounded-md border-2 transition-all duration-200 text-sm font-semibold ${
                      form.answers[question.id] === value
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-surface text-text-main border-border-subtle hover:border-brand-blue'
                    } disabled:opacity-50`}
                    title={scaleLabels[value as keyof typeof scaleLabels]}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-text-muted">
            Answered: <strong>{answeredCount}</strong> / {promQuestions.length}
          </p>

          <button
            type="submit"
            disabled={loading || answeredCount < promQuestions.length}
            className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-md transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </div>
      </form>
    </Card>
  );
}
