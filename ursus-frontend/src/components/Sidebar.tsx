import React from 'react';
import { Home, Monitor, User, MoreHorizontal, Plus, Wifi, Search } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange
}) => {
  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Discover', icon: Search },
    { id: 'agent-creation', label: 'Launchpad', icon: Monitor },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed left-0 top-0 w-[200px] h-screen bg-surface-card border-r border-border flex flex-col">
      {/* Navigation */}
      <div className="p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-colors duration-base ${
                isActive
                  ? 'bg-surface-elevated text-accent'
                  : 'text-content-muted hover:bg-surface-elevated hover:text-content-primary'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Create Agent Button */}
      <div className="px-4 mb-6">
        <button
          onClick={() => onSectionChange('agent-creation')}
          className="w-full bg-accent text-content-inverse font-semibold py-2.5 px-4 rounded-lg hover:bg-accent-hover transition-colors duration-base flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Create Agent
        </button>
      </div>

      {/* Status - Bottom Left */}
      <div className="mt-auto p-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-subtle border border-border-subtle text-success">
          <Wifi size={14} />
          <span className="text-micro font-medium">LIVE</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
