'use client'
import { useState, useEffect } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  X,
  PenLine,
  Plus,
  Trash2,
  Send,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Save,
  Car,
} from 'lucide-react'

interface ProcessedRow {
  driverName: string
  driverId: string | null
  vehicleId: string | null
  vehicleEco: string | null
  phone?: string | null
  whatsappGroup?: string | null   // Link del grupo WhatsApp con este chofer
  lastRent: number
  matched: boolean
  hasActivity: boolean
  // Didi data
  didiIncome: number
  didiCash: number
  didiBalance: number   // Depósito automático Didi → cuenta JP
  didiIncomeCard: number
  tax: number
  bonuses: number
  deduction: number
  trips: number
  tripsOnline: number
  tripsCash: number
  // Editable fields (admin)
  rent: number          // Renta semanal del vehículo (base para pro-rata)
  contabilidad: number  // Cobro fijo por contabilidad ($75 default)
  deductions: number    // Deducciones extra (legacy)
  adicional: number     // Cargo/abono libre (ej. deuda anterior)
  montoKms: number      // Cargo por kms adicionales
  diasTrabajados: number  // Días trabajados en la semana (0-7), default 7
  saldoPendiente: number  // Saldo previo: + chofer debe a JP, − JP debe al chofer
  nota: string
  sentAt?: string | null
  savedAt?: string | null
}

interface ManualRow {
  driverName: string
  phone: string
  didiIncome: string
  trips: string
  rent: string
  deductions: string
}

type Tab = 'excel' | 'manual'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Renta proporcional: renta_base / 7 × días_trabajados
function calcRenta(row: ProcessedRow): number {
  const dias = Math.max(0, Math.min(7, Number(row.diasTrabajados) || 7))
  return ((Number(row.rent) || 0) / 7) * dias
}

// Efectivo que el chofer debe traer a JP
// Fórmula Excel: (Renta/7×Días) + Contabilidad − Dep. Didi + Saldo_Previo + Adicional + KmsAdicionales
function calcEfectivo(row: ProcessedRow): number {
  return calcRenta(row)
    + (Number(row.contabilidad) || 0)
    - Number(row.didiBalance)
    + Number(row.saldoPendiente)
    + (Number(row.adicional) || 0)
    + (Number(row.montoKms) || 0)
}

// Ganancia neta del chofer (informativa)
function calcNeto(row: ProcessedRow): number {
  return Number(row.didiIncome)
    - calcRenta(row)
    - (Number(row.contabilidad) || 0)
}

// Formatea fecha usando hora LOCAL (evita desfase UTC que toISOString introduce en timezone -6)
function fmtLocal(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Didi reporta con 1 semana de desfase → defaultear a semana ANTERIOR
function getWeekRange(): { inicio: string; fin: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon - 7) // semana anterior
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { inicio: fmtLocal(monday), fin: fmtLocal(sunday) }
}

function formatDateLabel(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatMessage(row: ProcessedRow, semanaInicio?: string, semanaFin?: string): string {
  const efectivo        = calcEfectivo(row)
  const rentaProrata    = calcRenta(row)
  const semana          = semanaInicio && semanaFin
    ? `${formatDateLabel(semanaInicio)} al ${formatDateLabel(semanaFin)}`
    : ''

  const ingresos        = Number(row.didiIncome)
  const efectivoCobrado = Number(row.didiCash)
  const deposito        = Number(row.didiBalance)
  const bonos           = Number(row.bonuses)
  const rentaBase       = Number(row.rent) || 0
  const dias            = Math.max(0, Math.min(7, Number(row.diasTrabajados) || 7))
  const saldo           = Number(row.saldoPendiente) || 0
  const conta           = Number(row.contabilidad) || 0
  const deducc          = Number(row.deductions) || 0
  const viajes          = Number(row.trips)

  const lines: string[] = []

  lines.push(`*Al Volante GDL — Cuenta Semanal*`)
  if (semana) lines.push(`📅 ${semana}`)
  lines.push(``)
  lines.push(`👤 *${row.driverName}*`)
  if (viajes > 0) lines.push(`🚗 ${viajes} viajes realizados`)
  if (dias < 7)   lines.push(`📆 Días trabajados: ${dias}/7`)
  lines.push(``)
  lines.push(`*Tus ingresos Didi:*`)
  lines.push(`• Total: $${formatMXN(ingresos)}`)
  if (efectivoCobrado > 0) lines.push(`• En efectivo (tú lo tienes): $${formatMXN(efectivoCobrado)}`)
  if (bonos > 0)           lines.push(`• Bonos Didi: +$${formatMXN(bonos)}`)
  lines.push(``)
  lines.push(`*Cobros de la semana:*`)
  if (dias < 7) {
    lines.push(`• Renta proporcional (${dias}/7 días): $${formatMXN(rentaProrata)}`)
    lines.push(`  _(base: $${formatMXN(rentaBase)}/sem)_`)
  } else {
    lines.push(`• Renta del vehículo: $${formatMXN(rentaProrata)}`)
  }
  if (conta > 0)     lines.push(`• Contabilidad: $${formatMXN(conta)}`)
  if (deposito > 0)  lines.push(`• Ya te descontó Didi: -$${formatMXN(deposito)}`)
  if (saldo > 0)     lines.push(`• Saldo pendiente semana ant.: +$${formatMXN(saldo)}`)
  else if (saldo < 0) lines.push(`• A tu favor semana ant.: -$${formatMXN(Math.abs(saldo))}`)
  if (deducc > 0)    lines.push(`• Deducción extra: $${formatMXN(deducc)}`)
  lines.push(``)
  lines.push(`———————————————`)
  if (efectivo > 0) {
    lines.push(`💰 *DEPOSITA: $${formatMXN(efectivo)} MXN*`)
  } else if (efectivo < 0) {
    lines.push(`🔄 *A tu favor esta semana: $${formatMXN(Math.abs(efectivo))} MXN*`)
  } else {
    lines.push(`✅ *Sin saldo pendiente esta semana*`)
  }
  lines.push(`———————————————`)
  lines.push(`Cualquier duda, escríbenos 🙌`)

  return lines.join('\n')
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
      {initials}
    </div>
  )
}

