import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de Servicio | Gestiona tu Flotilla',
  description: 'Términos y condiciones de uso de la plataforma Gestiona tu Flotilla.',
}

export default function TerminosPage() {
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Términos de Servicio</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: abril 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al registrarte y usar la plataforma <strong>Gestiona tu Flotilla</strong> (en adelante, "la Plataforma"), operada por Gestiona tu Flotilla S. de R.L. de C.V., aceptas quedar obligado por estos Términos de Servicio. Si no estás de acuerdo con alguno de estos términos, no uses la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Descripción del servicio</h2>
            <p>
              Gestiona tu Flotilla es un software de administración vehicular en la nube dirigido a flotilleros, arrendadores y empresas de transporte en México. La Plataforma permite:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Gestión de vehículos, choferes y cuentas semanales</li>
              <li>Cálculo estimado de impuestos ISR e IVA (RESICO y PFAE plataformas)</li>
              <li>Seguimiento de GPS vehicular mediante integración con TrackSolid</li>
              <li>Generación de reportes y alertas automáticas</li>
              <li>Importación de datos desde archivos Excel de Didi Fleet</li>
            </ul>
            <p className="mt-2">
              Los cálculos fiscales que provee la Plataforma son <strong>estimados con fines informativos</strong> y no constituyen asesoría contable o fiscal. Consulta siempre a un contador certificado para tus declaraciones oficiales ante el SAT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Registro y cuenta</h2>
            <p>
              Para usar la Plataforma debes registrar una cuenta con información verídica y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Notifícanos inmediatamente si detectas uso no autorizado de tu cuenta a <a href="mailto:soporte@gestionatuflotilla.com" className="text-blue-600 underline">soporte@gestionatuflotilla.com</a>.
            </p>
            <p className="mt-2">
              Cada cuenta corresponde a un único negocio o persona moral. No está permitido compartir accesos entre distintas organizaciones sin un plan multi-usuario.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Planes y pagos</h2>
            <p>
              La Plataforma ofrece una prueba gratuita de 14 días sin necesidad de tarjeta de crédito. Al término del período de prueba, deberás contratar uno de los planes disponibles para continuar usando el servicio.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Plan Básico:</strong> $499 MXN/mes — hasta 15 vehículos</li>
              <li><strong>Plan Pro:</strong> $999 MXN/mes — hasta 50 vehículos</li>
              <li><strong>Plan Enterprise:</strong> $1,999 MXN/mes — vehículos ilimitados</li>
            </ul>
            <p className="mt-2">
              Los pagos se procesan mensualmente de forma recurrente a través de Stripe. Puedes cancelar en cualquier momento desde tu panel de configuración sin penalizaciones. No realizamos reembolsos por fracciones de mes ya facturadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Uso permitido</h2>
            <p>Te comprometes a usar la Plataforma únicamente para fines legítimos de administración vehicular. Queda prohibido:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Usar la Plataforma para actividades ilícitas o fraudulentas</li>
              <li>Intentar acceder a cuentas o datos de otros usuarios</li>
              <li>Realizar ingeniería inversa, copiar o distribuir el software</li>
              <li>Sobrecargar los servidores mediante bots o scripts automatizados sin autorización</li>
              <li>Revender o sublicenciar el servicio a terceros sin autorización escrita</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Propiedad intelectual</h2>
            <p>
              Todo el contenido de la Plataforma — incluyendo código, diseño, logotipos, textos y funcionalidades — es propiedad exclusiva de Gestiona tu Flotilla S. de R.L. de C.V. y está protegido por las leyes mexicanas e internacionales de propiedad intelectual.
            </p>
            <p className="mt-2">
              Los datos que ingresas a la Plataforma son de tu propiedad. Nos otorgas una licencia limitada para procesarlos con el único fin de prestarte el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Disponibilidad y soporte</h2>
            <p>
              Nos comprometemos a mantener la Plataforma disponible al menos el 99% del tiempo mensual. Realizamos mantenimientos programados con aviso previo. El soporte técnico se brinda por correo electrónico y WhatsApp en días hábiles de 9:00 a 18:00 horas (hora del centro de México).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">8. Limitación de responsabilidad</h2>
            <p>
              La Plataforma se proporciona "tal cual". No garantizamos que sea libre de errores ni que los cálculos fiscales sean exactos para todos los casos particulares. En ningún caso seremos responsables por daños indirectos, pérdida de ingresos o sanciones fiscales derivadas del uso de los estimados que provee la Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">9. Cancelación y terminación</h2>
            <p>
              Puedes cancelar tu suscripción en cualquier momento. Tu acceso continuará activo hasta el final del período ya pagado. Podemos suspender o cancelar tu cuenta si detectamos violaciones a estos términos, con notificación previa cuando sea posible.
            </p>
            <p className="mt-2">
              Tras la cancelación, tus datos se conservan por 30 días calendario para que puedas exportarlos. Pasado ese plazo, se eliminan de forma permanente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">10. Modificaciones</h2>
            <p>
              Podemos actualizar estos Términos en cualquier momento. Te notificaremos por correo electrónico con al menos 15 días de anticipación ante cambios materiales. El uso continuo de la Plataforma después de la fecha efectiva constituye aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">11. Ley aplicable</h2>
            <p>
              Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes de la ciudad de Guadalajara, Jalisco, México, renunciando a cualquier otro fuero que pudiera corresponder.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">12. Contacto</h2>
            <p>
              Para cualquier pregunta sobre estos Términos, escríbenos a:{' '}
              <a href="mailto:soporte@gestionatuflotilla.com" className="text-blue-600 underline">
                soporte@gestionatuflotilla.com
              </a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Inicio</Link>
          <Link href="/privacidad" className="hover:text-gray-600">Política de Privacidad</Link>
          <Link href="/terminos" className="hover:text-gray-600 font-semibold text-gray-600">Términos de Servicio</Link>
          <span>© {new Date().getFullYear()} Gestiona tu Flotilla</span>
        </div>
      </footer>
    </div>
  )
}
