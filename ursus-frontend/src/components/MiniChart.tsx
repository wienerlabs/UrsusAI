import React from 'react';

interface MiniChartProps {
  data: number[];
  priceChange: number;
  width?: number;
  height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({
  data,
  priceChange,
  width = 80,
  height = 40
}) => {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center bg-surface-elevated rounded-md"
        style={{ width, height }}
      >
        <div className="text-content-subtle text-micro">No data</div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Generate path for the line chart
  const pathData = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 8);
    const y = height - 4 - ((value - min) / range) * (height - 8);
    return `${index === 0 ? 'M' : 'L'} ${x + 4} ${y}`;
  }).join(' ');

  const isPositive = priceChange >= 0;
  const strokeClassName = isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="relative">
      <svg width={width} height={height} className={`overflow-visible ${strokeClassName}`}>
        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End point dot */}
        <circle
          cx={width - 4}
          cy={height - 4 - ((data[data.length - 1] - min) / range) * (height - 8)}
          r="2"
          fill="currentColor"
        />
      </svg>

      {/* Price change indicator */}
      <div className={`absolute -top-1 -right-1 text-micro font-medium px-1 py-0.5 rounded ${
        isPositive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
      }`}>
        {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
      </div>
    </div>
  );
};

export default MiniChart;
