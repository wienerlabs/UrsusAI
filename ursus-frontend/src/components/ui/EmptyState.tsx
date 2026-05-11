import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 56 : 44;
  const paddingClass = size === 'sm' ? 'py-8' : size === 'lg' ? 'py-20' : 'py-14';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${paddingClass} ${className}`}>
      <div className="w-16 h-16 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-4">
        <Icon size={iconSize * 0.5} strokeWidth={1.5} className="text-content-muted" />
      </div>
      <h3 className="text-content-primary text-heading-sm mb-1">{title}</h3>
      {description && (
        <p className="text-content-muted text-body-sm max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-accent hover:bg-accent-hover text-content-inverse px-4 py-2 rounded-md text-body-sm font-semibold transition-colors duration-base"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
