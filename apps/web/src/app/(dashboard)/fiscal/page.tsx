'use client'
import { useState, useEffect } from 'react'
import { Info, AlertTriangle } from 'lucide-react'
import { calculateFiscal, calculateAnnualFiscal, type FiscalRegime } from '@/lib/fiscal'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function FiscalPage() {
  useEffect(() => { document.title = 'Cálculo Fiscal | Gestiona tu Flotilla' }, [])

  const [regime, setRegime]             = useState<FiscalRegime>('RESICO')
  const [monthlyIncome, setMonthlyIncome] = useState(25000)
  const [isFrontier, setIsFrontier]     = useState(false)
  const [months, setMonths]             = useState<number[]>(Array(12).fill(25000))

  const calc   = calculateFiscal(monthlyIncome, isFrontier, regime)
  const annual = calculateAnnualFiscal(months, isFrontier, regime)

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cálculo Fiscal</h1>
        <p className="text-sm text-gray-500 mt-1">ISR e IVA — SAT México 2024/2025</p>
      </div>

      {/* Selector de régimen */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">¿Bajo qué régimen tributas?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setRegime('RESICO')}
            className={`text-left rounded-xl border-2 p-4 transition-all ${regime === 'RESICO' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
          >
            <div className="font-bold text-sm text-gray-900 dark:text-white">RESICO</div>
            <div className="text-xs text-gray-500 mt-0.5">Régimen Simplificado de Confianza</div>
            <div className="text-xs text-blue-600 mt-1">ISR 1%–2.5% · IVA 16% · Para actividad empresarial</div>
          </button>
          <button
            onClick={() => setRegime('PLATAFORMAS')}
            className={`text-left rounded-xl border-2 p-4 transition-all ${regime === 'PLATAFORMAS' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}
          >
            <div className="font-bold text-sm text-gray-900 dark:text-white">PFAE Plataformas Tecnológicas</div>
            <div className="text-xs text-gray-500 mt-0.5">Art. 113-A LISR — Uber, Didi, InDriver</div>
            <div className="text-xs text-purple-600 mt-1">ISR 2%–8% retenido · IVA retenido por plataforma</div>
          </button>
        </div>
      </div>

      {/* Banner informativo según régimen */}
      {regime === 'RESICO' ? (
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>RESICO</strong> — Para personas físicas con actividad empresarial propia (flotilleros, propietarios de autos, logística). ISR del 1% al 2.5% mensual sobre ingresos brutos. No aplica si ya recibes ingresos de plataformas con retención en origen. Consulta a tu contador.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
          <AlertTriangle className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-purple-700 dark:text-purple-300">
            <strong>PFAE Plataformas Tecnológicas (Art. 113-A)</strong> — Para choferes que reciben pagos de Uber, Didi, InDriver o Cabify. La plataforma retiene ISR (2%–8%) e IVA (16%) directamente y los entera al SAT. El chofer puede optar por que estas retenciones sean <strong>pago definitivo</strong> — sin declaración mensual adicional. Sí debes presentar declaración anual.
          </p>
        </div>
      )}

      {/* Calculadora rápida */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Calculadora rápida — mensual</h3>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 mb-1 block">Ingreso mensual bruto (MXN)</label>
            <input
              type="number" value={monthlyIncome}
              onChange={e => setMonthlyIncome(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
            />
          </div>
          <div className="flex items-center gap-2 pb-2.5">
            <input type="checkbox" id="frontier" checked={isFrontier} onChange={e => setIsFrontier(e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="frontier" className="text-xs text-gray-500">Zona fronteriza (IVA 8%)</label>
          </div>
        </div>

        {regime === 'RESICO' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'IVA a pagar', value: fmt(calc.ivaCollected), sub: pct(calc.ivaRate), color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { label: 'ISR mensual', value: fmt(calc.isrMonthly), sub: `Tasa ${pct(calc.isrRate)} RESICO`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
              { label: 'Total impuestos', value: fmt(calc.totalTaxes), sub: pct(calc.totalTaxes / (calc.grossIncome || 1)), color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
              { label: 'Neto final', value: fmt(calc.netAfterTax), sub: 'Después de impuestos', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} rounded-xl p-4`}>
                <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'ISR retenido por plataforma', value: fmt(calc.isrRetenidoPlataforma ?? 0), sub: `Tasa ${pct(calc.isrRate)} (retenido en origen)`, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'IVA retenido por plataforma', value: fmt(calc.ivaRetenido ?? 0), sub: '100% lo entrega la plataforma al SAT', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                { label: 'IVA que tú pagas adicional', value: fmt(calc.ivaPorPagar ?? 0), sub: 'Con retención total = $0', color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Neto que recibes', value: fmt(calc.netAfterTax), sub: 'Ya descontado ISR', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-xl p-4`}>
                  <p className="text-[11px] text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>¿Declaración mensual?</strong> Si optas por retención definitiva (Art. 113-A), <strong>no presentas declaraciones mensuales al SAT</strong> — la plataforma ya lo hace por ti. Solo declaración anual de abril. Si no optas, debes presentar mensualmente y acreditar lo retenido.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Proyección anual */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Proyección anual</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">Ingreso total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(annual.totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">{regime === 'PLATAFORMAS' ? 'ISR retenido total' : 'Total impuestos'}</p>
            <p className="text-lg font-bold text-red-500">{fmt(regime === 'PLATAFORMAS' ? annual.totalISR : annual.totalTaxes)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Tasa efectiva ISR</p>
            <p className="text-lg font-bold text-purple-500">{pct(annual.totalIncome > 0 ? annual.totalISR / annual.totalIncome : 0)}</p>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {months.map((m, i) => (
            <div key={i}>
              <label className="text-[10px] text-gray-400 text-center block mb-1">{MONTHS[i]}</label>
              <input
                type="number" value={m}
                onChange={e => {
                  const n = [...months]
                  n[i] = Number(e.target.value)
                  setMonths(n)
                }}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-center text-gray-900 dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Este cálculo es estimado con fines informativos. Consulta a tu contador para cifras exactas y declaraciones oficiales.
      </p>
    </div>
  )
}
