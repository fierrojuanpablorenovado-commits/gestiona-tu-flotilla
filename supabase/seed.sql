-- =============================================================================
-- Gestiona tu Flotilla — Seed Data
-- Datos de demostración para desarrollo y staging
-- =============================================================================
-- NOTA: Crear primero los usuarios en Supabase Auth Dashboard,
-- luego copiar los UUIDs generados y reemplazar los que aparecen aquí.
-- En producción, los usuarios se crean via la app con invitación.
-- =============================================================================

-- ─── Tenants ──────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, plan, max_vehicles) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Flotilla Premier S.A. de C.V.', 'flotilla-premier', 'pro', 50),
  ('00000000-0000-0000-0000-000000000002', 'Transportes del Norte S.A. de C.V.', 'trans-norte', 'basic', 20)
ON CONFLICT (id) DO NOTHING;

-- ─── Vehículos — Flotilla Premier ─────────────────────────────────────────────
INSERT INTO vehicles (id, tenant_id, eco, brand, model, year, color, plates, status, platform) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ECO-001', 'Toyota',    'Yaris',         2021, 'Blanco',   'AAA-001-X', 'active',   ARRAY['Uber','Didi']),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'ECO-012', 'Nissan',    'Versa',         2023, 'Plata',    'BBB-012-X', 'active',   ARRAY['Uber']),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'ECO-015', 'KIA',       'Forte',         2022, 'Negro',    'CCC-015-X', 'workshop', ARRAY['Didi']),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'ECO-023', 'KIA',       'Rio',           2023, 'Rojo',     'DDD-023-X', 'active',   ARRAY['Uber','Didi']),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'ECO-034', 'Hyundai',   'Grand i10',     2023, 'Blanco',   'EEE-034-X', 'active',   ARRAY['Uber']),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'ECO-045', 'Chevrolet', 'Aveo',          2022, 'Gris',     'FFF-045-X', 'active',   ARRAY['Didi']),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'ECO-056', 'Volkswagen','Vento',         2023, 'Azul',     'GGG-056-X', 'active',   ARRAY['Uber','Didi']),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'ECO-067', 'Nissan',    'March',         2022, 'Blanco',   'HHH-067-X', 'workshop', ARRAY['Uber']),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'ECO-089', 'Suzuki',    'Swift',         2022, 'Verde',    'III-089-X', 'active',   ARRAY['Didi']),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'ECO-091', 'Chevrolet', 'Onix',          2023, 'Negro',    'JJJ-091-X', 'workshop', ARRAY['Uber'])
ON CONFLICT (id) DO NOTHING;

-- ─── Choferes — Flotilla Premier ──────────────────────────────────────────────
INSERT INTO drivers (id, tenant_id, vehicle_id, first_name, last_name, phone, email, licencia, licencia_tipo, hire_date, status, rating, score, platforms) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Carlos',    'Martínez',  '+52 55 1234 5678', 'carlos@email.com',   'CDMX-2021-447821', 'Tipo A', '2022-03-15', 'active',   4.87, 92, ARRAY['Uber','Didi']),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Ana',       'López',     '+52 55 2345 6789', 'ana@email.com',      'CDMX-2020-123456', 'Tipo A', '2021-06-01', 'active',   4.92, 96, ARRAY['Uber']),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Jorge',     'Hernández', '+52 55 3456 7890', 'jorge@email.com',    'CDMX-2022-789012', 'Tipo A', '2023-01-10', 'active',   4.65, 78, ARRAY['Didi']),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'María',     'Sánchez',   '+52 55 4567 8901', 'maria@email.com',    'CDMX-2019-345678', 'Tipo A', '2020-09-20', 'active',   4.75, 88, ARRAY['Uber','Didi']),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'Pedro',     'García',    '+52 55 5678 9012', 'pedro@email.com',    'CDMX-2023-901234', 'Tipo A', '2023-08-15', 'active',   4.50, 72, ARRAY['Uber'])
ON CONFLICT (id) DO NOTHING;

