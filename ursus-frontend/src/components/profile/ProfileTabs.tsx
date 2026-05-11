import { KeyboardEvent, useRef } from 'react';
import { Activity, Settings, Users, Wallet } from 'lucide-react';

export type ProfileTabId = 'agents' | 'portfolio' | 'activity' | 'settings';

interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  showSettings: boolean;
}

interface TabDef {
  id: ProfileTabId;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function ProfileTabs({ activeTab, onTabChange, showSettings }: ProfileTabsProps) {
  const baseTabs: TabDef[] = [
    { id: 'agents', label: 'My Agents', Icon: Users },
    { id: 'portfolio', label: 'Portfolio', Icon: Wallet },
    { id: 'activity', label: 'Activity', Icon: Activity },
  ];
  const tabs: TabDef[] = showSettings
    ? [...baseTabs, { id: 'settings', label: 'Settings', Icon: Settings }]
    : baseTabs;

  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onTabChange(nextTab.id);
    refs.current[nextTab.id]?.focus();
  };

  return (
    <div className="border-b border-[#2a2a2a] mb-6">
      <div role="tablist" aria-label="Profile sections" className="flex gap-8" onKeyDown={handleKeyDown}>
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`profile-tab-${id}`}
              aria-selected={isActive}
              aria-controls={`profile-panel-${id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(id);
              }}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-medium transition-colors focus:outline-none focus-visible:text-white ${
                isActive
                  ? 'text-[#d8e9ea] border-b-2 border-[#d8e9ea]'
                  : 'text-[#a0a0a0] hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileTabs;
