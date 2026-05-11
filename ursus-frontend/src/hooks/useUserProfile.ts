import { useCallback, useEffect, useState } from 'react';
import apiService, { UserProfileData, UserProfileUpdate } from '../services/api';

// Graceful fallback profile used when the backend profile route isn't
// available yet (e.g. server not restarted after adding /api/profile).
// The page still renders and shows the current wallet.
function buildFallbackProfile(wallet: string): UserProfileData {
  return {
    id: wallet,
    walletAddress: wallet,
    username: null,
    email: null,
    avatar: null,
    bio: '',
    socialLinks: { twitter: '', discord: '', telegram: '', website: '' },
    preferences: {
      theme: 'dark',
      notifications: { email: true, push: true, trading: true, agents: true },
      privacy: { showPortfolio: false, showActivity: true },
    },
    isVerified: false,
    verificationLevel: 'none',
    reputation: { score: 0, level: 'Newcomer', badges: [] },
    tradingStats: {
      totalTrades: 0,
      totalVolume: 0,
      winRate: 0,
      bestTrade: 0,
      worstTrade: 0,
    },
    socialStats: {
      followingCount: 0,
      followersCount: 0,
      commentsCount: 0,
      likesReceived: 0,
    },
    profileExtended: {},
    totalPortfolioValue: 0,
    totalPnL: 0,
    createdAt: new Date().toISOString(),
  };
}

interface UseUserProfileResult {
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (patch: UserProfileUpdate) => Promise<UserProfileData | null>;
  saving: boolean;
}

export function useUserProfile(wallet: string | null | undefined): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!wallet);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!wallet) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await apiService.getUserProfile(wallet);
      const fetched = resp?.data ?? null;
      setProfile(fetched ?? buildFallbackProfile(wallet));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      // Fall back to a local profile so the page still renders.
      setProfile(buildFallbackProfile(wallet));
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (patch: UserProfileUpdate): Promise<UserProfileData | null> => {
      if (!wallet) return null;
      setSaving(true);
      setError(null);
      const previous = profile;
      try {
        const resp = await apiService.updateUserProfile(wallet, patch);
        const next = resp?.data ?? null;
        if (next) setProfile(next);
        return next;
      } catch (err: unknown) {
        // Rollback optimistic state on failure
        if (previous) setProfile(previous);
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [wallet, profile]
  );

  return { profile, loading, error, refetch: fetchProfile, updateProfile, saving };
}
