-- ============================================================================
-- NIVAARAN: CAMPUS GRIEVANCE REDRESSAL PLATFORM
-- 
-- Architectural Rule:
-- 1. Strictly isolated database boundaries per service.
-- 2. No table may belong to more than one service.
-- 3. No cross-database foreign key constraints (strict loose coupling).
-- 4. Cross-service references use logical foreign keys (IDs passed via contracts).
-- ============================================================================

-- ############################################################################
-- SERVICE 1: ACCOUNTS SERVICE (Database: nivaaran_accounts)
-- Owns: users, credentials, roles, sessions
-- Responsible Team Member: Aarambhika (Roll No: 20251651001)
-- ############################################################################

CREATE TABLE users (
    user_id VARCHAR(64) PRIMARY KEY, -- Student Roll Number (e.g., '20251651001') or Staff ID ('W001')
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'warden', 'mess_incharge', 'maintenance_staff', 'admin')),
    department_scope VARCHAR(32) CHECK (department_scope IN ('hostel', 'mess', 'campus', 'all')),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);


-- ############################################################################
-- SERVICE 2: DIRECTORY SERVICE (Database: nivaaran_directory)
-- Owns: categories, locations, SLA deadline hours
-- Responsible Team Member: Aarambhika (Roll No: 20251651001)
-- ############################################################################

