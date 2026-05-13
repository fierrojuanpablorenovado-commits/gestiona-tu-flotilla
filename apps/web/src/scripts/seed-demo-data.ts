/**
 * seed-demo-data.ts
 * Restaura datos demo realistas para el tenant "Flotilla Premier" (slug: flotillapremier)
 *
 * Ejecutar con:
 *   npx tsx src/scripts/seed-demo-data.ts
 */

import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DB_URL);

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Datos de catálogo ─────────────────────────────────────────────────────────

const VEHICLES_DATA = [
  { eco: 'ECO-001', brand: 'Nissan', model: 'Sentra', year: 2022, color: 'Blanco', plates: 'ABC-123-A', vin: '3N1AB7AP4NL123456', km: 28500, status: 'active' },
  { eco: 'ECO-002', brand: 'Toyota', model: 'Corolla', year: 2023, color: 'Gris', plates: 'BCD-234-B', vin: '2T1BURHE0JC123457', km: 15200, status: 'active' },
  { eco: 'ECO-003', brand: 'Chevrolet', model: 'Aveo', year: 2021, color: 'Negro', plates: 'CDE-345-C', vin: 'KL1TE26J57B123458', km: 42000, status: 'active' },
  { eco: 'ECO-004', brand: 'Ford', model: 'Escape', year: 2022, color: 'Azul', plates: 'DEF-456-D', vin: '1FMCU9GX4NUB12345', km: 31800, status: 'active' },
  { eco: 'ECO-005', brand: 'Honda', model: 'Civic', year: 2023, color: 'Rojo', plates: 'EFG-567-E', vin: '19XFC2F54NE123460', km: 8900, status: 'active' },
  { eco: 'ECO-006', brand: 'Volkswagen', model: 'Jetta', year: 2020, color: 'Plata', plates: 'FGH-678-F', vin: '3VW2B7AJ4LM123461', km: 58300, status: 'active' },
  { eco: 'ECO-007', brand: 'Nissan', model: 'Versa', year: 2021, color: 'Blanco', plates: 'GHI-789-G', vin: '3N1CN7AP4ML123462', km: 49700, status: 'active' },
  { eco: 'ECO-008', brand: 'Toyota', model: 'Camry', year: 2024, color: 'Gris', plates: 'HIJ-890-H', vin: '4T1B11HK2NU123463', km: 3200, status: 'active' },
  { eco: 'ECO-009', brand: 'Chevrolet', model: 'Trax', year: 2022, color: 'Negro', plates: 'IJK-901-I', vin: 'KL79MRSL4NB123464', km: 22100, status: 'active' },
  { eco: 'ECO-010', brand: 'Ford', model: 'Explorer', year: 2023, color: 'Azul marino', plates: 'JKL-012-J', vin: '1FM5K8GC0NGA12345', km: 17500, status: 'active' },
  { eco: 'ECO-011', brand: 'Honda', model: 'HR-V', year: 2022, color: 'Blanco perla', plates: 'KLM-123-K', vin: '3CZRU5H30NM123466', km: 33400, status: 'active' },
  { eco: 'ECO-012', brand: 'Volkswagen', model: 'Golf', year: 2021, color: 'Rojo', plates: 'LMN-234-L', vin: '1VWAA7A33DC123467', km: 45600, status: 'active' },
  { eco: 'ECO-013', brand: 'Nissan', model: 'Kicks', year: 2022, color: 'Naranja', plates: 'MNO-345-M', vin: '3N1CP5CU8NL123468', km: 26800, status: 'workshop' },
  { eco: 'ECO-014', brand: 'Toyota', model: 'Hilux', year: 2020, color: 'Blanco', plates: 'NOP-456-N', vin: 'MR0FB8CD0L5123469', km: 67200, status: 'workshop' },
  { eco: 'ECO-015', brand: 'Chevrolet', model: 'Colorado', year: 2019, color: 'Gris', plates: 'OPQ-567-O', vin: '1GCGSCEA4K1123470', km: 82500, status: 'inactive' },
];

