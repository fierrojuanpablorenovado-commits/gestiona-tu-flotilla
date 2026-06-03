'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import {
  motion, useInView, AnimatePresence, useReducedMotion,
  useMotionValue, useTransform, useSpring, useScroll,
} from 'framer-motion';

// ─── i18n — ES / EN ────────────────────────────────────────────────────────────
type Lang = 'es' | 'en';

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'es', setLang: () => {},
});
const useLang = () => useContext(LangCtx);

// Diccionario: cada cadena es [es, en]. tr(lang, par) devuelve el idioma correcto.
function tx(lang: Lang, es: string, en: string) { return lang === 'en' ? en : es; }

// ─── MOTION PRIMITIVES ─────────────────────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;
const DUR  = 0.65;
const VP   = { once: true, margin: '-60px' } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 48, scale: 0.97, filter: 'blur(8px)' },
  show:   { opacity: 1, y: 0,  scale: 1,    filter: 'blur(0px)',
            transition: { duration: DUR, ease: EASE } },
};
const fadeIn = {
  hidden: { opacity: 0, scale: 0.97, filter: 'blur(6px)' },
  show:   { opacity: 1, scale: 1,    filter: 'blur(0px)',
            transition: { duration: DUR, ease: EASE } },
};
const slideLeft = {
  hidden: { opacity: 0, x: -64, scale: 0.97, filter: 'blur(6px)' },
  show:   { opacity: 1, x: 0,   scale: 1,    filter: 'blur(0px)',
            transition: { duration: 0.75, ease: EASE } },
};
const slideRight = {
  hidden: { opacity: 0, x: 64,  scale: 0.97, filter: 'blur(6px)' },
  show:   { opacity: 1, x: 0,   scale: 1,    filter: 'blur(0px)',
            transition: { duration: 0.75, ease: EASE } },
};
const stagger     = { hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } } };
const staggerFast = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

// ─── FIXED PARTICLE POSITIONS (hydration-safe) ────────────────────────────────
const HERO_PARTICLES = [
  { x: '8%',  y: '18%', dur: 4.2, delay: 0,   s: 2 },
  { x: '18%', y: '72%', dur: 3.8, delay: 0.8, s: 3 },
  { x: '30%', y: '35%', dur: 5.1, delay: 1.5, s: 2 },
  { x: '45%', y: '82%', dur: 3.3, delay: 0.3, s: 2 },
  { x: '52%', y: '12%', dur: 4.7, delay: 2.1, s: 3 },
  { x: '62%', y: '55%', dur: 3.9, delay: 1.1, s: 2 },
  { x: '72%', y: '25%', dur: 5.5, delay: 0.6, s: 2 },
  { x: '82%', y: '68%', dur: 4.1, delay: 1.8, s: 3 },
  { x: '90%', y: '40%', dur: 3.6, delay: 2.5, s: 2 },
  { x: '14%', y: '48%', dur: 4.8, delay: 1.3, s: 2 },
  { x: '25%', y: '88%', dur: 3.7, delay: 0.2, s: 3 },
  { x: '38%', y: '60%', dur: 4.4, delay: 1.9, s: 2 },
] as const;

// ─── LIVE TICKER EVENTS ───────────────────────────────────────────────────────
const TICKER_EVENTS_ES = [
  '🔔 Unidad 01 — Infracción $587 detectada · hace 2 min',
  '✅ Unidad 02 — Cuenta semanal enviada $2,884 · hace 5 min',
  '📍 Unidad 03 — En movimiento · 78 km/h · hace 1 min',
  '💰 Unidad 04 — Pago confirmado $2,327 · hace 8 min',
  '⚙️ Sistema generó 8 cuentas automáticamente · Lunes 7:00am',
  '🛡️ Unidad 05 — Seguro activo verificado · vigente hasta 2027',
  '📊 Reporte semanal enviado por WhatsApp · 7:12am',
  '⚠️ Unidad 06 — Km crítico 12,450/15,000 · Mantenimiento próximo',
  '🚦 Unidad 07 — $2,150 pendiente · vence hoy',
  '✅ Unidad 08 — GPS activo · ruta normal',
];
const TICKER_EVENTS_EN = [
  '🔔 Unit 01 — Fine $587 detected · 2 min ago',
  '✅ Unit 02 — Weekly statement sent $2,884 · 5 min ago',
  '📍 Unit 03 — On the move · 78 km/h · 1 min ago',
  '💰 Unit 04 — Payment confirmed $2,327 · 8 min ago',
  '⚙️ System generated 8 statements automatically · Monday 7:00am',
  '🛡️ Unit 05 — Active insurance verified · valid until 2027',
  '📊 Weekly report sent via WhatsApp · 7:12am',
  '⚠️ Unit 06 — Critical km 12,450/15,000 · Maintenance soon',
  '🚦 Unit 07 — $2,150 pending · due today',
  '✅ Unit 08 — GPS active · normal route',
];

// ─── TYPEWRITER HOOK ──────────────────────────────────────────────────────────
function useTypewriter(phrases: readonly string[], speed = 75) {
  const [state, setState] = useState({ idx: 0, char: 0, del: false, paused: false });
  const [text, setText] = useState('');
  useEffect(() => {
    const phrase = phrases[state.idx];
    if (state.paused) {
      const t = setTimeout(() => setState(s => ({ ...s, del: true, paused: false })), 2500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (!state.del) {
        if (state.char < phrase.length) {
          setText(phrase.slice(0, state.char + 1));
          setState(s => ({ ...s, char: s.char + 1 }));
        } else {
          setState(s => ({ ...s, paused: true }));
        }
      } else {
        if (state.char > 0) {
          setText(phrase.slice(0, state.char - 1));
          setState(s => ({ ...s, char: s.char - 1 }));
        } else {
          setState(s => ({ ...s, del: false, idx: (s.idx + 1) % phrases.length }));
        }
      }
    }, state.del ? Math.floor(speed * 0.45) : speed);
    return () => clearTimeout(t);
  }, [state, phrases, speed]);
  return text;
}

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }: {
  value: number; prefix?: string; suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isInView) return;
    const duration = 2200;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setCount(Math.floor(eased * value));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);
  return <span ref={ref}>{prefix}{count.toLocaleString('es-MX')}{suffix}</span>;
}

// ─── LOGO — fleet-icon.png zoom para ocultar bordes blancos ─────────────────
function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 rounded-xl overflow-hidden shadow-lg shadow-blue-600/25 ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      <Image
        src="/fleet-icon.png"
        alt="Gestiona tu Flotilla"
        width={size * 2}
        height={size * 2}
        className="block"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          transform: 'scale(1.6)',
          transformOrigin: 'center 30%',
        }}
        priority
      />
    </span>
  );
}

// ─── SCROLL PROGRESS BAR ─────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 z-[200] origin-left pointer-events-none"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

