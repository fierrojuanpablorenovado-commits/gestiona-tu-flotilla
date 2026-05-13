import { clsx } from 'clsx';

type StatusType =
  | 'active' | 'available' | 'assigned' | 'approved' | 'completed' | 'paid'
  | 'pending' | 'draft' | 'scheduled' | 'onboarding' | 'documenting'
  | 'inactive' | 'suspended' | 'in_maintenance' | 'in_progress' | 'warning'
  | 'rejected' | 'overdue' | 'critical' | 'terminated' | 'cancelled'
  | 'detained_docs' | 'detained_payment' | 'stolen';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  // Green
  active: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  available: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  assigned: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  // Yellow
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  draft: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  onboarding: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  documenting: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  // Gray
  inactive: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  suspended: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  in_maintenance: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  // Red
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  terminated: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  detained_docs: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  detained_payment: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  stolen: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  available: 'Disponible',
  assigned: 'Asignado',
  approved: 'Aprobado',
  completed: 'Completado',
  paid: 'Pagado',
  pending: 'Pendiente',
  draft: 'Borrador',
  scheduled: 'Programado',
  onboarding: 'En onboarding',
  documenting: 'Documentando',
  in_progress: 'En progreso',
  warning: 'Atencion',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  in_maintenance: 'En taller',
  rejected: 'Rechazado',
  overdue: 'Vencido',
  critical: 'Critico',
  terminated: 'Terminado',
  cancelled: 'Cancelado',
  detained_docs: 'Detenido (docs)',
  detained_payment: 'Detenido (pago)',
  stolen: 'Robado',
};

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const displayLabel = label || statusLabels[status] || status;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dot)} />
      {displayLabel}
    </span>
  );
}
