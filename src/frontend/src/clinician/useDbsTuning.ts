import { useEffect, useState } from 'react';
import type { DbsTuningRecommendation } from '../api/dbsTuning';
import { fetchDbsTuning } from '../api/dbsTuning';

interface UseDbsTuningReturn {
  data: DbsTuningRecommendation | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDbsTuning(patientId: string | undefined): UseDbsTuningReturn {
  const [data, setData] = useState<DbsTuningRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!patientId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchDbsTuning(patientId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch DBS tuning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [patientId]);

  return { data, loading, error, refetch };
}
