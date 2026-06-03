-- ============================================================
-- 011_rls_tenant_isolation.sql
-- Row Level Security en todas las tablas con datos de tenant
-- de migrations 001-009 que no tenían RLS activado.
-- ============================================================

-- ── FUNCIÓN HELPER ────────────────────────────────────────────────────────────
-- Lee el tenant_id seteado por la app en cada transacción:
--   await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`)
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── HELPERS ──────────────────────────────────────────────────────────────────
-- Macro: habilita RLS y crea las 4 políticas CRUD para una tabla con tenant_id
-- Uso: llamar manualmente para cada tabla (SQL no tiene iteración de DDL).

-- ─────────────────────────────────────────────────────────────────────────────
-- 001_foundation: users, roles, refresh_tokens, audit_logs
-- (tenants y permissions son globales — RLS no aplica)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_users_select ON users;
DROP POLICY IF EXISTS rls_users_insert ON users;
DROP POLICY IF EXISTS rls_users_update ON users;
DROP POLICY IF EXISTS rls_users_delete ON users;
CREATE POLICY rls_users_select ON users FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_users_insert ON users FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_users_update ON users FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_users_delete ON users FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_roles_select ON roles;
DROP POLICY IF EXISTS rls_roles_insert ON roles;
DROP POLICY IF EXISTS rls_roles_update ON roles;
DROP POLICY IF EXISTS rls_roles_delete ON roles;
CREATE POLICY rls_roles_select ON roles FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_roles_insert ON roles FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_roles_update ON roles FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_roles_delete ON roles FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_refresh_tokens_select ON refresh_tokens;
DROP POLICY IF EXISTS rls_refresh_tokens_insert ON refresh_tokens;
DROP POLICY IF EXISTS rls_refresh_tokens_update ON refresh_tokens;
DROP POLICY IF EXISTS rls_refresh_tokens_delete ON refresh_tokens;
CREATE POLICY rls_refresh_tokens_select ON refresh_tokens FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_refresh_tokens_insert ON refresh_tokens FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_refresh_tokens_update ON refresh_tokens FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_refresh_tokens_delete ON refresh_tokens FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_audit_logs_select ON audit_logs;
DROP POLICY IF EXISTS rls_audit_logs_insert ON audit_logs;
CREATE POLICY rls_audit_logs_select ON audit_logs FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 002_vehicles_drivers: partners, vehicles, drivers, vehicle_photos, documents
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_partners_select ON partners; DROP POLICY IF EXISTS rls_partners_insert ON partners;
DROP POLICY IF EXISTS rls_partners_update ON partners; DROP POLICY IF EXISTS rls_partners_delete ON partners;
CREATE POLICY rls_partners_select ON partners FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partners_insert ON partners FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partners_update ON partners FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partners_delete ON partners FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_vehicles_select ON vehicles; DROP POLICY IF EXISTS rls_vehicles_insert ON vehicles;
DROP POLICY IF EXISTS rls_vehicles_update ON vehicles; DROP POLICY IF EXISTS rls_vehicles_delete ON vehicles;
CREATE POLICY rls_vehicles_select ON vehicles FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicles_insert ON vehicles FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicles_update ON vehicles FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicles_delete ON vehicles FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_drivers_select ON drivers; DROP POLICY IF EXISTS rls_drivers_insert ON drivers;
DROP POLICY IF EXISTS rls_drivers_update ON drivers; DROP POLICY IF EXISTS rls_drivers_delete ON drivers;
CREATE POLICY rls_drivers_select ON drivers FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_drivers_insert ON drivers FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_drivers_update ON drivers FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_drivers_delete ON drivers FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_vehicle_photos_select ON vehicle_photos; DROP POLICY IF EXISTS rls_vehicle_photos_insert ON vehicle_photos;
DROP POLICY IF EXISTS rls_vehicle_photos_update ON vehicle_photos; DROP POLICY IF EXISTS rls_vehicle_photos_delete ON vehicle_photos;
CREATE POLICY rls_vehicle_photos_select ON vehicle_photos FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_photos_insert ON vehicle_photos FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_photos_update ON vehicle_photos FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_photos_delete ON vehicle_photos FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_documents_select ON documents; DROP POLICY IF EXISTS rls_documents_insert ON documents;
DROP POLICY IF EXISTS rls_documents_update ON documents; DROP POLICY IF EXISTS rls_documents_delete ON documents;
CREATE POLICY rls_documents_select ON documents FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_documents_insert ON documents FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_documents_update ON documents FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_documents_delete ON documents FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 004_contracts_checkins: contracts, deposit_movements, check_in_outs, check_in_out_photos
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_contracts_select ON contracts; DROP POLICY IF EXISTS rls_contracts_insert ON contracts;
DROP POLICY IF EXISTS rls_contracts_update ON contracts; DROP POLICY IF EXISTS rls_contracts_delete ON contracts;
CREATE POLICY rls_contracts_select ON contracts FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_contracts_insert ON contracts FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_contracts_update ON contracts FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_contracts_delete ON contracts FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE deposit_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_deposit_movements_select ON deposit_movements; DROP POLICY IF EXISTS rls_deposit_movements_insert ON deposit_movements;
DROP POLICY IF EXISTS rls_deposit_movements_update ON deposit_movements; DROP POLICY IF EXISTS rls_deposit_movements_delete ON deposit_movements;
CREATE POLICY rls_deposit_movements_select ON deposit_movements FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_deposit_movements_insert ON deposit_movements FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_deposit_movements_update ON deposit_movements FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_deposit_movements_delete ON deposit_movements FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE check_in_outs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_check_in_outs_select ON check_in_outs; DROP POLICY IF EXISTS rls_check_in_outs_insert ON check_in_outs;
DROP POLICY IF EXISTS rls_check_in_outs_update ON check_in_outs; DROP POLICY IF EXISTS rls_check_in_outs_delete ON check_in_outs;
CREATE POLICY rls_check_in_outs_select ON check_in_outs FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_outs_insert ON check_in_outs FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_outs_update ON check_in_outs FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_outs_delete ON check_in_outs FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE check_in_out_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_check_in_out_photos_select ON check_in_out_photos; DROP POLICY IF EXISTS rls_check_in_out_photos_insert ON check_in_out_photos;
DROP POLICY IF EXISTS rls_check_in_out_photos_update ON check_in_out_photos; DROP POLICY IF EXISTS rls_check_in_out_photos_delete ON check_in_out_photos;
CREATE POLICY rls_check_in_out_photos_select ON check_in_out_photos FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_out_photos_insert ON check_in_out_photos FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_out_photos_update ON check_in_out_photos FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_check_in_out_photos_delete ON check_in_out_photos FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 005_maintenance: workshops, maintenance_orders, maintenance_parts,
--   maintenance_photos, maintenance_schedules, tire_records, fuel_records
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_workshops_select ON workshops; DROP POLICY IF EXISTS rls_workshops_insert ON workshops;
DROP POLICY IF EXISTS rls_workshops_update ON workshops; DROP POLICY IF EXISTS rls_workshops_delete ON workshops;
CREATE POLICY rls_workshops_select ON workshops FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_workshops_insert ON workshops FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_workshops_update ON workshops FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_workshops_delete ON workshops FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE maintenance_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_maintenance_orders_select ON maintenance_orders; DROP POLICY IF EXISTS rls_maintenance_orders_insert ON maintenance_orders;
DROP POLICY IF EXISTS rls_maintenance_orders_update ON maintenance_orders; DROP POLICY IF EXISTS rls_maintenance_orders_delete ON maintenance_orders;
CREATE POLICY rls_maintenance_orders_select ON maintenance_orders FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_orders_insert ON maintenance_orders FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_orders_update ON maintenance_orders FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_orders_delete ON maintenance_orders FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE maintenance_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_maintenance_parts_select ON maintenance_parts; DROP POLICY IF EXISTS rls_maintenance_parts_insert ON maintenance_parts;
DROP POLICY IF EXISTS rls_maintenance_parts_update ON maintenance_parts; DROP POLICY IF EXISTS rls_maintenance_parts_delete ON maintenance_parts;
CREATE POLICY rls_maintenance_parts_select ON maintenance_parts FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_parts_insert ON maintenance_parts FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_parts_update ON maintenance_parts FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_parts_delete ON maintenance_parts FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_maintenance_photos_select ON maintenance_photos; DROP POLICY IF EXISTS rls_maintenance_photos_insert ON maintenance_photos;
DROP POLICY IF EXISTS rls_maintenance_photos_update ON maintenance_photos; DROP POLICY IF EXISTS rls_maintenance_photos_delete ON maintenance_photos;
CREATE POLICY rls_maintenance_photos_select ON maintenance_photos FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_photos_insert ON maintenance_photos FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_photos_update ON maintenance_photos FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_photos_delete ON maintenance_photos FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_maintenance_schedules_select ON maintenance_schedules; DROP POLICY IF EXISTS rls_maintenance_schedules_insert ON maintenance_schedules;
DROP POLICY IF EXISTS rls_maintenance_schedules_update ON maintenance_schedules; DROP POLICY IF EXISTS rls_maintenance_schedules_delete ON maintenance_schedules;
CREATE POLICY rls_maintenance_schedules_select ON maintenance_schedules FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_schedules_insert ON maintenance_schedules FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_schedules_update ON maintenance_schedules FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_maintenance_schedules_delete ON maintenance_schedules FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE tire_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tire_records_select ON tire_records; DROP POLICY IF EXISTS rls_tire_records_insert ON tire_records;
DROP POLICY IF EXISTS rls_tire_records_update ON tire_records; DROP POLICY IF EXISTS rls_tire_records_delete ON tire_records;
CREATE POLICY rls_tire_records_select ON tire_records FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_tire_records_insert ON tire_records FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_tire_records_update ON tire_records FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_tire_records_delete ON tire_records FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_fuel_records_select ON fuel_records; DROP POLICY IF EXISTS rls_fuel_records_insert ON fuel_records;
DROP POLICY IF EXISTS rls_fuel_records_update ON fuel_records; DROP POLICY IF EXISTS rls_fuel_records_delete ON fuel_records;
CREATE POLICY rls_fuel_records_select ON fuel_records FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_fuel_records_insert ON fuel_records FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_fuel_records_update ON fuel_records FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_fuel_records_delete ON fuel_records FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 006_treasury_conciliation: transactions, platform_connections, platform_imports,
--   platform_earnings, weekly_conciliations, partner_distributions
-- (010_platform_conciliation redefine platform_connections con RLS — aquí solo nuevas)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_transactions_select ON transactions; DROP POLICY IF EXISTS rls_transactions_insert ON transactions;
DROP POLICY IF EXISTS rls_transactions_update ON transactions; DROP POLICY IF EXISTS rls_transactions_delete ON transactions;
CREATE POLICY rls_transactions_select ON transactions FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_transactions_insert ON transactions FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_transactions_update ON transactions FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_transactions_delete ON transactions FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE platform_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_platform_earnings_select ON platform_earnings; DROP POLICY IF EXISTS rls_platform_earnings_insert ON platform_earnings;
DROP POLICY IF EXISTS rls_platform_earnings_update ON platform_earnings; DROP POLICY IF EXISTS rls_platform_earnings_delete ON platform_earnings;
CREATE POLICY rls_platform_earnings_select ON platform_earnings FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_platform_earnings_insert ON platform_earnings FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_platform_earnings_update ON platform_earnings FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_platform_earnings_delete ON platform_earnings FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE weekly_conciliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_weekly_conciliations_select ON weekly_conciliations; DROP POLICY IF EXISTS rls_weekly_conciliations_insert ON weekly_conciliations;
DROP POLICY IF EXISTS rls_weekly_conciliations_update ON weekly_conciliations; DROP POLICY IF EXISTS rls_weekly_conciliations_delete ON weekly_conciliations;
CREATE POLICY rls_weekly_conciliations_select ON weekly_conciliations FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_weekly_conciliations_insert ON weekly_conciliations FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_weekly_conciliations_update ON weekly_conciliations FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_weekly_conciliations_delete ON weekly_conciliations FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE partner_distributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_partner_distributions_select ON partner_distributions; DROP POLICY IF EXISTS rls_partner_distributions_insert ON partner_distributions;
DROP POLICY IF EXISTS rls_partner_distributions_update ON partner_distributions; DROP POLICY IF EXISTS rls_partner_distributions_delete ON partner_distributions;
CREATE POLICY rls_partner_distributions_select ON partner_distributions FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partner_distributions_insert ON partner_distributions FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partner_distributions_update ON partner_distributions FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_partner_distributions_delete ON partner_distributions FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 007_incidents_location: incidents, incident_photos, location_logs (partitioned),
--   geofences, geofence_alerts, notifications, comments, notification_settings
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incidents_select ON incidents; DROP POLICY IF EXISTS rls_incidents_insert ON incidents;
DROP POLICY IF EXISTS rls_incidents_update ON incidents; DROP POLICY IF EXISTS rls_incidents_delete ON incidents;
CREATE POLICY rls_incidents_select ON incidents FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incidents_insert ON incidents FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incidents_update ON incidents FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incidents_delete ON incidents FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE incident_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_incident_photos_select ON incident_photos; DROP POLICY IF EXISTS rls_incident_photos_insert ON incident_photos;
DROP POLICY IF EXISTS rls_incident_photos_update ON incident_photos; DROP POLICY IF EXISTS rls_incident_photos_delete ON incident_photos;
CREATE POLICY rls_incident_photos_select ON incident_photos FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incident_photos_insert ON incident_photos FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incident_photos_update ON incident_photos FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_incident_photos_delete ON incident_photos FOR DELETE USING (tenant_id = app.current_tenant_id());

-- location_logs es tabla particionada — RLS se hereda a particiones hijas automáticamente
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_location_logs_select ON location_logs; DROP POLICY IF EXISTS rls_location_logs_insert ON location_logs;
CREATE POLICY rls_location_logs_select ON location_logs FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_location_logs_insert ON location_logs FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_geofences_select ON geofences; DROP POLICY IF EXISTS rls_geofences_insert ON geofences;
DROP POLICY IF EXISTS rls_geofences_update ON geofences; DROP POLICY IF EXISTS rls_geofences_delete ON geofences;
CREATE POLICY rls_geofences_select ON geofences FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_insert ON geofences FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_update ON geofences FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_delete ON geofences FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_geofence_alerts_select ON geofence_alerts; DROP POLICY IF EXISTS rls_geofence_alerts_insert ON geofence_alerts;
DROP POLICY IF EXISTS rls_geofence_alerts_update ON geofence_alerts; DROP POLICY IF EXISTS rls_geofence_alerts_delete ON geofence_alerts;
CREATE POLICY rls_geofence_alerts_select ON geofence_alerts FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_alerts_insert ON geofence_alerts FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_alerts_update ON geofence_alerts FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_alerts_delete ON geofence_alerts FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notifications_select ON notifications; DROP POLICY IF EXISTS rls_notifications_insert ON notifications;
DROP POLICY IF EXISTS rls_notifications_update ON notifications; DROP POLICY IF EXISTS rls_notifications_delete ON notifications;
CREATE POLICY rls_notifications_select ON notifications FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notifications_insert ON notifications FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notifications_update ON notifications FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notifications_delete ON notifications FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_comments_select ON comments; DROP POLICY IF EXISTS rls_comments_insert ON comments;
DROP POLICY IF EXISTS rls_comments_update ON comments; DROP POLICY IF EXISTS rls_comments_delete ON comments;
CREATE POLICY rls_comments_select ON comments FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_comments_insert ON comments FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_comments_update ON comments FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_comments_delete ON comments FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_notification_settings_select ON notification_settings; DROP POLICY IF EXISTS rls_notification_settings_insert ON notification_settings;
DROP POLICY IF EXISTS rls_notification_settings_update ON notification_settings; DROP POLICY IF EXISTS rls_notification_settings_delete ON notification_settings;
CREATE POLICY rls_notification_settings_select ON notification_settings FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notification_settings_insert ON notification_settings FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notification_settings_update ON notification_settings FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_notification_settings_delete ON notification_settings FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 008_recruitment (v2): recruitment_sources, recruitment_candidates,
--   recruitment_pipeline_stages, recruitment_candidate_stages,
--   recruitment_interviews, recruitment_documents, recruitment_metrics
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE recruitment_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_recruitment_sources_select ON recruitment_sources; DROP POLICY IF EXISTS rls_recruitment_sources_insert ON recruitment_sources;
DROP POLICY IF EXISTS rls_recruitment_sources_update ON recruitment_sources; DROP POLICY IF EXISTS rls_recruitment_sources_delete ON recruitment_sources;
CREATE POLICY rls_recruitment_sources_select ON recruitment_sources FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_sources_insert ON recruitment_sources FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_sources_update ON recruitment_sources FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_sources_delete ON recruitment_sources FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE recruitment_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_recruitment_candidates_select ON recruitment_candidates; DROP POLICY IF EXISTS rls_recruitment_candidates_insert ON recruitment_candidates;
DROP POLICY IF EXISTS rls_recruitment_candidates_update ON recruitment_candidates; DROP POLICY IF EXISTS rls_recruitment_candidates_delete ON recruitment_candidates;
CREATE POLICY rls_recruitment_candidates_select ON recruitment_candidates FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidates_insert ON recruitment_candidates FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidates_update ON recruitment_candidates FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidates_delete ON recruitment_candidates FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE recruitment_pipeline_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_recruitment_pipeline_stages_select ON recruitment_pipeline_stages; DROP POLICY IF EXISTS rls_recruitment_pipeline_stages_insert ON recruitment_pipeline_stages;
DROP POLICY IF EXISTS rls_recruitment_pipeline_stages_update ON recruitment_pipeline_stages; DROP POLICY IF EXISTS rls_recruitment_pipeline_stages_delete ON recruitment_pipeline_stages;
CREATE POLICY rls_recruitment_pipeline_stages_select ON recruitment_pipeline_stages FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_pipeline_stages_insert ON recruitment_pipeline_stages FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_pipeline_stages_update ON recruitment_pipeline_stages FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_pipeline_stages_delete ON recruitment_pipeline_stages FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE recruitment_candidate_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_recruitment_candidate_stages_select ON recruitment_candidate_stages; DROP POLICY IF EXISTS rls_recruitment_candidate_stages_insert ON recruitment_candidate_stages;
DROP POLICY IF EXISTS rls_recruitment_candidate_stages_update ON recruitment_candidate_stages; DROP POLICY IF EXISTS rls_recruitment_candidate_stages_delete ON recruitment_candidate_stages;
CREATE POLICY rls_recruitment_candidate_stages_select ON recruitment_candidate_stages FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidate_stages_insert ON recruitment_candidate_stages FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidate_stages_update ON recruitment_candidate_stages FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_candidate_stages_delete ON recruitment_candidate_stages FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE recruitment_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_recruitment_metrics_select ON recruitment_metrics; DROP POLICY IF EXISTS rls_recruitment_metrics_insert ON recruitment_metrics;
DROP POLICY IF EXISTS rls_recruitment_metrics_update ON recruitment_metrics; DROP POLICY IF EXISTS rls_recruitment_metrics_delete ON recruitment_metrics;
CREATE POLICY rls_recruitment_metrics_select ON recruitment_metrics FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_metrics_insert ON recruitment_metrics FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_metrics_update ON recruitment_metrics FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_recruitment_metrics_delete ON recruitment_metrics FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 009_location_tracking: device_locations (partitioned), vehicle_last_location,
--   driver_last_location, geofences_v2, geofence_events, location_sessions,
--   collection_visits
-- ─────────────────────────────────────────────────────────────────────────────

-- device_locations es tabla particionada — el RLS se aplica en la tabla padre
ALTER TABLE device_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_device_locations_select ON device_locations; DROP POLICY IF EXISTS rls_device_locations_insert ON device_locations;
CREATE POLICY rls_device_locations_select ON device_locations FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_device_locations_insert ON device_locations FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE vehicle_last_location ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_vehicle_last_location_select ON vehicle_last_location; DROP POLICY IF EXISTS rls_vehicle_last_location_insert ON vehicle_last_location;
DROP POLICY IF EXISTS rls_vehicle_last_location_update ON vehicle_last_location; DROP POLICY IF EXISTS rls_vehicle_last_location_delete ON vehicle_last_location;
CREATE POLICY rls_vehicle_last_location_select ON vehicle_last_location FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_last_location_insert ON vehicle_last_location FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_last_location_update ON vehicle_last_location FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_vehicle_last_location_delete ON vehicle_last_location FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE driver_last_location ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_driver_last_location_select ON driver_last_location; DROP POLICY IF EXISTS rls_driver_last_location_insert ON driver_last_location;
DROP POLICY IF EXISTS rls_driver_last_location_update ON driver_last_location; DROP POLICY IF EXISTS rls_driver_last_location_delete ON driver_last_location;
CREATE POLICY rls_driver_last_location_select ON driver_last_location FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_driver_last_location_insert ON driver_last_location FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_driver_last_location_update ON driver_last_location FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_driver_last_location_delete ON driver_last_location FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE geofences_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_geofences_v2_select ON geofences_v2; DROP POLICY IF EXISTS rls_geofences_v2_insert ON geofences_v2;
DROP POLICY IF EXISTS rls_geofences_v2_update ON geofences_v2; DROP POLICY IF EXISTS rls_geofences_v2_delete ON geofences_v2;
CREATE POLICY rls_geofences_v2_select ON geofences_v2 FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_v2_insert ON geofences_v2 FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_v2_update ON geofences_v2 FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofences_v2_delete ON geofences_v2 FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_geofence_events_select ON geofence_events; DROP POLICY IF EXISTS rls_geofence_events_insert ON geofence_events;
DROP POLICY IF EXISTS rls_geofence_events_update ON geofence_events; DROP POLICY IF EXISTS rls_geofence_events_delete ON geofence_events;
CREATE POLICY rls_geofence_events_select ON geofence_events FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_events_insert ON geofence_events FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_events_update ON geofence_events FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_geofence_events_delete ON geofence_events FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE location_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_location_sessions_select ON location_sessions; DROP POLICY IF EXISTS rls_location_sessions_insert ON location_sessions;
DROP POLICY IF EXISTS rls_location_sessions_update ON location_sessions; DROP POLICY IF EXISTS rls_location_sessions_delete ON location_sessions;
CREATE POLICY rls_location_sessions_select ON location_sessions FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_location_sessions_insert ON location_sessions FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_location_sessions_update ON location_sessions FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_location_sessions_delete ON location_sessions FOR DELETE USING (tenant_id = app.current_tenant_id());

ALTER TABLE collection_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_collection_visits_select ON collection_visits; DROP POLICY IF EXISTS rls_collection_visits_insert ON collection_visits;
DROP POLICY IF EXISTS rls_collection_visits_update ON collection_visits; DROP POLICY IF EXISTS rls_collection_visits_delete ON collection_visits;
CREATE POLICY rls_collection_visits_select ON collection_visits FOR SELECT USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_collection_visits_insert ON collection_visits FOR INSERT WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY rls_collection_visits_update ON collection_visits FOR UPDATE USING (tenant_id = app.current_tenant_id());
CREATE POLICY rls_collection_visits_delete ON collection_visits FOR DELETE USING (tenant_id = app.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- IMPORTANTE: Esta migración requiere que la app siga el patrón:
--   await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`)
-- antes de cada bloque de queries de tenant.
-- El usuario super_admin que accede a TODAS las tablas debe conectarse con
-- un rol de DB que tenga BYPASS RLS, o usar SET LOCAL app.tenant_id = '' (vacío)
-- para obtener acceso completo solo en contextos admin.
-- ─────────────────────────────────────────────────────────────────────────────
