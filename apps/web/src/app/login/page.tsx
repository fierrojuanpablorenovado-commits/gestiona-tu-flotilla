'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, ChevronDown, ChevronUp, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/roles';

// ─── Demo credentials ──────────────────────────────────────────────────────────

const DEMO_USERS: Array<{
  role: UserRole; email: string; name: string; description: string;
}> = [
  { role: 'admin_general',  email: 'admingeneral@flotillapremier.mx', name: 'Juan Pablo Fierro',  description: 'Acceso total a su empresa' },
  { role: 'administrador',  email: 'admin@flotillapremier.mx',        name: 'Sofía Ramírez',      description: 'Admin sin configuración ni billing' },
  { role: 'tesoreria',      email: 'tesoreria@flotillapremier.mx',    name: 'María González',     description: 'Módulos financieros únicamente' },
  { role: 'operaciones',    email: 'operaciones@flotillapremier.mx',  name: 'Roberto Sánchez',    description: 'Vehículos, choferes, contratos, incidencias' },
  { role: 'mecanico',       email: 'mecanico@flotillapremier.mx',     name: 'Miguel Torres',      description: 'Solo órdenes de mantenimiento' },
  { role: 'supervisor',     email: 'supervisor@flotillapremier.mx',   name: 'Luis Hernández',     description: 'Supervisión campo: ubicación y cobranza' },
  { role: 'socio',          email: 'socio@flotillapremier.mx',        name: 'Ricardo Mendoza',    description: 'Dashboard de inversión (solo lectura)' },
  { role: 'chofer',         email: 'chofer@flotillapremier.mx',       name: 'Carlos Martínez',    description: 'Portal del chofer — viajes, ganancias y documentos' },
  { role: 'super_admin',    email: 'superadmin@gestionatuflotilla.mx',name: 'Plataforma Admin',   description: 'Gestiona todos los tenants (SaaS)' },
];

