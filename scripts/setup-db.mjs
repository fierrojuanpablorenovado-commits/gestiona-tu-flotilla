/**
 * setup-db.mjs
 * Crea el schema en Neon y siembra el primer tenant (tu flotilla) + admin.
 *
 * Uso:
 *   node scripts/setup-db.mjs
 *
 * Requiere: DATABASE_URL en .env.local o en el entorno.
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Leer .env.local manualmente
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../apps/web/.env.local');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  } catch {
    console.log('No se encontró .env.local, usando variables de entorno del sistema.');
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definido.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ─── Schema ──────────────────────────────────────────────────────────────────
async function createSchema() {
  console.log('📐 Creando schema...');

  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  // Tenants
  await sql`
    CREATE TABLE IF NOT EXISTS tenants (
      id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      name         TEXT        NOT NULL,
      slug         TEXT        NOT NULL UNIQUE,
      plan         TEXT        NOT NULL DEFAULT 'basic'
                               CHECK (plan IN ('basic','pro','enterprise')),
      max_vehicles INT         DEFAULT 10,
      active       BOOLEAN     DEFAULT TRUE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Users (sin dependencia de auth.users de Supabase)
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id     UUID        REFERENCES tenants(id) ON DELETE CASCADE,
      first_name    TEXT        NOT NULL,
      last_name     TEXT        NOT NULL,
      email         TEXT        NOT NULL UNIQUE,
      password_hash TEXT        NOT NULL,
      role          TEXT        NOT NULL
                                CHECK (role IN (
                                  'super_admin','admin_general','administrador',
                                  'tesoreria','operaciones','mecanico',
                                  'supervisor','socio','chofer'
                                )),
      avatar        TEXT,
      phone         TEXT,
      active        BOOLEAN     DEFAULT TRUE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Vehicles
  await sql`
    CREATE TABLE IF NOT EXISTS vehicles (
      id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      eco         TEXT    NOT NULL,
      brand       TEXT    NOT NULL,
      model       TEXT    NOT NULL,
      year        INT     NOT NULL CHECK (year BETWEEN 2000 AND 2035),
      color       TEXT,
      plates      TEXT,
      vin         TEXT,
      km_actual   INT     DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','workshop','available','inactive','sold')),
      platform    TEXT[],
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Drivers
  await sql`
    CREATE TABLE IF NOT EXISTS drivers (
      id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id            UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id              UUID    REFERENCES users(id),
      vehicle_id           UUID    REFERENCES vehicles(id),
      first_name           TEXT    NOT NULL,
      last_name            TEXT    NOT NULL,
      phone                TEXT,
      email                TEXT,
      licencia             TEXT,
      licencia_tipo        TEXT,
      licencia_vencimiento DATE,
      curp                 TEXT,
      nss                  TEXT,
      address              TEXT,
      hire_date            DATE,
      status               TEXT    NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','inactive','suspended')),
      rating               DECIMAL(3,2) DEFAULT 5.00,
      score                INT     DEFAULT 100,
      platforms            TEXT[],
      notes                TEXT,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Weekly accounts
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_accounts (
      id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      driver_id       UUID    NOT NULL REFERENCES drivers(id),
      vehicle_id      UUID    REFERENCES vehicles(id),
      week_start      DATE    NOT NULL,
      week_end        DATE    NOT NULL,
      uber_income     DECIMAL(10,2) NOT NULL DEFAULT 0,
      didi_income     DECIMAL(10,2) NOT NULL DEFAULT 0,
      indriver_income DECIMAL(10,2) NOT NULL DEFAULT 0,
      other_income    DECIMAL(10,2) NOT NULL DEFAULT 0,
      rent            DECIMAL(10,2) NOT NULL DEFAULT 0,
      gas             DECIMAL(10,2) NOT NULL DEFAULT 0,
      deductions      DECIMAL(10,2) NOT NULL DEFAULT 0,
      trips_count     INT     DEFAULT 0,
      hours_worked    DECIMAL(5,1)  DEFAULT 0,
      status          TEXT    NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','paid','partial','disputed')),
      notes           TEXT,
      created_by      UUID    REFERENCES users(id),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT week_order CHECK (week_end >= week_start)
    )
  `;

  // Maintenance orders
  await sql`
    CREATE TABLE IF NOT EXISTS maintenance_orders (
      id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id      UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      vehicle_id     UUID    NOT NULL REFERENCES vehicles(id),
      orden          TEXT    NOT NULL,
      tipo           TEXT    NOT NULL CHECK (tipo IN ('Preventivo','Correctivo','Urgente')),
      descripcion    TEXT    NOT NULL,
      taller         TEXT,
      fecha_ingreso  DATE    NOT NULL,
      fecha_salida   DATE,
      costo_estimado DECIMAL(10,2),
      costo_real     DECIMAL(10,2),
      status         TEXT    NOT NULL DEFAULT 'Programado'
                             CHECK (status IN (
                               'Programado','En diagnostico','En reparacion',
                               'Esperando refacciones','Completado','Cancelado'
                             )),
      mechanic_id    UUID    REFERENCES users(id),
      condiciones    JSONB,
      notas          TEXT,
      created_by     UUID    REFERENCES users(id),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Maintenance parts
  await sql`
    CREATE TABLE IF NOT EXISTS maintenance_parts (
      id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id   UUID    NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
      nombre     TEXT    NOT NULL,
      cantidad   INT     NOT NULL DEFAULT 1,
      precio     DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Incidents
  await sql`
    CREATE TABLE IF NOT EXISTS incidents (
      id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      folio       TEXT,
      driver_id   UUID    REFERENCES drivers(id),
      vehicle_id  UUID    REFERENCES vehicles(id),
      tipo        TEXT    NOT NULL,
      descripcion TEXT    NOT NULL,
      fecha       DATE    NOT NULL,
      costo       DECIMAL(10,2) DEFAULT 0,
      status      TEXT    NOT NULL DEFAULT 'Abierta',
      prioridad   TEXT    NOT NULL DEFAULT 'Media',
      created_by  UUID    REFERENCES users(id),
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Candidates
  await sql`
    CREATE TABLE IF NOT EXISTS candidates (
      id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id      UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      first_name     TEXT    NOT NULL,
      last_name      TEXT    NOT NULL,
      phone          TEXT,
      email          TEXT,
      platform       TEXT[],
      kanban_stage   TEXT    NOT NULL DEFAULT 'aplicacion'
                             CHECK (kanban_stage IN (
                               'aplicacion','pre_screening','entrevista',
                               'evaluacion','documentos','oferta',
                               'contratado','rechazado'
                             )),
      score          INT     CHECK (score BETWEEN 0 AND 100),
      source         TEXT,
      referred_by    UUID    REFERENCES drivers(id),
      interview_date TIMESTAMPTZ,
      notes          TEXT,
      created_by     UUID    REFERENCES users(id),
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Partners
  await sql`
    CREATE TABLE IF NOT EXISTS partners (
      id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id      UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name           TEXT    NOT NULL,
      email          TEXT,
      phone          TEXT,
      vehicles_count INT     DEFAULT 0,
      investment     DECIMAL(12,2) DEFAULT 0,
      monthly_income DECIMAL(12,2) DEFAULT 0,
      roi            DECIMAL(5,2),
      status         TEXT    DEFAULT 'active' CHECK (status IN ('active','inactive')),
      notes          TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Treasury transactions
  await sql`
    CREATE TABLE IF NOT EXISTS treasury_transactions (
      id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
      tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      tipo        TEXT    NOT NULL CHECK (tipo IN ('ingreso','egreso','transferencia')),
      categoria   TEXT    NOT NULL,
      descripcion TEXT,
      monto       DECIMAL(12,2) NOT NULL CHECK (monto > 0),
      fecha       DATE    NOT NULL,
      reference   TEXT,
      driver_id   UUID    REFERENCES drivers(id),
      vehicle_id  UUID    REFERENCES vehicles(id),
      status      TEXT    NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('pending','completed','cancelled')),
      created_by  UUID    REFERENCES users(id),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Trigger función updated_at
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;

  // Crear triggers para updated_at (nombres estáticos)
  const tables = ['tenants','users','vehicles','drivers','weekly_accounts','maintenance_orders','incidents','candidates','partners','treasury_transactions'];
  for (const table of tables) {
    await sql.query(`DROP TRIGGER IF EXISTS ${table}_updated_at ON ${table}`);
    await sql.query(`
      CREATE TRIGGER ${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  console.log('✅ Schema creado correctamente.');
}

// ─── Seed inicial ─────────────────────────────────────────────────────────────
async function seedInitialData() {
  console.log('🌱 Creando tenant y usuario administrador...');

  // 1. Crear tenant de JP
  const tenantRows = await sql`
    INSERT INTO tenants (name, slug, plan, max_vehicles)
    VALUES ('Mi Flotilla', 'mi-flotilla', 'pro', 50)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, slug
  `;
  const tenant = tenantRows[0];
  console.log(`   Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Hash de contraseña para el admin
  const password = 'Flotilla2026';
  const hash = await bcrypt.hash(password, 12);

  // 3. Crear usuario administrador
  const userRows = await sql`
    INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, avatar)
    VALUES (
      ${tenant.id},
      'Juan Pablo',
      'Fierro',
      'admin@miflotilla.mx',
      ${hash},
      'admin_general',
      'JF'
    )
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          tenant_id     = EXCLUDED.tenant_id
    RETURNING id, email, role
  `;
  const adminUser = userRows[0];
  console.log(`   Admin: ${adminUser.email} (${adminUser.id})`);

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ BASE DE DATOS LISTA');
  console.log('');
  console.log('  Credenciales de acceso:');
  console.log(`  Email    : admin@miflotilla.mx`);
  console.log(`  Password : ${password}`);
  console.log(`  Tenant ID: ${tenant.id}`);
  console.log('');
  console.log('  URL: https://gestiona-flotilla-demo.vercel.app/login');
  console.log('═══════════════════════════════════════════════');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Configurando base de datos Neon...\n');
  try {
    await createSchema();
    await seedInitialData();
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message?.includes('already exists')) {
      console.log('ℹ️  Algunas tablas ya existen — esto es normal en re-ejecuciones.');
    }
    process.exit(1);
  }
}

main();
