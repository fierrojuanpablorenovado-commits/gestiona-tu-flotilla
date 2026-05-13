import { clsx } from 'clsx';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

interface TimelineProps {
  events: TimelineEvent[];
}

const typeColors: Record<string, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400',
};

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-200" />

      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Dot */}
          <div className="relative z-10 flex-shrink-0">
            <div
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white',
                event.iconColor || typeColors[event.type || 'neutral']
              )}
            >
              {event.icon ? (
                <span className="text-white text-xs">{event.icon}</span>
              ) : (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-medium text-slate-900">{event.title}</p>
            {event.description && (
              <p className="mt-0.5 text-sm text-slate-500">{event.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">{event.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
