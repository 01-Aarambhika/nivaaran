# Nivaaran: project brief

*Nivaaran* means "remedy" or "redress". The first page below is the short brief (what, who, nouns, verbs). The sections after it add scope, rules and the build plan.

## What

Nivaaran is a grievance redressal system for the IIIT Vadodara campus. Today a student with a broken tap, a bad meal or a dark pathway has to find the right person, tell them in person or over a chat, and hope someone remembers. There is no record, no deadline and no way to know who is responsible.

Nivaaran puts all of this in one place. A student signs in with a User ID and password, files a complaint, and the system sets a deadline and keeps a visible history of every step. The right staff member picks it up. If the deadline passes, the complaint can be escalated. When the work is done, the student confirms whether the problem is really fixed, and can reopen the complaint if it is not.

## Who

- **Student** signs up with a roll number, files complaints (optionally anonymously), follows their progress, comments, rates the outcome and can reopen a complaint.
- **Hostel warden, mess in-charge and maintenance staff** sign in with a staff ID and handle the complaints in their own area: they start work, add updates and mark complaints resolved.
- **Admin** sees every complaint, creates staff accounts, assigns complaints, escalates overdue cases and watches overall numbers.

## Nouns (the things the system keeps track of)

1. **User**: a person who signs in with a User ID and password
2. **Role**: student, warden, mess in-charge, maintenance staff or admin
3. **Complaint**: the issue being reported
4. **Category**: mess, hostel or campus
5. **Location**: where the issue is, such as a hostel block or the library
6. **Assignment**: which staff member is responsible for a complaint
7. **Status history**: the record of every status change on a complaint
8. **Comment**: a note added to a complaint by a student or staff member
9. **Notification**: a message telling a user something changed
10. **Feedback**: a student's rating and reopen request after resolution

## Verbs (the things people and the system do)

1. **Register** a student account
2. **Log in** with a User ID and password
3. **Create** a staff account (admin only)
4. **File** a complaint
5. **Search and filter** complaints
6. **Assign** a complaint to a staff member
7. **Update status** (start work, resolve, close, withdraw)
8. **Escalate** an overdue or serious complaint
9. **Comment** on a complaint
10. **Notify** the people involved when something changes
11. **Rate** the outcome
12. **Reopen** a complaint that is not really fixed

---

## Problem

Complaints about campus life are handled informally. That causes four problems:

- Complaints are lost because nothing is written down.
- Nobody knows whose job a complaint is, so it is passed around.
- There is no deadline, so a small issue can stay open for weeks.
- Students never find out what happened, and administrators cannot see patterns.

## Goals

1. Give every complaint an owner, a deadline and a visible history.
2. Let students follow a complaint without chasing anyone.
3. Make overdue complaints visible and easy to escalate.
4. Give administrators a clear overview of what is open, late and resolved.
5. Protect students: anonymous complaints stay anonymous, and every action is tied to a signed-in role.

## Roles and login

Everyone signs in with a **User ID and a password**. A student's User ID is their roll number, and they create the account themselves. Staff and admin accounts are created by the admin, because a role should never be something a person can pick for themselves. The server reads the role from the account and signs it into a token. The client only shows or hides screens. The server is what actually enforces permissions.

## Key rules

- **Deadlines.** Each category has a resolution time in hours. An urgent complaint always has 24 hours.
- **Escalation.** An admin can escalate any open complaint. A student can escalate only after the deadline has passed.
- **Anonymity.** If a student files anonymously, staff never see the name. The student can still see and track their own complaint.
- **Status changes follow a fixed path.** A resolved complaint cannot jump back to submitted. An illegal move is refused.
- **No duplicates.** Pressing Submit twice, or a network retry, must never create two complaints.
- **No lost complaints.** If a helper service is down, the complaint is still accepted and the missing detail is filled in later.

## Scope

**Built in this project**

| Service | Owns |
|---|---|
| Complaints | complaints, status history, comments, feedback |
| React client | all screens for the three kinds of user (demo/integration mode) |

**Designed but not built (Design & Contracts complete)**

| Service | Owns |
|---|---|
| Accounts | users, roles, login |
| Directory | categories, locations, deadline hours |
| Resolution | staff duties, assignments |
| Notifications | message log, SMS through an external REST partner |
| Analytics & Audit | immutable audit log, SLA compliance telemetry, escalation incident reports |

The design is complete for all six services, with contracts and a database schema in `docs/a2/`. Only Complaints is coded as the core runnable backend service. The client shows demo data for the services that are designed.

**Out of scope**: file attachments, Hindi or Gujarati screens, payments, and a mobile app.

## How the design maps to services

| Services | What the nouns and verbs turn into |
|---|---|
| Accounts | User, Role. Register, log in, create a staff account |
| Directory | Category, Location. Deadlines per category |
| Complaints | Complaint, Status history, Comment, Feedback. File, search, update status, escalate, comment, rate, reopen |
| Resolution | Assignment. Assign, reassign |
| Notifications | Notification. Notify |
| Analytics & Audit | Audit Event, SLA Snapshot, Escalation Report. Track telemetry, compute SLA compliance, audit trail |

The nouns point to the services and the data each one owns. The verbs become the operations those services offer, such as `fileComplaint` and `escalateComplaint`. The full contracts, the central `fileComplaint` operation and the database schema are in `docs/a2/`.

## Build plan

1. Setup and design: repository, brief, service design, contracts, schema.
2. Accounts service: login by User ID, roles, tokens.
3. Complaints service: the OpenAPI contract first, then the code and tests.
4. A resilient call from Complaints to Accounts, with a timeout, retries and a fallback.
5. Headers and caching: ETag, conditional requests, rate limiting, CORS.
6. Honest errors: correct status codes, one error format, field-level validation.
7. Connect the React client, package everything with Docker Compose.

## What success looks like

- A student can sign up, sign in, file a complaint and watch its status change.
- A warden sees only the complaints of their own category and can resolve them.
- An admin can create a staff account, assign a complaint and escalate an overdue one.
- Filing the same complaint twice with the same request key creates only one.
- Every failure returns the right status code and the same error shape.
- The whole system starts with one command.
