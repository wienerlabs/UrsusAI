import React from 'react';
import { Zap, LucideIcon } from 'lucide-react';

interface TemplateCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onSelect: (template: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ title, description, icon: Icon, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(description)}
      className="group w-full p-6 bg-surface-card border border-border rounded-xl hover:border-border-strong transition-colors duration-base text-left"
    >
      {/* Icon */}
      <div className="w-12 h-12 bg-accent-subtle border border-accent-muted rounded-xl flex items-center justify-center mb-4">
        <Icon size={22} className="text-accent" strokeWidth={1.75} />
      </div>

      {/* Content */}
      <h3 className="text-content-primary font-semibold text-heading-sm mb-2">
        {title}
      </h3>
      <p className="text-content-muted text-body-sm leading-relaxed">
        {description}
      </p>

      {/* Use Template Indicator */}
      <div className="flex items-center gap-2 mt-4 text-accent">
        <Zap size={14} />
        <span className="text-body-sm font-medium">Use Template</span>
      </div>
    </button>
  );
};

export default TemplateCard;
