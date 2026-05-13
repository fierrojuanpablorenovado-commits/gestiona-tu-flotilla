'use client';

/**
 * ScanFactura — Componente de captura OCR de facturas/tickets
 *
 * Permite:
 * 1. Subir imagen (foto del ticket) o PDF
 * 2. Tomar foto desde cámara del celular (input capture)
 * 3. Claude Vision extrae concepto, monto, fecha, categoría
 * 4. Muestra preview editable antes de guardar
 * 5. Confirmar → guarda en accounting_records vía /api/accounting/scan
 */

import { useState, useRef } from 'react';
import {
  Camera,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ScanLine,
  Receipt,
  Sparkles,
  Edit3,
  Save,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  combustible:  'Combustible',
  mantenimiento:'Mantenimiento',
  seguro:       'Seguros',
  servicios:    'Servicios',
  otros:        'Otros',
};

interface OcrResult {
  concepto:        string;
  monto:           number;
  fecha:           string;
  numero_factura:  string | null;
  rfc_emisor:      string | null;
  categoria:       string;
  es_deducible:    boolean;
  iva_incluido:    number;
  notas:           string | null;
}

interface ScanFacturaProps {
  onSaved?: (record: any) => void;
}

export function ScanFactura({ onSaved }: ScanFacturaProps) {
  const [mode, setMode]       = useState<'idle' | 'scanning' | 'review' | 'saving' | 'done' | 'error'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [ocr, setOcr]         = useState<OcrResult | null>(null);
  const [editOcr, setEditOcr] = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileRef  = useRef<HTMLInputElement>(null);
  const camRef   = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // Preview
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setMode('scanning');
    setErrorMsg('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/accounting/scan', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'Error al procesar la imagen');
        setMode('error');
        return;
      }

      const ocrData: OcrResult = {
        concepto:       data.ocr.concepto     || '',
        monto:          Number(data.ocr.monto) || 0,
        fecha:          data.ocr.fecha         || new Date().toISOString().slice(0, 10),
        numero_factura: data.ocr.numero_factura || null,
        rfc_emisor:     data.ocr.rfc_emisor    || null,
        categoria:      data.ocr.categoria     || 'otros',
        es_deducible:   data.ocr.es_deducible  !== false,
        iva_incluido:   Number(data.ocr.iva_incluido) || 0,
        notas:          data.ocr.notas         || null,
      };

      setOcr(ocrData);
      setEditOcr({ ...ocrData });
      setMode('review');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red');
      setMode('error');
    }
  };

  const handleSave = async () => {
    if (!editOcr) return;
    setMode('saving');

    // Re-guardar con los datos editados (si el usuario corrigió algo)
    // Creamos el registro directamente desde el cliente usando el POST normal de accounting
    try {
      const d = new Date(editOcr.fecha + 'T12:00:00');
      const month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
      const year  = isNaN(d.getTime()) ? new Date().getFullYear()  : d.getFullYear();

      const res = await fetch('/api/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_month:   month,
          period_year:    year,
          source:         'ocr_app',
          category:       editOcr.categoria,
          description:    editOcr.concepto,
          amount:         editOcr.monto,
          is_income:      false,
          is_deductible:  editOcr.es_deducible,
          invoice_number: editOcr.numero_factura || null,
          via:            'ocr_app',
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.message || 'Error al guardar');
        setMode('error');
        return;
      }

      const saved = await res.json();
      setMode('done');
      onSaved?.(saved.record);
    } catch (err: any) {
      setErrorMsg(err.message);
      setMode('error');
    }
  };

  const reset = () => {
    setMode('idle');
    setPreview(null);
    setOcr(null);
    setEditOcr(null);
    setErrorMsg('');
  };

  return (
    <div className="space-y-4">

      {/* ── ESTADO IDLE ─────────────────────────────────────────────────────── */}
      {mode === 'idle' && (
        <div className="rounded-2xl border-2 border-dashed border-blue-300/40 bg-blue-500/5 p-6">
          <div className="flex flex-col items-center gap-3 text-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30">
              <ScanLine className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Escanear factura con IA</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Sube una foto de tu ticket, factura o comprobante — Claude extrae el monto, concepto y fecha automáticamente
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => camRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-blue-500/40 transition-all text-center group"
            >
              <Camera className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-white">Tomar foto</span>
              <span className="text-[11px] text-slate-400">Cámara del celular</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-blue-500/40 transition-all text-center group"
            >
              <FileImage className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-white">Subir imagen</span>
              <span className="text-[11px] text-slate-400">JPG, PNG, PDF</span>
            </button>
          </div>
          {/* Inputs ocultos */}
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value=''; }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value=''; }}
          />
          {/* Nota WhatsApp */}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-500/5 border border-green-500/20 px-3 py-2.5">
            <span className="text-base">💬</span>
            <p className="text-[11px] text-slate-400">
              <span className="text-green-400 font-semibold">¿Prefieres usar WhatsApp?</span>{' '}
              Manda la foto de tu factura a <span className="text-white font-mono">+52 xxx xxxx xxxx</span> y se guarda automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* ── ESTADO SCANNING ─────────────────────────────────────────────────── */}
      {mode === 'scanning' && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            {preview && (
              <div className="relative">
                <img src={preview} alt="Factura" className="h-40 w-40 object-cover rounded-xl border border-slate-600 opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl bg-black/60 p-3">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="text-white font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                Claude está leyendo tu factura...
              </p>
              <p className="text-slate-400 text-xs mt-1">Identificando concepto, monto, fecha y categoría</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADO REVIEW ───────────────────────────────────────────────────── */}
      {mode === 'review' && editOcr && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-green-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
              <Sparkles className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">IA extrajo estos datos</p>
              <p className="text-slate-400 text-xs">Revisa y corrige si es necesario antes de guardar</p>
            </div>
            {preview && (
              <img src={preview} alt="preview" className="ml-auto h-12 w-12 object-cover rounded-lg border border-slate-600 flex-shrink-0" />
            )}
          </div>

          <div className="p-5 space-y-3">
            {/* Concepto */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Concepto</label>
              <input
                type="text"
                value={editOcr.concepto}
                onChange={e => setEditOcr(p => p ? { ...p, concepto: e.target.value } : p)}
                className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Monto */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Monto (MXN)</label>
                <input
                  type="number"
                  value={editOcr.monto}
                  onChange={e => setEditOcr(p => p ? { ...p, monto: Number(e.target.value) } : p)}
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Fecha */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                <input
                  type="date"
                  value={editOcr.fecha}
                  onChange={e => setEditOcr(p => p ? { ...p, fecha: e.target.value } : p)}
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Categoría */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Categoría</label>
                <select
                  value={editOcr.categoria}
                  onChange={e => setEditOcr(p => p ? { ...p, categoria: e.target.value } : p)}
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {/* No. Factura */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">No. Factura</label>
                <input
                  type="text"
                  value={editOcr.numero_factura || ''}
                  onChange={e => setEditOcr(p => p ? { ...p, numero_factura: e.target.value || null } : p)}
                  placeholder="Opcional"
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* IVA y deducible */}
            <div className="flex items-center gap-4">
              {editOcr.iva_incluido > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">IVA:</span>
                  <span className="text-purple-400 font-semibold">${editOcr.iva_incluido.toFixed(2)}</span>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editOcr.es_deducible}
                  onChange={e => setEditOcr(p => p ? { ...p, es_deducible: e.target.checked } : p)}
                  className="rounded"
                />
                <span className="text-sm text-slate-300">Gasto deducible</span>
              </label>
              {editOcr.rfc_emisor && (
                <span className="ml-auto text-xs text-slate-400 font-mono">RFC: {editOcr.rfc_emisor}</span>
              )}
            </div>

            {/* Notas de IA */}
            {editOcr.notas && (
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 px-3 py-2">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Nota IA</p>
                <p className="text-xs text-slate-400">{editOcr.notas}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors">
                <X className="h-4 w-4" /> Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
              >
                <Save className="h-4 w-4" />
                Guardar gasto — ${editOcr.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADO SAVING ───────────────────────────────────────────────────── */}
      {mode === 'saving' && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8 text-center">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white font-semibold">Guardando gasto...</p>
        </div>
      )}

      {/* ── ESTADO DONE ─────────────────────────────────────────────────────── */}
      {mode === 'done' && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6 text-center space-y-3">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
          <div>
            <p className="text-white font-bold text-lg">¡Gasto guardado!</p>
            <p className="text-slate-400 text-sm mt-1">Aparece en Facturas y Deducciones de este mes</p>
          </div>
          <button onClick={reset} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
            <ScanLine className="h-4 w-4" /> Escanear otra factura
          </button>
        </div>
      )}

      {/* ── ESTADO ERROR ────────────────────────────────────────────────────── */}
      {mode === 'error' && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <div>
            <p className="text-white font-semibold">No se pudo procesar</p>
            <p className="text-slate-400 text-sm mt-1">{errorMsg}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
