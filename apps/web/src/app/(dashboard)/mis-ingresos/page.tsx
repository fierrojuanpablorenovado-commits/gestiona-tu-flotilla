'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  Car,
  Calendar,
  Target,
  ChevronRight,
  ArrowUpRight,
  Wallet,
  Banknote,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  ingresosSemana: number
  utilidadMes: number
  vehiculosActivos: number
  choferesActivos: number
  choferes: number
  totalVehiculos?: number
  vehiculosMantenimiento?: number
}

interface DashboardData {
  stats: DashboardStats
  cobrosPendientes?: Array<{ nombre: string; telefono: string; monto: number; semana?: string }>
  revenueByVehicle?: Array<{ label: string; amount: number }>
}

interface Vehicle {
  id: string
  eco: string
  brand: string
  model: string
  plates: string
  status?: string
  driver?: { name?: string; firstName?: string; lastName?: string } | null
  driverName?: string
  weeklyRent?: number
  rent?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-MX')}`
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

// ─── KPI Big Card ─────────────────────────────────────────────────────────────

interface BigKpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color: 'green' | 'emerald' | 'blue' | 'red' | 'purple' | 'amber'
  href?: string
  badge?: string
}

function BigKpiCard({ icon, label, value, sub, color, href, badge }: BigKpiCardProps) {
  const styles = {
    green: {
      card: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
      icon: 'bg-green-100 text-green-600',
      value: 'text-green-800',
      label: 'text-green-700',
      sub: 'text-green-600',
      badge: 'bg-green-200 text-green-800',
    },
    emerald: {
      card: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      value: 'text-emerald-800',
      label: 'text-emerald-700',
      sub: 'text-emerald-600',
      badge: 'bg-emerald-200 text-emerald-800',
    },
    blue: {
      card: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      value: 'text-blue-800',
      label: 'text-blue-700',
      sub: 'text-blue-600',
      badge: 'bg-blue-200 text-blue-800',
    },
    red: {
      card: 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200',
      icon: 'bg-red-100 text-red-600',
      value: 'text-red-800',
      label: 'text-red-700',
      sub: 'text-red-600',
      badge: 'bg-red-200 text-red-800',
    },
    purple: {
      card: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200',
      icon: 'bg-violet-100 text-violet-600',
      value: 'text-violet-800',
      label: 'text-violet-700',
      sub: 'text-violet-600',
      badge: 'bg-violet-200 text-violet-800',
    },
    amber: {
      card: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      value: 'text-amber-800',
      label: 'text-amber-700',
      sub: 'text-amber-600',
      badge: 'bg-amber-200 text-amber-800',
    },
  }
  const s = styles[color]

  const inner = (
    <div className={`relative rounded-2xl border p-5 h-full transition-all hover:shadow-md hover:-translate-y-0.5 ${s.card}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.icon}`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.badge}`}>{badge}</span>
        )}
        {href && (
          <ArrowUpRight className={`h-4 w-4 opacity-40 ${s.label}`} />
        )}
      </div>
      <p className={`text-3xl font-black leading-none mb-1 ${s.value}`}>{value}</p>
      {sub && <p className={`text-xs font-medium mb-1 ${s.sub}`}>{sub}</p>}
      <p className={`text-xs font-semibold uppercase tracking-wide opacity-70 ${s.label}`}>{label}</p>
    </div>
  )

  if (href) return <Link href={href} className="block h-full">{inner}</Link>
  return inner
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MisIngresosPage() {
  useEffect(() => { document.title = 'Mis ingresos | Gestiona tu Flotilla' }, [])

  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingDash, setLoadingDash] = useState(true)
  const [loadingVeh, setLoadingVeh] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => setDashData(d))
      .catch(() => setDashData(null))
      .finally(() => setLoadingDash(false))

    fetch('/api/vehicles')
      .then((r) => r.json())
      .then((d) => setVehicles(d.data || d || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVeh(false))
  }, [])

  const stats = dashData?.stats
  const cobros = dashData?.cobrosPendientes || []

  // Vehículos activos con renta
  const vehiculosActivos = vehicles.filter(
    (v) => !v.status || v.status === 'activo' || v.status === 'active'
  )
  const vehiculosInactivos = vehicles.filter(
    (v) => v.status && v.status !== 'activo' && v.status !== 'active'
  )

  // Renta promedio configurada
  const rentaPromedio = vehicles.length > 0
    ? Math.round(
        vehicles.reduce((s, v) => s + (v.weeklyRent ?? v.rent ?? 1500), 0) / vehicles.length
      )
    : 1500

  // Smart fallback: si la API devuelve $0 (sin datos reales), usar estimado basado en vehículos
  const apiRentaSemana = stats?.ingresosSemana ?? 0
  const estimadoSemana = vehiculosActivos.length * rentaPromedio
  const usandoEstimado = apiRentaSemana === 0 && estimadoSemana > 0

  const rentaSemana = usandoEstimado ? estimadoSemana : apiRentaSemana
  const rentaMes = rentaSemana * 4

  // Gastos mes: utilidad = ingresos - gastos → gastos = ingresos - utilidad
  const utilidadMes = stats?.utilidadMes ?? 0
  const gastosMes = Math.max(0, rentaMes - utilidadMes)
  const netoMes = usandoEstimado ? rentaMes * 0.35 : utilidadMes // 35% margen estimado si no hay datos reales

  // Proyección anual
  const proyeccionAnual = rentaMes * 12
  const netoAnual = netoMes * 12

  const potencialMensual = vehicles.length * rentaPromedio * 4
  const potencialAnual = potencialMensual * 12

  // Tasa de ocupación
  const tasaOcupacion = vehicles.length > 0
    ? Math.round((vehiculosActivos.length / vehicles.length) * 100)
    : 0

  // Cobros recientes (últimos 5 desde dashboard)
  const cobrosRecientes = cobros.slice(0, 5)

  const loading = loadingDash || loadingVeh

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mis ingresos</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
            ¿Cuánto estoy ganando?
          </p>
        </div>
        <Link
          href="/cuentas-semanales/importar-didi"
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
        >
          <Banknote className="w-4 h-4" />
          Nueva cuenta
        </Link>
      </div>

      {/* ─── 4 KPI Cards ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
        ) : (
          <>
            <BigKpiCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Renta semana actual"
              value={fmt(rentaSemana)}
              sub={usandoEstimado ? `${vehiculosActivos.length} veh. × ${fmt(rentaPromedio)}` : 'Cobrado esta semana'}
              color="green"
              href="/tesoreria"
              badge={usandoEstimado ? 'Est.' : undefined}
            />
            <BigKpiCard
              icon={<Calendar className="h-5 w-5" />}
              label="Renta mes actual"
              value={fmt(rentaMes)}
              sub="× 4 semanas"
              color="emerald"
              badge={usandoEstimado ? 'Est.' : '×4'}
            />
            <BigKpiCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Gastos mes"
              value={fmt(gastosMes)}
              sub="Operación + fijos"
              color="red"
              href="/tesoreria"
            />
            <BigKpiCard
              icon={<Wallet className="h-5 w-5" />}
              label="Neto mes"
              value={fmt(netoMes)}
              sub={usandoEstimado ? '~35% margen estimado' : 'Ingresos - gastos'}
              color="purple"
              badge={netoMes >= 0 ? '✓' : '↓'}
            />
          </>
        )}
      </div>

      {/* ─── Tasa de ocupación ─── */}
      {!loading && vehicles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Car className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Tasa de ocupación</h2>
                <p className="text-xs text-gray-400">{vehiculosActivos.length} activos de {vehicles.length} totales</p>
              </div>
            </div>
            <span className={`text-2xl font-black ${tasaOcupacion >= 80 ? 'text-green-700' : tasaOcupacion >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {tasaOcupacion}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                tasaOcupacion >= 80 ? 'bg-green-500' : tasaOcupacion >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${tasaOcupacion}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{vehiculosActivos.length} activos</span>
            <span>{vehiculosInactivos.length} sin actividad</span>
            <span>{vehicles.length} total</span>
          </div>
        </div>
      )}

      {/* ─── Por vehículo ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Car className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Por vehículo</h2>
              <p className="text-xs text-gray-400">{vehicles.length} vehículos · {vehiculosActivos.length} activos ({tasaOcupacion}% ocupación)</p>
            </div>
          </div>
          <Link href="/vehiculos" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
            Ver todos <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingVeh ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay vehículos registrados</p>
            <Link href="/vehiculos" className="mt-3 inline-block px-4 py-2 bg-blue-500 text-white text-xs rounded-xl font-semibold">
              Registrar vehículo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Vehículo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chofer</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Renta/sem</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Renta/mes</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map((v) => {
                  const isActive = !v.status || v.status === 'activo' || v.status === 'active'
                  const rentaSem = v.weeklyRent ?? v.rent ?? rentaPromedio
                  const rentaMensual = rentaSem * 4
                  const driverName = v.driverName
                    || (v.driver ? `${v.driver.firstName || ''} ${v.driver.lastName || ''}`.trim() : '')
                    || '—'

                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-bold text-gray-900">{v.eco || '—'}</p>
                          <p className="text-xs text-gray-400">{v.brand} {v.model} · {v.plates}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-medium ${driverName === '—' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {driverName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {fmt(rentaSem)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {fmt(rentaMensual)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Cobros recientes + Proyección ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Cobros recientes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Cobros recientes</h2>
                <p className="text-xs text-gray-400">Últimas cuentas semanales</p>
              </div>
            </div>
            <Link href="/cuentas-semanales/importar-didi" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
              Nueva <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {loadingDash ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : cobrosRecientes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Sin cobros registrados</p>
              <Link href="/cuentas-semanales/importar-didi" className="mt-3 inline-block px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg font-semibold">
                Crear cuenta semanal
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cobrosRecientes.map((c, i) => {
                const iniciales = c.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold flex-shrink-0">
                      {iniciales}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                      {c.semana && <p className="text-xs text-gray-400">{c.semana}</p>}
                    </div>
                    <span className="text-base font-black text-green-700">{fmt(c.monto)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Proyección anual */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Proyección anual</h2>
                <p className="text-xs text-gray-400">Basado en rendimiento mensual</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Proyección de ingresos */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs font-semibold text-green-700 uppercase mb-1">Ingresos proyectados</p>
              <p className="text-3xl font-black text-green-800">{fmt(proyeccionAnual)}</p>
              <p className="text-xs text-green-600 mt-1">
                {fmt(rentaMes)} / mes × 12 meses
              </p>
            </div>

            {/* Neto proyectado */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Neto proyectado</p>
              <p className={`text-3xl font-black ${netoAnual >= 0 ? 'text-purple-800' : 'text-red-700'}`}>
                {fmt(netoAnual)}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {fmt(netoMes)} / mes × 12 meses
              </p>
            </div>

            {/* Semanas del año */}
            <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
              <span className="text-gray-500 text-xs">Semanas en el año</span>
              <span className="font-bold text-gray-800">52 semanas</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 text-xs">Renta semanal × 52</span>
              <span className="font-bold text-green-700">{fmt(rentaSemana * 52)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Renta configurada ─── */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-700 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-white font-bold text-sm">Renta configurada</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-white/70 text-xs mb-1">Vehículos totales</p>
            <p className="text-white text-2xl font-black">{vehicles.length}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {vehiculosActivos.length} activos · {vehiculosInactivos.length} inactivos
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-white/70 text-xs mb-1">Renta promedio / sem</p>
            <p className="text-white text-2xl font-black">{fmt(rentaPromedio)}</p>
            <p className="text-white/60 text-xs mt-0.5">por vehículo activo</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-white/70 text-xs mb-1">Potencial mensual</p>
            <p className="text-white text-2xl font-black">{fmt(potencialMensual)}</p>
            <p className="text-white/60 text-xs mt-0.5">
              {vehicles.length} veh. × {fmt(rentaPromedio)}/sem × 4
            </p>
          </div>
        </div>

        <div className="mt-4 bg-white/10 rounded-xl p-3 border border-white/20">
          <p className="text-white text-xs font-medium">
            Con <span className="font-black">{vehicles.length} vehículos</span> a <span className="font-black">{fmt(rentaPromedio)}/semana</span> cada uno
            = <span className="font-black">{fmt(potencialMensual)}/mes</span> potencial
            = <span className="font-black">{fmt(potencialAnual)}/año</span> si todos están activos y pagando.
          </p>
        </div>

        <div className="mt-3 flex justify-end">
          <Link
            href="/vehiculos"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Gestionar vehículos <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

    </div>
  )
}
