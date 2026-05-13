'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ToastProvider } from '@/context/ToastContext';
import { ToastStack } from '@/components/ui/ToastStack';
import { GlobalSearch } from '@/components/ui/GlobalSearch';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

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

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-[280px] transition-all duration-300">
          {children}
        </main>
      </div>
      <ToastStack />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </ToastProvider>
  );
}
