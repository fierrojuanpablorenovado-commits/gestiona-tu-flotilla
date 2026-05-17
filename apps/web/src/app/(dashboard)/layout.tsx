import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// ❌ Bloquear indexación de TODAS las páginas del dashboard
// Contienen datos privados y confidenciales del tenant
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
