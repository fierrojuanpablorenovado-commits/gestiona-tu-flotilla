'use client';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastProvider } from '@/context/ToastContext';
import { ToastStack } from '@/components/ui/ToastStack';
import { GlobalSearch } from '@/components/ui/GlobalSearch';
import { PushBanner } from './PushBanner';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Cerrar sidebar al cambiar de ruta en móvil
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-950">
        {/* Overlay móvil */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

        <main className="flex-1 min-w-0 md:ml-[252px] transition-all duration-300">
          {/* Barra superior móvil con hamburguesa */}
          <div className="sticky top-0 z-20 flex items-center gap-3 bg-slate-900 border-b border-slate-700/50 px-4 py-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white">Gestiona tu Flotilla</span>
          </div>
          {children}
        </main>
      </div>
      <ToastStack />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <PushBanner />
    </ToastProvider>
  );
}
