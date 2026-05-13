import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const stage  = searchParams.get('stage')  || '';
    const search = searchParams.get('search') || '';

    const rows = await sql`
      SELECT
        c.id,
        c.first_name || ' ' || c.last_name AS name,
        c.first_name AS "firstName",
        c.last_name  AS "lastName",
        c.phone, c.email,
        c.platform, c.kanban_stage AS stage,
        c.score, c.source,
        c.interview_date AS "interviewDate",
        c.notes, c.created_at AS "createdAt"
      FROM candidates c
      WHERE c.tenant_id = ${session.tenantId}
        ${stage  ? sql`AND c.kanban_stage = ${stage}` : sql``}
        ${search ? sql`AND (c.first_name ILIKE ${'%'+search+'%'} OR c.last_name ILIKE ${'%'+search+'%'} OR c.phone ILIKE ${'%'+search+'%'})` : sql``}
      ORDER BY c.created_at DESC
    `;

    const summary = {
      total:      rows.length,
      aplicacion: rows.filter(r => r.stage === 'aplicacion').length,
      entrevista: rows.filter(r => r.stage === 'entrevista').length,
      documentos: rows.filter(r => r.stage === 'documentos').length,
      contratado: rows.filter(r => r.stage === 'contratado').length,
    };

    return NextResponse.json({ data: rows, summary });
  } catch (err) {
    console.error('[candidates GET]', err);
    return NextResponse.json({ message: 'Error al obtener candidatos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session?.tenantId) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { firstName, lastName, phone, email, platform, source, notes } = body;
    if (!firstName || !lastName)
      return NextResponse.json({ message: 'Nombre y apellido son requeridos' }, { status: 400 });

    const result = await sql`
      INSERT INTO candidates (tenant_id, first_name, last_name, phone, email, platform, source, notes, created_by)
      VALUES (${session.tenantId}, ${firstName}, ${lastName}, ${phone||null}, ${email||null},
              ${Array.isArray(platform) ? platform : []}, ${source||null}, ${notes||null}, ${session.id})
      RETURNING *
    `;
    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (err) {
    console.error('[candidates POST]', err);
    return NextResponse.json({ message: 'Error al crear candidato' }, { status: 500 });
  }
}
