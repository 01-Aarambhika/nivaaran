-- ============================================================================
-- NIVAARAN: CAMPUS GRIEVANCE REDRESSAL PLATFORM
-- MySQL 8.0 Database Initialization Script
-- 
-- Strictly isolated database boundaries per microservice:
-- 1. nivaaran_accounts
-- 2. nivaaran_directory
-- 3. nivaaran_complaints
-- 4. nivaaran_resolution
-- 5. nivaaran_notifications
-- 6. nivaaran_analytics
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SERVICE 1: ACCOUNTS (nivaaran_accounts)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_accounts
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_accounts;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NULL,
    role ENUM('student', 'warden', 'mess_incharge', 'maintenance_staff', 'admin') NOT NULL,
    department_scope ENUM('hostel', 'mess', 'campus', 'all') NULL,
    password_hash VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    user_role VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default users (SHA-256 password hashes)
INSERT INTO users (user_id, full_name, email, role, department_scope, password_hash, version)
VALUES
('ADM001', 'Campus Administrator', 'admin@iiitv.ac.in', 'admin', 'all', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 1), -- admin123
('20251651078', 'Ritik Sharma', '20251651078@iiitv.ac.in', 'student', 'all', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 1), -- demo123
('20251651006', 'Abhishek Kumar', '20251651006@iiitv.ac.in', 'student', 'all', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 1), -- demo123
('20251651001', 'Aarambhika Sinha', '20251651001@iiitv.ac.in', 'student', 'all', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 1), -- demo123
('W101', 'Hostel Warden', 'w101@iiitv.ac.in', 'warden', 'hostel', 'a08cacabcf3487a4830186ace52ea1cb2cabe3a69b9a037f2fcd67218963aaa3', 1), -- warden123
('M201', 'Mess In-Charge', 'm201@iiitv.ac.in', 'mess_incharge', 'mess', '02cb3947572748aadb3e319968bacef46692c3e31ef8df67703ad10ec4248b7c', 1), -- mess123
('S301', 'Campus Maintenance Staff', 's301@iiitv.ac.in', 'maintenance_staff', 'campus', '2eab737d095f86d7e5a1fc616298ac81169cc91b09d1035b44706bc0a1c10ecf', 1) -- maint123
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);


-- ----------------------------------------------------------------------------
-- 2. SERVICE 2: DIRECTORY (nivaaran_directory)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_directory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_directory;

