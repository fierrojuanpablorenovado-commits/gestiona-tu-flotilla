'use client'
import { useState, useEffect } from 'react'
import { Plus, AlertTriangle, CheckCircle, Clock, Trash2, Shield, XCircle, ShieldOff } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface Insurance {
  id: string
  eco: string
  brand: string
  model: string
  plates: string
  insurer: string
  policy_number: string
  start_date: string
  expiry_date: string
  coverage_type: string
  annual_premium: number
  insured_amount: number
}

interface Vehicle {
  id: string
  eco: string
  brand: string
  model: string
  plates: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysUntilExpiry(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function getPolicyLifePercent(startDate: string, expiryDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(expiryDate).getTime()
  const now = Date.now()
  if (now >= end) return 100
  if (now <= start) return 0
  return Math.round(((now - start) / (end - start)) * 100)
}

interface StatusConfig {
  label: string
  textColor: string
  badgeBg: string
  barColor: string
  dot: string
  Icon: React.ElementType
}

function getStatus(days: number): StatusConfig {
  if (days < 0) return {
    label: 'Vencida',
    textColor: 'text-red-700',
    badgeBg: 'bg-red-100 border-red-200',
    barColor: 'bg-red-500',
    dot: 'bg-red-500',
    Icon: AlertTriangle,
  }
  if (days <= 30) return {
    label: `Vence en ${days}d`,
    textColor: 'text-orange-700',
    badgeBg: 'bg-orange-100 border-orange-200',
    barColor: 'bg-orange-500',
    dot: 'bg-orange-500',
    Icon: Clock,
  }
  if (days <= 60) return {
    label: `Vence en ${days}d`,
    textColor: 'text-yellow-700',
    badgeBg: 'bg-yellow-100 border-yellow-200',
    barColor: 'bg-yellow-400',
    dot: 'bg-yellow-400',
    Icon: Clock,
  }
  return {
    label: 'Vigente',
    textColor: 'text-green-700',
    badgeBg: 'bg-green-100 border-green-200',
    barColor: 'bg-green-500',
    dot: 'bg-green-500',
    Icon: CheckCircle,
  }
}

function fmt(n: number) {
  return `$${n?.toLocaleString('es-MX')}`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Days Remaining Badge ─────────────────────────────────────────────────────

function DaysRemainingBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-sm">
        VENCIDA
      </span>
    )
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-red-500 text-white shadow-sm">
        {days}d
      </span>
    )
  }
  if (days <= 60) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-yellow-400 text-yellow-900 shadow-sm">
        {days}d
      </span>
    )
  }
  return null
}

// ─── Uninsured Card ───────────────────────────────────────────────────────────

