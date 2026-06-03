import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const [tenantCols, payExists] = await Promise.all([
      sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'tenants'
        ORDER BY ordinal_position
      `,
      sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables WHERE table_name = 'payments'
        ) AS exists
      `,
    ]);

    let paymentCols: string[] = [];
    if (payExists[0]?.exists) {
      const pc = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'payments' ORDER BY ordinal_position
      `;
      paymentCols = pc.map((c: { column_name: string }) => c.column_name);
    }

    return NextResponse.json({
      tenants: tenantCols.map((c: { column_name: string; data_type: string }) => c.column_name),
      payments_exists: payExists[0]?.exists,
      payments_cols: paymentCols,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
