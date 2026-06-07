import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { sendEmail, emailBienvenida } from '@/lib/email';

const PLAN_MAX: Record<string, number> = { basic: 10, pro: 30, enterprise: 60 };

/**
 * POST /api/admin/create-tenant
 * Crea un tenant + admin_general desde el panel super-admin.
 * Header: x-admin-secret
 * Body: { empresa, nombre, email, password, plan, telefono, diasTrial? }
 */
export async function POST(req: NextRequest) {
  const secret   = req.headers.get('x-admin-secret');
  const expected = process.env.ADMIN_SECRET || 'gtf-admin-secret';
  if (secret !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { empresa, nombre, email, password, plan = 'basic', telefono, diasTrial = 14 } =
    await req.json() as {
      empresa: string; nombre: string; email: string; password: string;
      plan?: string; telefono?: string; diasTrial?: number;
    };

  if (!empresa || !nombre || !email || !password) {
    return NextResponse.json({ error: 'empresa, nombre, email y password son requeridos' }, { status: 400 });
  }

  // Verificar email único
  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'El email ya existe' }, { status: 409 });
  }

  const slugBase     = empresa.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40);
  const slug         = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
  const trialEnd     = new Date();
  trialEnd.setDate(trialEnd.getDate() + diasTrial);
  const trialEndStr  = trialEnd.toISOString().slice(0, 10);
  const maxVehicles  = PLAN_MAX[plan] ?? 10;

  const tenantRes = await sql`
    INSERT INTO tenants (name, slug, plan, max_vehicles, trial_ends_at)
    VALUES (${empresa.trim()}, ${slug}, ${plan}, ${maxVehicles}, ${trialEndStr}::date)
    RETURNING id, name, slug, plan
  `;
  const tenant = tenantRes[0];

  const [firstName, ...rest] = nombre.trim().split(' ');
  const lastName  = rest.join(' ') || '-';
  const avatar    = ((firstName[0] ?? 'A') + (lastName[0] ?? 'A')).toUpperCase();
  const hash      = await bcrypt.hash(password, 10);

  const userRes = await sql`
    INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role, avatar, phone, active)
    VALUES (${tenant.id}, ${firstName}, ${lastName}, ${email.toLowerCase()}, ${hash}, 'admin_general', ${avatar}, ${telefono || null}, true)
    RETURNING id, email, role
  `;

  // Email de bienvenida
  sendEmail({
    to:      email.toLowerCase(),
    subject: '🚗 ¡Bienvenido a Gestiona tu Flotilla! Tu prueba está activa',
    html:    emailBienvenida({ nombre: firstName, empresa: empresa.trim(), email: email.toLowerCase(), trialEndsAt: trialEndStr }),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    tenant: { id: tenant.id, slug: tenant.slug, plan: tenant.plan },
    user:   userRes[0],
    trialEndsAt: trialEndStr,
  }, { status: 201 });
}
