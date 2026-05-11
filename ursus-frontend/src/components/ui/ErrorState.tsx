import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading this data. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 ${className}`}>
      <div className="w-16 h-16 rounded-full bg-danger-subtle border border-danger-muted flex items-center justify-center mb-4">
        <AlertCircle size={24} strokeWidth={1.5} className="text-danger" />
      </div>
      <h3 className="text-content-primary text-heading-sm mb-1">{title}</h3>
      <p className="text-content-muted text-body-sm max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-surface-elevated hover:bg-surface-hover border border-border text-content-secondary hover:text-content-primary px-4 py-2 rounded-md text-body-sm font-medium transition-colors duration-base"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
};
