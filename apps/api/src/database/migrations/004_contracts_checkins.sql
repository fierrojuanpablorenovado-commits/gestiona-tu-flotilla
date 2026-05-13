-- ============================================================
-- FLEETCORE SaaS - MIGRATION 004: CONTRACTS & CHECK-IN/OUT
-- ============================================================

-- ============================================================
-- CONTRACTS
-- ============================================================

CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_number     VARCHAR(30) NOT NULL,
    driver_id           UUID NOT NULL REFERENCES drivers(id),
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),

    -- Terms
    contract_type       VARCHAR(20) NOT NULL DEFAULT 'weekly',  -- daily, weekly, biweekly, monthly
    rent_amount         DECIMAL(10,2) NOT NULL,                 -- monto de renta
    rent_frequency      VARCHAR(20) NOT NULL DEFAULT 'weekly',
    payment_day         VARCHAR(10) DEFAULT 'monday',
    deposit_required    DECIMAL(10,2) DEFAULT 0,
    deposit_paid        DECIMAL(10,2) DEFAULT 0,

    -- Platform assignment
    assigned_platforms  JSONB DEFAULT '[]',  -- ["uber", "didi"]

    -- Rules
    max_km_per_week     INTEGER,
    fuel_responsibility VARCHAR(20) DEFAULT 'driver',  -- driver, fleet, shared
    maintenance_responsibility VARCHAR(20) DEFAULT 'fleet',
    insurance_deductible DECIMAL(10,2),     -- deducible que paga el chofer en caso de siniestro
    penalty_late_payment DECIMAL(10,2),     -- multa por pago tardio
    penalty_no_show     DECIMAL(10,2),      -- multa por no presentarse

    -- Dates
    start_date          DATE NOT NULL,
    end_date            DATE,               -- null = indefinite
    termination_date    DATE,
    termination_reason  TEXT,
    terminated_by       UUID REFERENCES users(id),

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'active',
    -- draft, active, suspended, terminated, completed

    -- Digital signature
    signed_by_driver    BOOLEAN DEFAULT false,
    driver_signature_url VARCHAR(500),
    signed_by_admin     BOOLEAN DEFAULT false,
    admin_signature_url VARCHAR(500),
    signed_at           TIMESTAMP,

    -- File
    contract_file_url   VARCHAR(500),

    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, contract_number)
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_driver ON contracts(driver_id);
CREATE INDEX idx_contracts_vehicle ON contracts(vehicle_id);
CREATE INDEX idx_contracts_status ON contracts(tenant_id, status);

-- ============================================================
-- DEPOSIT MOVEMENTS (abonos, devoluciones, descuentos)
-- ============================================================

CREATE TABLE deposit_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id     UUID NOT NULL REFERENCES contracts(id),
    driver_id       UUID NOT NULL REFERENCES drivers(id),
    movement_type   VARCHAR(20) NOT NULL,
    -- payment (abono), deduction (descuento por dano), return (devolucion), adjustment
    amount          DECIMAL(10,2) NOT NULL,
    balance_after   DECIMAL(10,2) NOT NULL,  -- saldo del deposito despues del movimiento
    concept         VARCHAR(200) NOT NULL,
    reference       VARCHAR(100),            -- folio de pago, numero de incidencia, etc.
    evidence_url    VARCHAR(500),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deposits_contract ON deposit_movements(contract_id);
CREATE INDEX idx_deposits_driver ON deposit_movements(driver_id);

-- ============================================================
-- CHECK-IN / CHECK-OUT (Vehicle handoff)
-- ============================================================

CREATE TABLE check_in_outs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    type                VARCHAR(10) NOT NULL,  -- check_in (receiving), check_out (delivering)
    reason              VARCHAR(30) NOT NULL,
    -- driver_change, maintenance_in, maintenance_out, new_assignment, return, inspection

    -- Who
    delivering_driver_id UUID REFERENCES drivers(id),  -- who's giving the car
    receiving_driver_id  UUID REFERENCES drivers(id),  -- who's taking the car
    performed_by        UUID NOT NULL REFERENCES users(id),  -- admin/supervisor

    -- Vehicle condition at time of check
    km_reading          INTEGER NOT NULL,
    fuel_level          INTEGER CHECK (fuel_level BETWEEN 0 AND 100),  -- percentage
    battery_ok          BOOLEAN,
    tires_ok            BOOLEAN,
    lights_ok           BOOLEAN,
    body_condition      VARCHAR(20) DEFAULT 'good',  -- excellent, good, fair, damaged
    interior_condition  VARCHAR(20) DEFAULT 'good',
    ac_working          BOOLEAN,
    general_notes       TEXT,

    -- Damage report
    has_existing_damage BOOLEAN DEFAULT false,
    damage_description  TEXT,
    new_damage_found    BOOLEAN DEFAULT false,
    new_damage_description TEXT,

    -- Digital signature
    signature_deliverer_url VARCHAR(500),
    signature_receiver_url  VARCHAR(500),

    -- GPS at time of check
    latitude            DECIMAL(10,8),
    longitude           DECIMAL(11,8),

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'completed',
    -- in_progress, completed, disputed
    disputed_reason     TEXT,
    resolved_at         TIMESTAMP,

    -- Linked incident (if new damage found)
    incident_id         UUID,  -- FK added after incidents table

    completed_at        TIMESTAMP DEFAULT NOW(),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_vehicle ON check_in_outs(vehicle_id);
CREATE INDEX idx_checkins_tenant ON check_in_outs(tenant_id, created_at DESC);

-- ============================================================
-- CHECK-IN/OUT PHOTOS
-- ============================================================

CREATE TABLE check_in_out_photos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_in_out_id UUID NOT NULL REFERENCES check_in_outs(id) ON DELETE CASCADE,
    photo_position  VARCHAR(30) NOT NULL,
    -- front, back, left_side, right_side, interior_front, interior_back,
    -- dashboard_km, fuel_gauge, trunk, tire_fl, tire_fr, tire_rl, tire_rr,
    -- damage_1, damage_2, damage_3, other
    file_url        VARCHAR(500) NOT NULL,
    thumbnail_url   VARCHAR(500),
    notes           VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkin_photos ON check_in_out_photos(check_in_out_id);
