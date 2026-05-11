import React from 'react';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  actionLabel?: string;
  actionHref?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const typeAccent: Record<NonNullable<ToastMessage['type']>, string> = {
  success: 'border-l-4 border-l-success',
  info: 'border-l-4 border-l-info',
  warning: 'border-l-4 border-l-warning',
  error: 'border-l-4 border-l-danger',
};

const titleAccent: Record<NonNullable<ToastMessage['type']>, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-danger',
};

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map(t => {
        const type = t.type || 'info';
        return (
          <div
            key={t.id}
            className={`min-w-[260px] max-w-sm bg-surface-card border border-border rounded-md shadow-card p-3 transition-colors duration-base ${typeAccent[type]}`}
          >
            {t.title && (
              <div className={`text-body-sm mb-1 ${titleAccent[type]}`}>{t.title}</div>
            )}
            <div className="text-body-sm text-content-secondary">{t.message}</div>
            <div className="mt-2 flex items-center gap-3">
              {t.actionHref && t.actionLabel && (
                <a
                  href={t.actionHref}
                  className="text-caption text-accent hover:text-accent-hover transition-colors duration-base"
                  onClick={() => onDismiss(t.id)}
                >
                  {t.actionLabel}
                </a>
              )}
              <button
                onClick={() => onDismiss(t.id)}
                className="text-caption text-content-muted hover:text-content-primary transition-colors duration-base"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Toast;

