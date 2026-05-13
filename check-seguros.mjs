import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);
const TID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b';

const vehicles = await sql`SELECT id::text, eco, brand, model, plates, status FROM vehicles WHERE tenant_id = ${TID} ORDER BY eco`;
console.log('=== VEHICLES (' + vehicles.length + ') ===');
vehicles.forEach(v => console.log(v.eco.padEnd(6), v.status.padEnd(10), v.plates));

const ins = await sql`SELECT i.id, v.eco, i.insurer, i.expiry_date FROM vehicle_insurance i LEFT JOIN vehicles v ON i.vehicle_id = v.id WHERE i.tenant_id = ${TID} ORDER BY v.eco`;
console.log('\n=== INSURANCE (' + ins.length + ') ===');
ins.forEach(i => console.log(i.eco?.padEnd(6), i.insurer?.padEnd(15), String(i.expiry_date).substring(0,10)));

const uninss = await sql`SELECT v.eco, v.status FROM vehicles v WHERE v.tenant_id = ${TID} AND v.status NOT IN ('inactive','sold') AND NOT EXISTS (SELECT 1 FROM vehicle_insurance i WHERE i.vehicle_id = v.id AND i.tenant_id = v.tenant_id) ORDER BY v.eco`;
console.log('\n=== UNINSURED ACTIVE: ' + uninss.length + ' ===');
uninss.forEach(u => console.log(u.eco, u.status));
