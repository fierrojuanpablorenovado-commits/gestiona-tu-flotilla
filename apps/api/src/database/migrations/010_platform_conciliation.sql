-- ============================================================
-- FLEETCORE SaaS - MIGRATION 010: PLATFORM CONCILIATION
-- Uber Fleet / Didi Fleet / InDriver integration module
-- Weekly driver-fleet settlement reconciliation
-- ============================================================
--
-- BUSINESS CONTEXT (Mexican Fleet Market)
-- ========================================
-- Fleet owners in Mexico rent vehicles to drivers who operate on
-- ride-hailing platforms (Uber, Didi, InDriver, Beat). Each week
-- the fleet admin must reconcile what each driver earned on the
-- platforms against what the fleet charges for vehicle rental,
-- insurance, maintenance, etc.
--
-- WEEKLY SETTLEMENT CALCULATION:
-- -------------------------------------------------------
-- 1) Import platform earnings data (Excel, API, or email)
-- 2) Match trips to FleetCore drivers
-- 3) For each driver, sum across all platforms:
--      total_net_earnings  = uber_net + didi_net + indriver_net + ...
--      total_cash_collected = cash fares the driver already has in hand
-- 4) Sum fleet charges:
--      total_fleet_charges = weekly_rent + insurance + maintenance
--                          + penalties + deposit_installment + other
-- 5) Calculate balance:
--      balance = total_net_earnings - total_fleet_charges - total_cash_collected
--
--      The cash_collected is subtracted because platforms will NOT
--      transfer cash fares to the fleet; the driver already has that
--      money. So the driver effectively "owes" those cash fares back
--      to the settlement pool.
--
-- 6) Determine who owes whom:
--      If balance < 0 => driver_owes (driver must pay fleet)
--      If balance > 0 => fleet_owes  (fleet must pay driver)
--
-- 7) Apply previous week carry-over:
--      final_balance = balance + previous_balance
--
-- MEXICAN TAX CONTEXT:
--   Platforms retain ISR (income tax) and IVA (value-added tax) on
--   behalf of drivers as required by Mexican tax law (Art. 113-A LISR).
--   These retained amounts are tracked per trip for tax reporting.
-- ============================================================


-- ============================================================
-- 1. PLATFORM CONNECTIONS
-- Configured ride-hailing platform accounts per tenant.
-- A fleet may have multiple accounts on the same platform
-- (e.g. two Uber Fleet accounts for different cities).
-- ============================================================

CREATE TABLE platform_connections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Platform identification
    platform            VARCHAR(30) NOT NULL,
        -- uber, didi, indriver, beat
    account_name        VARCHAR(100),           -- human label, e.g. "Uber CDMX"
    account_id          VARCHAR(100),           -- platform-issued fleet account ID

    -- How we pull data
    access_method       VARCHAR(30) NOT NULL DEFAULT 'manual_upload',
        -- manual_upload  : admin uploads Excel/CSV from platform dashboard
        -- email_import   : platform sends weekly report to a monitored email
        -- api            : direct API integration (Uber Fleet API, etc.)
        -- scraping       : automated login + download (fragile, last resort)
    api_credentials     JSONB,                  -- encrypted tokens/keys for API access
    email_for_reports   VARCHAR(150),           -- email where platform sends reports

    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT true,
    last_sync_at        TIMESTAMPTZ,
    sync_status         VARCHAR(20) NOT NULL DEFAULT 'never',
        -- never, syncing, success, error
    sync_error          TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_connections IS
    'Configured ride-hailing platform accounts per tenant. Each row represents one fleet account on Uber/Didi/InDriver/Beat.';
COMMENT ON COLUMN platform_connections.api_credentials IS
    'Encrypted JSONB blob holding OAuth tokens or API keys. NEVER store plaintext secrets.';
COMMENT ON COLUMN platform_connections.access_method IS
    'How data is pulled: manual_upload (Excel), email_import, api (REST), scraping.';

