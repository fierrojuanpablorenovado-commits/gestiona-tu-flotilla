import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Datos | Gestiona tu Flotilla',
  description: 'Cómo gestionamos, protegemos y portabilizamos los datos de tu flotilla en la plataforma.',
}

export default function DatosPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-blue-600 text-lg">
            Gestiona tu Flotilla
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">
            Iniciar sesión →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Política de Datos de Flotilla</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: mayo 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Propiedad de los datos</h2>
            <p>
              Los datos que ingresas a la plataforma — vehículos, choferes, cuentas semanales, ingresos, mantenimientos y cualquier otro registro operativo — son <strong>de tu propiedad exclusiva</strong>. Gestiona tu Flotilla actúa únicamente como procesador técnico y nunca reclama propiedad sobre ellos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Aislamiento multi-tenant</h2>
            <p>
              Cada empresa opera en un entorno completamente aislado. Todos los registros están asociados a un identificador único de tenant (<code className="bg-gray-100 px-1 rounded">tenant_id</code>) y las consultas a la base de datos aplican filtros por tenant en cada operación. Ningún cliente puede ver, acceder ni modificar los datos de otro cliente, incluso ante fallas técnicas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Datos de conductores</h2>
            <p>
              Los datos personales de conductores (nombre, teléfono, documentos, historial de cuentas) son tratados con estricta confidencialidad. Al registrar un conductor, confirmas que cuentas con su autorización para almacenar y procesar sus datos dentro de la plataforma, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Datos de ubicación GPS</h2>
            <p>
              Si utilizas la integración GPS con TrackSolid/Concox, los datos de ubicación vehicular son consultados en tiempo real desde la API de TrackSolid. <strong>No almacenamos el historial de ubicación</strong> en nuestros servidores — únicamente mostramos la posición actual obtenida en cada consulta. Los datos de historial de recorridos quedan en los servidores de TrackSolid bajo sus propios términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Portabilidad y exportación</h2>
            <p>
              Puedes exportar toda tu información en cualquier momento desde la sección de Reportes y Configuración. Los formatos disponibles son Excel (.xlsx) y CSV. Al cancelar tu suscripción, tienes 30 días para exportar todo antes de que los datos sean eliminados de forma permanente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Eliminación de datos</h2>
            <p>
              Puedes solicitar la eliminación completa de tu cuenta y todos sus datos en cualquier momento escribiendo a{' '}
              <a href="mailto:privacidad@gestionatuflotilla.com" className="text-blue-600 underline">
                privacidad@gestionatuflotilla.com
              </a>.
              La eliminación se confirma en máximo 5 días hábiles. Los respaldos cifrados se depuran en un máximo de 90 días adicionales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Retención</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cuenta activa:</strong> datos conservados indefinidamente mientras el servicio esté activo</li>
              <li><strong>Cancelación:</strong> 30 días de acceso para exportar, luego eliminación permanente</li>
              <li><strong>Respaldos:</strong> depuración automática a los 90 días de la cancelación</li>
              <li><strong>Logs de auditoría:</strong> conservados 12 meses por razones de seguridad operativa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Contacto</h2>
            <p>
              Para solicitudes sobre tus datos de flotilla:{' '}
              <a href="mailto:privacidad@gestionatuflotilla.com" className="text-blue-600 underline">
                privacidad@gestionatuflotilla.com
              </a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Inicio</Link>
          <Link href="/privacidad" className="hover:text-gray-600">Política de Privacidad</Link>
          <Link href="/terminos" className="hover:text-gray-600">Términos de Servicio</Link>
          <Link href="/datos" className="hover:text-gray-600 font-semibold text-gray-600">Política de Datos</Link>
          <Link href="/marca" className="hover:text-gray-600">Marca y Licencias</Link>
          <span>© {new Date().getFullYear()} Gestiona tu Flotilla</span>
        </div>
      </footer>
    </div>
  )
}
