'use client';

import { Header } from '@/components/layout/Header';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Phone,
  Mail,
  Car,
  CheckCircle2,
  FileText,
  AlertCircle,
  Banknote,
  Route,
  TrendingUp,
  Shield,
  Download,
  Edit,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from 'lucide-react';

// ─── Mock driver profile ───────────────────────────────────────────────────────

const DRIVER = {
  id: 'drv-001',
  nombre: 'Carlos Ramírez',
  telefono: '+52 55 1234 5678',
  email: 'carlos.ramirez@email.com',
  direccion: 'Calle Tulipanes 42, Col. Jardines, CDMX',
  fechaIngreso: '2022-03-15',
  status: 'Activo',
  vehiculo: { eco: 'ECO-001', modelo: 'Toyota Yaris 2021', placas: 'ABC-1234', color: 'Blanco' },
  plataformas: ['Uber', 'Didi'],
  rating: 4.91,
  scoreChofer: 95,
  viajes: { semana: 48, mes: 192, total: 3412 },
  horas: { semana: 54, mes: 216 },
  licencia: { numero: 'CDMX-2021-447821', tipo: 'A', vencimiento: '2027-06-15' },
  ganancias: { semana: 5280, mes: 21120, adeudo: 0 },
  documentos: [
    { nombre: 'Licencia de conducir', status: 'vigente', vence: '2027-06-15' },
    { nombre: 'INE / Identificación', status: 'vigente', vence: '2029-03-10' },
    { nombre: 'Comprobante domicilio', status: 'vencido', vence: '2025-12-01' },
    { nombre: 'Antecedentes penales', status: 'vigente', vence: '2026-09-20' },
    { nombre: 'CURP', status: 'vigente', vence: null },
    { nombre: 'Contrato firmado', status: 'vigente', vence: '2027-03-15' },
  ],
  pagos: [
    { fecha: '2026-03-24', concepto: 'Renta semanal', monto: -2800, tipo: 'cargo', estado: 'Pagado' },
    { fecha: '2026-03-17', concepto: 'Renta semanal', monto: -2800, tipo: 'cargo', estado: 'Pagado' },
    { fecha: '2026-03-14', concepto: 'Bono productividad', monto: 500, tipo: 'abono', estado: 'Acreditado' },
    { fecha: '2026-03-10', concepto: 'Renta semanal', monto: -2800, tipo: 'cargo', estado: 'Pagado' },
    { fecha: '2026-03-05', concepto: 'Mantenimiento preventivo', monto: -900, tipo: 'cargo', estado: 'Descontado' },
    { fecha: '2026-03-03', concepto: 'Renta semanal', monto: -2800, tipo: 'cargo', estado: 'Pagado' },
  ],
  incidencias: [
    { fecha: '2026-03-05', tipo: 'Golpe', descripcion: 'Golpe menor en defensa trasera', costo: 1200, status: 'Resuelto' },
  ],
  semanas: [
    { semana: 'S12', viajes: 48, ingresos: 5280 },
    { semana: 'S11', viajes: 42, ingresos: 4620 },
    { semana: 'S10', viajes: 45, ingresos: 4950 },
    { semana: 'S9',  viajes: 39, ingresos: 4290 },
    { semana: 'S8',  viajes: 51, ingresos: 5610 },
    { semana: 'S7',  viajes: 37, ingresos: 4070 },
  ],
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-4 w-4 ${s <= Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}`} />
      ))}
      <span className="ml-1 text-sm font-bold text-slate-700">{rating}</span>
    </div>
  );
}

const TABS = ['Resumen', 'Pagos', 'Documentos', 'Incidencias'] as const;
type Tab = typeof TABS[number];

export default function ChoferDetailPage() {
  const [tab, setTab] = useState<Tab>('Resumen');
  const d = DRIVER;
  const maxIngresos = Math.max(...d.semanas.map(s => s.ingresos));

  const handleGenerarContrato = () => {
    const contenido = `CONTRATO DE ARRENDAMIENTO DE VEHÍCULO\n\n` +
      `Chofer: ${d.nombre}\n` +
      `Fecha: ${new Date().toLocaleDateString('es-MX')}\n` +
      `Vehículo: ${d.vehiculo.eco} — ${d.vehiculo.modelo}\n` +
      `Placas: ${d.vehiculo.placas}\n` +
      `Plataformas: ${d.plataformas.join(', ')}\n\n` +
      `Renta semanal acordada: $2,800 MXN\n` +
      `Depósito garantía: $5,000 MXN\n\n` +
      `El presente contrato establece los términos y condiciones de arrendamiento...\n\n` +
      `_________________________        _________________________\n` +
      `Empresa Flotilla Premier          ${d.nombre}\n` +
      `Gestiona tu Flotilla S.A. de C.V.    Chofer`;
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_${d.nombre.replace(' ', '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header breadcrumbs={[{ label: 'Choferes', href: '/choferes' }, { label: d.nombre }]} />

      <div className="p-6 space-y-6">
        <Link href="/choferes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Volver a choferes
        </Link>

        {/* Profile header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-lg">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 flex-shrink-0 ring-2 ring-white/30">
              <span className="text-3xl font-black text-white">{d.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">{d.nombre}</h1>
                <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> {d.status}
                </span>
              </div>
              <RatingStars rating={d.rating} />
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-blue-200">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{d.telefono}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{d.email}</span>
                <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{d.vehiculo.eco} — {d.vehiculo.modelo}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleGenerarContrato} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <FileText className="h-4 w-4" /> Generar Contrato
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <Edit className="h-4 w-4" /> Editar Perfil
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Viajes esta semana', value: d.viajes.semana, sub: `${d.horas.semana}h trabajadas`, color: 'from-blue-500 to-blue-700', icon: Route },
            { label: 'Ingresos semana', value: `$${d.ganancias.semana.toLocaleString()}`, sub: `$${d.ganancias.mes.toLocaleString()} este mes`, color: 'from-green-500 to-emerald-600', icon: Banknote },
            { label: 'Score conductual', value: d.scoreChofer, sub: 'Sobre 100 pts', color: 'from-purple-500 to-purple-700', icon: BarChart3 },
            { label: 'Adeudo actual', value: d.ganancias.adeudo === 0 ? 'Sin deuda' : `$${d.ganancias.adeudo.toLocaleString()}`, sub: d.ganancias.adeudo === 0 ? 'Al corriente ✅' : 'Pendiente de pago', color: d.ganancias.adeudo === 0 ? 'from-teal-500 to-teal-700' : 'from-red-500 to-red-700', icon: DollarSign },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 shadow-lg relative overflow-hidden`}>
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/10" />
              <Icon className="h-5 w-5 text-white/70 mb-2" />
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-white/80 text-xs font-semibold mt-0.5">{label}</p>
              <p className="text-white/50 text-[11px] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Resumen */}
        {tab === 'Resumen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info personal */}
            <div className="card p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /> Información Personal</h3>
              {[
                { label: 'Licencia', value: `${d.licencia.numero} (Tipo ${d.licencia.tipo})` },
                { label: 'Venc. licencia', value: formatDate(d.licencia.vencimiento) },
                { label: 'Teléfono', value: d.telefono },
                { label: 'Email', value: d.email },
                { label: 'Domicilio', value: d.direccion },
                { label: 'Ingreso', value: formatDate(d.fechaIngreso) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide flex-shrink-0">{label}</span>
                  <span className="text-sm text-slate-800 font-medium text-right truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* Gráfica semanal */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" /> Tendencia Semanal</h3>
              <div className="flex items-end gap-2 h-28 mb-3">
                {d.semanas.map(s => (
                  <div key={s.semana} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-slate-500 font-semibold">${(s.ingresos/1000).toFixed(1)}k</span>
                    <div className="w-full rounded-t-lg bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer" style={{ height: `${(s.ingresos / maxIngresos) * 88}%` }} title={`${s.viajes} viajes · $${s.ingresos.toLocaleString()}`} />
                    <span className="text-[10px] text-slate-400">{s.semana}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                <div><p className="text-base font-black text-slate-900">{d.viajes.mes}</p><p className="text-[11px] text-slate-400">Viajes mes</p></div>
                <div><p className="text-base font-black text-green-600">${(d.ganancias.mes/1000).toFixed(1)}k</p><p className="text-[11px] text-slate-400">Ingresos mes</p></div>
                <div><p className="text-base font-black text-blue-600">{d.rating}⭐</p><p className="text-[11px] text-slate-400">Rating</p></div>
              </div>
            </div>

            {/* Vehículo */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><Car className="h-4 w-4 text-blue-500" /> Vehículo Asignado</h3>
              <div className="flex justify-center py-3 text-6xl">🚗</div>
              <div className="space-y-2.5 mt-2">
                {[
                  ['ECO', d.vehiculo.eco],
                  ['Modelo', d.vehiculo.modelo],
                  ['Placas', d.vehiculo.placas],
                  ['Color', d.vehiculo.color],
                  ['Plataformas', d.plataformas.join(' / ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-sm font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Pagos */}
        {tab === 'Pagos' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900">Historial de Pagos</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${d.ganancias.adeudo === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                Adeudo: ${d.ganancias.adeudo.toLocaleString()}
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Fecha', 'Concepto', 'Monto', 'Estado'].map(h => (
                    <th key={h} className={`pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide ${h === 'Monto' || h === 'Estado' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {d.pagos.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3 text-sm text-slate-600">{formatDate(p.fecha)}</td>
                    <td className="py-3 text-sm font-medium text-slate-800">{p.concepto}</td>
                    <td className={`py-3 text-sm font-bold text-right ${p.tipo === 'abono' ? 'text-green-600' : 'text-red-600'}`}>
                      {p.tipo === 'abono' ? '+' : '-'}${Math.abs(p.monto).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.estado === 'Pagado' || p.estado === 'Acreditado' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>{p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Documentos */}
        {tab === 'Documentos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {d.documentos.map(doc => (
              <div key={doc.nombre} className={`rounded-2xl border p-5 ${doc.status === 'vencido' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${doc.status === 'vigente' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {doc.status === 'vigente' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                  </div>
                  <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <Download className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-800">{doc.nombre}</p>
                {doc.vence && (
                  <p className={`text-xs mt-1 ${doc.status === 'vigente' ? 'text-green-600' : 'text-red-600 font-semibold'}`}>
                    {doc.status === 'vencido' ? '⚠️ Vencido: ' : 'Vence: '}{formatDate(doc.vence)}
                  </p>
                )}
                {!doc.vence && <p className="text-xs mt-1 text-slate-400">Sin vencimiento</p>}
              </div>
            ))}
          </div>
        )}

        {/* Tab: Incidencias */}
        {tab === 'Incidencias' && (
          <div className="space-y-3">
            {d.incidencias.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                <p className="font-semibold">Sin incidencias registradas</p>
              </div>
            ) : d.incidencias.map((inc, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl border border-orange-200 bg-orange-50">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">{inc.tipo}</p>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{inc.status}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{inc.descripcion}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{formatDate(inc.fecha)}</span>
                    <span>Costo: ${inc.costo.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
