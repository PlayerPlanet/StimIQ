import { useEffect, useState } from 'react';
import { getPromTests } from '../api/promTests';
import type { PromTestRead } from '../api/promTests';

export function usePromTests(patientId: string | null) {
  const [tests, setTests] = useState<PromTestRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = async () => {
    if (!patientId) {
      setTests([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getPromTests({ patientId });
      setTests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch PROM tests';
      setError(message);
      console.error('Error fetching PROM tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [patientId]);

  return { tests, loading, error, refetch: fetchTests };
}