function UninsuredCard({
  vehicle,
  onAdd,
}: {
  vehicle: Vehicle
  onAdd: (vehicleId: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-5 py-4 border-b border-red-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 flex-shrink-0">
            <ShieldOff className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-gray-900 text-base leading-tight">
                {vehicle.eco} <span className="font-normal text-gray-500 text-sm">— {vehicle.brand} {vehicle.model}</span>
              </p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">
                Sin póliza
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{vehicle.plates || 'Sin placas'}</p>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="px-5 py-6 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-700">Sin seguro registrado</p>
        <p className="text-xs text-gray-400">Agrega una póliza para dar seguimiento<br/>a vencimientos y costos.</p>
        <button
          onClick={() => onAdd(vehicle.id)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-colors mt-1"
        >
          <Plus className="w-4 h-4" />
          Agregar seguro
        </button>
      </div>
    </div>
  )
}

// ─── Insurance Card ───────────────────────────────────────────────────────────

function InsuranceCard({
  ins,
  onDelete,
}: {
  ins: Insurance
  onDelete: (id: string) => void
}) {
  const days = getDaysUntilExpiry(ins.expiry_date)
  const lifePercent = getPolicyLifePercent(ins.start_date, ins.expiry_date)
  const status = getStatus(days)
  const StatusIcon = status.Icon
  const primaMensual = Math.round(Number(ins.annual_premium) / 12)

  const waMsg = encodeURIComponent(
    `Hola, necesito renovar la póliza ${ins.policy_number} del vehículo ${ins.eco || ins.plates} que vence el ${fmtDate(ins.expiry_date)}. Por favor me dan una cotización de renovación con ${ins.insurer}. Gracias.`
  )
  const waUrl = `https://wa.me/?text=${waMsg}`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-gray-900 text-base leading-tight">
                  {ins.eco || '—'} <span className="font-normal text-gray-500 text-sm">— {ins.brand} {ins.model}</span>
                </p>
                <DaysRemainingBadge days={days} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{ins.plates || 'Sin placas'}</p>
            </div>
          </div>
          <button
            onClick={() => onDelete(ins.id)}
            className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-400">Aseguradora</p>
            <p className="font-semibold text-gray-800">{ins.insurer}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Póliza</p>
            <p className="font-mono text-xs text-gray-700">{ins.policy_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Cobertura</p>
            <p className="font-medium text-gray-700 capitalize">{ins.coverage_type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Prima anual</p>
            <p className="font-bold text-gray-900">{fmt(ins.annual_premium)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-400">Prima mensual estimada</p>
            <p className="font-bold text-blue-700">{fmt(primaMensual)} <span className="text-xs font-normal text-gray-400">/ mes</span></p>
          </div>
        </div>

        {/* Barra de vida de la póliza */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400">Vigencia de póliza</p>
            <p className="text-xs font-semibold text-gray-600">{lifePercent}% consumido</p>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
              style={{ width: `${lifePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-gray-400">{fmtDate(ins.start_date)}</p>
            <p className="text-[10px] text-gray-400">{fmtDate(ins.expiry_date)}</p>
          </div>
        </div>

        {/* Badge de estado */}
        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${status.badgeBg} ${status.textColor}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>

          {days <= 60 && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Renovar
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function SegurosPage() {
  useEffect(() => { document.title = 'Seguros | Gestiona tu Flotilla' }, [])
  const [data, setData] = useState<Insurance[]>([])
  const [uninsured, setUninsured] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [form, setForm] = useState({
    vehicle_id: '',
    insurer: '',
    policy_number: '',
    start_date: '',
    expiry_date: '',
    coverage_type: 'amplia',
    annual_premium: '',
    insured_amount: '',
  })

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/insurance')
    const json = await res.json()
    const sorted = (json.data || []).sort((a: Insurance, b: Insurance) =>
      getDaysUntilExpiry(a.expiry_date) - getDaysUntilExpiry(b.expiry_date)
    )
    setData(sorted)
    setUninsured(json.uninsured || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Fetch vehicles for dropdown
    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((d) => setVehicles(d.data || d || []))
      .catch(() => setVehicles([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/insurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowForm(false)
    load()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/insurance?id=${deleteId}`, { method: 'DELETE' })
    setDeleteId(null)
    load()
  }

  // ─── Stats para el banner ─────────────────────────────────────────────────
  const totalActivas = data.filter((d) => getDaysUntilExpiry(d.expiry_date) >= 0).length
  const totalPrima = data.reduce((s, d) => s + (Number(d.annual_premium) || 0), 0)
  const proximoVencimiento = data.length > 0
    ? data.reduce((min, d) => {
        const days = getDaysUntilExpiry(d.expiry_date)
        if (days < getDaysUntilExpiry(min.expiry_date)) return d
        return min
      })
    : null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Seguros vehiculares</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de pólizas y vencimientos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Agregar seguro
        </button>
      </div>

      {/* Banner resumen — 3 KPI cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Pólizas activas</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalActivas}</p>
            <p className="text-xs text-gray-400 mt-1">de {data.length + uninsured.length} vehículos</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Prima anual total</p>
            </div>
            <p className="text-3xl font-black text-gray-900">{fmt(totalPrima)}</p>
            <p className="text-xs text-gray-400 mt-1">suma de todas las pólizas</p>
          </div>

          <div className={`rounded-2xl border shadow-sm p-5 ${proximoVencimiento && getDaysUntilExpiry(proximoVencimiento.expiry_date) <= 30 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${proximoVencimiento && getDaysUntilExpiry(proximoVencimiento.expiry_date) <= 30 ? 'bg-orange-100' : 'bg-yellow-100'}`}>
                <Clock className={`h-4 w-4 ${proximoVencimiento && getDaysUntilExpiry(proximoVencimiento.expiry_date) <= 30 ? 'text-orange-600' : 'text-yellow-600'}`} />
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Próximo vencimiento</p>
            </div>
            {proximoVencimiento ? (
              <>
                <p className="text-xl font-black text-gray-900">
                  {getDaysUntilExpiry(proximoVencimiento.expiry_date) <= 0
                    ? 'Vencida'
                    : `${getDaysUntilExpiry(proximoVencimiento.expiry_date)} días`}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {proximoVencimiento.eco} — {proximoVencimiento.insurer}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Sin pólizas</p>
            )}
          </div>
        </div>
      )}

      {/* ── Grid unificado: todos los vehículos ── */}
      {loading ? (
        <div className="p-4"><SkeletonTable rows={5} cols={4} /></div>
      ) : data.length === 0 && uninsured.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No hay vehículos ni pólizas registradas</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 font-semibold transition-colors">
            + Agregar primera póliza
          </button>
        </div>
      ) : (
        <>
          {/* Aviso compacto si hay sin seguro */}
          {uninsured.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-semibold">
                {uninsured.length} vehículo{uninsured.length > 1 ? 's' : ''} sin seguro registrado — aparecen al final del listado.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* Vehículos CON póliza */}
            {data.map((ins) => (
              <InsuranceCard key={ins.id} ins={ins} onDelete={setDeleteId} />
            ))}
            {/* Vehículos SIN póliza — tarjetas al final */}
            {uninsured.map((v) => (
              <UninsuredCard
                key={v.id}
                vehicle={v}
                onAdd={(vehicleId) => { setShowForm(true); setForm(prev => ({ ...prev, vehicle_id: vehicleId })) }}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal agregar seguro */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-black text-gray-900">Agregar seguro</h3>

            {/* Vehicle dropdown */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vehículo</label>
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none"
                required
              >
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.eco} — {v.brand} {v.model} ({v.plates})
                  </option>
                ))}
              </select>
            </div>

            {[
              { label: 'Aseguradora', key: 'insurer', type: 'text', placeholder: 'AXA, Qualitas, GNP...' },
              { label: 'Número de póliza', key: 'policy_number', type: 'text', placeholder: 'POL-2024-001' },
              { label: 'Fecha inicio', key: 'start_date', type: 'date', placeholder: '' },
              { label: 'Fecha vencimiento', key: 'expiry_date', type: 'date', placeholder: '' },
              { label: 'Prima anual (MXN)', key: 'annual_premium', type: 'number', placeholder: '12000' },
              { label: 'Suma asegurada (MXN)', key: 'insured_amount', type: 'number', placeholder: '350000' },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900"
                  required
                />
              </div>
            ))}

            {/* Cobertura */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo de cobertura</label>
              <select
                value={form.coverage_type}
                onChange={(e) => setForm((prev) => ({ ...prev, coverage_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-400 focus:outline-none"
              >
                <option value="amplia">Amplia</option>
                <option value="basica">Básica</option>
                <option value="rc">Responsabilidad civil</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 py-2.5 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-bold">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Eliminar seguro"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
