'use client'
import { useState } from 'react'
import { Car, Users, DollarSign, CheckCircle, X, ArrowRight, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingWizardProps {
  onComplete: () => void
  tenantName: string
}

const STEPS = [
  { id: 1, title: 'Bienvenido', icon: CheckCircle, description: 'Configura tu empresa en 4 pasos rápidos' },
  { id: 2, title: 'Tu primer vehículo', icon: Car, description: 'Agrega el primer vehículo de tu flotilla', href: '/vehiculos' },
  { id: 3, title: 'Tu primer chofer', icon: Users, description: 'Registra a tu primer conductor', href: '/choferes' },
  { id: 4, title: 'Cuenta semanal', icon: DollarSign, description: 'Configura cómo cobrarás a tus choferes', href: '/cuentas-semanales' },
  { id: 5, title: '¡Listo!', icon: CheckCircle, description: 'Tu flotilla está configurada' },
]

export function OnboardingWizard({ onComplete, tenantName }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  const current = STEPS[step - 1]
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  const handleDismiss = () => {
    localStorage.setItem('gtf_onboarding_done', 'true')
    setDismissed(true)
    onComplete()
  }

  const handleAction = () => {
    if (step < STEPS.length) {
      if (STEPS[step - 1].href) {
        localStorage.setItem('gtf_onboarding_step', String(step + 1))
        router.push(STEPS[step - 1].href!)
      }
      setStep(s => s + 1)
    } else {
      handleDismiss()
    }
  }

  const Icon = current.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">Paso {step} de {STEPS.length}</span>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-8">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-blue-500" />
          </div>
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Bienvenido, {tenantName}! 👋</h2>
              <p className="text-gray-500 dark:text-gray-400">Vamos a configurar tu flotilla en 4 pasos rápidos. No tomará más de 5 minutos.</p>
            </>
          )}
          {step > 1 && step < STEPS.length && (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{current.title}</h2>
              <p className="text-gray-500 dark:text-gray-400">{current.description}</p>
            </>
          )}
          {step === STEPS.length && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Todo listo! 🎉</h2>
              <p className="text-gray-500 dark:text-gray-400">Tu flotilla está configurada. Puedes explorar todos los módulos desde el menú lateral.</p>
            </>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className={`w-2 h-2 rounded-full transition-all ${s.id === step ? 'w-6 bg-blue-500' : s.id < step ? 'bg-blue-300' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 1 && step < STEPS.length && (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button onClick={handleAction} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors">
            {step === STEPS.length ? 'Ir al dashboard' : step === 1 ? 'Comenzar' : 'Siguiente'}
            {step < STEPS.length && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {step < STEPS.length && (
          <button onClick={handleDismiss} className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Saltar configuración inicial
          </button>
        )}
      </div>
    </div>
  )
}
