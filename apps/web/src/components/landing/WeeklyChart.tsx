'use client';

import { useState } from 'react';

const DAYS   = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const VALUES = [38500, 52000, 46800, 68400, 62100, 78500, 71200];
const MAX    = Math.max(...VALUES);

const COLORS = [
  '#6366f1', // indigo   — L
  '#3b82f6', // blue     — M
  '#06b6d4', // cyan     — X
  '#10b981', // emerald  — J
  '#f59e0b', // amber    — V
  '#ef4444', // red      — S (highest)
  '#8b5cf6', // violet   — D
];

const COLORS_ACTIVE = [
  '#4338ca',
  '#1d4ed8',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
];

function fmt(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

export function WeeklyChart() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex-1 select-none">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-slate-700">Ingresos por semana</span>
        <span className="text-[8px] text-emerald-500 font-bold">↑ +12%</span>
      </div>

      {/* Tooltip */}
      <div className="h-4 flex items-center justify-center mb-1">
        {hovered !== null && (
          <div className="bg-slate-800 text-white rounded-md px-2 py-0.5 text-[7px] font-bold">
            {DAYS[hovered]}: ${VALUES[hovered].toLocaleString()} MXN
          </div>
        )}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1" style={{ height: 68 }}>
        {VALUES.map((v, i) => {
          const pct     = (v / MAX) * 100;
          const isActive = hovered === i;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
              style={{ height: '100%', justifyContent: 'flex-end' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Amount label above bar */}
              <div
                className="text-[6px] font-bold leading-none mb-0.5 transition-opacity duration-150"
                style={{ color: isActive ? COLORS_ACTIVE[i] : COLORS[i], opacity: isActive ? 1 : 0.75 }}
              >
                {fmt(v)}
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-150"
                style={{
                  height: `${pct}%`,
                  minHeight: 6,
                  background: isActive
                    ? COLORS_ACTIVE[i]
                    : COLORS[i],
                  boxShadow: isActive ? `0 0 0 2px ${COLORS[i]}55` : 'none',
                  opacity: isActive ? 1 : 0.85,
                }}
              />
              <div className="text-[6px] text-slate-400 font-medium mt-0.5">{DAYS[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
