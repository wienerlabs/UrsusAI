import { useCallback, useEffect, useState } from 'react';
import apiService, { UserProfileStats } from '../services/api';

interface UseUserProfileStatsResult {
  stats: UserProfileStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserProfileStats(wallet: string | null | undefined): UseUserProfileStatsResult {
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [loading, setLoading] = useState<boolean>(!!wallet);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!wallet) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.getUserProfileStats(wallet);
      setStats(resp?.data ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load stats';
      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
