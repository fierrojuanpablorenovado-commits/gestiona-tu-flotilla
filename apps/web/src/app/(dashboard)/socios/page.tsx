'use client';

import {
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  Eye,
  FileText,
  Mail,
  BarChart3,
  Wallet,
  CheckCircle2,
  PauseCircle,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

type Socio = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  vehiclesCount: number;
  investment: number;
  monthlyIncome: number;
  roi: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type Summary = {
  total: number;
  activos: number;
  totalInvestment: number;
  totalMonthly: number;
};

function formatMoney(amount: number) {
  return '$' + amount.toLocaleString('es-MX');
}

export default function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, activos: 0, totalInvestment: 0, totalMonthly: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedSocio, setExpandedSocio] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', empresa: '', email: '', telefono: '', tipo: 'Inversionista', vehiculos: '1', aportacion: '', notas: '' });

  function fetchData() {
    setLoading(true);
    fetch('/api/socios')
      .then(r => r.json())
      .then(json => {
        setSocios(json.data || []);
        setSummary(json.summary || { total: 0, activos: 0, totalInvestment: 0, totalMonthly: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => { document.title = 'Socios | Gestiona tu Flotilla'; }, []);

  const handleSave = async () => {
    if (!form.nombre || !form.telefono) { alert('Nombre y teléfono son requeridos'); return; }
    const res = await fetch('/api/socios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.nombre,
        email: form.email || null,
        phone: form.telefono,
        vehiclesCount: parseInt(form.vehiculos) || 1,
        investment: parseFloat(form.aportacion) || 0,
        notes: form.notas || null,
      }),
    });
    if (res.ok) {
      fetchData();
      setForm({ nombre: '', empresa: '', email: '', telefono: '', tipo: 'Inversionista', vehiculos: '1', aportacion: '', notas: '' });
      setShowModal(false);
    }
  };

  const stats = [
    { label: 'Socios activos', valor: String(summary.activos), icon: Users, color: 'text-blue-600', iconBg: 'bg-blue-100' },
    { label: 'Total socios', valor: String(summary.total), icon: Truck, color: 'text-purple-600', iconBg: 'bg-purple-100' },
    { label: 'Inversión total', valor: formatMoney(summary.totalInvestment), icon: DollarSign, color: 'text-green-600', iconBg: 'bg-green-100' },
    { label: 'Ingreso mensual', valor: formatMoney(summary.totalMonthly), icon: TrendingUp, color: 'text-orange-600', iconBg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Socios e Inversionistas</h1>
          <p className="text-slate-500 mt-1">Gestión de inversores y rentabilidad por socio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Users className="w-4 h-4" />
          Nuevo Socio
        </button>
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

      {/* Partners Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Socios</h2>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
        ) : socios.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay socios registrados aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Nombre del socio</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3"># Vehículos</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Inversión total</th>
                  <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Ingreso mensual</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">ROI %</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                  <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {socios.map((socio) => (
                  <tr key={socio.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-700">{socio.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-900">{socio.name}</span>
                          {socio.phone && <p className="text-xs text-slate-400">{socio.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                        <Truck className="w-4 h-4 text-slate-400" />{socio.vehiclesCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatMoney(Number(socio.investment || 0))}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">{formatMoney(Number(socio.monthlyIncome || 0))}</td>
                    <td className="px-4 py-3 text-center">
                      {socio.roi != null ? (
                        <span className={`text-sm font-bold ${Number(socio.roi) >= 10 ? 'text-green-600' : Number(socio.roi) >= 5 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {Number(socio.roi).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {socio.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          <PauseCircle className="w-3 h-3" />Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-blue-50 rounded-lg" title="Ver detalle">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Estado de cuenta">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg" title="Enviar reporte">
                          <Mail className="w-4 h-4 text-slate-500" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicles by Partner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Vehículos por Socio</h2>
        </div>
        {socios.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay socios registrados aún</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {socios.map((socio) => (
              <div key={socio.id}>
                <button
                  onClick={() => setExpandedSocio(expandedSocio === socio.id ? null : socio.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-700">{socio.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-medium text-slate-900">{socio.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{socio.vehiclesCount} vehículos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Ingreso mensual</span>
                      <p className="text-sm font-bold text-green-600">{formatMoney(Number(socio.monthlyIncome || 0))}</p>
                    </div>
                    {socio.roi != null && (
                      <div className="text-right">
                        <span className="text-xs text-slate-400">ROI</span>
                        <p className="text-sm font-bold text-blue-600">{Number(socio.roi).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </button>
                {expandedSocio === socio.id && (
                  <div className="px-4 pb-4 ml-11">
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-500">{socio.vehiclesCount} vehículos registrados — {socio.notes || 'Sin notas adicionales'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Socio</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo *</label>
                  <input value={form.nombre} onChange={e=>setForm(p=>({...p,nombre:e.target.value}))} placeholder="Juan García Pérez" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Empresa</label>
                  <input value={form.empresa} onChange={e=>setForm(p=>({...p,empresa:e.target.value}))} placeholder="Inversiones XYZ S.A." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono *</label>
                  <input value={form.telefono} onChange={e=>setForm(p=>({...p,telefono:e.target.value}))} placeholder="+52 33 1234-5678" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="socio@empresa.mx" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de socio</label>
                  <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Inversionista</option><option>Propietario</option><option>Arrendador</option><option>Socio Operativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vehículos aportados</label>
                  <input type="number" min="1" value={form.vehiculos} onChange={e=>setForm(p=>({...p,vehiculos:e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Aportación inicial ($)</label>
                  <input type="number" value={form.aportacion} onChange={e=>setForm(p=>({...p,aportacion:e.target.value}))} placeholder="50000" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas</label>
                  <textarea value={form.notas} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={2} placeholder="Acuerdos especiales, condiciones..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Guardar Socio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
