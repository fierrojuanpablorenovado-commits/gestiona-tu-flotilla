'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Upload,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Table2,
  Car,
  Users,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';

// ── Plantillas ────────────────────────────────────────────────────────────────

const VEHICLE_HEADERS = ['eco', 'marca', 'modelo', 'año', 'color', 'placa', 'niv', 'status'];
const VEHICLE_EXAMPLES = [
  ['ECO-001', 'Nissan', 'Sentra', 2023, 'Blanco', 'ABC-123-A', '3N1AB7AP4NL000001', 'active'],
  ['ECO-002', 'Toyota', 'Corolla', 2022, 'Gris', 'BCD-234-B', '2T1BURHE0JC000002', 'active'],
  ['ECO-003', 'Chevrolet', 'Aveo', 2021, 'Negro', 'CDE-345-C', 'KL1TE26J57B000003', 'workshop'],
];

const DRIVER_HEADERS = ['nombre', 'apellido', 'telefono', 'correo', 'licencia', 'tipo_licencia', 'fecha_ingreso', 'status'];
const DRIVER_EXAMPLES = [
  ['Carlos', 'Hernández García', '55-1234-5678', 'carlos@ejemplo.mx', 'CDMX-B-2022-001', 'B', '2022-01-15', 'active'],
  ['María', 'López Ramírez', '55-2345-6789', 'maria@ejemplo.mx', 'CDMX-B-2021-002', 'B', '2021-06-01', 'active'],
  ['Roberto', 'Pérez Jiménez', '55-3456-7890', 'roberto@ejemplo.mx', 'CDMX-C-2020-003', 'C', '2020-09-10', 'active'],
];

function downloadTemplate(type: 'vehicles' | 'drivers') {
  const headers = type === 'vehicles' ? VEHICLE_HEADERS : DRIVER_HEADERS;
  const examples = type === 'vehicles' ? VEHICLE_EXAMPLES : DRIVER_EXAMPLES;
  const sheetName = type === 'vehicles' ? 'Vehiculos' : 'Choferes';
  const fileName = type === 'vehicles' ? 'plantilla_vehiculos.xlsx' : 'plantilla_choferes.xlsx';

  const wb = XLSX.utils.book_new();
  const data = [headers, ...examples];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ancho de columnas
  ws['!cols'] = headers.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ImportResult {
  type: string;
  imported: number;
  skipped: number;
  errors: string[];
}

type PreviewRow = Record<string, string | number | boolean | null>;

// ── Componente ────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leer preview del Excel sin subirlo
  const parsePreview = (f: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<PreviewRow>(ws, { defval: '' });
        if (rows.length === 0) {
          setError('El archivo no contiene datos.');
          return;
        }
        setPreviewHeaders(Object.keys(rows[0]));
        setPreviewRows(rows.slice(0, 5));
        setError(null);
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleFile = useCallback((f: File) => {
    if (!f.name.match(/\.xlsx?$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    parsePreview(f);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Error al importar el archivo.');
        return;
      }

      setResult(data as ImportResult);
    } catch {
      setError('Error de red al intentar importar.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/configuracion" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            Configuración
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Importar desde Excel</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Importar datos desde Excel</h1>
            <p className="text-slate-500 mt-1 max-w-2xl">
              Sube un archivo .xlsx con vehículos o choferes. El sistema detecta automáticamente
              el tipo de datos, muestra una vista previa y los inserta en tu cuenta.
            </p>
          </div>
        </div>

        {/* Plantillas de descarga */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-500" />
            Descarga las plantillas
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Usa nuestras plantillas para garantizar que el formato sea correcto.
            Incluyen encabezados y filas de ejemplo.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadTemplate('vehicles')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm transition-colors border border-blue-200"
            >
              <Car className="w-4 h-4" />
              Plantilla Vehículos (.xlsx)
            </button>
            <button
              onClick={() => downloadTemplate('drivers')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-sm transition-colors border border-purple-200"
            >
              <Users className="w-4 h-4" />
              Plantilla Choferes (.xlsx)
            </button>
          </div>
        </div>

        {/* Zona de carga */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-500" />
            Subir archivo
          </h2>

          {!file ? (
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Arrastra tu archivo aquí</p>
              <p className="text-slate-400 text-sm mt-1">o haz clic para seleccionar</p>
              <p className="text-xs text-slate-400 mt-3">Formatos soportados: .xlsx, .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Vista previa */}
        {previewRows.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">Vista previa (primeras {previewRows.length} filas)</h2>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {previewHeaders.map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-medium text-slate-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[200px] truncate">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar datos
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className={`rounded-xl border p-6 space-y-4 ${
            result.errors.length === 0
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600" />
              )}
              <h2 className="font-semibold text-slate-900">
                Importación completada
                {result.type === 'vehicles' ? ' — Vehículos' : ' — Choferes'}
              </h2>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-700">{result.imported} importados correctamente</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-amber-700">{result.skipped} omitidos</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Detalle de errores:</p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleReset}
              className="text-sm text-slate-600 hover:text-slate-900 underline transition-colors"
            >
              Importar otro archivo
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
