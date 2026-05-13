'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, Copy, CheckCircle2, KeyRound } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [resetLink, setResetLink] = useState('');
  const [copied, setCopied]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Ingresa tu correo'); return; }
    setLoading(true); setError(''); setResetLink('');

    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.message || 'Error al procesar'); return; }

      if (data.token) {
        const base = window.location.origin;
        setResetLink(`${base}/reset-password?token=${data.token}`);
      } else {
        // Correo no encontrado — mostramos mensaje genérico por seguridad
        setResetLink('not_found');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        {/* Logo + back */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/login" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">Gestiona tu Flotilla</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

          {resetLink === '' && (
            <>
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 mb-5">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">Recuperar contraseña</h1>
              <p className="text-sm text-slate-500 mb-6">
                Ingresa el correo de tu cuenta y te generamos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 h-11"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando enlace...</> : 'Generar enlace de recuperación'}
                </button>
              </form>
            </>
          )}

          {resetLink === 'not_found' && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Listo</h2>
              <p className="text-sm text-slate-500 mb-6">
                Si ese correo está registrado, se generó un enlace de recuperación. Revisa tu bandeja de entrada.
              </p>
              <Link href="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Volver al login
              </Link>
            </div>
          )}

          {resetLink && resetLink !== 'not_found' && (
            <div>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900 mb-1 text-center">Enlace generado</h2>
              <p className="text-sm text-slate-500 mb-5 text-center">
                Copia este enlace y ábrelo en tu navegador para crear una nueva contraseña. Válido por <strong>1 hora</strong>.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-500 font-mono break-all leading-relaxed">{resetLink}</p>
              </div>

              <button
                onClick={copyLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 mb-4"
              >
                {copied
                  ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Copiado</>
                  : <><Copy className="h-4 w-4" /> Copiar enlace</>}
              </button>

              <Link
                href={resetLink}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Abrir enlace ahora
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
