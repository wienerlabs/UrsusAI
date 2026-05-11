import { useEffect, useMemo, useState } from 'react';
import { UserProfileData, UserProfileUpdate } from '../../services/api';
import { extractSocialHandle, normalizeSocialUrl } from '../../utils/profile';

interface SettingsTabProps {
  profile: UserProfileData;
  saving: boolean;
  onSave: (patch: UserProfileUpdate) => Promise<void>;
}

interface FormState {
  username: string;
  displayName: string;
  email: string;
  twitter: string;
  discord: string;
  telegram: string;
  website: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  tradingNotifications: boolean;
  agentNotifications: boolean;
  showPortfolio: boolean;
  showActivity: boolean;
}

function profileToForm(profile: UserProfileData): FormState {
  return {
    username: profile.username || '',
    displayName: profile.profileExtended?.displayName || '',
    email: profile.email || '',
    twitter: extractSocialHandle(profile.socialLinks.twitter),
    discord: extractSocialHandle(profile.socialLinks.discord),
    telegram: extractSocialHandle(profile.socialLinks.telegram),
    website: profile.socialLinks.website || '',
    emailNotifications: profile.preferences.notifications.email,
    pushNotifications: profile.preferences.notifications.push,
    tradingNotifications: profile.preferences.notifications.trading,
    agentNotifications: profile.preferences.notifications.agents,
    showPortfolio: profile.preferences.privacy.showPortfolio,
    showActivity: profile.preferences.privacy.showActivity,
  };
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-white font-medium">{label}</div>
        {description && <div className="text-[#a0a0a0] text-sm">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d8e9ea] ${
          checked ? 'bg-[#d8e9ea]' : 'bg-[#2a2a2a]'
        }`}
      >
        <span
          className={`absolute top-1 ${
            checked ? 'right-1' : 'left-1'
          } w-4 h-4 bg-white rounded-full shadow-md transition-all`}
        />
      </button>
    </div>
  );
}

export function SettingsTab({ profile, saving, onSave }: SettingsTabProps) {
  const initial = useMemo(() => profileToForm(profile), [profile]);
  const [form, setForm] = useState<FormState>(initial);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (form.username && (form.username.length < 3 || form.username.length > 30)) {
      setFormError('Username must be 3-30 characters.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const patch: UserProfileUpdate = {
      username: form.username || undefined,
      displayName: form.displayName,
      email: form.email,
      socialLinks: {
        twitter: normalizeSocialUrl('twitter', form.twitter),
        discord: normalizeSocialUrl('discord', form.discord),
        telegram: normalizeSocialUrl('telegram', form.telegram),
        website: form.website ? normalizeSocialUrl('website', form.website) : '',
      },
      preferences: {
        notifications: {
          email: form.emailNotifications,
          push: form.pushNotifications,
          trading: form.tradingNotifications,
          agents: form.agentNotifications,
        },
        privacy: {
          showPortfolio: form.showPortfolio,
          showActivity: form.showActivity,
        },
      },
    };

    try {
      await onSave(patch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      setFormError(message);
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h3 className="text-white text-xl font-semibold">Account Settings</h3>

      {/* Profile Information */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h4 className="text-white font-medium mb-4">Profile Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-username">
              Username
            </label>
            <input
              id="field-username"
              type="text"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="your_handle"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-display-name">
              Display Name
            </label>
            <input
              id="field-display-name"
              type="text"
              value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="Your Name"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-email">
              Email
            </label>
            <input
              id="field-email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h4 className="text-white font-medium mb-4">Social Links</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-twitter">
              Twitter
            </label>
            <input
              id="field-twitter"
              type="text"
              value={form.twitter}
              onChange={(e) => set('twitter', e.target.value)}
              placeholder="@handle"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-discord">
              Discord
            </label>
            <input
              id="field-discord"
              type="text"
              value={form.discord}
              onChange={(e) => set('discord', e.target.value)}
              placeholder="invite code or username"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-telegram">
              Telegram
            </label>
            <input
              id="field-telegram"
              type="text"
              value={form.telegram}
              onChange={(e) => set('telegram', e.target.value)}
              placeholder="@channel"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a0a0a0] text-sm mb-2 block" htmlFor="field-website">
              Website
            </label>
            <input
              id="field-website"
              type="text"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="yoursite.com"
              className="w-full bg-[#0a0a0a] border-2 border-[#2a2a2a] rounded-xl p-3 text-white placeholder-[#666] focus:outline-none focus:border-[#d8e9ea] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h4 className="text-white font-medium mb-2">Notifications</h4>
        <Toggle
          label="Email Notifications"
          description="Receive updates via email"
          checked={form.emailNotifications}
          onChange={(v) => set('emailNotifications', v)}
        />
        <Toggle
          label="Push Notifications"
          description="Receive browser notifications"
          checked={form.pushNotifications}
          onChange={(v) => set('pushNotifications', v)}
        />
        <Toggle
          label="Trading Alerts"
          description="Price and order notifications"
          checked={form.tradingNotifications}
          onChange={(v) => set('tradingNotifications', v)}
        />
        <Toggle
          label="Agent Updates"
          description="Notifications from your agents"
          checked={form.agentNotifications}
          onChange={(v) => set('agentNotifications', v)}
        />
      </div>

      {/* Privacy */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <h4 className="text-white font-medium mb-2">Privacy</h4>
        <Toggle
          label="Show Portfolio"
          description="Allow others to see your holdings"
          checked={form.showPortfolio}
          onChange={(v) => set('showPortfolio', v)}
        />
        <Toggle
          label="Show Activity"
          description="Allow others to see your trades"
          checked={form.showActivity}
          onChange={(v) => set('showActivity', v)}
        />
      </div>

      {formError && (
        <p role="alert" className="text-[#ef4444] text-sm">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="bg-[#d8e9ea] text-black px-5 py-2 rounded-lg font-medium hover:bg-[#b8d4d6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

export default SettingsTab;
