import { useCallback, useEffect, useState } from 'react';
import apiService, { ActivityFeedItem } from '../services/api';

interface UseActivityFeedResult {
  items: ActivityFeedItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useActivityFeed(
  wallet: string | null | undefined,
  limit = 50
): UseActivityFeedResult {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(!!wallet);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!wallet) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.getUserActivity(wallet, limit);
      setItems(Array.isArray(resp?.data) ? resp.data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load activity';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [wallet, limit]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  return { items, loading, error, refetch: fetchActivity };
}
