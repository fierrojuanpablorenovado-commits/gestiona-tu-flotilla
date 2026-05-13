import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

type SheetRow = Record<string, unknown>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/\s+/g, '_');
}

function detectType(headers: string[]): 'vehicles' | 'drivers' | 'unknown' {
  const norm = headers.map(normalizeHeader);
  const vehicleKeys = ['placa', 'marca', 'modelo'];
  const driverKeys = ['nombre', 'telefono', 'licencia'];

  const vehicleMatches = vehicleKeys.filter((k) => norm.some((h) => h.includes(k))).length;
  const driverMatches = driverKeys.filter((k) => norm.some((h) => h.includes(k))).length;

  if (vehicleMatches >= 2) return 'vehicles';
  if (driverMatches >= 2) return 'drivers';
  return 'unknown';
}

function getValue(row: SheetRow, headers: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    for (const header of headers) {
      if (normalizeHeader(header).includes(candidate)) {
        const val = row[header];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

// ── Importar vehículos ────────────────────────────────────────────────────────

async function importVehicles(
  rows: SheetRow[],
  headers: string[],
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  const VALID_STATUSES = ['active', 'workshop', 'available', 'inactive', 'sold'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 porque fila 1 = headers

    try {
      const plates = getValue(row, headers, ['placa', 'plates']);
      const brand  = getValue(row, headers, ['marca', 'brand']);
      const model  = getValue(row, headers, ['modelo', 'model']);
      const yearRaw = getValue(row, headers, ['ano', 'year', 'anio']);
      const color  = getValue(row, headers, ['color']);
      const vin    = getValue(row, headers, ['niv', 'vin', 'serie']);
      const eco    = getValue(row, headers, ['eco', 'economico', 'numero_economico']);
      const statusRaw = getValue(row, headers, ['status', 'estado', 'estatus']);

      if (!plates && !brand && !model) {
        result.skipped++;
        continue;
      }

      if (!brand) {
        result.errors.push(`Fila ${rowNum}: falta la marca del vehículo.`);
        result.skipped++;
        continue;
      }
      if (!model) {
        result.errors.push(`Fila ${rowNum}: falta el modelo del vehículo.`);
        result.skipped++;
        continue;
      }

      const year = yearRaw ? parseInt(yearRaw) : new Date().getFullYear();
      if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
        result.errors.push(`Fila ${rowNum}: año "${yearRaw}" no válido.`);
        result.skipped++;
        continue;
      }

      const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : 'active';
      const ecoFinal = eco || `IMP-${String(result.imported + 1).padStart(3, '0')}`;

      // Verificar si ya existe esa placa en el tenant
      if (plates) {
        const existing = await sql`
          SELECT id FROM vehicles WHERE tenant_id = ${tenantId} AND plates = ${plates}
        `;
        if (existing.length > 0) {
          result.errors.push(`Fila ${rowNum}: placa "${plates}" ya existe, se omite.`);
          result.skipped++;
          continue;
        }
      }

      const id = randomUUID();
      await sql`
        INSERT INTO vehicles (id, tenant_id, eco, brand, model, year, color, plates, vin, km_actual, status, created_at, updated_at)
        VALUES (
          ${id}, ${tenantId}, ${ecoFinal}, ${brand}, ${model}, ${year},
          ${color || null}, ${plates || null}, ${vin || null},
          0, ${status}, NOW(), NOW()
        )
      `;
      result.imported++;
    } catch (err) {
      result.errors.push(`Fila ${rowNum}: error al insertar - ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }

  return result;
}

// ── Importar choferes ─────────────────────────────────────────────────────────

async function importDrivers(
  rows: SheetRow[],
  headers: string[],
  tenantId: string
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  const VALID_STATUSES = ['active', 'inactive', 'suspended'];
  const VALID_LIC_TIPOS = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const firstName = getValue(row, headers, ['nombre', 'first_name', 'nombre_s']);
      const lastName  = getValue(row, headers, ['apellido', 'last_name', 'apellidos']);
      const phone     = getValue(row, headers, ['telefono', 'phone', 'tel', 'celular']);
      const email     = getValue(row, headers, ['correo', 'email', 'mail']);
      const licencia  = getValue(row, headers, ['licencia', 'num_licencia', 'numero_licencia']);
      const licTipo   = getValue(row, headers, ['tipo_licencia', 'licencia_tipo', 'tipo']).toUpperCase();
      const statusRaw = getValue(row, headers, ['status', 'estado', 'estatus']);
      const hireDate  = getValue(row, headers, ['fecha_ingreso', 'hire_date', 'ingreso']);

      if (!firstName && !lastName && !phone) {
        result.skipped++;
        continue;
      }

      if (!firstName) {
        result.errors.push(`Fila ${rowNum}: falta el nombre del chofer.`);
        result.skipped++;
        continue;
      }

      // Verificar email duplicado
      if (email) {
        const existing = await sql`
          SELECT id FROM drivers WHERE tenant_id = ${tenantId} AND email = ${email}
        `;
        if (existing.length > 0) {
          result.errors.push(`Fila ${rowNum}: correo "${email}" ya existe, se omite.`);
          result.skipped++;
          continue;
        }
      }

      const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : 'active';
      const licTipoFinal = VALID_LIC_TIPOS.includes(licTipo) ? licTipo : 'B';
      const hireDateFinal = hireDate || new Date().toISOString().slice(0, 10);

      const id = randomUUID();
      await sql`
        INSERT INTO drivers (
          id, tenant_id, first_name, last_name, phone, email,
          licencia, licencia_tipo, hire_date, status, created_at, updated_at
        ) VALUES (
          ${id}, ${tenantId}, ${firstName}, ${lastName || ''},
          ${phone || null}, ${email || null},
          ${licencia || null}, ${licTipoFinal},
          ${hireDateFinal}, ${status}, NOW(), NOW()
        )
      `;
      result.imported++;
    } catch (err) {
      result.errors.push(`Fila ${rowNum}: error al insertar - ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }

  return result;
}

// ── Handler POST ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ message: 'El archivo debe ser .xlsx o .xls' }, { status: 400 });
    }

    // Leer buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json({ message: 'El archivo está vacío o no tiene datos.' }, { status: 400 });
    }

    const headers = Object.keys(rawRows[0]);
    const type = detectType(headers);

    if (type === 'unknown') {
      return NextResponse.json(
        {
          message: 'No se pudo detectar el tipo de datos. Usa las plantillas de vehículos o choferes.',
          headers,
        },
        { status: 400 }
      );
    }

    let result: ImportResult;
    if (type === 'vehicles') {
      result = await importVehicles(rawRows, headers, session.tenantId);
    } else {
      result = await importDrivers(rawRows, headers, session.tenantId);
    }

    return NextResponse.json({
      type,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (err) {
    console.error('[import] Error:', err);
    return NextResponse.json(
      { message: 'Error interno al procesar el archivo.' },
      { status: 500 }
    );
  }
}
