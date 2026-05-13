-- =============================================================================
-- Gestiona tu Flotilla — Row Level Security (RLS)
-- Migración 002: Políticas de aislamiento por tenant
-- =============================================================================
-- IMPORTANTE: Aplicar DESPUÉS de 001_initial_schema.sql
-- =============================================================================

-- ─── Habilitar RLS en todas las tablas ────────────────────────────────────────
ALTER TABLE tenants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_parts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions  ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TENANTS
-- =============================================================================

-- Super admin ve todos los tenants; usuarios ven solo el suyo
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR id = get_user_tenant_id()
  );

-- Solo super_admin puede crear/modificar tenants
CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (get_user_role() = 'super_admin');

-- =============================================================================
-- USERS
-- =============================================================================

-- Ver usuarios del mismo tenant (o todos si es super_admin)
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
    OR id = auth.uid()  -- siempre puede verse a sí mismo
  );

-- Admin puede crear usuarios en su tenant
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general', 'administrador')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- Admin puede modificar usuarios de su tenant; usuarios pueden editarse a sí mismos
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (get_user_role() IN ('admin_general', 'administrador') AND tenant_id = get_user_tenant_id())
    OR id = auth.uid()
  );

-- =============================================================================
-- VEHICLES
-- =============================================================================

CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "vehicles_insert" ON vehicles
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "vehicles_update" ON vehicles
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','mecanico')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- Solo admin puede eliminar vehículos
CREATE POLICY "vehicles_delete" ON vehicles
  FOR DELETE USING (
    get_user_role() = 'super_admin'
    OR (get_user_role() IN ('admin_general') AND tenant_id = get_user_tenant_id())
  );

-- =============================================================================
-- DRIVERS
-- =============================================================================

CREATE POLICY "drivers_select" ON drivers
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "drivers_insert" ON drivers
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "drivers_update" ON drivers
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','supervisor')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- WEEKLY_ACCOUNTS
-- =============================================================================

-- Choferes solo ven sus propias cuentas
CREATE POLICY "weekly_accounts_select" ON weekly_accounts
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "weekly_accounts_insert" ON weekly_accounts
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','tesoreria','operaciones')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "weekly_accounts_update" ON weekly_accounts
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','tesoreria')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- MAINTENANCE_ORDERS
-- =============================================================================

CREATE POLICY "maintenance_select" ON maintenance_orders
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "maintenance_insert" ON maintenance_orders
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','mecanico')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "maintenance_update" ON maintenance_orders
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','mecanico')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- MAINTENANCE_PARTS
-- =============================================================================

-- Las partes heredan permisos de su orden
CREATE POLICY "maintenance_parts_select" ON maintenance_parts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maintenance_orders o
      WHERE o.id = maintenance_parts.order_id
        AND (get_user_role() = 'super_admin' OR o.tenant_id = get_user_tenant_id())
    )
  );

CREATE POLICY "maintenance_parts_insert" ON maintenance_parts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_orders o
      WHERE o.id = maintenance_parts.order_id
        AND (get_user_role() = 'super_admin' OR o.tenant_id = get_user_tenant_id())
    )
    AND get_user_role() IN ('super_admin','admin_general','administrador','operaciones','mecanico')
  );

CREATE POLICY "maintenance_parts_delete" ON maintenance_parts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM maintenance_orders o
      WHERE o.id = maintenance_parts.order_id
        AND (get_user_role() = 'super_admin' OR o.tenant_id = get_user_tenant_id())
    )
    AND get_user_role() IN ('super_admin','admin_general','administrador','mecanico')
  );

-- =============================================================================
-- ATTACHMENTS
-- =============================================================================

CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (
    get_user_role() = 'super_admin'
    OR (
      tenant_id = get_user_tenant_id()
      AND (uploaded_by = auth.uid() OR get_user_role() IN ('admin_general','administrador'))
    )
  );

-- =============================================================================
-- INCIDENTS
-- =============================================================================

CREATE POLICY "incidents_select" ON incidents
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "incidents_insert" ON incidents
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','supervisor')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "incidents_update" ON incidents
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones','supervisor')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- CANDIDATES
-- =============================================================================

CREATE POLICY "candidates_select" ON candidates
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "candidates_insert" ON candidates
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "candidates_update" ON candidates
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','operaciones')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- PARTNERS
-- =============================================================================

CREATE POLICY "partners_select" ON partners
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "partners_insert" ON partners
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "partners_update" ON partners
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- TREASURY_TRANSACTIONS
-- =============================================================================

CREATE POLICY "treasury_select" ON treasury_transactions
  FOR SELECT USING (
    get_user_role() = 'super_admin'
    OR tenant_id = get_user_tenant_id()
  );

CREATE POLICY "treasury_insert" ON treasury_transactions
  FOR INSERT WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','tesoreria')
      AND tenant_id = get_user_tenant_id()
    )
  );

CREATE POLICY "treasury_update" ON treasury_transactions
  FOR UPDATE USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin_general','administrador','tesoreria')
      AND tenant_id = get_user_tenant_id()
    )
  );

-- =============================================================================
-- STORAGE POLICIES (Supabase Storage)
-- =============================================================================
-- Ejecutar esto en Supabase Dashboard → Storage → Policies
-- O con la CLI: supabase storage policies

-- Crear bucket si no existe
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- Política: usuarios autenticados del mismo tenant pueden subir archivos
-- CREATE POLICY "tenant_upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     auth.role() = 'authenticated'
--     AND (storage.foldername(name))[1] = get_user_tenant_id()::text
--   );

-- Política: solo pueden ver archivos de su tenant
-- CREATE POLICY "tenant_select_storage" ON storage.objects
--   FOR SELECT USING (
--     auth.role() = 'authenticated'
--     AND (storage.foldername(name))[1] = get_user_tenant_id()::text
--   );
