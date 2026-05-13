import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon('postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');
  const t = await sql`SELECT id FROM tenants WHERE slug = 'flotillapremier'`;
  const tid = t[0].id;
  console.log('tenant_id:', tid);
  const v = await sql`SELECT COUNT(*) as c FROM vehicles WHERE tenant_id = ${tid}`;
  const d = await sql`SELECT COUNT(*) as c FROM drivers WHERE tenant_id = ${tid}`;
  const u = await sql`SELECT email, tenant_id FROM users WHERE email = 'admingeneral@flotillapremier.mx'`;
  console.log('Vehiculos:', v[0].c);
  console.log('Choferes:', d[0].c);
  console.log('user tenant_id:', u[0]?.tenant_id);
  console.log('Coincide:', u[0]?.tenant_id === tid);
}
main().catch(console.error);
