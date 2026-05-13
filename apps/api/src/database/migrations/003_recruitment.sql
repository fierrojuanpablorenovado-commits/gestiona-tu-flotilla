-- ============================================================
-- FLEETCORE SaaS - MIGRATION 003: RECRUITMENT
-- Driver recruitment pipeline - the entry point of the business
-- ============================================================

-- ============================================================
-- RECRUITMENT LEADS
-- ============================================================

CREATE TABLE recruitment_leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Contact info
    full_name           VARCHAR(200) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    email               VARCHAR(200),
    date_of_birth       DATE,
    city                VARCHAR(100),
    zone                VARCHAR(100),       -- neighborhood / area

    -- Source tracking
    source              VARCHAR(30) NOT NULL DEFAULT 'web_form',
    -- web_form, whatsapp, referral, social_media, walk_in, facebook_ad, flyer
    source_detail       VARCHAR(200),       -- campaign name, ad id, etc.
    referred_by_driver  UUID REFERENCES drivers(id),
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),

    -- Pre-filter data
    age                 INTEGER,
    has_license         BOOLEAN,
    license_type        VARCHAR(10),
    license_expires     DATE,
    has_ine             BOOLEAN,
    has_criminal_check  BOOLEAN,
    has_proof_address   BOOLEAN,
    platform_experience VARCHAR(100),        -- uber, didi, indrive, none, multiple
    years_driving       INTEGER,
    owns_vehicle        BOOLEAN DEFAULT false,
    desired_shift       VARCHAR(20),         -- morning, afternoon, night, full, flexible
    available_start     DATE,                -- when can they start

    -- Scoring
    pre_filter_score    INTEGER DEFAULT 0,   -- 0-100 calculated
    risk_flags          JSONB DEFAULT '[]',  -- array of risk indicators

    -- Pipeline status
    status              VARCHAR(30) NOT NULL DEFAULT 'new',
    -- new → pre_filtered → documenting → docs_complete → interview_scheduled →
    -- interviewed → approved → onboarding → activated → withdrawn → rejected
    status_changed_at   TIMESTAMP DEFAULT NOW(),
    rejection_reason    VARCHAR(200),
    withdrawal_reason   VARCHAR(200),

    -- Assignment
    assigned_recruiter  UUID REFERENCES users(id),

    -- Conversion tracking
    days_in_pipeline    INTEGER DEFAULT 0,   -- calculated
    converted_driver_id UUID REFERENCES drivers(id), -- once activated

    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruitment_tenant ON recruitment_leads(tenant_id);
CREATE INDEX idx_recruitment_status ON recruitment_leads(tenant_id, status);
CREATE INDEX idx_recruitment_phone ON recruitment_leads(phone);
CREATE INDEX idx_recruitment_source ON recruitment_leads(source);
CREATE INDEX idx_recruitment_recruiter ON recruitment_leads(assigned_recruiter);
CREATE INDEX idx_recruitment_created ON recruitment_leads(tenant_id, created_at DESC);

-- ============================================================
-- RECRUITMENT DOCUMENTS
-- ============================================================

CREATE TABLE recruitment_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id         UUID NOT NULL REFERENCES recruitment_leads(id) ON DELETE CASCADE,
    document_type   VARCHAR(30) NOT NULL,
    -- ine_front, ine_back, license_front, license_back, proof_address,
    -- photo_portrait, criminal_check, reference_1, reference_2, reference_3, other
    file_url        VARCHAR(500) NOT NULL,
    file_name       VARCHAR(200),
    expiration_date DATE,
    is_valid        BOOLEAN,
    validated_by    UUID REFERENCES users(id),
    validated_at    TIMESTAMP,
    rejection_reason VARCHAR(200),
    notes           TEXT,
    uploaded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruit_docs_lead ON recruitment_documents(lead_id);

-- ============================================================
-- RECRUITMENT INTERVIEWS
-- ============================================================

