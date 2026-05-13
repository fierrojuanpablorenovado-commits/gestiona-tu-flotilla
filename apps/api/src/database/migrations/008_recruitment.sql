-- ============================================================
-- FLEETCORE SaaS - MIGRATION 008: RECRUITMENT MODULE (v2)
-- Expanded driver recruitment pipeline with configurable stages,
-- source tracking, interview management, document verification,
-- and daily aggregated metrics.
--
-- Context: Mexican fleet business (Uber, Didi, InDriver drivers)
-- renting vehicles. This module tracks candidates from first
-- contact through approval and vehicle assignment.
-- ============================================================

-- ============================================================
-- RECRUITMENT SOURCES
-- Where candidates come from. Tracks cost per lead to measure
-- ROI of each acquisition channel (Facebook Ads, referrals,
-- street flyers, WhatsApp campaigns, etc.)
-- ============================================================

CREATE TABLE recruitment_sources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- e.g. "Facebook Ads", "Referido", "WhatsApp", "Volanteo", "Sitio Web"
    type            VARCHAR(50) NOT NULL,        -- digital, referral, field, organic
    is_active       BOOLEAN NOT NULL DEFAULT true,
    cost_per_lead   DECIMAL(10,2) DEFAULT 0,     -- MXN cost per lead from this source
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

COMMENT ON TABLE recruitment_sources IS 'Acquisition channels for driver candidates. Used to track cost-per-lead and conversion by source.';

CREATE INDEX idx_recruitment_sources_tenant ON recruitment_sources(tenant_id);
CREATE INDEX idx_recruitment_sources_active ON recruitment_sources(tenant_id, is_active);

-- ============================================================
-- RECRUITMENT CANDIDATES
-- People interested in renting a vehicle to drive for Uber,
-- Didi, InDriver, etc. Central entity of the recruitment
-- pipeline. Tracks all pre-qualification data, platform
-- accounts, financial capacity, and pipeline status.
-- ============================================================

CREATE TABLE recruitment_candidates (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_id               UUID NOT NULL REFERENCES recruitment_sources(id),
    referred_by_driver_id   UUID REFERENCES drivers(id),    -- populated when source type = referral

    -- Personal info
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    phone                   VARCHAR(20) NOT NULL,            -- primary contact (WhatsApp)
    email                   VARCHAR(150),
    city                    VARCHAR(100),
    zone                    VARCHAR(100),                    -- colonia / area where they operate

    -- Platform accounts
    has_uber_account        BOOLEAN NOT NULL DEFAULT false,
    has_didi_account        BOOLEAN NOT NULL DEFAULT false,
    has_indriver_account    BOOLEAN NOT NULL DEFAULT false,
    uber_rating             DECIMAL(3,2),                    -- e.g. 4.85
    didi_rating             DECIMAL(3,2),                    -- e.g. 4.90
    years_driving           INTEGER,                         -- years of rideshare experience

    -- License & documentation readiness
    has_license             BOOLEAN NOT NULL DEFAULT false,
    license_type            VARCHAR(20),                     -- A, B, C, D, E per MX categories
    license_expiry          DATE,
    has_own_vehicle         BOOLEAN NOT NULL DEFAULT false,

    -- Preferences & financial capacity
    preferred_vehicle_type  VARCHAR(50),                     -- sedan, suv, compact
    preferred_shift         VARCHAR(20) NOT NULL DEFAULT 'flexible',
    -- morning, afternoon, night, flexible
    weekly_income_goal      DECIMAL(10,2),                   -- MXN target weekly income
    deposit_capacity        DECIMAL(10,2),                   -- MXN they can put as security deposit

    -- Pipeline
    status                  VARCHAR(30) NOT NULL DEFAULT 'new',
    -- new, contacted, interview_scheduled, interview_done,
    -- documents_pending, documents_review, approved, rejected,
    -- assigned, withdrawn
    rejection_reason        TEXT,
    score                   INTEGER NOT NULL DEFAULT 0,      -- 0-100 calculated recruitment score
    notes                   TEXT,

    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recruitment_candidates IS 'Driver candidates progressing through the recruitment pipeline. Tracks qualifications, platform experience, and financial readiness.';

CREATE INDEX idx_rc_tenant ON recruitment_candidates(tenant_id);
CREATE INDEX idx_rc_tenant_status ON recruitment_candidates(tenant_id, status);
CREATE INDEX idx_rc_phone ON recruitment_candidates(phone);
CREATE INDEX idx_rc_source ON recruitment_candidates(source_id);
CREATE INDEX idx_rc_referred_by ON recruitment_candidates(referred_by_driver_id) WHERE referred_by_driver_id IS NOT NULL;
CREATE INDEX idx_rc_tenant_created ON recruitment_candidates(tenant_id, created_at DESC);
CREATE INDEX idx_rc_score ON recruitment_candidates(tenant_id, score DESC);

-- ============================================================
-- RECRUITMENT PIPELINE STAGES
-- Configurable pipeline stages per tenant. Each stage can have
-- an SLA (max hours before an alert fires) and an auto-action
-- (e.g. send WhatsApp, request documents). order_index defines
-- the display/progression order in the Kanban board.
-- ============================================================

CREATE TABLE recruitment_pipeline_stages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    order_index     INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    auto_action     VARCHAR(50),                 -- send_whatsapp, schedule_interview, request_docs
    sla_hours       INTEGER,                     -- max hours in this stage before alert
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, order_index)
);

