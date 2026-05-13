import { neon } from '@neondatabase/serverless';
const DB = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);
const TID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b';

// Schema real de users
console.log('=== COLUMNAS DE USERS ===');
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
console.log(cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));

// Usuarios
console.log('\n=== USUARIOS ===');
const users = await sql`SELECT id::text, email, role, first_name, last_name FROM users WHERE tenant_id = ${TID} ORDER BY role, first_name`;
users.forEach(u => console.log(`  [${u.role}] ${u.first_name} ${u.last_name} | ${u.email}`));

// Choferes
console.log('\n=== CHOFERES ===');
const drivers = await sql`SELECT id::text, first_name, last_name, phone FROM drivers WHERE tenant_id = ${TID} ORDER BY first_name`;
drivers.forEach(d => console.log(`  ${d.first_name} ${d.last_name} | ${d.phone}`));

// Match entre users y drivers por nombre
console.log('\n=== MATCH USERS ↔ DRIVERS ===');
for (const u of users.filter(u => u.role === 'chofer')) {
  const matched = drivers.find(d =>
    d.first_name.toLowerCase() === u.first_name.toLowerCase() &&
    d.last_name.toLowerCase() === u.last_name.toLowerCase()
  );
  console.log(`  User ${u.first_name} ${u.last_name} → ${matched ? '✅ driver ' + matched.id : '❌ sin match'}`);
}

// Mantenimiento
console.log('\n=== MANTENIMIENTO ===');
const maint = await sql`
  SELECT mo.id, v.eco, mo.service_type, mo.description, mo.status, mo.service_date, mo.cost
  FROM maintenance_orders mo
  LEFT JOIN vehicles v ON v.id = mo.vehicle_id
  WHERE mo.tenant_id = ${TID}
  ORDER BY mo.service_date DESC LIMIT 10
`.catch(() => []);
maint.forEach(m => console.log(`  ${m.eco} | ${m.service_type} | ${m.status} | ${String(m.service_date).substring(0,10)} | $${m.cost}`));
if (maint.length === 0) console.log('  (vacío)');

// Contabilidad
console.log('\n=== CONTABILIDAD ===');
const acctCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'accounting_records' ORDER BY ordinal_position`.catch(() => []);
console.log('Columnas:', acctCols.map(c => c.column_name).join(', ') || '(tabla no existe)');
const acctCount = await sql`SELECT COUNT(*) AS cnt FROM accounting_records WHERE tenant_id = ${TID}`.catch(() => [{cnt:'N/A'}]);
console.log('Registros:', acctCount[0].cnt);

// GPS
console.log('\n=== GPS / LOCATIONS ===');
const locCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'vehicle_locations' ORDER BY ordinal_position`.catch(() => []);
console.log('Columnas:', locCols.map(c => c.column_name).join(', ') || '(tabla no existe)');
const locs = await sql`SELECT v.eco, l.lat, l.lng, l.speed, l.recorded_at FROM vehicle_locations l LEFT JOIN vehicles v ON v.id = l.vehicle_id WHERE l.tenant_id = ${TID} ORDER BY l.recorded_at DESC LIMIT 3`.catch(() => []);
if (locs.length === 0) console.log('  (sin datos)');
else locs.forEach(l => console.log(`  ${l.eco} | ${l.lat},${l.lng}`));

// Tablas
console.log('\n=== TODAS LAS TABLAS ===');
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
console.log(tables.map(t => t.tablename).join(', '));
