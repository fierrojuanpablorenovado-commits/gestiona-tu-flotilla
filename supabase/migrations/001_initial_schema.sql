-- =============================================================================
-- Gestiona tu Flotilla — Schema inicial
-- Migración 001: Tablas base
-- =============================================================================
-- Para aplicar: npx supabase db push (con CLI de Supabase)
-- O bien: pega este SQL en el SQL Editor del dashboard de Supabase
-- =============================================================================

-- ─── Extensiones ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TENANTS — Empresas cliente del SaaS
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  plan        TEXT    NOT NULL DEFAULT 'basic'
                      CHECK (plan IN ('basic', 'pro', 'enterprise')),
  max_vehicles INT   DEFAULT 10,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Empresas que usan la plataforma SaaS';

-- =============================================================================
-- USERS — Perfiles de usuario (extiende auth.users de Supabase)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID    REFERENCES tenants(id) ON DELETE CASCADE,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  role        TEXT    NOT NULL
                      CHECK (role IN (
                        'super_admin','admin_general','administrador',
                        'tesoreria','operaciones','mecanico',
                        'supervisor','socio','chofer'
                      )),
  avatar      TEXT,   -- Iniciales o URL de foto
  phone       TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Perfiles de usuario con rol y tenant';
COMMENT ON COLUMN users.role IS 'super_admin = plataforma; chofer = solo app móvil';

-- =============================================================================
-- VEHICLES — Vehículos de la flotilla
-- =============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  eco         TEXT    NOT NULL,   -- Número económico, e.g. ECO-001
  brand       TEXT    NOT NULL,
  model       TEXT    NOT NULL,
  year        INT     NOT NULL CHECK (year BETWEEN 2000 AND 2030),
  color       TEXT,
  plates      TEXT,
  vin         TEXT,
  km_actual   INT     DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','workshop','inactive','sold')),
  platform    TEXT[], -- Plataformas: ['Uber', 'Didi', 'InDriver']
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vehicles IS 'Vehículos de la flotilla por tenant';

-- =============================================================================
-- DRIVERS — Choferes
-- =============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id               UUID    REFERENCES users(id),  -- Si tiene acceso a la app
  vehicle_id            UUID    REFERENCES vehicles(id),  -- Vehículo asignado
  first_name            TEXT    NOT NULL,
  last_name             TEXT    NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  licencia              TEXT,
  licencia_tipo         TEXT,
  licencia_vencimiento  DATE,
  curp                  TEXT,
  nss                   TEXT,
  address               TEXT,
  hire_date             DATE,
  status                TEXT    NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','inactive','suspended')),
  rating                DECIMAL(3,2) DEFAULT 5.00 CHECK (rating BETWEEN 0 AND 5),
  score                 INT     DEFAULT 100 CHECK (score BETWEEN 0 AND 100),
  platforms             TEXT[], -- ['Uber','Didi']
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drivers IS 'Choferes con datos personales, documentos y estado';

-- =============================================================================
-- WEEKLY_ACCOUNTS — Cuentas semanales por chofer/vehículo
-- =============================================================================
CREATE TABLE IF NOT EXISTS weekly_accounts (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id     UUID    NOT NULL REFERENCES drivers(id),
  vehicle_id    UUID    REFERENCES vehicles(id),
  week_start    DATE    NOT NULL,
  week_end      DATE    NOT NULL,
  uber_income   DECIMAL(10,2) NOT NULL DEFAULT 0,
  didi_income   DECIMAL(10,2) NOT NULL DEFAULT 0,
  indriver_income DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_income  DECIMAL(10,2) NOT NULL DEFAULT 0,
  rent          DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Renta semanal del vehículo
  gas           DECIMAL(10,2) NOT NULL DEFAULT 0,
  deductions    DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Descuentos varios
  trips_count   INT     DEFAULT 0,
  hours_worked  DECIMAL(5,1)  DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','partial','disputed')),
  notes         TEXT,
  created_by    UUID    REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Computed columns (PostgreSQL 12+)
  CONSTRAINT week_order CHECK (week_end >= week_start)
);

-- Vista computada para totales
CREATE OR REPLACE VIEW weekly_accounts_totals AS
SELECT
  *,
  (uber_income + didi_income + indriver_income + other_income) AS total_income,
  (uber_income + didi_income + indriver_income + other_income - rent - gas - deductions) AS balance
FROM weekly_accounts;

COMMENT ON TABLE weekly_accounts IS 'Registro semanal de ingresos y gastos por chofer';

