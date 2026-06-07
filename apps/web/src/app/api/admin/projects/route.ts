import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Registro central de proyectos JP — persiste en tabla `jp_projects` en GTF DB.
 * GET  /api/admin/projects        → lista todos
 * POST /api/admin/projects        → crea o actualiza un proyecto (upsert por id)
 * DELETE /api/admin/projects?id=  → elimina del registro
 */

const SECRET = process.env.ADMIN_SECRET || 'gtf-admin-secret';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS jp_projects (
      id          TEXT PRIMARY KEY,
      nombre      TEXT NOT NULL,
      descripcion TEXT,
      url         TEXT,
      categoria   TEXT DEFAULT 'saas',
      estado      TEXT DEFAULT 'produccion',
      mrr         INTEGER DEFAULT 0,
      clientes    INTEGER DEFAULT 0,
      lanzamiento TEXT,
      api_stats_url TEXT,
      notas       TEXT,
      tags        TEXT[],
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `.catch(() => {});
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const rows = await sql`SELECT * FROM jp_projects ORDER BY mrr DESC, nombre ASC`.catch(() => []);

  // Si la tabla está vacía, sembrar con el catálogo inicial
  if (rows.length === 0) {
    await seedProjects();
    const seeded = await sql`SELECT * FROM jp_projects ORDER BY mrr DESC, nombre ASC`.catch(() => []);
    return NextResponse.json(seeded);
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureTable();

  const body = await req.json() as {
    id: string; nombre: string; descripcion?: string; url?: string;
    categoria?: string; estado?: string; mrr?: number; clientes?: number;
    lanzamiento?: string; api_stats_url?: string; notas?: string; tags?: string[];
  };

  const row = await sql`
    INSERT INTO jp_projects (id, nombre, descripcion, url, categoria, estado, mrr, clientes, lanzamiento, api_stats_url, notas, tags, updated_at)
    VALUES (
      ${body.id}, ${body.nombre}, ${body.descripcion ?? null}, ${body.url ?? null},
      ${body.categoria ?? 'saas'}, ${body.estado ?? 'produccion'},
      ${body.mrr ?? 0}, ${body.clientes ?? 0},
      ${body.lanzamiento ?? null}, ${body.api_stats_url ?? null},
      ${body.notas ?? null}, ${body.tags ?? null}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      nombre      = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      url         = EXCLUDED.url,
      categoria   = EXCLUDED.categoria,
      estado      = EXCLUDED.estado,
      mrr         = EXCLUDED.mrr,
      clientes    = EXCLUDED.clientes,
      lanzamiento = EXCLUDED.lanzamiento,
      api_stats_url = EXCLUDED.api_stats_url,
      notas       = EXCLUDED.notas,
      tags        = EXCLUDED.tags,
      updated_at  = NOW()
    RETURNING *
  `;

  return NextResponse.json(row[0], { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (secret !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  await sql`DELETE FROM jp_projects WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

// ── Datos iniciales ───────────────────────────────────────────────────────────

async function seedProjects() {
  const PROJECTS = [
    {
      id: 'gtf',
      nombre: 'Gestiona tu Flotilla',
      descripcion: 'SaaS multi-tenant para flotillas vehiculares Didi/Uber/InDriver. GPS, cuentas semanales, seguros, infracciones, contabilidad RESICO.',
      url: 'https://gestiona-tu-flotilla.vercel.app',
      categoria: 'saas',
      estado: 'produccion',
      mrr: 2999,
      clientes: 7,
      lanzamiento: '2026-03',
      api_stats_url: 'https://gestiona-tu-flotilla.vercel.app/api/admin/super-stats',
      notas: '7 tenants. 1 pagando ($2,999). 6 en trial vencido. Competidor: misflotillas.com',
      tags: ['flotillas', 'gps', 'saas', 'mexico'],
    },
    {
      id: 'cierra-crm',
      nombre: 'Cierra CRM',
      descripcion: 'CRM SaaS para equipos comerciales en México. Pipeline visual, automatizaciones, cotizaciones, WhatsApp nativo.',
      url: 'https://cierra-crm.vercel.app',
      categoria: 'saas',
      estado: 'produccion',
      mrr: 0,
      clientes: 1,
      lanzamiento: '2026-04',
      api_stats_url: 'https://avisa-fierrojuanpablorenovado-7774s-projects.vercel.app/api/admin/super-stats',
      notas: '1 tenant demo. Tagline: "El CRM que cierra contigo". Demo: demo@cierracrm.com / demo1234',
      tags: ['crm', 'ventas', 'saas', 'latam'],
    },
    {
      id: 'avisa',
      nombre: 'AVÍSA',
      descripcion: 'SaaS de cumplimiento PLD/UIF para Actividades Vulnerables en México. Expedientes, avisos UIF, screening listas negras OFAC/ONU.',
      url: 'https://avisa-fierrojuanpablorenovado-7774s-projects.vercel.app',
      categoria: 'saas',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Cumplimiento SAT/UIF. Actividades Vulnerables mexicanas. Vertical: legal/compliance.',
      tags: ['pld', 'sat', 'uif', 'compliance', 'saas'],
    },
    {
      id: 'kore-saas',
      nombre: 'Kore SaaS',
      descripcion: 'SaaS de arrendamiento vehicular y financiero. CFDI 4.0 automático, contabilidad NIF integrada, PLD/FT, cobranza automática.',
      url: 'https://cloud-terralta-portal.vercel.app',
      categoria: 'saas',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Arrendamiento puro, financiero e híbrido. Tabla de amortización automática.',
      tags: ['arrendamiento', 'cfdi', 'contabilidad', 'saas'],
    },
    {
      id: 'terralta',
      nombre: 'Terralta',
      descripcion: 'Portal cloud para Terralta — mapas, proyectos de terrenos, inmobiliaria.',
      url: 'https://cloud-terralta-portal.vercel.app',
      categoria: 'landing',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-06',
      notas: 'Landing/portal de Terralta. Mapa interactivo de lotes.',
      tags: ['inmobiliaria', 'terrenos', 'portal'],
    },
    {
      id: 'vista3d',
      nombre: 'Vista3D',
      descripcion: 'SaaS de 3D Gaussian Splatting con visor web. Fase 1 live. Fases 2-5 pendientes (auth, upload, billing, pipeline GPU).',
      url: 'https://vista3d-beige.vercel.app',
      categoria: 'saas',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Fase 1 (landing+demo) lista. Pendiente: auth, upload, billing, pipeline GPU.',
      tags: ['3d', 'gaussian-splatting', 'saas', 'tech'],
    },
    {
      id: 'prestamo-listo',
      nombre: 'Préstamo Listo',
      descripcion: 'Plataforma de préstamos PFAE de JP. $100k, tasa 4% mensual. Con cumplimiento PLD/UIF.',
      url: 'https://prestamo-listo-app.vercel.app',
      categoria: 'herramienta',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Ingresos vía intereses (no MRR). Pendiente: altas SAT y UIF.',
      tags: ['prestamos', 'pfae', 'finanzas'],
    },
    {
      id: 'mundial-bot',
      nombre: 'Mundial Bot',
      descripcion: 'Bot autónomo de apuestas para Mundial FIFA 2026. 104 partidos. GitHub Actions + OpenAI + Altenar. Bankroll $1k MXN.',
      url: 'https://mundial-bot-dashboard.vercel.app',
      categoria: 'bot',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-06',
      notas: 'Cron diario 8AM CDT. 96 picks O/U goles. Modelo bayesiano actualización día a día.',
      tags: ['apuestas', 'bot', 'mundial', 'ia'],
    },
    {
      id: 'alphapicks',
      nombre: 'AlphaPicks',
      descripcion: 'Plataforma de picks de apuestas deportivas con IA.',
      url: 'https://alphapicks.vercel.app',
      categoria: 'saas',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Picks IA para apuestas deportivas.',
      tags: ['apuestas', 'picks', 'ia'],
    },
    {
      id: 'academia-quantum',
      nombre: 'Academia Quantum',
      descripcion: 'Academia online de neurociencia y desarrollo humano.',
      url: 'https://academia-quantum-neurociencia.vercel.app',
      categoria: 'academia',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Clases de neurociencia / NFC. Contenido de cursos.',
      tags: ['academia', 'neurociencia', 'educacion'],
    },
    {
      id: 'cierra-leads',
      nombre: 'Cierra Leads',
      descripcion: 'SaaS de prospección B2B con IA. Scraping inteligente + GPT-4 + email/WhatsApp automático.',
      url: 'https://cierra-leads.vercel.app',
      categoria: 'saas',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: '"Los leads que cierran solos." Scraping + personalización IA.',
      tags: ['leads', 'b2b', 'ia', 'saas'],
    },
    {
      id: 'jupafi',
      nombre: 'JuPaFi Consultores',
      descripcion: 'Sitio agencia one-page con portfolio de 14 proyectos. Next.js 14.',
      url: 'https://jupaficonsultores.com',
      categoria: 'landing',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Landing corporativa. 14 proyectos en portfolio.',
      tags: ['agencia', 'consultoria', 'landing'],
    },
    {
      id: 'vantor',
      nombre: 'Vantor',
      descripcion: 'SaaS de sales tracking. 7 módulos: leads, pipeline, reportes, comisiones.',
      url: 'https://vantor-saas.vercel.app',
      categoria: 'saas',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-04',
      notas: 'Next.js 14 + Tailwind + Recharts. Puerto 3003.',
      tags: ['ventas', 'saas', 'tracking'],
    },
    {
      id: 'trama',
      nombre: 'Trama',
      descripcion: 'Plataforma SaaS conversacional multi-tenant para LATAM. WhatsApp nativo (Baileys). Ex-Wapix.',
      url: 'https://web-rho-five-91.vercel.app',
      categoria: 'saas',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-04',
      notas: 'Stack: Express+Baileys+Postgres+Next.js 14. 6 fases. Paleta violeta+naranja.',
      tags: ['whatsapp', 'saas', 'conversacional', 'latam'],
    },
    {
      id: 'entrevista-virtual',
      nombre: 'Entrevista Virtual AV',
      descripcion: 'Entrevista de trabajo con IA por voz para Al Volante GDL. ElevenLabs + Marianne-IA.',
      url: 'https://entrevista-virtual.vercel.app',
      categoria: 'herramienta',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-04',
      notas: 'Voz española: eleven_multilingual_v2. Fondo: portada_facebook.png.',
      tags: ['reclutamiento', 'ia', 'voz', 'al-volante'],
    },
    {
      id: 'inmobiliaria-lp',
      nombre: 'Inmobiliaria LP',
      descripcion: 'Buscador inmobiliario con IA para LP Inmobiliaria. inmobiliarialp.com',
      url: 'https://inmobiliarialp.com',
      categoria: 'landing',
      estado: 'produccion',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-04',
      notas: 'Captación, marketing, contratos, finanzas, app web+móvil.',
      tags: ['inmobiliaria', 'buscador', 'ia'],
    },
    {
      id: 'mi-mapa-numerico',
      nombre: 'Mi Mapa Numérico',
      descripcion: 'App de numerología y tarot. Cálculo de números de Alma, Personalidad, Misión.',
      url: 'https://mi-mapa-numerico.vercel.app',
      categoria: 'herramienta',
      estado: 'desarrollo',
      mrr: 0,
      clientes: 0,
      lanzamiento: '2026-05',
      notas: 'Data de clases 2-7 completas. App en tarot-numerologia.html.',
      tags: ['tarot', 'numerologia', 'ia'],
    },
  ];

  for (const p of PROJECTS) {
    await sql`
      INSERT INTO jp_projects (id, nombre, descripcion, url, categoria, estado, mrr, clientes, lanzamiento, api_stats_url, notas, tags)
      VALUES (
        ${p.id}, ${p.nombre}, ${p.descripcion}, ${p.url},
        ${p.categoria}, ${p.estado}, ${p.mrr}, ${p.clientes},
        ${p.lanzamiento}, ${(p as { api_stats_url?: string }).api_stats_url ?? null},
        ${p.notas}, ${p.tags}
      )
      ON CONFLICT (id) DO NOTHING
    `.catch(() => {});
  }
}
