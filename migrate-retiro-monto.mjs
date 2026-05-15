// migrate-retiro-monto.mjs
// Agrega retiro_monto a weekly_accounts para rastrear el monto real recibido en efectivo
import { neon } from '@neondatabase/serverless';
const DATABASE_URL = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function main() {
  console.log('Agregando columna retiro_monto a weekly_accounts...');
  await sql`
    ALTER TABLE weekly_accounts
    ADD COLUMN IF NOT EXISTS retiro_monto DECIMAL(10,2) DEFAULT 0
  `;
  console.log('✅ Done');
}

main().catch(e => { console.error(e); process.exit(1); });
