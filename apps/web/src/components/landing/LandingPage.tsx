'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import {
  CheckCircle2, ArrowRight, Truck, Users, Wrench, MapPin,
  BarChart3, Wallet, Shield, Zap, Star, ChevronRight,
  Car, Package, TrendingUp, Clock, ChevronDown,
  XCircle, AlertCircle, ThumbsUp
} from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { WeeklyChart } from '@/components/landing/WeeklyChart';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';

// ─── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Truck,     color: 'bg-blue-100 text-blue-600',   title: 'Control de vehículos',    desc: 'Registro completo de tu flotilla: documentos, pólizas, estado y kilometraje.' },
  { icon: Users,     color: 'bg-green-100 text-green-600',  title: 'Gestión de choferes',     desc: 'Expedientes, licencias, contratos y comisiones de cada conductor.' },
  { icon: Wallet,    color: 'bg-emerald-100 text-emerald-600', title: 'Tesorería y pagos',   desc: 'Cobros semanales, adeudos, liquidaciones y flujo de caja en tiempo real.' },
  { icon: Wrench,    color: 'bg-orange-100 text-orange-600', title: 'Mantenimiento',          desc: 'Alertas preventivas, órdenes de servicio y costos por vehículo.' },
  { icon: MapPin,    color: 'bg-cyan-100 text-cyan-600',    title: 'GPS y ubicación',         desc: 'Monitorea la ubicación de tu flotilla en tiempo real desde cualquier lugar.' },
  { icon: BarChart3, color: 'bg-purple-100 text-purple-600', title: 'Reportes inteligentes', desc: 'Dashboards con KPIs, ingresos por unidad y exportación PDF/Excel.' },
];

const STEPS = [
  { num: '01', title: 'Crea tu cuenta gratis', desc: 'Regístrate en 2 minutos. Sin tarjeta, sin contratos. 14 días de prueba incluidos.' },
  { num: '02', title: 'Agrega tu flotilla',    desc: 'Registra tus vehículos y choferes. Importa desde Excel o agrégalos uno a uno.' },
  { num: '03', title: 'Controla todo',         desc: 'Gestiona pagos, mantenimiento, ubicación y reportes desde un solo panel.' },
];

