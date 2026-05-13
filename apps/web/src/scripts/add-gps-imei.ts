/**
 * add-gps-imei.ts
 * Agrega la columna gps_imei a la tabla vehicles
 * y crea las columnas de configuración GPS en tenant_settings.
 *
 * Uso:
 *   npx tsx src/scripts/add-gps-imei.ts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function main() {
  console.log('🔧 Ejecutando migraciones GPS...\n');

  // 1. Columna gps_imei en vehicles
  await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gps_imei VARCHAR(20)`;
  console.log('✅ vehicles.gps_imei — OK');

  // 2. Crear tabla tenant_settings si no existe
  await sql`
    CREATE TABLE IF NOT EXISTS tenant_settings (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅ tenant_settings — OK');

  // 3. Columnas GPS en tenant_settings
  await sql`ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS gps_provider VARCHAR(50) DEFAULT 'none'`;
  await sql`ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS gps_app_key TEXT`;
  await sql`ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS gps_app_secret TEXT`;
  await sql`ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS gps_flespi_token TEXT`;
  console.log('✅ tenant_settings.gps_* — OK');

  // 4. Tabla de notificaciones
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT,
      severity VARCHAR(20) DEFAULT 'info',
      read BOOLEAN DEFAULT FALSE,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('✅ notifications — OK');

  console.log('\n🎉 Migraciones completadas.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