CREATE INDEX idx_platform_connections_tenant ON platform_connections(tenant_id);
CREATE INDEX idx_platform_connections_platform ON platform_connections(tenant_id, platform);
CREATE INDEX idx_platform_connections_active ON platform_connections(tenant_id, is_active);
CREATE INDEX idx_platform_connections_sync ON platform_connections(sync_status);


-- ============================================================
-- 2. PLATFORM IMPORTS
-- Each time data is imported from a platform (file upload, API
-- sync, email parse). One import covers a date range and may
-- contain hundreds of trips.
-- ============================================================

CREATE TABLE platform_imports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id       UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,

    -- Import metadata
    import_type         VARCHAR(30) NOT NULL,
        -- file_upload, email_parse, api_sync
    file_url            TEXT,                   -- S3/storage URL of uploaded file
    file_name           VARCHAR(200),           -- original file name

    -- Period covered by this import
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,

    -- Processing status
    status              VARCHAR(20) NOT NULL DEFAULT 'processing',
        -- processing : parser is running
        -- completed  : all records parsed and matched
        -- error      : parser failed entirely
        -- partial    : parsed but some records could not be matched
    total_records       INTEGER NOT NULL DEFAULT 0,
    matched_records     INTEGER NOT NULL DEFAULT 0,   -- matched to a FleetCore driver
    unmatched_records   INTEGER NOT NULL DEFAULT 0,   -- could not match driver
    error_message       TEXT,

    -- Audit
    imported_by         UUID REFERENCES users(id),
    processed_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_imports IS
    'Each row = one data import event (file upload, API sync, email parse). Contains parsing stats and links to the source file.';

CREATE INDEX idx_platform_imports_tenant ON platform_imports(tenant_id);
CREATE INDEX idx_platform_imports_connection ON platform_imports(connection_id);
CREATE INDEX idx_platform_imports_period ON platform_imports(tenant_id, period_start, period_end);
CREATE INDEX idx_platform_imports_status ON platform_imports(status);
CREATE INDEX idx_platform_imports_imported_by ON platform_imports(imported_by);


-- ============================================================
-- 3. PLATFORM TRIPS
-- Individual trips parsed from platform exports. This is the
-- raw granular data: one row per ride.
--
-- The "matching" step links platform_driver_id/name to a
-- FleetCore driver_id using driver_platform_accounts.
-- ============================================================