COMMENT ON TABLE recruitment_pipeline_stages IS 'Configurable Kanban-style pipeline stages. Tenants define their own recruitment flow with optional SLAs and automation triggers.';

CREATE INDEX idx_rps_tenant ON recruitment_pipeline_stages(tenant_id);
CREATE INDEX idx_rps_tenant_order ON recruitment_pipeline_stages(tenant_id, order_index);

-- ============================================================
-- RECRUITMENT CANDIDATE STAGES
-- Tracks each candidate's movement through pipeline stages.
-- Creates a full audit trail: who moved them, when they entered
-- and exited each stage, and any notes.
-- ============================================================

CREATE TABLE recruitment_candidate_stages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    stage_id        UUID NOT NULL REFERENCES recruitment_pipeline_stages(id),
    entered_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    exited_at       TIMESTAMP,
    moved_by        UUID REFERENCES users(id),   -- who moved the candidate to this stage
    notes           TEXT
);

COMMENT ON TABLE recruitment_candidate_stages IS 'Audit trail of candidate movement through pipeline stages. Each row is one stage visit with entry/exit timestamps.';

CREATE INDEX idx_rcs_candidate ON recruitment_candidate_stages(candidate_id);
CREATE INDEX idx_rcs_stage ON recruitment_candidate_stages(stage_id);
CREATE INDEX idx_rcs_entered ON recruitment_candidate_stages(entered_at DESC);
CREATE INDEX idx_rcs_active ON recruitment_candidate_stages(candidate_id, exited_at) WHERE exited_at IS NULL;

-- ============================================================
-- RECRUITMENT INTERVIEWS
-- Interview scheduling and evaluation. Supports in-person
-- (at the fleet office), video calls, and phone screens.
-- ============================================================

CREATE TABLE recruitment_interviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMP NOT NULL,
    interview_type  VARCHAR(30) NOT NULL DEFAULT 'in_person',
    -- in_person, video_call, phone
    location        VARCHAR(200),                -- office address for in_person
    meeting_link    VARCHAR(500),                -- Google Meet / Zoom link for video_call
    interviewer_id  UUID REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- scheduled, confirmed, completed, no_show, cancelled
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes           TEXT,
    completed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recruitment_interviews IS 'Interview scheduling and results. Tracks type, location/link, status, interviewer rating (1-5), and completion.';

CREATE INDEX idx_ri_candidate ON recruitment_interviews(candidate_id);
CREATE INDEX idx_ri_scheduled ON recruitment_interviews(scheduled_at);
CREATE INDEX idx_ri_status ON recruitment_interviews(status);
CREATE INDEX idx_ri_interviewer ON recruitment_interviews(interviewer_id) WHERE interviewer_id IS NOT NULL;

-- ============================================================
-- RECRUITMENT DOCUMENTS
-- Documents submitted by candidates for verification: INE
-- (Mexican voter ID), driver license, proof of address,
-- criminal record check, selfie, and personal references.
-- ============================================================

