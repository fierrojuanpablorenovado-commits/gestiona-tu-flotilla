import { neon } from '@neondatabase/serverless';
// DATABASE_URL debe estar en .env o en las variables de entorno del sistema
// NUNCA hardcodear credenciales en el código
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL no configurada en variables de entorno');
const sql = neon(DATABASE_URL);

console.log('🔄 Ejecutando migración...');

await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_confirmado BOOLEAN DEFAULT FALSE`;
console.log('  ✅ weekly_accounts.retiro_confirmado');

await sql`ALTER TABLE weekly_accounts ADD COLUMN IF NOT EXISTS retiro_comprobante_url TEXT`;
console.log('  ✅ weekly_accounts.retiro_comprobante_url');

await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS wa_group_link TEXT`;
console.log('  ✅ vehicles.wa_group_link');

console.log('✅ Migración completada.');
