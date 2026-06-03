import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { sendEmail, emailBienvenida } from '@/lib/email';

const PLAN_MAX_VEHICLES: Record<string, number> = {
  basic:       15,
  pro:         50,
  enterprise: 999,
};

// Mapa de alias por si llega el nombre en español
const PLAN_ALIAS: Record<string, string> = {
  basico:      'basic',
  profesional: 'pro',
  basic:       'basic',
  pro:         'pro',
  enterprise:  'enterprise',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, empresa, email, telefono, password, plan } = body;

    if (!nombre || !empresa || !email || !password) {
      return NextResponse.json(
        { message: 'Nombre, empresa, correo y contraseña son requeridos' },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Verificar que el email no exista
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Ya existe una cuenta con ese correo electrónico' },
        { status: 409 },
      );
    }

    const planRaw     = plan || 'pro';
    const planKey     = PLAN_ALIAS[planRaw] ?? 'pro';
    const maxVehicles = PLAN_MAX_VEHICLES[planKey] ?? 50;

    // Crear slug único para el tenant
    const slugBase = empresa
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 40);

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug         = `${slugBase}-${randomSuffix}`;

    // Crear tenant (trial 14 días automático)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    const trialEndStr = trialEnd.toISOString().slice(0, 10);

    const tenantResult = await sql`
      INSERT INTO tenants (name, slug, plan, max_vehicles, trial_ends_at)
      VALUES (${empresa.trim()}, ${slug}, ${planKey}, ${maxVehicles}, ${trialEndStr}::date)
      ON CONFLICT DO NOTHING
      RETURNING id, name, slug, plan, trial_ends_at
    `.catch(async () => {
      // Si trial_ends_at no existe en la tabla, insertar sin él
      return sql`
        INSERT INTO tenants (name, slug, plan, max_vehicles)
        VALUES (${empresa.trim()}, ${slug}, ${planKey}, ${maxVehicles})
        RETURNING id, name, slug, plan
      `;
    });
    const tenant = tenantResult[0];

    // Crear usuario admin_general
    const [firstName, ...rest] = nombre.trim().split(' ');
    const lastName   = rest.join(' ') || '-';
    const avatar     = (firstName[0] + lastName[0]).toUpperCase();
    const hash       = await bcrypt.hash(password, 10);

    const userResult = await sql`
      INSERT INTO users (
        tenant_id, first_name, last_name, email,
        password_hash, role, avatar, phone, active
      ) VALUES (
        ${tenant.id},
        ${firstName},
        ${lastName},
        ${email.toLowerCase().trim()},
        ${hash},
        'admin_general',
        ${avatar},
        ${telefono || null},
        true
      )
      RETURNING id, email, role, first_name AS "firstName", last_name AS "lastName"
    `;

    // Email de bienvenida (fire & forget)
    sendEmail({
      to:      email.toLowerCase().trim(),
      subject: '🚗 ¡Bienvenido a Gestiona tu Flotilla! Tu prueba de 14 días está activa',
      html:    emailBienvenida({
        nombre:      firstName,
        empresa:     empresa.trim(),
        email:       email.toLowerCase().trim(),
        trialEndsAt: trialEndStr,
      }),
    }).catch(() => {});

    return NextResponse.json({
      message: 'Cuenta creada correctamente',
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      user:   userResult[0],
    }, { status: 201 });

  } catch (err) {
    console.error('[registro POST]', err);
    return NextResponse.json({ message: 'Error al crear la cuenta' }, { status: 500 });
  }
}
