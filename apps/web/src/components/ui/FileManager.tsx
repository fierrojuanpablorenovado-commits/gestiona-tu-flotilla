'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, ExternalLink, Download } from 'lucide-react';

export interface StoredFile {
  id?: string;
  url: string;
  originalName: string;
  fileType: 'image' | 'pdf' | 'other';
  size: number;
  uploadedAt?: string;
}

interface FileManagerProps {
  entityType: string;
  entityId: string;
  existingFiles?: StoredFile[];
  onUpload?: (file: StoredFile) => void;
  maxFiles?: number;
  label?: string;
  readOnly?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileManager({
  entityType,
  entityId,
  existingFiles = [],
  onUpload,
  maxFiles = 20,
  label = 'Subir archivos',
  readOnly = false,
}: FileManagerProps) {
  const [files, setFiles] = useState<StoredFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (files.length >= maxFiles) {
      setError(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al subir archivo');

      const stored: StoredFile = {
        id:           data.attachmentId,
        url:          data.url,
        originalName: data.originalName,
        fileType:     data.fileType,
        size:         data.size,
        uploadedAt:   new Date().toISOString(),
      };

      setFiles(prev => [stored, ...prev]);
      onUpload?.(stored);
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  }, [files.length, maxFiles, entityType, entityId, onUpload]);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    arr.forEach(f => uploadFile(f));
  }, [uploadFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : uploading
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
              : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Subiendo archivo...</span>
            </div>
          ) : (
            <>
              <Upload className="h-7 w-7 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">Imágenes (JPG, PNG, WEBP) y PDF · Máx 10MB</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Grid de archivos */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {files.map((f, idx) => (
            <div
              key={f.id || idx}
              className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setPreview(f)}
            >
              {/* Thumbnail */}
              {f.fileType === 'image' ? (
                <div className="w-full h-28 overflow-hidden bg-slate-100">
                  <img src={f.url} alt={f.originalName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-28 bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center">
                  <FileText className="h-10 w-10 text-red-400 mb-1" />
                  <span className="text-[10px] font-bold text-red-500 uppercase">PDF</span>
                </div>
              )}

              {/* Info */}
              <div className="p-2">
                <p className="text-[11px] text-slate-700 truncate font-medium">{f.originalName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(f.size)}</p>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-white rounded-lg text-slate-700 hover:text-blue-600"
                  title="Abrir"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={f.url}
                  download={f.originalName}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-white rounded-lg text-slate-700 hover:text-green-600"
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && readOnly && (
        <p className="text-sm text-slate-400 text-center py-4">Sin archivos adjuntos</p>
      )}

      {/* Modal de preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            {preview.fileType === 'image' ? (
              <img
                src={preview.url}
                alt={preview.originalName}
                className="max-w-full max-h-[85vh] rounded-xl object-contain mx-auto block"
              />
            ) : (
              <iframe
                src={preview.url}
                className="w-full h-[85vh] rounded-xl bg-white"
                title={preview.originalName}
              />
            )}

            <div className="flex items-center justify-between mt-3 text-white/80 text-sm">
              <span>{preview.originalName}</span>
              <div className="flex gap-3">
                <a href={preview.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-white">
                  <ExternalLink className="h-4 w-4" /> Abrir
                </a>
                <a href={preview.url} download={preview.originalName}
                  className="flex items-center gap-1 hover:text-white">
                  <Download className="h-4 w-4" /> Descargar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
