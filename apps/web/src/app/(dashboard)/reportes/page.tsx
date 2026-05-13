'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  Users,
  Handshake,
  Wallet,
  Wrench,
  Receipt,
  Gauge,
  TrendingUp,
  Download,
  Clock,
  Calendar,
  Mail,
  Play,
  Settings,
  ChevronRight,
  Loader2,
  X,
  ChevronDown,
  Sheet,
  FileOutput,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type FormatoReporte = 'excel' | 'pdf' | 'txt';

// ─── Definición de reportes disponibles ───────────────────────────────────────

const REPORTES = [
  {
    titulo: 'Rentabilidad por Vehículo',
    descripcion: 'Estado de resultados (P&L) por cada unidad de la flotilla',
    icon: BarChart3,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    nombre: 'Rentabilidad por Vehículo',
  },
  {
    titulo: 'Rentabilidad por Chofer',
    descripcion: 'Ingresos vs costos asociados a cada operador',
    icon: Users,
    color: 'text-green-600',
    bg: 'bg-green-100',
    nombre: 'Rentabilidad por Chofer',
  },
  {
    titulo: 'Rentabilidad por Socio',
    descripcion: 'Utilidades y ROI por inversionista',
    icon: Handshake,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    nombre: 'Rentabilidad por Socio',
  },
  {
    titulo: 'Estado de Cartera',
    descripcion: 'Cuentas por cobrar vencidas y análisis de morosidad',
    icon: Wallet,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    nombre: 'Estado de Cartera',
  },
  {
    titulo: 'Historial de Mantenimiento',
    descripcion: 'Costos y frecuencia de servicio por unidad',
    icon: Wrench,
    color: 'text-red-600',
    bg: 'bg-red-100',
    nombre: 'Historial de Mantenimiento',
  },
  {
    titulo: 'Reporte Fiscal',
    descripcion: 'Retenciones ISR/IVA de plataformas Uber y Didi',
    icon: Receipt,
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    nombre: 'Reporte Fiscal',
  },
  {
    titulo: 'Eficiencia Operativa',
    descripcion: 'Tiempo en taller, tasa de ocupación y kilómetros recorridos',
    icon: Gauge,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    nombre: 'Eficiencia Operativa',
  },
  {
    titulo: 'Comparativo Semanal',
    descripcion: 'Tendencias de ingresos y gastos semana a semana',
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    nombre: 'Comparativo Semanal',
  },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface VehicleRow {
  vehiculo: string;
  ingresos: number;
  gastos: number;
  neto: number;
}

interface DriverRow {
  chofer: string;
  plataforma: string;
  ingresos: number;
  deuda: number;
}

type ChartTab = 'vehiculos' | 'choferes' | 'resumen';

interface ProgramadoLocal {
  id: string;
  nombre: string;
  frecuencia: string;
  canal: string;
  proximoEnvio: string;
  destinatario: string;
  ultimoEnvio: string;
  activo: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<ChartTab>('vehiculos');
  const [mesFilter, setMesFilter] = useState(new Date().toISOString().slice(0, 7));
  const [showProgramarModal, setShowProgramarModal] = useState(false);
  const [generando, setGenerando] = useState<string | null>(null);
  const [programadosLocal, setProgramadosLocal] = useState<ProgramadoLocal[]>([]);
  const [formPrograma, setFormPrograma] = useState({ reporte: '', frecuencia: 'Semanal', canal: 'Email', email: '' });
  const [formatos, setFormatos] = useState<Record<string, FormatoReporte>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ─── Datos reales ──────────────────────────────────────────────────────────
  const [vehicleData, setVehicleData] = useState<VehicleRow[]>([]);
  const [driverData, setDriverData] = useState<DriverRow[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  useEffect(() => {
    document.title = 'Reportes | Gestiona tu Flotilla';

    // Cargar vehículos y cuentas semanales en paralelo
    Promise.all([
      fetch('/api/vehicles').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/weekly-accounts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/drivers').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/maintenance').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([vehs, accounts, drivers, maint]) => {
      const vehicles: Array<{ id: string; eco: string }> = vehs.data || vehs || [];
      const weeklyRows: Array<{
        eco: string;
        totalIncome: number;
        rent: number;
        driverName: string;
        status: string;
        balance: number;
      }> = accounts.data || [];
      const driverList: Array<{ id: string; firstName: string; lastName: string; platform?: string }> =
        drivers.data || drivers || [];
      const maintList: Array<{ vehicle_id?: string; eco?: string; costo?: number; cost?: number }> =
        maint.data || maint || [];

      // Construir datos de vehículos (ingresos = suma rentas semana, gastos = mantenimientos)
      const vehicleMap: Record<string, VehicleRow> = {};
      for (const v of vehicles) {
        vehicleMap[v.eco] = { vehiculo: v.eco, ingresos: 0, gastos: 0, neto: 0 };
      }

      // Ingresos desde cuentas semanales
      for (const row of weeklyRows) {
        if (row.eco && vehicleMap[row.eco]) {
          vehicleMap[row.eco].ingresos += Number(row.totalIncome) || 0;
        }
      }

      // Gastos desde mantenimientos
      for (const m of maintList) {
        const eco = m.eco;
        if (eco && vehicleMap[eco]) {
          vehicleMap[eco].gastos += Number(m.costo ?? m.cost ?? 0);
        }
      }

      // Calcular neto
      for (const key of Object.keys(vehicleMap)) {
        vehicleMap[key].neto = vehicleMap[key].ingresos - vehicleMap[key].gastos;
      }

      const vData = Object.values(vehicleMap).filter(v => v.ingresos > 0 || v.gastos > 0);
      setVehicleData(vData.length > 0 ? vData : []);

      // Datos de choferes desde cuentas semanales agrupadas por nombre
      const driverMap: Record<string, DriverRow> = {};
      for (const row of weeklyRows) {
        const name = row.driverName || 'Sin asignar';
        if (!driverMap[name]) {
          driverMap[name] = { chofer: name, plataforma: 'Didi/Uber', ingresos: 0, deuda: 0 };
        }
        driverMap[name].ingresos += Number(row.totalIncome) || 0;
        if (row.status === 'pending') {
          driverMap[name].deuda += Number(row.rent) || 0;
        }
      }

      // Completar con choferes registrados aunque no tengan cuentas
      for (const d of driverList) {
        const name = `${d.firstName || ''} ${d.lastName || ''}`.trim();
        if (name && !driverMap[name]) {
          driverMap[name] = { chofer: name, plataforma: d.platform || 'Didi/Uber', ingresos: 0, deuda: 0 };
        }
      }

      const dData = Object.values(driverMap).filter(d => d.chofer !== 'Sin asignar' || d.ingresos > 0);
      setDriverData(dData);
    }).finally(() => setLoadingCharts(false));
  }, []);

  const getFormato = (nombre: string): FormatoReporte => formatos[nombre] ?? 'excel';

  const handleSetFormato = (nombre: string, fmt: FormatoReporte) => {
    setFormatos(prev => ({ ...prev, [nombre]: fmt }));
    setOpenDropdown(null);
  };

  const handleGenerar = (reporteNombre: string) => {
    const fmt = getFormato(reporteNombre);
    setGenerando(reporteNombre);
    setTimeout(() => {
      setGenerando(null);
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = reporteNombre.replace(/ /g, '_');

      if (fmt === 'excel') {
        const bom = '﻿';
        const filas: string[][] = [
          ['Concepto', 'Valor', 'Periodo', 'Empresa'],
          ['Reporte', reporteNombre, fecha, 'Gestiona tu Flotilla'],
          ['Total vehículos', String(vehicleData.length), '', ''],
          ['', '', '', ''],
          ['Vehículo', 'Ingresos', 'Gastos', 'Neto'],
          ...(vehicleData.length > 0
            ? vehicleData.map(v => [v.vehiculo, `$${v.ingresos.toLocaleString('es-MX')}`, `$${v.gastos.toLocaleString('es-MX')}`, `$${v.neto.toLocaleString('es-MX')}`])
            : [['Sin datos', '', '', '']]),
        ];
        const csv = bom + filas.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${nombreArchivo}_${fecha}.csv`; a.click();
        URL.revokeObjectURL(url);

      } else if (fmt === 'pdf') {
        const rows = vehicleData.length > 0
          ? vehicleData.map(v => `<tr><td>${v.vehiculo}</td><td>$${v.ingresos.toLocaleString('es-MX')}</td><td>$${v.gastos.toLocaleString('es-MX')}</td><td>$${v.neto.toLocaleString('es-MX')}</td></tr>`).join('')
          : '<tr><td colspan="4" style="color:#94a3b8;text-align:center">Sin datos para este período</td></tr>';
        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${reporteNombre}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:32px;color:#1e293b}
    h1{font-size:22px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px}
    .meta{font-size:12px;color:#64748b;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#1d4ed8;color:white;padding:8px 12px;text-align:left}
    td{padding:7px 12px;border-bottom:1px solid #e2e8f0}
    tr:nth-child(even) td{background:#f8fafc}
    .footer{margin-top:32px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
  </style>
</head>
<body>
  <h1>${reporteNombre}</h1>
  <div class="meta">Generado: ${new Date().toLocaleString('es-MX')} &nbsp;|&nbsp; Gestiona tu Flotilla</div>
  <table>
    <thead><tr><th>Vehículo</th><th>Ingresos</th><th>Gastos</th><th>Neto</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Gestiona tu Flotilla — ${fecha}</div>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
</body>
</html>`;
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }

      } else {
        const lines = vehicleData.length > 0
          ? vehicleData.map(v => `${v.vehiculo}  Ingresos $${v.ingresos.toLocaleString('es-MX')}  Gastos $${v.gastos.toLocaleString('es-MX')}  Neto $${v.neto.toLocaleString('es-MX')}`).join('\n')
          : 'Sin datos para este período';
        const blob = new Blob([`REPORTE: ${reporteNombre}\nGenerado: ${new Date().toLocaleString('es-MX')}\nGestiona tu Flotilla\n\n${lines}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${nombreArchivo}_${fecha}.txt`; a.click();
        URL.revokeObjectURL(url);
      }
    }, 1000);
  };

  const handleProgramar = () => {
    if (!formPrograma.reporte || !formPrograma.email) {
      alert('Selecciona un reporte e ingresa el email');
      return;
    }
    const now = new Date();
    setProgramadosLocal(prev => [...prev, {
      id: `prog-${Date.now()}`,
      nombre: formPrograma.reporte,
      frecuencia: formPrograma.frecuencia,
      canal: formPrograma.canal,
      proximoEnvio: 'Próximo envío calculado',
      destinatario: formPrograma.email,
      ultimoEnvio: '—',
      activo: true,
    }]);
    setShowProgramarModal(false);
    setFormPrograma({ reporte: '', frecuencia: 'Semanal', canal: 'Email', email: '' });
  };

  // KPIs calculados desde datos reales
  const totalIngresos = vehicleData.reduce((s, v) => s + v.ingresos, 0);
  const totalGastos = vehicleData.reduce((s, v) => s + v.gastos, 0);
  const totalNeto = totalIngresos - totalGastos;
  const margenNeto = totalIngresos > 0 ? ((totalNeto / totalIngresos) * 100).toFixed(1) : '—';
  const mejorVehiculo = vehicleData.length > 0
    ? vehicleData.reduce((best, v) => v.neto > best.neto ? v : best, vehicleData[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-slate-500 mt-1">Genera y programa reportes de tu flotilla</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesFilter}
            onChange={e => setMesFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              const fecha = new Date().toISOString().split('T')[0];
              const bom = '﻿';
              const filas = [
                ['Vehículo', 'Ingresos', 'Gastos', 'Neto'],
                ...vehicleData.map(v => [v.vehiculo, String(v.ingresos), String(v.gastos), String(v.neto)]),
              ];
              const csv = bom + filas.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `reporte_${fecha}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowProgramarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Programar reporte
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Ingresos registrados</p>
          {loadingCharts
            ? <div className="h-8 bg-slate-100 animate-pulse rounded mt-1" />
            : <p className="text-2xl font-bold text-slate-900 mt-1">
                {totalIngresos > 0 ? `$${totalIngresos.toLocaleString('es-MX')}` : '—'}
              </p>
          }
          <p className="text-xs text-slate-400 mt-1">Suma de cuentas semanales</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Gastos de operación</p>
          {loadingCharts
            ? <div className="h-8 bg-slate-100 animate-pulse rounded mt-1" />
            : <p className="text-2xl font-bold text-slate-900 mt-1">
                {totalGastos > 0 ? `$${totalGastos.toLocaleString('es-MX')}` : '—'}
              </p>
          }
          <p className="text-xs text-slate-400 mt-1">Mantenimientos registrados</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Margen neto</p>
          {loadingCharts
            ? <div className="h-8 bg-slate-100 animate-pulse rounded mt-1" />
            : <p className={`text-2xl font-bold mt-1 ${totalNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margenNeto !== '—' ? `${margenNeto}%` : '—'}
              </p>
          }
          <p className="text-xs text-slate-400 mt-1">Rentabilidad sobre ingresos</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Mejor vehículo</p>
          {loadingCharts
            ? <div className="h-8 bg-slate-100 animate-pulse rounded mt-1" />
            : <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">
                {mejorVehiculo ? mejorVehiculo.vehiculo : '—'}
              </p>
          }
          <p className="text-xs text-slate-400 mt-1">
            {mejorVehiculo ? `Neto: $${mejorVehiculo.neto.toLocaleString('es-MX')}` : 'Sin datos'}
          </p>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex border-b border-slate-200 px-4">
          {([
            { id: 'vehiculos', label: 'Ingresos por vehículo' },
            { id: 'choferes', label: 'Rentabilidad por chofer' },
            { id: 'resumen', label: 'Resumen ejecutivo' },
          ] as { id: ChartTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loadingCharts ? (
            <div className="h-[280px] flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'vehiculos' && (
                vehicleData.length === 0 ? (
                  <EmptyChart label="Registra cuentas semanales para ver ingresos por vehículo" />
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Ingresos vs Gastos vs Neto por vehículo</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={vehicleData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="vehiculo" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(value) => [`$${Number(value).toLocaleString('es-MX')}`, '']} />
                        <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ingresos" />
                        <Bar dataKey="gastos" fill="#f87171" radius={[4, 4, 0, 0]} name="Gastos" />
                        <Bar dataKey="neto" fill="#34d399" radius={[4, 4, 0, 0]} name="Neto" />
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )
              )}

              {activeTab === 'choferes' && (
                driverData.length === 0 ? (
                  <EmptyChart label="Sin choferes con datos registrados" />
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Ingresos por chofer</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Chofer</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Plataforma</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Ingresos</th>
                            <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Deuda</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {driverData.map(d => (
                            <tr key={d.chofer} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">{d.chofer}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  d.plataforma === 'Uber' ? 'bg-black text-white'
                                  : d.plataforma === 'Didi' ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {d.plataforma}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                {d.ingresos > 0 ? `$${d.ingresos.toLocaleString('es-MX')}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {d.deuda > 0
                                  ? <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">${d.deuda.toLocaleString()}</span>
                                  : <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Al día</span>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              )}

              {activeTab === 'resumen' && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumen por vehículo</h3>
                    {vehicleData.length === 0 ? (
                      <p className="text-sm text-slate-400">Sin datos disponibles</p>
                    ) : (
                      <div className="space-y-2">
                        {vehicleData.map(v => (
                          <div key={v.vehiculo} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-mono font-bold text-blue-600">{v.vehiculo}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-blue-600">${v.ingresos.toLocaleString()}</span>
                              {v.gastos > 0 && <span className="text-red-500">-${v.gastos.toLocaleString()}</span>}
                              <span className={`font-semibold ${v.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>${v.neto.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumen por chofer</h3>
                    {driverData.length === 0 ? (
                      <p className="text-sm text-slate-400">Sin datos disponibles</p>
                    ) : (
                      <div className="space-y-2">
                        {driverData.map(d => (
                          <div key={d.chofer} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm font-medium text-slate-900">{d.chofer}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-700">
                                {d.ingresos > 0 ? `$${d.ingresos.toLocaleString()}` : '—'}
                              </span>
                              {d.deuda > 0 && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                  Deuda ${d.deuda.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Report Grid */}
      <div className="grid grid-cols-3 gap-4">
        {REPORTES.map((reporte) => (
          <div key={reporte.titulo} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl ${reporte.bg} flex items-center justify-center`}>
                <reporte.icon className={`w-6 h-6 ${reporte.color}`} />
              </div>
              <div className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-100 text-slate-500">
                {getFormato(reporte.nombre) === 'excel' ? '📊 Excel' : getFormato(reporte.nombre) === 'pdf' ? '📄 PDF' : '📝 TXT'}
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mt-4">{reporte.titulo}</h3>
            <p className="text-sm text-slate-500 mt-1">{reporte.descripcion}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2">
                {/* Selector de formato */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === reporte.nombre ? null : reporte.nombre)}
                    className="w-full flex items-center justify-between gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {getFormato(reporte.nombre) === 'excel' && <><Sheet className="w-3.5 h-3.5 text-green-600" /> Excel</>}
                      {getFormato(reporte.nombre) === 'pdf' && <><FileOutput className="w-3.5 h-3.5 text-red-500" /> PDF</>}
                      {getFormato(reporte.nombre) === 'txt' && <><FileText className="w-3.5 h-3.5 text-slate-500" /> TXT</>}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {openDropdown === reporte.nombre && (
                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button onClick={() => handleSetFormato(reporte.nombre, 'excel')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left">
                        <Sheet className="w-4 h-4 text-green-600" /> Excel (.csv)
                      </button>
                      <button onClick={() => handleSetFormato(reporte.nombre, 'pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left">
                        <FileOutput className="w-4 h-4 text-red-500" /> PDF
                      </button>
                      <button onClick={() => handleSetFormato(reporte.nombre, 'txt')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left">
                        <FileText className="w-4 h-4 text-slate-500" /> Texto (.txt)
                      </button>
                    </div>
                  )}
                </div>
                {/* Botón generar */}
                <button
                  onClick={() => handleGenerar(reporte.nombre)}
                  disabled={generando === reporte.nombre}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {generando === reporte.nombre
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Play className="w-3.5 h-3.5" />
                  }
                  {generando === reporte.nombre ? 'Generando...' : 'Generar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">Reportes Programados</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {programadosLocal.filter(r => r.activo).length} activos
            </span>
          </div>
          <button
            onClick={() => setShowProgramarModal(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Nuevo programa
          </button>
        </div>
        {programadosLocal.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin reportes programados</p>
            <button
              onClick={() => setShowProgramarModal(true)}
              className="mt-3 text-sm text-blue-600 hover:underline font-medium"
            >
              Programar primer reporte
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {programadosLocal.map((reporte) => (
              <div key={reporte.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{reporte.nombre}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />{reporte.frecuencia}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Mail className="w-3 h-3" />{reporte.destinatario}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${reporte.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Programar Reporte */}
      {showProgramarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-slate-900">📅 Programar Reporte</h2>
              <button onClick={() => setShowProgramarModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de reporte</label>
                <select
                  value={formPrograma.reporte}
                  onChange={e => setFormPrograma(p => ({ ...p, reporte: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un reporte...</option>
                  {REPORTES.map(r => <option key={r.nombre} value={r.nombre}>{r.titulo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Frecuencia</label>
                <select
                  value={formPrograma.frecuencia}
                  onChange={e => setFormPrograma(p => ({ ...p, frecuencia: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Diario</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Enviar por</label>
                <select
                  value={formPrograma.canal}
                  onChange={e => setFormPrograma(p => ({ ...p, canal: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Email</option>
                  <option>WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email de destino *</label>
                <input
                  type="email"
                  value={formPrograma.email}
                  onChange={e => setFormPrograma(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@flotilla.mx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowProgramarModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleProgramar} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">✓ Programar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: empty state para charts ─────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 gap-2">
      <BarChart3 className="w-8 h-8 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
