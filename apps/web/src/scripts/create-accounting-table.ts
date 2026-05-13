/**
 * create-accounting-table.ts
 * Crea las tablas accounting_records y payments si no existen,
 * y agrega la columna subscription_id a tenants si falta.
 *
 * Uso:
 *   npx tsx src/scripts/create-accounting-table.ts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function main() {
  console.log('Iniciando creacion de tablas...\n');

  // ── accounting_records ────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_records (
      id             SERIAL PRIMARY KEY,
      tenant_id      UUID NOT NULL,
      period_month   INTEGER NOT NULL,
      period_year    INTEGER NOT NULL,
      source         VARCHAR(50)   NOT NULL DEFAULT 'manual',
      category       VARCHAR(100),
      description    TEXT,
      amount         DECIMAL(12,2) NOT NULL,
      is_income      BOOLEAN       DEFAULT TRUE,
      is_deductible  BOOLEAN       DEFAULT FALSE,
      invoice_number VARCHAR(100),
      created_at     TIMESTAMP     DEFAULT NOW()
    )
  `;
  console.log('OK: tabla accounting_records');

  // Indice para consultas frecuentes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_accounting_tenant_period
    ON accounting_records (tenant_id, period_year, period_month)
  `;
  console.log('OK: indice idx_accounting_tenant_period');

  // ── payments ──────────────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id                      SERIAL PRIMARY KEY,
      tenant_id               UUID          NOT NULL,
      amount                  DECIMAL(12,2) NOT NULL,
      currency                VARCHAR(10)   DEFAULT 'mxn',
      stripe_session_id       VARCHAR(255)  UNIQUE,
      stripe_subscription_id  VARCHAR(255),
      plan                    VARCHAR(50),
      status                  VARCHAR(50)   DEFAULT 'pending',
      created_at              TIMESTAMP     DEFAULT NOW()
    )
  `;
  console.log('OK: tabla payments');

  // ── tenants: columna subscription_id ─────────────────────────────────────
  try {
    await sql`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255)
    `;
    console.log('OK: columna tenants.subscription_id');
  } catch (e) {
    console.log('INFO: subscription_id ya existia o error menor:', String(e));
  }

  // ── tenants: columna status (si no existe) ────────────────────────────────
  try {
    await sql`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'trial'
    `;
    console.log('OK: columna tenants.status');
  } catch (e) {
    console.log('INFO: status ya existia o error menor:', String(e));
  }

  console.log('\nTodas las tablas creadas correctamente.');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
