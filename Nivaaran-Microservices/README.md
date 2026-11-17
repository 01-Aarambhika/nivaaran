# Nivaaran

A grievance redressal platform for the IIIT Vadodara campus. Students report mess, hostel and general campus issues in one place and follow each complaint until it is fixed. Wardens, mess in-charges and maintenance staff resolve complaints in their area. Admins watch deadlines, escalations and overall numbers.

*Nivaaran* means "remedy" or "redress".

Everything in this project is a REST API with JSON over HTTP, described by OpenAPI. The backend is split into small services that each own their data, and the frontend is a React app.

## Submission Deliverables & Links

- **GitHub Repository:** [https://github.com/ritik-78/Nivaaran-Grievance-Redressal](https://github.com/ritik-78/Nivaaran-Grievance-Redressal)
- **Working Video Demonstration:** [Google Drive Demo Folder](https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J_NIVAARAN_DEMO?usp=sharing) (Access: *"Anyone with the link"*)
- **Complete Submission Report:** [`ReadMe.pdf`](ReadMe.pdf) (Covers all questions for Assignments 01 to 06)

## Team & Microservice Ownership

| Roll No | Name | Assigned Microservices | Core Responsibilities |
|---|---|---|---|
| **20251651001** | **Aarambhika Sinha** | • `services/accounts` (Port 8080)<br>• `services/directory` (Port 8081) | Identity and Access Management, JWT Authentication, RBAC, User Sessions, Campus Taxonomy, Category and SLA Registry |
| **20251651006** | **Abhishek Kumar** | • `services/complaints` (Port 8082)<br>• `services/resolution` (Port 8083) | Central Grievance Lifecycle, Concurrency Control (ETags), Staff Duty Assignment, Inspection and Resolution Workflows |
| **20251651078** | **Ritik Sharma** | • `services/notifications` (Port 8084)<br>• `services/analytics` (Port 8085)<br>• `client` (Web Frontend) | Event Dispatcher and Message Gateway, Immutable Audit Ledger, SLA Compliance Telemetry, Modern Civic UI Portal |


## What it does

- Students sign up with their roll number, log in, and file complaints about the mess, hostels or the wider campus. A complaint can be anonymous.
- Every complaint has a category, a location, a priority and a resolution deadline.
- Staff and admins assign, update, escalate and resolve complaints. Every change is kept in a status history.
- Students can comment, rate the result, or reopen a complaint that is not really fixed.
- If a deadline passes, the student or an admin can escalate the complaint.

## Roles and login

Every person signs in with a **User ID and a password**. The role belongs to the account and is decided by the server, never by the client.

| Role | User ID is | Account created by | Can do |
|---|---|---|---|
| Student | Roll number | The student, by signing up | File complaints, see own complaints, comment, withdraw, rate or reopen, escalate once overdue |
| Hostel warden | Staff ID | Admin | See hostel complaints, start work, mark resolved, comment |
| Mess in-charge | Staff ID | Admin | Same, for mess complaints |
| Maintenance staff | Staff ID | Admin | Same, for campus complaints |
| Admin | Staff ID | Seeded on first run | Everything above, plus creating staff accounts, assigning and escalating |

A successful login returns a signed token (JWT). The client sends it as `Authorization: Bearer <token>` and every service checks it.

## Architecture

The full architecture consists of **six microservices**. Each microservice strictly owns its database boundary, ensuring loose coupling and isolated failure domains:

| # | Service | Port | Database | Lead Owner | Owns | Status |
|---|---|---|---|---|---|---|
| 1 | **Accounts** | `8080` | `nivaaran_accounts` | Aarambhika Sinha (20251651001) | users, roles, login, sessions | **Implemented & Tested** (`services/accounts/`) |
| 2 | **Directory** | `8081` | `nivaaran_directory` | Aarambhika Sinha (20251651001) | categories, locations, SLA deadline hours | **Implemented & Tested** (`services/directory/`) |
| 3 | **Complaints** | `8082` | `nivaaran_complaints` | Abhishek Kumar (20251651006) | grievance lifecycle, status transitions, comments, feedback | **Implemented & Tested** (`services/complaints/`) |
| 4 | **Resolution** | `8083` | `nivaaran_resolution` | Abhishek Kumar (20251651006) | staff duties, assignments, duty roster | **Implemented & Tested** (`services/resolution/`) |
| 5 | **Notifications** | `8084` | `nivaaran_notifications` | Ritik Sharma (20251651078) | message log, SMS partner gateway | **Implemented & Tested** (`services/notifications/`) |
| 6 | **Analytics & SLA** | `8085` | `nivaaran_analytics` | Ritik Sharma (20251651078) | audit trails, SLA compliance telemetry, escalation reports | **Implemented & Tested** (`services/analytics/`) |

The core Complaints service talks to Accounts (`GET /users/{id}`) over REST to verify the reporter with resilient fallback. The full architecture design, contracts, and schema for all six services are documented in [`docs/a2/`](docs/a2/).

![Service design](docs/a2/services.png)

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js 20+ and Express |
| Database | MySQL 8.0 (strictly isolated database boundary per microservice) |
| Frontend | React with Vite & Modern Design System |
| API contracts | OpenAPI 3 (`openapi.yaml`) |
| Authentication | JWT, passwords hashed with SHA-256 |
| Tests | Node Test Runner (`node:test`, `test-all.js`) |
| Packaging | Docker and Docker Compose |

## Repository layout

```
nivaaran/
├── README.md
├── brief.md
├── docker-compose.yml
├── test-all.js
├── database/
│   └── init_mysql.sql       MySQL 8.0 schema & seed data for all 6 databases
├── docs/
│   ├── a2/                  design.pdf, schema.sql, services.drawio, schema.drawio
│   ├── a3/                  integration.pdf, partner.wsdl, soap-request.xml, soap-fault.xml
│   ├── a4/                  openapi.yaml, NOTES.md, curl_transcript.txt
│   ├── a5/                  NOTES.md, curl_transcript.txt
│   └── a6/                  NOTES.md, curl_transcript.txt
├── scripts/
│   ├── setup_mysql.js       Automated MySQL DB creator & seed runner
│   └── test_db_connection.js DB connection healthcheck
├── services/
│   ├── accounts/            Auth & User management microservice (:8080)
│   ├── directory/           Categories, Locations & SLA microservice (:8081)
│   ├── complaints/          Core grievance REST microservice (:8082)
│   ├── resolution/          Staff duty roster & assignments microservice (:8083)
│   ├── notifications/       Alert log & SMS partner gateway (:8084)
│   └── analytics/           Immutable audit log & SLA telemetry (:8085)
└── client/                  Modern React (Vite) frontend with Student, Staff & Admin portals
```

## API overview

### Accounts service (port 8080)

| Method | Path | Purpose | Success | Failures |
|---|---|---|---|---|
| POST | `/sessions` | Log in with User ID and password | 201 | 400, 401, 429 |
| POST | `/users` | Student sign-up. An admin token may also set a staff role | 201 | 403, 409, 422 |
| GET | `/users/{id}` | Look up one user (never returns the password) | 200 | 401, 404 |
| GET | `/users` | List all users (admin only) | 200 | 401, 403 |

### Complaints service (port 8082)

| Method | Path | Purpose | Success | Failures |
|---|---|---|---|---|
| POST | `/complaints` | File a complaint | 201 with `Location` | 400, 401, 422, 429 |
| GET | `/complaints/{id}` | Read one complaint | 200, or 304 with `If-None-Match` | 401, 404 |
| GET | `/complaints?status=&category=&page=` | Filtered list | 200 | 400, 401 |
| PATCH | `/complaints/{id}` | Change status (send `If-Match`) | 200 | 404, 409, 412, 422 |
| POST | `/complaints/{id}/escalations` | Escalate a complaint | 201 | 404, 409 |
| POST | `/complaints/{id}/comments` | Add a comment | 201 | 404, 422 |
| POST | `/complaints/{id}/feedback` | Rate the result, or reopen | 201 | 404, 409 |
| DELETE | `/complaints/{id}` | Withdraw (only before assignment) | 204 | 404, 409 |

### Conventions used by every endpoint

- Request and response bodies are JSON (`application/json`).
- Errors use one shape, Problem Details (`application/problem+json`) with `type`, `title`, `status` and `detail`. Validation errors add an `errors` list naming each bad field.
- `POST /complaints` accepts an `Idempotency-Key` header. Repeating the same request returns the original result and creates no second complaint.
- Single-item reads carry an `ETag`. Updates use `If-Match`, and a stale update is refused with 412.
- Writes are rate limited per client. A limited client gets 429 with `Retry-After`.
- CORS is enabled for the React client origin.

### Complaint statuses

`needs_triage` → `submitted` → `assigned` → `in_progress` → `resolved` → `closed`

A complaint can also be `escalated` (from submitted, assigned or in progress) or `withdrawn` (while still submitted). A resolved complaint can be reopened to `in_progress`. Any other move is refused with 409.

In this system, Complaints is the central implemented service (`services/complaints`) with resilient fallback to Accounts (`:8080`). The remaining microservices (Directory, Resolution, Notifications, Analytics) are fully designed with contractual OpenAPI specifications and database schemas.

## Getting started

### Prerequisites

- Node.js 20 or newer, and npm
- Git

### Run the core Complaints service

```bash
cd services/complaints
npm install
npm start          # Runs on port 8082
```

### Run the React client

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

### Run all microservices with Docker Compose

```bash
docker compose up --build
```

### Run the test suite across all 6 services

```bash
node test-all.js
```

### MySQL Database Setup

1. **Auto-initialize all 6 databases, tables and seed data in your local MySQL Server**:
   ```bash
   node scripts/setup_mysql.js --password="YOUR_MYSQL_ROOT_PASSWORD"
   ```
2. **Check MySQL connection across all databases**:
   ```bash
   node scripts/test_db_connection.js
   ```

### Run individual service tests

```bash
cd services/complaints && npm test
cd services/accounts && npm test
cd services/directory && npm test
cd services/resolution && npm test
cd services/notifications && npm test
cd services/analytics && npm test
```

### Environment variables

Each microservice in `services/<service>/.env` can be configured with:

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP Port for the microservice | `8080` - `8085` |
| `JWT_SECRET` | Secret key used for signing & verifying JWTs | `nivaaran-dev-secret` |
| `MYSQL_HOST` | MySQL hostname or container name | `localhost` |
| `MYSQL_PORT` | MySQL connection port | `3306` |
| `MYSQL_USER` | MySQL username | `root` |
| `MYSQL_PASSWORD` | MySQL password | (configured via setup script) |
| `MYSQL_DATABASE` | Specific microservice database | `nivaaran_<service>` |
| `ACCOUNTS_URL` | Cross-service Accounts URL | `http://localhost:8080` |
| `COMPLAINTS_URL` | Cross-service Complaints URL | `http://localhost:8082` |

Real `.env` files are never committed. Only `.env.example` is.

### Try the client without a backend

If `VITE_COMPLAINTS_URL` is empty, the client runs on built-in demo data. Sign in with password `demo123` and one of these User IDs: `2301001` (student), `W001` (warden), `M001` (mess in-charge), `T001` (maintenance), `A001` (admin).

## Status

- [x] Project setup and design (brief, service design, contracts, schema)
- [x] Accounts service: login, password hashing, and role-based JWT issuance
- [x] Directory service: categories, locations, and category SLA deadlines
- [x] Complaints service: OpenAPI contract, lifecycle transitions, comments, feedback
- [x] Complaints service: resilient call to Accounts with circuit breaker & fallback
- [x] Resolution service: staff assignments, duty roster, and status transitions
- [x] Notifications service: message logs and partner SMS gateway simulation
- [x] Analytics & Audit service: immutable audit log, SLA compliance snapshots, escalation reports
- [x] Headers, caching (ETag/If-None-Match), optimistic locking (If-Match), and rate limiting
- [x] Honest errors (RFC 7807 Problem Details) and validate-then-act field-level validation
- [x] Dockerfiles for all 6 microservices, React client, and unified Docker Compose configuration (with MySQL 8.0)
- [x] Modern React client (`client/`) with Student, Staff (Warden, Mess, Maintenance) and Admin portals (live microservice & demo modes)
- [x] MySQL 8.0 DDL schemas, connection pools (`mysql2/promise`), and automated setup script
- [x] Automated test runner (`test-all.js`) covering 75+ unit/integration tests across all services

## Documentation

- [Project brief](brief.md)
- [Service design, contracts and validation](docs/a2/design.pdf)
- [Service diagram](docs/a2/services.png) and [schema diagram](docs/a2/schema.png)
- [SQL schema design](docs/a2/schema.sql) and production initialization script in [database/init_mysql.sql](database/init_mysql.sql)

## Working together

- `main` always works. Do your work on a branch such as `feature/accounts-service`, then open a pull request.
- Make small commits with clear messages, for example `Add login route with bcrypt check`.
- Run `git pull` before you start and before you push.
- Never commit `.env` files, passwords or `node_modules/`.
