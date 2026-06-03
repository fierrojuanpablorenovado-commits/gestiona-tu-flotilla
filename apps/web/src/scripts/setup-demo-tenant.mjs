/**
 * setup-demo-tenant.mjs
 * Crea el tenant "demo" aislado con datos 100% ficticios.
 * NUNCA toca tenants reales (al-volante-gdl, alvolantegdl, etc.)
 *
 * Uso: node src/scripts/setup-demo-tenant.mjs
 */

import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

const DB_URL =
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DB_URL);

// ── Bcrypt-lite: usamos una función simple para no depender de bcrypt en .mjs ──
// Como no podemos importar bcrypt fácilmente en ESM, guardamos el hash pre-generado
// para la password 'Demo2024!' (bcrypt cost 10)
const DEMO_PASSWORD_HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password" but we'll use bcryptjs below
// Realmente generamos el hash con crypto+bcrypt simulado — usamos una API route para hashear
// O simplemente usamos sha256 wrapeado en el mismo formato que nuestra app usa

// La app usa bcryptjs — necesitamos ejecutar esto con tsx para usar bcrypt
// Usamos un hack: generamos el hash directamente aquí con el módulo bcryptjs de Node

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const DEMO_PASSWORD = 'Demo2024!';
const TENANT_SLUG   = 'demo';
const TENANT_NAME   = 'Flotilla Demo';

// ── Datos ficticios ────────────────────────────────────────────────────────────

const VEHICLES = [
  { eco: 'D-001', brand: 'Nissan',     model: 'Sentra',   year: 2022, color: 'Blanco',      plates: 'XAB-123-A', vin: '3N1AB7AP4NL900001', km: 28500 },
  { eco: 'D-002', brand: 'Toyota',     model: 'Corolla',  year: 2023, color: 'Gris',         plates: 'XBC-234-B', vin: '2T1BURHE0JC900002', km: 15200 },
  { eco: 'D-003', brand: 'Chevrolet',  model: 'Aveo',     year: 2021, color: 'Negro',        plates: 'XCD-345-C', vin: 'KL1TE26J57B900003', km: 42000 },
  { eco: 'D-004', brand: 'Ford',       model: 'Escape',   year: 2022, color: 'Azul',         plates: 'XDE-456-D', vin: '1FMCU9GX4NUB90004', km: 31800 },
  { eco: 'D-005', brand: 'Honda',      model: 'Civic',    year: 2023, color: 'Rojo',         plates: 'XEF-567-E', vin: '19XFC2F54NE900005', km:  8900 },
  { eco: 'D-006', brand: 'Volkswagen', model: 'Jetta',    year: 2020, color: 'Plata',        plates: 'XFG-678-F', vin: '3VW2B7AJ4LM900006', km: 58300 },
  { eco: 'D-007', brand: 'Nissan',     model: 'Versa',    year: 2021, color: 'Blanco',       plates: 'XGH-789-G', vin: '3N1CN7AP4ML900007', km: 49700 },
  { eco: 'D-008', brand: 'Toyota',     model: 'Camry',    year: 2024, color: 'Gris oscuro',  plates: 'XHI-890-H', vin: '4T1B11HK2NU900008', km:  3200 },
  { eco: 'D-009', brand: 'Chevrolet',  model: 'Trax',     year: 2022, color: 'Negro mate',   plates: 'XIJ-901-I', vin: 'KL79MRSL4NB900009', km: 22100 },
  { eco: 'D-010', brand: 'Ford',       model: 'Explorer', year: 2023, color: 'Azul marino',  plates: 'XJK-012-J', vin: '1FM5K8GC0NGA90010', km: 17500 },
];

