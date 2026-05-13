/**
 * Script para crear la tabla weekly_reports en la base de datos.
 * Ejecutar con: npx ts-node --project tsconfig.json src/scripts/create-weekly-reports-table.ts
 * O desde la raíz del proyecto: npx tsx src/scripts/create-weekly-reports-table.ts
 */

import { sql } from '../lib/db';

async function main() {
  console.log('[create-weekly-reports-table] Creando tabla weekly_reports...');

  await sql`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      week_start DATE NOT NULL,
      total_income DECIMAL(12,2) DEFAULT 0,
      total_expenses DECIMAL(12,2) DEFAULT 0,
      pending_payments INTEGER DEFAULT 0,
      maintenance_alerts INTEGER DEFAULT 0,
      insurance_alerts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Índice para consultas por tenant y semana
  await sql`
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_tenant_week
    ON weekly_reports (tenant_id, week_start DESC)
  `;

  console.log('[create-weekly-reports-table] Tabla weekly_reports creada exitosamente.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[create-weekly-reports-table] Error:', err);
  process.exit(1);
});
