'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  Bell,
  Smartphone,
  CreditCard,
  Check,
  ChevronRight,
  Mail,
  Phone,
  Image,
  CircleCheck,
  CircleX,
  CheckCircle2,
  Pencil,
  UserX,
  UserCheck,
  Plus,
  X,
  Loader2,
  Eye,
  EyeOff,
  Table,
  MapPin,
  Satellite,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { PaymentModal } from '@/components/ui/PaymentModal';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  passwordVisible?: string;
}

interface NewUserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}

interface EditUserForm {
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  newPassword: string;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'admin_general', label: 'Admin General' },
  { value: 'chofer',        label: 'Chofer' },
  { value: 'mecanico',      label: 'Mecánico' },
  { value: 'tesoreria',     label: 'Tesorería' },
  { value: 'socio',         label: 'Socio' },
];

const ROLES_INFO = [
  {
    value: 'admin_general',
    name: 'Admin General',
    desc: 'Acceso total al sistema: vehículos, choferes, finanzas, configuración y usuarios.',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'bg-blue-600',
  },
  {
    value: 'chofer',
    name: 'Chofer',
    desc: 'Solo ve su propio portal: vehículo asignado, ingresos semanales y documentos.',
    badge: 'bg-slate-100 text-slate-700',
    icon: 'bg-slate-600',
  },
  {
    value: 'mecanico',
    name: 'Mecánico',
    desc: 'Acceso exclusivo al módulo de órdenes de mantenimiento.',
    badge: 'bg-red-100 text-red-700',
    icon: 'bg-red-600',
  },
  {
    value: 'tesoreria',
    name: 'Tesorería',
    desc: 'Módulos financieros: cuentas semanales, ingresos y reportes.',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-600',
  },
  {
    value: 'socio',
    name: 'Socio',
    desc: 'Solo lectura del dashboard y reportes de rentabilidad.',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'bg-purple-600',
  },
];

