// Cálculo fiscal México 2025 — SAT
// Regímenes soportados:
// 625 → PLATAFORMAS (Art. 113-A LISR) — Didi/Uber flotilleros con ingresos por plataforma
// 626 → RESICO (Art. 113-E LISR)     — Personas físicas actividad empresarial simplificada
// 612 → PFAE (Art. 96 LISR)          — Actividades Empresariales y Profesionales

export type FiscalRegime = 'RESICO' | 'PLATAFORMAS' | 'PFAE'

export function satCodeToFiscalRegime(code: string): FiscalRegime {
  if (code === '625') return 'PLATAFORMAS'
  if (code === '612') return 'PFAE'
  return 'RESICO' // 626 y otros → RESICO
}

export interface FiscalCalculation {
  grossIncome: number
  ivaCollected: number            // IVA total generado
  ivaRate: number
  isrRate: number
  isrMonthly: number              // ISR mensual
  ivaRetenido?: number            // Solo PFAE: IVA que retiene la plataforma (100%)
  ivaPorPagar?: number            // Solo PFAE: IVA adicional que paga el chofer (generalmente $0)
  isrRetenidoPlataforma?: number  // Solo PFAE: ISR retenido en origen por la plataforma
  totalTaxes: number
  netAfterTax: number
  regime: FiscalRegime
  regimeLabel: string
  notes: string
}

// ─── RESICO ───────────────────────────────────────────────────────────────────
// Régimen Simplificado de Confianza — Art. 113-E LISR
// ISR mensual 1% al 2.5% sobre ingresos brutos

const RESICO_TABLE = [
  { max: 25000,    rate: 0.010 },
  { max: 50000,    rate: 0.011 },
  { max: 83333,    rate: 0.015 },
  { max: 166667,   rate: 0.020 },
  { max: 250000,   rate: 0.025 },
  { max: Infinity, rate: 0.025 },
]

export function calculateResico(monthlyIncome: number, isFrontierZone = false): FiscalCalculation {
  const ivaRate = isFrontierZone ? 0.08 : 0.16
  const ivaCollected = monthlyIncome * ivaRate
  const bracket = RESICO_TABLE.find(b => monthlyIncome <= b.max) ?? RESICO_TABLE[RESICO_TABLE.length - 1]
  const isrRate = bracket.rate
  const isrMonthly = monthlyIncome * isrRate
  const totalTaxes = ivaCollected + isrMonthly
  const netAfterTax = monthlyIncome - totalTaxes
  return {
    grossIncome: monthlyIncome,
    ivaCollected, ivaRate, isrRate, isrMonthly, totalTaxes, netAfterTax,
    regime: 'RESICO',
    regimeLabel: 'RESICO (Simplificado de Confianza)',
    notes: isFrontierZone
      ? 'Zona fronteriza — IVA 8% · ISR 1%-2.5% sobre ingresos brutos'
      : 'IVA 16% · ISR 1%-2.5% sobre ingresos brutos · Para flotilleros con actividad propia',
  }
}

// ─── PFAE Plataformas Tecnológicas ────────────────────────────────────────────
// Art. 113-A LISR — Para choferes que obtienen ingresos por Uber, Didi, InDriver
// Las plataformas RETIENEN ISR e IVA en origen y los enteran directamente al SAT.
// El chofer puede optar por que la retención sea pago definitivo (sin declaración mensual).

const PLATAFORMAS_ISR_TABLE = [
  { max: 5000,     rate: 0.02 },  // Hasta $5,000/mes — 2%
  { max: 25000,    rate: 0.04 },  // $5,001–$25,000 — 4%
  { max: 100000,   rate: 0.06 },  // $25,001–$100,000 — 6%
  { max: Infinity, rate: 0.08 },  // Más de $100,000 — 8%
]

export function calculatePlataformas(monthlyIncome: number, isFrontierZone = false): FiscalCalculation {
  const ivaRate = isFrontierZone ? 0.08 : 0.16
  const ivaCollected = monthlyIncome * ivaRate
  // Plataforma retiene 100% del IVA (desde reforma 2020)
  const ivaRetenido = ivaCollected
  const ivaPorPagar = 0
  // ISR retenido por la plataforma según tabla Art. 113-A
  const bracket = PLATAFORMAS_ISR_TABLE.find(b => monthlyIncome <= b.max) ?? PLATAFORMAS_ISR_TABLE[PLATAFORMAS_ISR_TABLE.length - 1]
  const isrRate = bracket.rate
  const isrRetenidoPlataforma = monthlyIncome * isrRate
  const isrMonthly = isrRetenidoPlataforma
  const totalTaxes = ivaRetenido + isrRetenidoPlataforma
  const netAfterTax = monthlyIncome - isrRetenidoPlataforma
  return {
    grossIncome: monthlyIncome,
    ivaCollected, ivaRate, isrRate, isrMonthly,
    ivaRetenido, ivaPorPagar, isrRetenidoPlataforma,
    totalTaxes, netAfterTax,
    regime: 'PLATAFORMAS',
    regimeLabel: 'PFAE Plataformas Tecnológicas (Art. 113-A)',
    notes: 'ISR e IVA retenidos por la plataforma (Didi/Uber). Opción de pago definitivo = sin declaración mensual.',
  }
}

