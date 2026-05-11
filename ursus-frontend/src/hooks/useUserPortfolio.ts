import { useCallback, useEffect, useState } from 'react';
import apiService, { UserPortfolioRow } from '../services/api';

export type PortfolioRow = UserPortfolioRow;

interface UseUserPortfolioResult {
  rows: PortfolioRow[];
  totalValue: number;
  totalRealized: number;
  totalUnrealized: number;
  totalPnL: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetch a user's positions from /api/profile/:wallet/portfolio. The backend
// reconstructs positions from Trade history so both open and closed positions
// show up with realized / unrealized PnL.
export function useUserPortfolio(wallet: string | null | undefined): UseUserPortfolioResult {
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalRealized, setTotalRealized] = useState<number>(0);
  const [totalUnrealized, setTotalUnrealized] = useState<number>(0);
  const [totalPnL, setTotalPnL] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(!!wallet);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!wallet) {
      setRows([]);
      setTotalValue(0);
      setTotalRealized(0);
      setTotalUnrealized(0);
      setTotalPnL(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await apiService.getUserPortfolio(wallet);
      const data = resp?.data;
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotalValue(Number(data?.totalValue || 0));
      setTotalRealized(Number(data?.totalRealized || 0));
      setTotalUnrealized(Number(data?.totalUnrealized || 0));
      setTotalPnL(Number(data?.totalPnL || 0));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load portfolio';
      setError(message);
      setRows([]);
      setTotalValue(0);
      setTotalRealized(0);
      setTotalUnrealized(0);
      setTotalPnL(0);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    rows,
    totalValue,
    totalRealized,
    totalUnrealized,
    totalPnL,
    loading,
    error,
    refetch: fetchPortfolio,
  };
}
