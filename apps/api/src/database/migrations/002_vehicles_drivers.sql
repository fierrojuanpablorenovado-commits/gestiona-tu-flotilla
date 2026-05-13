-- ============================================================
-- FLEETCORE SaaS - MIGRATION 002: VEHICLES & DRIVERS
-- Core operational entities
-- ============================================================

-- ============================================================
-- PARTNERS / INVESTORS (owners of vehicles)
-- ============================================================

CREATE TABLE partners (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name           VARCHAR(200) NOT NULL,
    email               VARCHAR(200),
    phone               VARCHAR(20),
    tax_id              VARCHAR(20),     -- RFC
    address             TEXT,
    participation_type  VARCHAR(20) NOT NULL DEFAULT 'percentage', -- percentage, fixed, custom
    default_percentage  DECIMAL(5,2),    -- e.g. 50.00 = 50%
    bank_name           VARCHAR(100),
    bank_account        VARCHAR(50),     -- CLABE
    is_active           BOOLEAN NOT NULL DEFAULT true,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_tenant ON partners(tenant_id);

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE vehicles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    economic_number     VARCHAR(20) NOT NULL,  -- Numero economico interno
    brand               VARCHAR(50) NOT NULL,
    model               VARCHAR(50) NOT NULL,
    version             VARCHAR(100),
    year                INTEGER NOT NULL,
    plates              VARCHAR(20),
    vin                 VARCHAR(17),           -- Serie/VIN
    color               VARCHAR(30),
    engine_number       VARCHAR(50),
    registration_date   DATE,
    acquisition_cost    DECIMAL(12,2),
    acquisition_type    VARCHAR(30),           -- purchase, lease, partner_contribution
    partner_id          UUID REFERENCES partners(id),
    current_driver_id   UUID,                  -- FK added after drivers table
    status              VARCHAR(30) NOT NULL DEFAULT 'available',
    -- available, assigned, in_maintenance, detained_docs, detained_payment,
    -- accident, stolen, decommissioned
    current_km          INTEGER DEFAULT 0,
    last_km_update      TIMESTAMP,
    fuel_type           VARCHAR(20) DEFAULT 'gasoline', -- gasoline, diesel, hybrid, electric, gas
    tank_capacity_liters DECIMAL(5,1),

    -- Insurance
    insurance_company   VARCHAR(100),
    insurance_policy    VARCHAR(50),
    insurance_expires   DATE,
    insurance_cost      DECIMAL(10,2),

    -- Documents
    circulation_card    VARCHAR(50),
    verification_status VARCHAR(20),          -- vigente, por_vencer, vencida
    verification_date   DATE,
    next_verification   DATE,
    refrendo_date       DATE,
    next_refrendo       DATE,

    -- Depreciation
    depreciation_monthly DECIMAL(10,2),
    residual_value      DECIMAL(12,2),

    -- Health score (calculated)
    health_score        INTEGER DEFAULT 100,  -- 0-100
    health_updated_at   TIMESTAMP,

    -- GPS
    gps_device_id       VARCHAR(100),
    gps_provider        VARCHAR(50),          -- queclink, concox, custom
    last_latitude       DECIMAL(10,8),
    last_longitude      DECIMAL(11,8),
    last_location_at    TIMESTAMP,

    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, economic_number),
    UNIQUE(tenant_id, plates)
);

CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_status ON vehicles(tenant_id, status);
CREATE INDEX idx_vehicles_partner ON vehicles(partner_id);
CREATE INDEX idx_vehicles_driver ON vehicles(current_driver_id);
CREATE INDEX idx_vehicles_plates ON vehicles(plates);

-- ============================================================
-- DRIVERS
-- ============================================================

CREATE TABLE drivers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id),  -- linked user account for app login

    -- Personal info
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    phone_secondary     VARCHAR(20),
    email               VARCHAR(200),
    date_of_birth       DATE,
    curp                VARCHAR(18),
    rfc                 VARCHAR(13),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    zip_code            VARCHAR(10),
    emergency_contact   VARCHAR(200),
    emergency_phone     VARCHAR(20),

    -- License
    license_number      VARCHAR(50),
    license_type        VARCHAR(10),          -- A, B, C, D, E
    license_expires     DATE,
    license_state       VARCHAR(50),

    -- Status
    status              VARCHAR(30) NOT NULL DEFAULT 'active',
    -- active, inactive, suspended, terminated, onboarding
    status_reason       TEXT,

    -- Assignment
    current_vehicle_id  UUID REFERENCES vehicles(id),
    assigned_platform   VARCHAR(30),          -- uber, didi, both, indrive, none
    uber_driver_id      VARCHAR(100),         -- ID en Uber
    didi_driver_id      VARCHAR(100),         -- ID en Didi

    -- Financial
    weekly_rent         DECIMAL(10,2),        -- Renta semanal pactada
    deposit_required    DECIMAL(10,2) DEFAULT 0,
    deposit_paid        DECIMAL(10,2) DEFAULT 0,
    deposit_status      VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, returned, forfeited
    payment_day         VARCHAR(10) DEFAULT 'monday',  -- dia de corte

    -- Performance
    compliance_score    INTEGER DEFAULT 100,  -- 0-100
    total_incidents     INTEGER DEFAULT 0,
    total_late_payments INTEGER DEFAULT 0,

    -- Dates
    hire_date           DATE,
    termination_date    DATE,

    -- Location
    last_latitude       DECIMAL(10,8),
    last_longitude      DECIMAL(11,8),
    last_location_at    TIMESTAMP,

    photo_url           VARCHAR(500),
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_driver
    FOREIGN KEY (current_driver_id) REFERENCES drivers(id);

CREATE INDEX idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX idx_drivers_status ON drivers(tenant_id, status);
CREATE INDEX idx_drivers_vehicle ON drivers(current_vehicle_id);
CREATE INDEX idx_drivers_phone ON drivers(phone);
CREATE INDEX idx_drivers_user ON drivers(user_id);

-- ============================================================
-- VEHICLE PHOTOS
-- ============================================================

CREATE TABLE vehicle_photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    photo_type  VARCHAR(30) NOT NULL, -- front, back, left, right, interior, dashboard, vin, other
    file_url    VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    uploaded_by UUID REFERENCES users(id),
    notes       VARCHAR(200),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_photos ON vehicle_photos(vehicle_id);

-- ============================================================
-- DOCUMENTS (generic for vehicles, drivers, partners)
-- ============================================================

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     VARCHAR(30) NOT NULL, -- vehicle, driver, partner, contract
    entity_id       UUID NOT NULL,
    document_type   VARCHAR(50) NOT NULL,
    -- vehicle: insurance_policy, circulation_card, invoice, verification, refrendo
    -- driver: ine_front, ine_back, license_front, license_back, proof_address,
    --         criminal_check, photo, reference, contract
    document_name   VARCHAR(200) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    file_size       INTEGER,              -- bytes
    mime_type       VARCHAR(50),
    expiration_date DATE,
    is_verified     BOOLEAN DEFAULT false,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMP,

    -- Alert tracking
    alert_45_sent   BOOLEAN DEFAULT false,
    alert_30_sent   BOOLEAN DEFAULT false,
    alert_15_sent   BOOLEAN DEFAULT false,
    alert_7_sent    BOOLEAN DEFAULT false,
    alert_1_sent    BOOLEAN DEFAULT false,

    notes           TEXT,
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_expiration ON documents(expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