const DRIVERS_DATA = [
  { first: 'Carlos', last: 'Hernández García', phone: '55-1234-5678', email: 'chernandez@flotillapremier.mx', lic: 'CDMX-B-2019-001', tipo: 'B', status: 'active', hire: '2020-03-15' },
  { first: 'María', last: 'López Ramírez', phone: '55-2345-6789', email: 'mlopez@flotillapremier.mx', lic: 'CDMX-B-2020-002', tipo: 'B', status: 'active', hire: '2020-06-01' },
  { first: 'José Luis', last: 'Martínez Soto', phone: '55-3456-7890', email: 'jmartinez@flotillapremier.mx', lic: 'CDMX-C-2018-003', tipo: 'C', status: 'active', hire: '2021-01-10' },
  { first: 'Ana Karen', last: 'González Flores', phone: '55-4567-8901', email: 'agonzalez@flotillapremier.mx', lic: 'CDMX-B-2021-004', tipo: 'B', status: 'active', hire: '2021-04-20' },
  { first: 'Roberto', last: 'Pérez Jiménez', phone: '55-5678-9012', email: 'rperez@flotillapremier.mx', lic: 'CDMX-B-2019-005', tipo: 'B', status: 'active', hire: '2020-09-05' },
  { first: 'Laura', last: 'Sánchez Cruz', phone: '55-6789-0123', email: 'lsanchez@flotillapremier.mx', lic: 'CDMX-B-2022-006', tipo: 'B', status: 'active', hire: '2022-02-14' },
  { first: 'Miguel Ángel', last: 'Reyes Morales', phone: '55-7890-1234', email: 'mreyes@flotillapremier.mx', lic: 'CDMX-C-2020-007', tipo: 'C', status: 'active', hire: '2021-07-01' },
  { first: 'Patricia', last: 'Torres Vega', phone: '55-8901-2345', email: 'ptorres@flotillapremier.mx', lic: 'CDMX-B-2020-008', tipo: 'B', status: 'active', hire: '2022-05-18' },
  { first: 'Fernando', last: 'Ramírez Ruiz', phone: '55-9012-3456', email: 'framirez@flotillapremier.mx', lic: 'CDMX-B-2021-009', tipo: 'B', status: 'active', hire: '2022-08-30' },
  { first: 'Claudia', last: 'Mendoza Ortega', phone: '55-0123-4567', email: 'cmendoza@flotillapremier.mx', lic: 'CDMX-B-2019-010', tipo: 'B', status: 'active', hire: '2020-11-22' },
  { first: 'Alejandro', last: 'Díaz Castillo', phone: '55-1357-2468', email: 'adiaz@flotillapremier.mx', lic: 'CDMX-C-2021-011', tipo: 'C', status: 'active', hire: '2023-01-09' },
  { first: 'Verónica', last: 'Gutiérrez Lara', phone: '55-2468-3579', email: 'vgutierrez@flotillapremier.mx', lic: 'CDMX-B-2022-012', tipo: 'B', status: 'active', hire: '2023-03-27' },
  { first: 'Ricardo', last: 'Moreno Vargas', phone: '55-3579-4680', email: 'rmoreno@flotillapremier.mx', lic: 'CDMX-B-2020-013', tipo: 'B', status: 'active', hire: '2022-10-14' },
  { first: 'Sandra', last: 'Fuentes Aguilar', phone: '55-4680-5791', email: 'sfuentes@flotillapremier.mx', lic: 'CDMX-B-2021-014', tipo: 'B', status: 'active', hire: '2023-06-05' },
  { first: 'David', last: 'Medina Espinoza', phone: '55-5791-6802', email: 'dmedina@flotillapremier.mx', lic: 'CDMX-C-2019-015', tipo: 'C', status: 'active', hire: '2021-09-19' },
  { first: 'Gabriela', last: 'Nava Campos', phone: '55-6802-7913', email: 'gnava@flotillapremier.mx', lic: 'CDMX-B-2022-016', tipo: 'B', status: 'active', hire: '2024-01-15' },
  { first: 'Héctor', last: 'Ríos Palacios', phone: '55-7913-8024', email: 'hrios@flotillapremier.mx', lic: 'CDMX-B-2018-017', tipo: 'B', status: 'inactive', hire: '2020-04-01' },
  { first: 'Silvia', last: 'Bravo Montoya', phone: '55-8024-9135', email: 'sbravo@flotillapremier.mx', lic: 'CDMX-B-2019-018', tipo: 'B', status: 'inactive', hire: '2020-07-12' },
  { first: 'Arturo', last: 'Valencia Serrano', phone: '55-9135-0246', email: 'avalencia@flotillapremier.mx', lic: 'CDMX-C-2020-019', tipo: 'C', status: 'suspended', hire: '2021-11-30' },
  { first: 'Isabel', last: 'Contreras Rojas', phone: '55-0246-1357', email: 'icontreras@flotillapremier.mx', lic: 'CDMX-B-2021-020', tipo: 'B', status: 'suspended', hire: '2022-04-08' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Buscando tenant flotillapremier...');

  const tenants = await sql`SELECT id, name, slug FROM tenants WHERE slug = 'flotillapremier'`;
  if (tenants.length === 0) {
    throw new Error('No se encontró el tenant con slug "flotillapremier". Créalo primero.');
  }
  const tenant = tenants[0];
  console.log(`Tenant encontrado: ${tenant.name} (${tenant.id})`);

  const tenantId = tenant.id as string;

  // ── Limpiar datos anteriores ──────────────────────────────────────────────
  console.log('\nLimpiando datos anteriores...');
  await sql`DELETE FROM treasury_transactions WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM maintenance_parts WHERE order_id IN (SELECT id FROM maintenance_orders WHERE tenant_id = ${tenantId})`;
  await sql`DELETE FROM maintenance_orders WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM drivers WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM vehicles WHERE tenant_id = ${tenantId}`;
  console.log('Datos anteriores eliminados.');

  // ── Insertar vehículos ────────────────────────────────────────────────────
  console.log('\nInsertando 15 vehículos...');
  const vehicleIds: string[] = [];
  for (const v of VEHICLES_DATA) {
    const id = randomUUID();
    vehicleIds.push(id);
    await sql`
      INSERT INTO vehicles (id, tenant_id, eco, brand, model, year, color, plates, vin, km_actual, status, platform, created_at, updated_at)
      VALUES (
        ${id}, ${tenantId}, ${v.eco}, ${v.brand}, ${v.model}, ${v.year},
        ${v.color}, ${v.plates}, ${v.vin}, ${v.km}, ${v.status},
        ARRAY['Uber','DiDi']::text[],
        NOW(), NOW()
      )
    `;
  }
  console.log(`${vehicleIds.length} vehículos insertados.`);

  // ── Insertar choferes ─────────────────────────────────────────────────────
  console.log('\nInsertando 20 choferes...');
  const driverIds: string[] = [];
  for (let i = 0; i < DRIVERS_DATA.length; i++) {
    const d = DRIVERS_DATA[i];
    const id = randomUUID();
    driverIds.push(id);
    const vehicleId = i < 12 ? vehicleIds[i] : null;
    const licVenc = new Date();
    licVenc.setFullYear(licVenc.getFullYear() + randomBetween(1, 4));
    const licVencStr = licVenc.toISOString().slice(0, 10);

    await sql`
      INSERT INTO drivers (
        id, tenant_id, vehicle_id, first_name, last_name, phone, email,
        licencia, licencia_tipo, licencia_vencimiento, hire_date, status,
        rating, score, platforms, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${vehicleId}, ${d.first}, ${d.last},
        ${d.phone}, ${d.email}, ${d.lic}, ${d.tipo}, ${licVencStr},
        ${d.hire}, ${d.status},
        ${parseFloat((randomBetween(38, 50) / 10).toFixed(1))},
        ${randomBetween(70, 100)},
        ARRAY['Uber','DiDi']::text[],
        NOW(), NOW()
      )
    `;
  }
  console.log(`${driverIds.length} choferes insertados.`);

  // ── Insertar órdenes de mantenimiento ─────────────────────────────────────
  console.log('\nInsertando 25 órdenes de mantenimiento...');

  // tipo válidos: 'Preventivo', 'Correctivo', 'Urgente'
  // usamos descripcion para especificar el trabajo detallado
  const MAINT_TIPOS = ['Preventivo', 'Correctivo', 'Urgente'];
  const MAINT_TRABAJOS = ['Aceite y filtros', 'Frenos', 'Llantas', 'Revisión general', 'Transmisión', 'Afinación', 'Frenos traseros'];
  const TALLERES = ['Taller Express Norte', 'Servicio Rápido Sur', 'AutoFix Centro', 'MechaPro Oriente', 'GarantíaCar Poniente'];

  // Valores válidos: 'Programado', 'En diagnostico', 'En reparacion', 'Esperando refacciones', 'Completado', 'Cancelado'
  const maintStatuses = [
    ...Array(15).fill('Completado'),
    ...Array(4).fill('En reparacion'),
    ...Array(2).fill('En diagnostico'),
    ...Array(4).fill('Programado'),
  ];

  for (let i = 0; i < 25; i++) {
    const id = randomUUID();
    const vehicleId = randomFrom(vehicleIds);
    const tipo = randomFrom(MAINT_TIPOS);
    const trabajo = randomFrom(MAINT_TRABAJOS);
    const status = maintStatuses[i];
    const costoEstimado = randomBetween(800, 15000);
    const costoReal = status === 'Completado' ? randomBetween(700, 15500) : null;
    const daysIn = randomBetween(5, 180);
    const fechaIngreso = daysAgo(daysIn);
    const fechaSalida = status === 'Completado' ? daysAgo(daysIn - randomBetween(1, 5)) : null;
    const orden = `OM-${String(2026001 + i).padStart(7, '0')}`;

    await sql`
      INSERT INTO maintenance_orders (
        id, tenant_id, vehicle_id, orden, tipo, descripcion, taller,
        fecha_ingreso, fecha_salida, costo_estimado, costo_real,
        status, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${vehicleId}, ${orden}, ${tipo},
        ${`${trabajo} - revisión y reemplazo según kilometraje`},
        ${randomFrom(TALLERES)},
        ${fechaIngreso}, ${fechaSalida},
        ${costoEstimado}, ${costoReal},
        ${status}, NOW(), NOW()
      )
    `;
  }
  console.log('25 órdenes de mantenimiento insertadas.');

  // ── Insertar movimientos de tesorería ─────────────────────────────────────
  console.log('\nInsertando 30 movimientos de tesorería...');

  type TreasuryTipo = { tipo: 'ingreso' | 'egreso' | 'transferencia'; categoria: string; desc: string; minMonto: number; maxMonto: number };
  const TREASURY_TIPOS: TreasuryTipo[] = [
    { tipo: 'ingreso', categoria: 'Renta de vehículo', desc: 'Pago de renta semanal de unidad', minMonto: 2500, maxMonto: 4500 },
    { tipo: 'ingreso', categoria: 'Liquidación semanal chofer', desc: 'Liquidación semanal de chofer', minMonto: 1800, maxMonto: 3500 },
    { tipo: 'egreso', categoria: 'Combustible', desc: 'Carga de combustible unidad', minMonto: 800, maxMonto: 2200 },
    { tipo: 'egreso', categoria: 'Mantenimiento', desc: 'Pago de servicio en taller', minMonto: 1200, maxMonto: 12000 },
    { tipo: 'egreso', categoria: 'Seguro', desc: 'Prima de seguro mensual', minMonto: 1500, maxMonto: 3500 },
    { tipo: 'egreso', categoria: 'Tenencia', desc: 'Pago de tenencia vehicular', minMonto: 2000, maxMonto: 6000 },
  ];

  for (let i = 0; i < 30; i++) {
    const id = randomUUID();
    const tType = randomFrom(TREASURY_TIPOS);
    const monto = randomBetween(tType.minMonto, tType.maxMonto);
    const fecha = daysAgo(randomBetween(1, 90));
    const vehicleId = randomFrom(vehicleIds);
    const driverId = tType.tipo === 'ingreso' ? randomFrom(driverIds) : null;
    const ref = `REF-${Date.now()}-${i}`;

    await sql`
      INSERT INTO treasury_transactions (
        id, tenant_id, tipo, categoria, descripcion, monto, fecha,
        reference, driver_id, vehicle_id, status, created_at, updated_at
      ) VALUES (
        ${id}, ${tenantId}, ${tType.tipo}, ${tType.categoria},
        ${`${tType.desc} #${vehicleId.slice(-4).toUpperCase()}`},
        ${monto}, ${fecha}, ${ref},
        ${driverId}, ${vehicleId},
        'completed', NOW(), NOW()
      )
    `;
  }
  console.log('30 movimientos de tesorería insertados.');

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n✔ Seed completado exitosamente para "Flotilla Premier"');
  console.log(`  - Vehículos: ${vehicleIds.length}`);
  console.log(`  - Choferes: ${driverIds.length}`);
  console.log('  - Órdenes de mantenimiento: 25');
  console.log('  - Movimientos de tesorería: 30');
}

main().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
