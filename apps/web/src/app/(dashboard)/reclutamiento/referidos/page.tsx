'use client';

import { Header } from '@/components/layout/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Users,
  UserCheck,
  Gift,
  Star,
  Info,
  ChevronRight,
} from 'lucide-react';

const referralStats = {
  total: 15,
  active: 8,
  bonusGiven: 5,
};

const referrals = [
  {
    id: 1,
    driverName: 'Carlos Martinez',
    driverEco: 'ECO-012',
    candidateName: 'Roberto Flores',
    candidateStatus: 'in_progress',
    candidateStage: 'Entrevista',
    date: '18 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 2,
    driverName: 'Miguel Angel Rios',
    driverEco: 'ECO-045',
    candidateName: 'Sofia Castro',
    candidateStatus: 'in_progress',
    candidateStage: 'Contactado',
    date: '15 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 3,
    driverName: 'Juan Lopez Hernandez',
    driverEco: 'ECO-023',
    candidateName: 'Daniel Ortiz',
    candidateStatus: 'approved',
    candidateStage: 'Aprobado',
    date: '10 Mar 2026',
    bonus: null,
    weeksActive: 2,
  },
  {
    id: 4,
    driverName: 'Fernando Diaz',
    driverEco: 'ECO-034',
    candidateName: 'Gabriela Cruz',
    candidateStatus: 'in_progress',
    candidateStage: 'Documentos',
    date: '08 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 5,
    driverName: 'Carlos Martinez',
    driverEco: 'ECO-012',
    candidateName: 'Andres Vega',
    candidateStatus: 'active',
    candidateStage: 'Asignado',
    date: '01 Feb 2026',
    bonus: '1 sem gratis',
    weeksActive: 7,
  },
  {
    id: 6,
    driverName: 'Pedro Ramirez',
    driverEco: 'ECO-001',
    candidateName: 'Elena Morales',
    candidateStatus: 'active',
    candidateStage: 'Asignado',
    date: '15 Ene 2026',
    bonus: '1 sem gratis',
    weeksActive: 10,
  },
  {
    id: 7,
    driverName: 'Luis Garcia Perez',
    driverEco: 'ECO-056',
    candidateName: 'Fernando Silva',
    candidateStatus: 'active',
    candidateStage: 'Asignado',
    date: '20 Dic 2025',
    bonus: '1 sem gratis',
    weeksActive: 13,
  },
  {
    id: 8,
    driverName: 'Alejandro Moreno',
    driverEco: 'ECO-089',
    candidateName: 'Patricia Navarro',
    candidateStatus: 'in_progress',
    candidateStage: 'Entrevista',
    date: '20 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 9,
    driverName: 'David Castro',
    driverEco: 'ECO-029',
    candidateName: 'Marco Torres',
    candidateStatus: 'active',
    candidateStage: 'Asignado',
    date: '05 Dic 2025',
    bonus: '1 sem gratis',
    weeksActive: 16,
  },
  {
    id: 10,
    driverName: 'Raul Flores',
    driverEco: 'ECO-091',
    candidateName: 'Sergio Medina',
    candidateStatus: 'in_progress',
    candidateStage: 'Documentos',
    date: '12 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 11,
    driverName: 'Carlos Martinez',
    driverEco: 'ECO-012',
    candidateName: 'Hugo Perez',
    candidateStatus: 'rejected',
    candidateStage: 'Rechazado',
    date: '25 Feb 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 12,
    driverName: 'Miguel Angel Rios',
    driverEco: 'ECO-045',
    candidateName: 'Adriana Lira',
    candidateStatus: 'active',
    candidateStage: 'Asignado',
    date: '10 Nov 2025',
    bonus: '1 sem gratis',
    weeksActive: 20,
  },
  {
    id: 13,
    driverName: 'Jose Hernandez',
    driverEco: 'ECO-015',
    candidateName: 'Victor Ramos',
    candidateStatus: 'rejected',
    candidateStage: 'Rechazado',
    date: '20 Feb 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 14,
    driverName: 'Fernando Diaz',
    driverEco: 'ECO-034',
    candidateName: 'Isabela Nunez',
    candidateStatus: 'in_progress',
    candidateStage: 'Nuevo',
    date: '22 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
  {
    id: 15,
    driverName: 'Pedro Ramirez',
    driverEco: 'ECO-001',
    candidateName: 'Oscar Delgado',
    candidateStatus: 'in_progress',
    candidateStage: 'Contactado',
    date: '19 Mar 2026',
    bonus: null,
    weeksActive: 0,
  },
];

export default function ReferidosPage() {
  return (
    <div>
      <Header
        breadcrumbs={[
          { label: 'Reclutamiento', href: '/reclutamiento' },
          { label: 'Programa de Referidos' },
        ]}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{referralStats.total}</p>
              <p className="text-xs text-slate-500">Total referidos</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{referralStats.active}</p>
              <p className="text-xs text-slate-500">Activos / En proceso</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{referralStats.bonusGiven}</p>
              <p className="text-xs text-slate-500">Renta gratis otorgada</p>
            </div>
          </div>
        </div>

        {/* Rules Section */}
        <div className="card p-5 border-l-4 border-l-blue-500 bg-blue-50/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Reglas del Programa de Referidos
              </h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  1 semana de renta gratis por cada referido que permanezca activo 4+ semanas
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  El bono se aplica automaticamente a la cuenta semanal del chofer
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  Sin limite de referidos por chofer
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  El candidato debe completar el proceso de documentacion y aprobacion
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">Historial de Referidos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Chofer que Refiere
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Candidato Referido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Etapa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Semanas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Bono
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{ref.driverName}</p>
                        <p className="text-xs font-mono text-blue-600">{ref.driverEco}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{ref.candidateName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={ref.candidateStatus}
                        label={ref.candidateStage}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{ref.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-center">
                      {ref.weeksActive > 0 ? `${ref.weeksActive} sem` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ref.bonus ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <Gift className="h-3 w-3" />
                          {ref.bonus}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
