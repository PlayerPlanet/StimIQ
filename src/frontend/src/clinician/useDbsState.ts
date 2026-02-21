import { useEffect, useState } from 'react';
import type { DbsState } from '../api/dbsState';
import { fetchDbsState } from '../api/dbsState';

interface UseDbsStateReturn {
  data: DbsState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDbsState(patientId: string | undefined): UseDbsStateReturn {
  const [data, setData] = useState<DbsState | null>(null);
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
      const result = await fetchDbsState(patientId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch DBS state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [patientId]);

  return { data, loading, error, refetch };
}