CREATE TABLE IF NOT EXISTS categories (
    category_id VARCHAR(32) PRIMARY KEY,
    display_name VARCHAR(80) NOT NULL,
    description TEXT NULL,
    default_sla_hours INT NOT NULL,
    urgent_sla_hours INT NOT NULL,
    escalation_tier VARCHAR(32) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS locations (
    location_id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(32) NOT NULL,
    zone_name VARCHAR(80) NOT NULL,
    landmark VARCHAR(120) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_locations_category (category_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed categories
INSERT INTO categories (category_id, display_name, description, default_sla_hours, urgent_sla_hours, escalation_tier)
VALUES
('hostel', 'Hostel', 'Hostel block rooms, electricity, carpentry, plumbing and washrooms', 48, 24, 'warden'),
('mess', 'Mess', 'Dining halls, food quality, hygiene and catering issues', 24, 12, 'mess_incharge'),
('campus', 'Campus', 'General campus pathways, sports grounds, libraries and classrooms', 72, 24, 'admin')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- Seed locations
INSERT INTO locations (location_id, category_id, zone_name, landmark)
VALUES
('hostel_block_a', 'hostel', 'Block A', 'Near main campus entrance'),
('hostel_block_b', 'hostel', 'Block B', 'Behind central library'),
('mess_hall_1', 'mess', 'Main Mess Hall', 'Ground floor dining area'),
('mess_hall_2', 'mess', 'Mini Mess', 'Block C basement'),
('library', 'campus', 'Central Library', 'Academic block 1st floor'),
('sports_ground', 'campus', 'Sports Ground', 'East campus wing'),
('it_lab', 'campus', 'IT Computer Lab', 'Block D first floor')
ON DUPLICATE KEY UPDATE zone_name=VALUES(zone_name);


-- ----------------------------------------------------------------------------
-- 3. SERVICE 3: COMPLAINTS (nivaaran_complaints)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_complaints
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_complaints;

CREATE TABLE IF NOT EXISTS complaints (
    complaint_id VARCHAR(64) PRIMARY KEY,
    tracking_number VARCHAR(32) UNIQUE NOT NULL,
    reporter_user_id VARCHAR(64) NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    category_id VARCHAR(32) NOT NULL,
    location_id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('normal', 'urgent') NOT NULL DEFAULT 'normal',
    current_status ENUM(
        'needs_triage',
        'submitted',
        'assigned',
        'in_progress',
        'resolved',
        'closed',
        'escalated',
        'withdrawn'
    ) NOT NULL DEFAULT 'submitted',
    sla_deadline DATETIME NOT NULL,
    is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_tier VARCHAR(64) NULL,
    escalation_reason TEXT NULL,
    idempotency_key VARCHAR(128) UNIQUE NULL,
    etag VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    internal_audit_secret VARCHAR(64) NULL,
    raw_db_seq INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_complaints_reporter (reporter_user_id),
    INDEX idx_complaints_status (current_status),
    INDEX idx_complaints_category (category_id),
    INDEX idx_complaints_deadline (sla_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS complaint_status_history (
    history_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    changed_by_user_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    remarks TEXT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_history_complaint (complaint_id),
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS complaint_comments (
    comment_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL,
    author_user_id VARCHAR(64) NOT NULL,
    author_role VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comments_complaint (complaint_id),
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS complaint_feedback (
    feedback_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) UNIQUE NOT NULL,
    student_user_id VARCHAR(64) NOT NULL,
    rating INT NOT NULL,
    comments TEXT NULL,
    is_reopened BOOLEAN NOT NULL DEFAULT FALSE,
    reopen_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial demo complaint
INSERT INTO complaints (
  complaint_id, tracking_number, reporter_user_id, is_anonymous,
  category_id, location_id, title, description, priority, current_status,
  sla_deadline, is_escalated, etag, version
) VALUES (
  'cmp_1001', 'CMP-2026-1001', '20251651078', FALSE,
  'hostel', 'hostel_block_a', 'Water tap leaking in room 302',
  'Bathroom tap broken and leaking water continuously since yesterday.',
  'normal', 'submitted', DATE_ADD(NOW(), INTERVAL 48 HOUR), FALSE, '"1-demo"', 1
) ON DUPLICATE KEY UPDATE title=VALUES(title);


-- ----------------------------------------------------------------------------
-- 4. SERVICE 4: RESOLUTION (nivaaran_resolution)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_resolution
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_resolution;

CREATE TABLE IF NOT EXISTS staff_assignments (
    assignment_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) UNIQUE NOT NULL,
    assigned_staff_id VARCHAR(64) NOT NULL,
    assigned_by_user_id VARCHAR(64) NOT NULL,
    department_scope VARCHAR(32) NOT NULL,
    assignment_status ENUM('active', 'reassigned', 'completed', 'transferred') NOT NULL DEFAULT 'active',
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    version INT NOT NULL DEFAULT 1,
    INDEX idx_assignments_staff (assigned_staff_id),
    INDEX idx_assignments_complaint (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS staff_duty_roster (
    roster_id VARCHAR(64) PRIMARY KEY,
    staff_user_id VARCHAR(64) NOT NULL,
    department_scope VARCHAR(32) NOT NULL,
    shift_date DATE NOT NULL,
    shift_start VARCHAR(16) NOT NULL,
    shift_end VARCHAR(16) NOT NULL,
    is_on_duty BOOLEAN NOT NULL DEFAULT TRUE,
    active_complaints_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_roster_staff_date (staff_user_id, shift_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed assignment & roster
INSERT INTO staff_assignments (assignment_id, complaint_id, assigned_staff_id, assigned_by_user_id, department_scope, assignment_status, assigned_at)
VALUES ('asgn_1', 'cmp_1001', 'W101', 'ADM001', 'hostel', 'active', NOW())
ON DUPLICATE KEY UPDATE assignment_status=VALUES(assignment_status);

INSERT INTO staff_duty_roster (roster_id, staff_user_id, department_scope, shift_date, shift_start, shift_end, is_on_duty)
VALUES
('ros_1', 'W101', 'hostel', CURDATE(), '08:00', '17:00', TRUE),
('ros_2', 'M201', 'mess', CURDATE(), '07:00', '15:00', TRUE)
ON DUPLICATE KEY UPDATE staff_user_id=VALUES(staff_user_id);


-- ----------------------------------------------------------------------------
-- 5. SERVICE 5: NOTIFICATIONS (nivaaran_notifications)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_notifications
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_notifications;

CREATE TABLE IF NOT EXISTS notifications_log (
    notification_id VARCHAR(64) PRIMARY KEY,
    recipient_user_id VARCHAR(64) NOT NULL,
    recipient_contact VARCHAR(120) NOT NULL,
    channel ENUM('sms', 'email', 'in_app') NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    related_complaint_id VARCHAR(64) NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    delivery_status ENUM('queued', 'sent', 'delivered', 'failed') NOT NULL DEFAULT 'queued',
    external_provider_id VARCHAR(100) NULL,
    retry_count INT NOT NULL DEFAULT 0,
    sent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    INDEX idx_notifications_recipient (recipient_user_id),
    INDEX idx_notifications_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed notifications
INSERT INTO notifications_log (
  notification_id, recipient_user_id, recipient_contact, channel, event_type,
  related_complaint_id, title, body, delivery_status, sent_at
) VALUES
('notif_1', '20251651078', '9876543210', 'sms', 'complaint_filed', 'cmp_1001', 'Complaint Received', 'Your complaint CMP-2026-1001 has been filed.', 'sent', NOW()),
('notif_2', 'W101', 'w101@iiitv.ac.in', 'email', 'assigned', 'cmp_1001', 'New Assignment', 'Complaint CMP-2026-1001 assigned to you.', 'queued', NULL)
ON DUPLICATE KEY UPDATE title=VALUES(title);


-- ----------------------------------------------------------------------------
-- 6. SERVICE 6: ANALYTICS & AUDIT (nivaaran_analytics)
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS nivaaran_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivaaran_analytics;

CREATE TABLE IF NOT EXISTS audit_events_log (
    event_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(64) NULL,
    actor_role VARCHAR(32) NULL,
    origin_service VARCHAR(32) NOT NULL,
    previous_state VARCHAR(64) NULL,
    new_state VARCHAR(64) NULL,
    payload_snapshot TEXT NULL,
    client_ip VARCHAR(45) NULL,
    event_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_timestamp (event_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sla_performance_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(32) NOT NULL,
    snapshot_date DATE NOT NULL,
    total_filed INT NOT NULL DEFAULT 0,
    total_resolved INT NOT NULL DEFAULT 0,
    resolved_within_sla INT NOT NULL DEFAULT 0,
    breached_sla_count INT NOT NULL DEFAULT 0,
    average_resolution_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    compliance_rate_pct DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sla_category_date (category_id, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS escalation_incident_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL,
    category_id VARCHAR(32) NOT NULL,
    initiator_user_id VARCHAR(64) NOT NULL,
    breach_hours_exceeded DECIMAL(6, 2) NOT NULL,
    escalation_tier VARCHAR(32) NOT NULL DEFAULT 'admin',
    reason TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    reported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_escalation_complaint (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed analytics
INSERT INTO audit_events_log (event_id, event_type, entity_type, entity_id, actor_user_id, actor_role, origin_service, previous_state, new_state, payload_snapshot, client_ip)
VALUES
('evt_1', 'complaint_created', 'complaint', 'cmp_1001', '20251651078', 'student', 'complaints', NULL, 'submitted', '{"title":"Water tap leaking in room 302"}', '127.0.0.1'),
('evt_2', 'status_changed', 'complaint', 'cmp_1001', 'W101', 'warden', 'complaints', 'submitted', 'assigned', '{"assignedStaffId":"W101"}', '127.0.0.1')
ON DUPLICATE KEY UPDATE event_type=VALUES(event_type);

INSERT INTO sla_performance_snapshots (snapshot_id, category_id, snapshot_date, total_filed, total_resolved, resolved_within_sla, breached_sla_count, average_resolution_hours, compliance_rate_pct)
VALUES
('snap_1', 'hostel', CURDATE() - INTERVAL 1 DAY, 12, 9, 7, 2, 36.50, 77.78),
('snap_2', 'mess', CURDATE() - INTERVAL 1 DAY, 5, 5, 5, 0, 18.20, 100.00)
ON DUPLICATE KEY UPDATE category_id=VALUES(category_id);

INSERT INTO escalation_incident_reports (report_id, complaint_id, category_id, initiator_user_id, breach_hours_exceeded, escalation_tier, reason, is_resolved)
VALUES
('rep_1', 'cmp_999', 'hostel', '20251651001', 12.50, 'admin', 'SLA breach — no staff assigned for 60 hours', FALSE)
ON DUPLICATE KEY UPDATE complaint_id=VALUES(complaint_id);
