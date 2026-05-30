import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Marca y Licencias | Gestiona tu Flotilla',
  description: 'Uso permitido de la marca, logotipo y materiales de Gestiona tu Flotilla.',
}

export default function MarcaPage() {
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
        <h1 className="text-3xl font-black text-gray-900 mb-2">Marca y Licencias</h1>
        <p className="text-sm text-gray-400 mb-10">Última actualización: mayo 2025</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">1. Titularidad</h2>
            <p>
              La marca <strong>"Gestiona tu Flotilla"</strong>, su logotipo, el nombre de dominio{' '}
              <code className="bg-gray-100 px-1 rounded">gestionatuflotilla.com</code> y todos los materiales visuales asociados son propiedad exclusiva de <strong>JuPaFi Consultores</strong>. Todos los derechos reservados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">2. Uso permitido</h2>
            <p>Puedes usar el nombre de la plataforma para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Mencionar que tu empresa usa Gestiona tu Flotilla como herramienta de gestión</li>
              <li>Enlazar al sitio web oficial en reseñas, artículos o publicaciones informativas</li>
              <li>Compartir capturas de pantalla de la plataforma en contextos de demostración o soporte</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">3. Uso no permitido</h2>
            <p>Está <strong>expresamente prohibido</strong> sin autorización escrita previa:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Usar la marca o logotipo para representar o publicitar otro producto o servicio</li>
              <li>Crear sitios web, materiales o cuentas en redes sociales que puedan generar confusión con la plataforma oficial</li>
              <li>Reproducir, distribuir o sublicenciar cualquier componente del software o diseño</li>
              <li>Usar el nombre de la marca en metatags, palabras clave de publicidad pagada o registros de dominio similares</li>
              <li>Modificar el logotipo o crear versiones derivadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">4. Licencia de uso de la plataforma</h2>
            <p>
              Al contratar el servicio, se te otorga una licencia limitada, no exclusiva, no transferible y revocable para acceder y usar la plataforma según los términos de tu plan activo. Esta licencia no incluye el código fuente, los algoritmos, ni ningún componente técnico de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">5. Contenido generado por el usuario</h2>
            <p>
              Los reportes, exportaciones e información generada con base en tus datos son de tu propiedad. Gestiona tu Flotilla no reclama derechos sobre el contenido específico que produces con la plataforma a partir de tus propios datos operativos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">6. Software de terceros</h2>
            <p>
              La plataforma utiliza software de código abierto bajo licencias MIT, Apache 2.0 y otras licencias permisivas. El uso de estas librerías cumple con sus respectivas condiciones de licencia. Para mayor información sobre las dependencias específicas, contacta a{' '}
              <a href="mailto:hola@gestionatuflotilla.com" className="text-blue-600 underline">
                hola@gestionatuflotilla.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">7. Solicitudes de uso de marca</h2>
            <p>
              Para solicitar autorización de uso de la marca en casos no contemplados anteriormente, escríbenos a:{' '}
              <a href="mailto:hola@gestionatuflotilla.com" className="text-blue-600 underline">
                hola@gestionatuflotilla.com
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
          <Link href="/datos" className="hover:text-gray-600">Política de Datos</Link>
          <Link href="/marca" className="hover:text-gray-600 font-semibold text-gray-600">Marca y Licencias</Link>
          <span>© {new Date().getFullYear()} Gestiona tu Flotilla</span>
        </div>
      </footer>
    </div>
  )
}
