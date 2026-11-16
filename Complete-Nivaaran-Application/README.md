# Nivaaran – Hostel Management & Issue Resolution System

A full-stack academic demonstration project with six service modules, REST health endpoint, GraphQL API, MySQL database, JWT authentication and role-based access.

## Six services

1. **Complaint Management** – students submit complaints; admins update status.
2. **Room Allocation** – browse rooms and request an available room.
3. **Mess & Food Management** – view weekly menu; admins add menu entries.
4. **Payment Management** – view student fee records; admins create fee records. This demo does not process real money.
5. **Notification Management** – view notifications, mark as read and publish announcements.
6. **Admin & Reports** – admin dashboard with student, complaint, room and pending-payment summaries.

## Technology

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- API: GraphQL (Apollo Server) and REST health endpoint
- Database: MySQL
- Security: bcrypt password hashing, JWT authentication, role checks, Helmet, CORS, request rate limiting, parameterized SQL queries

## Requirements

- Node.js 18 or newer
- MySQL Server 8.x (MySQL Workbench is optional but useful)
- Git (for GitHub upload)

## Setup on Windows

### 1. Create the database

1. Start MySQL Server.
2. Open MySQL Workbench and connect to your local MySQL instance.
3. Open `database/schema.sql`.
4. Execute the complete script. It creates `nivaaran_db`, tables and sample room/menu data.

### 2. Configure environment

Copy `.env.example` to a new file named `.env` in the project root. Update `DB_USER` and `DB_PASSWORD` to match your local MySQL account. Replace `JWT_SECRET` with a long random secret. Do not upload `.env` to GitHub.

### 3. Install packages and create demo users

Open a terminal in the project folder:

```bash
npm install
npm run seed
```

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@nivaaran.local | Admin@123 |
| Student | student@nivaaran.local | Student@123 |

Change these demo passwords before any real deployment.

### 4. Start the application

```bash
npm run dev
```

Open **http://localhost:4000** in your browser.

- Frontend: `http://localhost:4000`
- GraphQL endpoint: `http://localhost:4000/graphql`
- REST health check: `http://localhost:4000/api/health`

## GraphQL examples

Open `http://localhost:4000/graphql` while the server is running.

Login:

```graphql
mutation {
  login(email: "student@nivaaran.local", password: "Student@123") {
    token
    user { id name email role }
  }
}
```

List rooms:

```graphql
query {
  rooms { id room_number capacity occupied status }
}
```

Create a complaint (requires `Authorization: Bearer YOUR_TOKEN` in the HTTP headers):

```graphql
mutation {
  createComplaint(
    category: "Electrical"
    title: "Ceiling fan not working"
    description: "The fan in my room is not working."
  ) { id title status }
}
```

## GitHub upload

1. Create a new GitHub repository, for example `nivaaran-hostel-management`.
2. Make sure `.env` is not committed. `.gitignore` already excludes it.
3. From the project root run:

```bash
git init
git add .
git commit -m "Initial complete Nivaaran project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL. If you already have a repository with work in it, clone that repository first and copy these project files into it carefully; do not overwrite your teammate's work.

**Important:** GitHub is source-code hosting, not a MySQL hosting service. For your viva, clone/download the repository, configure a local MySQL database, install dependencies and run the server locally. To make it publicly accessible, you would separately deploy the Node server and use a hosted database.

## Viva notes / academic limitations

- The project is a working academic prototype, not a production hostel ERP.
- Room request currently increments room occupancy directly. A production system should add an allocation table, administrator approval and transaction/locking rules.
- Payment module records dues and status only; it does not integrate a payment gateway.
- Notifications are stored in MySQL and displayed in the portal; email/SMS/push delivery is not configured.
- The admin demo account is created by `npm run seed`. Do not expose demo credentials in a production system.
- The frontend uses GraphQL requests for application data. `/api/health` is a small REST endpoint.
- Protect `.env`, use HTTPS, rotate JWT secrets and add audit logs before real deployment.

## Project structure

```text
Nivaaran_Complete_Project/
├── database/
│   └── schema.sql
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── config/db.js
│   ├── graphql/schema.js
│   ├── graphql/resolvers.js
│   ├── middleware/auth.js
│   ├── seed.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```