// ─── CURSOR GLOW ──────────────────────────────────────────────────────────────
function CursorGlow() {
  const rm = useReducedMotion();
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  useEffect(() => {
    if (rm) return;
    const handler = (e: MouseEvent) => {
      x.set(e.clientX - 300);
      y.set(e.clientY - 300);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [rm, x, y]);
  if (rm) return null;
  return (
    <motion.div
      className="fixed pointer-events-none z-[1] hidden lg:block"
      style={{
        x, y, width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(37,99,235,0.055) 0%, transparent 70%)',
      }}
    />
  );
}

// ─── LIVE TICKER ──────────────────────────────────────────────────────────────
function LiveTicker() {
  const { lang } = useLang();
  const events = lang === 'en' ? TICKER_EVENTS_EN : TICKER_EVENTS_ES;
  return (
    <div className="bg-slate-900/80 backdrop-blur border-b border-white/5 py-2 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{tx(lang,'EN VIVO','LIVE')}</span>
      </div>
      <motion.div
        className="flex gap-16 pl-28 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
      >
        {[...events, ...events].map((event, i) => (
          <span key={i} className="text-slate-400 text-xs font-mono">{event}</span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── ANNOUNCEMENT BAR ─────────────────────────────────────────────────────────
function AnnouncementBar() {
  return (
    <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white text-center py-2.5 px-4 text-sm font-semibold">
      🎉 <span className="font-black">OFERTA LIMITADA:</span> Primeros 3 meses al 50% si contratas antes del 31 de mayo{' '}
      <Link href="/registro" className="underline font-black hover:text-blue-200 transition-colors">→ Empieza aquí</Link>
    </div>
  );
}

// ─── LANGUAGE SWITCHER ───────────────────────────────────────────────────────
function LangSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const LANGS: { code: Lang; flag: string; label: string }[] = [
    { code: 'es', flag: '🇲🇽', label: 'Español' },
    { code: 'en', flag: '🇺🇸', label: 'English' },
  ];
  const current = LANGS.find(l => l.code === lang)!;
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 min-h-[40px]">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>
        <span className="text-base">{current.flag}</span>
        <span className="hidden lg:inline text-xs">{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 9l6 6 6-6"/></svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${mobile ? 'left-0' : 'right-0'} top-full mt-1.5 w-40 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50`}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${lang === l.code ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300 hover:bg-white/5'}`}>
                  <span className="text-lg">{l.flag}</span><span>{l.label}</span>
                  {lang === l.code && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav() {
  const { lang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="sticky top-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0 group" onClick={() => setMenuOpen(false)}>
          <motion.span whileHover={{ scale: 1.05, rotate: -3 }} transition={{ duration: 0.2 }} className="inline-flex">
            <Logo size={44} />
          </motion.span>
          <span className="text-white font-black text-lg tracking-tight hidden sm:block">Gestiona tu Flotilla</span>
        </Link>
        <div className="hidden md:flex items-center gap-7">
          <Link href="#funciones" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{tx(lang,'Funciones','Features')}</Link>
          <Link href="#precios"   className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{tx(lang,'Precios','Pricing')}</Link>
          <Link href="/api/demo/access" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{tx(lang,'Ver demo','Live demo')}</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <LangSwitcher />
          <Link href="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">{tx(lang,'Iniciar sesión','Log in')}</Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link href="/registro"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-500 text-white font-black px-5 py-2.5 rounded-full text-sm transition-all shadow-lg shadow-blue-600/30 whitespace-nowrap min-h-[44px]">
              {tx(lang,'14 días gratis →','14-day free trial →')}
            </Link>
          </motion.div>
        </div>
        <div className="flex md:hidden items-center gap-1.5">
          <LangSwitcher mobile />
          <Link href="/registro" className="inline-flex items-center bg-blue-600 text-white font-black px-4 py-2 rounded-full text-xs min-h-[36px]">{tx(lang,'Gratis →','Free →')}</Link>
          <button onClick={() => setMenuOpen(v => !v)} aria-label="Menú"
            className="p-2.5 text-slate-300 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5">
            <AnimatePresence initial={false} mode="wait">
              {menuOpen ? (
                <motion.svg key="close" initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}
                  className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </motion.svg>
              ) : (
                <motion.svg key="menu" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }} transition={{ duration: 0.15 }}
                  className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div key="mobile-menu" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
            className="md:hidden overflow-hidden border-b border-white/10 bg-slate-950">
            <div className="px-5 py-4 flex flex-col gap-1">
              {[{label:tx(lang,'Funciones','Features'),href:'#funciones'},{label:tx(lang,'Precios','Pricing'),href:'#precios'},{label:tx(lang,'Ver demo','Live demo'),href:'/api/demo/access'},{label:tx(lang,'Iniciar sesión','Log in'),href:'/login'}].map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                  className="text-slate-300 hover:text-white font-semibold text-base py-3 px-3 rounded-xl hover:bg-white/5 transition-colors min-h-[52px] flex items-center">
                  {l.label}
                </Link>
              ))}
              <Link href="/registro" onClick={() => setMenuOpen(false)}
                className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-xl text-center transition-colors min-h-[52px] flex items-center justify-center text-base">
                {tx(lang,'🚀 Empezar 14 días gratis →','🚀 Start 14-day free trial →')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  const rm = useReducedMotion();
  const { lang } = useLang();

  // Typewriter cycling through pain points
  const twPhrases = useMemo(() => lang === 'en' ? [
    'no Excel. No chaos.',
    'no chasing drivers.',
    'no hidden fines.',
    'on autopilot.',
  ] : [
    'sin Excel. Sin caos.',
    'sin perseguir choferes.',
    'sin multas ocultas.',
    'en piloto automático.',
  ], [lang]);
  const typed = useTypewriter(twPhrases, 70);

  // 3D tilt on mockup
  const mockupRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const rotX = useTransform(sy, [-200, 200], [8, -8]);
  const rotY = useTransform(sx, [-200, 200], [-8, 8]);

  function onMockupMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = mockupRef.current;
    if (!el || rm) return;
    const r = el.getBoundingClientRect();
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  }
  function onMockupLeave() { mx.set(0); my.set(0); }

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-slate-950">

      {/* ── Animated tech grid ── */}
      {!rm && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.07) 1px,transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 40% 50%,black 30%,transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 40% 50%,black 30%,transparent 100%)',
        }} />
      )}

      {/* ── Scan beam ── */}
      {!rm && (
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent 0%,rgba(59,130,246,0.5) 50%,transparent 100%)' }}
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
      )}

      {/* ── Aurora blobs ── */}
      {!rm && (
        <>
          <motion.div
            className="absolute left-[5%] top-[15%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none"
            animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0.4, 0.2], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-[10%] top-[30%] w-[300px] h-[300px] rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none"
            animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />
        </>
      )}

      {/* ── Floating particles ── */}
      {!rm && HERO_PARTICLES.map((p, i) => (
        <motion.div key={i}
          className="absolute rounded-full bg-blue-400/50 pointer-events-none"
          style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
          animate={{ y: [0, -24, 0], opacity: [0.3, 0.9, 0.3], scale: [1, 1.5, 1] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
        />
      ))}

      {/* Background image — solo derecho */}
      <div className="absolute right-0 top-0 bottom-0 w-[60%] hidden lg:block pointer-events-none">
        <Image src="/fleet-bg.png" alt="" fill className="object-cover object-left-top" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/10" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/60 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-14 items-center">

          {/* Copy */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}
              className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black px-4 py-2 rounded-full mb-7 uppercase tracking-widest">
              {tx(lang,'🏆 La plataforma líder de gestión para flotillas vehiculares en México','🏆 The leading fleet management platform in Mexico')}
            </motion.div>

            {/* H1 — máximo 6 palabras */}
            <motion.h1 variants={fadeUp}
              className="text-5xl sm:text-6xl xl:text-[82px] font-black text-white leading-[1.0] mb-5 tracking-tight">
              {tx(lang,'Tu flotilla,','Your fleet,')}{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                {tx(lang,'en automático.','on autopilot.')}
              </span>
            </motion.h1>

            {/* Typewriter subheadline */}
            <motion.p variants={fadeUp}
              className="text-xl sm:text-2xl text-slate-300 font-semibold leading-snug mb-7 max-w-xl min-h-[2.5rem]">
              {tx(lang,'Cobra automáticamente','Collect automatically')}{' '}
              <span className="text-white">
                {typed}<motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block ml-0.5 w-0.5 h-6 bg-blue-400 align-middle" />
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-6">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}
                animate={rm ? {} : {
                  boxShadow: [
                    '0 0 20px rgba(37,99,235,0.4)',
                    '0 0 50px rgba(37,99,235,0.8)',
                    '0 0 20px rgba(37,99,235,0.4)',
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ borderRadius: 9999 }}
              >
                <Link href="/registro"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black px-8 py-4 rounded-full text-lg transition-all shadow-2xl shadow-blue-600/50 min-h-[52px]">
                  {tx(lang,'🚀 Empezar 14 días gratis →','🚀 Start 14-day free trial →')}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link href="/api/demo/access"
                  className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/15 border border-white/20 hover:border-white/40 text-white font-bold px-8 py-4 rounded-full text-base transition-all min-h-[52px]">
                  {tx(lang,'▶ Ver demo en vivo','▶ Watch live demo')}
                </Link>
              </motion.div>
            </motion.div>

            <motion.p variants={fadeUp} className="text-white/40 text-sm mb-6">
              {tx(lang,'🔒 Sin tarjeta · Sin contrato · Cancela cuando quieras · Soporte en español','🔒 No card · No contract · Cancel anytime · Support in Spanish')}
            </motion.p>

            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-8">
              {(lang === 'en'
                ? ['✅ No endless Excel sheets','✅ No chasing drivers on WhatsApp','✅ No fines from forgetting the portal','✅ No contracts or fine print']
                : ['✅ Sin hojas de Excel interminables','✅ Sin perseguir choferes por WA','✅ Sin multas por no revisar el portal','✅ Sin contratos ni letra chica']
              ).map(t => (
                <div key={t} className="text-white/75 text-sm font-semibold">{t}</div>
              ))}
            </motion.div>

            {/* Live stats — neon style */}
            <motion.div variants={staggerFast} className="flex flex-wrap gap-6 pt-7 border-t border-white/10">
              {[
                { icon: '⏰', val: tx(lang,'5 horas','5 hours'), label: tx(lang,'ahorradas cada lunes','saved every Monday') },
                { icon: '🚗', val: '100%',    label: tx(lang,'automatizado desde día 1','automated from day 1') },
                { icon: '⏱️', val: tx(lang,'14 días','14 days'), label: tx(lang,'prueba gratis completa','full free trial') },
              ].map(s => (
                <motion.div key={s.val} variants={fadeUp} className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <motion.span
                      className="text-white font-black text-xl block"
                      animate={rm ? {} : { textShadow: ['0 0 8px rgba(96,165,250,0)', '0 0 20px rgba(96,165,250,0.6)', '0 0 8px rgba(96,165,250,0)'] }}
                      transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 2 }}
                    >{s.val}</motion.span>
                    <span className="text-white/40 text-xs">{s.label}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* 3D tilt mockup */}
          <motion.div
            ref={mockupRef}
            onMouseMove={onMockupMove}
            onMouseLeave={onMockupLeave}
            animate={rm ? {} : { y: [0, -12, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={rm ? {} : { rotateX: rotX, rotateY: rotY, transformPerspective: 1000 }}
            className="relative hidden lg:block cursor-pointer"
          >
            {/* Alert badge */}
            <motion.div
              animate={rm ? {} : { y: [0, -5, 0], scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-2 z-20 bg-red-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-red-500/50 text-sm font-bold flex items-center gap-2">
              {tx(lang,'🚨 Infracción detectada','🚨 Fine detected')}
              <span className="bg-red-600 px-2 py-0.5 rounded-lg text-xs">XAB-001 · $587</span>
            </motion.div>

            {/* Browser mockup */}
            <motion.div
              className="bg-slate-900 rounded-2xl overflow-hidden"
              animate={rm ? {} : { boxShadow: ['0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)', '0 25px 80px rgba(37,99,235,0.2), 0 0 0 1px rgba(59,130,246,0.2)', '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/60 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 mx-2 bg-slate-700/50 rounded-md px-3 py-1 text-slate-400 text-xs text-center">
                  gestionatuflotilla.com/resumen-final
                </div>
              </div>
              <div className="flex">
                <div className="w-36 bg-slate-950/80 border-r border-white/5 p-3 space-y-1">
                  <div className="flex items-center gap-2 p-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black text-white">G</div>
                    <div>
                      <div className="text-white text-[10px] font-black leading-tight">Mi Flotilla</div>
                      <div className="text-slate-500 text-[9px]">Plan Pro</div>
                    </div>
                  </div>
                  {[
                    tx(lang,'🏠 Dashboard','🏠 Dashboard'),
                    tx(lang,'🚗 Vehículos','🚗 Vehicles'),
                    tx(lang,'👤 Choferes','👤 Drivers'),
                    tx(lang,'💰 Cuentas','💰 Statements'),
                    tx(lang,'🛡️ Seguros','🛡️ Insurance'),
                    tx(lang,'🚨 Infracciones','🚨 Fines'),
                    tx(lang,'📊 Contabilidad','📊 Accounting'),
                    tx(lang,'📈 Reportes','📈 Reports'),
                  ].map(item => (
                    <div key={item} className={`text-[10px] px-2 py-1.5 rounded-lg font-medium ${item.startsWith('🏠') ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 p-3 bg-slate-900">
                  <div className="mb-3">
                    <div className="text-white text-xs font-black">{tx(lang,'Resumen Final','Dashboard')}</div>
                    <div className="text-slate-500 text-[10px]">{tx(lang,'Mi Flotilla · 10 vehículos · Semana actual','My Fleet · 10 vehicles · Current week')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { icon:'💰', val:'$17,255', label:tx(lang,'Cobrado','Collected'),     cls:'text-white' },
                      { icon:'⏳', val:'$31,729', label:tx(lang,'Por cobrar','Pending'),  cls:'text-amber-400' },
                      { icon:'🚗', val:'7 / 8',   label:tx(lang,'Flota activa','Active fleet'),cls:'text-white' },
                      { icon:'📈', val:'+$45,600',label:tx(lang,'Utilidad mes','Monthly profit'),cls:'text-emerald-400' },
                    ].map(k => (
                      <div key={k.label} className="bg-slate-800/60 rounded-lg p-2">
                        <div className="text-[9px] text-slate-400 mb-0.5">{k.icon} {k.label}</div>
                        <div className={`text-sm font-black ${k.cls}`}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-[9px] text-slate-400 mb-1.5">{tx(lang,'🚦 Semáforo · ','🚦 Status · ')}<span className="text-amber-400">{tx(lang,'8 pendientes','8 pending')}</span></div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { placa:'XAB-001', chofer:'Carlos H.',  monto:'$2,664', color:'text-amber-400' },
                        { placa:'XBC-002', chofer:'María L.',   monto:'$2,884', color:'text-emerald-400' },
                        { placa:'XCD-003', chofer:'Roberto P.', monto:'$2,058', color:'text-amber-400' },
                        { placa:'XDE-004', chofer:'Ana G.',     monto:'$2,327', color:'text-emerald-400' },
                      ].map(v => (
                        <div key={v.placa} className="bg-slate-900/60 rounded p-1.5">
                          <div className="text-[9px] text-slate-300 font-bold">{v.placa}</div>
                          <div className="text-[8px] text-slate-500">{v.chofer}</div>
                          <div className={`text-[10px] font-black ${v.color}`}>{v.monto}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating success card */}
            <motion.div
              animate={rm ? {} : { y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-3 -left-4 z-20 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl shadow-emerald-500/50 text-sm font-bold flex items-center gap-2">
              {tx(lang,'✅ Cuenta enviada por WA','✅ Statement sent via WA')}
              <span className="bg-emerald-700 px-2 py-0.5 rounded-lg text-xs">$2,884</span>
            </motion.div>

            {/* Floating GPS card */}
            <motion.div
              animate={rm ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              className="absolute top-1/2 -left-8 z-20 bg-slate-800 border border-white/10 text-white px-3 py-2 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2">
              📍 XCD-003 <span className="text-emerald-400">{tx(lang,'● En línea','● Online')}</span>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ─── SOCIAL PROOF BAR — métricas grandes de impacto ──────────────────────────
function SocialProofBar() {
  const { lang } = useLang();
  const stats = [
    { val:<AnimatedNumber value={5} />,  unit:tx(lang,'horas','hours'),   label:tx(lang,'que recuperas cada lunes','you get back every Monday') },
    { val:<>&lt;5</>,                     unit:'min',     label:tx(lang,'para enviar todas las cuentas','to send every statement') },
    { val:<AnimatedNumber value={100} suffix="%" />, unit:'', label:tx(lang,'automático desde el día 1','automated from day 1') },
    { val:<AnimatedNumber value={14} />, unit:tx(lang,'días','days'),    label:tx(lang,'de prueba gratis, sin tarjeta','free trial, no card') },
  ];
  return (
    <div className="bg-white border-b border-slate-100 py-10">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 divide-y-0 lg:divide-x divide-slate-100">
          {stats.map((s, i) => (
            <motion.div key={i}
              variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
              transition={{ delay: i * 0.08 }}
              className="text-center px-2">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl sm:text-5xl font-black bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-transparent tabular-nums">{s.val}</span>
                {s.unit && <span className="text-lg font-black text-slate-400">{s.unit}</span>}
              </div>
              <p className="text-slate-500 text-sm font-semibold mt-1.5 leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── INTEGRATION LOGOS — infinite scroll ─────────────────────────────────────
const INTEGRATIONS_ES = [
  { name: 'Didi Fleet',            icon: '🚕', label: 'Import automático'               },
  { name: 'Uber',                  icon: '🚗', label: 'Totalmente compatible'           },
  { name: 'InDriver',              icon: '🏎️', label: 'Totalmente compatible'           },
  { name: 'WhatsApp Business',     icon: '📱', label: 'Notificaciones automáticas'      },
  { name: 'GPS / Rastreo',         icon: '📍', label: 'Compatible con tu proveedor GPS' },
  { name: 'SAT / PFAE',            icon: '🧾', label: 'Contabilidad legal México'       },
  { name: 'Portales de Multas',    icon: '🚦', label: 'Sync automático de infracciones' },
  { name: 'Excel / Reportes',      icon: '📊', label: 'Importa y exporta fácil'         },
] as const;
const INTEGRATIONS_EN = [
  { name: 'Didi Fleet',            icon: '🚕', label: 'Automatic import'                },
  { name: 'Uber',                  icon: '🚗', label: 'Fully compatible'                },
  { name: 'InDriver',              icon: '🏎️', label: 'Fully compatible'                },
  { name: 'WhatsApp Business',     icon: '📱', label: 'Automatic notifications'         },
  { name: 'GPS / Tracking',        icon: '📍', label: 'Works with your GPS provider'    },
  { name: 'SAT / PFAE',            icon: '🧾', label: 'Legal accounting in Mexico'      },
  { name: 'Fine Portals',          icon: '🚦', label: 'Automatic fine sync'             },
  { name: 'Excel / Reports',       icon: '📊', label: 'Easy import and export'          },
] as const;

function IntegrationLogos() {
  const { lang } = useLang();
  const INTEGRATIONS = lang === 'en' ? INTEGRATIONS_EN : INTEGRATIONS_ES;
  return (
    <section className="py-12 bg-slate-950 border-b border-white/5">
      <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-7">
        {tx(lang,'⚡ Conectado con las plataformas que ya usas','⚡ Connected with the platforms you already use')}
      </p>
      <div className="overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
        <motion.div
          className="flex gap-4 px-4"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        >
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-900/80 border border-white/8 rounded-2xl px-5 py-3.5 whitespace-nowrap shrink-0 cursor-default">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="text-white font-black text-sm">{item.name}</div>
                <div className="text-slate-500 text-[11px]">{item.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── BEFORE / AFTER ───────────────────────────────────────────────────────────
function BeforeAfter() {
  const { lang } = useLang();
  const before = lang === 'en' ? [
    { time:'7:00am', text:'You open Excel. Last week’s data is mixed in with this week’s.', icon:'😤' },
    { time:'7:30am', text:'You message 8 drivers on WhatsApp one by one. Some leave you on read.', icon:'📱' },
    { time:'8:15am', text:'You manually calculate amounts factoring in rent, gas, pending fines…', icon:'🔢' },
    { time:'9:00am', text:'3 drivers say they already paid. You have no quick way to verify it.', icon:'🤷' },
    { time:'10:30am',text:'You get an email from the SAT. There’s an April 14 fine with a 40% surcharge.', icon:'🚨' },
    { time:'12:00pm',text:'You’ve spent 5 hours on this. Your fleet made $18,000 but you don’t know how much reached you.', icon:'💸' },
  ] : [
    { time:'7:00am', text:'Abres el Excel. Los datos de la semana pasada están mezclados con los de esta.', icon:'😤' },
    { time:'7:30am', text:'Le mandas mensaje a 8 choferes por WhatsApp uno por uno. Algunos te dejan en visto.', icon:'📱' },
    { time:'8:15am', text:'Calculas manualmente los importes considerando rentas, gasolina, multas pendientes…', icon:'🔢' },
    { time:'9:00am', text:'3 choferes dicen que ya pagaron. Tú no tienes cómo comprobarlo rápido.', icon:'🤷' },
    { time:'10:30am',text:'Recibes un correo del SAT. Hay una infracción del 14 de abril con recargo del 40%.', icon:'🚨' },
    { time:'12:00pm',text:'Llevas 5 horas en esto. Tu flotilla generó $18,000 pero no sabes cuánto te llegó.', icon:'💸' },
  ];
  const after = lang === 'en' ? [
    { time:'6:59am', text:'The system automatically generated all 8 drivers’ statements with exact amounts.', icon:'⚙️' },
    { time:'7:00am', text:'Each driver got their statement on WhatsApp, straight to their phone. Without you lifting a finger.', icon:'📲' },
    { time:'7:05am', text:'You open the Dashboard. In 10 seconds you see: $17,255 collected · $31,729 pending · 7/8 fleet active.', icon:'📊' },
    { time:'7:08am', text:'The system already detected unit XAB-001 has a $587 fine. It already notified you.', icon:'🔔' },
    { time:'7:12am', text:'The full weekly report already reached your WhatsApp: income, pending, monthly profit.', icon:'📈' },
    { time:'7:15am', text:'Done. Your fleet is on autopilot. What will you do with the 5 hours you got back?', icon:'🏖️' },
  ] : [
    { time:'6:59am', text:'El sistema generó automáticamente las cuentas de los 8 choferes con los importes exactos.', icon:'⚙️' },
    { time:'7:00am', text:'Cada chofer recibió su cuenta por WhatsApp directo a su celular. Sin que levantaras un dedo.', icon:'📲' },
    { time:'7:05am', text:'Abres el Dashboard. Ves en 10 segundos: $17,255 cobrado · $31,729 pendiente · 7/8 flota activa.', icon:'📊' },
    { time:'7:08am', text:'El sistema ya detectó que la unidad XAB-001 tiene una infracción de $587. Ya te notificó.', icon:'🔔' },
    { time:'7:12am', text:'El reporte semanal completo ya llegó a tu WhatsApp: ingresos, pendientes, utilidad del mes.', icon:'📈' },
    { time:'7:15am', text:'Listo. Tu flotilla está en piloto automático. ¿Qué haces con las 5 horas que ganaste?', icon:'🏖️' },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-16">
          <span className="text-red-500 font-black text-sm uppercase tracking-widest">{tx(lang,'⚠️ El problema real','⚠️ The real problem')}</span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-3 mb-4">
            {tx(lang,'El lunes de cobro es el peor','Collection Monday is the worst')}<br /><span className="text-red-500">{tx(lang,'día de la semana.','day of the week.')}</span> {tx(lang,'¿A poco no?','Right?')}
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">{tx(lang,'Si gestionas tu flotilla a mano, esto es lo que vive cada semana el 91% de los flotilleros en México.','If you manage your fleet by hand, this is what 91% of fleet owners in Mexico go through every week.')}</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={slideLeft} className="bg-red-50 border-2 border-red-200 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-7">
              <span className="text-3xl">😩</span>
              <div>
                <div className="text-red-600 font-black text-sm uppercase tracking-widest">{tx(lang,'Sin Gestiona tu Flotilla','Without Gestiona tu Flotilla')}</div>
                <div className="text-slate-800 font-black text-xl">{tx(lang,'Tu lunes a las 7am','Your Monday at 7am')}</div>
              </div>
            </div>
            <div className="space-y-4">
              {before.map(item => (
                <div key={item.time} className="flex gap-4">
                  <div className="text-xl shrink-0 mt-0.5">{item.icon}</div>
                  <div><span className="text-red-600 font-black text-xs">{item.time} —</span><span className="text-slate-700 text-sm ml-1.5">{item.text}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-red-100 border border-red-300 rounded-2xl p-4 text-center">
              <div className="text-red-700 font-black text-lg">{tx(lang,'⏰ 5+ horas perdidas cada semana','⏰ 5+ hours lost every week')}</div>
              <div className="text-red-600 text-sm mt-1">{tx(lang,'= 20 horas al mes que nunca recuperas','= 20 hours a month you never get back')}</div>
            </div>
          </motion.div>

          <motion.div variants={slideRight} className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-7">
              <span className="text-3xl">😎</span>
              <div>
                <div className="text-emerald-600 font-black text-sm uppercase tracking-widest">{tx(lang,'Con Gestiona tu Flotilla','With Gestiona tu Flotilla')}</div>
                <div className="text-slate-800 font-black text-xl">{tx(lang,'Tu lunes a las 7am','Your Monday at 7am')}</div>
              </div>
            </div>
            <div className="space-y-4">
              {after.map(item => (
                <div key={item.time} className="flex gap-4">
                  <div className="text-xl shrink-0 mt-0.5">{item.icon}</div>
                  <div><span className="text-emerald-600 font-black text-xs">{item.time} —</span><span className="text-slate-700 text-sm ml-1.5">{item.text}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-emerald-100 border border-emerald-300 rounded-2xl p-4 text-center">
              <div className="text-emerald-700 font-black text-lg">{tx(lang,'⚡ 15 minutos cada lunes','⚡ 15 minutes every Monday')}</div>
              <div className="text-emerald-600 text-sm mt-1">{tx(lang,'El resto: tu negocio, tu familia, tu vida','The rest: your business, your family, your life')}</div>
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-10 text-center">
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link href="/registro"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black px-10 py-5 rounded-full text-lg transition-all shadow-2xl shadow-blue-600/40 min-h-[56px]">
              {tx(lang,'🚀 Quiero el lunes fácil → Prueba 14 días gratis','🚀 I want the easy Monday → 14-day free trial')}
            </Link>
          </motion.div>
          <p className="text-slate-400 text-sm mt-3">{tx(lang,'Sin tarjeta · Sin contrato · Activo en 30 minutos','No card · No contract · Live in 30 minutes')}</p>
        </div>
      </div>
    </section>
  );
}

// ─── ROI CALCULATOR ──────────────────────────────────────────────────────────
function ROICalculator() {
  const { lang } = useLang();
  const items = lang === 'en' ? [
    { icon:'📅', label:'Time lost on manual collections', cost:'$4,800/mo', desc:'5 hours × 4 Mondays × $240/hour of your time', color:'border-red-500/30 bg-red-500/5', textColor:'text-red-400' },
    { icon:'💸', label:'Payments that are late or never arrive', cost:'$5,500/mo', desc:'1-2 weeks of uncollected rent from lack of control', color:'border-orange-500/30 bg-orange-500/5', textColor:'text-orange-400' },
    { icon:'🚨', label:'Surcharges from late fines',  cost:'$2,340/mo', desc:'+40% surcharge. $587 × 10 = $5,870/year', color:'border-yellow-500/30 bg-yellow-500/5', textColor:'text-yellow-400' },
  ] : [
    { icon:'📅', label:'Tiempo perdido en cobros manuales', cost:'$4,800/mes', desc:'5 horas × 4 lunes × $240/hora de tu tiempo', color:'border-red-500/30 bg-red-500/5', textColor:'text-red-400' },
    { icon:'💸', label:'Cobros que se retrasan o no llegan', cost:'$5,500/mes', desc:'1-2 semanas de renta sin cobrar por falta de control', color:'border-orange-500/30 bg-orange-500/5', textColor:'text-orange-400' },
    { icon:'🚨', label:'Recargos por infracciones tardías',  cost:'$2,340/mes', desc:'+40% de recargo. $587 × 10 = $5,870/año', color:'border-yellow-500/30 bg-yellow-500/5', textColor:'text-yellow-400' },
  ];
  return (
    <section className="py-24 sm:py-32 bg-slate-950">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-12">
          <span className="text-blue-400 font-black text-sm uppercase tracking-widest">{tx(lang,'💡 ¿Cuánto estás perdiendo?','💡 How much are you losing?')}</span>
          <h2 className="text-4xl font-black text-white mt-3 mb-4">{tx(lang,'El costo real de no usar','The real cost of not using')}<br /><span className="text-blue-400">Gestiona tu Flotilla</span></h2>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {items.map(item => (
            <motion.div key={item.label} variants={fadeUp}
              whileHover={{ y: -4, scale: 1.02 }} transition={{ duration: 0.2 }}
              className={`border rounded-2xl p-6 ${item.color} cursor-default`}>
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-slate-300 text-sm font-semibold mb-2 leading-tight">{item.label}</div>
              <div className={`text-2xl font-black mb-2 ${item.textColor}`}>{item.cost}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </motion.div>
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={VP}
          className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-3xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="text-slate-400 text-sm font-semibold mb-2">{tx(lang,'💀 Pierdes cada mes (mínimo)','💀 You lose every month (minimum)')}</div>
              <div className="text-5xl font-black text-red-400">$12,640</div>
              <div className="text-slate-500 text-xs mt-2">{tx(lang,'tiempo + cobros tardíos + recargos','time + late payments + surcharges')}</div>
            </div>
            <div className="text-center text-4xl text-slate-400">→</div>
            <div className="text-center">
              <div className="text-slate-400 text-sm font-semibold mb-2">{tx(lang,'✅ Gestiona tu Flotilla cuesta','✅ Gestiona tu Flotilla costs')}</div>
              <div className="text-5xl font-black text-emerald-400">{tx(lang,'$999/mes','$999/mo')}</div>
              <div className="text-slate-500 text-xs mt-2">{tx(lang,'Plan Starter · Hasta 10 vehículos','Starter plan · Up to 10 vehicles')}</div>
            </div>
          </div>
          <div className="mt-6 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
            <div className="text-white font-black text-xl">{tx(lang,'💰 Recuperas más de ','💰 You recover more than ')}<span className="text-emerald-400">{tx(lang,'$11,600 cada mes','$11,600 every month')}</span></div>
            <div className="text-slate-400 text-sm mt-1">{tx(lang,'entre tiempo, cobros a tiempo y multas evitadas — incluso si solo recuperas la mitad, ya valió la pena','between time, on-time payments and fines avoided — even if you only recover half, it already paid off')}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── APP SHOWCASE ─────────────────────────────────────────────────────────────
function AppShowcase() {
  const { lang } = useLang();
  const sidebar = lang === 'en'
    ? [{icon:'🏠',label:'Dashboard',active:true},{icon:'🚗',label:'Vehicles',active:false},{icon:'👤',label:'Drivers',active:false},{icon:'💰',label:'Statements',active:false},{icon:'🛡️',label:'Insurance',active:false},{icon:'⚙️',label:'Maintenance',active:false},{icon:'🚨',label:'Fines',active:false},{icon:'📊',label:'Accounting',active:false},{icon:'📈',label:'Reports',active:false}]
    : [{icon:'🏠',label:'Dashboard',active:true},{icon:'🚗',label:'Vehículos',active:false},{icon:'👤',label:'Choferes',active:false},{icon:'💰',label:'Cuentas Sem.',active:false},{icon:'🛡️',label:'Seguros',active:false},{icon:'⚙️',label:'Mantenimiento',active:false},{icon:'🚨',label:'Infracciones',active:false},{icon:'📊',label:'Contabilidad',active:false},{icon:'📈',label:'Reportes',active:false}];
  const kpis = lang === 'en'
    ? [{icon:'💰',val:'$17,255',label:'Collected',color:'text-white',bg:'bg-slate-800'},{icon:'⏳',val:'$31,729',label:'Pending',color:'text-amber-400',bg:'bg-amber-500/10 border border-amber-500/20'},{icon:'🚗',val:'7 / 8',label:'Active fleet',color:'text-white',bg:'bg-slate-800'},{icon:'📈',val:'+$45,600',label:'Monthly profit',color:'text-emerald-400',bg:'bg-emerald-500/10 border border-emerald-500/20'}]
    : [{icon:'💰',val:'$17,255',label:'Cobrado',color:'text-white',bg:'bg-slate-800'},{icon:'⏳',val:'$31,729',label:'Por cobrar',color:'text-amber-400',bg:'bg-amber-500/10 border border-amber-500/20'},{icon:'🚗',val:'7 / 8',label:'Flota activa',color:'text-white',bg:'bg-slate-800'},{icon:'📈',val:'+$45,600',label:'Utilidad mes',color:'text-emerald-400',bg:'bg-emerald-500/10 border border-emerald-500/20'}];
  return (
    <section className="py-24 sm:py-32 bg-white" id="funciones">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-16">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'🖥️ La plataforma','🖥️ The platform')}</span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-3 mb-4">{tx(lang,'Tu flotilla completa,','Your entire fleet,')}<br />{tx(lang,'en una sola pantalla.','on a single screen.')}</h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">{tx(lang,'Desde el cobro semanal hasta la declaración SAT — todo integrado, todo automático, todo en español.','From weekly collection to SAT filing — all integrated, all automatic, all in your language.')}</p>
        </motion.div>
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={VP}
          className="bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-10">
          <div className="flex items-center gap-2 px-5 py-4 bg-slate-800/50 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-red-400/80" /><div className="w-3.5 h-3.5 rounded-full bg-yellow-400/80" /><div className="w-3.5 h-3.5 rounded-full bg-green-400/80" />
            </div>
            <div className="flex-1 bg-slate-700/50 rounded-lg px-4 py-1.5 text-slate-400 text-sm text-center font-medium max-w-sm mx-auto">🔒 gestionatuflotilla.com/resumen-final</div>
          </div>
          <div className="flex">
            <div className="w-52 bg-slate-950/90 border-r border-white/5 p-4 space-y-1 hidden md:block">
              <div className="flex items-center gap-3 px-2 py-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-black text-white shadow-lg">G</div>
                <div><div className="text-white text-xs font-black">{tx(lang,'Mi Flotilla Demo','My Fleet Demo')}</div><div className="text-blue-400 text-[10px] font-semibold">Plan Pro ✓</div></div>
              </div>
              {sidebar.map(item => (
                <div key={item.label} className={`flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl font-semibold ${item.active?'bg-blue-600 text-white shadow-lg shadow-blue-600/30':'text-slate-400'}`}>
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 p-6 bg-slate-900 min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <div><h3 className="text-white font-black text-xl">{tx(lang,'Resumen Final','Dashboard')}</h3><p className="text-slate-400 text-sm">{tx(lang,'Mi Flotilla Demo · 10 vehículos · Semana actual','My Fleet Demo · 10 vehicles · Current week')}</p></div>
                <div className="flex items-center gap-3">
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black px-3 py-1.5 rounded-full">{tx(lang,'⚡ 8 pendientes','⚡ 8 pending')}</span>
                  <button className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-blue-500 transition-colors">{tx(lang,'📥 Importar Didi','📥 Import Didi')}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {kpis.map(k=>(
                  <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
                    <div className="text-slate-400 text-xs mb-1">{k.icon} {k.label}</div>
                    <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-black text-sm">{tx(lang,'🚦 Semáforo de Flotilla','🚦 Fleet Status')}</span>
                  <span className="text-amber-400 text-xs font-bold">{tx(lang,'● 8 cobros pendientes','● 8 payments pending')}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[{placa:'D-001',chofer:'Carlos H.',monto:'$2,664',status:'amber'},{placa:'D-002',chofer:'María L.',monto:'$2,884',status:'green'},{placa:'D-003',chofer:'Roberto P.',monto:'$2,058',status:'amber'},{placa:'D-004',chofer:'Ana G.',monto:'$2,327',status:'green'}].map(v=>(
                    <div key={v.placa} className="bg-slate-900/80 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1"><span className={`w-2 h-2 rounded-full ${v.status==='green'?'bg-emerald-400':'bg-amber-400'}`}/><span className="text-slate-300 text-xs font-black">{v.placa}</span></div>
                      <div className="text-slate-500 text-[10px] mb-1">{v.chofer}</div>
                      <div className={`text-base font-black ${v.status==='green'?'text-emerald-400':'text-amber-400'}`}>{v.monto}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center">
          <motion.div whileHover={{ scale: 1.02 }} className="inline-block">
            <Link href="/api/demo/access" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-500 font-black text-lg transition-colors">
              👆 Explorar el demo completo en vivo →
            </Link>
          </motion.div>
          <p className="text-slate-400 text-sm mt-2">Sin registrarte · Sin tarjeta · Acceso inmediato</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FEATURES ────────────────────────────────────────────────────────────────
function Features() {
  const { lang } = useLang();
  const features = lang === 'en' ? [
    { emoji:'💰', tag:'Automatic collections', title:'Every Monday at 7am, all statements generated and sent.', body:'Forget manual calculations. The system takes each vehicle’s weekly rent, deducts pending expenses, imports real Didi data and generates the exact statement. Then it sends it automatically to each driver’s WhatsApp.', bullets:['✅ Automatic Didi data import','✅ Smart deduction calculation','✅ One-click WhatsApp delivery','✅ Instant PDF receipt'], badge:'⚡ Save 5 hours every Monday', right:false },
    { emoji:'🚨', tag:'Real-time fines', title:'We catch fines before they become problems.', body:'Automatic daily sync with the SSIM Guadalajara portal and the Jalisco state system. As soon as a fine appears, the system notifies you AND the driver on WhatsApp. Never again find out when it already has a 40% surcharge.', bullets:['✅ Daily SSIM Guadalajara sync','✅ Jalisco State sync','✅ Instant WA notice to the driver','✅ Direct link to the payment portal'], badge:'🛡️ Avoid +40% surcharge', right:true },
    { emoji:'📍', tag:'GPS integrated with your provider', title:'Know where every unit is at all times.', body:'Connect your GPS devices by IMEI directly in the app — compatible with the market’s leading providers. Real-time monitoring, automatic mileage alerts for preventive maintenance, and daily activity reports.', bullets:['✅ Works with leading GPS providers','✅ Automatic mileage alerts','✅ Daily location report','✅ Route history per unit'], badge:'📍 Full control of your fleet', right:false },
    { emoji:'📊', tag:'PFAE / Tech Platforms accounting', title:'Your accountant will thank you for the change.', body:'ISR and IVA calculated automatically with the latest SAT tables for the Tech Platforms / PFAE regime. Monthly reports downloadable in PDF and Excel. Specifically designed for the tax reality of a vehicle lessor in Mexico.', bullets:['✅ Automatic PFAE ISR/IVA calculation','✅ Always-updated SAT tables','✅ Monthly report for your accountant','✅ Breakdown per vehicle and driver'], badge:'🇲🇽 Built for Mexico', right:true },
  ] : [
    { emoji:'💰', tag:'Cobros automáticos', title:'Cada lunes a las 7am, todas las cuentas generadas y enviadas.', body:'Olvídate de calcular manualmente. El sistema toma la renta semanal de cada vehículo, descuenta gastos pendientes, importa los datos reales de Didi y genera la cuenta exacta. Luego la envía automáticamente al WhatsApp de cada chofer.', bullets:['✅ Import automático de datos Didi','✅ Cálculo inteligente de descuentos','✅ Envío por WhatsApp en 1 clic','✅ Recibo PDF generado al instante'], badge:'⚡ Ahorra 5 horas cada lunes', right:false },
    { emoji:'🚨', tag:'Infracciones en tiempo real', title:'Detectamos las multas antes de que se conviertan en problemas.', body:'Sincronización diaria automática con el portal SSIM Guadalajara y el sistema estatal Jalisco. En cuanto aparece una infracción, el sistema te notifica a ti Y al chofer por WhatsApp. Nunca más te enteras cuando ya tiene recargo del 40%.', bullets:['✅ Sync diario SSIM Guadalajara','✅ Sync Jalisco Estatal','✅ Notificación WA al chofer al instante','✅ Link directo al portal de pago'], badge:'🛡️ Evita +40% de recargo', right:true },
    { emoji:'📍', tag:'GPS integrado con tu proveedor', title:'Sabe dónde está cada unidad en todo momento.', body:'Conecta tus dispositivos GPS por IMEI directo en la app — compatible con los principales proveedores del mercado. Monitoreo en tiempo real, alertas automáticas de kilometraje para mantenimiento preventivo, y reportes de actividad diaria.', bullets:['✅ Compatible con los principales GPS del mercado','✅ Alertas automáticas por km','✅ Reporte diario de ubicaciones','✅ Historial de rutas por unidad'], badge:'📍 Control total de tu flota', right:false },
    { emoji:'📊', tag:'Contabilidad PFAE / Plataformas Tecnológicas', title:'Tu contador va a agradecerte el cambio.', body:'ISR e IVA calculados automáticamente con las tablas SAT más recientes para el régimen de Plataformas Tecnológicas / PFAE. Reportes mensuales descargables en PDF y Excel. Específicamente diseñado para la realidad fiscal del arrendador de vehículos en México.', bullets:['✅ Cálculo ISR/IVA automático PFAE','✅ Tablas SAT siempre actualizadas','✅ Reporte mensual para tu contador','✅ Clasificación por vehículo y chofer'], badge:'🇲🇽 Hecho para México', right:true },
  ];
  const bonus = lang === 'en'
    ? [{icon:'💬',label:'Driver Portal',desc:'Sees their statements from their phone'},{icon:'🔧',label:'Mechanic Portal',desc:'Assigned work orders'},{icon:'🛡️',label:'Insurance Control',desc:'Policies and expirations'},{icon:'📥',label:'Import from Excel',desc:'Migrate data in minutes'},{icon:'👥',label:'Multi-user',desc:'Admin, drivers and mechanics'},{icon:'📱',label:'WhatsApp Multi-mode',desc:'Meta API + Whapi + Webhook'}]
    : [{icon:'💬',label:'Portal del Chofer',desc:'Ve sus cuentas desde su cel'},{icon:'🔧',label:'Portal Mecánico',desc:'Órdenes asignadas'},{icon:'🛡️',label:'Control de Seguros',desc:'Pólizas y vencimientos'},{icon:'📥',label:'Import desde Excel',desc:'Migra datos en minutos'},{icon:'👥',label:'Multi-usuario',desc:'Admin, choferes y mecánicos'},{icon:'📱',label:'WhatsApp Multi-modo',desc:'Meta API + Whapi + Webhook'}];
  return (
    <section className="py-24 sm:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-16">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'🔧 Funcionalidades','🔧 Features')}</span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mt-3 mb-4">{tx(lang,'Todo lo que tu flotilla necesita.','Everything your fleet needs.')}<br /><span className="text-slate-400">{tx(lang,'Nada que no necesite.','Nothing it doesn’t.')}</span></h2>
        </motion.div>
        <div className="space-y-20">
          {features.map(f => (
            <div key={f.tag} className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <motion.div variants={f.right ? slideRight : slideLeft} initial="hidden" whileInView="show" viewport={VP} className={f.right ? 'lg:order-2' : ''}>
                <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.25 }}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-white/5 shadow-xl cursor-default">
                  <div className="text-6xl mb-4">{f.emoji}</div>
                  <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-black px-3 py-1.5 rounded-full mb-4">{f.badge}</div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {f.bullets.map(b => (<div key={b} className="bg-white/5 rounded-xl p-3 text-slate-300 text-xs font-semibold">{b}</div>))}
                  </div>
                </motion.div>
              </motion.div>
              <motion.div variants={f.right ? slideLeft : slideRight} initial="hidden" whileInView="show" viewport={VP} className={f.right ? 'lg:order-1' : ''}>
                <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{f.tag}</span>
                <h3 className="text-3xl font-black text-slate-900 mt-2 mb-4 leading-tight">{f.title}</h3>
                <p className="text-slate-600 text-lg leading-relaxed mb-6">{f.body}</p>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                  <Link href="/registro" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-3 rounded-full text-sm transition-all min-h-[44px]">
                    {tx(lang,'Activar esta función gratis →','Activate this feature free →')}
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          ))}
        </div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="mt-20">
          <motion.h3 variants={fadeUp} className="text-2xl font-black text-slate-900 text-center mb-8">{tx(lang,'Y además incluye sin costo extra:','Plus it includes at no extra cost:')}</motion.h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {bonus.map(f => (
              <motion.div key={f.label} variants={fadeUp}
                whileHover={{ y: -6, scale: 1.05, boxShadow: '0 12px 32px rgba(37,99,235,0.18)' }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-center cursor-default hover:border-blue-300 transition-colors">
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="text-slate-900 font-black text-sm mb-1">{f.label}</div>
                <div className="text-slate-400 text-xs">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── NUMBERS — NEON GLOW ─────────────────────────────────────────────────────
function Numbers() {
  const rm = useReducedMotion();
  const { lang } = useLang();
  const stats = [
    { icon:'⏰', val:tx(lang,'5 horas','5 hours'),                label:tx(lang,'Ahorradas cada lunes','Saved every Monday'),           sub:tx(lang,'vs. calcular todo a mano','vs. calculating by hand') },
    { icon:'⚡', val:'< 5 min',                                   label:tx(lang,'Para enviar todas las cuentas','To send every statement'),  sub:tx(lang,'vs. 5+ horas manualmente','vs. 5+ hours manually') },
    { icon:'🧾', val:tx(lang,'14 días','14 days'),                label:tx(lang,'Prueba gratis completa','Full free trial'),         sub:tx(lang,'sin tarjeta de crédito','no credit card') },
    { icon:'🚨', val:<AnimatedNumber value={40} suffix="%" />,    label:tx(lang,'Menos recargos en infracciones','Fewer fine surcharges'), sub:tx(lang,'con sync automático','with automatic sync') },
  ];
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 relative overflow-hidden">
      {!rm && <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize:'48px 48px' }} />}
      {/* Scan beam on numbers section */}
      {!rm && (
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.3) 50%,transparent 100%)' }}
          animate={{ top:['0%','100%'] }}
          transition={{ duration:5, repeat:Infinity, ease:'linear', repeatDelay:4 }}
        />
      )}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-12">
          <h2 className="text-3xl font-black text-white">{tx(lang,'Por qué los flotilleros nos eligen.','Why fleet owners choose us.')}</h2>
          <p className="text-blue-200 mt-2">{tx(lang,'Resultados reales que puedes esperar desde la primera semana','Real results you can expect from the first week')}</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp}
              whileHover={{ scale: 1.1, y: -8 }} transition={{ duration: 0.2 }}
              className="text-white cursor-default">
              <div className="text-4xl mb-3">{s.icon}</div>
              {/* Neon glow ring */}
              <div className="relative inline-block mb-2">
                {!rm && (
                  <motion.div
                    className="absolute -inset-3 rounded-full"
                    animate={{ boxShadow: ['0 0 0px rgba(96,165,250,0)', '0 0 30px rgba(96,165,250,0.5)', '0 0 0px rgba(96,165,250,0)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                  />
                )}
                <motion.div
                  className="text-5xl font-black text-blue-200 tabular-nums"
                  animate={rm ? {} : { textShadow: ['0 0 10px rgba(147,197,253,0.3)','0 0 30px rgba(147,197,253,0.9), 0 0 60px rgba(147,197,253,0.4)','0 0 10px rgba(147,197,253,0.3)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                >
                  {s.val}
                </motion.div>
              </div>
              <div className="text-blue-200 font-semibold text-sm leading-tight">{s.label}</div>
              <div className="text-blue-300/70 text-xs mt-1">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS — dark, quotation marks, animated stars, avatar glow ───────
const TESTIMONIAL_DATA_ES = [
  { stars:5, text:'Antes me pasaba el lunes completo corriendo cuentas y persiguiendo a mis choferes. Ahora en 5 minutos ya está todo enviado y sé exactamente quién me debe y quién ya pagó. Es como tener un asistente que nunca duerme.', name:'Roberto Hernández', role:'14 vehículos Didi · Guadalajara', result:'🏆 5 horas ahorradas cada semana', avatar:'RH', avatarColor:'bg-blue-600', ring:'rgba(37,99,235,0.7)' },
  { stars:5, text:'Lo de las infracciones me cambió la vida. Antes pagaba recargos del 40% porque me enteraba tarde. Con Gestiona tu Flotilla me llega el WhatsApp al instante. Ya me ahorré más de $8,000 en 3 meses.', name:'Carmen Valdez', role:'6 vehículos Uber · CDMX', result:'💰 $8,000 ahorrados en recargos', avatar:'CV', avatarColor:'bg-purple-600', ring:'rgba(147,51,234,0.7)' },
  { stars:5, text:'Mi contador ya no me regaña. Antes llegaba con facturas desordenadas y cuentas en Excel mal hechas. Ahora descargo el reporte PFAE en PDF y listo. Mis choferes también están más tranquilos.', name:'Alejandro Morales', role:'9 vehículos InDriver · Monterrey', result:'📊 Contabilidad siempre en orden', avatar:'AM', avatarColor:'bg-emerald-600', ring:'rgba(5,150,105,0.7)' },
];
const TESTIMONIAL_DATA_EN = [
  { stars:5, text:'I used to spend all of Monday running statements and chasing my drivers. Now in 5 minutes everything is sent and I know exactly who owes me and who already paid. It’s like having an assistant that never sleeps.', name:'Roberto Hernández', role:'14 Didi vehicles · Guadalajara', result:'🏆 5 hours saved every week', avatar:'RH', avatarColor:'bg-blue-600', ring:'rgba(37,99,235,0.7)' },
  { stars:5, text:'The fines feature changed my life. I used to pay 40% surcharges because I found out late. With Gestiona tu Flotilla the WhatsApp reaches me instantly. I’ve already saved over $8,000 in 3 months.', name:'Carmen Valdez', role:'6 Uber vehicles · Mexico City', result:'💰 $8,000 saved in surcharges', avatar:'CV', avatarColor:'bg-purple-600', ring:'rgba(147,51,234,0.7)' },
  { stars:5, text:'My accountant no longer scolds me. I used to show up with messy invoices and badly-done Excel statements. Now I download the PFAE report as a PDF and that’s it. My drivers are calmer too.', name:'Alejandro Morales', role:'9 InDriver vehicles · Monterrey', result:'📊 Accounting always in order', avatar:'AM', avatarColor:'bg-emerald-600', ring:'rgba(5,150,105,0.7)' },
];
type Testimonial = typeof TESTIMONIAL_DATA_ES[number];

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const rm = useReducedMotion();
  const { lang } = useLang();
  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.22 }}
      className="relative bg-slate-900/80 border border-white/8 rounded-3xl p-8 flex flex-col cursor-default overflow-hidden backdrop-blur-sm">
      {/* Big quotation mark */}
      <span className="absolute top-5 left-6 text-[72px] leading-none text-blue-500/20 font-black select-none pointer-events-none" style={{ fontFamily:'Georgia,serif' }}>❝</span>
      {/* Animated stars */}
      <motion.div
        className="flex gap-1 mb-6 relative z-10"
        variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.07 } } }}
        initial="hidden" whileInView="show" viewport={{ once:true }}>
        {Array.from({length:t.stars}).map((_,i)=>(
          <motion.span key={i}
            variants={{ hidden:{ opacity:0, scale:0, rotate:-30 }, show:{ opacity:1, scale:1, rotate:0, transition:{ duration:0.35, ease:[0.22,1,0.36,1] } } }}
            className="text-yellow-400 text-xl">★</motion.span>
        ))}
        <motion.span variants={fadeIn} className="ml-2 text-yellow-500/70 text-xs font-black self-center mt-0.5">5.0</motion.span>
      </motion.div>
      {/* Quote text */}
      <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-7 relative z-10 italic">"{t.text}"</p>
      {/* Author with avatar glow */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-full ${t.avatarColor} flex items-center justify-center text-white font-black text-sm`}>{t.avatar}</div>
          {!rm && (
            <motion.div
              className="absolute -inset-[3px] rounded-full pointer-events-none"
              animate={{ boxShadow: [`0 0 0px ${t.ring}`, `0 0 12px ${t.ring}, 0 0 24px ${t.ring}`, `0 0 0px ${t.ring}`] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.6 }}
            />
          )}
        </div>
        <div>
          <div className="text-white font-black text-sm flex items-center gap-2">
            {t.name}
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">{tx(lang,'✓ Verificado','✓ Verified')}</span>
          </div>
          <div className="text-slate-400 text-xs mt-0.5">{t.role}</div>
        </div>
      </div>
      {/* Result badge */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-emerald-400 text-xs font-black relative z-10">{t.result}</div>
    </motion.div>
  );
}

function Testimonials() {
  const { lang } = useLang();
  const data = lang === 'en' ? TESTIMONIAL_DATA_EN : TESTIMONIAL_DATA_ES;
  return (
    <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:`linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)`,
        backgroundSize:'64px 64px',
        maskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)',
        WebkitMaskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black 30%,transparent 100%)',
      }} />
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-16">
          <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">{tx(lang,'⭐⭐⭐⭐⭐ Valoraciones reales','⭐⭐⭐⭐⭐ Real reviews')}</span>
          <h2 className="text-4xl font-black text-white mt-3 mb-4">{tx(lang,'Resultados reales de flotilleros reales','Real results from real fleet owners')}</h2>
          <p className="text-slate-400 text-lg">{tx(lang,'Flotilleros en México que ya no hacen cuentas los lunes','Fleet owners in Mexico who no longer do statements on Mondays')}</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.map((t, i) => <TestimonialCard key={t.name} t={t} index={i} />)}
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
          className="mt-10 bg-gradient-to-r from-blue-900/50 to-slate-900/80 border border-blue-500/20 rounded-3xl p-8 text-center backdrop-blur-sm">
          <div className="text-4xl mb-3">🤝</div>
          <h3 className="text-2xl font-black text-white mb-2">{tx(lang,'¿Eres parte de una flotilla grande?','Are you part of a large fleet?')}</h3>
          <p className="text-slate-400 mb-5">{tx(lang,'Si manejas 20+ vehículos o varias flotillas, tenemos una demo personalizada para ti.','If you run 20+ vehicles or several fleets, we have a personalized demo for you.')}</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link href="mailto:hola@gestionatuflotilla.com?subject=Demo Enterprise"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3.5 rounded-full transition-all min-h-[52px]">
              {tx(lang,'📞 Agendar demo Enterprise →','📞 Book Enterprise demo →')}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── COMPARISON ───────────────────────────────────────────────────────────────
function Comparison() {
  const { lang } = useLang();
  const rows = lang === 'en' ? [
    {feature:'Monthly price',                 excel:'Your time',    mis:'$690/mo',            gtf:'From $999/mo', star:true},
    {feature:'Automatic collections every Monday', excel:'⚠️ Manual', mis:'❌',              gtf:'✅'},
    {feature:'Jalisco fine sync',             excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'PFAE accounting',               excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'Native WhatsApp integration',   excel:'⚠️ Manual',   mis:'⚠️ Paid add-on',    gtf:'✅'},
    {feature:'Driver portal',                 excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'Integrated GPS',                excel:'❌',           mis:'✅',                 gtf:'✅'},
    {feature:'Import from Excel/Didi',        excel:'❌',           mis:'⚠️ Limited',        gtf:'✅'},
    {feature:'Trial period',                  excel:'N/A',         mis:'7 days',             gtf:'14 days', star:true},
    {feature:'Support in Spanish',            excel:'❌',           mis:'✅',                 gtf:'✅'},
    {feature:'Built for Mexico',              excel:'❌',           mis:'⚠️ Generic',        gtf:'✅ 100%', star:true},
  ] : [
    {feature:'Precio mensual',               excel:'Tu tiempo',    mis:'$690/mes',           gtf:'Desde $999/mes', star:true},
    {feature:'Cobros automáticos cada lunes', excel:'⚠️ Manual',   mis:'❌',                 gtf:'✅'},
    {feature:'Sync infracciones Jalisco',     excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'Contabilidad PFAE',              excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'WhatsApp nativo integrado',     excel:'⚠️ Manual',   mis:'⚠️ Add-on + costo', gtf:'✅'},
    {feature:'Portal del chofer',             excel:'❌',           mis:'❌',                 gtf:'✅', star:true},
    {feature:'GPS integrado',                 excel:'❌',           mis:'✅',                 gtf:'✅'},
    {feature:'Import desde Excel/Didi',       excel:'❌',           mis:'⚠️ Limitado',       gtf:'✅'},
    {feature:'Período de prueba',             excel:'N/A',         mis:'7 días',             gtf:'14 días', star:true},
    {feature:'Soporte en español',            excel:'❌',           mis:'✅',                 gtf:'✅'},
    {feature:'Hecho para México',             excel:'❌',           mis:'⚠️ Genérico',       gtf:'✅ 100%', star:true},
  ];
  return (
    <section className="py-24 sm:py-32 bg-slate-50">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-14">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'🆚 ¿Por qué nosotros?','🆚 Why us?')}</span>
          <h2 className="text-4xl font-black text-slate-900 mt-3 mb-4">{tx(lang,'Más completo.','More complete.')}<br /><span className="text-blue-600">{tx(lang,'A menor precio.','At a lower price.')}</span></h2>
          <p className="text-slate-500 text-lg">{tx(lang,'vs. misflotillas.com · el competidor más conocido en México','vs. misflotillas.com · the best-known competitor in Mexico')}</p>
        </motion.div>
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={VP}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
          <div className="grid grid-cols-4 border-b border-slate-200">
            <div className="p-5 bg-slate-50"><span className="text-slate-500 font-black text-sm">{tx(lang,'FUNCIÓN','FEATURE')}</span></div>
            <div className="p-5 text-center border-l border-slate-200"><span className="text-slate-400 font-black text-sm">{tx(lang,'Excel manual','Manual Excel')}</span></div>
            <div className="p-5 text-center border-l border-slate-200"><span className="text-slate-500 font-black text-sm">misflotillas.com</span></div>
            <div className="p-5 text-center border-l border-blue-200 bg-blue-50"><span className="text-blue-700 font-black text-sm">Gestiona tu Flotilla</span><div className="text-blue-500 text-[10px] font-bold mt-0.5">{tx(lang,'← tú aquí','← you’re here')}</div></div>
          </div>
          {rows.map((row, i) => (
            <motion.div key={row.feature} whileHover={{ backgroundColor:'rgba(37,99,235,0.03)' }}
              className={`grid grid-cols-4 border-b border-slate-100 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
              <div className="p-4 flex items-center gap-2">{row.star && <span className="text-blue-500 text-xs font-black">★</span>}<span className="text-slate-700 text-sm font-semibold">{row.feature}</span></div>
              <div className="p-4 text-center border-l border-slate-100 text-slate-400 text-sm flex items-center justify-center">{row.excel}</div>
              <div className="p-4 text-center border-l border-slate-100 text-slate-500 text-sm flex items-center justify-center">{row.mis}</div>
              <div className="p-4 text-center border-l border-blue-100 bg-blue-50/50 font-bold text-sm flex items-center justify-center"><span className={row.gtf.includes('✅')?'text-emerald-600':'text-slate-700'}>{row.gtf}</span></div>
            </motion.div>
          ))}
        </motion.div>
        <p className="text-slate-400 text-xs text-center mt-4">{tx(lang,'★ Diferenciadores exclusivos de Gestiona tu Flotilla','★ Exclusive differentiators of Gestiona tu Flotilla')}</p>
        <div className="mt-8 text-center">
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link href="/registro" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-4 rounded-full text-lg transition-all shadow-xl shadow-blue-600/30 min-h-[52px]">
              {tx(lang,'🏆 Empezar gratis con la versión completa →','🏆 Start free with the full version →')}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { lang } = useLang();
  const steps = lang === 'en' ? [
    { step:'01', icon:'🚀', title:'Create your account in 2 minutes', body:'No credit card. Your platform is active immediately with a full 14-day trial. If you have data in Excel, we import it for you.', color:'from-blue-600 to-blue-700' },
    { step:'02', icon:'🚗', title:'Add your fleet and drivers', body:'Register your vehicles, assign drivers, connect GPS by IMEI, set weekly rents. Our team helps you in the first session.', color:'from-purple-600 to-purple-700' },
    { step:'03', icon:'⚡', title:'Run on autopilot', body:'Automatic collections every Monday, instant fine alerts, weekly WhatsApp reports, PFAE / Tech Platforms accounting ready for your accountant.', color:'from-emerald-600 to-emerald-700' },
  ] : [
    { step:'01', icon:'🚀', title:'Crea tu cuenta en 2 minutos', body:'Sin tarjeta de crédito. Tu plataforma activa de inmediato con 14 días de prueba completa. Si tienes datos en Excel, los importamos por ti.', color:'from-blue-600 to-blue-700' },
    { step:'02', icon:'🚗', title:'Agrega tu flota y choferes', body:'Registra tus vehículos, asigna choferes, conecta el GPS por IMEI, configura las rentas semanales. Nuestro equipo te ayuda en la primera sesión.', color:'from-purple-600 to-purple-700' },
    { step:'03', icon:'⚡', title:'Opera en piloto automático', body:'Cobros automáticos cada lunes, alertas de infracciones al instante, reportes semanales por WhatsApp, contabilidad PFAE / Plataformas Tecnológicas lista para tu contador.', color:'from-emerald-600 to-emerald-700' },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-16">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'🚀 Inicio rápido','🚀 Quick start')}</span>
          <h2 className="text-4xl font-black text-slate-900 mt-3 mb-4">{tx(lang,'Funcionando en','Up and running in')}<br /><span className="text-blue-600">{tx(lang,'menos de 30 minutos.','under 30 minutes.')}</span></h2>
          <p className="text-slate-500 text-lg">{tx(lang,'Sin técnicos · Sin configuración compleja · Soporte incluido','No technicians · No complex setup · Support included')}</p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(s => (
            <motion.div key={s.step} variants={fadeUp} className="text-center">
              <motion.div whileHover={{ rotate:[0,-5,5,0], scale:1.08 }} transition={{ duration:0.4 }}
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-3xl mx-auto mb-5 shadow-xl cursor-default`}>
                {s.icon}
              </motion.div>
              <div className="text-blue-600 font-black text-xs uppercase tracking-widest mb-2">{tx(lang,'PASO','STEP')} {s.step}</div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={VP}
          className="mt-14 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-3xl p-8 text-center">
          <div className="text-4xl mb-3">🎁</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">{tx(lang,'Onboarding gratuito incluido','Free onboarding included')}</h3>
          <p className="text-slate-500 mb-5">{tx(lang,'Cada nuevo cliente recibe una sesión de configuración 1-a-1 con nuestro equipo. Te ayudamos a importar tus datos y dejamos todo funcionando el mismo día.','Every new client gets a 1-on-1 setup session with our team. We help you import your data and leave everything working the same day.')}</p>
          <motion.div whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} className="inline-block">
            <Link href="/registro" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3.5 rounded-full transition-all min-h-[52px]">{tx(lang,'Comenzar ahora →','Get started now →')}</Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── PRICING — toggle anual/mensual + Pro card con glow pulsante ─────────────
function Pricing() {
  const rm = useReducedMotion();
  const { lang } = useLang();
  const [annual, setAnnual] = useState(false);
  const price = (monthly: number) => annual ? Math.round(monthly * 10 / 12) : monthly;
  const fmt = (n: number) => n.toLocaleString('es-MX');
  const perMonth = tx(lang,'MXN/mes','MXN/mo');
  const saveYr = (n: number) => tx(lang,`💰 Ahorras $${fmt(n)}/año`,`💰 Save $${fmt(n)}/year`);
  const starterFeats = lang === 'en' ? ['✅ Vehicles and drivers (add, remove, status)','✅ Weekly statements and manual collection','✅ Insurance and expiration control','✅ Preventive maintenance by mileage','✅ Driver portal (own statements and receipts)','✅ Basic PDF/Excel reports','✅ 2 users included','✅ Email support'] : ['✅ Vehículos y choferes (altas, bajas, estados)','✅ Cuentas semanales y cobro manual','✅ Control de seguros y vencimientos','✅ Mantenimiento preventivo por km','✅ Portal chofer (cuentas y recibos propios)','✅ Reportes básicos PDF/Excel','✅ 2 usuarios incluidos','✅ Soporte por correo'];
  const proFeats = lang === 'en' ? ['✅ Everything in Starter','✅ Real-time GPS (multi-provider)','✅ Automatic WhatsApp to driver/group','✅ Import from Didi Fleet Excel','✅ PFAE / Tech Platforms accounting','✅ Jalisco/CDMX fine sync','✅ Recruitment + driver pipeline','✅ Partners & investors module','✅ Unlimited users','✅ Priority support 5 days/week'] : ['✅ Todo lo del plan Starter','✅ GPS en tiempo real (compatible multi-proveedor)','✅ WhatsApp automático al chofer/grupo','✅ Importación desde Excel Didi Fleet','✅ Contabilidad PFAE / Plataformas Tecnológicas','✅ Sync infracciones Jalisco/CDMX','✅ Reclutamiento + pipeline de choferes','✅ Módulo socios e inversionistas','✅ Usuarios ilimitados','✅ Soporte prioritario 5 días/semana'];
  const entFeats = lang === 'en' ? ['✅ Everything in Pro','✅ Unlimited vehicles','✅ Multi-branch','✅ Your own API + webhooks','✅ Integration with your ERP','✅ Dedicated account manager','✅ 99.9% guaranteed SLA','✅ Custom setup'] : ['✅ Todo lo del plan Pro','✅ Vehículos ilimitados','✅ Multi-sucursal','✅ API + webhooks propios','✅ Integración con tu ERP','✅ Manager de cuenta dedicado','✅ SLA garantizado 99.9%','✅ Configuración a medida'];
  const startTrial = tx(lang,'Empezar 14 días gratis','Start 14-day free trial');

  return (
    <section className="py-24 sm:py-32 bg-slate-950" id="precios">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-10">
          <span className="text-blue-400 font-black text-sm uppercase tracking-widest">{tx(lang,'💳 Planes','💳 Plans')}</span>
          <h2 className="text-4xl font-black text-white mt-3 mb-4">{tx(lang,'Un plan para cada','A plan for every')}<br /><span className="text-blue-400">{tx(lang,'tamaño de flotilla.','fleet size.')}</span></h2>
          <p className="text-slate-400 text-lg">{tx(lang,'Sin contratos forzosos · Cancela cuando quieras · Precios en MXN','No forced contracts · Cancel anytime · Prices in MXN')}</p>
        </motion.div>

        {/* Toggle mensual / anual */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-bold transition-colors ${!annual ? 'text-white' : 'text-slate-500'}`}>{tx(lang,'Mensual','Monthly')}</span>
          <button
            onClick={() => setAnnual(v => !v)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${annual ? 'bg-blue-600' : 'bg-slate-700'}`}
            aria-label="Toggle anual/mensual">
            <motion.div
              className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: annual ? 28 : 0 }}
              transition={{ type:'spring', stiffness:400, damping:30 }}
            />
          </button>
          <span className={`text-sm font-bold transition-colors flex items-center gap-2 ${annual ? 'text-white' : 'text-slate-500'}`}>
            {tx(lang,'Anual','Annual')}
            <AnimatePresence>
              {annual && (
                <motion.span
                  key="savings"
                  initial={{ opacity:0, scale:0.6, x:-8 }}
                  animate={{ opacity:1, scale:1, x:0 }}
                  exit={{ opacity:0, scale:0.6, x:-8 }}
                  transition={{ duration:0.25, ease:EASE }}
                  className="bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                  -17%
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Starter */}
          <motion.div variants={fadeUp} whileHover={{ y:-6, scale:1.01 }} transition={{ duration:0.2 }}
            className="bg-slate-900 rounded-3xl border border-white/10 p-8 cursor-default">
            <div className="text-slate-300 font-black text-lg mb-1">Starter</div>
            <div className="text-slate-500 text-sm mb-5">{tx(lang,'Flotillas pequeñas','Small fleets')}</div>
            <div className="mb-1 h-5">
              {annual && <span className="text-slate-500 line-through text-sm">${fmt(999)}/{tx(lang,'mes','mo')}</span>}
            </div>
            <div className="mb-5 flex items-end gap-1">
              <AnimatePresence mode="wait">
                <motion.span key={annual?'ann':'mon'} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }} transition={{ duration:0.22, ease:EASE }}
                  className="text-5xl font-black text-white tabular-nums">${fmt(price(999))}</motion.span>
              </AnimatePresence>
              <span className="text-slate-400 text-sm mb-1">{perMonth}</span>
            </div>
            {annual && <div className="text-emerald-400 text-xs font-black mb-2">{saveYr(999*2)}</div>}
            <div className="text-blue-400 text-sm font-semibold mb-6">{tx(lang,'Hasta 10 vehículos','Up to 10 vehicles')}</div>
            <div className="space-y-3 mb-8">
              {starterFeats.map(f=><div key={f} className="text-slate-300 text-sm">{f}</div>)}
            </div>
            <Link href="/registro" className="w-full flex justify-center items-center bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-black py-3.5 rounded-xl transition-colors min-h-[52px]">{startTrial}</Link>
          </motion.div>

          {/* Pro — glow pulsante */}
          <motion.div variants={fadeUp}
            whileHover={{ y:-10, scale:1.02 }} transition={{ duration:0.2 }}
            animate={rm ? {} : { boxShadow: ['0 0 40px rgba(37,99,235,0.35), 0 0 80px rgba(37,99,235,0.15)', '0 0 70px rgba(37,99,235,0.65), 0 0 140px rgba(37,99,235,0.3)', '0 0 40px rgba(37,99,235,0.35), 0 0 80px rgba(37,99,235,0.15)'] }}
            style={{ borderRadius: 24 }}
            className="bg-gradient-to-b from-blue-600 to-blue-700 rounded-3xl border border-blue-500 p-8 relative cursor-default">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-black px-5 py-2 rounded-full shadow-lg overflow-hidden whitespace-nowrap">
              {!rm && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x:['-100%','200%'] }}
                  transition={{ duration:1.8, repeat:Infinity, repeatDelay:3 }}
                />
              )}
              {tx(lang,'🔥 Más popular','🔥 Most popular')}
            </div>
            <div className="text-white font-black text-lg mb-1">Pro</div>
            <div className="text-blue-200 text-sm mb-5">{tx(lang,'El favorito de los flotilleros','The fleet owners’ favorite')}</div>
            <div className="mb-1 h-5">
              {annual && <span className="text-blue-300/60 line-through text-sm">${fmt(1999)}/{tx(lang,'mes','mo')}</span>}
            </div>
            <div className="mb-5 flex items-end gap-1">
              <AnimatePresence mode="wait">
                <motion.span key={annual?'ann':'mon'} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }} transition={{ duration:0.22, ease:EASE }}
                  className="text-5xl font-black text-white tabular-nums">${fmt(price(1999))}</motion.span>
              </AnimatePresence>
              <span className="text-blue-200 text-sm mb-1">{perMonth}</span>
            </div>
            {annual && <div className="text-yellow-300 text-xs font-black mb-2">{saveYr(1999*2)}</div>}
            <div className="text-blue-200 text-sm font-semibold mb-6">{tx(lang,'Hasta 30 vehículos','Up to 30 vehicles')}</div>
            <div className="space-y-3 mb-8">
              {proFeats.map(f=><div key={f} className="text-blue-100 text-sm">{f}</div>)}
            </div>
            <Link href="/registro" className="w-full flex justify-center items-center bg-white hover:bg-blue-50 text-blue-700 font-black py-3.5 rounded-xl transition-colors shadow-lg min-h-[52px]">{startTrial}</Link>
          </motion.div>

          {/* Enterprise */}
          <motion.div variants={fadeUp} whileHover={{ y:-6, scale:1.01 }} transition={{ duration:0.2 }}
            className="bg-slate-900 rounded-3xl border border-white/10 p-8 cursor-default">
            <div className="text-slate-300 font-black text-lg mb-1">Enterprise</div>
            <div className="text-slate-500 text-sm mb-5">{tx(lang,'Flotas grandes y empresas','Large fleets and companies')}</div>
            <div className="mb-1 h-5">
              {annual && <span className="text-slate-500 line-through text-sm">${fmt(2999)}/{tx(lang,'mes','mo')}</span>}
            </div>
            <div className="mb-5 flex items-end gap-1">
              <AnimatePresence mode="wait">
                <motion.span key={annual?'ann':'mon'} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }} transition={{ duration:0.22, ease:EASE }}
                  className="text-5xl font-black text-white tabular-nums">${fmt(price(2999))}</motion.span>
              </AnimatePresence>
              <span className="text-slate-400 text-sm mb-1">{perMonth}</span>
            </div>
            {annual && <div className="text-emerald-400 text-xs font-black mb-2">{saveYr(2999*2)}</div>}
            <div className="text-purple-400 text-sm font-semibold mb-6">{tx(lang,'Vehículos ilimitados','Unlimited vehicles')}</div>
            <div className="space-y-3 mb-8">
              {entFeats.map(f=><div key={f} className="text-slate-300 text-sm">{f}</div>)}
            </div>
            <Link href="mailto:hola@gestionatuflotilla.com?subject=Cotización Enterprise" className="w-full flex justify-center items-center bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-xl transition-colors min-h-[52px]">{tx(lang,'Hablar con ventas →','Talk to sales →')}</Link>
          </motion.div>
        </motion.div>

        {/* Módulos a medida */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}
          className="mt-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shrink-0 shadow-lg">🧩</div>
              <div>
                <div className="text-white font-black text-lg mb-1">{tx(lang,'Módulos a medida','Custom modules')}</div>
                <div className="text-slate-400 text-sm max-w-xl">{tx(lang,'¿Necesitas una función específica que no está en los planes? Desarrollamos módulos personalizados según las necesidades de tu operación — integraciones especiales, reportes a medida, flujos únicos para tu flotilla.','Need a specific feature that’s not in the plans? We build custom modules around your operation — special integrations, tailored reports, unique flows for your fleet.')}</div>
              </div>
            </div>
            <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }} className="shrink-0">
              <Link href="mailto:hola@gestionatuflotilla.com?subject=Módulo a medida"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/30 min-h-[52px] whitespace-nowrap">
                {tx(lang,'📩 Contáctanos →','📩 Contact us →')}
              </Link>
            </motion.div>
          </div>
        </motion.div>

        <p className="text-slate-500 text-sm text-center mt-6">{tx(lang,'Sin tarjeta para el trial · El plan se activa solo cuando tú decides continuar','No card for the trial · The plan activates only when you decide to continue')}</p>
      </div>
    </section>
  );
}

// ─── GUARANTEE ────────────────────────────────────────────────────────────────
function Guarantee() {
  const { lang } = useLang();
  const badges = lang === 'en'
    ? ['🔒 No credit card','📆 Full 14 days','🙅 No contracts','💬 Support in Spanish','🚫 Cancel anytime','⚡ Live in 30 minutes']
    : ['🔒 Sin tarjeta de crédito','📆 14 días completos','🙅 Sin contratos','💬 Soporte en español','🚫 Cancela cuando quieras','⚡ Activo en 30 minutos'];
  return (
    <section className="py-16 sm:py-20 bg-emerald-50 border-y border-emerald-200">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP}>
          <div className="text-6xl mb-5">🛡️</div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">{tx(lang,'14 días de prueba. Sin riesgo. Sin tarjeta.','14-day trial. No risk. No card.')}</h2>
          <p className="text-xl text-slate-600 mb-6 max-w-2xl mx-auto">{tx(lang,'Prueba Gestiona tu Flotilla completamente gratis durante 14 días. Acceso a todas las funciones, soporte incluido, sin compromiso. ','Try Gestiona tu Flotilla completely free for 14 days. Access to every feature, support included, no commitment. ')}<strong className="text-slate-900">{tx(lang,'Si en 14 días no ves el valor, simplemente no contratas. Sin preguntas.','If you don’t see the value in 14 days, you simply don’t sign up. No questions asked.')}</strong></p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {badges.map(t => (
              <motion.span key={t} whileHover={{ scale:1.04 }} transition={{ duration:0.15 }}
                className="bg-white border border-emerald-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full shadow-sm cursor-default">{t}</motion.span>
            ))}
          </div>
          <motion.div whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }} className="inline-block">
            <Link href="/registro" className="inline-flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-5 rounded-full text-lg transition-all shadow-2xl shadow-emerald-500/30 min-h-[56px]">
              {tx(lang,'🚀 Activar prueba gratis ahora →','🚀 Activate free trial now →')}
            </Link>
          </motion.div>
          <p className="text-slate-400 text-sm mt-4">{tx(lang,'Únete a los flotilleros que ya la están usando.','Join the fleet owners already using it.')}</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FAQ — AnimatePresence accordion ─────────────────────────────────────────
function FAQ() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(null);
  const faqs = lang === 'en' ? [
    { q:'Do I need technical knowledge to set it up?', a:'Not at all. If you know how to use WhatsApp and Excel, you can use Gestiona tu Flotilla. Plus, every new client gets a 1-on-1 onboarding session with our team.' },
    { q:'Does it work for Didi, Uber and InDriver at the same time?', a:'Yes. You can manage vehicles assigned to any ridesharing platform. Pro-rata Didi import is native. For Uber and InDriver you can enter data manually or import from Excel.' },
    { q:'Does fine sync work across all of Mexico?', a:'We currently have active integration with SSIM Guadalajara and the Jalisco state portal. We’re expanding to Mexico City, Monterrey and Puebla.' },
    { q:'Do I need to buy special GPS hardware?', a:'Not necessarily. We integrate with the market’s leading GPS providers — if you already have devices, you connect them by IMEI directly in the app. If you don’t have GPS, the system works perfectly without it.' },
    { q:'Can I import my data from Excel?', a:'Yes. We have an import tool for vehicles, drivers and historical statements. If you’d rather not do it yourself, our team does it in your onboarding session.' },
    { q:'What happens to my data if I cancel?', a:'Your data is yours. You can export all the information in Excel/CSV before canceling. You have 30 days to export everything.' },
    { q:'Are prices in Mexican pesos?', a:'Yes, 100%. $999, $1,999 and $2,999 Mexican pesos per month. No conversions, no dollars, no surprises. We invoice with CFDI if you need it.' },
    { q:'Does it work for delivery or school-transport fleets?', a:'Many features are useful for any type of fleet (GPS, maintenance, insurance). The statements module is optimized for Didi/Uber/InDriver. Book a demo and we’ll evaluate together.' },
  ] : [
    { q:'¿Necesito conocimientos técnicos para configurarlo?', a:'Para nada. Si sabes usar WhatsApp y Excel, puedes usar Gestiona tu Flotilla. Además, cada nuevo cliente recibe una sesión de onboarding 1-a-1 con nuestro equipo.' },
    { q:'¿Funciona para Didi, Uber e InDriver al mismo tiempo?', a:'Sí. Puedes gestionar vehículos asignados a cualquier plataforma de ridesharing. La importación pro-rata de Didi es nativa. Para Uber e InDriver puedes ingresar datos manualmente o importar desde Excel.' },
    { q:'¿La sincronización de infracciones funciona en todo México?', a:'Actualmente tenemos integración activa con el SSIM Guadalajara y el portal estatal de Jalisco. Estamos expandiendo a CDMX, Monterrey y Puebla.' },
    { q:'¿Necesito comprar hardware GPS especial?', a:'No necesariamente. Nos integramos con los principales proveedores de GPS del mercado — si ya tienes dispositivos, los conectas por IMEI directo en la app. Si no tienes GPS, el sistema funciona perfectamente sin él.' },
    { q:'¿Puedo importar mis datos desde Excel?', a:'Sí. Tenemos una herramienta de importación para vehículos, choferes y cuentas históricas. Si no quieres hacerlo tú, nuestro equipo lo hace en tu sesión de onboarding.' },
    { q:'¿Qué pasa con mis datos si cancelo?', a:'Tus datos son tuyos. Puedes exportar toda la información en Excel/CSV antes de cancelar. Tienes 30 días para exportar todo.' },
    { q:'¿El precio es en pesos mexicanos?', a:'Sí, 100%. $999, $1,999 y $2,999 pesos mexicanos por mes. Sin conversiones, sin dólares, sin sorpresas. Facturamos con CFDI si lo necesitas.' },
    { q:'¿Funciona para flotas de reparto o transporte escolar?', a:'Muchas funciones son útiles para cualquier tipo de flota (GPS, mantenimiento, seguros). El módulo de cuentas está optimizado para Didi/Uber/InDriver. Agenda una demo y evaluamos juntos.' },
  ];
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VP} className="text-center mb-14">
          <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'❓ Preguntas','❓ FAQ')}</span>
          <h2 className="text-4xl font-black text-slate-900 mt-3 mb-4">{tx(lang,'Preguntas frecuentes','Frequently asked questions')}</h2>
          <p className="text-slate-500">{tx(lang,'¿Tienes otra pregunta? ','Have another question? ')}<a href="mailto:hola@gestionatuflotilla.com" className="text-blue-600 font-semibold hover:underline">hola@gestionatuflotilla.com</a></p>
        </motion.div>
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP} className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div key={i} variants={fadeUp}
              className={`border rounded-2xl overflow-hidden transition-colors ${open===i?'border-blue-300 shadow-md shadow-blue-100':'border-slate-200 hover:border-slate-300'}`}>
              <button className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 min-h-[60px]" onClick={() => setOpen(open===i?null:i)}>
                <span className="font-black text-slate-900 text-sm sm:text-base">{faq.q}</span>
                <motion.span animate={{ rotate:open===i?180:0 }} transition={{ duration:0.2, ease:EASE }} className="text-blue-500 text-xl shrink-0 font-black">
                  {open===i?'−':'+'}
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open===i && (
                  <motion.div key="answer" initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.28, ease:EASE }} className="overflow-hidden">
                    <div className="px-6 pb-5 pt-0"><p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── FOUNDER STORY ────────────────────────────────────────────────────────────
