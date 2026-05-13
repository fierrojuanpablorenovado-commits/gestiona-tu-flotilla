import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/landing/LandingPage';

export default function Home() {
  const host = headers().get('host') || '';

  // Solo el dominio RAÍZ muestra la landing page
  // app., demo., vercel.app y cualquier otro van directo al login
  const isRootDomain =
    host === 'gestionatuflotilla.com' ||
    host === 'www.gestionatuflotilla.com';

  if (!isRootDomain) {
    redirect('/login');
  }

  return <LandingPage />;
}
