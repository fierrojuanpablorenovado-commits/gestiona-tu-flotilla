/**
 * seed-accounting-demo.ts
 * Agrega 3 meses de datos de contabilidad demo para el tenant de Flotilla Premier.
 *
 * Uso:
 *   npx tsx src/scripts/seed-accounting-demo.ts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

const TENANT_SLUG = 'flotillapremier';

// Conductores demo con ingresos Didi Fleet
const CONDUCTORES = [
  { nombre: 'Carlos Martínez',   ingresos: 18500, viajes: 142 },
  { nombre: 'Ana González',      ingresos: 21300, viajes: 165 },
  { nombre: 'Roberto Sánchez',   ingresos: 15800, viajes: 119 },
  { nombre: 'María López',       ingresos: 23100, viajes: 178 },
  { nombre: 'José Hernández',    ingresos: 16900, viajes: 130 },
  { nombre: 'Laura Torres',      ingresos: 19400, viajes: 148 },
  { nombre: 'Miguel Ramírez',    ingresos: 22000, viajes: 170 },
  { nombre: 'Sofía Mendoza',     ingresos: 17600, viajes: 135 },
];

// Gastos fijos mensuales por vehículo
const GASTOS_FIJOS = [
  { category: 'combustible',  description: 'Gasolina flotilla completa — mayo',       amount: 28000, is_deductible: true  },
  { category: 'mantenimiento',description: 'Servicio preventivo 8 vehículos',          amount: 12400, is_deductible: true  },
  { category: 'seguro',       description: 'Seguro flotilla mensual — GNP',            amount:  9800, is_deductible: true  },
  { category: 'renta',        description: 'Renta de 3 vehículos adicionales',          amount:  6000, is_deductible: true  },
  { category: 'servicios',    description: 'Plataforma Gestiona tu Flotilla Pro',       amount:   599, is_deductible: true  },
  { category: 'otros',        description: 'Uniformes e insumos conductores',           amount:  1800, is_deductible: false },
  { category: 'otros',        description: 'Gastos administrativos varios',             amount:  2100, is_deductible: false },
];

async function seedMonth(tenantId: string, month: number, year: number, variacion: number) {
  console.log(`\nInsertando mes ${month}/${year}...`);

  // Limpiar registros previos del mes
  await sql`
    DELETE FROM accounting_records
    WHERE tenant_id = ${tenantId}
      AND period_month = ${month}
      AND period_year  = ${year}
  `;

  let totalIngresos = 0;

  // Ingresos Didi Fleet por conductor
  for (const conductor of CONDUCTORES) {
    const ingresosVariados = Math.round(conductor.ingresos * (1 + (Math.random() - 0.5) * variacion));
    const viajesVariados   = Math.round(conductor.viajes   * (1 + (Math.random() - 0.5) * variacion));

    await sql`
      INSERT INTO accounting_records (
        tenant_id, period_month, period_year,
        source, category, description,
        amount, is_income, is_deductible
      ) VALUES (
        ${tenantId}, ${month}, ${year},
        'didi_fleet', 'ingresos_didi',
        ${`Ingresos Didi Fleet — ${conductor.nombre} — ${viajesVariados} viajes`},
        ${ingresosVariados}, true, false
      )
    `;
    totalIngresos += ingresosVariados;
  }
  console.log(`  Ingresos Didi: $${totalIngresos.toLocaleString()} MXN (${CONDUCTORES.length} conductores)`);

  // Gastos fijos
  let totalGastos = 0;
  for (const gasto of GASTOS_FIJOS) {
    const montoVariado = Math.round(gasto.amount * (1 + (Math.random() - 0.5) * 0.1));
    await sql`
      INSERT INTO accounting_records (
        tenant_id, period_month, period_year,
        source, category, description,
        amount, is_income, is_deductible
      ) VALUES (
        ${tenantId}, ${month}, ${year},
        'manual', ${gasto.category},
        ${gasto.description.replace('mayo', `mes ${month}`)},
        ${montoVariado}, false, ${gasto.is_deductible}
      )
    `;
    totalGastos += montoVariado;
  }
  console.log(`  Gastos: $${totalGastos.toLocaleString()} MXN (${GASTOS_FIJOS.length} conceptos)`);
}

async function main() {
  console.log('Iniciando seed de datos demo de contabilidad...\n');

  // Obtener tenant
  const tenants = await sql`
    SELECT id FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1
  `;

  if (tenants.length === 0) {
    console.error(`Tenant "${TENANT_SLUG}" no encontrado. Ejecuta seed-demo.ts primero.`);
    process.exit(1);
  }

  const tenantId = tenants[0].id as string;
  console.log(`Tenant ID: ${tenantId}`);

  const now   = new Date();
  const year  = now.getFullYear();

  // Insertar los 3 meses anteriores
  await seedMonth(tenantId, now.getMonth() - 1 > 0 ? now.getMonth() - 1 : 12, now.getMonth() - 1 > 0 ? year : year - 1, 0.15);
  await seedMonth(tenantId, now.getMonth() > 0 ? now.getMonth() : 12, now.getMonth() > 0 ? year : year - 1, 0.10);
  await seedMonth(tenantId, now.getMonth() + 1, year, 0.05);

  console.log('\nSeed de contabilidad completado.');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
