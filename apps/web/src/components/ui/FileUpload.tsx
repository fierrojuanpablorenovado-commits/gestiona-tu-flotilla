'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string; // blob URL for images
  type: 'image' | 'pdf' | 'other';
}

interface FileUploadProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
  sublabel?: string;
  existingFiles?: UploadedFile[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FileUpload({
  onFilesChange,
  maxFiles = 10,
  accept = 'image/*,application/pdf',
  label = 'Subir archivos',
  sublabel,
  existingFiles = [],
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const mapped: UploadedFile[] = fileArray.map((f) => {
        const type = f.type.startsWith('image/')
          ? 'image'
          : f.type === 'application/pdf'
          ? 'pdf'
          : 'other';
        return {
          id: Math.random().toString(36).slice(2),
          file: f,
          preview: type === 'image' ? URL.createObjectURL(f) : undefined,
          type,
        };
      });

      setFiles((prev) => {
        const updated = [...prev, ...mapped].slice(0, maxFiles);
        onFilesChange?.(updated);
        return updated;
      });
    },
    [maxFiles, onFilesChange]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      const updated = prev.filter((f) => f.id !== id);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className={clsx(
          'flex h-12 w-12 items-center justify-center rounded-xl mx-auto mb-3 transition-colors',
          isDragging ? 'bg-blue-100' : 'bg-slate-200'
        )}>
          <Upload className={clsx('h-6 w-6', isDragging ? 'text-blue-600' : 'text-slate-500')} />
        </div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-500 mt-1">
          {sublabel || `Arrastra archivos aquí o haz clic para seleccionar`}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            <ImageIcon className="h-3 w-3" /> Imágenes
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            <FileText className="h-3 w-3" /> PDF
          </span>
          <span className="text-[10px] text-slate-400">Máx {maxFiles} archivos</span>
        </div>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              {f.type === 'image' && f.preview ? (
                <div className="relative w-full h-28 overflow-hidden">
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <span className="bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                      IMG
                    </span>
                  </div>
                </div>
              ) : f.type === 'pdf' ? (
                <div className="w-full h-28 bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center">
                  <FileText className="h-10 w-10 text-red-500 mb-1" />
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">PDF</span>
                </div>
              ) : (
                <div className="w-full h-28 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center">
                  <Paperclip className="h-10 w-10 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Archivo</span>
                </div>
              )}

              {/* File info */}
              <div className="p-2">
                <p className="text-[11px] text-slate-700 truncate font-medium leading-tight">
                  {f.file.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(f.file.size)}</p>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
