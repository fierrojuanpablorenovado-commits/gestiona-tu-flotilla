/**
 * seed-demo-users.mjs
 * Crea los usuarios demo de Flotilla Premier en la BD de Neon.
 * Todos con contraseña: Flotilla2024
 *
 * Uso: node scripts/seed-demo-users.mjs
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  } catch {}
}
loadEnv();

const sql = neon(process.env.DATABASE_URL);

const DEMO_PASSWORD = 'Flotilla2024';

const DEMO_USERS = [
  { firstName: 'Juan Pablo', lastName: 'Fierro',   email: 'admingeneral@flotillapremier.mx', role: 'admin_general'  },
  { firstName: 'Sofía',      lastName: 'Ramírez',  email: 'admin@flotillapremier.mx',        role: 'administrador'  },
  { firstName: 'María',      lastName: 'González', email: 'tesoreria@flotillapremier.mx',    role: 'tesoreria'      },
  { firstName: 'Roberto',    lastName: 'Sánchez',  email: 'operaciones@flotillapremier.mx',  role: 'operaciones'    },
  { firstName: 'Miguel',     lastName: 'Torres',   email: 'mecanico@flotillapremier.mx',     role: 'mecanico'       },
  { firstName: 'Luis',       lastName: 'Hernández',email: 'supervisor@flotillapremier.mx',   role: 'supervisor'     },
  { firstName: 'Ricardo',    lastName: 'Mendoza',  email: 'socio@flotillapremier.mx',        role: 'socio'          },
  { firstName: 'Carlos',     lastName: 'Martínez', email: 'chofer@flotillapremier.mx',       role: 'chofer'         },
];

async function main() {
  console.log('🌱 Creando usuarios demo...\n');

  // Obtener el tenant_id del primer tenant (Mi Flotilla)
  const tenants = await sql`SELECT id FROM tenants LIMIT 1`;
  if (!tenants.length) {
    console.error('❌ No existe ningún tenant. Ejecuta setup-db.mjs primero.');
    process.exit(1);
  }
  const tenantId = tenants[0].id;
  console.log(`✅ Tenant ID: ${tenantId}`);

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const u of DEMO_USERS) {
    try {
      await sql`
        INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, active)
        VALUES (${tenantId}, ${u.firstName}, ${u.lastName}, ${u.email}, ${hash}, ${u.role}, true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          first_name    = EXCLUDED.first_name,
          last_name     = EXCLUDED.last_name,
          role          = EXCLUDED.role,
          active        = true
      `;
      console.log(`  ✅ ${u.email} (${u.role})`);
    } catch (err) {
      console.error(`  ❌ ${u.email} — ${err.message}`);
    }
  }

  console.log(`\n✅ Listo. Contraseña de todos: ${DEMO_PASSWORD}`);
}

main().catch(console.error);
