'use client';

// CfdiViewer — Módulo CFDI para Gestiona tu Flotilla
// Sub-tabs: Emitidas | Recibidas | Registrar
// El tenant_id no se recibe como prop — lo extrae la API del token de sesión

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  Info,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CfdiRecord {
  id:                    string;
  tenant_id:             string;
  type:                  'emitida' | 'recibida';
  rfc_emisor:            string | null;
  rfc_receptor:          string | null;
  razon_social_emisor:   string | null;
  razon_social_receptor: string | null;
  folio_fiscal:          string | null;
  serie:                 string | null;
  folio:                 string | null;
  fecha:                 string | null;
  subtotal:              string | number | null;
  descuento:             string | number | null;
  iva:                   string | number | null;
  total:                 string | number | null;
  moneda:                string;
  uso_cfdi:              string | null;
  metodo_pago:           string | null;
  forma_pago:            string | null;
  concepto:              string | null;
  status:                'vigente' | 'cancelado';
  xml_url:               string | null;
  created_at:            string;
}

interface Totales {
  total_emitidas:  number;
  total_recibidas: number;
  saldo:           number;
  iva_emitidas:    number;
  iva_recibidas:   number;
  iva_neto:        number;
}

interface Pagination {
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

// Campos del formulario de registro
interface CfdiForm {
  type:                  'emitida' | 'recibida';
  rfc_emisor:            string;
  rfc_receptor:          string;
  razon_social_emisor:   string;
  razon_social_receptor: string;
  folio_fiscal:          string;
  serie:                 string;
  folio:                 string;
  fecha:                 string;
  subtotal:              string;
  descuento:             string;
  iva:                   string;
  total:                 string;
  moneda:                string;
  uso_cfdi:              string;
  metodo_pago:           string;
  forma_pago:            string;
  concepto:              string;
  status:                'vigente' | 'cancelado';
}

const FORM_INICIAL: CfdiForm = {
  type:                  'emitida',
  rfc_emisor:            '',
  rfc_receptor:          '',
  razon_social_emisor:   '',
  razon_social_receptor: '',
  folio_fiscal:          '',
  serie:                 '',
  folio:                 '',
  fecha:                 new Date().toISOString().slice(0, 16),
  subtotal:              '',
  descuento:             '0',
  iva:                   '',
  total:                 '',
  moneda:                'MXN',
  uso_cfdi:              'G03',
  metodo_pago:           'PUE',
  forma_pago:            '03',
  concepto:              '',
  status:                'vigente',
};

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const USO_CFDI_OPCIONES = [
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G02', label: 'G02 — Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'I01', label: 'I01 — Construcciones' },
  { value: 'I04', label: 'I04 — Equipo de transporte' },
  { value: 'D01', label: 'D01 — Honorarios médicos' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 — Pagos' },
];

const METODO_PAGO_OPCIONES = [
  { value: 'PUE', label: 'PUE — Pago en una sola exhibición' },
  { value: 'PPD', label: 'PPD — Pago en parcialidades o diferido' },
];

const FORMA_PAGO_OPCIONES = [
  { value: '01', label: '01 — Efectivo' },
  { value: '02', label: '02 — Cheque nominativo' },
  { value: '03', label: '03 — Transferencia electrónica' },
  { value: '04', label: '04 — Tarjeta de crédito' },
  { value: '28', label: '28 — Tarjeta de débito' },
  { value: '99', label: '99 — Por definir' },
];

const fmt = (n: number | string | null | undefined) => {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

const fmtFecha = (f: string | null) => {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-MX', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CfdiViewerProps {
  // tenantId no se usa aquí — la API lo extrae del token de sesión
  tenantId?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CfdiViewer(_props: CfdiViewerProps) {
  const now = new Date();

  // Sub-tab activo
  const [subTab, setSubTab] = useState<'emitidas' | 'recibidas' | 'registrar'>('emitidas');

  // Filtros de lista
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());

  // Datos
  const [registros,    setRegistros]   = useState<CfdiRecord[]>([]);
  const [totales,      setTotales]     = useState<Totales | null>(null);
  const [pagination,   setPagination]  = useState<Pagination>({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading,      setLoading]     = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [canceling,    setCanceling]   = useState<string | null>(null); // id del CFDI en proceso de cancelación
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Formulario registro
  const [form, setForm] = useState<CfdiForm>(FORM_INICIAL);

  // Modal "ver detalle"
  const [detalle, setDetalle] = useState<CfdiRecord | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4500);
  };

  // ── Cargar registros ────────────────────────────────────────────────────────
  const loadRegistros = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const tipo = subTab === 'emitidas' ? 'emitidas' : 'recibidas';
      const res  = await fetch(
        `/api/cfdi?type=${tipo}&month=${filterMonth}&year=${filterYear}&page=${page}&limit=20`,
      );
      const data = await res.json();
      if (res.ok) {
        setRegistros(data.data ?? []);
        setTotales(data.totales ?? null);
        setPagination(data.pagination ?? { total: 0, page: 1, limit: 20, pages: 1 });
      }
    } catch (err) {
      console.error('[CfdiViewer] loadRegistros', err);
    } finally {
      setLoading(false);
    }
  }, [subTab, filterMonth, filterYear]);

  useEffect(() => {
    if (subTab !== 'registrar') {
      loadRegistros(1);
    }
  }, [subTab, filterMonth, filterYear, loadRegistros]);

  // ── Calcular IVA automáticamente desde subtotal ─────────────────────────────
  const handleSubtotalChange = (val: string) => {
    const sub  = parseFloat(val) || 0;
    const disc = parseFloat(form.descuento) || 0;
    const base = sub - disc;
    const iva  = +(base * 0.16).toFixed(2);
    const tot  = +(base + iva).toFixed(2);
    setForm(f => ({
      ...f,
      subtotal: val,
      iva:   iva > 0  ? String(iva)  : f.iva,
      total: tot > 0  ? String(tot)  : f.total,
    }));
  };

  // ── Guardar CFDI ────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.total || isNaN(Number(form.total))) {
      notify('error', 'El campo Total es obligatorio y debe ser numérico.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        subtotal:  form.subtotal  ? Number(form.subtotal)  : null,
        descuento: Number(form.descuento) || 0,
        iva:       form.iva       ? Number(form.iva)       : null,
        total:     Number(form.total),
        folio_fiscal: form.folio_fiscal || null,
        serie:        form.serie        || null,
        folio:        form.folio        || null,
        rfc_emisor:   form.rfc_emisor   || null,
        rfc_receptor: form.rfc_receptor || null,
        razon_social_emisor:   form.razon_social_emisor   || null,
        razon_social_receptor: form.razon_social_receptor || null,
        uso_cfdi:    form.uso_cfdi    || null,
        metodo_pago: form.metodo_pago || null,
        forma_pago:  form.forma_pago  || null,
        concepto:    form.concepto    || null,
      };

      const res = await fetch('/api/cfdi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        notify('success', 'CFDI registrado correctamente');
        setForm(FORM_INICIAL);
        setSubTab(form.type === 'emitida' ? 'emitidas' : 'recibidas');
      } else {
        notify('error', data.message ?? 'Error al registrar CFDI');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Cancelar CFDI ───────────────────────────────────────────────────────────
  const handleCancelar = async (id: string) => {
    if (!confirm('¿Marcar este CFDI como cancelado? Esta acción no se puede deshacer desde la plataforma.')) return;
    setCanceling(id);
    try {
      const res = await fetch(`/api/cfdi?id=${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'cancelado' }),
      });
      if (res.ok) {
        notify('success', 'CFDI marcado como cancelado');
        loadRegistros(pagination.page);
        if (detalle?.id === id) setDetalle(null);
      } else {
        const d = await res.json();
        notify('error', d.message ?? 'Error al cancelar');
      }
    } finally {
      setCanceling(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Banner informativo PAC */}
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-700/40 rounded-xl px-4 py-3 text-sm text-blue-300">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-400" />
        <span>
          <strong>Registro manual activo.</strong> Para sincronización automática desde el SAT,
          contacta a tu ejecutivo de cuenta para configurar la integración con tu PAC (Facturama o Finkok)
          incluida en el plan Enterprise.
        </span>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit flex-wrap">
        {(['emitidas', 'recibidas', 'registrar'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              subTab === t
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'registrar' ? '+ Registrar' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Notificación */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          notification.type === 'success'
            ? 'bg-green-900/30 border-green-700/50 text-green-300'
            : 'bg-red-900/30 border-red-700/50 text-red-300'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle  className="h-4 w-4 flex-shrink-0" />}
          {notification.msg}
        </div>
      )}

      {/* ══ LISTA: EMITIDAS / RECIBIDAS ════════════════════════════════════════ */}
      {subTab !== 'registrar' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Todos los meses</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => loadRegistros(1)}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white px-3 py-2 rounded-xl text-sm transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setSubTab('registrar')}
              className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Registrar CFDI
            </button>
          </div>

          {/* KPIs de totales */}
          {totales && (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border p-4 bg-green-500/10 border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">Total emitidas (vigentes)</span>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <p className="text-xl font-bold text-green-400">{fmt(totales.total_emitidas)}</p>
                <p className="text-xs text-slate-500 mt-1">IVA: {fmt(totales.iva_emitidas)}</p>
              </div>
              <div className="rounded-2xl border p-4 bg-orange-500/10 border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">Total recibidas (vigentes)</span>
                  <TrendingDown className="h-4 w-4 text-orange-400" />
                </div>
                <p className="text-xl font-bold text-orange-400">{fmt(totales.total_recibidas)}</p>
                <p className="text-xs text-slate-500 mt-1">IVA: {fmt(totales.iva_recibidas)}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${
                totales.saldo >= 0
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">Saldo neto</span>
                  <Receipt className="h-4 w-4 text-blue-400" />
                </div>
                <p className={`text-xl font-bold ${totales.saldo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {fmt(totales.saldo)}
                </p>
                <p className="text-xs text-slate-500 mt-1">IVA neto: {fmt(totales.iva_neto)}</p>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              <h3 className="text-white font-semibold text-sm">
                CFDIs {subTab} — {MESES[filterMonth - 1] ?? 'Todos'} {filterYear}
              </h3>
              {pagination.total > 0 && (
                <span className="ml-auto text-xs text-slate-500">
                  {pagination.total} registro{pagination.total !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 text-blue-400 animate-spin" />
              </div>
            ) : registros.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-500">
                No hay CFDIs {subTab} para este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80">
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">Fecha</th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium">
                        {subTab === 'emitidas' ? 'Receptor' : 'Emisor'}
                      </th>
                      <th className="px-4 py-3 text-left text-slate-400 font-medium hidden md:table-cell">Concepto</th>
                      <th className="px-4 py-3 text-right text-slate-400 font-medium">Total</th>
                      <th className="px-4 py-3 text-center text-slate-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-center text-slate-400 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r) => (
                      <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm">
                            {(subTab === 'emitidas' ? r.razon_social_receptor : r.razon_social_emisor) ?? '—'}
                          </div>
                          <div className="text-xs text-slate-500">
                            RFC: {(subTab === 'emitidas' ? r.rfc_receptor : r.rfc_emisor) ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell max-w-xs truncate">
                          {r.concepto ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                          {fmt(r.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.status === 'vigente'
                              ? 'bg-green-900/40 text-green-400'
                              : 'bg-red-900/40 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* Ver detalle */}
                            <button
                              onClick={() => setDetalle(r)}
                              title="Ver detalle"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>

                            {/* Ver XML */}
                            {r.xml_url && (
                              <a
                                href={r.xml_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver XML"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}

                            {/* Cancelar */}
                            {r.status === 'vigente' && (
                              <button
                                onClick={() => handleCancelar(r.id)}
                                disabled={canceling === r.id}
                                title="Cancelar CFDI"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                              >
                                {canceling === r.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <XCircle  className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700">
                <span className="text-xs text-slate-500">
                  Página {pagination.page} de {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadRegistros(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                  </button>
                  <button
                    onClick={() => loadRegistros(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors"
                  >
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ FORMULARIO DE REGISTRO ═════════════════════════════════════════════ */}
      {subTab === 'registrar' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" />
            Registrar nuevo CFDI
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Tipo y status */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de CFDI</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as 'emitida' | 'recibida' }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="emitida">Emitida (yo facturé)</option>
                  <option value="recibida">Recibida (me facturaron)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Fecha</label>
                <input
                  type="datetime-local"
                  value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Emisor */}
            <div className="border border-slate-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos del emisor</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">RFC Emisor</label>
                  <input
                    type="text"
                    value={form.rfc_emisor}
                    onChange={e => setForm(f => ({ ...f, rfc_emisor: e.target.value.toUpperCase() }))}
                    placeholder="XAXX010101000"
                    maxLength={13}
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Razón social emisor</label>
                  <input
                    type="text"
                    value={form.razon_social_emisor}
                    onChange={e => setForm(f => ({ ...f, razon_social_emisor: e.target.value }))}
                    placeholder="Empresa S.A. de C.V."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Receptor */}
            <div className="border border-slate-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos del receptor</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">RFC Receptor</label>
                  <input
                    type="text"
                    value={form.rfc_receptor}
                    onChange={e => setForm(f => ({ ...f, rfc_receptor: e.target.value.toUpperCase() }))}
                    placeholder="XAXX010101000"
                    maxLength={13}
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Razón social receptor</label>
                  <input
                    type="text"
                    value={form.razon_social_receptor}
                    onChange={e => setForm(f => ({ ...f, razon_social_receptor: e.target.value }))}
                    placeholder="Cliente S.A. de C.V."
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Folio y serie */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Folio fiscal (UUID)</label>
                <input
                  type="text"
                  value={form.folio_fiscal}
                  onChange={e => setForm(f => ({ ...f, folio_fiscal: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Serie</label>
                <input
                  type="text"
                  value={form.serie}
                  onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
                  placeholder="A"
                  maxLength={10}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Folio</label>
                <input
                  type="text"
                  value={form.folio}
                  onChange={e => setForm(f => ({ ...f, folio: e.target.value }))}
                  placeholder="0001"
                  maxLength={20}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Concepto */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Concepto</label>
              <input
                type="text"
                value={form.concepto}
                onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                placeholder="Descripción del servicio o bien"
                className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Importes */}
            <div className="border border-slate-700/50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Importes</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Subtotal</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.subtotal}
                    onChange={e => handleSubtotalChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descuento</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.descuento}
                    onChange={e => setForm(f => ({ ...f, descuento: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IVA (16%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.iva}
                    onChange={e => setForm(f => ({ ...f, iva: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Total <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.total}
                    onChange={e => setForm(f => ({ ...f, total: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Clasificación fiscal */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Uso CFDI</label>
                <select
                  value={form.uso_cfdi}
                  onChange={e => setForm(f => ({ ...f, uso_cfdi: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {USO_CFDI_OPCIONES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Método de pago</label>
                <select
                  value={form.metodo_pago}
                  onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {METODO_PAGO_OPCIONES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Forma de pago</label>
                <select
                  value={form.forma_pago}
                  onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORMA_PAGO_OPCIONES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Moneda */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Moneda</label>
                <select
                  value={form.moneda}
                  onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="USD">USD — Dólar americano</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as 'vigente' | 'cancelado' }))}
                  className="w-full bg-slate-900/60 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vigente">Vigente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Guardar CFDI
              </button>
              <button
                type="button"
                onClick={() => { setForm(FORM_INICIAL); setSubTab('emitidas'); }}
                className="px-5 py-3 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ MODAL DETALLE ══════════════════════════════════════════════════════ */}
      {detalle && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDetalle(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h4 className="text-white font-semibold">Detalle CFDI</h4>
              </div>
              <button
                onClick={() => setDetalle(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Datos */}
            {[
              { label: 'Folio fiscal',    value: detalle.folio_fiscal ?? '—' },
              { label: 'Tipo',            value: detalle.type },
              { label: 'Fecha',           value: fmtFecha(detalle.fecha) },
              { label: 'RFC Emisor',      value: detalle.rfc_emisor ?? '—' },
              { label: 'Emisor',          value: detalle.razon_social_emisor ?? '—' },
              { label: 'RFC Receptor',    value: detalle.rfc_receptor ?? '—' },
              { label: 'Receptor',        value: detalle.razon_social_receptor ?? '—' },
              { label: 'Concepto',        value: detalle.concepto ?? '—' },
              { label: 'Subtotal',        value: fmt(detalle.subtotal) },
              { label: 'Descuento',       value: fmt(detalle.descuento) },
              { label: 'IVA',             value: fmt(detalle.iva) },
              { label: 'Total',           value: fmt(detalle.total) },
              { label: 'Moneda',          value: detalle.moneda },
              { label: 'Uso CFDI',        value: detalle.uso_cfdi ?? '—' },
              { label: 'Método de pago',  value: detalle.metodo_pago ?? '—' },
              { label: 'Forma de pago',   value: detalle.forma_pago ?? '—' },
              { label: 'Status',          value: detalle.status },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm border-b border-slate-800 pb-1">
                <span className="text-slate-400">{label}</span>
                <span className={`text-right font-medium ${
                  value === 'cancelado' ? 'text-red-400' :
                  value === 'vigente'   ? 'text-green-400' :
                  'text-white'
                }`}>{value}</span>
              </div>
            ))}

            {/* Botones modal */}
            <div className="flex gap-3 pt-2">
              {detalle.xml_url && (
                <a
                  href={detalle.xml_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver XML
                </a>
              )}
              {detalle.status === 'vigente' && (
                <button
                  onClick={() => handleCancelar(detalle.id)}
                  disabled={canceling === detalle.id}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-red-400 disabled:opacity-50 transition-colors"
                >
                  {canceling === detalle.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <XCircle  className="h-3.5 w-3.5" />}
                  Cancelar CFDI
                </button>
              )}
              <button
                onClick={() => setDetalle(null)}
                className="ml-auto text-xs px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
