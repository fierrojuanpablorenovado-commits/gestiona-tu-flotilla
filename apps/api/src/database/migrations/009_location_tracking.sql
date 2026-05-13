-- ============================================================
-- FLEETCORE SaaS - MIGRATION 009: LOCATION / GPS TRACKING MODULE
-- Real-time GPS tracking, geofencing, collection visits, sessions
-- ============================================================
--
-- This migration builds a dedicated high-volume location tracking
-- system for the FleetCore mobile app. It complements the basic
-- location_logs and geofences tables created in 007 by adding:
--
--   1. device_locations      - high-volume GPS pings (partitioned by month)
--   2. vehicle_last_location - materialized current position per vehicle
--   3. driver_last_location  - materialized current position per driver
--   4. geofences_v2          - expanded geofence definitions with circle/polygon
--   5. geofence_events       - enter/exit events for geofence crossings
--   6. location_sessions     - driver online/offline tracking sessions
--   7. collection_visits     - cobranza (debt collection) visit tracking
--
-- PARTITIONING STRATEGY for device_locations:
--   - Partitioned by RANGE on recorded_at (monthly boundaries)
--   - Each month is a separate physical table for fast pruning
--   - Queries on recent data only scan the current partition
--   - Old partitions can be detached and archived independently
--   - A cron job or application code should create future partitions
--     at least 1 month ahead to avoid insert failures
--
-- All TIMESTAMP columns use TIMESTAMPTZ to honour the tenant timezone
-- (America/Mexico_City by default).
-- ============================================================


-- ============================================================
-- 1. DEVICE LOCATIONS (high-volume, partitioned)
-- ============================================================
-- Stores every GPS ping received from the mobile app.
-- Expected volume: millions of rows/month across all tenants.
-- Uses BIGSERIAL for the id column to accommodate high cardinality.
-- The partition key (recorded_at) must be part of the PK for
-- PostgreSQL partitioned tables.

CREATE TABLE device_locations (
    id              BIGSERIAL,
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id       UUID        REFERENCES drivers(id) ON DELETE SET NULL,
    vehicle_id      UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    accuracy        DECIMAL(8,2),              -- GPS accuracy in meters
    speed           DECIMAL(8,2),              -- km/h
    heading         DECIMAL(5,2),              -- compass bearing 0-360 degrees
    altitude        DECIMAL(8,2),              -- meters above sea level
    battery_level   INTEGER,                   -- phone battery percentage 0-100
    is_charging     BOOLEAN,
    network_type    VARCHAR(20),               -- wifi, 4g, 5g, 3g, none
    app_state       VARCHAR(20) DEFAULT 'foreground', -- foreground, background, killed
    recorded_at     TIMESTAMPTZ NOT NULL,      -- timestamp on device when captured
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- timestamp when server received it
    PRIMARY KEY (id, recorded_at)              -- partition key must be in PK
) PARTITION BY RANGE (recorded_at);

COMMENT ON TABLE device_locations IS
    'High-volume GPS pings from the FleetCore mobile app. '
    'Partitioned monthly by recorded_at for performance. '
    'Use vehicle_last_location / driver_last_location for current position lookups.';

COMMENT ON COLUMN device_locations.recorded_at IS
    'Timestamp captured on the device; may differ from received_at due to offline buffering.';

COMMENT ON COLUMN device_locations.app_state IS
    'State of the mobile app when the ping was captured: foreground, background, or killed.';

-- Monthly partitions: current month (March 2026) + next 3 months
CREATE TABLE device_locations_2026_03 PARTITION OF device_locations
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE device_locations_2026_04 PARTITION OF device_locations
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE device_locations_2026_05 PARTITION OF device_locations
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE device_locations_2026_06 PARTITION OF device_locations
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Indexes on device_locations (created on the parent; auto-propagated to partitions)
-- Composite lat/lng index acts as a poor-man's spatial index for bounding-box queries
CREATE INDEX idx_device_loc_tenant_recorded
    ON device_locations (tenant_id, recorded_at DESC);

CREATE INDEX idx_device_loc_driver_recorded
    ON device_locations (driver_id, recorded_at DESC)
    WHERE driver_id IS NOT NULL;