CREATE TABLE recruitment_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id    UUID NOT NULL REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
    document_type   VARCHAR(50) NOT NULL,
    -- ine_front, ine_back, license_front, license_back,
    -- proof_address, criminal_record, selfie, references
    file_url        TEXT NOT NULL,
    file_name       VARCHAR(200),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, approved, rejected
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMP,
    rejection_reason TEXT,
    uploaded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recruitment_documents IS 'Candidate-uploaded documents (INE, license, proof of address, etc.) with review workflow and approval status.';

CREATE INDEX idx_rd_candidate ON recruitment_documents(candidate_id);
CREATE INDEX idx_rd_status ON recruitment_documents(status);
CREATE INDEX idx_rd_candidate_type ON recruitment_documents(candidate_id, document_type);

-- ============================================================
-- RECRUITMENT METRICS
-- Daily aggregated metrics per acquisition source. Powers the
-- recruitment dashboard and source ROI analysis. One row per
-- tenant + source + date combination.
-- ============================================================

CREATE TABLE recruitment_metrics (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_id               UUID NOT NULL REFERENCES recruitment_sources(id),
    date                    DATE NOT NULL,
    leads_count             INTEGER NOT NULL DEFAULT 0,
    contacted_count         INTEGER NOT NULL DEFAULT 0,
    interviews_scheduled    INTEGER NOT NULL DEFAULT 0,
    interviews_completed    INTEGER NOT NULL DEFAULT 0,
    approved_count          INTEGER NOT NULL DEFAULT 0,
    rejected_count          INTEGER NOT NULL DEFAULT 0,
    assigned_count          INTEGER NOT NULL DEFAULT 0,
    avg_days_to_assign      DECIMAL(5,1),            -- average calendar days from lead to assignment
    cost_total              DECIMAL(10,2) NOT NULL DEFAULT 0,  -- total spend for this source on this date
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, source_id, date)
);

COMMENT ON TABLE recruitment_metrics IS 'Daily aggregated recruitment funnel metrics per source. Enables ROI dashboards and source performance comparison.';

CREATE INDEX idx_rm_tenant ON recruitment_metrics(tenant_id);
CREATE INDEX idx_rm_tenant_date ON recruitment_metrics(tenant_id, date DESC);
CREATE INDEX idx_rm_source ON recruitment_metrics(source_id);
CREATE INDEX idx_rm_source_date ON recruitment_metrics(source_id, date DESC);

-- ============================================================
-- DEFAULT PIPELINE STAGES
-- Seed data function: inserts a standard pipeline for a tenant.
-- Called from the application when a tenant enables recruitment.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_recruitment_pipeline(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO recruitment_pipeline_stages (tenant_id, name, order_index, auto_action, sla_hours) VALUES
        (p_tenant_id, 'Nuevo',                  1, 'send_whatsapp',      2),
        (p_tenant_id, 'Contactado',             2, NULL,                 24),
        (p_tenant_id, 'Entrevista Programada',  3, 'schedule_interview', 48),
        (p_tenant_id, 'Entrevista Realizada',   4, NULL,                 24),
        (p_tenant_id, 'Documentos Pendientes',  5, 'request_docs',       72),
        (p_tenant_id, 'Documentos en Revision', 6, NULL,                 48),
        (p_tenant_id, 'Aprobado',               7, NULL,                 24),
        (p_tenant_id, 'Asignado',               8, NULL,                 NULL),
        (p_tenant_id, 'Rechazado',              9, NULL,                 NULL),
        (p_tenant_id, 'Retirado',              10, NULL,                 NULL)
    ON CONFLICT (tenant_id, order_index) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_recruitment_pipeline(UUID) IS 'Seeds default recruitment pipeline stages for a new tenant. Safe to call multiple times (uses ON CONFLICT).';

-- ============================================================
-- UPDATED_AT TRIGGERS
-- Automatically set updated_at on row modification for tables
-- that carry the column.
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recruitment_sources_updated
    BEFORE UPDATE ON recruitment_sources
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recruitment_candidates_updated
    BEFORE UPDATE ON recruitment_candidates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recruitment_interviews_updated
    BEFORE UPDATE ON recruitment_interviews
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recruitment_metrics_updated
    BEFORE UPDATE ON recruitment_metrics
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
