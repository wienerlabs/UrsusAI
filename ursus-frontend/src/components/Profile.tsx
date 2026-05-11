import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAgents } from '../hooks/useAgents';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserProfileStats } from '../hooks/useUserProfileStats';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useUserPortfolio } from '../hooks/useUserPortfolio';
import { sameWallet } from '../utils/profile';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileBio } from './profile/ProfileBio';
import { ProfileSocialLinks } from './profile/ProfileSocialLinks';
import { ProfileStats } from './profile/ProfileStats';
import { ProfileTabs, ProfileTabId } from './profile/ProfileTabs';
import { AgentsTab } from './profile/AgentsTab';
import { PortfolioTab } from './profile/PortfolioTab';
import { ActivityTab } from './profile/ActivityTab';
import { SettingsTab } from './profile/SettingsTab';

interface ProfileProps {
  onBack: () => void;
}

function Profile({ onBack }: ProfileProps) {
  // Read directly from the Solana wallet adapter so we re-render the instant the
  // wallet connects (no extra context indirection that can miss updates).
  const { publicKey, connected } = useSolanaWallet();
  const connectedWallet = connected && publicKey ? publicKey.toBase58() : '';
  const location = useLocation();

  // Resolve which wallet to display: URL query > connected wallet.
  const { targetWallet, connectedAddress } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const queryWallet = params.get('wallet') || params.get('handle') || '';
    return {
      targetWallet: queryWallet || connectedWallet || '',
      connectedAddress: connectedWallet || '',
    };
  }, [location.search, connectedWallet]);

  const isOwner = sameWallet(targetWallet, connectedAddress);

  const { profile, loading: profileLoading, updateProfile, saving, refetch: refetchProfile } =
    useUserProfile(targetWallet || null);
  const { stats, loading: statsLoading } = useUserProfileStats(targetWallet || null);
  const { items: activityItems, loading: activityLoading } = useActivityFeed(targetWallet || null);
  const {
    rows: portfolioRows,
    totalValue: portfolioTotal,
    totalRealized: portfolioRealized,
    totalPnL: portfolioPnL,
    loading: portfolioLoading,
  } = useUserPortfolio(targetWallet || null);

  const agentQuery = useMemo(
    () => ({ creator: targetWallet || '', limit: 50 }),
    [targetWallet]
  );
  const { agents: userAgents, loading: agentsLoading } = useAgents(agentQuery);

  // Pure local tab state — no URL sync, no effects that could revert the
  // user's click. The tabs are a UI-only concern inside this view.
  const [activeTab, setActiveTab] = useState<ProfileTabId>('agents');

  // If the viewer is not the owner and somehow lands on settings, fall back.
  const effectiveTab: ProfileTabId =
    !isOwner && activeTab === 'settings' ? 'agents' : activeTab;

  const handleTabChange = useCallback((tab: ProfileTabId) => {
    setActiveTab(tab);
  }, []);

  const handleBioSave = useCallback(
    async (nextBio: string) => {
      await updateProfile({ bio: nextBio });
    },
    [updateProfile]
  );

  const handleAvatarChange = useCallback(
    async (absoluteUrl: string) => {
      await updateProfile({ avatar: absoluteUrl });
    },
    [updateProfile]
  );

  const handleSettingsSave = useCallback(
    async (patch: Parameters<typeof updateProfile>[0]) => {
      await updateProfile(patch);
      await refetchProfile();
    },
    [updateProfile, refetchProfile]
  );

  // Early states
  if (!targetWallet) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] md:ml-[200px] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Connect your wallet</h1>
          <p className="text-[#a0a0a0] mb-6">
            Connect a Solana wallet to view and customize your profile.
          </p>
          <div className="flex items-center justify-center gap-3">
            <WalletMultiButton
              style={{
                backgroundColor: '#d8e9ea',
                color: 'black',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
              }}
            />
            <button
              onClick={onBack}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoading && !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] md:ml-[200px] flex items-center justify-center">
        <div className="text-[#a0a0a0]">Loading profile…</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] md:ml-[200px] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white mb-3">Profile not found</h1>
          <p className="text-[#a0a0a0] mb-6">
            We couldn't load this profile. Please try again later.
          </p>
          <button
            onClick={onBack}
            className="bg-[#d8e9ea] text-black px-5 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] md:ml-[200px]">
      <ProfileHeader
        profile={profile}
        displayWallet={targetWallet}
        isOwner={isOwner}
        onBack={onBack}
        onAvatarChange={handleAvatarChange}
      />

      <div className="px-4 md:px-8 py-6">
        <ProfileBio
          bio={profile.bio || ''}
          editable={isOwner}
          saving={saving}
          onSave={handleBioSave}
        />

        <ProfileSocialLinks socialLinks={profile.socialLinks} />

        <ProfileStats
          stats={stats}
          loading={statsLoading}
          portfolioValue={portfolioTotal}
        />

        <ProfileTabs
          activeTab={effectiveTab}
          onTabChange={handleTabChange}
          showSettings={isOwner}
        />

        <div className="min-h-[400px]" key={effectiveTab}>
          {effectiveTab === 'agents' && (
            <div
              role="tabpanel"
              id="profile-panel-agents"
              aria-labelledby="profile-tab-agents"
            >
              <AgentsTab
                agents={userAgents || []}
                loading={agentsLoading}
                isOwner={isOwner}
              />
            </div>
          )}

          {effectiveTab === 'portfolio' && (
            <div
              role="tabpanel"
              id="profile-panel-portfolio"
              aria-labelledby="profile-tab-portfolio"
            >
              <PortfolioTab
                rows={portfolioRows}
                totalValue={portfolioTotal}
                totalRealized={portfolioRealized}
                totalPnL={portfolioPnL}
                loading={portfolioLoading}
              />
            </div>
          )}

          {effectiveTab === 'activity' && (
            <div
              role="tabpanel"
              id="profile-panel-activity"
              aria-labelledby="profile-tab-activity"
            >
              <ActivityTab items={activityItems} loading={activityLoading} />
            </div>
          )}

          {effectiveTab === 'settings' && isOwner && (
            <div
              role="tabpanel"
              id="profile-panel-settings"
              aria-labelledby="profile-tab-settings"
            >
              <SettingsTab
                profile={profile}
                saving={saving}
                onSave={handleSettingsSave}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
