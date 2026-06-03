import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const results: string[] = [];

  try {
    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at DATE`;
    results.push('✅ trial_ends_at añadida');
  } catch (e) { results.push(`❌ trial_ends_at: ${e}`); }

  try {
    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_sent TEXT[] DEFAULT '{}'`;
    results.push('✅ trial_reminder_sent añadida');
  } catch (e) { results.push(`❌ trial_reminder_sent: ${e}`); }

  // Rellenar trial_ends_at para tenants activos sin fecha (14 días desde hoy)
  try {
    const updated = await sql`
      UPDATE tenants
      SET trial_ends_at = (NOW() + INTERVAL '14 days')::DATE
      WHERE trial_ends_at IS NULL AND status != 'active'
    `;
    results.push(`✅ trial_ends_at rellenado en ${updated.length ?? 0} tenants`);
  } catch (e) { results.push(`❌ rellenar trial: ${e}`); }

  return NextResponse.json({ results });
}