// ─── Tabla de resultados ──────────────────────────────────────────────────────

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
)

const TD = ({ children, right, muted, className = '' }: { children: React.ReactNode; right?: boolean; muted?: boolean; className?: string }) => (
  <td className={`px-3 py-2.5 text-xs ${right ? 'text-right' : 'text-left'} ${muted ? 'text-gray-400' : 'text-gray-700'} ${className}`}>
    {children}
  </td>
)

function ResultsTable({
  rows,
  onUpdateRow,
  onSendOne,
}: {
  rows: ProcessedRow[]
  onUpdateRow: (i: number, field: 'rent' | 'contabilidad' | 'deductions' | 'adicional' | 'montoKms' | 'diasTrabajados' | 'saldoPendiente', val: number) => void
  onSendOne: (row: ProcessedRow) => void
}) {
  const activeRows = rows.filter((r) => r.hasActivity)
  const totals = {
    ingresos:      activeRows.reduce((s, r) => s + Number(r.didiIncome), 0),
    didiEfectivo:  activeRows.reduce((s, r) => s + Number(r.didiCash), 0),
    deposito:      activeRows.reduce((s, r) => s + Number(r.didiBalance), 0),
    comision:      activeRows.reduce((s, r) => s + Number(r.tax), 0),
    bonos:         activeRows.reduce((s, r) => s + Number(r.bonuses), 0),
    dedDidi:       activeRows.reduce((s, r) => s + Number(r.deduction), 0),
    viajes:        activeRows.reduce((s, r) => s + Number(r.trips), 0),
    online:        activeRows.reduce((s, r) => s + Number(r.tripsOnline), 0),
    cash:          activeRows.reduce((s, r) => s + Number(r.tripsCash), 0),
    renta:         activeRows.reduce((s, r) => s + calcRenta(r), 0),
    contabilidad:  activeRows.reduce((s, r) => s + (Number(r.contabilidad) || 0), 0),
    deducExtra:    activeRows.reduce((s, r) => s + (Number(r.deductions) || 0), 0),
    saldoPendiente:activeRows.reduce((s, r) => s + Number(r.saldoPendiente), 0),
    efectivo:      activeRows.reduce((s, r) => s + calcEfectivo(r), 0),
  }

  let counter = 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="text-sm" style={{ minWidth: '1400px' }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th colSpan={2} className="px-3 py-1.5 bg-gray-50" />
              <th colSpan={6} className="px-3 py-1.5 text-center text-[10px] font-bold text-blue-500 uppercase bg-blue-50 border-l border-blue-100">
                ← Datos Didi Fleet →
              </th>
              <th colSpan={3} className="px-3 py-1.5 text-center text-[10px] font-bold text-purple-500 uppercase bg-purple-50 border-l border-purple-100">
                ← Viajes →
              </th>
              <th colSpan={5} className="px-3 py-1.5 text-center text-[10px] font-bold text-orange-500 uppercase bg-orange-50 border-l border-orange-100">
                ← Cobros Admin →
              </th>
              <th colSpan={2} className="px-3 py-1.5 text-center text-[10px] font-bold text-green-600 uppercase bg-green-50 border-l border-green-100">
                ← Resultado →
              </th>
            </tr>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <TH>#</TH>
              <TH>Chofer / Auto</TH>
              <TH right>Total Didi</TH>
              <TH right>Efectivo app</TH>
              <TH right>Dep. Didi→JP</TH>
              <TH right>Comisión</TH>
              <TH right>Bonos</TH>
              <TH right>Ded. Didi</TH>
              <TH right>Total</TH>
              <TH right>Online</TH>
              <TH right>Cash</TH>
              <TH right>Renta</TH>
              <TH right>Conta.</TH>
              <TH right>Adicional</TH>
              <TH right>Días</TH>
              <TH right>Saldo ant.</TH>
              <TH right>💰 Efectivo a entregar</TH>
              <TH>WA</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => {
              const efectivo = calcEfectivo(row)
              const inactive = !row.hasActivity
              if (!inactive) counter++
              return (
                <tr key={i} className={`hover:bg-gray-50 transition-colors ${inactive ? 'bg-amber-50/40' : ''}`}>
                  <TD muted>{inactive ? '–' : counter}</TD>

                  <td className="px-3 py-2.5 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.driverName} />
                      <div>
                        <p className="font-semibold text-gray-900 text-xs leading-tight">{row.driverName}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${row.matched ? 'bg-green-500' : 'bg-orange-400'}`} />
                          <span className="text-[10px] text-gray-400">{row.matched ? 'En sistema' : 'Sin match'}</span>
                          {inactive && row.matched && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200 px-1 py-0.5 rounded font-semibold">
                              0 viajes — cobra renta
                            </span>
                          )}
                          {row.vehicleEco && (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                              <Car className="w-2.5 h-2.5" />{row.vehicleEco}
                            </span>
                          )}
                          {row.savedAt && <span className="text-[10px] text-indigo-600 font-medium">✅</span>}
                          {row.sentAt && <span className="text-[10px] text-green-600 font-medium">📤</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Didi datos */}
                  <TD right className="font-semibold text-gray-900">${formatMXN(Number(row.didiIncome))}</TD>
                  <TD right muted={Number(row.didiCash) === 0}>${formatMXN(Number(row.didiCash))}</TD>
                  <TD right muted={Number(row.didiBalance) === 0} className="text-blue-600">${formatMXN(Number(row.didiBalance))}</TD>
                  <TD right muted={Number(row.tax) === 0} className="text-red-500">{Number(row.tax) > 0 ? `-$${formatMXN(Number(row.tax))}` : '–'}</TD>
                  <TD right muted={Number(row.bonuses) === 0} className="text-green-600">{Number(row.bonuses) > 0 ? `+$${formatMXN(Number(row.bonuses))}` : '–'}</TD>
                  <TD right muted={Number(row.deduction) === 0} className="text-red-400">{Number(row.deduction) > 0 ? `-$${formatMXN(Number(row.deduction))}` : '–'}</TD>

                  {/* Viajes */}
                  <TD right className="font-semibold">{row.trips}</TD>
                  <TD right muted={Number(row.tripsOnline) === 0}>{row.tripsOnline}</TD>
                  <TD right muted={Number(row.tripsCash) === 0}>{row.tripsCash}</TD>

                  {/* Admin: editables */}
                  <td className="px-3 py-2.5">
                    <input type="number" value={row.rent}
                      onChange={(e) => onUpdateRow(i, 'rent', Number(e.target.value))}
                      className="w-20 text-right text-xs px-2 py-1 border border-orange-200 rounded-lg bg-orange-50 text-gray-900 focus:border-orange-400 focus:outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" value={row.contabilidad}
                      onChange={(e) => onUpdateRow(i, 'contabilidad', Number(e.target.value))}
                      className="w-16 text-right text-xs px-2 py-1 border border-orange-200 rounded-lg bg-orange-50 text-gray-900 focus:border-orange-400 focus:outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" value={row.adicional}
                      onChange={(e) => onUpdateRow(i, 'adicional', Number(e.target.value))}
                      title="Cargo/abono adicional (deuda anterior, descuento, etc.)"
                      className="w-16 text-right text-xs px-2 py-1 border border-orange-200 rounded-lg bg-orange-50 text-gray-900 focus:border-orange-400 focus:outline-none" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number" min="0" max="7"
                      value={row.diasTrabajados}
                      onChange={(e) => onUpdateRow(i, 'diasTrabajados', Math.max(0, Math.min(7, Number(e.target.value))))}
                      className="w-14 text-right text-xs px-2 py-1 border border-indigo-200 rounded-lg bg-indigo-50 text-gray-900 focus:border-indigo-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      const s = Number(row.saldoPendiente)
                      const cls = s > 0 ? 'border-red-200 bg-red-50' : s < 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                      return (
                        <input
                          type="number"
                          value={row.saldoPendiente}
                          onChange={(e) => onUpdateRow(i, 'saldoPendiente', Number(e.target.value))}
                          className={`w-20 text-right text-xs px-2 py-1 border rounded-lg text-gray-900 focus:outline-none ${cls}`}
                        />
                      )
                    })()}
                  </td>

                  {/* Efectivo a entregar */}
                  <td className={`px-3 py-2.5 text-right font-black text-sm ${efectivo >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    ${formatMXN(efectivo)}
                  </td>

                  {/* WA */}
                  <td className="px-3 py-2.5">
                    <button onClick={() => onSendOne(row)} disabled={inactive}
                      title="Abrir WhatsApp"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors disabled:opacity-40">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-xs">
              <td className="px-3 py-3 text-gray-400 text-center">—</td>
              <td className="px-3 py-3 text-gray-700">{activeRows.length} choferes activos</td>
              <td className="px-3 py-3 text-right text-blue-700">${formatMXN(totals.ingresos)}</td>
              <td className="px-3 py-3 text-right text-gray-500">${formatMXN(totals.didiEfectivo)}</td>
              <td className="px-3 py-3 text-right text-blue-600">${formatMXN(totals.deposito)}</td>
              <td className="px-3 py-3 text-right text-red-500">-${formatMXN(totals.comision)}</td>
              <td className="px-3 py-3 text-right text-green-600">+${formatMXN(totals.bonos)}</td>
              <td className="px-3 py-3 text-right text-red-400">-${formatMXN(totals.dedDidi)}</td>
              <td className="px-3 py-3 text-right text-purple-700">{totals.viajes}</td>
              <td className="px-3 py-3 text-right text-gray-500">{totals.online}</td>
              <td className="px-3 py-3 text-right text-gray-500">{totals.cash}</td>
              <td className="px-3 py-3 text-right text-orange-700">${formatMXN(totals.renta)}</td>
              <td className="px-3 py-3 text-right text-orange-600">${formatMXN(totals.contabilidad)}</td>
              <td className="px-3 py-3 text-right text-orange-500">${formatMXN(totals.deducExtra)}</td>
              <td className="px-3 py-3 text-right text-indigo-400">—</td>
              <td className={`px-3 py-3 text-right ${totals.saldoPendiente > 0 ? 'text-red-500' : totals.saldoPendiente < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {totals.saldoPendiente !== 0 ? `$${formatMXN(totals.saldoPendiente)}` : '—'}
              </td>
              <td className="px-3 py-3 text-right text-emerald-700 text-sm">${formatMXN(totals.efectivo)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Income Summary Banner ────────────────────────────────────────────────────

function IncomeSummaryBanner({ rows }: { rows: ProcessedRow[] }) {
  const active = rows.filter((r) => r.hasActivity)
  if (!active.length) return null
  const totalEfectivo   = active.reduce((s, r) => s + calcEfectivo(r), 0)
  const totalDidi       = active.reduce((s, r) => s + Number(r.didiIncome), 0)
  const totalDepositado = active.reduce((s, r) => s + Number(r.didiBalance), 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Card 1: Efectivo que traen los choferes */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700 uppercase">Recibes en efectivo</p>
        </div>
        <p className="text-2xl font-black text-emerald-700">${formatMXN(totalEfectivo)}</p>
        <p className="text-xs text-emerald-600 mt-0.5">= Renta + Conta − Dep. Didi</p>
      </div>
      {/* Card 2: Ya depositado por Didi */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-semibold text-blue-700 uppercase">Ya depositó Didi</p>
        </div>
        <p className="text-2xl font-black text-blue-700">${formatMXN(totalDepositado)}</p>
        <p className="text-xs text-blue-600 mt-0.5">Automático a tu cuenta bancaria</p>
      </div>
      {/* Card 3: Total Didi flotilla */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Users className="w-4 h-4 text-purple-600" />
          <p className="text-xs font-semibold text-purple-700 uppercase">Total generado Didi</p>
        </div>
        <p className="text-2xl font-black text-purple-700">${formatMXN(totalDidi)}</p>
        <p className="text-xs text-purple-600 mt-0.5">Ingresos brutos de toda la flotilla</p>
      </div>
    </div>
  )
}

// ─── Tab Excel ────────────────────────────────────────────────────────────────

function TabExcel({
  defaultRent,
  setDefaultRent,
  defaultContabilidad,
  setDefaultContabilidad,
  defaultDeductions,
  setDefaultDeductions,
  semanaInicio,
  semanaFin,
}: {
  defaultRent: number
  setDefaultRent: (v: number) => void
  defaultContabilidad: number
  setDefaultContabilidad: (v: number) => void
  defaultDeductions: number
  setDefaultDeductions: (v: number) => void
  semanaInicio: string
  semanaFin: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<ProcessedRow[]>([])
  const [weekLabel, setWeekLabel] = useState('')
  const [summary, setSummary] = useState<{ total: number; active: number; matched: number; unmatched: number } | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [showWaPanel, setShowWaPanel] = useState(false)

  const handleFile = (f: File) => setFile(f)

  const handleProcess = async () => {
    if (!file) return
    setLoading(true)
    setSavedOk(false)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import/didi-fleet', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Error procesando el archivo'); return }

      const enriched: ProcessedRow[] = (data.data || []).map((d: any) => ({
        ...d,
        didiIncomeCard: Number(d.incomeCard ?? 0),
        rent:           Number(d.lastRent) > 0 ? Number(d.lastRent) : defaultRent,
        contabilidad:   defaultContabilidad,
        deductions:     0,
        adicional:      0,
        montoKms:       0,
        diasTrabajados: 7,
        saldoPendiente: 0,
        nota:           '',
        sentAt:         null,
        savedAt:        null,
      }))
      setRows(enriched)
      setWeekLabel(data.weekLabel || '')
      setSummary({ total: data.total, active: data.active, matched: data.matched, unmatched: data.unmatched })
    } catch {
      alert('Error procesando el archivo')
    } finally {
      setLoading(false)
    }
  }

  const updateRow = (i: number, field: 'rent' | 'contabilidad' | 'deductions' | 'adicional' | 'montoKms' | 'diasTrabajados' | 'saldoPendiente', val: number) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const handleSaveDB = async () => {
    // Guardar TODOS los choferes con match, incluyendo los de 0 actividad (cobrar renta igualmente)
    const toSave = rows.filter((r) => r.matched)
    if (!toSave.length) { alert('No hay choferes con match para guardar'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/import/didi-fleet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: semanaInicio,
          weekEnd: semanaFin,
          rows: toSave,
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Error guardando'); return }
      // Mark saved rows
      const savedIds = new Set(toSave.map((r) => r.driverId))
      setRows((prev) => prev.map((r) => savedIds.has(r.driverId) ? { ...r, savedAt: new Date().toISOString() } : r))
      setSavedOk(true)
      alert(`✅ Guardado: ${data.saved} cuentas. Omitidos: ${data.skipped}`)
    } catch {
      alert('Error guardando en BD')
    } finally {
      setSaving(false)
    }
  }

  // Genera URL de WhatsApp para un chofer
  // Si tiene grupo → abre el grupo (y el mensaje se copia al portapapeles)
  // Si tiene teléfono → abre chat individual con mensaje pre-cargado
  // Sin ninguno → abre WhatsApp vacío
  const waUrl = (row: ProcessedRow): string => {
    if (row.whatsappGroup) return row.whatsappGroup
    const msg = formatMessage(row, semanaInicio, semanaFin)
    if (row.phone) {
      const clean = row.phone.replace(/\D/g, '')
      const num = clean.startsWith('52') ? clean : `52${clean}`
      return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  const [copiedName, setCopiedName]       = useState<string | null>(null)
  const [hideSinMatch, setHideSinMatch]   = useState(true)   // ocultar Sin match por defecto

  const openWa = (row: ProcessedRow) => {
    const msg = formatMessage(row, semanaInicio, semanaFin)
    const url = waUrl(row)
    // Si usa grupo, copiar mensaje al portapapeles (no se puede pre-llenar en grupos)
    if (row.whatsappGroup) {
      navigator.clipboard.writeText(msg).catch(() => {})
      setCopiedName(row.driverName)
      setTimeout(() => setCopiedName(null), 3000)
    }
    window.open(url, '_blank')
  }

  const handleSendOne = (row: ProcessedRow) => {
    openWa(row)
    setRows((prev) => prev.map((r) => r.driverName === row.driverName ? { ...r, sentAt: new Date().toISOString() } : r))
  }

  const markSent = (driverName: string) => {
    setRows((prev) => prev.map((r) => r.driverName === driverName ? { ...r, sentAt: new Date().toISOString() } : r))
  }

  const readyToSave = rows.filter((r) => r.matched).length
  const noActivityMatched = rows.filter((r) => r.matched && !r.hasActivity).length

  return (
    <div className="space-y-5">
      {/* Config defaults */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Configuración de cobros</h3>
        <p className="text-xs text-gray-400 mb-4">
          La renta se toma del vehículo asignado. Estos valores se aplican si no hay renta registrada o como valores globales.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Renta semanal default (MXN)</label>
            <input type="number" value={defaultRent} onChange={(e) => setDefaultRent(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contabilidad semanal (MXN)</label>
            <input type="number" value={defaultContabilidad} onChange={(e) => setDefaultContabilidad(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-orange-200 rounded-xl bg-orange-50 text-gray-900 focus:border-orange-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Deducciones extra (MXN)</label>
            <input type="number" value={defaultDeductions} onChange={(e) => setDefaultDeductions(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg px-3 py-2">
          💡 <strong>Efectivo a entregar</strong> = (Renta ÷ 7 × Días) + Contabilidad − Dep. Didi + Saldo ant. + Adicional + Kms
        </p>
      </div>

      {/* Upload zone */}
      <div
        className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => document.getElementById('didi-file')?.click()}
      >
        <input id="didi-file" type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); setRows([]); setSummary(null); setWeekLabel(''); setSavedOk(false); setShowWaPanel(false) }}>
              <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">Arrastra el Excel de Didi Fleet aquí</p>
            <p className="text-xs text-gray-400 mt-1">o haz clic para seleccionar (.xlsx, .xls, .csv)</p>
          </>
        )}
      </div>

      {file && !rows.length && (
        <button onClick={handleProcess} disabled={loading}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
          {loading ? 'Procesando...' : '⚡ Procesar Excel'}
        </button>
      )}

      {weekLabel && (
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
            📅 Reporte Didi: {weekLabel}
          </span>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-blue-600">{summary.total}</div>
            <div className="text-xs text-blue-500 mt-1">En reporte</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">{summary.active}</div>
            <div className="text-xs text-emerald-500 mt-1">Con actividad</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-600">{summary.matched}</div>
            <div className="text-xs text-green-500 mt-1">En sistema</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-orange-600">{summary.unmatched}</div>
            <div className="text-xs text-orange-500 mt-1">Sin coincidencia</div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Income summary banner */}
          <IncomeSummaryBanner rows={rows} />

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Izquierda: toggle Sin match */}
            <div className="flex items-center gap-2">
              {(() => {
                const sinMatch = rows.filter(r => !r.matched).length
                return sinMatch > 0 ? (
                  <button
                    onClick={() => setHideSinMatch(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      hideSinMatch
                        ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                    }`}
                  >
                    {hideSinMatch ? '👁️ Mostrar' : '🙈 Ocultar'} sin match ({sinMatch})
                  </button>
                ) : null
              })()}
              {noActivityMatched > 0 && !savedOk && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                  ⚠️ {noActivityMatched} chofer{noActivityMatched > 1 ? 'es' : ''} sin viajes Didi — se cobra solo renta
                </span>
              )}
            </div>
            {/* Derecha: guardar + WA */}
            <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDB}
              disabled={saving || savedOk || readyToSave === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savedOk ? '✅ Guardado en BD' : saving ? 'Guardando...' : `Guardar ${readyToSave} en BD`}
            </button>
            <button
              onClick={() => setShowWaPanel((v) => !v)}
              className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm rounded-xl shadow-md transition-colors ${showWaPanel ? 'bg-gray-200 text-gray-700' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              <Send className="w-4 h-4" />
              {showWaPanel ? 'Ocultar envíos' : `📲 Preparar envíos (${rows.filter((r) => r.hasActivity).length})`}
            </button>
            </div>{/* fin div derecha */}
          </div>

          {/* Panel de WhatsApp — links directos, sin popups */}
          {showWaPanel && (() => {
            const activeRows = rows.filter((r) => r.hasActivity)
            return (
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">📲 Enviar cuentas por WhatsApp</p>
                    <p className="text-xs text-green-600 mt-0.5">Haz clic en cada botón para abrir WhatsApp con el mensaje listo</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                    {activeRows.filter((r) => r.sentAt).length}/{activeRows.length} enviados
                  </span>
                </div>
                {/* Toast copiado */}
                {copiedName && (
                  <div className="mx-5 mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-2 rounded-xl">
                    📋 Mensaje copiado — pégalo en el grupo de {copiedName} (Ctrl+V)
                  </div>
                )}
                <div className="divide-y divide-gray-50">
                  {activeRows.map((row, idx) => {
                    const usaGrupo = !!row.whatsappGroup
                    const tieneTel = !!row.phone
                    return (
                      <div key={idx} className="flex items-center gap-3 px-5 py-3">
                        <Avatar name={row.driverName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{row.driverName}</p>
                          <p className="text-xs text-gray-400">
                            Deposita: ${formatMXN(calcEfectivo(row))} · Didi: ${formatMXN(Number(row.didiIncome))}
                            {usaGrupo ? ' · 👥 Grupo WA' : tieneTel ? ` · 📞 ${row.phone}` : ' · sin contacto'}
                          </p>
                        </div>
                        {usaGrupo && copiedName === row.driverName && (
                          <span className="text-xs text-blue-600 font-bold">📋 Copiado</span>
                        )}
                        <a
                          href={waUrl(row)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => { openWa(row); markSent(row.driverName) }}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${
                            row.sentAt
                              ? 'bg-gray-100 text-gray-500 border border-gray-200'
                              : usaGrupo
                                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                                : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {row.sentAt ? '✅ Enviado' : usaGrupo ? '👥 Abrir grupo' : 'Abrir WhatsApp'}
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <ResultsTable
            rows={hideSinMatch ? rows.filter(r => r.matched) : rows}
            onUpdateRow={updateRow}
            onSendOne={handleSendOne}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab Captura Manual ───────────────────────────────────────────────────────

function TabManual({
  defaultRent,
  defaultContabilidad,
  defaultDeductions,
  semanaInicio,
  semanaFin,
}: {
  defaultRent: number
  defaultContabilidad: number
  defaultDeductions: number
  semanaInicio: string
  semanaFin: string
}) {
  const emptyRow = (): ManualRow => ({
    driverName: '',
    phone: '',
    didiIncome: '',
    trips: '',
    rent: String(defaultRent),
    deductions: String(defaultDeductions),
  })

  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyRow()])
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([])
  const [showWaPanelManual, setShowWaPanelManual] = useState(false)

  const addRow = () => setManualRows((r) => [...r, emptyRow()])
  const removeRow = (i: number) => setManualRows((r) => r.filter((_, idx) => idx !== i))

  const updateManual = (i: number, field: keyof ManualRow, val: string) => {
    setManualRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const handleGenerate = () => {
    const rows: ProcessedRow[] = manualRows
      .filter((r) => r.driverName.trim())
      .map((r) => ({
        driverName: r.driverName,
        driverId: null,
        vehicleId: null,
        vehicleEco: null,
        phone: r.phone,
        lastRent: 0,
        matched: false,
        hasActivity: true,
        didiIncome: Number(r.didiIncome) || 0,
        didiIncomeCash: 0,
        didiIncomeCard: 0,
        didiCash: 0,
        didiBalance: 0,
        tax: 0,
        bonuses: 0,
        deduction: 0,
        trips: Number(r.trips) || 0,
        tripsOnline: 0,
        tripsCash: 0,
        rent:           Number(r.rent) || 0,
        contabilidad:   defaultContabilidad,
        deductions:     0,
        adicional:      0,
        montoKms:       0,
        diasTrabajados: 7,
        saldoPendiente: 0,
        nota:           '',
        sentAt:         null,
        savedAt:        null,
      }))
    setProcessedRows(rows)
  }

  const updateProcessed = (i: number, field: 'rent' | 'contabilidad' | 'deductions' | 'adicional' | 'montoKms' | 'diasTrabajados' | 'saldoPendiente', val: number) => {
    setProcessedRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const waUrlManual = (row: ProcessedRow): string => {
    const msg = formatMessage(row, semanaInicio, semanaFin)
    if (row.phone) {
      const clean = row.phone.replace(/\D/g, '')
      const num = clean.startsWith('52') ? clean : `52${clean}`
      return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  const handleSendOneManual = (row: ProcessedRow) => {
    window.open(waUrlManual(row), '_blank')
    setProcessedRows((prev) => prev.map((r) => r.driverName === row.driverName ? { ...r, sentAt: new Date().toISOString() } : r))
  }

  const markSentManual = (driverName: string) => {
    setProcessedRows((prev) => prev.map((r) => r.driverName === driverName ? { ...r, sentAt: new Date().toISOString() } : r))
  }

  return (
    <div className="space-y-5">
      {/* Tabla editable de entrada */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Datos de choferes</h3>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar chofer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Nombre chofer', 'Teléfono', 'Ingresos Didi', 'Viajes', 'Renta', 'Deducciones', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {manualRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {(['driverName', 'phone', 'didiIncome', 'trips', 'rent', 'deductions'] as (keyof ManualRow)[]).map((field) => (
                    <td key={field} className="px-3 py-2">
                      <input
                        type={field === 'driverName' || field === 'phone' ? 'text' : 'number'}
                        value={row[field]}
                        placeholder={field === 'driverName' ? 'Nombre...' : field === 'phone' ? '55XXXXXXXX' : '0'}
                        onChange={(e) => updateManual(i, field, e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 focus:border-blue-400 focus:outline-none min-w-[90px]"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button onClick={() => removeRow(i)}
                      className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        ⚡ Calcular cuentas
      </button>

      {processedRows.length > 0 && (
        <>
          <IncomeSummaryBanner rows={processedRows} />

          <div className="flex justify-end">
            <button
              onClick={() => setShowWaPanelManual((v) => !v)}
              className={`flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl shadow-md transition-colors ${showWaPanelManual ? 'bg-gray-200 text-gray-700' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              <Send className="w-4 h-4" />
              {showWaPanelManual ? 'Ocultar envíos' : `📲 Preparar envíos (${processedRows.length})`}
            </button>
          </div>

          {showWaPanelManual && (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-green-800">📲 Enviar cuentas por WhatsApp</p>
                  <p className="text-xs text-green-600 mt-0.5">Haz clic en cada botón para abrir WhatsApp con el mensaje listo</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                  {processedRows.filter((r) => r.sentAt).length}/{processedRows.length} enviados
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {processedRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={row.driverName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{row.driverName}</p>
                      <p className="text-xs text-gray-400">
                        Didi: ${formatMXN(Number(row.didiIncome))} · Renta: ${formatMXN(Number(row.rent) || 0)} · Neto: ${formatMXN(calcNeto(row))}
                        {row.phone ? ` · 📞 ${row.phone}` : ' · sin teléfono'}
                      </p>
                    </div>
                    <a
                      href={waUrlManual(row)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => markSentManual(row.driverName)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${
                        row.sentAt ? 'bg-gray-100 text-gray-500 border border-gray-200' : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {row.sentAt ? '✅ Enviado' : 'Abrir WhatsApp'}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ResultsTable rows={processedRows} onUpdateRow={updateProcessed} onSendOne={handleSendOneManual} />
        </>
      )}
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function ImportarDidiPage() {
  useEffect(() => { document.title = 'Cuentas Semanales | Gestiona tu Flotilla' }, [])

  const defaultWeek = getWeekRange()
  const [activeTab, setActiveTab] = useState<Tab>('excel')
  const [defaultRent, setDefaultRent] = useState(2500)
  const [defaultContabilidad, setDefaultContabilidad] = useState(75)
  const [defaultDeductions, setDefaultDeductions] = useState(0)
  const [semanaInicio, setSemanaInicio] = useState(defaultWeek.inicio)
  const [semanaFin, setSemanaFin] = useState(defaultWeek.fin)

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'excel', label: 'Importar Excel Didi Fleet', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'manual', label: 'Captura manual', icon: <PenLine className="w-4 h-4" /> },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-gray-900">Cuentas semanales</h1>
        <p className="text-sm text-gray-500 mt-1">Genera y envía las cuentas a tus choferes por WhatsApp</p>
      </div>

      {/* Week date range selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Semana del {formatDateLabel(semanaInicio)} al {formatDateLabel(semanaFin)}
            </p>
            <p className="text-xs text-gray-400">Se incluirá en el mensaje de WhatsApp</p>
          </div>
          <span className="ml-auto text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            ⚠️ Didi reporta 1 semana después
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Inicio de semana (lunes)</label>
            <input
              type="date"
              value={semanaInicio}
              onChange={(e) => setSemanaInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fin de semana (domingo)</label>
            <input
              type="date"
              value={semanaFin}
              onChange={(e) => setSemanaFin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'excel' ? (
        <TabExcel
          defaultRent={defaultRent}
          setDefaultRent={setDefaultRent}
          defaultContabilidad={defaultContabilidad}
          setDefaultContabilidad={setDefaultContabilidad}
          defaultDeductions={defaultDeductions}
          setDefaultDeductions={setDefaultDeductions}
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
        />
      ) : (
        <TabManual
          defaultRent={defaultRent}
          defaultContabilidad={defaultContabilidad}
          defaultDeductions={defaultDeductions}
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
        />
      )}
    </div>
  )
}