const TESTIMONIALS = [
  { name: 'Carlos Mendoza',   company: 'Flotilla Premier CDMX',         role: 'Dueño · 48 vehículos',        quote: 'Antes perdía horas checando quién me había pagado. Ahora lo veo en segundos. Recuperé más de $12,000 en adeudos el primer mes.', stars: 5 },
  { name: 'Ana Gutiérrez',    company: 'Transporte Gutiérrez GDL',       role: 'Administradora · 32 camiones', quote: 'El módulo de mantenimiento nos ahorró 2 talleres urgentes. Ya no llegan sorpresas, las alertas nos avisan antes.', stars: 5 },
  { name: 'Roberto Pérez',    company: 'Didi Fleet Monterrey',           role: 'Socio · 85 autos',            quote: 'Perfecto para flotillas de plataforma. Mis socios ven sus rendimientos en vivo desde el celular. Cero llamadas de "¿cuánto gané?"', stars: 5 },
  { name: 'Jorge Castellanos', company: 'Logística Express MTY',         role: 'Director · 60 unidades',      quote: 'La tesorería me salvó. Antes perdía dinero sin saber dónde. Ahora veo exactamente qué unidad genera más y cuál me cuesta.', stars: 5 },
  { name: 'Miguel Ángel Ruiz', company: 'MR Flotilla Guadalajara',       role: 'Fundador · 22 vehículos',     quote: 'Migré desde Excel en una tarde. El importador funcionó perfecto. Mis 22 unidades quedaron registradas sin errores.', stars: 5 },
  { name: 'Carlos Ibarra',    company: 'FleetMX CDMX',                   role: 'CEO · 110 vehículos',         quote: 'El GPS en tiempo real cambió todo. Sé dónde está cada unidad en segundos. Mis clientes confían más y yo duermo tranquilo.', stars: 5 },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
      {/* Background fleet image */}
      <div className="absolute inset-0">
        <Image src="/fleet-bg.png" alt="" fill className="object-cover opacity-20" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* Left — Text */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-4 py-1.5 text-xs sm:text-sm font-medium text-blue-300 mb-5">
              <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.hero.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] mb-5">
              {t.hero.h1a}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                {t.hero.h1b}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 mb-7 leading-relaxed max-w-xl">
              La única plataforma hecha para flotillas de Didi, Uber e InDriver en México. Cuentas semanales automáticas, GPS en tiempo real, cálculo de impuestos ISR/IVA y control total — sin Excel, sin WhatsApp caótico.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link href="/registro" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-2xl text-sm sm:text-base transition-colors shadow-lg shadow-blue-900/40">
                {t.hero.cta1} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="https://demo.gestionatuflotilla.com/login?email=admingeneral%40flotillapremier.mx&autoLogin=true" className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm sm:text-base transition-colors backdrop-blur-sm">
                {t.hero.cta2}
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> {t.hero.trust1}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> {t.hero.trust2}</span>
            </div>

            {/* Urgencia */}
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/30 rounded-full px-4 py-1.5 text-xs text-yellow-300 font-semibold">
              🔥 Precio de lanzamiento — Solo por tiempo limitado
            </div>
          </div>

          {/* Right — Dashboard mockup FINAL */}
          <div className="hidden lg:block relative mt-4">

            {/* Floating payment card — top right */}
            <div className="absolute -top-5 -right-5 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 w-52">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Pago recibido</p>
                <p className="text-sm font-black text-slate-900 leading-tight">+$3,200 MXN</p>
                <p className="text-[9px] text-emerald-500 font-semibold">ECO-023 · hace 2 min</p>
              </div>
            </div>

            {/* Floating maintenance alert — bottom right */}
            <div className="absolute -bottom-5 -right-5 z-20 bg-white rounded-2xl shadow-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 w-56">
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Wrench className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Mantenimiento</p>
                <p className="text-sm font-black text-slate-900 leading-tight">ECO-034 · 500 km</p>
                <p className="text-[9px] text-orange-500 font-semibold">Revisión programada</p>
              </div>
            </div>

            {/* Browser window */}
            <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/10">

              {/* Chrome bar */}
              <div className="bg-[#1e2433] px-4 py-2.5 flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 bg-[#2d3347] rounded-lg h-5 mx-2 flex items-center px-3">
                  <span className="text-[10px] text-slate-400">app.gestionatuflotilla.com/ubicacion</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/20 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  <span className="text-[9px] text-green-400 font-bold">LIVE</span>
                </div>
              </div>

              {/* Dashboard body */}
              <div className="flex" style={{ height: 400, background: '#f1f5f9' }}>

                {/* Sidebar */}
                <div className="w-12 bg-[#0f172a] flex flex-col items-center py-3 gap-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center mb-2">
                    <Truck className="h-3.5 w-3.5 text-white" />
                  </div>
                  {[BarChart3, Truck, Users, MapPin, Wallet, Wrench].map((Icon, i) => (
                    <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${i === 3 ? 'bg-blue-600' : ''}`}>
                      <Icon className={`h-3.5 w-3.5 ${i === 3 ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                  ))}
                </div>

                {/* Left panel: KPIs + chart + table */}
                <div className="flex flex-col gap-2 p-2.5" style={{ width: 230 }}>

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-slate-800">Resumen Final</div>
                      <div className="text-[8px] text-slate-400">Mar 2026</div>
                    </div>
                    <div className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">89% ocup.</div>
                  </div>

                  {/* 4 KPIs 2x2 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Vehículos', val: '48', trend: '↑ +2', color: 'from-blue-500 to-blue-700' },
                      { label: 'Ingresos sem.', val: '$74K', trend: '↑ 12%', color: 'from-emerald-500 to-teal-600' },
                      { label: 'Choferes', val: '39', trend: '3 activos', color: 'from-violet-500 to-indigo-700' },
                      { label: 'Adeudos', val: '$8.2K', trend: '↓ 5%', color: 'from-orange-500 to-red-500' },
                    ].map(k => (
                      <div key={k.label} className={`bg-gradient-to-br ${k.color} rounded-xl p-2`}>
                        <div className="text-[7px] text-white/70 font-medium">{k.label}</div>
                        <div className="text-[13px] font-black text-white">{k.val}</div>
                        <div className="text-[7px] text-white/60">{k.trend}</div>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart — interactive */}
                  <WeeklyChart />

                  {/* Mini vehicle list */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {[
                      { id: 'ECO-012', name: 'J. Ramírez', st: 'En ruta', stc: 'text-emerald-600 bg-emerald-50' },
                      { id: 'ECO-023', name: 'M. Torres',  st: 'Pagado',  stc: 'text-blue-600 bg-blue-50' },
                      { id: 'ECO-034', name: 'R. López',   st: 'En ruta', stc: 'text-emerald-600 bg-emerald-50' },
                    ].map(v => (
                      <div key={v.id} className="flex items-center justify-between px-2 py-1 border-b border-slate-50 last:border-0">
                        <div className="text-[8px] font-bold text-slate-800">{v.id}</div>
                        <div className="text-[7px] text-slate-400">{v.name}</div>
                        <div className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full ${v.stc}`}>{v.st}</div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Right panel: GPS Map — Google Maps Real */}
                <div className="flex-1 relative overflow-hidden">

                  {/* Real Google Maps iframe — CDMX Paseo de la Reforma */}
                  <iframe
                    src="https://maps.google.com/maps?q=Paseo+de+la+Reforma,Ciudad+de+Mexico&t=m&z=15&output=embed&iwloc=near"
                    className="absolute inset-0 w-full border-0"
                    style={{
                      height: '140%',
                      top: '-20%',
                      filter: 'invert(92%) hue-rotate(180deg) saturate(1.2) brightness(0.88) contrast(0.95)',
                      pointerEvents: 'none',
                    }}
                    loading="lazy"
                    title="GPS Flotilla CDMX"
                  />

                  {/* Dark vignette edges */}
                  <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(10,15,28,0.55) 100%)'}} />

                  {/* Vehicle markers overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[
                      { x: 28, y: 38, id: 'ECO-012', color: '#22c55e', pulse: true  },
                      { x: 52, y: 22, id: 'ECO-023', color: '#22c55e', pulse: false },
                      { x: 68, y: 48, id: 'ECO-034', color: '#f59e0b', pulse: false },
                      { x: 18, y: 62, id: 'ECO-045', color: '#22c55e', pulse: false },
                      { x: 74, y: 70, id: 'ECO-056', color: '#22c55e', pulse: false },
                      { x: 42, y: 72, id: 'ECO-067', color: '#ef4444', pulse: false },
                      { x: 60, y: 55, id: 'ECO-078', color: '#22c55e', pulse: false },
                      { x: 84, y: 32, id: 'ECO-089', color: '#22c55e', pulse: false },
                    ].map((v) => (
                      <div key={v.id} className="absolute" style={{ left: `${v.x}%`, top: `${v.y}%`, transform: 'translate(-50%, -50%)' }}>
                        {/* Pulse ring */}
                        {v.pulse && (
                          <div className="absolute rounded-full animate-ping" style={{ width: 28, height: 28, background: v.color, opacity: 0.35, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                        )}
                        {/* Pin icon */}
                        <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>
                          <div className="flex items-center justify-center rounded-full border-2 border-white" style={{ width: 22, height: 22, background: v.color }}>
                            <svg viewBox="0 0 16 16" width="11" height="11" fill="white">
                              <path d="M13 6c0-.5-.1-1-.3-1.4L11 3H5L3.3 4.6C3.1 5 3 5.5 3 6v1.5l-1 .5V10h1v1h2v-1h4v1h2v-1h1V8l-1-.5V6zm-8.5 2a.5.5 0 110-1 .5.5 0 010 1zm7 0a.5.5 0 110-1 .5.5 0 010 1zM4 7V6c0-.3.1-.5.2-.7L5.4 4h5.2l1.2 1.3c.1.2.2.4.2.7v1H4z"/>
                            </svg>
                          </div>
                          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${v.color}` }} />
                          <div className="mt-0.5 rounded px-1 py-px" style={{ background: 'rgba(0,0,0,0.75)' }}>
                            <span className="text-white font-bold" style={{ fontSize: 7 }}>{v.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Top status bar */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 shadow-lg" style={{ background: 'rgba(37,99,235,0.92)', backdropFilter: 'blur(8px)' }}>
                      <MapPin className="h-3 w-3 text-white" />
                      <span className="text-white font-bold" style={{ fontSize: 9 }}>GPS en tiempo real · CDMX</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 shadow-lg" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                      <span className="inline-block rounded-full animate-pulse" style={{ width: 6, height: 6, background: '#4ade80' }} />
                      <span className="font-bold" style={{ fontSize: 9, color: '#4ade80' }}>41 activos</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-3 rounded-xl px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}>
                    {[
                      { color: '#22c55e', label: 'En ruta' },
                      { color: '#f59e0b', label: 'En espera' },
                      { color: '#ef4444', label: 'Alerta' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <div className="rounded-full border border-white/40" style={{ width: 8, height: 8, background: l.color }} />
                        <span className="text-slate-300" style={{ fontSize: 7 }}>{l.label}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Pain Points ──────────────────────────────────────────────────────────────

function PainPoints() {
  const pains = [
    {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-50 border-red-100',
      title: '¿Todavía usas Excel o WhatsApp para cobrar?',
      desc: 'Cada lunes pierdes 2-3 horas buscando quién pagó, quién debe y cuánto. Un error en la hoja y pierdes el rastro de semanas.',
    },
    {
      icon: AlertCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-50 border-orange-100',
      title: '¿Sabes exactamente cuánto gana cada vehículo?',
      desc: 'Sin un sistema, hay choferes que "olvidan" pagar y unidades que generan pérdidas sin que te enteres. El dinero se escapa sin que lo veas.',
    },
    {
      icon: ThumbsUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-100',
      title: 'Con Gestiona tu Flotilla, todo cambia',
      desc: 'Dashboard en tiempo real, cobros automáticos, GPS, mantenimiento y reportes. Todo desde el celular, en menos de 5 minutos al día.',
    },
  ];

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            El problema que tiene <span className="text-red-500">el 90%</span> de los dueños de flotilla en México
          </h2>
          <p className="text-slate-500 mt-3 text-sm sm:text-base">Y la razón por la que sus ganancias nunca cuadran al final del mes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pains.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className={`rounded-2xl border p-6 ${p.bg}`}>
                <Icon className={`h-8 w-8 mb-4 ${p.color}`} />
                <h3 className="font-bold text-slate-900 text-base mb-2">{p.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Comparison strip */}
        <div className="mt-10 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2">
            <div className="bg-slate-800 p-6">
              <div className="text-red-400 font-black text-sm uppercase tracking-wider mb-4">❌ Sin el sistema</div>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {['Cobros por WhatsApp / sin registro','Adeudos sin saber a quién','Excel con fórmulas rotas','Mantenimiento olvidado','No sabes cuánto ganas por unidad','Reportes que nadie entiende'].map(i => (
                  <li key={i} className="flex items-start gap-2"><XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-600 p-6">
              <div className="text-white font-black text-sm uppercase tracking-wider mb-4">✅ Con Gestiona tu Flotilla</div>
              <ul className="space-y-2.5 text-sm text-blue-100">
                {['Cobros automáticos cada semana','Dashboard de adeudos en tiempo real','Importación desde Excel Didi Fleet','Alertas de mantenimiento preventivo','Rentabilidad por unidad al instante','Reportes PDF/Excel con 1 clic'].map(i => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-white flex-shrink-0 mt-0.5" />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { val: '63',    lbl: 'Flotillas activas en la plataforma', emoji: '🏢' },
    { val: '1,240+',lbl: 'Vehículos gestionados',              emoji: '🚗' },
    { val: '4.9/5', lbl: 'Calificación de usuarios',           emoji: '⭐' },
    { val: '24/7',  lbl: 'Soporte disponible',                 emoji: '🛡️' },
  ];
  return (
    <div className="bg-blue-600 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {stats.map(s => (
            <div key={s.lbl}>
              <div className="text-3xl font-black">{s.emoji} {s.val}</div>
              <div className="text-blue-200 text-sm mt-1">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section id="caracteristicas" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Todo en uno</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            Todo lo que necesitas para <br className="hidden sm:block" />
            gestionar tu flotilla
          </h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto">
            Desde el vehículo hasta la cobranza, todo conectado. Sin hojas de Excel, sin WhatsApp caótico.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${f.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Fleet types ──────────────────────────────────────────────────────────────

function FleetTypes() {
  return (
    <section id="flotillas" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Para toda la industria</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            Diseñado para tu tipo de flotilla
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Platform fleet */}
          <div className="rounded-3xl bg-white border border-blue-200 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                <Car className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Flotilla de Activos</h3>
                <p className="text-sm text-slate-500">Uber, Didi, InDriver, Cabify, taxis, renta de autos</p>
              </div>
            </div>
            <ul className="space-y-3">
              {['Control de cuentas semanales por chofer', 'Seguimiento de adeudos y pagos en tiempo real', 'Dashboard de rentabilidad por vehículo', 'Módulo de socios e inversionistas', 'Pipeline de reclutamiento de choferes'].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/registro" className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
              Empezar con mi flotilla de plataforma <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Transport fleet */}
          <div className="rounded-3xl bg-white border border-indigo-200 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Package className="h-7 w-7 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Flotilla de Transporte</h3>
                <p className="text-sm text-slate-500">Carga, reparto, logística, camiones</p>
              </div>
            </div>
            <ul className="space-y-3">
              {['Control de kilometraje y combustible', 'Mantenimiento preventivo por unidad', 'Órdenes de servicio mecánico', 'Reportes de costos operativos', 'Incidencias y siniestros documentados'].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/registro" className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Empezar con mi flotilla de transporte <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Inicio rápido</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            En funcionamiento en menos de 30 minutos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line on desktop */}
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-blue-200" />
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-black mb-6 shadow-lg shadow-blue-200 relative z-10">
                {step.num}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/registro" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-lg shadow-blue-200">
            Crear mi cuenta gratis <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-sm text-slate-400 mt-3">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Testimonios</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="border-t border-slate-100 pt-4">
                <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                <p className="text-xs text-blue-600 font-medium">{t.company}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: '¿Necesito tarjeta de crédito para empezar?',
    a: 'No necesitas nada. 14 días gratis, sin tarjeta, sin compromisos.\n\nSi después decides quedarte, elige el plan que más se ajuste a tu flotilla. Si no te convence, no te cobramos nada.\n\nEmpezar hoy no te cuesta ni un peso.',
  },
  {
    q: '¿Funciona para cualquier flotilla o solo para Didi y Uber?',
    a: 'Funciona para cualquier flotilla de México — sin importar la plataforma.\n\nDidi, Uber, InDriver, Cabify, taxis privados, reparto, logística, renta de autos, transporte de personal. Si tienes vehículos y choferes que necesitan control, esta app es para ti.\n\nNo importa si tus choferes trabajan en plataformas o en esquema propio.',
  },
  {
    q: '¿Cómo importo las cuentas semanales de Didi?',
    a: 'Subes el Excel que Didi Fleet genera cada semana y el sistema lo procesa solo — sin errores, sin captura manual.\n\nEn menos de 2 minutos tienes las cuentas de todos tus choferes cargadas, calculadas y listas.\n\nLa conexión directa con las APIs de Didi y Uber ya está en desarrollo y llega en 2026.',
  },
  {
    q: '¿Puedo calcular y pagar mis impuestos desde la app?',
    a: 'Sí. La app calcula automáticamente tu ISR e IVA cada mes — tú solo pones tus ingresos.\n\nVes exactamente cuánto debes, cuándo pagarlo y cómo queda tu neto después de impuestos. Funciona para RESICO y para choferes de Didi/Uber en régimen de plataformas tecnológicas.\n\nCon esos números en mano, pagas directo en el portal del SAT en minutos. Sin errores, sin adivinar, sin depender de nadie.',
  },
  {
    q: '¿Puedo migrar mis datos desde Excel?',
    a: 'Sí, y es más fácil de lo que crees.\n\nSube tu archivo Excel y el sistema importa vehículos y choferes en minutos. Validamos los datos antes de guardar para que no haya errores.\n\nDeja de vivir en hojas de cálculo hoy mismo.',
  },
  {
    q: '¿Qué pasa si mi flotilla crece y necesito más vehículos?',
    a: 'Cambias de plan en segundos, desde tu configuración, sin penalizaciones y sin hablar con nadie.\n\nEl cambio es inmediato. Solo pagas la diferencia del mes en curso.\n\nTu flotilla crece — tu plan crece con ella.',
  },
  {
    q: '¿Los datos de mi flotilla están seguros?',
    a: 'Sí. Cifrado SSL, servidores en la nube con 99.9% de disponibilidad y respaldos automáticos todos los días.\n\nTus datos son tuyos y solo tuyos. No los compartimos, no los vendemos, no los usamos para nada más que darte el servicio.\n\nPuedes exportarlos cuando quieras.',
  },
];

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Preguntas frecuentes</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
            ¿Tienes dudas? Las respondemos
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                aria-expanded={open === i}
              >
                <span className="font-bold text-slate-900 text-sm sm:text-base">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-blue-500 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Básico',
    price: '$499',
    priceOld: '$699',
    desc: 'Para arrancar con control desde el día 1',
    vehicles: 'Hasta 15 vehículos',
    features: [
      'Control de vehículos y choferes',
      'Cuentas semanales automáticas',
      'Cobros pendientes y adeudos',
      'Reportes PDF/Excel básicos',
      'Soporte por email',
    ],
    popular: false,
    color: 'border-slate-200',
    btnClass: 'bg-slate-800 hover:bg-slate-700 text-white',
  },
  {
    name: 'Pro',
    price: '$999',
    priceOld: '$1,499',
    desc: 'El favorito — lo que necesita el 90% de las flotillas',
    vehicles: 'Hasta 50 vehículos',
    features: [
      'Todo lo del plan Básico',
      'GPS en tiempo real (TrackSolid)',
      'Cálculo ISR/IVA RESICO automático',
      'Importación desde Excel Didi Fleet',
      'Módulo de socios e inversionistas',
      'WhatsApp automático de cobros',
    ],
    popular: true,
    color: 'border-blue-500',
    btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-200',
  },
  {
    name: 'Enterprise',
    price: '$1,999',
    priceOld: '$2,999',
    desc: 'Para flotas grandes y operaciones multi-sucursal',
    vehicles: 'Vehículos ilimitados',
    features: [
      'Todo lo del plan Pro',
      'Multi-usuario con roles y permisos',
      'API + webhooks para integraciones',
      'Soporte prioritario 24/7',
      'Onboarding personalizado',
    ],
    popular: false,
    color: 'border-purple-300',
    btnClass: 'bg-purple-600 hover:bg-purple-500 text-white',
  },
];

function PricingSection() {
  return (
    <section id="precios" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Precios de lanzamiento</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 mb-3">
            Un plan para cada tamaño de flotilla
          </h2>
          <p className="text-slate-500 mb-1">Sin contratos. Cancela cuando quieras.</p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-1.5 text-xs font-bold text-yellow-700">
            🔥 Precios de lanzamiento — se suben pronto. Asegura el tuyo hoy.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border-2 ${plan.color} p-7 flex flex-col ${plan.popular ? 'bg-blue-50 shadow-xl' : 'bg-white'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-black px-4 py-1 rounded-full tracking-wide">
                  🏆 MÁS POPULAR
                </div>
              )}

              <div className="mb-4">
                <div className="font-black text-slate-900 text-lg">{plan.name}</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-sm font-normal text-slate-500">MXN/mes</span>
                  <span className="text-sm text-slate-400 line-through">{plan.priceOld}</span>
                </div>
                <div className="text-xs font-semibold text-blue-600 mt-1">{plan.vehicles}</div>
                <div className="text-xs text-slate-500 mt-1">{plan.desc}</div>
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/registro"
                className={`flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-2xl text-sm transition-colors ${plan.btnClass}`}
              >
                Comenzar ahora <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-xs mt-8">
          ¿Necesitas un plan personalizado?{' '}
          <a href="https://wa.me/523312933906?text=Hola,%20me%20interesa%20un%20plan%20personalizado%20para%20mi%20flotilla" className="text-blue-600 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">
            Contáctanos por WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}

// ─── WhatsApp flotante ────────────────────────────────────────────────────────

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/523312933906?text=Hola,%20me%20interesa%20Gestiona%20tu%20Flotilla,%20quisiera%20m%C3%A1s%20informaci%C3%B3n"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chatea con nosotros por WhatsApp"
      className="group fixed bottom-6 right-6 z-50"
    >
      {/* Tooltip */}
      <span className="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
        Chatea con nosotros
      </span>

      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366] opacity-30" />

      {/* Button */}
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl" style={{ backgroundColor: '#25D366' }}>
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </span>
    </a>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <Image src="/fleet-bg.png" alt="" fill className="object-cover" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          {t.cta.title}
        </h2>
        <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
          {t.cta.sub}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/registro" className="flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-4 rounded-2xl text-base transition-colors shadow-lg">
            {t.cta.cta1} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="https://demo.gestionatuflotilla.com" className="flex items-center justify-center gap-2 bg-blue-500/30 hover:bg-blue-500/50 border border-white/30 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-colors">
            {t.cta.cta2}
          </Link>
        </div>
        <p className="text-blue-300 text-sm mt-6">{t.cta.trust}</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer id="contacto" className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/fleet-icon.png" alt="Gestiona tu Flotilla" width={72} height={72} className="rounded-xl object-cover shadow-md" />
              <span className="text-white font-black">Gestiona tu Flotilla</span>
            </div>
            <p className="text-sm leading-relaxed">Plataforma de gestión vehicular inteligente para cualquier flotilla.</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Producto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#caracteristicas" className="hover:text-white transition-colors">Características</a></li>
              <li><Link href="/planes" className="hover:text-white transition-colors">Precios</Link></li>
              <li><Link href="https://demo.gestionatuflotilla.com" className="hover:text-white transition-colors">Demo en vivo</Link></li>
              <li><Link href="/registro" className="hover:text-white transition-colors">Empezar gratis</Link></li>
            </ul>
          </div>

          {/* Fleet types */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Soluciones</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#flotillas" className="hover:text-white transition-colors">Flotilla de Activos</a></li>
              <li><a href="#flotillas" className="hover:text-white transition-colors">Flotilla de Transporte</a></li>
              <li><a href="#flotillas" className="hover:text-white transition-colors">Control Financiero</a></li>
              <li><a href="#flotillas" className="hover:text-white transition-colors">GPS y Reportes</a></li>
            </ul>
          </div>

          {/* Empezar */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Empieza hoy</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/registro" className="flex items-center gap-2 hover:text-white transition-colors">
                  <ArrowRight className="h-4 w-4" /> Crear cuenta gratis
                </Link>
              </li>
              <li>
                <Link href="https://demo.gestionatuflotilla.com/login?email=admingeneral%40flotillapremier.mx&autoLogin=true" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Zap className="h-4 w-4" /> Ver demo en vivo
                </Link>
              </li>
              <li>
                <Link href="/planes" className="flex items-center gap-2 hover:text-white transition-colors">
                  <TrendingUp className="h-4 w-4" /> Ver planes y precios
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <span>© 2026 Gestiona tu Flotilla · Hecho en México 🇲🇽</span>
            <Link href="/terminos" className="text-slate-400 hover:text-white transition-colors">Términos de Servicio</Link>
            <Link href="/privacidad" className="text-slate-400 hover:text-white transition-colors">Política de Privacidad</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-400" /> Soporte 24/7</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-400" /> Respuesta rápida</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-purple-400" /> SSL seguro</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <StatsStrip />
        <Features />
        <FleetTypes />
        <HowItWorks />
        <Testimonials />
        <FAQSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppButton />
    </LanguageProvider>
  );
}
