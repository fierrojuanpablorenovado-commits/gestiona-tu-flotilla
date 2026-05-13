/**
 * seed-notifications.ts
 * Inserta 6 notificaciones demo para el tenant demo (id=1).
 *
 * Uso:
 *   npx tsx src/scripts/seed-notifications.ts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

// Demo tenant
const TENANT_ID = 1;

async function main() {
  console.log('🔔 Insertando notificaciones demo...\n');

  // Crear tabla si no existe
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT,
      severity VARCHAR(20) DEFAULT 'info',
      read BOOLEAN DEFAULT FALSE,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Eliminar notificaciones demo previas
  await sql`DELETE FROM notifications WHERE tenant_id = ${TENANT_ID}`;

  const notifs = [
    {
      type: 'insurance',
      title: 'Seguro por vencer',
      message: 'El seguro de la unidad ECO-003 (Toyota Aveo) vence en 12 días. Renueva antes del 13 de abril.',
      severity: 'warning',
      entity_type: 'vehicle',
      entity_id: 3,
    },
    {
      type: 'insurance',
      title: 'Seguro vencido',
      message: 'El seguro de la unidad ECO-007 (Nissan Versa) venció hace 2 días. Renovación urgente requerida.',
      severity: 'danger',
      entity_type: 'vehicle',
      entity_id: 7,
    },
    {
      type: 'maintenance',
      title: 'Mantenimiento programado',
      message: 'Servicio de 40,000 km para ECO-001 programado en 3 días. Confirma disponibilidad con el taller.',
      severity: 'warning',
      entity_type: 'vehicle',
      entity_id: 1,
    },
    {
      type: 'payment',
      title: 'Pago de tenencia próximo',
      message: 'La tenencia vehicular de ECO-005 vence en 2 días — $3,200 MXN pendiente.',
      severity: 'danger',
      entity_type: 'vehicle',
      entity_id: 5,
    },
    {
      type: 'alert',
      title: 'Incidencia sin resolver',
      message: 'Reporte de accidente menor del chofer Carlos Martínez lleva 28 horas sin atención.',
      severity: 'danger',
      entity_type: 'driver',
      entity_id: 2,
    },
    {
      type: 'maintenance',
      title: 'Cambio de aceite pendiente',
      message: 'ECO-002 superó los 5,000 km desde el último cambio de aceite. Programa el servicio.',
      severity: 'info',
      entity_type: 'vehicle',
      entity_id: 2,
    },
  ];

  for (const n of notifs) {
    await sql`
      INSERT INTO notifications (tenant_id, type, title, message, severity, entity_type, entity_id)
      VALUES (
        ${TENANT_ID},
        ${n.type},
        ${n.title},
        ${n.message},
        ${n.severity},
        ${n.entity_type},
        ${n.entity_id}
      )
    `;
    console.log(`✅ ${n.type}: ${n.title}`);
  }

  console.log('\n🎉 6 notificaciones demo insertadas.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
