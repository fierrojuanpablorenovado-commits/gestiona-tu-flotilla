'use client';

import { clsx } from 'clsx';

interface ScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#eab308'; // yellow-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

const sizes = {
  sm: { container: 'h-10 w-10', radius: 16, stroke: 3, text: 'text-xs font-bold' },
  md: { container: 'h-16 w-16', radius: 26, stroke: 4, text: 'text-lg font-bold' },
  lg: { container: 'h-24 w-24', radius: 40, stroke: 5, text: 'text-2xl font-bold' },
};

export function ScoreCircle({ score, size = 'md', showLabel = false, label = 'Health Score' }: ScoreCircleProps) {
  const config = sizes[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const textColor = getScoreTextColor(score);
  const viewBoxSize = (config.radius + config.stroke) * 2;
  const center = viewBoxSize / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={clsx('relative', config.container)}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="w-full h-full -rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={config.stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-circle-animated transition-all duration-700"
          />
        </svg>
        <div className={clsx('absolute inset-0 flex items-center justify-center', config.text, textColor)}>
          {score}
        </div>
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-500">{label}</span>
      )}
    </div>
  );
}