CREATE INDEX idx_device_loc_vehicle_recorded
    ON device_locations (vehicle_id, recorded_at DESC)
    WHERE vehicle_id IS NOT NULL;

CREATE INDEX idx_device_loc_coords
    ON device_locations (latitude, longitude);

CREATE INDEX idx_device_loc_received
    ON device_locations (received_at DESC);


-- ============================================================
-- 2. VEHICLE LAST LOCATION (materialized current position)
-- ============================================================
-- One row per vehicle. Updated via UPSERT on every incoming ping.
-- Provides O(1) lookup for "where is vehicle X right now?"

CREATE TABLE vehicle_last_location (
    vehicle_id          UUID        PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id           UUID        REFERENCES drivers(id) ON DELETE SET NULL,
    latitude            DECIMAL(10,7) NOT NULL,
    longitude           DECIMAL(10,7) NOT NULL,
    speed               DECIMAL(8,2),
    heading             DECIMAL(5,2),
    battery_level       INTEGER,
    is_moving           BOOLEAN     NOT NULL DEFAULT false,
    last_movement_at    TIMESTAMPTZ,           -- last time speed > 0 was detected
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vehicle_last_location IS
    'Materialized current position for each vehicle. '
    'One row per vehicle, updated via UPSERT on every GPS ping. '
    'Query this table instead of device_locations for real-time fleet map.';

CREATE INDEX idx_vehicle_last_loc_tenant
    ON vehicle_last_location (tenant_id);

CREATE INDEX idx_vehicle_last_loc_coords
    ON vehicle_last_location (latitude, longitude);

CREATE INDEX idx_vehicle_last_loc_moving
    ON vehicle_last_location (tenant_id, is_moving)
    WHERE is_moving = true;


-- ============================================================
-- 3. DRIVER LAST LOCATION (materialized current position)
-- ============================================================
-- One row per driver. Updated on every ping when driver_id is set.
-- Useful for collection visits (cobranza) and driver check-ins.

CREATE TABLE driver_last_location (
    driver_id           UUID        PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id          UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
    latitude            DECIMAL(10,7) NOT NULL,
    longitude           DECIMAL(10,7) NOT NULL,
    accuracy            DECIMAL(8,2),
    battery_level       INTEGER,
    app_state           VARCHAR(20),           -- foreground, background, killed
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE driver_last_location IS
    'Materialized current position for each driver. '
    'One row per driver, updated via UPSERT on every GPS ping. '
    'Used for cobranza (debt collection) route planning and driver monitoring.';

CREATE INDEX idx_driver_last_loc_tenant
    ON driver_last_location (tenant_id);

CREATE INDEX idx_driver_last_loc_coords
    ON driver_last_location (latitude, longitude);


-- ============================================================
-- 4. GEOFENCES V2 (expanded geofence definitions)
-- ============================================================
-- Supports both circle and polygon geometries.
-- Types cover operational zones, restricted areas, collection zones,
-- parking lots, and office locations.

CREATE TABLE geofences_v2 (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    type                VARCHAR(30) NOT NULL,
    -- operational_zone: normal operating area for the fleet
    -- restricted_zone:  vehicles should not enter
    -- collection_zone:  cobranza area for debt collection routes
    -- parking:          designated parking / overnight storage
    -- office:           company offices or service centers
    geometry_type       VARCHAR(20) NOT NULL DEFAULT 'circle', -- circle, polygon
    center_lat          DECIMAL(10,7),         -- for circle geofences
    center_lng          DECIMAL(10,7),         -- for circle geofences
    radius_meters       DECIMAL(10,2),         -- for circle geofences
    polygon_coords      JSONB,                 -- for polygon: [{lat, lng}, ...]
    is_active           BOOLEAN     NOT NULL DEFAULT true,
    alert_on_enter      BOOLEAN     NOT NULL DEFAULT false,
    alert_on_exit       BOOLEAN     NOT NULL DEFAULT false,
    alert_recipients    JSONB,                 -- array of user_ids to notify
    created_by          UUID        REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE geofences_v2 IS
    'Geographic zones (circles or polygons) with optional enter/exit alerts. '
    'Types: operational_zone, restricted_zone, collection_zone, parking, office. '
    'Polygon coords stored as JSONB array of {lat, lng} objects.';

COMMENT ON COLUMN geofences_v2.alert_recipients IS
    'JSONB array of user UUIDs who should receive push/email notifications on enter/exit events.';

CREATE INDEX idx_geofences_v2_tenant
    ON geofences_v2 (tenant_id);

CREATE INDEX idx_geofences_v2_active
    ON geofences_v2 (tenant_id, is_active)
    WHERE is_active = true;

CREATE INDEX idx_geofences_v2_type
    ON geofences_v2 (tenant_id, type);

-- Spatial lookup for circle geofences (bounding-box pre-filter)
CREATE INDEX idx_geofences_v2_center
    ON geofences_v2 (center_lat, center_lng)
    WHERE geometry_type = 'circle';

-- GIN index on polygon coordinates for JSONB containment queries
CREATE INDEX idx_geofences_v2_polygon
    ON geofences_v2 USING GIN (polygon_coords)
    WHERE geometry_type = 'polygon';


-- ============================================================
-- 5. GEOFENCE EVENTS (enter/exit crossings)
-- ============================================================
-- Records every time a vehicle or driver crosses a geofence boundary.
-- Used for alerting, audit trail, and operational analytics.

CREATE TABLE geofence_events (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    geofence_id     UUID        NOT NULL REFERENCES geofences_v2(id) ON DELETE CASCADE,
    vehicle_id      UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id       UUID        REFERENCES drivers(id) ON DELETE SET NULL,
    event_type      VARCHAR(10) NOT NULL,      -- enter, exit
    latitude        DECIMAL(10,7) NOT NULL,
    longitude       DECIMAL(10,7) NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified        BOOLEAN     NOT NULL DEFAULT false
);

COMMENT ON TABLE geofence_events IS
    'Log of enter/exit events when a vehicle or driver crosses a geofence boundary. '
    'The notified flag tracks whether alert_recipients have been notified.';

CREATE INDEX idx_geofence_events_tenant
    ON geofence_events (tenant_id, occurred_at DESC);

CREATE INDEX idx_geofence_events_geofence
    ON geofence_events (geofence_id, occurred_at DESC);

CREATE INDEX idx_geofence_events_vehicle
    ON geofence_events (vehicle_id, occurred_at DESC)
    WHERE vehicle_id IS NOT NULL;

CREATE INDEX idx_geofence_events_driver
    ON geofence_events (driver_id, occurred_at DESC)
    WHERE driver_id IS NOT NULL;

CREATE INDEX idx_geofence_events_pending
    ON geofence_events (notified)
    WHERE notified = false;


-- ============================================================
-- 6. LOCATION SESSIONS (driver online/offline tracking)
-- ============================================================
-- Tracks continuous periods when a driver is sharing their location
-- via the mobile app. A session starts on app login / foreground
-- and ends on logout / app kill / prolonged inactivity.

CREATE TABLE location_sessions (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id           UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_id          UUID        REFERENCES vehicles(id) ON DELETE SET NULL,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,            -- NULL while session is active
    start_lat           DECIMAL(10,7) NOT NULL,
    start_lng           DECIMAL(10,7) NOT NULL,
    end_lat             DECIMAL(10,7),
    end_lng             DECIMAL(10,7),
    total_distance_km   DECIMAL(10,2),          -- accumulated from pings
    total_pings         INTEGER     NOT NULL DEFAULT 0,
    avg_speed           DECIMAL(8,2)            -- average speed during session in km/h
);

COMMENT ON TABLE location_sessions IS
    'Tracks continuous periods when a driver shares their location. '
    'A session starts on app login and ends on logout or inactivity timeout. '
    'total_distance_km and avg_speed are updated incrementally per ping.';

CREATE INDEX idx_loc_sessions_tenant
    ON location_sessions (tenant_id, started_at DESC);

CREATE INDEX idx_loc_sessions_driver
    ON location_sessions (driver_id, started_at DESC);

CREATE INDEX idx_loc_sessions_vehicle
    ON location_sessions (vehicle_id, started_at DESC)
    WHERE vehicle_id IS NOT NULL;

CREATE INDEX idx_loc_sessions_active
    ON location_sessions (tenant_id, driver_id)
    WHERE ended_at IS NULL;


-- ============================================================
-- 7. COLLECTION VISITS (cobranza / debt collection tracking)
-- ============================================================
-- When a collector (admin/user) goes to a driver's location to
-- collect overdue payments. Tracks scheduling, arrival, outcome,
-- and evidence photos.

CREATE TABLE collection_visits (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id           UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    collector_id        UUID        NOT NULL REFERENCES users(id),  -- who went to collect
    scheduled_at        TIMESTAMPTZ,            -- when the visit was planned
    visited_at          TIMESTAMPTZ,            -- when the collector actually arrived
    latitude            DECIMAL(10,7),          -- arrival coordinates
    longitude           DECIMAL(10,7),          -- arrival coordinates
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending:          visit created, not yet departed
    -- in_route:         collector is on the way
    -- arrived:          collector reached the location
    -- completed:        collection finished (payment received or arrangement made)
    -- driver_not_found: driver was not at the expected location
    amount_collected    DECIMAL(10,2) NOT NULL DEFAULT 0,  -- amount in MXN
    notes               TEXT,
    evidence_photos     JSONB,                  -- array of {url, description, taken_at}
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE collection_visits IS
    'Tracks debt collection (cobranza) visits to driver locations. '
    'Statuses: pending, in_route, arrived, completed, driver_not_found. '
    'evidence_photos stores JSONB array of {url, description, taken_at} objects.';

CREATE INDEX idx_collection_visits_tenant
    ON collection_visits (tenant_id, created_at DESC);

CREATE INDEX idx_collection_visits_driver
    ON collection_visits (driver_id, status);

CREATE INDEX idx_collection_visits_collector
    ON collection_visits (collector_id, created_at DESC);

CREATE INDEX idx_collection_visits_status
    ON collection_visits (tenant_id, status)
    WHERE status IN ('pending', 'in_route');

CREATE INDEX idx_collection_visits_scheduled
    ON collection_visits (scheduled_at)
    WHERE scheduled_at IS NOT NULL AND status = 'pending';

CREATE INDEX idx_collection_visits_coords
    ON collection_visits (latitude, longitude)
    WHERE latitude IS NOT NULL;


-- ============================================================
-- PERMISSIONS: Location tracking module
-- ============================================================
-- Extend the permissions table from 001_foundation with
-- granular actions for the expanded location tracking module.

INSERT INTO permissions (module, action, description) VALUES
('location', 'view_realtime', 'Ver ubicacion en tiempo real de vehiculos y choferes'),
('location', 'view_driver_location', 'Ver ubicacion de chofer individual'),
('location', 'view_sessions', 'Ver sesiones de ubicacion de choferes'),
('location', 'manage_geofences_v2', 'Crear y editar geocercas avanzadas'),
('location', 'delete_geofences', 'Eliminar geocercas'),
('location', 'view_geofence_events', 'Ver eventos de entrada/salida de geocercas'),
('collection', 'view', 'Ver visitas de cobranza'),
('collection', 'create', 'Crear visitas de cobranza'),
('collection', 'edit', 'Editar visitas de cobranza'),
('collection', 'collect', 'Registrar cobro realizado'),
('collection', 'view_evidence', 'Ver fotos de evidencia de cobranza')
ON CONFLICT (module, action) DO NOTHING;


-- ============================================================
-- HELPER FUNCTION: Auto-create future monthly partitions
-- ============================================================
-- Call this from a pg_cron job or application scheduler monthly.
-- It creates the partition for the given month if it doesn't exist.

CREATE OR REPLACE FUNCTION create_device_location_partition(
    p_year  INTEGER,
    p_month INTEGER
) RETURNS VOID AS $$
DECLARE
    partition_name  TEXT;
    start_date      DATE;
    end_date        DATE;
BEGIN
    partition_name := format('device_locations_%s_%s',
        p_year,
        lpad(p_month::TEXT, 2, '0'));

    start_date := make_date(p_year, p_month, 1);
    end_date   := start_date + INTERVAL '1 month';

    -- Check if partition already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF device_locations '
            'FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            start_date,
            end_date
        );
        RAISE NOTICE 'Created partition: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_device_location_partition IS
    'Creates a monthly partition for device_locations if it does not already exist. '
    'Call via pg_cron: SELECT create_device_location_partition(2026, 7);';
