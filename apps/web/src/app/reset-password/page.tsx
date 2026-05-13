'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    if (!token) setError('Enlace inválido. Solicita uno nuevo desde la página de login.');
  }, [token]);

  const validate = () => {
    if (!password) return 'Ingresa una contraseña';
    if (password.length < 8) return 'Mínimo 8 caracteres';
    if (password !== confirm) return 'Las contraseñas no coinciden';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.message || 'Error al restablecer'); return; }
      setSuccess(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Contraseña actualizada</h2>
        <p className="text-sm text-slate-500 mb-6">
          Tu contraseña se cambió correctamente. Ya puedes iniciar sesión.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Ir al login
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Enlace inválido</h2>
        <p className="text-sm text-slate-500 mb-6">Este enlace no es válido o ya fue usado.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 mb-5">
        <ShieldCheck className="h-6 w-6 text-blue-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Nueva contraseña</h1>
      <p className="text-sm text-slate-500 mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPw(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 h-11"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            : 'Guardar nueva contraseña'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-between mb-8">
          <Link href="/login" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Link>
          <span className="text-sm font-bold text-slate-700">Gestiona tu Flotilla</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-10 bg-slate-100 rounded-lg" /><div className="h-10 bg-slate-100 rounded-lg" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

      </div>
    </div>
  );
}
