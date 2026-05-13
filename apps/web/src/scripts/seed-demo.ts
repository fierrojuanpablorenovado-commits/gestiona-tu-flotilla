/**
 * seed-demo.ts
 * Crea las cuentas demo de Flotilla Premier en la base de datos Neon.
 *
 * Uso:
 *   npx tsx src/scripts/seed-demo.ts
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// ─── Conexión directa (sin depender de process.env) ──────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

// ─── Cuentas demo ─────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'Flotilla2024';
const TENANT_NAME   = 'Flotilla Premier Demo';
const TENANT_SLUG   = 'flotillapremier';

interface DemoUser {
  email:      string;
  firstName:  string;
  lastName:   string;
  role:       string;
  phone:      string | null;
  avatar:     string;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'admingeneral@flotillapremier.mx', firstName: 'Juan Pablo', lastName: 'Fierro',    role: 'admin_general',  phone: null,          avatar: 'JF' },
  { email: 'admin@flotillapremier.mx',        firstName: 'Sofía',      lastName: 'Ramírez',   role: 'administrador',  phone: null,          avatar: 'SR' },
  { email: 'tesoreria@flotillapremier.mx',    firstName: 'María',      lastName: 'González',  role: 'tesoreria',      phone: null,          avatar: 'MG' },
  { email: 'operaciones@flotillapremier.mx',  firstName: 'Roberto',    lastName: 'Sánchez',   role: 'operaciones',    phone: null,          avatar: 'RS' },
  { email: 'mecanico@flotillapremier.mx',     firstName: 'Miguel',     lastName: 'Torres',    role: 'mecanico',       phone: null,          avatar: 'MT' },
  { email: 'supervisor@flotillapremier.mx',   firstName: 'Luis',       lastName: 'Hernández', role: 'supervisor',     phone: null,          avatar: 'LH' },
  { email: 'socio@flotillapremier.mx',        firstName: 'Ricardo',    lastName: 'Mendoza',   role: 'socio',          phone: null,          avatar: 'RM' },
  { email: 'chofer@flotillapremier.mx',       firstName: 'Carlos',     lastName: 'Martínez',  role: 'chofer',         phone: null,          avatar: 'CM' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando seed de cuentas demo...\n');

  // 1. Verificar / crear tenant
  let tenantId: string;

  const existingTenant = await sql`
    SELECT id FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1
  `;

  if (existingTenant.length > 0) {
    tenantId = existingTenant[0].id as string;
    console.log(`✅ Tenant existente: ${TENANT_NAME} (id: ${tenantId})`);
  } else {
    const newTenant = await sql`
      INSERT INTO tenants (name, slug, plan, max_vehicles)
      VALUES (${TENANT_NAME}, ${TENANT_SLUG}, 'pro', 50)
      RETURNING id
    `;
    tenantId = newTenant[0].id as string;
    console.log(`✅ Tenant creado: ${TENANT_NAME} (id: ${tenantId})`);
  }

  console.log('');

  // 2. Hash de password (mismo para todos los usuarios demo)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 3. Crear usuarios
  const results: { email: string; status: 'created' | 'exists' | 'error'; detail?: string }[] = [];

  for (const u of DEMO_USERS) {
    try {
      const existing = await sql`
        SELECT id FROM users WHERE email = ${u.email} LIMIT 1
      `;

      if (existing.length > 0) {
        results.push({ email: u.email, status: 'exists' });
        console.log(`⏩ Ya existe: ${u.email}`);
        continue;
      }

      await sql`
        INSERT INTO users (
          tenant_id, first_name, last_name, email,
          password_hash, role, avatar, phone, active
        ) VALUES (
          ${tenantId},
          ${u.firstName},
          ${u.lastName},
          ${u.email},
          ${passwordHash},
          ${u.role},
          ${u.avatar},
          ${u.phone},
          true
        )
      `;

      results.push({ email: u.email, status: 'created' });
      console.log(`✅ Creado: ${u.email}  (${u.role})`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ email: u.email, status: 'error', detail: msg });
      console.error(`❌ Error con ${u.email}: ${msg}`);
    }
  }

  // 4. Resumen
  const created = results.filter(r => r.status === 'created').length;
  const existed = results.filter(r => r.status === 'exists').length;
  const errors  = results.filter(r => r.status === 'error').length;

  console.log('\n─────────────────────────────────────────');
  console.log(`📊 Resumen:`);
  console.log(`   Creados:     ${created}`);
  console.log(`   Ya existían: ${existed}`);
  console.log(`   Errores:     ${errors}`);
  console.log(`   Contraseña:  ${DEMO_PASSWORD}`);
  console.log('─────────────────────────────────────────\n');

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