// ─── Login Form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('from')       || null;
  const paramEmail   = searchParams.get('email')      || '';
  const autoLogin    = searchParams.get('autoLogin')  === 'true';
  const { login } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [remember, setRemember]         = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showDemo, setShowDemo]         = useState(false);
  const [isDemoSite, setIsDemoSite]     = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsDemoSite(host.includes('demo.') || host.includes('gestiona-flotilla-demo'));
  }, []);
  const [errors, setErrors]             = useState<{ email?: string; password?: string; general?: string }>({});

  // Pre-calentar conexión a Neon al montar la página
  useEffect(() => {
    fetch('/api/health').catch(() => {});
  }, []);

  // Al montar: recuperar solo el email guardado (nunca la contraseña)
  useEffect(() => {
    const savedEmail = localStorage.getItem('gtf_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
    localStorage.removeItem('gtf_remember_password');
  }, []);

  // Pre-llenar desde query params (demo con autoLogin)
  useEffect(() => {
    if (paramEmail) {
      setEmail(paramEmail);
      if (autoLogin) {
        setPassword('Flotilla2024');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramEmail]);

  // Auto-submit si autoLogin=true, con pequeño delay
  useEffect(() => {
    if (autoLogin && paramEmail && !autoSubmitted) {
      setAutoSubmitted(true);
      const timer = setTimeout(async () => {
        setLoading(true);
        setErrors({});
        try {
          const result = await login({ email: paramEmail, password: 'Flotilla2024' });
          window.location.href = redirectTo || result.redirectTo || '/';
        } catch (err) {
          setErrors({ general: err instanceof Error ? err.message : 'Error al iniciar sesión' });
          setLoading(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLogin, paramEmail]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'El correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Ingresa un correo válido';
    if (!password) e.password = 'La contraseña es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setErrors({});
    try {
      // Guardar o limpiar credenciales según "Recordarme"
      if (remember) {
        localStorage.setItem('gtf_remember_email', email);
      } else {
        localStorage.removeItem('gtf_remember_email');
      }
      const result = await login({ email, password, rememberMe: remember });
      window.location.href = redirectTo || result.redirectTo || '/';
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Error al iniciar sesión' });
      setLoading(false);
    }
  };

  const selectUser = (demoEmail: string) => {
    setEmail(demoEmail); setPassword('Flotilla2024');
    setShowDemo(false); setErrors({});
  };

  const isRegistered = searchParams.get('registered') === 'true';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegistered && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          ✅ <strong>¡Cuenta creada!</strong> Ingresa tu correo y contraseña para continuar.
        </div>
      )}
      {errors.general && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">Correo electrónico</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          className={`input ${errors.email ? 'border-red-500' : ''}`} disabled={loading} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="label">Contraseña</label>
        <div className="relative">
          <input id="password" type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`} disabled={loading} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Recordarme
        </label>
        <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          <KeyRound className="h-3.5 w-3.5" />
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-[15px] font-semibold">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Iniciando sesión...</> : 'Iniciar Sesión'}
      </button>

      {/* Demo access — visible siempre */}
      <div className="mt-6 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-500 text-sm mb-3">¿Quieres ver la app antes de registrarte?</p>
        <a
          href="/api/demo/access"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver demo en vivo →
        </a>
      </div>

      {/* Demo accordion — solo visible en demo.gestionatuflotilla.com */}
      {isDemoSite && <div className="border border-blue-200 rounded-xl overflow-hidden">
        <button type="button" onClick={() => setShowDemo(!showDemo)}
          className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
          <span>Cuentas demo — Contraseña: <strong>Flotilla2024</strong></span>
          {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showDemo && (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {DEMO_USERS.map(u => (
              <button key={u.email} type="button" onClick={() => selectUser(u.email)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${email === u.email ? 'bg-blue-50' : ''}`}>
                <span className={`mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{u.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>}
    </form>
  );
}

// ─── Fleet Photo Panel (panel derecho) ────────────────────────────────────────

function FleetPhotoPanel() {
  const features = [
    {
      title: 'Flotilla de Activos',
      desc: 'Uber, Didi, InDriver, taxis',
      color: 'rgba(59,130,246,0.20)',
      border: 'rgba(59,130,246,0.40)',
      icon: (
        // Car icon — Lucide style
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17H5a2 2 0 0 1-2-2V9l2-4h14l2 4v6a2 2 0 0 1-2 2z" />
          <circle cx="7.5" cy="17" r="2" />
          <circle cx="16.5" cy="17" r="2" />
          <path d="M3 9h18" />
        </svg>
      ),
    },
    {
      title: 'Flota de transporte',
      desc: 'Carga, reparto y logística',
      color: 'rgba(99,102,241,0.20)',
      border: 'rgba(99,102,241,0.40)',
      icon: (
        // Truck icon — Lucide style
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1" />
          <path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2" />
          <circle cx="18.5" cy="18.5" r="2" />
        </svg>
      ),
    },
    {
      title: 'Control financiero',
      desc: 'Ingresos y gastos por unidad',
      color: 'rgba(34,197,94,0.15)',
      border: 'rgba(34,197,94,0.35)',
      icon: (
        // Bar chart icon
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6"  y1="20" x2="6"  y2="14" />
          <line x1="2"  y1="20" x2="22" y2="20" />
        </svg>
      ),
    },
    {
      title: 'GPS tiempo real',
      desc: 'Ubicación y rutas en vivo',
      color: 'rgba(6,182,212,0.15)',
      border: 'rgba(6,182,212,0.35)',
      icon: (
        // Map pin icon
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* Imagen de flotilla personalizada */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fleet-bg.png"
        alt="Flotilla de vehículos"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          filter: 'brightness(0.55) saturate(0.85)',
        }}
      />

      {/* Overlay degradado azul oscuro */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(15,23,42,0.60) 0%, rgba(30,58,138,0.45) 50%, rgba(15,23,42,0.72) 100%)',
      }} />

      {/* Esquinas HUD */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <div key={pos} style={{
          position: 'absolute',
          width: 22, height: 22,
          top:    pos.startsWith('t') ? 20 : undefined,
          bottom: pos.startsWith('b') ? 20 : undefined,
          left:   pos.endsWith('l')   ? 20 : undefined,
          right:  pos.endsWith('r')   ? 20 : undefined,
          borderTop:    pos.startsWith('t') ? '2px solid rgba(59,130,246,0.50)' : 'none',
          borderBottom: pos.startsWith('b') ? '2px solid rgba(59,130,246,0.50)' : 'none',
          borderLeft:   pos.endsWith('l')   ? '2px solid rgba(59,130,246,0.50)' : 'none',
          borderRight:  pos.endsWith('r')   ? '2px solid rgba(59,130,246,0.50)' : 'none',
        }} />
      ))}

      {/* Contenido */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '48px 64px',
        textAlign: 'center',
      }}>

        {/* Pill badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.38)',
          borderRadius: 20, padding: '6px 16px',
          fontSize: 11.5, fontWeight: 700, color: '#93c5fd',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 22,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
          Control inteligente de flotillas
        </div>

        {/* Headline */}
        <h2 style={{
          fontSize: '2.5rem', fontWeight: 900,
          color: '#fff', lineHeight: 1.15,
          marginBottom: 14, letterSpacing: '-0.5px',
          textShadow: '0 2px 16px rgba(0,0,0,0.50)',
          maxWidth: 480,
        }}>
          Toda tu flotilla,<br />
          <span style={{ color: '#60a5fa' }}>bajo un solo control.</span>
        </h2>

        <p style={{
          color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.65,
          marginBottom: 36, maxWidth: 420,
        }}>
          Gestiona autos de plataforma, transporte y carga
          desde una sola plataforma inteligente.
        </p>

        {/* Feature cards 2×2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, width: '100%', maxWidth: 420, marginBottom: 40,
        }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '16px 18px',
              textAlign: 'left',
              backdropFilter: 'blur(12px)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: f.color, border: `1px solid ${f.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                {f.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{f.title}</p>
              <p style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.4 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center' }}>
          {[
            { val: '5+',    lbl: 'Empresas' },
            { val: '35+',   lbl: 'Vehículos' },
            { val: '99.9%', lbl: 'Disponibilidad' },
          ].map(s => (
            <div key={s.lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.lbl}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <>
    <div className="min-h-screen flex" style={{ minHeight: '100svh' }}>

      {/* ── Panel izquierdo ── */}
      <div className="flex-1 lg:flex-none lg:w-[480px] flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center gap-4 mb-7">
            <div style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.30)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fleet-icon.png"
                alt="Gestiona tu Flotilla"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.5)',
                  transformOrigin: 'center',
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Gestiona tu Flotilla</h1>
              <p className="text-xs text-slate-500 mt-0.5">Gestión vehicular inteligente para cualquier flotilla</p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { label: 'Flotilla de Activos',   cls: 'bg-green-50 border-green-200 text-green-700' },
              { label: 'Flota de transporte',   cls: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Control financiero',    cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
              { label: 'Reportes y análisis',   cls: 'bg-violet-50 border-violet-200 text-violet-700' },
            ].map(b => (
              <span key={b.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${b.cls}`}>
                <CheckCircle2 className="h-3 w-3" />{b.label}
              </span>
            ))}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa tus credenciales para acceder al panel de control</p>

          <Suspense fallback={
            <div className="space-y-4">
              <div className="animate-pulse bg-slate-100 rounded-lg h-16" />
              <div className="animate-pulse bg-slate-100 rounded-lg h-16" />
              <div className="animate-pulse bg-blue-200 rounded-lg h-12" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          {/* Footer */}
          <div className="mt-6 space-y-3">
            <a href="/registro" className="block w-full text-center py-3 px-4 rounded-xl border-2 border-blue-200 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors">
              Crear cuenta nueva →
            </a>
            <div className="text-center space-y-1">
              <p className="text-xs text-slate-400">Gestiona tu Flotilla v2.0 · noreply@gestionatuflotilla.com</p>
              <p className="text-xs text-slate-500">
                <a href="/planes" className="text-blue-600 font-medium hover:underline">Ver planes y precios</a>
                {' · '}
                <a href="/registro" className="text-blue-600 font-medium hover:underline">Crear cuenta</a>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Panel derecho — foto real de flotilla ── */}
      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <FleetPhotoPanel />
      </div>

    </div>
    </>
  );
}
