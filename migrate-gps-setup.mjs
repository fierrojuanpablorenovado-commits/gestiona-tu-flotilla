/**
 * migrate-gps-setup.mjs
 *
 * 1. Añade columna gps_imei a vehicles (si no existe)
 * 2. Crea tabla tenant_settings para almacenar credenciales GPS por tenant
 * 3. Muestra los vehículos actuales para que JP pueda llenar los IMEIs
 */

import { neon } from '@neondatabase/serverless';

const DB = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);
const TID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b';

// ── 1. Añadir gps_imei a vehicles ────────────────────────────────────────────
console.log('=== PASO 1: Columna gps_imei en vehicles ===');
await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gps_imei VARCHAR(20)`;
console.log('✅ Columna gps_imei garantizada en vehicles');

// ── 2. Crear tabla tenant_settings (drop + recreate para schema limpio) ──────
console.log('\n=== PASO 2: Tabla tenant_settings ===');
await sql`DROP TABLE IF EXISTS tenant_settings CASCADE`;
await sql`
  CREATE TABLE tenant_settings (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id   UUID NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    value       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT tenant_settings_unique UNIQUE(tenant_id, setting_key)
  )
`;
await sql`CREATE INDEX idx_tenant_settings_lookup ON tenant_settings(tenant_id, setting_key)`;
console.log('✅ Tabla tenant_settings creada');
console.log('✅ Índice en tenant_settings creado');

// ── 4. Verificar vehículos y su estado actual de IMEI ────────────────────────
console.log('\n=== PASO 3: Estado actual de vehículos y IMEIs ===');
const vehicles = await sql`
  SELECT
    v.id::text,
    v.eco,
    v.plates,
    v.brand || ' ' || v.model AS modelo,
    v.gps_imei,
    COALESCE(d.first_name || ' ' || d.last_name, '—') AS chofer
  FROM vehicles v
  LEFT JOIN drivers d ON d.vehicle_id = v.id AND d.status = 'active'
  WHERE v.tenant_id = ${TID}
  ORDER BY v.eco
`;

console.log(`\n${vehicles.length} vehículos encontrados:\n`);
console.log('ECO    | PLACAS      | MODELO                    | CHOFER                 | GPS IMEI');
console.log('-------|-------------|---------------------------|------------------------|----------');
for (const v of vehicles) {
  const eco     = v.eco.padEnd(6);
  const plates  = (v.plates || '—').padEnd(11);
  const modelo  = v.modelo.padEnd(25);
  const chofer  = v.chofer.padEnd(22);
  const imei    = v.gps_imei || '⚠️  SIN IMEI';
  console.log(`${eco} | ${plates} | ${modelo} | ${chofer} | ${imei}`);
}

// ── 5. Verificar si ya hay settings GPS guardados ────────────────────────────
console.log('\n=== PASO 4: Verificar credenciales GPS en DB ===');
const settings = await sql`
  SELECT setting_key, CASE WHEN setting_key LIKE '%secret%' OR setting_key LIKE '%password%'
    THEN LEFT(value, 8) || '...'
    ELSE value END AS masked_value
  FROM tenant_settings
  WHERE tenant_id = ${TID}
    AND setting_key IN ('gps_provider', 'tracksolid_app_key', 'tracksolid_app_secret')
  ORDER BY setting_key
`;

if (settings.length === 0) {
  console.log('ℹ️  No hay credenciales GPS guardadas en DB todavía');
  console.log('   → Ir a Configuración → GPS y Rastreo para configurarlas');
} else {
  console.log('Credenciales GPS en DB:');
  for (const s of settings) {
    console.log(`  ${s.setting_key}: ${s.masked_value}`);
  }
}

console.log('\n✅ Migración GPS completada');
console.log('\nPRÓXIMOS PASOS:');
console.log('1. Ve a Configuración → GPS y Rastreo en la app');
console.log('2. Selecciona Track Solid Pro');
console.log('3. Ingresa tu App Key y App Secret');
console.log('4. Llena los IMEIs en la sección "IMEIs por Vehículo"');
console.log('5. Prueba la conexión y guarda');