const PLANES = [
  {
    id: 'basic',
    name: 'Básico',
    price: '$499',
    desc: 'Hasta 15 vehículos. Ideal para empezar con control desde el día 1.',
    features: ['15 vehículos', '1 usuario administrador', 'Cuentas semanales', 'Reportes básicos'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$999',
    desc: 'Hasta 50 vehículos. GPS, importación Didi Fleet, cálculo fiscal ISR/IVA.',
    features: ['50 vehículos', 'Hasta 5 usuarios', 'GPS TrackSolid', 'Importación Didi Fleet', 'ISR/IVA RESICO'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$1,999',
    desc: 'Vehículos ilimitados, usuarios ilimitados, API y soporte prioritario 24/7.',
    features: ['Vehículos ilimitados', 'Usuarios ilimitados', 'API access', 'Soporte 24/7', 'Onboarding personalizado'],
  },
];

const PLATAFORMAS_LIST = [
  { id: 'uber', label: 'Uber', abbr: 'U', bg: 'bg-slate-900' },
  { id: 'didi', label: 'Didi', abbr: 'D', bg: 'bg-orange-500' },
  { id: 'indriver', label: 'InDriver', abbr: 'iD', bg: 'bg-green-600' },
  { id: 'beat', label: 'Beat', abbr: 'B', bg: 'bg-blue-500' },
  { id: 'cabify', label: 'Cabify', abbr: 'C', bg: 'bg-violet-600' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRoleLabel(roleValue: string): string {
  return ROLE_OPTIONS.find((r) => r.value === roleValue)?.label ?? roleValue;
}

function getRoleBadge(roleValue: string): string {
  const map: Record<string, string> = {
    admin_general: 'bg-blue-100 text-blue-700',
    administrador: 'bg-indigo-100 text-indigo-700',
    tesoreria: 'bg-green-100 text-green-700',
    operaciones: 'bg-orange-100 text-orange-700',
    mecanico: 'bg-red-100 text-red-700',
    supervisor: 'bg-teal-100 text-teal-700',
    socio: 'bg-purple-100 text-purple-700',
    chofer: 'bg-slate-100 text-slate-700',
  };
  return map[roleValue] ?? 'bg-slate-100 text-slate-600';
}

function getAvatarBg(roleValue: string): string {
  const map: Record<string, string> = {
    admin_general: 'bg-blue-600',
    administrador: 'bg-indigo-600',
    tesoreria: 'bg-green-600',
    operaciones: 'bg-orange-500',
    mecanico: 'bg-red-600',
    supervisor: 'bg-teal-600',
    socio: 'bg-purple-600',
    chofer: 'bg-slate-600',
  };
  return map[roleValue] ?? 'bg-blue-600';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        on ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Celda de contraseña (reset inline) ────────────────────────────────────────

function PasswordCell({ user, onUpdate }: {
  user: ApiUser;
  onUpdate: (id: string, pwd: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [newPwd, setNewPwd]   = useState('');
  const [saving, setSaving]   = useState(false);

  const currentPwd = user.passwordVisible ?? '';

  async function handleSave() {
    if (!newPwd || newPwd.length < 6) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPwd }),
      });
      if (res.ok) {
        onUpdate(user.id, newPwd);
        setEditing(false);
        setNewPwd('');
        setVisible(true);
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newPwd}
          onChange={e => setNewPwd(e.target.value)}
          placeholder="Nueva contraseña"
          className="text-xs border border-blue-300 rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
        />
        <button onClick={handleSave} disabled={saving || newPwd.length < 6} className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40" title="Guardar">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-red-500">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-800 min-w-[80px]">
        {currentPwd ? (visible ? currentPwd : '••••••••') : <span className="text-slate-400 italic">no guardada</span>}
      </span>
      {currentPwd && (
        <button onClick={() => setVisible(v => !v)} className="p-1 text-slate-400 hover:text-slate-600">
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
      <button onClick={() => { setEditing(true); setNewPwd(currentPwd); }} className="p-1 text-blue-400 hover:text-blue-600" title="Cambiar contraseña">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  // ── Sesión ─────────────────────────────────────────────────────────────────
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentTenantId, setCurrentTenantId]   = useState<string>('');
  const [currentPlan, setCurrentPlan]           = useState<string>('');

  useEffect(() => { document.title = 'Configuración | Gestiona tu Flotilla'; }, []);

  useEffect(() => {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('gtf_user') : null;
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUserRole(parsed?.role ?? '');
        setCurrentUserEmail(parsed?.email ?? '');
        setCurrentTenantId(parsed?.tenantId ?? '');
        setCurrentPlan(parsed?.plan ?? '');
      } catch {
        setCurrentUserRole('');
      }
    }
  }, []);

  const isAdminGeneral = currentUserRole === 'admin_general';

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const allTabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
    { id: 'roles', label: 'Roles', icon: Shield, adminOnly: true },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'plataformas', label: 'Plataformas', icon: Smartphone },
    { id: 'gps', label: 'GPS y Rastreo', icon: MapPin },
    { id: 'plan', label: 'Plan', icon: CreditCard },
  ];

  const visibleTabs = allTabs.filter((t) => !t.adminOnly || isAdminGeneral);

  const [activeTab, setActiveTab] = useState('general');

  // ── Pagos ──────────────────────────────────────────────────────────────────
  const [showPayment, setShowPayment]     = useState(false);
  const [paymentPlan, setPaymentPlan]     = useState('pro');
  const [paymentNombre, setPaymentNombre] = useState('Pro');
  const [paymentPrecio, setPaymentPrecio] = useState(999);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function goToStripe(planId: string) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch('/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email: currentUserEmail, tenantId: currentTenantId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.message || 'Error al iniciar el pago. Intenta de nuevo.');
        return;
      }
      window.location.href = data.url;
    } catch {
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  function openPayment(planId: string, planNombre: string, precio: number) {
    setPaymentPlan(planId);
    setPaymentNombre(planNombre);
    setPaymentPrecio(precio);
    setShowPayment(true);
  }

  // ── Branding ───────────────────────────────────────────────────────────────
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    whatsapp: true,
    email: true,
    push: false,
    sms: false,
  });

  function toggleNotif(key: keyof typeof notifs) {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Plataformas ────────────────────────────────────────────────────────────
  const [plataformas, setPlataformas] = useState<Record<string, boolean>>({
    uber: true,
    didi: true,
    indriver: false,
    beat: false,
    cabify: false,
  });

  function togglePlataforma(key: string) {
    setPlataformas((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── GPS ────────────────────────────────────────────────────────────────────
  const [gpsProvider, setGpsProvider] = useState<'none' | 'tracksolid' | 'baanool' | 'manual'>('none');
  const [gpsAppKey, setGpsAppKey]     = useState('');
  const [gpsAppSecret, setGpsAppSecret] = useState('');
  const [gpsFlespiToken, setGpsFlespiToken] = useState('');
  const [showGpsSecret, setShowGpsSecret]   = useState(false);
  const [showFlespiToken, setShowFlespiToken] = useState(false);
  const [gpsTestStatus, setGpsTestStatus]   = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [gpsTestMessage, setGpsTestMessage] = useState('');
  const [gpsSaving, setGpsSaving]           = useState(false);
  const [gpsSaved, setGpsSaved]             = useState(false);
  const [gpsAppKeyConfigured, setGpsAppKeyConfigured] = useState(false);

  // IMEIs por vehículo
  interface GpsVehicle { id: string; eco: string; plates: string; imei: string; }
  const [gpsVehicles, setGpsVehicles] = useState<GpsVehicle[]>([]);
  const [gpsLoadingVehicles, setGpsLoadingVehicles] = useState(false);

  // Cargar config GPS guardada cuando se activa el tab
  useEffect(() => {
    if (activeTab !== 'gps') return;
    setGpsLoadingVehicles(true);
    fetch('/api/settings/gps')
      .then((r) => r.json())
      .then((data) => {
        if (data.gpsProvider && data.gpsProvider !== 'none') {
          setGpsProvider(data.gpsProvider as typeof gpsProvider);
        }
        if (data.appKey === '***configured***') {
          setGpsAppKeyConfigured(true);
          setGpsAppKey('');
        }
        if (Array.isArray(data.vehicles)) {
          setGpsVehicles(data.vehicles.map((v: GpsVehicle) => ({
            id:     v.id,
            eco:    v.eco,
            plates: v.plates,
            imei:   v.imei ?? '',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setGpsLoadingVehicles(false));
  }, [activeTab]);

  function updateImei(vehicleId: string, imei: string) {
    setGpsVehicles((prev) =>
      prev.map((v) => v.id === vehicleId ? { ...v, imei } : v)
    );
  }

  async function handleTestGps() {
    setGpsTestStatus('loading');
    setGpsTestMessage('');
    try {
      const res = await fetch('/api/gps/tracksolid');
      const data = await res.json();
      if (data.isDemo) {
        setGpsTestStatus('error');
        setGpsTestMessage(data.message ?? 'Credenciales no configuradas o inválidas');
      } else {
        setGpsTestStatus('ok');
        setGpsTestMessage(`Conexión exitosa — ${data.vehicles?.length ?? 0} dispositivos encontrados`);
      }
    } catch (err) {
      setGpsTestStatus('error');
      setGpsTestMessage(err instanceof Error ? err.message : 'Error de conexión');
    }
  }

  async function handleSaveGps() {
    setGpsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        gpsProvider,
        imeis: gpsVehicles.map((v) => ({ vehicleId: v.id, imei: v.imei })),
      };
      // Solo enviar credenciales si el usuario las escribió
      if (gpsAppKey && gpsAppKey !== '***configured***') payload.appKey = gpsAppKey;
      if (gpsAppSecret) payload.appSecret = gpsAppSecret;
      if (gpsFlespiToken) payload.flespiToken = gpsFlespiToken;

      const res = await fetch('/api/settings/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setGpsSaved(true);
        if (gpsAppKey) setGpsAppKeyConfigured(true);
        setTimeout(() => setGpsSaved(false), 3000);
      }
    } catch {
      // Silencioso — mostrar feedback genérico
    } finally {
      setGpsSaving(false);
    }
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Modal nuevo usuario
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState<NewUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'chofer',
    phone: '',
  });
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Modal editar usuario
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    firstName: '',
    lastName: '',
    role: '',
    phone: '',
    newPassword: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Toggle activo/inactivo
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? data.users ?? [];
      setUsers(list.map((u: any) => ({ ...u, isActive: u.isActive ?? u.active ?? true })));
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios');
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios' && isAdminGeneral) {
      fetchUsers();
    }
  }, [activeTab, isAdminGeneral]);

  function openNewModal() {
    setNewForm({ firstName: '', lastName: '', email: '', password: '', role: 'chofer', phone: '' });
    setNewError(null);
    setShowNewPassword(false);
    setShowNewModal(true);
  }

  function closeNewModal() {
    setShowNewModal(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setNewLoading(true);
    setNewError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      await fetchUsers();
      closeNewModal();
    } catch (err: unknown) {
      setNewError(err instanceof Error ? err.message : 'No se pudo crear el usuario');
    } finally {
      setNewLoading(false);
    }
  }

  function openEditModal(user: ApiUser) {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone ?? '',
      newPassword: '',
    });
    setEditError(null);
    setShowEditPassword(false);
  }

  function closeEditModal() {
    setEditingUser(null);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const payload: Record<string, string> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role,
        phone: editForm.phone,
      };
      if (editForm.newPassword.trim()) {
        payload.password = editForm.newPassword;
      }
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      await fetchUsers();
      closeEditModal();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleToggleActive(user: ApiUser) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.isActive }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await fetchUsers();
    } catch {
      // silently fail — could add toast here
    } finally {
      setTogglingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header breadcrumbs={[{ label: 'Configuración' }]} />

      <div className="space-y-6 p-6">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500 mt-1">Administra la configuración de tu cuenta y flotilla</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: General ──────────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="p-6 space-y-6">
              {/* Info empresa */}
              <div className="border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Información de la empresa</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la empresa</label>
                    <input
                      type="text"
                      defaultValue="Flotilla Express GDL"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">RFC</label>
                    <input
                      type="text"
                      defaultValue="FEG201115ABC"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Dirección fiscal</label>
                    <input
                      type="text"
                      defaultValue="Av. Vallarta 3233, Col. Vallarta Poniente, Guadalajara, Jalisco CP 44130"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                    <input
                      type="text"
                      defaultValue="+52 33 1234 5678"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
                    <input
                      type="text"
                      defaultValue="admin@flotillaexpress.mx"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => alert('Configuración guardada')}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>

              {/* Branding */}
              <div className="border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Branding</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {/* Logo upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo de la empresa</label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo preview" className="max-h-20 mx-auto object-contain rounded" />
                      ) : (
                        <>
                          <Image className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="text-sm text-slate-500 mt-2">Arrastra tu logo aquí o haz clic para seleccionar</p>
                          <p className="text-xs text-slate-400 mt-1">PNG, JPG hasta 2MB</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Color primario */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Color primario</label>
                    <div className="flex items-center gap-4 mt-2">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-slate-200 shadow-inner"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div>
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-400 mt-1">Se usa en botones, enlaces y acentos</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setPrimaryColor(color)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            primaryColor === color
                              ? 'border-2 border-white ring-2 ring-offset-1 ring-slate-900'
                              : 'border-2 border-transparent hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {primaryColor === color && (
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Preview */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-400 mb-2">Vista previa</p>
                      <button
                        className="px-4 py-2 text-white text-sm rounded-lg font-medium transition-opacity hover:opacity-90"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Botón primario
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Usuarios ─────────────────────────────────────────────────── */}
          {activeTab === 'usuarios' && isAdminGeneral && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Usuarios del sistema</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {usersLoading ? 'Cargando...' : `${users.length} usuarios registrados`}
                  </p>
                </div>
                <button
                  onClick={openNewModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo usuario
                </button>
              </div>

              {/* Estado de carga */}
              {usersLoading && (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-sm">Cargando usuarios...</span>
                </div>
              )}

              {/* Error */}
              {usersError && !usersLoading && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                  <CircleX className="w-5 h-5 flex-shrink-0" />
                  <span>{usersError}</span>
                  <button onClick={fetchUsers} className="ml-auto text-xs font-medium underline hover:no-underline">
                    Reintentar
                  </button>
                </div>
              )}

              {/* Tabla */}
              {!usersLoading && !usersError && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Usuario</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Email</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Rol</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Contraseña</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Estado</th>
                        <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-sm text-slate-400">
                            No hay usuarios registrados.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            {/* Avatar + Nombre */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full ${getAvatarBg(user.role)} flex items-center justify-center flex-shrink-0`}
                                >
                                  <span className="text-xs font-bold text-white">
                                    {getInitials(user.firstName, user.lastName)}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-slate-900">
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                            </td>
                            {/* Email */}
                            <td className="px-5 py-3.5 text-sm text-slate-500">{user.email}</td>
                            {/* Rol badge */}
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleBadge(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            {/* Contraseña */}
                            <td className="px-5 py-3.5">
                              <PasswordCell user={user} onUpdate={(id, pwd) => setUsers(prev => prev.map(u => u.id === id ? { ...u, passwordVisible: pwd } : u))} />
                            </td>
                            {/* Estado */}
                            <td className="px-5 py-3.5">
                              {user.isActive ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                  Activo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                                  Inactivo
                                </span>
                              )}
                            </td>
                            {/* Acciones */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-2">
                                {/* Editar */}
                                <button
                                  onClick={() => openEditModal(user)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar usuario"
                                >
                                  <Pencil className="w-4 h-4 text-blue-500" />
                                </button>
                                {/* Activar / Desactivar */}
                                {togglingId === user.id ? (
                                  <span className="p-1.5">
                                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                                  </span>
                                ) : user.isActive ? (
                                  <button
                                    onClick={() => handleToggleActive(user)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Desactivar usuario"
                                  >
                                    <UserX className="w-4 h-4 text-red-500" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleActive(user)}
                                    className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Activar usuario"
                                  >
                                    <UserCheck className="w-4 h-4 text-green-500" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Roles ────────────────────────────────────────────────────── */}
          {activeTab === 'roles' && isAdminGeneral && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Roles y permisos</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Roles disponibles en el sistema (solo lectura)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {ROLES_INFO.map((rol) => (
                  <div
                    key={rol.value}
                    className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-lg ${rol.icon} flex items-center justify-center`}>
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rol.badge}`}>
                        {rol.name}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{rol.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Notificaciones ───────────────────────────────────────────── */}
          {activeTab === 'notificaciones' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Canales de notificación</h3>
                <p className="text-sm text-slate-500 mt-0.5">Elige por dónde quieres recibir alertas del sistema</p>
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {[
                  {
                    id: 'whatsapp',
                    label: 'WhatsApp',
                    desc: 'Alertas de pagos y vencimientos vía WhatsApp Business',
                    icon: Phone,
                    iconColor: 'text-green-600',
                    iconBg: 'bg-green-100',
                  },
                  {
                    id: 'email',
                    label: 'Correo electrónico',
                    desc: 'Reportes semanales y notificaciones importantes por email',
                    icon: Mail,
                    iconColor: 'text-blue-600',
                    iconBg: 'bg-blue-100',
                  },
                  {
                    id: 'push',
                    label: 'Notificaciones Push',
                    desc: 'Alertas en tiempo real en el navegador o app móvil',
                    icon: Bell,
                    iconColor: 'text-orange-600',
                    iconBg: 'bg-orange-100',
                  },
                  {
                    id: 'sms',
                    label: 'SMS',
                    desc: 'Mensajes de texto para alertas críticas de seguridad',
                    icon: Smartphone,
                    iconColor: 'text-purple-600',
                    iconBg: 'bg-purple-100',
                  },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}
                      >
                        <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <Toggle
                      on={notifs[item.id as keyof typeof notifs]}
                      onToggle={() => toggleNotif(item.id as keyof typeof notifs)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Plataformas ──────────────────────────────────────────────── */}
          {activeTab === 'plataformas' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Integraciones con plataformas</h3>
                <p className="text-sm text-slate-500 mt-0.5">Conecta tus aplicaciones de transporte para sincronizar datos</p>
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {PLATAFORMAS_LIST.map((p) => {
                  const conectado = plataformas[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg ${p.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <span className="text-xs font-bold text-white">{p.abbr}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.label}</p>
                          <p className="text-xs mt-0.5">
                            {conectado ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CircleCheck className="w-3.5 h-3.5" /> Conectado
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-400">
                                <CircleX className="w-3.5 h-3.5" /> No conectado
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePlataforma(p.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          conectado
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {conectado ? 'Desconectar' : 'Conectar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: GPS y Rastreo ────────────────────────────────────────────── */}
          {activeTab === 'gps' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">GPS y Rastreo</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Conecta tu proveedor GPS para rastreo en tiempo real
                </p>
              </div>

              {/* Proveedor */}
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Satellite className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">Proveedor GPS</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'tracksolid', label: 'Track Solid Pro', sub: 'Jimi Open API', color: 'border-blue-500 bg-blue-50' },
                    { id: 'baanool',    label: 'Baanool',          sub: 'Vía Flespi',   color: 'border-purple-500 bg-purple-50' },
                    { id: 'manual',     label: 'Manual',           sub: 'Sin GPS',      color: 'border-slate-400 bg-slate-50' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setGpsProvider(p.id as typeof gpsProvider)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        gpsProvider === p.id ? p.color : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-semibold text-slate-900 text-sm">{p.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Track Solid Pro */}
              {gpsProvider === 'tracksolid' && (
                <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Track Solid Pro — Credenciales</h4>
                  </div>
                  <p className="text-sm text-slate-500">
                    Ingresa las credenciales de tu cuenta en{' '}
                    <a href="https://us-open.tracksolidpro.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      tracksolidpro.com
                    </a>{' '}— ve a <strong>Open Platform → My Apps</strong> para obtener tu App Key y App Secret.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">App Key</label>
                      {gpsAppKeyConfigured && !gpsAppKey ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-4 py-2.5 border border-green-300 bg-green-50 rounded-lg text-sm font-mono text-green-700">
                            ✓ Configurada
                          </div>
                          <button
                            type="button"
                            onClick={() => { setGpsAppKeyConfigured(false); setGpsAppKey(''); }}
                            className="text-xs text-slate-500 hover:text-red-600 underline"
                          >Cambiar</button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={gpsAppKey}
                          onChange={(e) => setGpsAppKey(e.target.value)}
                          placeholder="Tu App Key de Jimi Open API"
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">App Secret</label>
                      <div className="relative">
                        <input
                          type={showGpsSecret ? 'text' : 'password'}
                          value={gpsAppSecret}
                          onChange={(e) => setGpsAppSecret(e.target.value)}
                          placeholder="Tu App Secret (déjalo vacío para no cambiar)"
                          className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGpsSecret((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showGpsSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestGps}
                      disabled={gpsTestStatus === 'loading'}
                      className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-700 bg-blue-50 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-60"
                    >
                      {gpsTestStatus === 'loading' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wifi className="w-4 h-4" />
                      )}
                      Probar conexión
                    </button>
                    {gpsTestStatus === 'ok' && (
                      <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                        <CircleCheck className="w-4 h-4" /> {gpsTestMessage}
                      </span>
                    )}
                    {gpsTestStatus === 'error' && (
                      <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                        <WifiOff className="w-4 h-4" /> {gpsTestMessage}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── IMEIs por vehículo (siempre visible si hay provider) ─────── */}
              {gpsProvider !== 'none' && gpsProvider !== 'manual' && (
                <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Satellite className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-slate-900">IMEIs de dispositivos GPS</h4>
                    </div>
                    <span className="text-xs text-slate-500">
                      {gpsVehicles.filter(v => v.imei).length}/{gpsVehicles.length} configurados
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    El IMEI es el número de 15 dígitos del dispositivo GPS instalado en cada vehículo.
                    Encuéntralo en la caja del dispositivo o en la plataforma TrackSolid Pro → Devices.
                  </p>

                  {gpsLoadingVehicles ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando vehículos...
                    </div>
                  ) : gpsVehicles.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center">
                      No hay vehículos registrados aún.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">ECO / Placas</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">IMEI del GPS</th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 w-24">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {gpsVehicles.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5">
                                <p className="font-semibold text-slate-900">{v.eco}</p>
                                <p className="text-xs text-slate-400">{v.plates}</p>
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={v.imei}
                                  onChange={(e) => updateImei(v.id, e.target.value)}
                                  placeholder="Ej: 861234567890123"
                                  maxLength={17}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {v.imei ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                    <CircleCheck className="w-3 h-3" /> Listo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Baanool */}
              {gpsProvider === 'baanool' && (
                <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-slate-900">Baanool — Vía Flespi</h4>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <p className="font-semibold mb-1">Instrucciones de configuración:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Crea una cuenta en <a href="https://flespi.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">flespi.io</a></li>
                      <li>En Flespi, ve a <strong>Channels → Create channel</strong> y selecciona protocolo Baanool</li>
                      <li>Registra los IMEIs de tus dispositivos Baanool en Flespi</li>
                      <li>Ve a <strong>Tokens</strong> y crea un token de acceso</li>
                      <li>Pega el token aquí y guarda</li>
                    </ol>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Token de Flespi</label>
                    <div className="relative">
                      <input
                        type={showFlespiToken ? 'text' : 'password'}
                        value={gpsFlespiToken}
                        onChange={(e) => setGpsFlespiToken(e.target.value)}
                        placeholder="FlespiToken xxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFlespiToken((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showFlespiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual */}
              {gpsProvider === 'manual' && (
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <h4 className="font-semibold text-slate-900">Sin rastreo GPS</h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        Las ubicaciones se actualizarán manualmente. Puedes configurar un proveedor GPS en cualquier momento.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón guardar */}
              {gpsProvider !== 'none' && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveGps}
                    disabled={gpsSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {gpsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {gpsSaved ? (
                      <><CircleCheck className="w-4 h-4" /> Configuración guardada</>
                    ) : gpsSaving ? 'Guardando...' : 'Guardar configuración GPS'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Plan ─────────────────────────────────────────────────────── */}
          {activeTab === 'plan' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Elige tu plan</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Plan actual: <span className="font-semibold text-blue-600">Profesional</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-5">
                {PLANES.map((plan) => {
                  const isCurrent = plan.id === currentPlan;
                  return (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-2xl p-6 transition-shadow hover:shadow-lg ${
                        isCurrent ? 'border-blue-600 shadow-md' : 'border-slate-200'
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                          Recomendado
                        </span>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                        {isCurrent && (
                          <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                            <Check className="w-3.5 h-3.5" strokeWidth={3} /> Actual
                          </span>
                        )}
                      </div>
                      <div className="mb-3">
                        <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                        <span className="text-sm text-slate-400"> MXN/mes</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{plan.desc}</p>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" strokeWidth={3} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => !isCurrent && goToStripe(plan.id)}
                        disabled={checkoutLoading === plan.id}
                        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          isCurrent
                            ? 'bg-blue-50 text-blue-600 cursor-default'
                            : 'bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60'
                        }`}
                      >
                        {checkoutLoading === plan.id
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</>
                          : isCurrent ? 'Plan actual' : 'Suscribirse →'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Resumen suscripción actual */}
              <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50">
                <div className="flex items-end gap-8">
                  <div>
                    <span className="text-xs text-slate-400">Límite de vehículos</span>
                    <p className="text-lg font-semibold text-slate-900">50 vehículos</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">En uso</span>
                    <p className="text-lg font-semibold text-slate-900">18 vehículos</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Próximo cobro</span>
                    <p className="text-lg font-semibold text-slate-900">01 Abr 2026</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Monto mensual</span>
                    <p className="text-lg font-semibold text-slate-900">$1,999 MXN</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Uso de vehículos</span>
                    <span>18 / 50</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '36%' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick view cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Usuarios — solo visible para admin_general */}
          {isAdminGeneral && (
            <div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('usuarios')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Usuarios</h3>
                    <p className="text-xs text-slate-400">Gestión de accesos</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{users.length}</span>
                <span className="text-sm text-slate-500">usuarios registrados</span>
              </div>
              {users.length > 0 && (
                <div className="mt-3 flex -space-x-2">
                  {users.slice(0, 8).map((u) => (
                    <div
                      key={u.id}
                      className={`w-7 h-7 rounded-full ${getAvatarBg(u.role)} border-2 border-white flex items-center justify-center`}
                    >
                      <span className="text-[9px] font-bold text-white">
                        {getInitials(u.firstName, u.lastName)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roles — solo visible para admin_general */}
          {isAdminGeneral && (
            <div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('roles')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Roles</h3>
                    <p className="text-xs text-slate-400">Permisos del sistema</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-2xl font-bold text-purple-600">{ROLES_INFO.length}</span>
                <span className="text-sm text-slate-500">roles configurados</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ROLES_INFO.slice(0, 4).map((rol) => (
                  <span key={rol.value} className={`text-xs px-2 py-0.5 rounded-full font-medium ${rol.badge}`}>
                    {rol.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notificaciones */}
          <div
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveTab('notificaciones')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                  <p className="text-xs text-slate-400">Canales de aviso</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-slate-700">WhatsApp</span>
                </div>
                {notifs.whatsapp ? (
                  <CircleCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <CircleX className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-slate-700">Email</span>
                </div>
                {notifs.email ? (
                  <CircleCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <CircleX className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">Push</span>
                </div>
                {notifs.push ? (
                  <CircleCheck className="w-5 h-5 text-green-500" />
                ) : (
                  <CircleX className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          {/* Plataformas */}
          <div
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveTab('plataformas')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Plataformas</h3>
                  <p className="text-xs text-slate-400">Integraciones activas</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-4 space-y-2.5">
              {PLATAFORMAS_LIST.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded ${p.bg} flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-white">{p.abbr}</span>
                    </div>
                    <span className="text-sm text-slate-700">{p.label}</span>
                  </div>
                  {plataformas[p.id] ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <CircleCheck className="w-4 h-4" /> Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <CircleX className="w-4 h-4" /> No conectado
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Plan */}
          <div
            className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveTab('plan')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Plan actual</h3>
                  <p className="text-xs text-slate-400">Suscripción y límites</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('plan');
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Cambiar plan
              </button>
            </div>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <span className="text-xs text-slate-400">Plan</span>
                <p className="text-xl font-bold text-indigo-600">Plan Profesional</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Límite de vehículos</span>
                <p className="text-lg font-semibold text-slate-900">50 vehículos</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">En uso</span>
                <p className="text-lg font-semibold text-slate-900">18 vehículos</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Próximo cobro</span>
                <p className="text-lg font-semibold text-slate-900">01 Abr 2026</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Monto mensual</span>
                <p className="text-lg font-semibold text-slate-900">$1,999 MXN</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Uso de vehículos</span>
                <span>18 / 50</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '36%' }} />
              </div>
            </div>
          </div>

          {/* Importar desde Excel */}
          <Link
            href="/configuracion/importar"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Table className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Importar desde Excel</h3>
                  <p className="text-xs text-slate-400">Carga masiva de datos</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="mt-4 space-y-1.5">
              <p className="text-sm text-slate-500">Importa vehículos y choferes desde archivos .xlsx.</p>
              <p className="text-xs text-emerald-600 font-medium">Descarga plantillas y sube tu archivo</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Modal: Nuevo usuario ────────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Nuevo usuario</h2>
              </div>
              <button
                onClick={closeNewModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {newError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <CircleX className="w-4 h-4 flex-shrink-0" />
                  {newError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newForm.firstName}
                    onChange={(e) => setNewForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newForm.lastName}
                    onChange={(e) => setNewForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newForm.email}
                    onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="usuario@empresa.mx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newForm.password}
                    onChange={(e) => setNewForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newForm.role}
                    onChange={(e) => setNewForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={newForm.phone}
                      onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+52 33 0000 0000"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeNewModal}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {newLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {newLoading ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar usuario ───────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${getAvatarBg(editingUser.role)} flex items-center justify-center`}
                >
                  <span className="text-sm font-bold text-white">
                    {getInitials(editingUser.firstName, editingUser.lastName)}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {editingUser.firstName} {editingUser.lastName}
                  </h2>
                  <p className="text-xs text-slate-400">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {editError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <CircleX className="w-4 h-4 flex-shrink-0" />
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+52 33 0000 0000"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nueva contraseña
                  <span className="text-xs font-normal text-slate-400 ml-1">(dejar vacío para no cambiar)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nueva contraseña opcional"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PaymentModal global ──────────────────────────────────────────────── */}
      {showPayment && (
        <PaymentModal
          plan={paymentPlan}
          planNombre={paymentNombre}
          precio={paymentPrecio}
          email={currentUserEmail}
          tenantId={currentTenantId}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
}