CREATE TABLE categories (
    category_id VARCHAR(32) PRIMARY KEY, -- 'hostel', 'mess', 'campus'
    display_name VARCHAR(80) NOT NULL,
    description TEXT,
    default_sla_hours INT NOT NULL CHECK (default_sla_hours > 0),
    urgent_sla_hours INT NOT NULL CHECK (urgent_sla_hours > 0),
    escalation_tier VARCHAR(32) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    location_id VARCHAR(64) PRIMARY KEY, -- 'hostel_block_a', 'mess_hall_1', etc.
    category_id VARCHAR(32) NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    zone_name VARCHAR(80) NOT NULL,
    landmark VARCHAR(120),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_category ON locations(category_id);


-- ############################################################################
-- SERVICE 3: COMPLAINTS SERVICE (Database: nivaaran_complaints)
-- Owns: complaints, status history, comments, student feedback
-- Responsible Team Members: Abhishek (Roll No: 20251651006) & Ritik (Roll No: 20251651078)
-- ############################################################################

CREATE TABLE complaints (
    complaint_id VARCHAR(64) PRIMARY KEY, -- UUID or custom ID (e.g. 'CMP-2026-00142')
    tracking_number VARCHAR(32) UNIQUE NOT NULL,
    
    -- Logical Reference to Accounts Service (No DB-level FK constraint!)
    reporter_user_id VARCHAR(64) NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Logical References to Directory Service (No DB-level FK constraint!)
    category_id VARCHAR(32) NOT NULL,
    location_id VARCHAR(64) NOT NULL,
    
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL CHECK (priority IN ('normal', 'urgent')),
    
    current_status VARCHAR(32) NOT NULL DEFAULT 'submitted' CHECK (
        current_status IN (
            'needs_triage',
            'submitted',
            'assigned',
            'in_progress',
            'resolved',
            'closed',
            'escalated',
            'withdrawn'
        )
    ),
    
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_reason TEXT,
    
    -- Idempotency key for safe client retries
    idempotency_key VARCHAR(128) UNIQUE,
    etag VARCHAR(64) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_status_history (
    history_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_by_user_id VARCHAR(64) NOT NULL, -- Logical reference to Accounts user
    actor_role VARCHAR(32) NOT NULL,
    remarks TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_comments (
    comment_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    author_user_id VARCHAR(64) NOT NULL, -- Logical reference to Accounts user
    author_role VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Internal staff notes vs public student notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_feedback (
    feedback_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) UNIQUE NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
    student_user_id VARCHAR(64) NOT NULL, -- Logical reference to Accounts user
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    is_reopened BOOLEAN NOT NULL DEFAULT FALSE,
    reopen_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_complaints_reporter ON complaints(reporter_user_id);
CREATE INDEX idx_complaints_status ON complaints(current_status);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_complaints_deadline ON complaints(sla_deadline);
CREATE INDEX idx_history_complaint ON complaint_status_history(complaint_id);
CREATE INDEX idx_comments_complaint ON complaint_comments(complaint_id);


-- ############################################################################
-- SERVICE 4: RESOLUTION SERVICE (Database: nivaaran_resolution)
-- Owns: staff assignments, duty schedules, dispatch queues
-- Responsible Team Member: Abhishek (Roll No: 20251651006)
-- ############################################################################

CREATE TABLE staff_assignments (
    assignment_id VARCHAR(64) PRIMARY KEY,
    
    -- Logical Reference to Complaints Service
    complaint_id VARCHAR(64) UNIQUE NOT NULL,
    
    -- Logical References to Accounts Service (Staff & Admin)
    assigned_staff_id VARCHAR(64) NOT NULL,
    assigned_by_user_id VARCHAR(64) NOT NULL,
    
    department_scope VARCHAR(32) NOT NULL,
    assignment_status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (
        assignment_status IN ('active', 'reassigned', 'completed', 'transferred')
    ),
    
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE staff_duty_roster (
    roster_id VARCHAR(64) PRIMARY KEY,
    staff_user_id VARCHAR(64) NOT NULL, -- Logical reference to Accounts user
    department_scope VARCHAR(32) NOT NULL,
    shift_date DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
    active_complaints_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_staff ON staff_assignments(assigned_staff_id);
CREATE INDEX idx_assignments_complaint ON staff_assignments(complaint_id);
CREATE INDEX idx_roster_staff_date ON staff_duty_roster(staff_user_id, shift_date);


-- ############################################################################
-- SERVICE 5: NOTIFICATIONS SERVICE (Database: nivaaran_notifications)
-- Owns: message dispatch log, delivery receipts, notification preferences
-- Responsible Team Member: Ritik (Roll No: 20251651078)
-- ############################################################################

CREATE TABLE notifications_log (
    notification_id VARCHAR(64) PRIMARY KEY,
    recipient_user_id VARCHAR(64) NOT NULL, -- Logical reference to Accounts user
    recipient_contact VARCHAR(120) NOT NULL, -- Phone or Email
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('sms', 'email', 'in_app')),
    event_type VARCHAR(48) NOT NULL, -- 'complaint_filed', 'assigned', 'resolved', 'escalated'
    
    -- Logical Reference to Complaints Service
    related_complaint_id VARCHAR(64),
    
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    
    delivery_status VARCHAR(24) NOT NULL DEFAULT 'queued' CHECK (
        delivery_status IN ('queued', 'sent', 'delivered', 'failed')
    ),
    external_provider_id VARCHAR(100),
    retry_count INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON notifications_log(recipient_user_id);
CREATE INDEX idx_notifications_complaint ON notifications_log(related_complaint_id);
CREATE INDEX idx_notifications_status ON notifications_log(delivery_status);


-- ############################################################################
-- SERVICE 6: ANALYTICS & AUDIT SERVICE (Database: nivaaran_analytics)
-- Owns: immutable audit events, SLA performance telemetry, escalation incident reports
-- Responsible Team: Full Team (Aarambhika, Abhishek, Ritik)
-- ############################################################################

CREATE TABLE audit_events_log (
    event_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL, -- 'complaint_created', 'status_changed', 'escalated', 'assigned', 'feedback_submitted'
    entity_type VARCHAR(32) NOT NULL, -- 'complaint', 'user', 'assignment', 'notification'
    entity_id VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(64), -- Logical reference to Accounts user (nullable for anonymous)
    actor_role VARCHAR(32),
    origin_service VARCHAR(32) NOT NULL, -- 'complaints', 'resolution', 'accounts', 'notifications'
    previous_state VARCHAR(64),
    new_state VARCHAR(64),
    payload_snapshot TEXT, -- JSON payload snapshot of change
    client_ip VARCHAR(45),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sla_performance_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(32) NOT NULL, -- Logical reference to Directory category
    snapshot_date DATE NOT NULL,
    total_filed INT NOT NULL DEFAULT 0,
    total_resolved INT NOT NULL DEFAULT 0,
    resolved_within_sla INT NOT NULL DEFAULT 0,
    breached_sla_count INT NOT NULL DEFAULT 0,
    average_resolution_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    compliance_rate_pct DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE escalation_incident_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL, -- Logical reference to Complaints service
    category_id VARCHAR(32) NOT NULL,
    initiator_user_id VARCHAR(64) NOT NULL,
    breach_hours_exceeded DECIMAL(6, 2) NOT NULL,
    escalation_tier VARCHAR(32) NOT NULL DEFAULT 'admin',
    reason TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_events_log(entity_type, entity_id);
CREATE INDEX idx_audit_event_type ON audit_events_log(event_type);
CREATE INDEX idx_audit_timestamp ON audit_events_log(event_timestamp);
CREATE INDEX idx_sla_category_date ON sla_performance_snapshots(category_id, snapshot_date);
CREATE INDEX idx_escalation_complaint ON escalation_incident_reports(complaint_id);