-- ─── Cuentas semanales ─────────────────────────────────────────────────────────
INSERT INTO weekly_accounts (tenant_id, driver_id, vehicle_id, week_start, week_end, uber_income, didi_income, rent, trips_count, hours_worked, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '2026-03-18', '2026-03-24', 2980, 1840, 1500, 42, 63.5, 'pending'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '2026-03-11', '2026-03-17', 2600, 1550, 1500, 38, 58.0, 'paid'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-03-18', '2026-03-24', 3200, 0,    1500, 45, 67.0, 'pending'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '2026-03-18', '2026-03-24', 0,    2100, 1500, 33, 52.0, 'pending');

-- ─── Órdenes de mantenimiento ─────────────────────────────────────────────────
INSERT INTO maintenance_orders (id, tenant_id, vehicle_id, orden, tipo, descripcion, taller, fecha_ingreso, costo_estimado, status) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'OT-2026-0087', 'Correctivo',  'Cambio de clutch completo',                    'Taller Hermanos González',      '2026-03-18', 8500,  'En reparacion'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'OT-2026-0088', 'Correctivo',  'Reparación de transmisión automática',         'Servicio Automotriz del Valle',  '2026-03-15', 15000, 'Esperando refacciones'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'OT-2026-0089', 'Urgente',     'Falla en sistema de frenos',                  'Frenos y Suspensiones Express',  '2026-03-23', 4200,  'En diagnostico'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'OT-2026-0090', 'Preventivo',  'Cambio de aceite y filtros 30k km',           'Agencia Nissan Perinorte',       '2026-03-26', 1800,  'Programado'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', 'OT-2026-0093', 'Urgente',     'Sobrecalentamiento de motor - revisión completa','Servicio Automotriz del Valle', '2026-03-24', 7500,  'En diagnostico')
ON CONFLICT (id) DO NOTHING;

-- ─── Incidencias ──────────────────────────────────────────────────────────────
INSERT INTO incidents (tenant_id, driver_id, vehicle_id, tipo, descripcion, fecha, costo, status, severity) VALUES
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'accidente',   'Choque menor en estacionamiento - daño en defensa trasera',    '2026-03-20', 3500,  'investigating', 'medium'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000007', 'multa',        'Infracción por exceso de velocidad en Insurgentes',           '2026-03-18', 1200,  'resolved',      'low'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'queja',        'Cliente reporta actitud inapropiada del conductor',           '2026-03-22', null,  'open',          'high');

-- ─── Candidatos Kanban ────────────────────────────────────────────────────────
INSERT INTO candidates (tenant_id, first_name, last_name, phone, platform, kanban_stage, score, source) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alejandro', 'Vargas',    '+52 55 6789 0123', ARRAY['Uber'],          'entrevista',   82, 'referido'),
  ('00000000-0000-0000-0000-000000000001', 'Diana',     'Morales',   '+52 55 7890 1234', ARRAY['Uber','Didi'],   'evaluacion',   90, 'redes_sociales'),
  ('00000000-0000-0000-0000-000000000001', 'Fernando',  'Ríos',      '+52 55 8901 2345', ARRAY['Didi'],          'pre_screening', 65, 'directo'),
  ('00000000-0000-0000-0000-000000000001', 'Gabriela',  'Castro',    '+52 55 9012 3456', ARRAY['Uber'],          'documentos',   88, 'referido'),
  ('00000000-0000-0000-0000-000000000001', 'Héctor',    'Mendoza',   '+52 55 0123 4567', ARRAY['Uber','Didi'],   'aplicacion',   null, 'portal'),
  ('00000000-0000-0000-0000-000000000001', 'Isabel',    'Fuentes',   '+52 55 1234 0987', ARRAY['Didi'],          'contratado',   94, 'referido');

-- ─── Socios / Inversionistas ──────────────────────────────────────────────────
INSERT INTO partners (tenant_id, name, email, phone, vehicles_count, investment, monthly_income, roi) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ricardo Mendoza',     'r.mendoza@email.com',  '+52 55 1111 2222', 5, 750000, 45000, 7.2),
  ('00000000-0000-0000-0000-000000000001', 'Claudia Reyes',       'c.reyes@email.com',    '+52 55 2222 3333', 3, 450000, 27000, 7.2),
  ('00000000-0000-0000-0000-000000000001', 'Antonio Suárez',      'a.suarez@email.com',   '+52 55 3333 4444', 2, 300000, 18000, 7.2),
  ('00000000-0000-0000-0000-000000000001', 'Grupo Inversiones MX','gi@grupomx.com',       '+52 55 4444 5555', 8, 1200000, 72000, 7.2);

-- ─── Movimientos de tesorería ─────────────────────────────────────────────────
INSERT INTO treasury_transactions (tenant_id, tipo, categoria, descripcion, monto, fecha, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ingreso',  'renta_vehiculo',  'Rentas semana 12 - 8 vehículos',           52000, '2026-03-20', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'ingreso',  'renta_vehiculo',  'Rentas semana 11 - 8 vehículos',           48500, '2026-03-13', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'egreso',   'mantenimiento',   'OT-2026-0086 Amortiguadores ECO-034',       6100, '2026-03-17', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'egreso',   'seguro',          'Póliza seguro flotilla Q1 2026',           18000, '2026-03-01', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'egreso',   'mantenimiento',   'OT-2026-0085 Servicio VW Vento',            2800, '2026-03-12', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'ingreso',  'renta_vehiculo',  'Rentas semana 10 - 7 vehículos',           44500, '2026-03-06', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'egreso',   'combustible',     'Gasolina flotilla semana 11',               8200, '2026-03-15', 'completed'),
  ('00000000-0000-0000-0000-000000000001', 'egreso',   'administrativo',  'Nómina personal administrativo marzo',     25000, '2026-03-15', 'completed');