CREATE TABLE recruitment_interviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id             UUID NOT NULL REFERENCES recruitment_leads(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_at        TIMESTAMP NOT NULL,
    duration_minutes    INTEGER DEFAULT 30,
    interview_type      VARCHAR(20) NOT NULL DEFAULT 'in_person',
    -- in_person, google_meet, whatsapp_call, phone
    meeting_link        VARCHAR(500),
    location            VARCHAR(200),

    -- Interviewer
    interviewer_id      UUID NOT NULL REFERENCES users(id),

    -- Result
    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- scheduled, confirmed, in_progress, completed, no_show, cancelled, rescheduled
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,

    -- Evaluation
    appearance_score    INTEGER CHECK (appearance_score BETWEEN 1 AND 5),
    communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
    experience_score    INTEGER CHECK (experience_score BETWEEN 1 AND 5),
    attitude_score      INTEGER CHECK (attitude_score BETWEEN 1 AND 5),
    reliability_score   INTEGER CHECK (reliability_score BETWEEN 1 AND 5),
    overall_score       DECIMAL(3,1),  -- average of above
    evaluation_notes    TEXT,

    -- Decision
    decision            VARCHAR(20), -- approved, rejected, waitlist, second_interview
    decision_reason     TEXT,
    decided_by          UUID REFERENCES users(id),
    decided_at          TIMESTAMP,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruit_interviews_lead ON recruitment_interviews(lead_id);
CREATE INDEX idx_recruit_interviews_date ON recruitment_interviews(scheduled_at);

-- ============================================================
-- RECRUITMENT ONBOARDING
-- ============================================================

CREATE TABLE recruitment_onboarding (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES recruitment_leads(id) ON DELETE CASCADE,

    -- Contract
    contract_signed         BOOLEAN DEFAULT false,
    contract_signed_at      TIMESTAMP,
    contract_file_url       VARCHAR(500),
    contract_type           VARCHAR(30),          -- daily, weekly, monthly

    -- Deposit
    deposit_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_paid            DECIMAL(10,2) DEFAULT 0,
    deposit_status          VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    deposit_due_date        DATE,

    -- Platform registration
    uber_registered         BOOLEAN DEFAULT false,
    uber_driver_id          VARCHAR(100),
    didi_registered         BOOLEAN DEFAULT false,
    didi_driver_id          VARCHAR(100),
    other_platform          VARCHAR(50),
    other_platform_id       VARCHAR(100),

    -- Vehicle assignment
    vehicle_assigned_id     UUID REFERENCES vehicles(id),
    checkin_completed       BOOLEAN DEFAULT false,
    checkin_id              UUID,                  -- FK to check_in_outs once created

    -- Induction
    induction_completed     BOOLEAN DEFAULT false,
    induction_date          DATE,
    induction_notes         TEXT,
    rules_acknowledged      BOOLEAN DEFAULT false,

    -- Activation
    activation_date         DATE,
    driver_id               UUID REFERENCES drivers(id), -- created driver record
    status                  VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    -- in_progress, completed, cancelled
    cancelled_reason        TEXT,

    -- Followup
    week1_followup          BOOLEAN DEFAULT false,
    week1_followup_notes    TEXT,
    week4_followup          BOOLEAN DEFAULT false,
    week4_followup_notes    TEXT,

    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruit_onboarding_lead ON recruitment_onboarding(lead_id);
CREATE INDEX idx_recruit_onboarding_status ON recruitment_onboarding(status);

-- ============================================================
-- RECRUITMENT SETTINGS (per tenant)
-- ============================================================

CREATE TABLE recruitment_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    min_age         INTEGER DEFAULT 21,
    max_age         INTEGER DEFAULT 65,
    require_license BOOLEAN DEFAULT true,
    require_ine     BOOLEAN DEFAULT true,
    require_criminal_check BOOLEAN DEFAULT true,
    require_proof_address  BOOLEAN DEFAULT true,
    require_references     INTEGER DEFAULT 2,   -- number of references required
    auto_reject_score      INTEGER DEFAULT 30,  -- below this = auto reject
    auto_approve_score     INTEGER DEFAULT 80,  -- above this = auto approve to docs
    referral_bonus         DECIMAL(10,2) DEFAULT 0,  -- bonus for referring driver
    welcome_message        TEXT,                 -- WhatsApp message for new leads
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RECRUITMENT ACTIVITY LOG
-- ============================================================

CREATE TABLE recruitment_activities (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id     UUID NOT NULL REFERENCES recruitment_leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    -- status_change, document_uploaded, document_validated, document_rejected,
    -- interview_scheduled, interview_completed, note_added, call_made,
    -- whatsapp_sent, email_sent, assigned_recruiter
    description TEXT NOT NULL,
    performed_by UUID REFERENCES users(id),
    metadata    JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recruit_activities_lead ON recruitment_activities(lead_id, created_at DESC);
