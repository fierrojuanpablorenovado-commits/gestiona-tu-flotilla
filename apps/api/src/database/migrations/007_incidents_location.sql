-- ============================================================
-- FLEETCORE SaaS - MIGRATION 007: INCIDENTS, LOCATION, NOTIFICATIONS
-- ============================================================

-- ============================================================
-- INCIDENTS / MULTAS / SINIESTROS
-- ============================================================

CREATE TABLE incidents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    incident_number     VARCHAR(30) NOT NULL,
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    driver_id           UUID REFERENCES drivers(id),

    -- Classification
    incident_type       VARCHAR(30) NOT NULL,
    -- traffic_ticket, accident_minor, accident_major, theft, vandalism,
    -- mechanical_failure, tire_blowout, flood, hit_and_run, dui, other
    severity            VARCHAR(10) NOT NULL DEFAULT 'medium',  -- low, medium, high, critical

    -- Details
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    incident_date       TIMESTAMP NOT NULL,
    location_description VARCHAR(200),
    latitude            DECIMAL(10,8),
    longitude           DECIMAL(11,8),

    -- Responsibility
    driver_at_fault     BOOLEAN,
    third_party_involved BOOLEAN DEFAULT false,
    third_party_info    TEXT,
    police_report       BOOLEAN DEFAULT false,
    police_report_number VARCHAR(50),

    -- Insurance
    insurance_claim     BOOLEAN DEFAULT false,
    insurance_claim_number VARCHAR(50),
    insurance_status    VARCHAR(20),  -- not_filed, filed, in_process, approved, denied
    deductible_amount   DECIMAL(10,2),

    -- Costs
    estimated_cost      DECIMAL(10,2),
    actual_cost         DECIMAL(10,2),
    charged_to_driver   DECIMAL(10,2) DEFAULT 0,
    covered_by_insurance DECIMAL(10,2) DEFAULT 0,
    covered_by_fleet    DECIMAL(10,2) DEFAULT 0,

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'open',
    -- open, investigating, in_repair, resolved, closed, cancelled
    resolution          TEXT,
    resolved_at         TIMESTAMP,
    resolved_by         UUID REFERENCES users(id),

    -- Linked
    maintenance_order_id UUID REFERENCES maintenance_orders(id),
    check_in_out_id     UUID REFERENCES check_in_outs(id),

    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, incident_number)
);

ALTER TABLE check_in_outs ADD CONSTRAINT fk_checkin_incident
    FOREIGN KEY (incident_id) REFERENCES incidents(id);

CREATE INDEX idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX idx_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX idx_incidents_driver ON incidents(driver_id);
CREATE INDEX idx_incidents_status ON incidents(tenant_id, status);
CREATE INDEX idx_incidents_date ON incidents(incident_date DESC);

-- ============================================================
-- INCIDENT PHOTOS
-- ============================================================

CREATE TABLE incident_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    photo_type      VARCHAR(30) NOT NULL,
    -- scene, damage_vehicle, damage_third_party, police_report, insurance_doc,
    -- id_third_party, evidence, other
    file_url        VARCHAR(500) NOT NULL,
    description     VARCHAR(200),
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_photos ON incident_photos(incident_id);

-- ============================================================
-- LOCATION TRACKING
-- ============================================================

CREATE TABLE location_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    driver_id       UUID REFERENCES drivers(id),
    vehicle_id      UUID REFERENCES vehicles(id),
    latitude        DECIMAL(10,8) NOT NULL,
    longitude       DECIMAL(11,8) NOT NULL,
    accuracy_meters FLOAT,
    altitude        FLOAT,
    speed_kmh       FLOAT,
    heading         FLOAT,          -- direction in degrees
    source          VARCHAR(20) NOT NULL DEFAULT 'app',
    -- app_login, app_foreground, app_background, gps_device, check_in
    battery_level   INTEGER,        -- phone battery %
    is_charging     BOOLEAN,
    network_type    VARCHAR(10),    -- wifi, 4g, 5g
    app_version     VARCHAR(20),
    recorded_at     TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions (example for 2026)
