// Cálculo fiscal México 2024/2025 — SAT
// Soporta dos regímenes principales para flotillas:
// 1. RESICO (Régimen Simplificado de Confianza) — Personas físicas con actividad empresarial
// 2. PFAE Plataformas Tecnológicas — Choferes de Uber, Didi, InDriver (Art. 113-A LISR)

export type FiscalRegime = 'RESICO' | 'PLATAFORMAS'

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

// ─── Función unificada ────────────────────────────────────────────────────────

export function calculateFiscal(
  monthlyIncome: number,
  isFrontierZone = false,
  regime: FiscalRegime = 'RESICO'
): FiscalCalculation {
  return regime === 'PLATAFORMAS'
    ? calculatePlataformas(monthlyIncome, isFrontierZone)
    : calculateResico(monthlyIncome, isFrontierZone)
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
