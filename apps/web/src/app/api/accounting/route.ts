import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { calculateFiscal } from '@/lib/fiscal';

// ─── GET /api/accounting?month=X&year=Y&summary=true ──────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month   = parseInt(searchParams.get('month')   ?? String(new Date().getMonth() + 1));
    const year    = parseInt(searchParams.get('year')    ?? String(new Date().getFullYear()));
    const summary = searchParams.get('summary') === 'true';

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return NextResponse.json({ message: 'Mes o año inválido' }, { status: 400 });
    }

    // Registros del mes
    const records = await sql`
      SELECT *
      FROM accounting_records
      WHERE tenant_id    = ${session.tenantId}::uuid
        AND period_month = ${month}
        AND period_year  = ${year}
      ORDER BY created_at DESC
    `;

    if (!summary) {
      return NextResponse.json({ records });
    }

    // ── Resumen ──────────────────────────────────────────────────────────────
    let totalIngresos           = 0;
    let totalGastosDeducibles   = 0;
    let totalGastosNoDeducibles = 0;

    const categorias: Record<string, { total: number; count: number; is_income: boolean }> = {};

    for (const r of records) {
      const amount = Number(r.amount);
      const cat    = (r.category as string) || 'otros';

      if (!categorias[cat]) {
        categorias[cat] = { total: 0, count: 0, is_income: r.is_income as boolean };
      }
      categorias[cat].total += amount;
      categorias[cat].count += 1;

      if (r.is_income) {
        totalIngresos += amount;
      } else if (r.is_deductible) {
        totalGastosDeducibles += amount;
      } else {
        totalGastosNoDeducibles += amount;
      }
    }

    const utilidadNeta = totalIngresos - totalGastosDeducibles - totalGastosNoDeducibles;
    const fiscal       = calculateFiscal(totalIngresos);

    return NextResponse.json({
      month,
      year,
      total_ingresos:             totalIngresos,
      total_gastos_deducibles:    totalGastosDeducibles,
      total_gastos_no_deducibles: totalGastosNoDeducibles,
      utilidad_neta:              utilidadNeta,
      isr_calculado:              fiscal.isrMonthly,
      iva_calculado:              fiscal.ivaCollected,
      isr_rate:                   fiscal.isrRate,
      iva_rate:                   fiscal.ivaRate,
      categorias,
      records,
    });
  } catch (err) {
    console.error('[accounting GET]', err);
    return NextResponse.json({ message: 'Error al obtener registros' }, { status: 500 });
  }
}

// ─── POST /api/accounting — Insertar registro manual ─────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      period_month,
      period_year,
      source         = 'manual',
      category       = 'otros',
      description,
      amount,
      is_income      = false,
      is_deductible  = false,
      invoice_number,
    } = body;

    if (!period_month || !period_year || amount === undefined) {
      return NextResponse.json(
        { message: 'period_month, period_year y amount son requeridos' },
        { status: 400 },
      );
    }

    const [record] = await sql`
      INSERT INTO accounting_records (
        tenant_id, period_month, period_year,
        source, category, description,
        amount, is_income, is_deductible, invoice_number
      ) VALUES (
        ${session.tenantId}::uuid,
        ${period_month},
        ${period_year},
        ${source},
        ${category},
        ${description || null},
        ${amount},
        ${is_income},
        ${is_deductible},
        ${invoice_number || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error('[accounting POST]', err);
    return NextResponse.json({ message: 'Error al insertar registro' }, { status: 500 });
  }
}
