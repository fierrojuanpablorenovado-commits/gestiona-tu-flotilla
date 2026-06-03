import { neon } from '@neondatabase/serverless';
const DATABASE_URL = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

console.log('🔄 Ejecutando migración...');

await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_confirmado BOOLEAN DEFAULT FALSE`;
console.log('  ✅ weekly_accounts.retiro_confirmado');

await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_comprobante_url TEXT`;
console.log('  ✅ weekly_accounts.retiro_comprobante_url');

await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wa_group_link TEXT`;
console.log('  ✅ vehicles.wa_group_link');

console.log('✅ Migración completada.');
