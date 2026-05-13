import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS vehicle_insurance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
      insurer VARCHAR(100) NOT NULL,
      policy_number VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      coverage_type VARCHAR(50) DEFAULT 'amplia',
      annual_premium DECIMAL(10,2),
      insured_amount DECIMAL(12,2),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  console.log('✅ Tabla vehicle_insurance creada')

  // Insertar datos demo
  const demoTenantId = '3e3554d2-70a7-47c8-a161-3b6755888b2c'
  const vehicles = await sql`SELECT id, eco FROM vehicles WHERE tenant_id = ${demoTenantId} LIMIT 6`

  for (const v of vehicles) {
    await sql`
      INSERT INTO vehicle_insurance (tenant_id, vehicle_id, insurer, policy_number, start_date, expiry_date, coverage_type, annual_premium, insured_amount)
      VALUES (
        ${demoTenantId}, ${v.id},
        ${['AXA', 'Qualitas', 'GNP', 'HDI', 'Chubb', 'MAPFRE'][Math.floor(Math.random()*6)]},
        ${`POL-${v.eco}-${2024 + Math.floor(Math.random()*2)}`},
        ${new Date(2025, Math.floor(Math.random()*6), 1).toISOString().split('T')[0]},
        ${new Date(2026, Math.floor(Math.random()*12), 1).toISOString().split('T')[0]},
        ${['amplia', 'amplia', 'basica', 'rc'][Math.floor(Math.random()*4)]},
        ${8000 + Math.floor(Math.random()*12000)},
        ${300000 + Math.floor(Math.random()*200000)}
      )
    `
  }
  console.log('✅ Datos demo de seguros insertados')
}

main().catch(console.error)