CREATE TABLE location_logs_2026_01 PARTITION OF location_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE location_logs_2026_02 PARTITION OF location_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE location_logs_2026_03 PARTITION OF location_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE location_logs_2026_04 PARTITION OF location_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE location_logs_2026_05 PARTITION OF location_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE location_logs_2026_06 PARTITION OF location_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE location_logs_2026_07 PARTITION OF location_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE location_logs_2026_08 PARTITION OF location_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE location_logs_2026_09 PARTITION OF location_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE location_logs_2026_10 PARTITION OF location_logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE location_logs_2026_11 PARTITION OF location_logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE location_logs_2026_12 PARTITION OF location_logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE INDEX idx_location_driver ON location_logs(driver_id, recorded_at DESC);
CREATE INDEX idx_location_vehicle ON location_logs(vehicle_id, recorded_at DESC);
CREATE INDEX idx_location_tenant ON location_logs(tenant_id, recorded_at DESC);

-- ============================================================
-- GEOFENCES
-- ============================================================

CREATE TABLE geofences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    fence_type      VARCHAR(20) NOT NULL,  -- allowed_zone, restricted_zone, alert_zone
    geometry        JSONB NOT NULL,        -- GeoJSON polygon
    color           VARCHAR(7) DEFAULT '#FF0000',
    is_active       BOOLEAN DEFAULT true,
    alert_on_enter  BOOLEAN DEFAULT true,
    alert_on_exit   BOOLEAN DEFAULT true,
    applies_to      VARCHAR(20) DEFAULT 'all',  -- all, specific_vehicles, specific_drivers
    applies_to_ids  JSONB DEFAULT '[]',
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geofences_tenant ON geofences(tenant_id);

-- ============================================================
-- GEOFENCE ALERTS
-- ============================================================

CREATE TABLE geofence_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    geofence_id     UUID NOT NULL REFERENCES geofences(id),
    driver_id       UUID REFERENCES drivers(id),
    vehicle_id      UUID REFERENCES vehicles(id),
    alert_type      VARCHAR(30) NOT NULL,
    -- entered_restricted, left_allowed, stationary_extended, speed_exceeded, out_of_city
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    description     TEXT,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geo_alerts_tenant ON geofence_alerts(tenant_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),      -- target user
    driver_id       UUID REFERENCES drivers(id),    -- or target driver
    channel         VARCHAR(20) NOT NULL,            -- push, email, whatsapp, sms, in_app
    notification_type VARCHAR(50) NOT NULL,
    -- maintenance_due, payment_overdue, document_expiring, insurance_expiring,
    -- license_expiring, verification_due, vehicle_detained, incident_critical,
    -- conciliation_ready, geofence_alert, weekly_report, welcome, custom
    title           VARCHAR(200) NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB,                           -- extra payload
    entity_type     VARCHAR(30),
    entity_id       UUID,
    priority        VARCHAR(10) DEFAULT 'normal',    -- low, normal, high, urgent
    is_read         BOOLEAN DEFAULT false,
    read_at         TIMESTAMP,
    is_sent         BOOLEAN DEFAULT false,
    sent_at         TIMESTAMP,
    send_error      TEXT,
    scheduled_for   TIMESTAMP,                       -- future notifications
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_driver ON notifications(driver_id, created_at DESC);
CREATE INDEX idx_notifications_pending ON notifications(is_sent, scheduled_for)
    WHERE is_sent = false;

-- ============================================================
-- COMMENTS / NOTES (universal commenting system)
-- ============================================================

CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     VARCHAR(30) NOT NULL,  -- vehicle, driver, maintenance, incident, conciliation, contract
    entity_id       UUID NOT NULL,
    user_id         UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    is_internal     BOOLEAN DEFAULT true,  -- internal = not visible to driver/partner
    attachment_url  VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id, created_at DESC);

-- ============================================================
-- NOTIFICATION SETTINGS (per tenant)
-- ============================================================

CREATE TABLE notification_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    is_enabled      BOOLEAN DEFAULT true,
    channels        JSONB DEFAULT '["in_app", "push"]',
    days_before     INTEGER,               -- for expiration-based alerts
    send_to_roles   JSONB DEFAULT '[]',    -- which roles receive this
    whatsapp_template VARCHAR(200),
    email_template  VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, notification_type)
);