-- =============================================================================
-- MAINTENANCE_ORDERS — Órdenes de trabajo (OTs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS maintenance_orders (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id      UUID    NOT NULL REFERENCES vehicles(id),
  orden           TEXT    NOT NULL,  -- e.g. OT-2026-0087
  tipo            TEXT    NOT NULL
                          CHECK (tipo IN ('Preventivo','Correctivo','Urgente')),
  descripcion     TEXT    NOT NULL,
  taller          TEXT,
  fecha_ingreso   DATE    NOT NULL,
  fecha_salida    DATE,
  costo_estimado  DECIMAL(10,2),
  costo_real      DECIMAL(10,2),
  status          TEXT    NOT NULL DEFAULT 'Programado'
                          CHECK (status IN (
                            'Programado','En diagnostico','En reparacion',
                            'Esperando refacciones','Completado','Cancelado'
                          )),
  mechanic_id     UUID    REFERENCES users(id),  -- Mecánico asignado
  condiciones     JSONB,  -- Checklist de inspección: {"frenos_del": true, "llantas": false, ...}
  notas           TEXT,
  created_by      UUID    REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE maintenance_orders IS 'Órdenes de trabajo de mantenimiento';

-- Índice para búsquedas por número de orden
CREATE INDEX IF NOT EXISTS idx_maintenance_orders_orden ON maintenance_orders(orden);
CREATE INDEX IF NOT EXISTS idx_maintenance_orders_vehicle ON maintenance_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_orders_tenant_status ON maintenance_orders(tenant_id, status);

-- =============================================================================
-- MAINTENANCE_PARTS — Refacciones y materiales por OT
-- =============================================================================
CREATE TABLE IF NOT EXISTS maintenance_parts (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID    NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
  nombre      TEXT    NOT NULL,
  cantidad    INT     NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio      DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE maintenance_parts IS 'Refacciones y materiales de una OT';

-- =============================================================================
-- ATTACHMENTS — Archivos adjuntos (fotos, PDFs) para múltiples entidades
-- =============================================================================
CREATE TABLE IF NOT EXISTS attachments (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type     TEXT    NOT NULL
                          CHECK (entity_type IN ('maintenance','driver','incident','candidate')),
  entity_id       UUID    NOT NULL,
  filename        TEXT    NOT NULL,
  original_name   TEXT,
  file_type       TEXT    NOT NULL
                          CHECK (file_type IN ('image','pdf','other')),
  mime_type       TEXT,
  storage_path    TEXT    NOT NULL,  -- Path en Supabase Storage
  storage_url     TEXT,             -- URL pública (si el bucket es público)
  size_bytes      INT,
  uploaded_by     UUID    REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

COMMENT ON TABLE attachments IS 'Archivos adjuntos para mantenimiento, choferes, incidencias';

-- =============================================================================
-- INCIDENTS — Incidencias (accidentes, multas, quejas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id   UUID    REFERENCES drivers(id),
  vehicle_id  UUID    REFERENCES vehicles(id),
  tipo        TEXT    NOT NULL,  -- accidente, multa, queja, robo, etc.
  descripcion TEXT    NOT NULL,
  fecha       DATE    NOT NULL,
  costo       DECIMAL(10,2),
  status      TEXT    NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','investigating','resolved','closed')),
  severity    TEXT    NOT NULL DEFAULT 'low'
                      CHECK (severity IN ('low','medium','high','critical')),
  reported_by UUID    REFERENCES users(id),
  resolved_by UUID    REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE incidents IS 'Incidencias: accidentes, multas, quejas';

-- =============================================================================
-- CANDIDATES — Candidatos a chofer (pipeline de reclutamiento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS candidates (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  phone           TEXT,
  email           TEXT,
  platform        TEXT[], -- Plataformas de interés: ['Uber','Didi']
  kanban_stage    TEXT    NOT NULL DEFAULT 'aplicacion'
                          CHECK (kanban_stage IN (
                            'aplicacion','pre_screening','entrevista',
                            'evaluacion','documentos','oferta',
                            'contratado','rechazado'
                          )),
  score           INT     CHECK (score BETWEEN 0 AND 100),
  source          TEXT,   -- 'referido','redes_sociales','directo','portal'
  referred_by     UUID    REFERENCES drivers(id),
  interview_date  TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID    REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_tenant_stage ON candidates(tenant_id, kanban_stage);

COMMENT ON TABLE candidates IS 'Pipeline Kanban de reclutamiento de choferes';

-- =============================================================================
-- PARTNERS — Socios / Inversionistas
-- =============================================================================
CREATE TABLE IF NOT EXISTS partners (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  email           TEXT,
  phone           TEXT,
  vehicles_count  INT     DEFAULT 0,
  investment      DECIMAL(12,2) DEFAULT 0,
  monthly_income  DECIMAL(12,2) DEFAULT 0,
  roi             DECIMAL(5,2), -- % de retorno
  status          TEXT    DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE partners IS 'Socios e inversionistas de la flotilla';

-- =============================================================================
-- TREASURY_TRANSACTIONS — Movimientos de tesorería
-- =============================================================================
CREATE TABLE IF NOT EXISTS treasury_transactions (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo        TEXT    NOT NULL CHECK (tipo IN ('ingreso','egreso','transferencia')),
  categoria   TEXT    NOT NULL,  -- renta, mantenimiento, seguro, gasolina, etc.
  descripcion TEXT,
  monto       DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  fecha       DATE    NOT NULL,
  reference   TEXT,   -- Número de factura, cheque, etc.
  driver_id   UUID    REFERENCES drivers(id),
  vehicle_id  UUID    REFERENCES vehicles(id),
  status      TEXT    NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('pending','completed','cancelled')),
  created_by  UUID    REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_tenant_fecha ON treasury_transactions(tenant_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_tenant_tipo ON treasury_transactions(tenant_id, tipo);

COMMENT ON TABLE treasury_transactions IS 'Ingresos y egresos de tesorería';

-- =============================================================================
-- FUNCIONES AUXILIARES
-- =============================================================================

-- Obtener tenant_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid();
$$;

-- Obtener rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_orders_updated_at
  BEFORE UPDATE ON maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treasury_updated_at
  BEFORE UPDATE ON treasury_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
