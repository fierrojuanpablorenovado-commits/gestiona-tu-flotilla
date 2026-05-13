-- ─────────────────────────────────────────────────────────────────────────────
-- Migración 003: Tabla fleet_alerts
-- Almacena alertas operativas generadas por el cron diario.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fleet_alerts (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo          TEXT        NOT NULL,
  -- Referencia a la entidad que genera la alerta: 'insurance:123', 'vehicle:456', etc.
  entidad_ref   TEXT        NOT NULL,
  severidad     TEXT        NOT NULL CHECK (severidad IN ('alta', 'media', 'baja')),
  mensaje       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  -- Cuando el admin descarta la alerta (no se re-genera hasta próximo cambio)
  dismissed_at  TIMESTAMPTZ,

  -- Evita duplicados por tenant + tipo + entidad
  CONSTRAINT fleet_alerts_unique UNIQUE (tenant_id, tipo, entidad_ref)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_fleet_alerts_tenant
  ON fleet_alerts (tenant_id, dismissed_at, severidad);

CREATE INDEX IF NOT EXISTS idx_fleet_alerts_created
  ON fleet_alerts (tenant_id, created_at DESC);

-- Comentarios
COMMENT ON TABLE fleet_alerts IS 'Alertas operativas auto-generadas: seguros, mantenimientos, pagos pendientes';
COMMENT ON COLUMN fleet_alerts.entidad_ref IS 'Referencia única: tipo:id, ej: insurance:42, vehicle:7, weekly:15';
COMMENT ON COLUMN fleet_alerts.dismissed_at IS 'NULL = activa, NOT NULL = descartada por el admin';
