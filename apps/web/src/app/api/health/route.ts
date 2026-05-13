import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Endpoint ligero para pre-calentar la conexión a Neon
export async function GET() {
  try {
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
