import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidad | Gestiona tu Flotilla',
  description: 'Conoce cómo recopilamos, usamos y protegemos tus datos en Gestiona tu Flotilla.',
}

export default function PrivacidadPage() {
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: abril 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Responsable del tratamiento</h2>
            <p>
              <strong>Gestiona tu Flotilla S. de R.L. de C.V.</strong> (en adelante, "nosotros" o "la Empresa"), con domicilio en Guadalajara, Jalisco, México, es responsable del tratamiento de tus datos personales conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento.
            </p>
            <p className="mt-2">
              Contacto del área de privacidad:{' '}
              <a href="mailto:privacidad@gestionatuflotilla.com" className="text-blue-600 underline">
                privacidad@gestionatuflotilla.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes datos personales:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (cifrada), nombre de empresa y teléfono</li>
              <li><strong>Datos de operación:</strong> información de vehículos, choferes, cuentas semanales e ingresos que ingresas tú mismo a la Plataforma</li>
              <li><strong>Datos de pago:</strong> procesados directamente por Stripe — nosotros no almacenamos números de tarjeta</li>
              <li><strong>Datos de uso:</strong> registros de acceso, páginas visitadas y acciones dentro de la Plataforma para mejorar el servicio</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador y sistema operativo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Finalidades del tratamiento</h2>
            <p>Usamos tus datos para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Crear y administrar tu cuenta en la Plataforma</li>
              <li>Prestarte los servicios contratados (gestión de flotilla, cálculos fiscales, GPS, reportes)</li>
              <li>Procesar pagos y gestionar tu suscripción</li>
              <li>Enviarte notificaciones del servicio, alertas de vencimiento y avisos importantes</li>
              <li>Brindarte soporte técnico</li>
              <li>Mejorar la Plataforma con base en patrones de uso agregados y anónimos</li>
              <li>Cumplir con obligaciones legales aplicables</li>
            </ul>
            <p className="mt-2">
              <strong>No usamos tus datos para publicidad de terceros ni los vendemos bajo ninguna circunstancia.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Base legal del tratamiento</h2>
            <p>El tratamiento de tus datos se realiza con base en:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Ejecución del contrato:</strong> para prestarte los servicios que contrataste</li>
              <li><strong>Consentimiento:</strong> para comunicaciones de marketing opcionales</li>
              <li><strong>Interés legítimo:</strong> para mejorar la seguridad y funcionalidad del servicio</li>
              <li><strong>Obligación legal:</strong> cuando la ley mexicana así lo requiera</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Transferencia de datos</h2>
            <p>
              Compartimos tus datos únicamente con los proveedores de tecnología necesarios para operar la Plataforma, todos bajo acuerdos de confidencialidad:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Neon (Neon Inc.):</strong> base de datos en la nube — almacenamiento seguro de tu información</li>
              <li><strong>Vercel Inc.:</strong> infraestructura de hospedaje — servidores en EE.UU. con certificación SOC 2</li>
              <li><strong>Stripe Inc.:</strong> procesamiento de pagos — PCI DSS Level 1</li>
              <li><strong>TrackSolid (Concox):</strong> plataforma GPS vehicular</li>
            </ul>
            <p className="mt-2">
              No realizamos transferencias de datos a países sin nivel adecuado de protección sin las salvaguardas apropiadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus datos:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Cifrado SSL/TLS en todas las comunicaciones</li>
              <li>Contraseñas almacenadas con hash bcrypt (no reversible)</li>
              <li>Sesiones con tokens JWT firmados con expiración de 8 horas</li>
              <li>Acceso a base de datos restringido por roles y red privada</li>
              <li>Respaldos automáticos diarios con retención de 7 días</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Conservación de datos</h2>
            <p>
              Conservamos tus datos mientras mantengas una cuenta activa. Al cancelar tu suscripción, tus datos se mantienen disponibles para exportación por 30 días calendario, tras los cuales se eliminan de forma permanente de nuestros sistemas activos. Los respaldos se eliminan en un máximo de 90 días.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Tus derechos ARCO</h2>
            <p>
              Conforme a la LFPDPPP, tienes derecho a:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Acceso:</strong> conocer qué datos tenemos sobre ti</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
              <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos</li>
              <li><strong>Oposición:</strong> oponerte al tratamiento para determinadas finalidades</li>
            </ul>
            <p className="mt-2">
              Para ejercer cualquiera de estos derechos, escríbenos a{' '}
              <a href="mailto:privacidad@gestionatuflotilla.com" className="text-blue-600 underline">
                privacidad@gestionatuflotilla.com
              </a>{' '}
              con tu nombre, correo registrado y la solicitud específica. Respondemos en un máximo de 20 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Cookies</h2>
            <p>
              La Plataforma usa una cookie de sesión segura (<code className="bg-gray-100 px-1 rounded text-xs">gtf_session</code>) estrictamente necesaria para mantener tu sesión iniciada. No usamos cookies de rastreo publicitario ni de terceros para análisis de comportamiento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Menores de edad</h2>
            <p>
              La Plataforma está dirigida exclusivamente a personas mayores de 18 años que actúan en representación de un negocio. No recopilamos conscientemente datos de menores de edad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad en cualquier momento. Publicaremos la versión actualizada en esta página y te notificaremos por correo electrónico si los cambios son materiales. La fecha de "última actualización" en la parte superior de esta página indicará cuándo fue revisada por última vez.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Contacto</h2>
            <p>
              Para cualquier pregunta sobre esta Política o sobre el tratamiento de tus datos personales, contáctanos en:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li>📧 <a href="mailto:privacidad@gestionatuflotilla.com" className="text-blue-600 underline">privacidad@gestionatuflotilla.com</a></li>
              <li>🌐 <a href="https://gestionatuflotilla.com" className="text-blue-600 underline">gestionatuflotilla.com</a></li>
              <li>📍 Guadalajara, Jalisco, México</li>
            </ul>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Inicio</Link>
          <Link href="/privacidad" className="hover:text-gray-600 font-semibold text-gray-600">Política de Privacidad</Link>
          <Link href="/terminos" className="hover:text-gray-600">Términos de Servicio</Link>
          <span>© {new Date().getFullYear()} Gestiona tu Flotilla</span>
        </div>
      </footer>
    </div>
  )
}
