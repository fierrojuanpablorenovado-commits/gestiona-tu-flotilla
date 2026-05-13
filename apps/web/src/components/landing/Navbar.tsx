'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowRight, Menu, X, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES, LangCode } from '@/lib/translations';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, t, setLang } = useLanguage();

  const currentLang = LANGUAGES.find(l => l.code === lang)!;

  const handleLang = (code: LangCode) => {
    setLang(code);
    setLangOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <div className="flex-shrink-0 rounded-2xl overflow-hidden shadow-xl border-2 border-slate-100" style={{ width: 80, height: 80 }}>
              <Image src="/fleet-icon.png" alt="Gestiona tu Flotilla" width={160} height={107}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.5)', transformOrigin: 'center' }}
                className="block"
              />
            </div>
            <span className="text-xl font-black text-slate-900">Gestiona tu Flotilla</span>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">{t.nav.features}</a>
            <a href="#flotillas"       className="hover:text-blue-600 transition-colors">{t.nav.fleets}</a>
            <Link href="/planes"       className="hover:text-blue-600 transition-colors">{t.nav.pricing}</Link>
            <a href="#contacto"        className="hover:text-blue-600 transition-colors">{t.nav.contact}</a>
          </div>

          {/* CTAs + Language — desktop */}
          <div className="hidden md:flex items-center gap-3">

            {/* Language picker */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                <Globe className="h-4 w-4" />
                <span className="text-base">{currentLang.flag}</span>
                <span className="hidden lg:inline">{currentLang.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => handleLang(l.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors ${
                        lang === l.code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">
              {t.nav.login}
            </Link>
            <Link href="/registro" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
              {t.nav.startFull} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile language picker */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="text-base">{currentLang.flag}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => handleLang(l.code)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors ${
                        lang === l.code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/registro" className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg">
              {t.nav.start} <ArrowRight className="h-3 w-3" />
            </Link>
            <button onClick={() => setOpen(!open)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
          {[
            { label: t.nav.features, href: '#caracteristicas' },
            { label: t.nav.fleets,   href: '#flotillas' },
            { label: t.nav.pricing,  href: '/planes' },
            { label: t.nav.contact,  href: '#contacto' },
            { label: t.nav.login,    href: '/login' },
          ].map(item => (
            <a key={item.href} href={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
              {item.label}
            </a>
          ))}
          <Link href="/registro" onClick={() => setOpen(false)}
            className="block mt-2 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors">
            {t.nav.startFull} →
          </Link>
        </div>
      )}

      {/* Close lang dropdown on outside click */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </nav>
  );
}