// ─── PFAE (612) — Actividades Empresariales y Profesionales ──────────────────
// Tabla progresiva mensual Art. 96 LISR 2025

const PFAE_TABLE_2025 = [
  { limInf: 0,          cuota: 0,          tasa: 0.0192 },
  { limInf: 746.05,     cuota: 14.32,      tasa: 0.0640 },
  { limInf: 6332.06,    cuota: 371.83,     tasa: 0.1088 },
  { limInf: 11128.02,   cuota: 893.63,     tasa: 0.1600 },
  { limInf: 12935.83,   cuota: 1182.88,    tasa: 0.1792 },
  { limInf: 15487.72,   cuota: 1640.18,    tasa: 0.2136 },
  { limInf: 31236.50,   cuota: 5004.12,    tasa: 0.2352 },
  { limInf: 49233.01,   cuota: 9236.89,    tasa: 0.3000 },
  { limInf: 93993.91,   cuota: 22665.17,   tasa: 0.3200 },
  { limInf: 125325.21,  cuota: 32691.18,   tasa: 0.3400 },
  { limInf: 375975.62,  cuota: 117912.32,  tasa: 0.3500 },
]

export function calculatePFAE(monthlyIncome: number, isFrontierZone = false): FiscalCalculation {
  const ivaRate      = isFrontierZone ? 0.08 : 0.16
  const ivaCollected = monthlyIncome * ivaRate

  let bracket = PFAE_TABLE_2025[0]
  for (const b of PFAE_TABLE_2025) {
    if (monthlyIncome >= b.limInf) bracket = b
  }
  const isrMonthly  = bracket.cuota + (monthlyIncome - bracket.limInf) * bracket.tasa
  const isrRate     = monthlyIncome > 0 ? isrMonthly / monthlyIncome : 0
  const totalTaxes  = ivaCollected + isrMonthly
  const netAfterTax = monthlyIncome - isrMonthly

  return {
    grossIncome: monthlyIncome,
    ivaCollected, ivaRate, isrRate, isrMonthly,
    totalTaxes, netAfterTax,
    regime: 'PFAE',
    regimeLabel: '612 — Act. Empresariales y Profesionales',
    notes: 'ISR tabla progresiva Art. 96 LISR · IVA 16% trasladado · Pago provisional mensual día 17',
  }
}

// ─── Función unificada ────────────────────────────────────────────────────────

export function calculateFiscal(
  monthlyIncome: number,
  isFrontierZone = false,
  regime: FiscalRegime = 'RESICO'
): FiscalCalculation {
  switch (regime) {
    case 'PLATAFORMAS': return calculatePlataformas(monthlyIncome, isFrontierZone)
    case 'PFAE':        return calculatePFAE(monthlyIncome, isFrontierZone)
    default:            return calculateResico(monthlyIncome, isFrontierZone)
  }
}

export function calculateAnnualFiscal(
  monthlyIncomes: number[],
  isFrontierZone = false,
  regime: FiscalRegime = 'RESICO'
): {
  totalIncome: number
  totalISR: number
  totalIVA: number
  totalTaxes: number
  effectiveRate: number
  monthlyBreakdown: FiscalCalculation[]
} {
  const monthlyBreakdown = monthlyIncomes.map(m => calculateFiscal(m, isFrontierZone, regime))
  const totalIncome   = monthlyBreakdown.reduce((s, m) => s + m.grossIncome, 0)
  const totalISR      = monthlyBreakdown.reduce((s, m) => s + m.isrMonthly, 0)
  const totalIVA      = monthlyBreakdown.reduce((s, m) => s + m.ivaCollected, 0)
  const totalTaxes    = totalISR + totalIVA
  const effectiveRate = totalIncome > 0 ? totalTaxes / totalIncome : 0
  return { totalIncome, totalISR, totalIVA, totalTaxes, effectiveRate, monthlyBreakdown }
}
