# Supabase — Gestiona tu Flotilla

## Setup producción en 10 pasos

### 1. Crear proyecto Supabase
1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → nombre: `gestiona-tu-flotilla` → elige región (us-east-1 o us-west-1)
3. Guarda la **Database Password** en un lugar seguro

### 2. Obtener credenciales
- **Settings → API**
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon/public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (solo servidor)

### 3. Aplicar schema
En **SQL Editor** del dashboard, pega y ejecuta en orden:
1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`

### 4. Configurar Storage
- **Storage → New Bucket**
  - Name: `attachments`
  - Public: **No** (privado, acceso via RLS)

### 5. Crear usuarios iniciales
En **Authentication → Users → Invite user**:
- `admingeneral@tuempresa.mx` → después actualizar rol en tabla `users`

O usar el script de seed para desarrollo:
```bash
npx supabase db seed --db-url postgresql://...
```

### 6. Configurar variables de entorno

Copia `apps/web/.env.local.example` como `apps/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=attachments
```

### 7. Instalar SDK de Supabase
```bash
cd apps/web
npm install @supabase/supabase-js @supabase/ssr
```

### 8. Actualizar middleware para Supabase Auth
Ver `src/middleware.ts` — reemplazar validación de cookie mock con sesión Supabase.

### 9. Deploy a Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde la raíz del proyecto
vercel

# Configurar variables de entorno en Vercel Dashboard
# Settings → Environment Variables
```

### 10. Configurar dominio personalizado
- Vercel Dashboard → Settings → Domains
- Agregar `app.gestionatuflotilla.mx` o tu dominio

---

## Arquitectura de datos

```
tenants (empresas SaaS)
  └── users (con roles RBAC)
  └── vehicles (flotilla)
       └── maintenance_orders
            └── maintenance_parts
            └── attachments
  └── drivers (choferes)
       └── weekly_accounts
       └── incidents
  └── candidates (reclutamiento Kanban)
  └── partners (socios/inversores)
  └── treasury_transactions
```

## Modo Demo vs Producción

| Característica | Demo (sin env vars) | Producción (con Supabase) |
|---|---|---|
| Datos | Mock en memoria | PostgreSQL real |
| Auth | Cookie base64 | Supabase Auth (JWT) |
| Archivos | Vista previa local | Supabase Storage |
| Multi-tenant | Simulado | RLS real |
| Deploy | Vercel gratis | Vercel + Supabase |
