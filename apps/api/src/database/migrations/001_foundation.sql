-- ============================================================
-- FLEETCORE SaaS - MIGRATION 001: FOUNDATION
-- Multi-tenant base tables, auth, roles, permissions
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- MULTI-TENANT CORE
-- ============================================================

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    logo_url        VARCHAR(500),
    primary_color   VARCHAR(7) DEFAULT '#1E40AF',
    plan            VARCHAR(50) NOT NULL DEFAULT 'free', -- free, starter, professional, enterprise
    max_vehicles    INTEGER NOT NULL DEFAULT 10,
    max_users       INTEGER NOT NULL DEFAULT 5,
    modules_enabled JSONB NOT NULL DEFAULT '["vehicles","drivers","maintenance","treasury"]',
    billing_email   VARCHAR(200),
    billing_phone   VARCHAR(20),
    tax_id          VARCHAR(20),  -- RFC en Mexico
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    country         VARCHAR(5) DEFAULT 'MX',
    timezone        VARCHAR(50) DEFAULT 'America/Mexico_City',
    currency        VARCHAR(3) DEFAULT 'MXN',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    trial_ends_at   TIMESTAMP,
    subscription_id VARCHAR(200),  -- Stripe/payment processor
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    slug        VARCHAR(50) NOT NULL,
    description TEXT,
    is_system   BOOLEAN DEFAULT false,  -- system roles can't be deleted
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module      VARCHAR(50) NOT NULL,   -- vehicles, drivers, maintenance, treasury, etc.
    action      VARCHAR(50) NOT NULL,   -- view, create, edit, delete, approve, export, etc.
    description TEXT,
    UNIQUE(module, action)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(200) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      VARCHAR(500),
    role_id         UUID NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    email_verified  BOOLEAN DEFAULT false,
    last_login_at   TIMESTAMP,
    last_login_ip   VARCHAR(45),
    failed_attempts INTEGER DEFAULT 0,
    locked_until    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(role_id);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    device_info VARCHAR(200),
    ip_address  VARCHAR(45),
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- AUDIT LOG (every important action)
-- ============================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,  -- 'vehicle.created', 'payment.approved', etc.
    entity_type VARCHAR(50),            -- 'vehicle', 'driver', 'payment', etc.
    entity_id   UUID,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    metadata    JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);

-- ============================================================
-- SEED: Default permissions
-- ============================================================

INSERT INTO permissions (module, action, description) VALUES
-- Vehicles
('vehicles', 'view', 'Ver vehiculos'),
('vehicles', 'create', 'Crear vehiculos'),
('vehicles', 'edit', 'Editar vehiculos'),
('vehicles', 'delete', 'Eliminar vehiculos'),
('vehicles', 'export', 'Exportar vehiculos'),
-- Drivers
('drivers', 'view', 'Ver choferes'),
('drivers', 'create', 'Crear choferes'),
('drivers', 'edit', 'Editar choferes'),
('drivers', 'delete', 'Eliminar choferes'),
('drivers', 'export', 'Exportar choferes'),
-- Recruitment
('recruitment', 'view', 'Ver pipeline de reclutamiento'),
('recruitment', 'create', 'Crear leads de reclutamiento'),
('recruitment', 'edit', 'Editar leads de reclutamiento'),
('recruitment', 'approve', 'Aprobar candidatos'),
('recruitment', 'reject', 'Rechazar candidatos'),
-- Maintenance
('maintenance', 'view', 'Ver mantenimientos'),
('maintenance', 'create', 'Crear ordenes de mantenimiento'),
('maintenance', 'edit', 'Editar mantenimientos'),
('maintenance', 'approve', 'Aprobar mantenimientos'),
('maintenance', 'close', 'Cerrar ordenes de mantenimiento'),
-- Treasury
('treasury', 'view', 'Ver tesoreria'),
('treasury', 'create', 'Registrar movimientos'),
('treasury', 'edit', 'Editar movimientos'),
('treasury', 'approve', 'Aprobar pagos'),
('treasury', 'view_sensitive', 'Ver informacion financiera sensible'),
('treasury', 'export', 'Exportar reportes financieros'),
-- Conciliation (Uber/Didi)
('conciliation', 'view', 'Ver conciliaciones'),
('conciliation', 'import', 'Importar datos de plataformas'),
('conciliation', 'approve', 'Aprobar cuentas semanales'),
('conciliation', 'adjust', 'Ajustar cuentas'),
-- Contracts
('contracts', 'view', 'Ver contratos'),
('contracts', 'create', 'Crear contratos'),
('contracts', 'edit', 'Editar contratos'),
('contracts', 'terminate', 'Terminar contratos'),
-- Incidents
('incidents', 'view', 'Ver incidencias'),
('incidents', 'create', 'Crear incidencias'),
('incidents', 'edit', 'Editar incidencias'),
('incidents', 'close', 'Cerrar incidencias'),
-- Partners/Investors
('partners', 'view', 'Ver socios'),
('partners', 'create', 'Crear socios'),
('partners', 'edit', 'Editar socios'),
('partners', 'view_financials', 'Ver finanzas de socios'),
-- Location
('location', 'view_map', 'Ver mapa de flota'),
('location', 'view_history', 'Ver historial de ubicaciones'),
('location', 'manage_geofences', 'Administrar geocercas'),
-- Dashboard
('dashboard', 'view_executive', 'Ver dashboard ejecutivo'),
('dashboard', 'view_operations', 'Ver dashboard operativo'),
('dashboard', 'view_financial', 'Ver dashboard financiero'),
-- Reports
('reports', 'view', 'Ver reportes'),
('reports', 'generate', 'Generar reportes'),
('reports', 'export', 'Exportar reportes'),
-- Settings
('settings', 'view', 'Ver configuracion'),
('settings', 'edit', 'Editar configuracion'),
('settings', 'manage_users', 'Administrar usuarios'),
('settings', 'manage_roles', 'Administrar roles');
