import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const month    = parseInt(formData.get('month') as string);
    const year     = parseInt(formData.get('year')  as string);

    if (!file) {
      return NextResponse.json({ message: 'No se recibió archivo' }, { status: 400 });
    }
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return NextResponse.json({ message: 'Mes o año inválido' }, { status: 400 });
    }

    // Leer el archivo Excel
    const buffer    = Buffer.from(await file.arrayBuffer());
    const workbook  = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet     = workbook.Sheets[sheetName];
    const rows      = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'El archivo está vacío o tiene formato incorrecto' }, { status: 400 });
    }

    // ── Insertar registros Didi Fleet ────────────────────────────────────────
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Normalizar nombres de columnas (Didi Fleet usa variantes)
      const conductorRaw  = row['Nombre del conductor'] ?? row['Conductor'] ?? row['Driver Name'] ?? row['nombre'] ?? `Conductor ${i + 1}`;
      const ingresosRaw   = row['Ingresos totales'] ?? row['Ingresos'] ?? row['Total Income'] ?? row['monto'] ?? row['amount'] ?? 0;
      const viajes        = row['Viajes completados'] ?? row['Viajes'] ?? row['Trips'] ?? 0;

      const conductor = String(conductorRaw).trim();
      const ingresos  = parseFloat(String(ingresosRaw).replace(/[$,\s]/g, ''));

      if (isNaN(ingresos) || ingresos <= 0) {
        errors.push(`Fila ${i + 2}: ingresos inválidos para ${conductor}`);
        continue;
      }

      try {
        await sql`
          INSERT INTO accounting_records (
            tenant_id, period_month, period_year,
            source, category, description,
            amount, is_income, is_deductible
          ) VALUES (
            ${session.tenantId},
            ${month},
            ${year},
            'didi_fleet',
            'ingresos_didi',
            ${`Ingresos Didi Fleet — ${conductor} — ${viajes} viajes`},
            ${ingresos},
            true,
            false
          )
        `;
        inserted++;
      } catch (rowErr) {
        errors.push(`Fila ${i + 2}: error al insertar (${String(rowErr)})`);
      }
    }

    // ── Sincronizar gastos de mantenimiento del mismo mes ────────────────────
    let syncedMaintenance = 0;
    try {
      const existing = await sql`
        SELECT id FROM accounting_records
        WHERE tenant_id    = ${session.tenantId}
          AND period_month = ${month}
          AND period_year  = ${year}
          AND source       = 'maintenance'
        LIMIT 1
      `;

      if (existing.length === 0) {
        const maintenanceRows = await sql`
          SELECT description, cost, service_date
          FROM maintenance_orders
          WHERE tenant_id = ${session.tenantId}
            AND EXTRACT(MONTH FROM service_date) = ${month}
            AND EXTRACT(YEAR  FROM service_date) = ${year}
            AND status = 'completed'
        `;

        for (const m of maintenanceRows) {
          if (!m.cost || Number(m.cost) <= 0) continue;
          await sql`
            INSERT INTO accounting_records (
              tenant_id, period_month, period_year,
              source, category, description,
              amount, is_income, is_deductible
            ) VALUES (
              ${session.tenantId},
              ${month},
              ${year},
              'maintenance',
              'mantenimiento',
              ${m.description || 'Orden de mantenimiento'},
              ${Number(m.cost)},
              false,
              true
            )
          `;
          syncedMaintenance++;
        }
      }
    } catch {
      // No bloquear si mantenimiento falla (tabla puede no existir)
    }

    // ── Sincronizar gastos de tesorería del mismo mes ────────────────────────
    let syncedTreasury = 0;
    try {
      const existing = await sql`
        SELECT id FROM accounting_records
        WHERE tenant_id    = ${session.tenantId}
          AND period_month = ${month}
          AND period_year  = ${year}
          AND source       = 'treasury'
        LIMIT 1
      `;

      if (existing.length === 0) {
        const treasuryRows = await sql`
          SELECT description, amount, category, date
          FROM treasury_records
          WHERE tenant_id = ${session.tenantId}
            AND tipo = 'egreso'
            AND EXTRACT(MONTH FROM date) = ${month}
            AND EXTRACT(YEAR  FROM date) = ${year}
        `;

        for (const t of treasuryRows) {
          if (!t.amount || Number(t.amount) <= 0) continue;
          await sql`
            INSERT INTO accounting_records (
              tenant_id, period_month, period_year,
              source, category, description,
              amount, is_income, is_deductible
            ) VALUES (
              ${session.tenantId},
              ${month},
              ${year},
              'treasury',
              ${t.category || 'otros'},
              ${t.description || 'Gasto tesorería'},
              ${Number(t.amount)},
              false,
              true
            )
          `;
          syncedTreasury++;
        }
      }
    } catch {
      // No bloquear si tesorería falla
    }

    return NextResponse.json({
      message: `Importación completada`,
      rows_processed: rows.length,
      didi_inserted:       inserted,
      maintenance_synced:  syncedMaintenance,
      treasury_synced:     syncedTreasury,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 });
  } catch (err) {
    console.error('[accounting/import-didi POST]', err);
    return NextResponse.json({ message: 'Error al importar el archivo' }, { status: 500 });
  }
}
