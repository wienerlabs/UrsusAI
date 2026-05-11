import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-surface-elevated';
  const variantClasses = {
    text: 'rounded h-4',
    circle: 'rounded-full',
    rect: 'rounded-md',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Preset: Agent card skeleton
export const AgentCardSkeleton: React.FC = () => (
  <div className="bg-surface-card border border-border rounded-xl p-5">
    <div className="flex items-start gap-3 mb-4">
      <Skeleton variant="rect" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-3/4" height={16} />
        <Skeleton className="w-full" height={12} />
        <Skeleton className="w-1/2" height={10} />
      </div>
    </div>
    <div className="flex items-end justify-between mb-4">
      <div className="space-y-2 flex-1">
        <Skeleton width={60} height={10} />
        <Skeleton width={120} height={20} />
      </div>
      <Skeleton width={72} height={36} />
    </div>
    <div className="grid grid-cols-4 gap-2 pb-4 border-b border-border-subtle">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="space-y-1">
          <Skeleton height={10} />
          <Skeleton height={14} />
        </div>
      ))}
    </div>
    <div className="flex gap-2 mt-4">
      <Skeleton className="flex-1" height={32} />
      <Skeleton className="flex-1" height={32} />
    </div>
  </div>
);

// Preset: Chart skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 400 }) => (
  <div className="bg-surface-card border border-border rounded-xl p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-2">
        <Skeleton width={100} height={14} />
        <Skeleton width={160} height={24} />
      </div>
      <Skeleton width={80} height={14} />
    </div>
    <Skeleton height={height} />
  </div>
);

// Preset: Table row skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <div className="flex items-center gap-4 p-3 border-b border-border-subtle">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} className="flex-1" height={16} />
    ))}
  </div>
);

// Preset: Stats card skeleton
export const StatsSkeleton: React.FC = () => (
  <div className="bg-surface-card border border-border rounded-xl p-4 space-y-2">
    <Skeleton width={80} height={12} />
    <Skeleton width={120} height={24} />
    <Skeleton width={60} height={10} />
  </div>
);
