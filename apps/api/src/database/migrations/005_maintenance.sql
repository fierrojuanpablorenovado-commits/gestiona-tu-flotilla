-- ============================================================
-- FLEETCORE SaaS - MIGRATION 005: MAINTENANCE
-- Preventive, corrective, consumables tracking
-- ============================================================

-- ============================================================
-- WORKSHOPS / TALLERES
-- ============================================================

CREATE TABLE workshops (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    contact_name    VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(200),
    address         TEXT,
    city            VARCHAR(100),
    specialties     JSONB DEFAULT '[]',  -- ["engine", "transmission", "electrical", "body", "tires"]
    rating          DECIMAL(2,1) DEFAULT 0,  -- 0-5
    total_services  INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workshops_tenant ON workshops(tenant_id);

-- ============================================================
-- MAINTENANCE ORDERS
-- ============================================================

CREATE TABLE maintenance_orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_number        VARCHAR(30) NOT NULL,
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    driver_id           UUID REFERENCES drivers(id),  -- who reported / was driving

    -- Type
    maintenance_type    VARCHAR(20) NOT NULL,  -- preventive, corrective, emergency
    category            VARCHAR(50),
    -- oil_change, tire_rotation, tire_change, brakes, battery, engine, transmission,
    -- electrical, ac, suspension, body_repair, paint, general_service, other

    -- Description
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    reported_symptoms   TEXT,       -- what the driver/mechanic noticed

    -- Assignment
    workshop_id         UUID REFERENCES workshops(id),
    mechanic_user_id    UUID REFERENCES users(id),  -- if internal mechanic
    assigned_by         UUID REFERENCES users(id),

    -- Scheduling
    scheduled_date      DATE,
    km_at_entry         INTEGER,
    entry_date          TIMESTAMP,
    estimated_completion TIMESTAMP,
    actual_completion   TIMESTAMP,
    exit_date           TIMESTAMP,

    -- Costs
    estimated_cost      DECIMAL(10,2),
    actual_cost         DECIMAL(10,2),
    labor_cost          DECIMAL(10,2),
    parts_cost          DECIMAL(10,2),
    other_costs         DECIMAL(10,2),
    cost_approved_by    UUID REFERENCES users(id),
    cost_approved_at    TIMESTAMP,

    -- Downtime
    downtime_hours      DECIMAL(8,2),  -- calculated from entry to exit

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, approved, in_progress, waiting_parts, completed, cancelled
    priority            VARCHAR(10) DEFAULT 'normal',  -- low, normal, high, critical

    -- Diagnosis
    diagnosis           TEXT,
    root_cause          TEXT,

    -- Payment
    payment_status      VARCHAR(20) DEFAULT 'pending',  -- pending, partial, paid
    paid_amount         DECIMAL(10,2) DEFAULT 0,
    invoice_number      VARCHAR(50),
    invoice_url         VARCHAR(500),

    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, order_number)
);

CREATE INDEX idx_maintenance_tenant ON maintenance_orders(tenant_id);
CREATE INDEX idx_maintenance_vehicle ON maintenance_orders(vehicle_id);
CREATE INDEX idx_maintenance_status ON maintenance_orders(tenant_id, status);
CREATE INDEX idx_maintenance_date ON maintenance_orders(scheduled_date);

-- ============================================================
-- MAINTENANCE PARTS / REFACCIONES
-- ============================================================

CREATE TABLE maintenance_parts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
    part_name           VARCHAR(200) NOT NULL,
    part_number         VARCHAR(100),
    brand               VARCHAR(100),
    quantity            INTEGER NOT NULL DEFAULT 1,
    unit_cost           DECIMAL(10,2) NOT NULL,
    total_cost          DECIMAL(10,2) NOT NULL,
    is_warranty         BOOLEAN DEFAULT false,
    warranty_until      DATE,
    supplier            VARCHAR(200),
    notes               VARCHAR(200),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_parts_order ON maintenance_parts(maintenance_order_id);

-- ============================================================
-- MAINTENANCE PHOTOS/EVIDENCE
-- ============================================================

CREATE TABLE maintenance_photos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_order_id UUID NOT NULL REFERENCES maintenance_orders(id) ON DELETE CASCADE,
    photo_type          VARCHAR(30) NOT NULL,  -- before, during, after, part, diagnosis, invoice
    file_url            VARCHAR(500) NOT NULL,
    description         VARCHAR(200),
    uploaded_by         UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_photos_order ON maintenance_photos(maintenance_order_id);

-- ============================================================
-- PREVENTIVE MAINTENANCE SCHEDULES
-- ============================================================

CREATE TABLE maintenance_schedules (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id          UUID REFERENCES vehicles(id),  -- null = applies to all
    service_type        VARCHAR(50) NOT NULL,
    -- oil_change, tire_rotation, brake_check, general_service, ac_service,
    -- transmission_service, coolant_change, spark_plugs, timing_belt
    interval_km         INTEGER,            -- every X km
    interval_days       INTEGER,            -- or every X days
    last_service_km     INTEGER,
    last_service_date   DATE,
    next_due_km         INTEGER,            -- calculated
    next_due_date       DATE,               -- calculated
    alert_before_km     INTEGER DEFAULT 500,
    alert_before_days   INTEGER DEFAULT 7,
    estimated_cost      DECIMAL(10,2),
    is_active           BOOLEAN DEFAULT true,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_schedule_vehicle ON maintenance_schedules(vehicle_id);
CREATE INDEX idx_maint_schedule_due ON maintenance_schedules(next_due_date);

-- ============================================================
-- TIRE TRACKING
-- ============================================================

CREATE TABLE tire_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    position        VARCHAR(5) NOT NULL,  -- FL, FR, RL, RR, spare
    brand           VARCHAR(50),
    model           VARCHAR(50),
    size            VARCHAR(20),          -- 205/55R16
    installed_date  DATE,
    installed_km    INTEGER,
    wear_percentage INTEGER DEFAULT 0,    -- 0=new, 100=finished
    expected_life_km INTEGER,
    current_km      INTEGER,
    status          VARCHAR(20) DEFAULT 'active',  -- active, worn, replaced, damaged
    replaced_date   DATE,
    replaced_km     INTEGER,
    cost            DECIMAL(8,2),
    notes           VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tires_vehicle ON tire_records(vehicle_id);

-- ============================================================
-- FUEL / COMBUSTIBLE
-- ============================================================

CREATE TABLE fuel_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    driver_id       UUID REFERENCES drivers(id),
    record_date     DATE NOT NULL,
    fuel_type       VARCHAR(20) NOT NULL,  -- magna, premium, diesel
    liters          DECIMAL(8,2) NOT NULL,
    price_per_liter DECIMAL(6,2) NOT NULL,
    total_cost      DECIMAL(10,2) NOT NULL,
    km_reading      INTEGER,
    km_since_last   INTEGER,               -- calculated
    km_per_liter    DECIMAL(6,2),          -- calculated efficiency
    station_name    VARCHAR(100),
    payment_method  VARCHAR(30),           -- cash, card, fleet_card, voucher
    card_last_four  VARCHAR(4),
    receipt_url     VARCHAR(500),
    is_anomaly      BOOLEAN DEFAULT false, -- if efficiency is way off
    notes           VARCHAR(200),
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fuel_vehicle ON fuel_records(vehicle_id);
CREATE INDEX idx_fuel_date ON fuel_records(tenant_id, record_date DESC);
