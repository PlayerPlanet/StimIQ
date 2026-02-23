import { useEffect, useState } from 'react';
import type { TreatmentGoals, TreatmentGoalsRequest } from '../lib/types';
import { fetchTreatmentGoals, updateTreatmentGoals } from '../api/treatmentGoals';

interface UseTreatmentGoalsReturn {
  data: TreatmentGoals | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  updateGoals: (goals: TreatmentGoalsRequest) => Promise<void>;
  updating: boolean;
}

/**
 * Custom hook for managing treatment goals data
 */
export function useTreatmentGoals(patientId: string | undefined): UseTreatmentGoalsReturn {
  const [data, setData] = useState<TreatmentGoals | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!patientId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchTreatmentGoals(patientId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch treatment goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGoals = async (goals: TreatmentGoalsRequest) => {
    if (!patientId) {
      throw new Error('Patient ID is required to update treatment goals');
    }

    setUpdating(true);
    setError(null);

    try {
      const result = await updateTreatmentGoals(patientId, goals);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to update treatment goals:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [patientId]);

  return { data, loading, error, refetch, updateGoals, updating };
}