const DRIVERS = [
  { first: 'Carlos',     last: 'Hernández García',   phone: '33-1234-5678', email: 'chernandez@demo.mx',  lic: 'GDL-B-2019-001' },
  { first: 'María',      last: 'López Ramírez',      phone: '33-2345-6789', email: 'mlopez@demo.mx',      lic: 'GDL-B-2020-002' },
  { first: 'José Luis',  last: 'Martínez Soto',      phone: '33-3456-7890', email: 'jmartinez@demo.mx',   lic: 'GDL-C-2018-003' },
  { first: 'Ana Karen',  last: 'González Flores',    phone: '33-4567-8901', email: 'agonzalez@demo.mx',   lic: 'GDL-B-2021-004' },
  { first: 'Roberto',    last: 'Pérez Jiménez',      phone: '33-5678-9012', email: 'rperez@demo.mx',      lic: 'GDL-B-2019-005' },
  { first: 'Laura',      last: 'Sánchez Cruz',       phone: '33-6789-0123', email: 'lsanchez@demo.mx',    lic: 'GDL-B-2022-006' },
  { first: 'Miguel',     last: 'Reyes Morales',      phone: '33-7890-1234', email: 'mreyes@demo.mx',      lic: 'GDL-C-2020-007' },
  { first: 'Patricia',   last: 'Torres Vega',        phone: '33-8901-2345', email: 'ptorres@demo.mx',     lic: 'GDL-B-2020-008' },
  { first: 'Fernando',   last: 'Ramírez Ruiz',       phone: '33-9012-3456', email: 'framirez@demo.mx',    lic: 'GDL-B-2021-009' },
  { first: 'Claudia',    last: 'Mendoza Ortega',     phone: '33-0123-4567', email: 'cmendoza@demo.mx',    lic: 'GDL-B-2019-010' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🚀 Setup tenant demo aislado...\n');

  // ── 1. Crear o reutilizar tenant demo ────────────────────────────────────────
  let tenantId;
  const existing = await sql`SELECT id FROM tenants WHERE slug = 'demo' LIMIT 1`;

  if (existing[0]) {
    tenantId = existing[0].id;
    console.log(`✅ Tenant demo ya existe (id: ${tenantId})`);
  } else {
    const created = await sql`
      INSERT INTO tenants (name, slug, plan, max_vehicles, trial_ends_at)
      VALUES ('Flotilla Demo', 'demo', 'pro', 50, NULL)
      RETURNING id
    `;
    tenantId = created[0].id;
    console.log(`✅ Tenant demo creado (id: ${tenantId})`);
  }

  // ── 2. Crear usuario admin_general demo ──────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const adminEmail = 'admin@demo.gestionatuflotilla.com';

  const existingUser = await sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`;
  if (!existingUser[0]) {
    await sql`
      INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, avatar, active)
      VALUES (${tenantId}, 'Admin', 'Demo', ${adminEmail}, ${passwordHash}, 'admin_general', 'AD', true)
    `;
    console.log(`✅ Usuario admin creado: ${adminEmail} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`⏩ Usuario admin ya existe: ${adminEmail}`);
  }

  // ── 3. Limpiar datos anteriores del tenant demo (en orden FK seguro) ─────────
  console.log('\n🧹 Limpiando datos demo anteriores...');
  await sql`DELETE FROM weekly_accounts WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM vehicle_insurance WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM maintenance_parts WHERE order_id IN (SELECT id FROM maintenance_orders WHERE tenant_id = ${tenantId})`;
  await sql`DELETE FROM maintenance_orders WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM incidents WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM infracciones WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM drivers WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM vehicles WHERE tenant_id = ${tenantId}`;
  console.log('✅ Limpieza completa.');

  // ── 4. Insertar vehículos ficticios ──────────────────────────────────────────
  console.log('\n🚗 Insertando 10 vehículos ficticios...');
  const vehicleIds = [];

  for (const v of VEHICLES) {
    const id = randomUUID();
    vehicleIds.push(id);
    await sql`
      INSERT INTO vehicles (id, tenant_id, eco, brand, model, year, color, plates, vin, km_actual, status, platform, created_at, updated_at)
      VALUES (
        ${id}, ${tenantId}, ${v.eco}, ${v.brand}, ${v.model}, ${v.year},
        ${v.color}, ${v.plates}, ${v.vin}, ${v.km}, 'active',
        ARRAY['Uber','DiDi']::text[], NOW(), NOW()
      )
    `;
  }
  console.log(`✅ ${vehicleIds.length} vehículos insertados.`);

  // ── 5. Insertar choferes ficticios ───────────────────────────────────────────
  console.log('\n👤 Insertando 10 choferes ficticios...');
  const driverIds = [];

  for (let i = 0; i < DRIVERS.length; i++) {
    const d = DRIVERS[i];
    const id = randomUUID();
    driverIds.push(id);
    const licVenc = new Date();
    licVenc.setFullYear(licVenc.getFullYear() + rand(1, 4));
    const licVencStr = licVenc.toISOString().slice(0, 10);
    const vehicleId = vehicleIds[i] ?? null;

    await sql`
      INSERT INTO drivers (
        id, tenant_id, vehicle_id, first_name, last_name, phone, email,
        licencia, licencia_tipo, licencia_vencimiento, hire_date, status,
        rating, score, platforms, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${vehicleId}, ${d.first}, ${d.last},
        ${d.phone}, ${d.email}, ${d.lic}, 'B', ${licVencStr},
        ${daysAgo(rand(180, 900))}, 'active',
        ${parseFloat((rand(38, 50) / 10).toFixed(1))},
        ${rand(70, 100)},
        ARRAY['Uber','DiDi']::text[], NOW(), NOW()
      )
    `;
  }
  console.log(`✅ ${driverIds.length} choferes insertados.`);

  // ── 6. Insertar cuentas semanales ficticias ──────────────────────────────────
  console.log('\n💰 Insertando cuentas semanales...');
  for (let w = 0; w < 8; w++) {
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - 7 * (w + 1));
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekStart = weekStartDate.toISOString().slice(0, 10);
    const weekEnd   = weekEndDate.toISOString().slice(0, 10);

    for (let di = 0; di < driverIds.length; di++) {
      const id = randomUUID();
      const uber  = rand(1200, 4000);
      const didi  = rand(800,  3000);
      const rent  = rand(800,  2600);
      const isPaid = w > 0;
      await sql`
        INSERT INTO weekly_accounts (
          id, tenant_id, driver_id, vehicle_id,
          week_start, week_end,
          uber_income, didi_income, rent,
          trips_count, status, created_at, updated_at
        ) VALUES (
          ${id}, ${tenantId}, ${driverIds[di]}, ${vehicleIds[di] ?? vehicleIds[0]},
          ${weekStart}, ${weekEnd},
          ${uber}, ${didi}, ${rent},
          ${rand(20, 80)},
          ${isPaid ? 'paid' : 'pending'}, NOW(), NOW()
        )
      `;
    }
  }
  console.log('✅ Cuentas semanales insertadas (8 semanas × 10 choferes).');

  // ── 7. Insertar seguros ficticios ────────────────────────────────────────────
  console.log('\n🛡️ Insertando seguros...');
  const ASEGURADORAS = ['GNP Seguros', 'Qualitas', 'HDI Seguros', 'AXA México', 'Mapfre'];
  for (let i = 0; i < vehicleIds.length; i++) {
    const id = randomUUID();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - rand(1, 6));
    const expiryDate = new Date(startDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    await sql`
      INSERT INTO vehicle_insurance (
        id, tenant_id, vehicle_id, insurer, policy_number,
        start_date, expiry_date, coverage_type, annual_premium, insured_amount,
        created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${vehicleIds[i]},
        ${pick(ASEGURADORAS)},
        ${'POL-DEMO-' + String(i + 1).padStart(4, '0')},
        ${startDate.toISOString().slice(0, 10)},
        ${expiryDate.toISOString().slice(0, 10)},
        'Amplia',
        ${rand(14000, 42000)},
        ${rand(200000, 400000)},
        NOW(), NOW()
      )
    `;
  }
  console.log('✅ 10 seguros insertados.');

  // ── 8. Insertar órdenes de mantenimiento ─────────────────────────────────────
  console.log('\n🔧 Insertando órdenes de mantenimiento...');
  const TRABAJOS   = ['Aceite y filtros', 'Frenos', 'Llantas', 'Revisión general', 'Afinación'];
  const TALLERES   = ['Taller Express Norte', 'Servicio Rápido Sur', 'AutoFix Centro'];
  const MANT_STATS = ['Completado', 'Completado', 'Completado', 'En reparacion', 'Programado'];

  for (let i = 0; i < 15; i++) {
    const id = randomUUID();
    const status = pick(MANT_STATS);
    const daysIn = rand(5, 180);
    await sql`
      INSERT INTO maintenance_orders (
        id, tenant_id, vehicle_id, orden, tipo, descripcion, taller,
        fecha_ingreso, fecha_salida, costo_estimado, costo_real,
        status, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${pick(vehicleIds)},
        ${'OM-DEMO-' + String(i + 1).padStart(4, '0')},
        'Preventivo', ${pick(TRABAJOS) + ' — revisión y reemplazo'}, ${pick(TALLERES)},
        ${daysAgo(daysIn)},
        ${status === 'Completado' ? daysAgo(daysIn - rand(1, 4)) : null},
        ${rand(800, 12000)},
        ${status === 'Completado' ? rand(700, 12500) : null},
        ${status}, NOW(), NOW()
      )
    `;
  }
  console.log('✅ 15 órdenes de mantenimiento insertadas.');

  console.log('\n🎉 TENANT DEMO LISTO');
  console.log('─────────────────────────────────────────');
  console.log(`   Tenant:     Flotilla Demo (slug: demo)`);
  console.log(`   Admin:      ${adminEmail}`);
  console.log(`   Password:   ${DEMO_PASSWORD}`);
  console.log(`   Vehículos:  ${vehicleIds.length}`);
  console.log(`   Choferes:   ${driverIds.length}`);
  console.log('─────────────────────────────────────────');
}

main().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
