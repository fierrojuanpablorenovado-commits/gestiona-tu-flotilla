import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'Gestiona tu Flotilla — Software para flotillas Didi, Uber e InDriver en México',
  description: 'Controla tus vehículos, choferes y cobros semanales desde un solo lugar. WhatsApp integrado, GPS, infracciones automáticas. Desde $499/mes. 14 días gratis.',
  keywords: [
    'flotilla vehicular',
    'gestión flotilla',
    'software didi uber',
    'administrar choferes',
    'cuentas semanales',
    'software flotillas mexico',
    'administracion flotillas didi',
    'gestion vehiculos mexico',
    'GPS vehicular',
    'ISR IVA PFAE plataformas tecnologicas flotilla',
  ],
  openGraph: {
    title: 'Gestiona tu Flotilla — Software para flotillas Didi y Uber México',
    description: 'Controla cobros semanales, GPS, seguros e infracciones desde un solo lugar.',
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
    title: 'Gestiona tu Flotilla — Software para flotillas Didi y Uber México',
    description: 'Controla cobros semanales, GPS, seguros e infracciones desde un solo lugar.',
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
        {/* Cierra CRM — Lead capture widget */}
        <Script
          src="https://cierra-crm.vercel.app/widget.js"
          strategy="lazyOnload"
          data-key={process.env.NEXT_PUBLIC_CRM_KEY || ''}
          data-project="FleetCore SaaS"
          data-title="¿Interesado en gestionar tu flotilla?"
          data-cta="Quiero una demo"
          data-color="#2563eb"
        />
      </body>
    </html>
  );
}
