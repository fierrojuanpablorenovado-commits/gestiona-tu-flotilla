'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantStat {
  id: string;
  empresa: string;
  nombre: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  status: string;
  diasTrial: number | null;
  trialEndsAt: string | null;
  mrr: number;
  mrrPotencial: number;
  usoActivo: boolean;
  createdAt: string;
  remindersSent?: string[];
  vehiculosActivos?: number;
  vehiculosTotal?: number;
  maxVehicles?: number;
  choferes?: number;
  cuentasTotal?: number;
  leads?: number;
  clientes?: number;
  actividades?: number;
  cotizaciones?: number;
  recursos?: { dbEstimadoKb: number; registrosTotal: number };
}

interface ProjectStats {
  proyecto: string;
  url: string;
  generado: string;
  resumen: {
    totalTenants: number;
    mrrEstimado: number;
    mrrPotencial: number;
    enTrial: number;
    porVencer: number;
  };
  alertas: { urgentes: TenantStat[]; sinActividad: TenantStat[] };
  tenants: TenantStat[];
}

interface ResourceDetail {
  rows: Record<string, number>;
  totalRows: number;
  storage: { estimadoKb: number; estimadoMb: number; costoUSD: number; nota: string };
}

interface JpProject {
  id: string;
  nombre: string;
  descripcion: string | null;
  url: string | null;
  categoria: string;
  estado: string;
  mrr: number;
  clientes: number;
  lanzamiento: string | null;
  api_stats_url: string | null;
  notas: string | null;
  tags: string[] | null;
  updated_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ADMIN_SECRET = 'gtf-admin-secret';

const LIVE_PROJECTS = [
  { key: 'gtf',    label: 'GTF',       url: '/api/admin/super-stats',  color: 'blue'   },
  { key: 'cierra', label: 'Cierra CRM', url: 'https://avisa-fierrojuanpablorenovado-7774s-projects.vercel.app/api/admin/super-stats', color: 'violet' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  activo:      { label: 'Activo',       color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  en_trial:    { label: 'En trial',     color: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500'  },
  por_vencer:  { label: '⚠ Por vencer', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  vencido_hoy: { label: '🔴 Vence hoy', color: 'bg-red-100 text-red-800',     dot: 'bg-red-500'   },
  vencido:     { label: 'Vencido',      color: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400'  },
};

const PLAN_LABELS: Record<string, string> = {
  basic: 'Starter', pro: 'Pro', enterprise: 'Enterprise', trial: 'Trial', empresa: 'Empresa',
};

const CATEGORIA_ICON: Record<string, string> = {
  saas: '⚙️', landing: '🌐', herramienta: '🔧', bot: '🤖', academia: '🎓',
};

const ESTADO_COLOR: Record<string, string> = {
  produccion: 'bg-green-900/50 text-green-400 border border-green-800/50',
  desarrollo: 'bg-blue-900/50 text-blue-400 border border-blue-800/50',
  pausado:    'bg-amber-900/50 text-amber-400 border border-amber-800/50',
  descontinuado: 'bg-red-900/50 text-red-400 border border-red-800/50',
};

const fmt = (n: number) => `$${n.toLocaleString('es-MX')}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  // Vista activa: 'portfolio' | 'gtf' | 'cierra'
  const [activeTab, setActiveTab] = useState<'portfolio' | 'gtf' | 'cierra'>('portfolio');

  // Portfolio
  const [jpProjects, setJpProjects]     = useState<JpProject[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [editingProject, setEditingProject]   = useState<JpProject | null>(null);
  const [editForm, setEditForm]               = useState({ mrr: '', clientes: '', notas: '', estado: '' });
  const [savingEdit, setSavingEdit]           = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState<'todos' | 'saas' | 'landing' | 'herramienta' | 'bot' | 'academia'>('todos');

  // Tenant stats
  const [stats, setStats]           = useState<Record<string, ProjectStats | null>>({});
  const [loading, setLoading]       = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'urgentes' | 'en_trial' | 'vencidos'>('todos');
  const [sending, setSending]       = useState<string | null>(null);
  const [sent, setSent]             = useState<Record<string, boolean>>({});
  const [resources, setResources]   = useState<Record<string, ResourceDetail>>({});
  const [loadingRes, setLoadingRes] = useState<string | null>(null);

  // Modal crear tenant
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ empresa: '', nombre: '', email: '', password: '', plan: 'basic', telefono: '', diasTrial: '14' });
  const [creating, setCreating]     = useState(false);
  const [createMsg, setCreateMsg]   = useState('');

  // Modal eliminar tenant
  const [deleteTarget, setDeleteTarget] = useState<TenantStat | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting]     = useState(false);

  // ── Carga portfolio ──────────────────────────────────────────────────────
  const loadPortfolio = useCallback(async () => {
    setLoadingPortfolio(true);
    try {
      const res = await fetch('/api/admin/projects', { headers: { 'x-admin-secret': ADMIN_SECRET } });
      if (res.ok) setJpProjects(await res.json() as JpProject[]);
    } finally { setLoadingPortfolio(false); }
  }, []);

  // ── Carga stats proyectos con API ────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoading(true);
    const results: Record<string, ProjectStats | null> = {};
    await Promise.all(
      LIVE_PROJECTS.map(async p => {
        try {
          const res = await fetch(p.url, { headers: { 'x-admin-secret': ADMIN_SECRET } });
          results[p.key] = res.ok ? await res.json() as ProjectStats : null;
        } catch { results[p.key] = null; }
      })
    );
    setStats(results);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPortfolio(); void loadStats(); }, [loadPortfolio, loadStats]);

  // ── Editar proyecto ──────────────────────────────────────────────────────
  const openEdit = (p: JpProject) => {
    setEditingProject(p);
    setEditForm({ mrr: String(p.mrr), clientes: String(p.clientes), notas: p.notas ?? '', estado: p.estado });
  };

  const saveEdit = async () => {
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({
          ...editingProject,
          mrr: Number(editForm.mrr),
          clientes: Number(editForm.clientes),
          notas: editForm.notas,
          estado: editForm.estado,
        }),
      });
      setEditingProject(null);
      await loadPortfolio();
    } finally { setSavingEdit(false); }
  };

  // ── Tenant actions ────────────────────────────────────────────────────────
  const loadResources = async (tenantId: string) => {
    setLoadingRes(tenantId);
    try {
      const res = await fetch(`/api/admin/tenant-resources?tenantId=${tenantId}`, { headers: { 'x-admin-secret': ADMIN_SECRET } });
      if (res.ok) {
        const data = await res.json() as ResourceDetail;
        setResources(prev => ({ ...prev, [tenantId]: data }));
      }
    } finally { setLoadingRes(null); }
  };

  const sendReminder = async (tenant: TenantStat) => {
    setSending(tenant.id);
    try {
      const res = await fetch('/api/admin/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ tenantId: tenant.id }),
      });
      if (res.ok) setSent(prev => ({ ...prev, [tenant.id]: true }));
    } finally { setSending(null); }
  };

  const createTenant = async () => {
    setCreating(true); setCreateMsg('');
    try {
      const res = await fetch('/api/admin/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ ...createForm, diasTrial: Number(createForm.diasTrial) }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setCreateMsg(`✅ Tenant creado: ${createForm.empresa}`);
        setShowCreate(false);
        setCreateForm({ empresa: '', nombre: '', email: '', password: '', plan: 'basic', telefono: '', diasTrial: '14' });
        await loadStats();
      } else { setCreateMsg(`❌ ${data.error ?? 'Error desconocido'}`); }
    } finally { setCreating(false); }
  };

  const deleteTenant = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-tenant', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ tenantId: deleteTarget.id, confirm: deleteConfirm }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { setDeleteTarget(null); setDeleteConfirm(''); await loadStats(); }
      else { alert(data.error ?? 'Error'); }
    } finally { setDeleting(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  // MRR consolidado: live stats + portfolio (sin duplicar GTF y Cierra)
  const liveKeys = new Set(['gtf', 'cierra-crm']);
  const portfolioMrr = jpProjects.filter(p => !liveKeys.has(p.id)).reduce((s, p) => s + p.mrr, 0);
  const liveMrr = Object.values(stats).reduce((s, p) => s + (p?.resumen.mrrEstimado ?? 0), 0);
  const globalMrr = liveMrr + portfolioMrr;
  const globalClientes = Object.values(stats).reduce((s, p) => s + (p?.resumen.totalTenants ?? 0), 0)
    + jpProjects.filter(p => !liveKeys.has(p.id)).reduce((s, p) => s + p.clientes, 0);
  const totalProjects = jpProjects.length;

  const activeProj = activeTab !== 'portfolio' ? stats[activeTab] : null;
  const activeProjCfg = LIVE_PROJECTS.find(p => p.key === activeTab);

  const filteredTenants = (activeProj?.tenants ?? []).filter(t => {
    if (activeFilter === 'urgentes') return t.diasTrial !== null && t.diasTrial <= 3 && t.diasTrial >= 0;
    if (activeFilter === 'en_trial') return t.status === 'en_trial' || t.status === 'por_vencer';
    if (activeFilter === 'vencidos') return t.status === 'vencido';
    return true;
  });

  const filteredPortfolio = jpProjects.filter(p =>
    portfolioFilter === 'todos' || p.categoria === portfolioFilter
  );

  const categoriaCounts = jpProjects.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-6 py-4 sticky top-0 bg-slate-950 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white">🧠 JP Mission Control</h1>
            <p className="text-slate-500 text-xs mt-0.5">{totalProjects} proyectos · panel unificado</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Global KPIs */}
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-green-400 font-black text-xl">{fmt(globalMrr)}</p>
                <p className="text-slate-600 text-xs">MRR total</p>
              </div>
              <div className="text-center">
                <p className="text-blue-400 font-black text-xl">{globalClientes}</p>
                <p className="text-slate-600 text-xs">Clientes</p>
              </div>
              <div className="text-center">
                <p className="text-violet-400 font-black text-xl">{totalProjects}</p>
                <p className="text-slate-600 text-xs">Proyectos</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              + Cliente GTF
            </button>
            <button
              onClick={() => { void loadPortfolio(); void loadStats(); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-3 py-2 rounded-lg"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 flex-wrap border-b border-slate-800 pb-4">
          {/* Portfolio tab */}
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'portfolio'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            🗂 Portfolio
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'portfolio' ? 'bg-violet-500' : 'bg-slate-800'}`}>
              {totalProjects}
            </span>
          </button>

          {/* Live project tabs */}
          {LIVE_PROJECTS.map(p => {
            const s = stats[p.key];
            const isActive = activeTab === p.key;
            return (
              <button
                key={p.key}
                onClick={() => { setActiveTab(p.key as 'gtf' | 'cierra'); setActiveFilter('todos'); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {p.label}
                {loading ? (
                  <span className="text-xs animate-pulse">…</span>
                ) : s ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-800'}`}>
                    {s.resumen.totalTenants}
                  </span>
                ) : (
                  <span className="text-xs text-red-400">err</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* VISTA PORTFOLIO                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'portfolio' && (
          <>
            {/* Resumen de categorías */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(categoriaCounts).map(([cat, count]) => (
                <div key={cat} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center cursor-pointer hover:border-slate-600"
                  onClick={() => setPortfolioFilter(portfolioFilter === cat ? 'todos' : cat as typeof portfolioFilter)}>
                  <p className="text-2xl">{CATEGORIA_ICON[cat] ?? '📦'}</p>
                  <p className="text-white font-bold text-lg">{count}</p>
                  <p className="text-slate-500 text-xs capitalize">{cat}</p>
                </div>
              ))}
            </div>

            {/* Filtro por categoría */}
            <div className="flex gap-2 flex-wrap">
              {(['todos', 'saas', 'landing', 'herramienta', 'bot', 'academia'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPortfolioFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                    portfolioFilter === f
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {f === 'todos' ? `Todos (${jpProjects.length})` : `${CATEGORIA_ICON[f] ?? '📦'} ${f} (${categoriaCounts[f] ?? 0})`}
                </button>
              ))}
            </div>

            {/* Grid de proyectos */}
            {loadingPortfolio ? (
              <div className="text-center py-12">
                <p className="text-slate-500 animate-pulse text-sm">Cargando portafolio…</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPortfolio.map(p => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all group">
                    {/* Header card */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-lg">{CATEGORIA_ICON[p.categoria] ?? '📦'}</span>
                          <h3 className="font-black text-white text-sm truncate">{p.nombre}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[p.estado] ?? ESTADO_COLOR.produccion}`}>
                            {p.estado}
                          </span>
                          <span className="text-slate-600 text-xs capitalize">{p.categoria}</span>
                          {p.lanzamiento && <span className="text-slate-600 text-xs">· {p.lanzamiento}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-slate-600 hover:text-slate-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                      >
                        ✏️
                      </button>
                    </div>

                    {/* Descripcion */}
                    {p.descripcion && (
                      <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{p.descripcion}</p>
                    )}

                    {/* Métricas */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-center">
                        <p className="text-green-400 font-black text-base">{fmt(p.mrr)}</p>
                        <p className="text-slate-600 text-xs">MRR</p>
                      </div>
                      <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-center">
                        <p className="text-blue-400 font-black text-base">{p.clientes}</p>
                        <p className="text-slate-600 text-xs">Clientes</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* URL */}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:text-blue-400 text-xs flex items-center gap-1 truncate"
                      >
                        🔗 {p.url.replace('https://', '')}
                      </a>
                    )}

                    {/* Notas internas */}
                    {p.notas && (
                      <p className="text-slate-600 text-xs mt-2 italic border-t border-slate-800 pt-2 line-clamp-1">{p.notas}</p>
                    )}
                  </div>
                ))}

                {/* Card "Agregar proyecto" */}
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-slate-600 hover:text-slate-400 transition-all cursor-not-allowed min-h-[200px]">
                  <span className="text-3xl">+</span>
                  <p className="text-xs font-semibold">Agregar proyecto</p>
                  <p className="text-xs opacity-60">Próximamente</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* VISTA PROYECTO CON API (GTF / Cierra)                                */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab !== 'portfolio' && (
          <>
            {activeProj ? (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Clientes',  value: activeProj.resumen.totalTenants,         sub: activeProjCfg?.label ?? '', color: 'text-white' },
                    { label: 'MRR',       value: fmt(activeProj.resumen.mrrEstimado),      sub: 'mes actual', color: 'text-green-400' },
                    { label: 'Potencial', value: fmt(activeProj.resumen.mrrPotencial),     sub: 'si todos pagan', color: 'text-blue-400' },
                    { label: 'En trial',  value: activeProj.resumen.enTrial,
                      sub: `${activeProj.resumen.porVencer} por vencer`,
                      color: activeProj.resumen.porVencer > 0 ? 'text-amber-400' : 'text-slate-400' },
                  ].map(k => (
                    <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{k.label}</p>
                      <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                      <p className="text-slate-600 text-xs mt-1">{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Alertas urgentes */}
                {activeProj.alertas.urgentes.length > 0 && (
                  <div className="bg-amber-950/60 border border-amber-700/50 rounded-xl p-4">
                    <p className="text-amber-400 font-bold text-sm mb-3">
                      ⚡ {activeProj.alertas.urgentes.length} trial(s) por vencer
                    </p>
                    <div className="space-y-2">
                      {activeProj.alertas.urgentes.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-amber-900/20 rounded-lg px-4 py-2">
                          <div>
                            <span className="font-semibold text-amber-200 text-sm">{t.empresa}</span>
                            <span className="text-amber-500 text-xs ml-2">{t.diasTrial === 0 ? '⛔ HOY' : `${t.diasTrial}d`}</span>
                            {t.phone && <span className="text-slate-500 text-xs ml-2">📱 {t.phone}</span>}
                          </div>
                          {activeTab === 'gtf' && (
                            <button
                              onClick={() => sendReminder(t)}
                              disabled={sending === t.id || sent[t.id]}
                              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                              {sent[t.id] ? '✓' : sending === t.id ? '…' : '📤 Recordar'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabla de tenants */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-white text-sm mr-auto">{activeProjCfg?.label} — Clientes</h2>
                    {(['todos', 'urgentes', 'en_trial', 'vencidos'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                          activeFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {f === 'todos' ? `Todos (${activeProj.tenants.length})` : f}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                          <th className="px-5 py-3 text-left">Empresa</th>
                          <th className="px-4 py-3 text-left">Plan</th>
                          <th className="px-4 py-3 text-left">Estado</th>
                          <th className="px-4 py-3 text-left">Actividad</th>
                          <th className="px-4 py-3 text-left">Recursos</th>
                          <th className="px-4 py-3 text-left">MRR</th>
                          <th className="px-4 py-3 text-left">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredTenants.map(t => {
                          const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.vencido;
                          const res = resources[t.id];
                          return (
                            <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-white text-sm">{t.empresa}</p>
                                {t.email && <p className="text-slate-500 text-xs">{t.email}</p>}
                                {t.phone && <p className="text-slate-600 text-xs">📱 {t.phone}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded font-semibold">
                                  {PLAN_LABELS[t.plan] ?? t.plan}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${sc.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                  {sc.label}
                                </span>
                                {t.diasTrial !== null && (
                                  <p className={`text-xs mt-1 ${t.diasTrial <= 3 && t.diasTrial >= 0 ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                                    {t.diasTrial >= 0 ? `${t.diasTrial}d restantes` : `Venció hace ${Math.abs(t.diasTrial)}d`}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs space-y-0.5">
                                {activeTab === 'gtf' ? (
                                  <>
                                    <p className={t.vehiculosActivos ? 'text-green-400' : 'text-slate-600'}>🚗 {t.vehiculosActivos ?? 0}/{t.vehiculosTotal ?? 0} veh</p>
                                    <p className={t.choferes ? 'text-blue-400' : 'text-slate-600'}>👤 {t.choferes ?? 0} choferes</p>
                                    <p className="text-slate-600">📋 {t.cuentasTotal ?? 0} cuentas</p>
                                  </>
                                ) : activeTab === 'cierra' ? (
                                  <>
                                    <p className={t.leads ? 'text-green-400' : 'text-slate-600'}>🎯 {t.leads ?? 0} leads</p>
                                    <p className={t.clientes ? 'text-blue-400' : 'text-slate-600'}>👥 {t.clientes ?? 0} clientes</p>
                                    <p className="text-slate-600">📊 {t.actividades ?? 0} actividades</p>
                                  </>
                                ) : <p className="text-slate-600">—</p>}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {res ? (
                                  <div className="space-y-0.5">
                                    <p className="text-slate-300 font-semibold">{res.totalRows.toLocaleString()} rows</p>
                                    <p className="text-slate-500">{res.storage.estimadoMb} MB est.</p>
                                    <p className="text-slate-600">${res.storage.costoUSD}/mes</p>
                                  </div>
                                ) : activeTab === 'gtf' ? (
                                  <button
                                    onClick={() => loadResources(t.id)}
                                    disabled={loadingRes === t.id}
                                    className="text-slate-500 hover:text-blue-400 text-xs underline"
                                  >
                                    {loadingRes === t.id ? '…' : 'Ver recursos'}
                                  </button>
                                ) : (
                                  <span className="text-slate-600">
                                    {t.recursos
                                      ? <>{t.recursos.registrosTotal.toLocaleString()} rows<br/>{(t.recursos.dbEstimadoKb/1024).toFixed(2)} MB</>
                                      : '—'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-green-400 font-bold text-sm">{fmt(t.mrr)}</p>
                                {t.mrr === 0 && <p className="text-slate-600 text-xs">pot: {fmt(t.mrrPotencial)}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {activeTab === 'gtf' && t.status !== 'activo' && t.status !== 'vencido' && (
                                    <button
                                      onClick={() => sendReminder(t)}
                                      disabled={sending === t.id || sent[t.id]}
                                      className="bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs px-2 py-1 rounded-lg font-semibold"
                                    >
                                      {sent[t.id] ? '✓' : '📤'}
                                    </button>
                                  )}
                                  {activeTab === 'gtf' && (
                                    <button
                                      onClick={() => { setDeleteTarget(t); setDeleteConfirm(''); }}
                                      className="bg-red-900/50 hover:bg-red-800 text-red-400 hover:text-white text-xs px-2 py-1 rounded-lg"
                                    >
                                      🗑
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredTenants.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-10 text-center text-slate-600 text-sm">Sin resultados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : loading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-slate-400 animate-pulse text-sm">Cargando datos…</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <p className="text-red-400 text-sm">Error al cargar datos. Verifica que el proyecto esté desplegado y el endpoint responda.</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Modal Editar Proyecto ──────────────────────────────────────────── */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Editar: {editingProject.nombre}</h2>
              <button onClick={() => setEditingProject(null)} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">MRR actual ($MXN/mes)</label>
                <input
                  type="number"
                  value={editForm.mrr}
                  onChange={e => setEditForm(p => ({ ...p, mrr: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">Clientes activos</label>
                <input
                  type="number"
                  value={editForm.clientes}
                  onChange={e => setEditForm(p => ({ ...p, clientes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">Estado</label>
                <select
                  value={editForm.estado}
                  onChange={e => setEditForm(p => ({ ...p, estado: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="produccion">Producción</option>
                  <option value="desarrollo">Desarrollo</option>
                  <option value="pausado">Pausado</option>
                  <option value="descontinuado">Descontinuado</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">Notas internas</label>
                <textarea
                  value={editForm.notas}
                  onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingProject(null)} className="flex-1 bg-slate-800 text-slate-400 text-sm font-semibold py-2.5 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl"
                >
                  {savingEdit ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear Tenant ─────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">+ Nuevo cliente GTF</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'empresa',  label: 'Empresa *',     type: 'text',     ph: 'Nombre de la flotilla' },
                { key: 'nombre',   label: 'Nombre admin *', type: 'text',     ph: 'Nombre completo' },
                { key: 'email',    label: 'Email *',         type: 'email',    ph: 'correo@empresa.com' },
                { key: 'password', label: 'Contraseña *',   type: 'password', ph: 'Mínimo 8 caracteres' },
                { key: 'telefono', label: 'Teléfono',        type: 'tel',      ph: '5512345678' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    value={createForm[f.key as keyof typeof createForm]}
                    onChange={e => setCreateForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={e => setCreateForm(prev => ({ ...prev, plan: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="basic">Starter — $999/mes</option>
                    <option value="pro">Pro — $1,999/mes</option>
                    <option value="enterprise">Enterprise — $2,999/mes</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide block mb-1">Días trial</label>
                  <input
                    type="number"
                    value={createForm.diasTrial}
                    onChange={e => setCreateForm(prev => ({ ...prev, diasTrial: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              {createMsg && (
                <p className={`text-sm ${createMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{createMsg}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 bg-slate-800 text-slate-400 text-sm font-semibold py-2.5 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={createTenant}
                  disabled={creating || !createForm.empresa || !createForm.email || !createForm.password}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl"
                >
                  {creating ? 'Creando…' : 'Crear cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar Tenant ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-red-400 font-bold text-lg">⚠️ Eliminar tenant</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>
            <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4 mb-4">
              <p className="text-white font-bold">{deleteTarget.empresa}</p>
              <p className="text-slate-400 text-sm">{deleteTarget.email}</p>
              <p className="text-red-400 text-sm mt-2">
                ⚠️ Elimina todos los datos: vehículos, choferes, cuentas, seguros, infracciones. <strong>No se puede deshacer.</strong>
              </p>
            </div>
            <div className="mb-4">
              <label className="text-slate-400 text-xs font-semibold block mb-2">
                Escribe <span className="text-red-400 font-bold">ELIMINAR</span> para confirmar:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="ELIMINAR"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-slate-800 text-slate-400 text-sm font-semibold py-2.5 rounded-xl">
                Cancelar
              </button>
              <button
                onClick={deleteTenant}
                disabled={deleting || deleteConfirm !== 'ELIMINAR'}
                className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl"
              >
                {deleting ? 'Eliminando…' : 'Eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
