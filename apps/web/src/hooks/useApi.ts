'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseApiOptions {
  immediate?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic data fetching hook for GET requests.
 * Automatically fetches on mount and exposes refetch.
 */
export function useApi<T = unknown>(
  endpoint: string,
  options: UseApiOptions = {},
): UseApiState<T> {
  const { immediate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<T>(endpoint);
      if (response.ok) {
        setData(response.data);
      } else {
        setError('Error al cargar los datos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, loading, error, refetch: fetchData };
}
