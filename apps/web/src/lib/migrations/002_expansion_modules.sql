-- Migration 002: Expansion Modules
-- Gestiona tu Flotilla SaaS
-- Fecha: 2026-06-05

-- platform_imports
CREATE TABLE IF NOT EXISTS platform_imports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  platform VARCHAR(50) NOT NULL,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  driver_id uuid,
  driver_name VARCHAR(200),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  trips_count INT DEFAULT 0,
  import_date TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(tenant_id, platform, period_month, period_year, driver_name)
);

-- cfdi_records
CREATE TABLE IF NOT EXISTS cfdi_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'emitida',
  rfc_emisor VARCHAR(20),
  rfc_receptor VARCHAR(20),
  razon_social_emisor TEXT,
  razon_social_receptor TEXT,
  folio_fiscal VARCHAR(100),
  serie VARCHAR(10),
  folio VARCHAR(20),
  fecha TIMESTAMP,
  subtotal NUMERIC(14,2),
  descuento NUMERIC(14,2) DEFAULT 0,
  iva NUMERIC(14,2),
  total NUMERIC(14,2),
  moneda VARCHAR(5) DEFAULT 'MXN',
  uso_cfdi VARCHAR(10),
  metodo_pago VARCHAR(5),
  forma_pago VARCHAR(5),
  concepto TEXT,
  status VARCHAR(20) DEFAULT 'vigente',
  xml_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_platform_imports_tenant ON platform_imports(tenant_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_cfdi_records_tenant ON cfdi_records(tenant_id, fecha);

-- Columnas opcionales en recruitment_candidates (si existe)
DO $$
BEGIN
  BEGIN
    ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_score INT;
    ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS platform_experience TEXT[];
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
