-- ============================================================
-- FLEETCORE SaaS - MIGRATION 006: TREASURY & PLATFORM CONCILIATION
-- Financial control + Uber/Didi integration
-- ============================================================

-- ============================================================
-- FINANCIAL TRANSACTIONS (universal ledger)
-- ============================================================

CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_number  VARCHAR(30),

    -- Classification
    type                VARCHAR(10) NOT NULL,  -- income, expense
    category            VARCHAR(50) NOT NULL,
    -- INCOME: driver_rent, platform_earnings, deposit_payment, late_fee, other_income
    -- EXPENSE: maintenance, fuel, insurance, taxes, workshop_payment, salary,
    --          rent_office, toll, partner_payout, refund, other_expense
    subcategory         VARCHAR(50),

    -- Amount
    amount              DECIMAL(12,2) NOT NULL,
    tax_amount          DECIMAL(10,2) DEFAULT 0,
    total_amount        DECIMAL(12,2) NOT NULL,  -- amount + tax
    currency            VARCHAR(3) DEFAULT 'MXN',

    -- Related entities
    vehicle_id          UUID REFERENCES vehicles(id),
    driver_id           UUID REFERENCES drivers(id),
    partner_id          UUID REFERENCES partners(id),
    contract_id         UUID REFERENCES contracts(id),
    maintenance_id      UUID REFERENCES maintenance_orders(id),
    conciliation_id     UUID,  -- FK added after conciliation table

    -- Payment info
    payment_method      VARCHAR(30),  -- cash, transfer, card, check, platform
    payment_reference   VARCHAR(100),
    payment_date        DATE NOT NULL,
    due_date            DATE,
    bank_account        VARCHAR(50),

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, confirmed, cancelled, overdue
    confirmed_by        UUID REFERENCES users(id),
    confirmed_at        TIMESTAMP,

    -- Evidence
    receipt_url         VARCHAR(500),
    invoice_url         VARCHAR(500),
    invoice_number      VARCHAR(50),

    -- Recurrence
    is_recurring        BOOLEAN DEFAULT false,
    recurrence_rule     VARCHAR(50),  -- weekly, biweekly, monthly

    description         VARCHAR(500),
    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX idx_transactions_type ON transactions(tenant_id, type, payment_date);
CREATE INDEX idx_transactions_vehicle ON transactions(vehicle_id);
CREATE INDEX idx_transactions_driver ON transactions(driver_id);
CREATE INDEX idx_transactions_partner ON transactions(partner_id);
CREATE INDEX idx_transactions_status ON transactions(tenant_id, status);
CREATE INDEX idx_transactions_date ON transactions(tenant_id, payment_date DESC);
CREATE INDEX idx_transactions_due ON transactions(due_date) WHERE status = 'pending';

-- ============================================================
-- PLATFORM CONNECTIONS (Uber, Didi, InDriver accounts)
-- ============================================================

CREATE TABLE platform_connections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform        VARCHAR(20) NOT NULL,  -- uber, didi, indrive
    account_name    VARCHAR(200),
    account_id      VARCHAR(200),

    -- Uber API credentials
    client_id       VARCHAR(200),
    client_secret   VARCHAR(200),  -- encrypted
    access_token    TEXT,           -- encrypted
    refresh_token   TEXT,           -- encrypted
    token_expires_at TIMESTAMP,
    org_id          VARCHAR(200),  -- Uber org UUID
    scopes          JSONB DEFAULT '[]',

    -- Import config
    import_method   VARCHAR(20) DEFAULT 'manual',  -- api, email_parse, manual_upload
    import_email    VARCHAR(200),                   -- for email parse method
    auto_import     BOOLEAN DEFAULT false,
    last_import_at  TIMESTAMP,
    last_import_status VARCHAR(20),

    is_active       BOOLEAN DEFAULT true,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_conn_tenant ON platform_connections(tenant_id);

-- ============================================================
-- PLATFORM RAW IMPORTS (raw data from Uber/Didi)
-- ============================================================

