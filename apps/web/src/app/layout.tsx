import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Gestiona tu Flotilla — Software para flotillas de Didi y Uber en México',
  description: 'Administra vehículos, choferes, cuentas semanales, GPS e impuestos ISR/IVA desde una sola plataforma. Hecho para flotillas de Didi, Uber e InDriver en México. Desde $499/mes.',
  keywords: ['software flotillas mexico', 'administracion flotillas didi', 'gestion vehiculos mexico', 'cuentas semanales choferes', 'gestión de flotillas', 'administración vehicular', 'Uber Didi flotilla', 'GPS vehicular', 'ISR IVA RESICO flotilla'],
  openGraph: {
    title: 'Gestiona tu Flotilla — La app para flotillas de Didi y Uber en México',
    description: 'Cuentas semanales automáticas, GPS, ISR/IVA RESICO y más. Prueba 14 días gratis.',
    url: 'https://gestionatuflotilla.com',
    siteName: 'Gestiona tu Flotilla',
    images: [
      {
        url: 'https://gestionatuflotilla.com/fleet-icon.png',
        width: 512,
        height: 512,
        alt: 'Gestiona tu Flotilla',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestiona tu Flotilla — La app para flotillas de Didi y Uber en México',
    description: 'Cuentas semanales automáticas, GPS, ISR/IVA RESICO y más. Prueba 14 días gratis.',
    images: ['https://gestionatuflotilla.com/fleet-icon.png'],
  },
  metadataBase: new URL('https://gestionatuflotilla.com'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GtFlotilla" />
        <link rel="apple-touch-icon" href="/fleet-icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </body>
    </html>
  );
}