function FounderStory() {
  const { lang } = useLang();
  return (
    <section className="py-20 sm:py-24 bg-slate-50 border-y border-slate-200">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP}
          className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center">
          <motion.div variants={fadeIn} className="flex flex-col items-center md:items-start">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-4xl shadow-xl mb-3">👋</div>
            <div className="text-slate-900 font-black text-sm">JP Fierro</div>
            <div className="text-slate-500 text-xs">{tx(lang,'Fundador & flotillero','Founder & fleet owner')}</div>
            <div className="text-slate-400 text-xs">Guadalajara, México</div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <span className="text-blue-600 font-black text-sm uppercase tracking-widest">{tx(lang,'💬 Por qué lo construí','💬 Why I built it')}</span>
            <h3 className="text-2xl font-black text-slate-900 mt-2 mb-4">{tx(lang,'"Lo construí porque yo mismo era el flotillero con el Excel caótico."','"I built it because I was the fleet owner with the chaotic Excel."')}</h3>
            <div className="text-slate-600 text-base leading-relaxed space-y-3">
              <p>{tx(lang,'Manejé una flotilla de vehículos Didi en Guadalajara. Cada lunes era un caos: Excel mal actualizado, WhatsApps de choferes que no contestaban, infracciones que descubría semanas después.','I ran a fleet of Didi vehicles in Guadalajara. Every Monday was chaos: a poorly updated Excel, drivers’ WhatsApps that went unanswered, fines I discovered weeks later.')}</p>
              <p>{tx(lang,'Busqué software que resolviera esto. Nada era específico para México, ninguno hablaba de PFAE ni del SSIM de GDL.','I looked for software to solve it. Nothing was specific to Mexico, none spoke about PFAE or the GDL SSIM.')}</p>
              <p><strong className="text-slate-900">{tx(lang,'Así que lo construí.','So I built it.')}</strong> {tx(lang,'Gestiona tu Flotilla nació de un problema real, probado en una flotilla real, con las necesidades reales de un flotillero mexicano.','Gestiona tu Flotilla was born from a real problem, tested on a real fleet, with the real needs of a Mexican fleet owner.')}</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const rm = useReducedMotion();
  const { lang } = useLang();
  const badges = lang === 'en'
    ? ['🔒 No card','📆 14 days free','🇲🇽 Built in Mexico','💬 Support in Spanish']
    : ['🔒 Sin tarjeta','📆 14 días gratis','🇲🇽 Hecho en México','💬 Soporte en español'];
  return (
    <section className="relative py-32 sm:py-40 overflow-hidden">
      <Image src="/fleet-bg.png" alt="" fill className="object-cover object-center" loading="lazy" />
      <div className="absolute inset-0 bg-slate-950/92" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950" />
      {!rm && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:`linear-gradient(rgba(59,130,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.06) 1px,transparent 1px)`,
          backgroundSize:'64px 64px',
        }} />
      )}
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={VP}
        className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 text-center">
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-sm font-black px-5 py-2.5 rounded-full mb-8">
          {tx(lang,'✅ Flotillas en México ya operando en automático','✅ Fleets in Mexico already running on autopilot')}
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-5xl sm:text-6xl font-black text-white mb-6 leading-tight">
          {tx(lang,'Tu flotilla puede','Your fleet can')}<br />{tx(lang,'trabajar para ti','work for you')}<br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{tx(lang,'desde mañana.','starting tomorrow.')}</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          {tx(lang,'Empieza hoy sin tarjeta. 14 días de prueba completa. Soporte en español incluido. Tu primer lunes automático puede ser este lunes.','Start today with no card. A full 14-day trial. Support in Spanish included. Your first automated Monday can be this Monday.')}
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <motion.div whileHover={{ scale:1.04, y:-3 }} whileTap={{ scale:0.97 }}>
            <Link href="/registro" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black px-10 py-5 rounded-full text-xl transition-all shadow-2xl shadow-blue-600/50 min-h-[60px]">
              {tx(lang,'🚀 Empezar gratis ahora →','🚀 Start free now →')}
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}>
            <Link href="/api/demo/access" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-10 py-5 rounded-full text-lg transition-all min-h-[60px]">{tx(lang,'▶ Ver demo primero','▶ See the demo first')}</Link>
          </motion.div>
        </motion.div>
        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4 text-slate-400 text-sm">
          {badges.map(t=>(
            <span key={t} className="flex items-center gap-1">{t}</span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── WHATSAPP FAB ────────────────────────────────────────────────────────────
function WhatsAppFAB() {
  return (
    <motion.a
      href="https://wa.me/5213313861712?text=Hola,%20me%20interesa%20Gestiona%20tu%20Flotilla"
      target="_blank" rel="noopener noreferrer"
      initial={{ scale:0, opacity:0 }}
      animate={{ scale:1, opacity:1 }}
      transition={{ delay:1.5, duration:0.4, type:'spring', stiffness:200 }}
      whileHover={{ scale:1.12, y:-3 }}
      whileTap={{ scale:0.95 }}
      className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50"
      aria-label="Contactar por WhatsApp">
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    </motion.a>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer() {
  const { lang } = useLang();
  const product = lang === 'en'
    ? [{label:'Features',href:'#funciones'},{label:'Pricing',href:'#precios'},{label:'Live demo',href:'/api/demo/access'},{label:'Sign up',href:'/registro'},{label:'Log in',href:'/login'}]
    : [{label:'Funciones',href:'#funciones'},{label:'Precios',href:'#precios'},{label:'Demo en vivo',href:'/api/demo/access'},{label:'Registrarse',href:'/registro'},{label:'Iniciar sesión',href:'/login'}];
  const forFleets = lang === 'en'
    ? ['Didi fleets','Uber fleets','InDriver fleets','Fine control','GPS for fleets','PFAE accounting']
    : ['Flotillas Didi','Flotillas Uber','Flotillas InDriver','Control de infracciones','GPS para flotillas','Contabilidad PFAE'];
  const legal = lang === 'en'
    ? [{label:'Terms of use',href:'/terminos'},{label:'Privacy',href:'/privacidad'},{label:'Data Policy',href:'/datos'},{label:'Brand & Licenses',href:'/marca'},{label:'Live demo',href:'/api/demo/access'}]
    : [{label:'Términos de uso',href:'/terminos'},{label:'Privacidad',href:'/privacidad'},{label:'Política de Datos',href:'/datos'},{label:'Marca y Licencias',href:'/marca'},{label:'Demo en vivo',href:'/api/demo/access'}];
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Logo size={42} />
              <span className="text-white font-black">Gestiona tu Flotilla</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">{tx(lang,'Software de gestión para flotillas Didi, Uber e InDriver en México. Hecho en Guadalajara, Jalisco. 🇲🇽','Fleet management software for Didi, Uber and InDriver fleets in Mexico. Built in Guadalajara, Jalisco. 🇲🇽')}</p>
            <div className="flex gap-3">{['🔒 SSL','🇲🇽 México','💬 Español'].map(c=><span key={c} className="text-slate-500 text-xs border border-white/10 px-2 py-1 rounded-lg">{c}</span>)}</div>
          </div>
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">{tx(lang,'Producto','Product')}</h4>
            <ul className="space-y-2.5">
              {product.map(l=>(
                <li key={l.label}><Link href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">{tx(lang,'Para flotilleros','For fleet owners')}</h4>
            <ul className="space-y-2.5">
              {forFleets.map(l=>(
                <li key={l}><span className="text-slate-500 text-sm">{l}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">{tx(lang,'Legal y Contacto','Legal & Contact')}</h4>
            <ul className="space-y-2.5 mb-6">
              {legal.map(l=>(
                <li key={l.label}><Link href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">{l.label}</Link></li>
              ))}
            </ul>
            <div className="space-y-2">
              <a href="mailto:hola@gestionatuflotilla.com" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">📧 hola@gestionatuflotilla.com</a>
              <a href="https://wa.me/5213313861712" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">{tx(lang,'💬 WhatsApp Ventas','💬 WhatsApp Sales')}</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} Gestiona tu Flotilla · {tx(lang,'Hecho con ❤️ en Guadalajara, Jalisco, México','Made with ❤️ in Guadalajara, Jalisco, Mexico')} 🇲🇽</p>
          <span className="text-slate-500 text-xs">{tx(lang,'🔒 Datos en México · SSL · Multi-tenant seguro','🔒 Data in Mexico · SSL · Secure multi-tenant')}</span>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLangState] = useState<Lang>('es');

  // Restaurar idioma guardado
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage.getItem('gtf_lang')) as Lang | null;
    if (saved === 'es' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') window.localStorage.setItem('gtf_lang', l);
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  };

  return (
    <LangCtx.Provider value={{ lang, setLang }}>
      <main className="min-h-screen">
        <CursorGlow />
        <ScrollProgress />
        <Nav />
        <Hero />
        <LiveTicker />
        <SocialProofBar />
        <IntegrationLogos />
        <BeforeAfter />
        <ROICalculator />
        <AppShowcase />
        <Features />
        <Numbers />
        <Testimonials />
        <Comparison />
        <HowItWorks />
        <Pricing />
        <Guarantee />
        <FAQ />
        <FounderStory />
        <FinalCTA />
        <WhatsAppFAB />
        <Footer />
      </main>
    </LangCtx.Provider>
  );
}