CREATE TABLE platform_trips (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    import_id               UUID NOT NULL REFERENCES platform_imports(id) ON DELETE CASCADE,

    -- Platform info
    platform                VARCHAR(30) NOT NULL,       -- uber, didi, indriver, beat
    platform_trip_id        VARCHAR(100),               -- Uber/Didi trip ID for dedup

    -- Driver matching
    driver_id               UUID REFERENCES drivers(id),    -- matched FleetCore driver (NULL if unmatched)
    platform_driver_id      VARCHAR(100),               -- driver ID as it appears on the platform
    platform_driver_name    VARCHAR(200),               -- driver name on platform (for manual matching)

    -- Trip details
    trip_date               DATE NOT NULL,
    trip_start_time         TIMESTAMPTZ,
    trip_end_time           TIMESTAMPTZ,
    origin_address          TEXT,
    destination_address     TEXT,
    distance_km             DECIMAL(8,2),
    duration_minutes        DECIMAL(8,2),

    -- Financial breakdown (all in MXN)
    gross_fare              DECIMAL(10,2) NOT NULL DEFAULT 0,   -- total fare charged to passenger
    platform_commission     DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Uber/Didi cut
    platform_commission_pct DECIMAL(5,2),                       -- commission as percentage
    taxes_retained          DECIMAL(10,2) NOT NULL DEFAULT 0,   -- ISR + IVA total
    isr_retained            DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Mexican income tax retention
    iva_retained            DECIMAL(10,2) NOT NULL DEFAULT 0,   -- Mexican VAT retention
    tolls                   DECIMAL(10,2) NOT NULL DEFAULT 0,   -- highway tolls
    tips                    DECIMAL(10,2) NOT NULL DEFAULT 0,
    bonuses                 DECIMAL(10,2) NOT NULL DEFAULT 0,   -- platform incentives/promotions
    deductions              DECIMAL(10,2) NOT NULL DEFAULT 0,   -- platform-level deductions (phone rental, etc.)
    net_earnings            DECIMAL(10,2) NOT NULL DEFAULT 0,   -- what the driver actually earns for this trip

    -- Payment
    payment_method          VARCHAR(30),    -- cash, card, wallet
    cash_collected          DECIMAL(10,2) NOT NULL DEFAULT 0,   -- cash the driver physically collected

    -- Matching status
    is_matched              BOOLEAN NOT NULL DEFAULT false,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE platform_trips IS
    'Individual rides parsed from platform data exports. One row per trip. Financial breakdown follows Mexican tax rules (ISR/IVA retention).';
COMMENT ON COLUMN platform_trips.net_earnings IS
    'What the driver actually earns: gross_fare - platform_commission - taxes_retained - tolls - deductions + tips + bonuses.';
COMMENT ON COLUMN platform_trips.cash_collected IS
    'If the passenger paid cash, this is the amount the driver physically holds. Important for settlement: driver already has this money.';
COMMENT ON COLUMN platform_trips.is_matched IS
    'True when platform_driver_id has been linked to a FleetCore driver_id via driver_platform_accounts.';

CREATE INDEX idx_platform_trips_tenant ON platform_trips(tenant_id);
CREATE INDEX idx_platform_trips_import ON platform_trips(import_id);
CREATE INDEX idx_platform_trips_driver ON platform_trips(driver_id);
CREATE INDEX idx_platform_trips_date ON platform_trips(tenant_id, trip_date);
CREATE INDEX idx_platform_trips_platform ON platform_trips(tenant_id, platform);
CREATE INDEX idx_platform_trips_matched ON platform_trips(tenant_id, is_matched);
CREATE INDEX idx_platform_trips_platform_trip ON platform_trips(tenant_id, platform, platform_trip_id);
CREATE INDEX idx_platform_trips_platform_driver ON platform_trips(tenant_id, platform_driver_id);


-- ============================================================
-- 4. WEEKLY SETTLEMENTS
-- The core reconciliation record. One row per driver per week.
-- Aggregates platform earnings across all platforms, subtracts
-- fleet charges, and determines the net balance.
-- ============================================================

CREATE TABLE weekly_settlements (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id               UUID NOT NULL REFERENCES drivers(id),
    vehicle_id              UUID REFERENCES vehicles(id),

    -- Settlement period (typically Monday-Sunday)
    period_start            DATE NOT NULL,
    period_end              DATE NOT NULL,

    -- Workflow status
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft',
        -- draft      : trips imported, not yet calculated
        -- calculated : system computed all totals
        -- reviewed   : admin reviewed the numbers
        -- approved   : admin approved, ready for payment
        -- paid       : fully settled
        -- disputed   : driver disagrees with calculation

    -- ==========================================
    -- UBER breakdown
    -- ==========================================
    uber_gross              DECIMAL(10,2) NOT NULL DEFAULT 0,
    uber_commission         DECIMAL(10,2) NOT NULL DEFAULT 0,
    uber_taxes              DECIMAL(10,2) NOT NULL DEFAULT 0,   -- ISR + IVA retained by Uber
    uber_net                DECIMAL(10,2) NOT NULL DEFAULT 0,
    uber_trips              INTEGER NOT NULL DEFAULT 0,
    uber_cash               DECIMAL(10,2) NOT NULL DEFAULT 0,   -- cash fares on Uber

    -- ==========================================
    -- DIDI breakdown
    -- ==========================================
    didi_gross              DECIMAL(10,2) NOT NULL DEFAULT 0,
    didi_commission         DECIMAL(10,2) NOT NULL DEFAULT 0,
    didi_taxes              DECIMAL(10,2) NOT NULL DEFAULT 0,
    didi_net                DECIMAL(10,2) NOT NULL DEFAULT 0,
    didi_trips              INTEGER NOT NULL DEFAULT 0,
    didi_cash               DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- ==========================================
    -- INDRIVER breakdown
    -- ==========================================
    indriver_gross          DECIMAL(10,2) NOT NULL DEFAULT 0,
    indriver_net            DECIMAL(10,2) NOT NULL DEFAULT 0,
    indriver_trips          INTEGER NOT NULL DEFAULT 0,
    indriver_cash           DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- ==========================================
    -- Totals across all platforms
    -- ==========================================
    other_income            DECIMAL(10,2) NOT NULL DEFAULT 0,   -- manual adjustments, bonuses
    total_gross_earnings    DECIMAL(10,2) NOT NULL DEFAULT 0,   -- sum of all platform gross
    total_net_earnings      DECIMAL(10,2) NOT NULL DEFAULT 0,   -- sum of all platform net
    total_cash_collected    DECIMAL(10,2) NOT NULL DEFAULT 0,   -- sum of all cash fares
    total_trips             INTEGER NOT NULL DEFAULT 0,

    -- ==========================================
    -- Fleet charges to the driver
    -- ==========================================
    weekly_rent             DECIMAL(10,2) NOT NULL DEFAULT 0,   -- vehicle rental fee
    insurance_charge        DECIMAL(10,2) NOT NULL DEFAULT 0,   -- weekly insurance portion
    maintenance_charge      DECIMAL(10,2) NOT NULL DEFAULT 0,   -- repair costs caused by driver
    penalty_charges         DECIMAL(10,2) NOT NULL DEFAULT 0,   -- traffic fines, infractions
    deposit_installment     DECIMAL(10,2) NOT NULL DEFAULT 0,   -- if driver pays deposit in weekly parts
    other_charges           DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_fleet_charges     DECIMAL(10,2) NOT NULL DEFAULT 0,   -- sum of all charges above

    -- ==========================================
    -- Settlement balance
    -- ==========================================
    -- balance = total_net_earnings - total_fleet_charges - total_cash_collected
    balance                 DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Who owes whom (only one of these should be > 0)
    driver_owes             DECIMAL(10,2) NOT NULL DEFAULT 0,   -- driver pays fleet (balance < 0)
    fleet_owes              DECIMAL(10,2) NOT NULL DEFAULT 0,   -- fleet pays driver (balance > 0)

    -- Carry-over from previous week
    previous_balance        DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_balance           DECIMAL(10,2) NOT NULL DEFAULT 0,   -- balance + previous_balance

    -- Audit trail
    calculated_at           TIMESTAMPTZ,
    calculated_by           UUID REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    approved_by             UUID REFERENCES users(id),
    notes                   TEXT,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One settlement per driver per week per tenant
    CONSTRAINT uq_weekly_settlement UNIQUE (tenant_id, driver_id, period_start)
);

COMMENT ON TABLE weekly_settlements IS
    'Core reconciliation record: one row per driver per week. Aggregates all platform earnings, subtracts fleet charges, and determines net balance.';
COMMENT ON COLUMN weekly_settlements.balance IS
    'total_net_earnings - total_fleet_charges - total_cash_collected. Negative means driver owes fleet.';
COMMENT ON COLUMN weekly_settlements.total_cash_collected IS
    'Cash fares the driver already has in hand. Subtracted from balance because platforms do not transfer cash to the fleet.';
COMMENT ON COLUMN weekly_settlements.previous_balance IS
    'Carry-over from the prior week settlement. Positive = fleet owed driver, negative = driver owed fleet.';
COMMENT ON COLUMN weekly_settlements.final_balance IS
    'balance + previous_balance. The definitive amount for this settlement period.';
COMMENT ON COLUMN weekly_settlements.weekly_rent IS
    'The fixed weekly rental fee for the vehicle, as defined in the driver contract.';

CREATE INDEX idx_weekly_settlements_tenant ON weekly_settlements(tenant_id);
CREATE INDEX idx_weekly_settlements_driver ON weekly_settlements(tenant_id, driver_id);
CREATE INDEX idx_weekly_settlements_vehicle ON weekly_settlements(vehicle_id);
CREATE INDEX idx_weekly_settlements_period ON weekly_settlements(tenant_id, period_start, period_end);
CREATE INDEX idx_weekly_settlements_status ON weekly_settlements(tenant_id, status);
CREATE INDEX idx_weekly_settlements_approved_by ON weekly_settlements(approved_by);
CREATE INDEX idx_weekly_settlements_calculated_by ON weekly_settlements(calculated_by);


-- ============================================================
-- 5. SETTLEMENT PAYMENTS
-- Payments made against a weekly settlement. A settlement may
-- be paid in multiple installments (e.g. partial cash + transfer).
-- ============================================================

CREATE TABLE settlement_payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    settlement_id       UUID NOT NULL REFERENCES weekly_settlements(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    amount              DECIMAL(10,2) NOT NULL,
    payment_method      VARCHAR(30) NOT NULL,
        -- cash, transfer, deposit, card
    payment_reference   VARCHAR(100),           -- transfer confirmation number, etc.
    payment_date        DATE NOT NULL,
    evidence_url        TEXT,                   -- photo of receipt, transfer screenshot
    received_by         UUID REFERENCES users(id),
    notes               TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE settlement_payments IS
    'Payments applied against a weekly_settlement. Supports partial payments and multiple payment methods.';

CREATE INDEX idx_settlement_payments_settlement ON settlement_payments(settlement_id);
CREATE INDEX idx_settlement_payments_tenant ON settlement_payments(tenant_id);
CREATE INDEX idx_settlement_payments_date ON settlement_payments(payment_date);
CREATE INDEX idx_settlement_payments_received_by ON settlement_payments(received_by);


-- ============================================================
-- 6. DRIVER PLATFORM ACCOUNTS
-- Links FleetCore driver records to their accounts on each
-- ride-hailing platform. Used for automatic trip matching.
--
-- When a platform import contains trips with platform_driver_id
-- "UBER-12345", the system looks up this table to find which
-- FleetCore driver owns that platform account.
-- ============================================================

CREATE TABLE driver_platform_accounts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id               UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,

    -- Platform identification
    platform                VARCHAR(30) NOT NULL,       -- uber, didi, indriver, beat
    platform_driver_id      VARCHAR(100),               -- driver's ID on the platform
    platform_driver_name    VARCHAR(200),               -- name as shown on the platform
    platform_phone          VARCHAR(20),                -- phone registered on platform
    platform_email          VARCHAR(150),               -- email registered on platform
    platform_rating         DECIMAL(3,2),               -- current rating (e.g. 4.85)

    is_active               BOOLEAN NOT NULL DEFAULT true,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One account per driver per platform per tenant
    CONSTRAINT uq_driver_platform UNIQUE (tenant_id, driver_id, platform)
);

COMMENT ON TABLE driver_platform_accounts IS
    'Maps FleetCore drivers to their ride-hailing platform accounts. Used for automatic trip-to-driver matching during imports.';
COMMENT ON COLUMN driver_platform_accounts.platform_driver_id IS
    'The driver identifier as it appears in platform exports. Primary key for trip matching.';

CREATE INDEX idx_driver_platform_tenant ON driver_platform_accounts(tenant_id);
CREATE INDEX idx_driver_platform_driver ON driver_platform_accounts(driver_id);
CREATE INDEX idx_driver_platform_lookup ON driver_platform_accounts(tenant_id, platform, platform_driver_id);
CREATE INDEX idx_driver_platform_active ON driver_platform_accounts(tenant_id, is_active);


-- ============================================================
-- ENABLE ROW-LEVEL SECURITY (multi-tenant isolation)
-- ============================================================

ALTER TABLE platform_connections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_imports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_settlements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_platform_accounts  ENABLE ROW LEVEL SECURITY;

-- RLS policies: each tenant can only see their own data
CREATE POLICY tenant_isolation ON platform_connections
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation ON platform_imports
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation ON platform_trips
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation ON weekly_settlements
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation ON settlement_payments
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation ON driver_platform_accounts
    USING (tenant_id = current_setting('app.current_tenant')::UUID);


-- ============================================================
-- UPDATED_AT TRIGGERS
-- Reuses the set_updated_at() function from migration 001.
-- ============================================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON platform_connections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON driver_platform_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON weekly_settlements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
