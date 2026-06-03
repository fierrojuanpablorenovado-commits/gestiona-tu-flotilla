import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/infracciones/jalisco-portal?vehicleId=UUID
 *
 * Devuelve una página HTML con un formulario que se auto-envía al portal
 * de adeudos vehiculares del Estado de Jalisco con los datos del vehículo,
 * mostrando directamente la infracción sin que el usuario tenga que llenar nada.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session?.tenantId)
    return new NextResponse('No autorizado', { status: 401 });

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get('vehicleId');

  if (!vehicleId)
    return new NextResponse('vehicleId requerido', { status: 400 });

  // Obtener datos del vehículo
  const rows = await sql`
    SELECT
      COALESCE(NULLIF(TRIM(v.plates), ''), NULLIF(TRIM(v.eco), '')) AS placa,
      TRIM(v.vin)                  AS vin,
      TRIM(v.numero_motor)         AS numero_motor,
      TRIM(v.jalisco_propietario)  AS jalisco_propietario
    FROM vehicles v
    WHERE v.id        = ${vehicleId}::uuid
      AND v.tenant_id = ${session.tenantId}
      AND v.status   != 'deleted'
    LIMIT 1
  `.catch(() => []);

  if (!rows.length)
    return new NextResponse('Vehículo no encontrado', { status: 404 });

  const v = rows[0];

  if (!v.vin || !v.numero_motor || !v.jalisco_propietario) {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Datos incompletos</title>
    <style>body{font-family:sans-serif;padding:40px;max-width:480px;margin:auto}
    h2{color:#ef4444}.btn{display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;margin-top:16px}</style>
    </head><body>
    <h2>⚠️ Datos incompletos del vehículo</h2>
    <p>Para consultar el portal Jalisco necesitas completar en <strong>Vehículos</strong>:</p>
    <ul>
      ${!v.vin              ? '<li>VIN / Número de serie</li>' : ''}
      ${!v.numero_motor     ? '<li>Número de motor</li>' : ''}
      ${!v.jalisco_propietario ? '<li>Nombre del propietario (como aparece en tarjeta de circulación)</li>' : ''}
    </ul>
    <a class="btn" href="/vehiculos">Ir a Vehículos →</a>
    </body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const placa       = String(v.placa    ?? '').trim();
  const numeroSerie = String(v.vin      ?? '').trim().slice(-5);
  const nombre      = String(v.jalisco_propietario).trim();
  const motor       = String(v.numero_motor).trim();

  const escape = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Consulta Jalisco — ${escape(placa)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,.1);
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .logo { font-size: 40px; margin-bottom: 8px; }
    h2 { margin: 0 0 4px; color: #1e293b; font-size: 20px; }
    p  { margin: 0 0 24px; color: #64748b; font-size: 14px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 6px 14px;
      font-family: monospace;
      font-weight: 700;
      font-size: 18px;
      color: #1e293b;
      margin-bottom: 24px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { color: #6366f1; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🚗</div>
    <h2>Consultando infracciones</h2>
    <p>Portal de Adeudos Vehiculares — Estado de Jalisco</p>
    <div class="badge">🔑 ${escape(placa)}</div>
    <div class="spinner"></div>
    <p class="status">Redirigiendo al portal Jalisco…</p>
  </div>

  <!-- Formulario invisible que se auto-envía -->
  <form
    id="jal"
    method="POST"
    action="https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos"
    target="_self"
  >
    <input type="hidden" name="placa"             value="${escape(placa)}">
    <input type="hidden" name="numeroSerie"        value="${escape(numeroSerie)}">
    <input type="hidden" name="nombrePropietario"  value="${escape(nombre)}">
    <input type="hidden" name="numeroMotor"        value="${escape(motor)}">
  </form>

  <script>
    // Auto-submit en cuanto carga la página
    window.addEventListener('load', function () {
      setTimeout(function () {
        document.getElementById('jal').submit();
      }, 800);
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
