import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon('postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');
  
  const CORRECT_TENANT_ID = '3e3554d2-70a7-47c8-a161-3b6755888b2c';
  
  const demoEmails = [
    'admingeneral@flotillapremier.mx',
    'admin@flotillapremier.mx',
    'tesoreria@flotillapremier.mx',
    'operaciones@flotillapremier.mx',
    'mecanico@flotillapremier.mx',
    'supervisor@flotillapremier.mx',
    'socio@flotillapremier.mx',
    'chofer@flotillapremier.mx',
  ];

  for (const email of demoEmails) {
    const result = await sql`
      UPDATE users SET tenant_id = ${CORRECT_TENANT_ID}
      WHERE email = ${email}
      RETURNING email, tenant_id
    `;
    if (result[0]) {
      console.log('✓ Actualizado:', result[0].email);
    } else {
      console.log('⚠ No encontrado:', email);
    }
  }
  console.log('\n✔ Todos los usuarios demo ahora apuntan al tenant correcto.');
}
main().catch(console.error);
