import { clsx } from 'clsx';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type ColorKey = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'teal' | 'indigo';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: ColorKey;
  /** When true, the entire card gets a gradient background with white text */
  gradient?: boolean;
  /** Optional emoji or character prefix shown before the value */
  emoji?: string;
  /** Optional small description below the change */
  description?: string;
  /** Optional link — wraps entire card in a Next.js Link */
  href?: string;
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const iconBg: Record<ColorKey, string> = {
  blue:   'bg-blue-100   text-blue-600',
  green:  'bg-green-100  text-green-600',
  red:    'bg-red-100    text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  teal:   'bg-teal-100   text-teal-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

const gradientBg: Record<ColorKey, string> = {
  blue:   'from-blue-500   to-blue-700',
  green:  'from-green-500  to-green-700',
  red:    'from-red-500    to-red-700',
  yellow: 'from-yellow-400 to-orange-500',
  purple: 'from-purple-500 to-purple-700',
  orange: 'from-orange-400 to-red-500',
  teal:   'from-teal-500   to-cyan-700',
  indigo: 'from-indigo-500 to-blue-700',
};

const iconBgOnGradient: Record<ColorKey, string> = {
  blue:   'bg-white/20',
  green:  'bg-white/20',
  red:    'bg-white/20',
  yellow: 'bg-white/20',
  purple: 'bg-white/20',
  orange: 'bg-white/20',
  teal:   'bg-white/20',
  indigo: 'bg-white/20',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'blue',
  gradient = false,
  emoji,
  description,
  href,
}: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;

  if (gradient) {
    const cardContent = (
      <div className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg group-hover:scale-[1.02] transition-transform min-h-[120px]',
        gradientBg[iconColor]
      )}>
        {/* Decorative circle */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/10" />

        <div className="relative flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">{title}</p>
            <p className="mt-1.5 text-2xl font-extrabold text-white tracking-tight truncate">
              {emoji && <span className="mr-1">{emoji}</span>}
              {value}
            </p>
            {change !== undefined && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className={clsx(
                  'flex items-center gap-0.5 rounded-full px-2 py-0.5',
                  isPositive ? 'bg-white/20' : 'bg-white/20'
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-white" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-white" />
                  )}
                  <span className="text-xs font-bold text-white">
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                </div>
                {changeLabel && (
                  <span className="text-[11px] text-white/70">{changeLabel}</span>
                )}
              </div>
            )}
            {description && (
              <p className="mt-1 text-xs text-white/60">{description}</p>
            )}
          </div>
          <div className={clsx(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
            iconBgOnGradient[iconColor]
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    );
    if (href) return <Link href={href} className="block group cursor-pointer">{cardContent}</Link>;
    return cardContent;
  }

  // Default (white) variant
  const defaultContent = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow group-hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
            {emoji && <span className="mr-1">{emoji}</span>}
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-1.5 flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={clsx(
                'text-xs font-semibold',
                isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-slate-400">{changeLabel}</span>
              )}
            </div>
          )}
          {description && (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          )}
        </div>
        <div className={clsx(
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
          iconBg[iconColor]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href} className="block group cursor-pointer">{defaultContent}</Link>;
  return defaultContent;
}
