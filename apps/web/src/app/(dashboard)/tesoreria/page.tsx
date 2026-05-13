'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Banknote,
  Building2,
  Search,
  Filter,
  X,
  Download,
} from 'lucide-react';
import { exportToCsv } from '@/lib/exportCsv';
import { Header } from '@/components/layout/Header';

// ── Types ──────────────────────────────────────────────────────────────────────

type TreasuryRow = {
  id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  reference: string | null;
  status: string;
  createdAt: string;
  driver: string | null;
  vehicle: string | null;
};

type Summary = {
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  pendientesCobro: number;
  total: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMoney(amount: number) {
  return '$' + amount.toLocaleString('es-MX');
}

function formatFecha(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusBadge(status: string) {
  if (status === 'completed' || status === 'Confirmado' || status === 'Pagado') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Confirmado</span>;
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>;
}

function getMetodoIcon(metodo: string) {
  switch (metodo) {
    case 'Efectivo': return <Banknote className="w-3.5 h-3.5 text-green-600" />;
    case 'Transferencia': return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
    case 'Depósito': return <CreditCard className="w-3.5 h-3.5 text-purple-600" />;
    default: return <DollarSign className="w-3.5 h-3.5" />;
  }
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function TesoreriaPage() {
  const [rows, setRows] = useState<TreasuryRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIngresos: 0, totalEgresos: 0, balance: 0, pendientesCobro: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [mesFilter, setMesFilter] = useState(new Date().toISOString().slice(0, 7));

  // ── Estado modales ─────────────────────────────────────────────────────────
  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);

  // ── Form ingreso ───────────────────────────────────────────────────────────
  const [formIngreso, setFormIngreso] = useState({
    concepto: 'Renta semanal',
    chofer: '',
    monto: '',
    metodo: 'Efectivo',
  });

  // ── Form gasto ─────────────────────────────────────────────────────────────
  const [formGasto, setFormGasto] = useState({
    concepto: 'Mantenimiento',
    proveedor: '',
    monto: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  function fetchData() {
    setLoading(true);
    fetch(`/api/treasury?month=${mesFilter}`)
      .then(r => r.json())
      .then(json => {
        setRows(json.data || []);
        setSummary(json.summary || { totalIngresos: 0, totalEgresos: 0, balance: 0, pendientesCobro: 0, total: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [mesFilter]);

  useEffect(() => { document.title = 'Tesorería | Gestiona tu Flotilla'; }, []);

  const rowsFiltrados = rows.filter(item => item.fecha.slice(0, 7) === mesFilter);
  const ingresosData = rowsFiltrados.filter(r => r.tipo === 'ingreso');
  const gastosData   = rowsFiltrados.filter(r => r.tipo === 'egreso');
  const pendientes   = rowsFiltrados.filter(r => r.tipo === 'ingreso' && r.status === 'pending');

  const stats = [
    { label: 'Ingresos semana', valor: formatMoney(summary.totalIngresos), icon: TrendingUp, color: 'text-green-600', iconBg: 'bg-green-100' },
    { label: 'Gastos semana', valor: formatMoney(summary.totalEgresos), icon: TrendingDown, color: 'text-red-600', iconBg: 'bg-red-100' },
    { label: 'Utilidad', valor: formatMoney(summary.balance), icon: DollarSign, color: summary.balance >= 0 ? 'text-blue-600' : 'text-red-600', iconBg: summary.balance >= 0 ? 'bg-blue-100' : 'bg-red-100' },
    { label: 'Pendientes de cobro', valor: formatMoney(summary.pendientesCobro), icon: AlertCircle, color: 'text-orange-600', iconBg: 'bg-orange-100' },
  ];

  // ── Guardar ingreso ────────────────────────────────────────────────────────
  async function handleGuardarIngreso() {
    if (!formIngreso.monto) return;
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/treasury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'ingreso',
        categoria: formIngreso.concepto,
        descripcion: formIngreso.chofer.trim() || null,
        monto: Number(formIngreso.monto),
        fecha: today,
        reference: formIngreso.metodo,
      }),
    });
    if (res.ok) {
      fetchData();
      setFormIngreso({ concepto: 'Renta semanal', chofer: '', monto: '', metodo: 'Efectivo' });
      setModalIngreso(false);
    }
  }

  // ── Guardar gasto ──────────────────────────────────────────────────────────
  async function handleGuardarGasto() {
    if (!formGasto.monto) return;
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch('/api/treasury', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'egreso',
        categoria: formGasto.concepto,
        descripcion: formGasto.proveedor.trim() || null,
        monto: Number(formGasto.monto),
        fecha: today,
      }),
    });
    if (res.ok) {
      fetchData();
      setFormGasto({ concepto: 'Mantenimiento', proveedor: '', monto: '' });
      setModalGasto(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header breadcrumbs={[{ label: 'Tesorería' }]} />

      <div className="space-y-6 p-6">
        {/* Título + botones */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tesorería</h1>
            <p className="text-slate-500 mt-1">Control financiero de tu flotilla</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={mesFilter}
              onChange={e => setMesFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => exportToCsv('tesoreria_ingresos', ingresosData.map(i => ({
                Fecha: i.fecha,
                Concepto: i.categoria,
                Chofer: i.driver || '',
                Monto: i.monto,
                Método: i.reference || '',
                Status: i.status,
              })))}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              onClick={() => setModalIngreso(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Registrar Ingreso
            </button>
            <button
              onClick={() => setModalGasto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Registrar Gasto
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{stat.label}</span>
                <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.valor}</p>
            </div>
          ))}
        </div>

        {/* Ingresos + Gastos */}
        <div className="grid grid-cols-2 gap-6">
          {/* Ingresos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-900">Ingresos Recientes</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Search className="w-4 h-4 text-slate-400" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Filter className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
              ) : ingresosData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay ingresos registrados aún</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Fecha</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Concepto</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Chofer</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Monto</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Método</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingresosData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(item.fecha)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.categoria}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.driver || item.descripcion || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 text-right">{formatMoney(item.monto)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {getMetodoIcon(item.reference || '')}
                            <span className="text-xs text-slate-500">{item.reference || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-slate-900">Gastos Recientes</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Search className="w-4 h-4 text-slate-400" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg"><Filter className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
              ) : gastosData.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay gastos registrados aún</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Fecha</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Concepto</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Proveedor</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Monto</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gastosData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(item.fecha)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.categoria}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.descripcion || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">{formatMoney(item.monto)}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Cuentas por Cobrar (pendientes de ingreso) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-slate-900">Cuentas por Cobrar</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {pendientes.length} pendientes
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
            ) : pendientes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No hay cuentas pendientes de cobro</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Chofer</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Concepto</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Monto</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendientes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{item.driver || item.descripcion || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.categoria}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600 text-right">{formatMoney(item.monto)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{formatFecha(item.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Registrar Ingreso ───────────────────────────────────────────── */}
      {modalIngreso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Registrar Ingreso</h2>
              </div>
              <button
                onClick={() => setModalIngreso(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Concepto</label>
                <select
                  value={formIngreso.concepto}
                  onChange={(e) => setFormIngreso({ ...formIngreso, concepto: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option>Renta semanal</option>
                  <option>Depósito garantía</option>
                  <option>Pago adeudo</option>
                  <option>Multa</option>
                  <option>Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Chofer</label>
                <input
                  type="text"
                  placeholder="Nombre del chofer"
                  value={formIngreso.chofer}
                  onChange={(e) => setFormIngreso({ ...formIngreso, chofer: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto (MXN)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min={0}
                  value={formIngreso.monto}
                  onChange={(e) => setFormIngreso({ ...formIngreso, monto: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Método de pago</label>
                <select
                  value={formIngreso.metodo}
                  onChange={(e) => setFormIngreso({ ...formIngreso, metodo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Depósito</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setModalIngreso(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarIngreso}
                className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Guardar ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Registrar Gasto ─────────────────────────────────────────────── */}
      {modalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Registrar Gasto</h2>
              </div>
              <button
                onClick={() => setModalGasto(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Concepto</label>
                <select
                  value={formGasto.concepto}
                  onChange={(e) => setFormGasto({ ...formGasto, concepto: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option>Mantenimiento</option>
                  <option>Combustible</option>
                  <option>Seguro</option>
                  <option>Verificación</option>
                  <option>Refacciones</option>
                  <option>Nómina</option>
                  <option>Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Proveedor</label>
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={formGasto.proveedor}
                  onChange={(e) => setFormGasto({ ...formGasto, proveedor: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto (MXN)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min={0}
                  value={formGasto.monto}
                  onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setModalGasto(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarGasto}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Guardar gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