CREATE TABLE platform_imports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id   UUID REFERENCES platform_connections(id),
    platform        VARCHAR(20) NOT NULL,  -- uber, didi, indrive
    import_type     VARCHAR(20) NOT NULL,  -- api_sync, file_upload, email_parse
    file_url        VARCHAR(500),          -- uploaded file
    file_name       VARCHAR(200),

    -- Period
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,

    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, processing, completed, failed, partial
    error_message   TEXT,
    records_total   INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    records_failed  INTEGER DEFAULT 0,

    imported_by     UUID REFERENCES users(id),
    processed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imports_tenant ON platform_imports(tenant_id, created_at DESC);

-- ============================================================
-- PLATFORM EARNINGS (parsed data per driver per day)
-- ============================================================

CREATE TABLE platform_earnings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    import_id           UUID NOT NULL REFERENCES platform_imports(id),
    platform            VARCHAR(20) NOT NULL,
    driver_id           UUID REFERENCES drivers(id),
    driver_platform_id  VARCHAR(100),      -- ID del chofer en la plataforma
    driver_name         VARCHAR(200),      -- as reported by platform

    -- Period
    earning_date        DATE NOT NULL,

    -- Trips
    total_trips         INTEGER DEFAULT 0,
    total_hours_online  DECIMAL(6,2),

    -- Earnings breakdown
    gross_fares         DECIMAL(10,2) DEFAULT 0,   -- tarifas brutas
    surge_earnings      DECIMAL(10,2) DEFAULT 0,   -- tarifa dinamica
    tips                DECIMAL(10,2) DEFAULT 0,   -- propinas
    promotions          DECIMAL(10,2) DEFAULT 0,   -- bonos/incentivos
    cancellation_fees   DECIMAL(10,2) DEFAULT 0,
    tolls_collected     DECIMAL(10,2) DEFAULT 0,
    other_earnings      DECIMAL(10,2) DEFAULT 0,
    total_gross         DECIMAL(10,2) DEFAULT 0,   -- sum of above

    -- Deductions breakdown
    platform_commission DECIMAL(10,2) DEFAULT 0,   -- comision plataforma
    booking_fee         DECIMAL(10,2) DEFAULT 0,   -- cuota de solicitud
    isr_retention       DECIMAL(10,2) DEFAULT 0,   -- retencion ISR
    iva_retention       DECIMAL(10,2) DEFAULT 0,   -- retencion IVA
    tolls_paid          DECIMAL(10,2) DEFAULT 0,
    other_deductions    DECIMAL(10,2) DEFAULT 0,
    total_deductions    DECIMAL(10,2) DEFAULT 0,   -- sum of above

    -- Net
    net_earnings        DECIMAL(10,2) DEFAULT 0,   -- total_gross - total_deductions

    -- Cash vs digital
    cash_collected      DECIMAL(10,2) DEFAULT 0,   -- efectivo cobrado por chofer
    digital_earnings    DECIMAL(10,2) DEFAULT 0,   -- transferencia de plataforma

    -- Raw data
    raw_data            JSONB,             -- original record for reference

    is_matched          BOOLEAN DEFAULT false,  -- matched to a driver in system
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_earnings_tenant ON platform_earnings(tenant_id);
CREATE INDEX idx_earnings_driver ON platform_earnings(driver_id, earning_date);
CREATE INDEX idx_earnings_date ON platform_earnings(tenant_id, earning_date);
CREATE INDEX idx_earnings_import ON platform_earnings(import_id);

-- ============================================================
-- WEEKLY CONCILIATION (cuenta semanal por chofer)
-- ============================================================

