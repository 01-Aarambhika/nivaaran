# Nivaaran – Quick Viva Guide

## 30-second introduction

“Nivaaran is a hostel management and issue-resolution web application. It provides six modules: complaint management, room allocation, mess and food management, payment records, notifications, and admin reports. The frontend is built using HTML, CSS and JavaScript. The backend uses Node.js and Express, GraphQL is implemented using Apollo Server, and MySQL stores the application data. JWT is used for authentication and bcrypt is used to hash passwords.”

## Suggested live demonstration order

1. Start MySQL and run the application (`npm run dev`).
2. Open `http://localhost:4000`.
3. Log in as student (`student@nivaaran.local` / `Student@123`).
4. Create a complaint and show its pending status.
5. Open Room Allocation and request an available room.
6. Show the mess menu.
7. Show payment records.
8. Open Notifications.
9. Log out and log in as admin (`admin@nivaaran.local` / `Admin@123`).
10. Update the complaint status, add a menu item, publish an announcement and show Admin Reports.
11. Open `/graphql` and show the GraphQL schema/playground landing page or run a query.
12. Open `/api/health` to demonstrate the REST endpoint.

## Common viva questions

**What is GraphQL?**  
GraphQL is a query language for APIs. A client requests exactly the fields it needs. Nivaaran exposes a GraphQL endpoint at `/graphql`.

**What is the difference between REST and GraphQL?**  
REST commonly exposes multiple resource URLs and HTTP methods. GraphQL commonly exposes one endpoint where queries read data and mutations change data.

**Why MySQL?**  
MySQL is a relational database. It stores structured records and uses primary keys and foreign keys to maintain relationships.

**Why hash passwords?**  
Passwords should not be stored as plain text. bcrypt hashes passwords and compares a login password against the stored hash.

**What is JWT?**  
A JSON Web Token is a signed token used to represent authenticated identity. The client sends it in the Authorization Bearer header.

**What is middleware in Express?**  
Middleware is a function that runs during the request-response cycle. Nivaaran uses middleware-related protections for security, JSON parsing, CORS and rate limiting.

**What is a resolver?**  
A GraphQL resolver is a function that supplies the data for a query or performs the work for a mutation.

**What is role-based access control?**  
It restricts actions based on a user's role. In this project, admin-only actions include changing complaint status, adding menu items, creating payment records, publishing announcements and viewing reports.

**Does this process real payments?**  
No. It demonstrates payment records and status tracking only. No real payment gateway is connected.
