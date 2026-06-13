export const MIME_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MIME_DOCS  = [...MIME_IMAGE, 'application/pdf'];

export const SIZE_5MB  = 5  * 1024 * 1024;
export const SIZE_10MB = 10 * 1024 * 1024;

export interface FileCheckResult { ok: boolean; error?: string }

export function checkFile(
  file: { size: number; type: string },
  opts: { types: string[]; maxBytes: number }
): FileCheckResult {
  if (file.size > opts.maxBytes) {
    const mb = Math.round(opts.maxBytes / 1024 / 1024);
    return { ok: false, error: `El archivo excede el límite de ${mb} MB.` };
  }
  if (!opts.types.includes(file.type)) {
    return { ok: false, error: `Tipo de archivo no permitido. Acepta: ${opts.types.join(', ')}.` };
  }
  return { ok: true };
}

// Validar base64 (para endpoints que reciben imágenes como string)
export function checkBase64Image(base64: string, maxBytes = SIZE_5MB): FileCheckResult {
  const bytes = Math.ceil((base64.length * 3) / 4); // estimación del tamaño decodificado
  if (bytes > maxBytes) {
    return { ok: false, error: `La imagen es demasiado grande (máx ${Math.round(maxBytes / 1024 / 1024)} MB).` };
  }
  const mimeMatch = base64.match(/^data:(image\/[a-z]+);base64,/);
  if (!mimeMatch || !MIME_IMAGE.includes(mimeMatch[1])) {
    return { ok: false, error: 'Formato de imagen no permitido. Usa JPEG, PNG, WebP o GIF.' };
  }
  return { ok: true };
}
