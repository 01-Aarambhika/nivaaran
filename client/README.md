# Nivaaran React Frontend Client

Modern responsive React portal for the IIIT Vadodara Campus Grievance Redressal Platform (*Nivaaran*).

## Key Features

- **Role-Based Portals**:
  - **Student**: File complaints with SLA deadlines, optional anonymity, track lifecycle, withdraw before assignment, post comments, and rate resolution / reopen issues.
  - **Hostel Warden / Mess In-Charge / Maintenance Staff**: Department-scoped complaint queue, single-click "Start Work" and "Mark Resolved" status transitions.
  - **Campus Administrator**: Global complaint oversight, staff dispatching/assignment, staff account provisioning, SLA compliance monitoring, and immutable audit logs.
- **Dual Mode**:
  - **Full Microservice Integration**: Seamlessly connects to Accounts (`:8080`), Directory (`:8081`), Complaints (`:8082`), Resolution (`:8083`), Notifications (`:8084`), and Analytics (`:8085`).
  - **Zero-Dependency Demo Mode**: Runs out of the box with interactive pre-seeded campus grievances and quick one-click demo login buttons without requiring backend services to be started.

## Getting Started

```bash
cd client
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

## Demo Accounts

| Role | User ID | Password | Scope |
|---|---|---|---|
| Student | `20251651078` / `2301001` | `demo123` | Campus grievances |
| Hostel Warden | `W101` / `W001` | `warden123` | Hostel block rooms, electricity, plumbing |
| Mess In-Charge | `M201` / `M001` | `mess123` | Dining hall, meal quality, hygiene |
| Maintenance Staff | `S301` / `T001` | `maint123` | General campus, sports pathway, academic blocks |
| Administrator | `ADM001` / `A001` | `admin123` | All categories, assignments & staff creation |
