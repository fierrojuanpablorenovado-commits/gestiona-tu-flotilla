import { neon } from '@neondatabase/serverless'

const sql = neon('postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS vehicle_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      vehicle_id UUID,
      driver_id UUID,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      speed DECIMAL(5,2) DEFAULT 0,
      recorded_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✅ Tabla vehicle_locations creada')
}

main().catch(console.error)