CREATE TABLE weekly_conciliations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    driver_id           UUID NOT NULL REFERENCES drivers(id),
    vehicle_id          UUID REFERENCES vehicles(id),
    contract_id         UUID REFERENCES contracts(id),

    -- Period
    week_start          DATE NOT NULL,
    week_end            DATE NOT NULL,
    period_label        VARCHAR(50),         -- "Semana 12 - Mar 2026"

    -- Platform earnings (aggregated from platform_earnings)
    uber_gross          DECIMAL(10,2) DEFAULT 0,
    uber_deductions     DECIMAL(10,2) DEFAULT 0,
    uber_net            DECIMAL(10,2) DEFAULT 0,
    uber_cash           DECIMAL(10,2) DEFAULT 0,
    uber_trips          INTEGER DEFAULT 0,

    didi_gross          DECIMAL(10,2) DEFAULT 0,
    didi_deductions     DECIMAL(10,2) DEFAULT 0,
    didi_net            DECIMAL(10,2) DEFAULT 0,
    didi_cash           DECIMAL(10,2) DEFAULT 0,
    didi_trips          INTEGER DEFAULT 0,

    other_gross         DECIMAL(10,2) DEFAULT 0,
    other_net           DECIMAL(10,2) DEFAULT 0,

    total_platform_net  DECIMAL(10,2) DEFAULT 0,
    total_cash_collected DECIMAL(10,2) DEFAULT 0,
    total_trips         INTEGER DEFAULT 0,

    -- Fleet charges
    weekly_rent         DECIMAL(10,2) DEFAULT 0,
    fuel_charges        DECIMAL(10,2) DEFAULT 0,
    damage_charges      DECIMAL(10,2) DEFAULT 0,   -- multas, danos
    deposit_charge      DECIMAL(10,2) DEFAULT 0,   -- abono a deposito
    late_payment_fee    DECIMAL(10,2) DEFAULT 0,
    other_charges       DECIMAL(10,2) DEFAULT 0,
    total_charges       DECIMAL(10,2) DEFAULT 0,

    -- Credits
    credits             DECIMAL(10,2) DEFAULT 0,   -- ajustes a favor

    -- Balance
    balance             DECIMAL(10,2) DEFAULT 0,
    -- positive = driver owes fleet, negative = fleet owes driver
    previous_balance    DECIMAL(10,2) DEFAULT 0,   -- carried from last week
    final_balance       DECIMAL(10,2) DEFAULT 0,   -- balance + previous_balance

    -- Status
    status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- draft, pending_review, approved, disputed, paid, partial_paid
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP,
    disputed_reason     TEXT,

    -- Payment
    amount_paid         DECIMAL(10,2) DEFAULT 0,
    payment_date        DATE,
    payment_method      VARCHAR(30),
    payment_reference   VARCHAR(100),
    payment_evidence_url VARCHAR(500),

    -- Receipt
    receipt_url         VARCHAR(500),        -- PDF generated
    sent_to_driver      BOOLEAN DEFAULT false,
    sent_at             TIMESTAMP,

    notes               TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, driver_id, week_start)
);

ALTER TABLE transactions ADD CONSTRAINT fk_transactions_conciliation
    FOREIGN KEY (conciliation_id) REFERENCES weekly_conciliations(id);

CREATE INDEX idx_conciliation_tenant ON weekly_conciliations(tenant_id);
CREATE INDEX idx_conciliation_driver ON weekly_conciliations(driver_id, week_start DESC);
CREATE INDEX idx_conciliation_status ON weekly_conciliations(tenant_id, status);
CREATE INDEX idx_conciliation_week ON weekly_conciliations(tenant_id, week_start);

-- ============================================================
-- PARTNER PROFIT DISTRIBUTION
-- ============================================================

CREATE TABLE partner_distributions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id      UUID NOT NULL REFERENCES partners(id),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    period_label    VARCHAR(50),

    -- Revenue
    total_income    DECIMAL(12,2) DEFAULT 0,
    total_expenses  DECIMAL(12,2) DEFAULT 0,
    gross_profit    DECIMAL(12,2) DEFAULT 0,
    partner_share   DECIMAL(5,2),          -- percentage
    partner_amount  DECIMAL(12,2) DEFAULT 0,

    -- Payment
    status          VARCHAR(20) DEFAULT 'calculated',  -- calculated, approved, paid, partial
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    payment_date    DATE,
    payment_method  VARCHAR(30),
    payment_reference VARCHAR(100),

    -- Report
    report_url      VARCHAR(500),
    sent_to_partner BOOLEAN DEFAULT false,

    approved_by     UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_dist ON partner_distributions(partner_id, period_start);
CREATE INDEX idx_partner_dist_vehicle ON partner_distributions(vehicle_id);
