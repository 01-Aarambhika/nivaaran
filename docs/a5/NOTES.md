# Assignment 5: HTTP Methods & Headers - Notes and Verification

**Service:** Nivaaran Complaints Service (`services/complaints`)  
**Technology:** Node.js, Express, JavaScript  
**Team Members:**
- Ritik (20251651078)
- Abhishek (20251651006)
- Aarambhika (20251651001)

---

## Part A & D: Method Map, Headers Table & Safe-Retry Plan

### 1. The Full Nivaaran Method Map (A1)

| Action | Method + URL | Safety | Idempotency | Notes |
|---|---|---|---|---|
| File a complaint | `POST /complaints` | No | No (Made retry-safe via `Idempotency-Key`) | Server assigns ID `cmp_XXXX`, sets `Location` header |
| Read single complaint | `GET /complaints/{id}` | Yes | Yes | Cacheable, emits `ETag`, supports `If-None-Match` |
| List / Filter complaints | `GET /complaints` | Yes | Yes | Filter via query params (`?category=&status=`) |
| Partial update complaint | `PATCH /complaints/{id}` | No | Yes (when conditioned on state) | Supports `If-Match` to avoid lost updates |
| Withdraw / Cancel draft | `DELETE /complaints/{id}` | No | Yes | Idempotent removal; returns `204 No Content` |
| Escalate overdue complaint | `POST /complaints/{id}/escalate` | No | No | State-changing action on sub-resource |
| Append discussion comment | `POST /complaints/{id}/comments` | No | No | Appends message to grievance thread |
| Discover methods / CORS | `OPTIONS /complaints` | Yes | Yes | Returns `Allow` and CORS headers |

---

### 2. Headers Table (D2)

| Endpoint | Request Headers Needed | Response Headers Set | Purpose & Guarantees |
|---|---|---|---|
| `POST /complaints` | `Content-Type: application/json`<br/>`Authorization: Bearer <token>`<br/>`Idempotency-Key: <uuid>`<br/>`Accept: application/json` | `Content-Type: application/json`<br/>`Location: /complaints/{id}`<br/>`ETag: "<etag>"`<br/>`Cache-Control: no-store`<br/>`X-RateLimit-Limit`, `X-RateLimit-Remaining` | Authenticated intake; Location points to new resource; ETag tracks version; no-store prevents caching private submission. |
| `GET /complaints/{id}` | `Accept: application/json`<br/>`If-None-Match: "<etag>"` | `Content-Type: application/json`<br/>`ETag: "<etag>"`<br/>`Cache-Control: max-age=60, private, must-revalidate`<br/>`X-RateLimit-Limit`, `X-RateLimit-Remaining` | Allows intermediate/browser caching; returns `304 Not Modified` on cache hits. |
| `GET /complaints` | `Accept: application/json` | `Content-Type: application/json`<br/>`Cache-Control: max-age=30, private`<br/>`X-RateLimit-Limit`, `X-RateLimit-Remaining` | Pure read with query filters; short cache window. |
| `PATCH /complaints/{id}` | `Content-Type: application/json`<br/>`Authorization: Bearer <token>`<br/>`If-Match: "<etag>"` | `Content-Type: application/json`<br/>`ETag: "<new-etag>"`<br/>`Cache-Control: no-store` | Prevents lost updates using optimistic concurrency (`412` on mismatch). |
| `DELETE /complaints/{id}` | `Authorization: Bearer <token>` | `X-RateLimit-Limit`, `X-RateLimit-Remaining` | Idempotent cancellation; returns empty `204 No Content`. |
| `OPTIONS /complaints` | `Access-Control-Request-Method`<br/>`Access-Control-Request-Headers` | `Allow: GET, POST, OPTIONS`<br/>`Access-Control-Allow-Origin: *`<br/>`Access-Control-Allow-Methods`<br/>`Access-Control-Allow-Headers` | CORS preflight resolution and endpoint method discovery. |

---

### 3. The Safe-Retry Plan (C4)

| Endpoint | Risk Profile | Applied Mechanism | Architectural Rationale |
|---|---|---|---|
| `POST /complaints` | **High Risk:** Network timeout after server commits locally would cause client to retry, duplicating student grievance and triggering redundant staff dispatch. | `Idempotency-Key` Header | Client supplies UUID. Server records `Idempotency-Key -> complaint_id`. On duplicate retry, server short-circuits execution and returns the original `200 OK` record without re-running DB insert or notifications. |
| `GET /complaints/{id}` | **Zero Risk (Safe & Idempotent):** Read can be re-executed arbitrarily. Bandwidth waste on frequent polling is the primary concern. | `If-None-Match` + ETag | Client sends cached ETag. If unchanged, server replies `304 Not Modified` with zero body bytes, eliminating payload transfer on mobile networks. |
| `PATCH /complaints/{id}` | **High Concurrency Risk:** Two staff members or a student and warden simultaneously updating status/details can silently overwrite each other (Lost Update Problem). | `If-Match` + Strong ETag | Server rejects update with `412 Precondition Failed` if incoming `If-Match` does not equal current state ETag. Forces writer to re-fetch the latest grievance representation. |

---

## Answers to Assignment 5 Questions

### 1. Three Endpoints: Method, Success Status, and Most Critical Response Header
1. **`POST /complaints` (Success: `201 Created`):**
   - **Most Critical Header:** `Location: /complaints/cmp_1001`
   - **Why:** The client did not know the identifier prior to submission. The `Location` header is the authoritative hypermedia reference informing the client where the durable newly created resource lives.
2. **`GET /complaints/{id}` (Success: `200 OK` / `304 Not Modified`):**
   - **Most Critical Header:** `ETag: "1-a8f9c1"`
   - **Why:** The entity tag cryptographically fingerprints the state of the grievance. It powers conditional bandwidth savings (`If-None-Match -> 304`) and optimistic concurrency locking (`If-Match -> 412`).
3. **`OPTIONS /complaints` (Success: `204 No Content`):**
   - **Most Critical Header:** `Allow: GET, POST, OPTIONS`
   - **Why:** Informs consumers and proxies what HTTP methods are valid on the resource, preventing illegal method dispatch before issuing actual payload calls.

---

### 2. Safe vs. Idempotent Endpoints & Making Non-Idempotent Calls Retry-Safe
- **Safe Endpoints (No state change):** `GET /complaints/{id}`, `GET /complaints`, `OPTIONS /complaints`.
- **Idempotent Endpoints (Repeat execution yields identical system state):** `GET /complaints/{id}`, `GET /complaints`, `OPTIONS /complaints`, `DELETE /complaints/{id}`, conditional `PATCH /complaints/{id}` with `If-Match`.
- **Neither Safe Nor Idempotent:** `POST /complaints` (Filing a complaint) and `POST /complaints/{id}/comments` (Appending a comment).
- **How we made `POST /complaints` retry-safe:**
  By implementing the **`Idempotency-Key` protocol**. The client sends a unique UUID in the `Idempotency-Key` header. The server stores this key alongside the persisted record. If network drops the response and the client retries with the same key, the server identifies the existing record and immediately returns the cached `200 OK` representation without creating a second complaint or re-triggering SMS alerts.

---

### 3. ETag Demonstration, 304 Not Modified, and 412 Precondition Failed
- **Generated ETag:** `ETag: "1-4b7e8d2a1c0f"`
- **Conditional Read returning `304`:**
  ```http
  GET /complaints/cmp_1001 HTTP/1.1
  Host: localhost:8082
  If-None-Match: "1-4b7e8d2a1c0f"
  ```
  *Response:* `HTTP/1.1 304 Not Modified` (empty body).  
  **What it saves:** Saves bandwidth and JSON parsing CPU time on mobile devices.
- **Conditional Write returning `412`:**
  ```http
  PATCH /complaints/cmp_1001 HTTP/1.1
  Host: localhost:8082
  Authorization: Bearer test-token
  If-Match: "1-stale-hash"
  Content-Type: application/json

  { "title": "Updated title after concurrent modification" }
  ```
  *Response:* `HTTP/1.1 412 Precondition Failed` (`/errors/precondition-failed`).  
  **What it prevents:** Prevents **Lost Updates**. If Editor B reads version 1, Editor A updates to version 2, Editor B's update with `If-Match: "1-..."` is rejected before it can overwrite Editor A's edits.

---

### 4. 422 Unprocessable Entity vs. 400 Bad Request
- **Request triggering `400 Bad Request`:**
  ```http
  POST /complaints HTTP/1.1
  Host: localhost:8082
  Authorization: Bearer test-token
  Content-Type: application/json

  { "title": "Broken pipe", malformed_json_missing_quotes...
  ```
  *Reason:* The HTTP message body is syntactically malformed and cannot be parsed as valid JSON.
- **Request triggering `422 Unprocessable Entity`:**
  ```http
  POST /complaints HTTP/1.1
  Host: localhost:8082
  Authorization: Bearer test-token
  Content-Type: application/json

  { "title": "Tap", "categoryId": "space_station" }
  ```
  *Reason:* The JSON is 100% syntactically well-formed, but the payload fails domain business rules (title length < 5 characters, invalid category enum).
- **The Core Difference:** `400` means *"your message syntax was broken"*, whereas `422` means *"your syntax was valid, but the domain refuses the values"*.

---

### 5. Cross-Origin Blocked Call (200 in Server Logs, Blocked in Browser)
- **Who Blocked It:** The **Web Browser's Same-Origin Policy (SOP)** engine. The server executed the request and returned `200 OK`, but because the response was missing cross-origin sharing permissions, the browser refused to expose the payload to the calling JavaScript script.
- **Which Response Header Fixes It:**
  ```http
  Access-Control-Allow-Origin: *
  ```
  (or pointing to the client domain `Access-Control-Allow-Origin: http://localhost:5173`). Additionally, answering `OPTIONS` preflight with `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` resolves browser preflight checks.

---

### 6. Cache-Control: Caching Allowed vs. `no-store`
- **Response allowing caching:**
  `GET /complaints/{id}` -> `Cache-Control: max-age=60, private, must-revalidate`  
  *Why:* Grievance details rarely change every second. Caching for 60 seconds with `must-revalidate` significantly reduces server load while ensuring clients check freshness before displaying stale data.
- **Response requiring `no-store`:**
  `POST /complaints` or `PATCH /complaints/{id}` -> `Cache-Control: no-store`  
  *Why:* State-mutating operations and responses containing sensitive student identifiers must never be stored in browser history, intermediary HTTP proxy caches, or shared storage.

---

### 7. Search/List as GET vs. When POST is Justified
- **Current Endpoint:** `GET /complaints?category=hostel&status=submitted`
- **When POST would be justified:**
  When search filter parameters become exceptionally complex, such as multi-dimensional geospatial polygon coordinates, large arrays of user IDs, or complex nested boolean filter trees exceeding URI length limits (typically 2048 characters), or when search queries contain sensitive personal data that should not appear in access logs, URLs, or browser history.
- **What is given up by switching to POST:**
  1. **Cacheability:** POST responses are non-cacheable by default in CDNs and browsers.
  2. **Bookmarkability and Linkability:** Users cannot share, bookmark, or refresh the search URL.
  3. **Idempotence and Safety:** Browsers warn users *"Confirm Form Resubmission"* on back/refresh navigation.

---

### 8. `Location` Header on 201 vs. 3xx Redirect
- **On `201 Created`:**
  Points to the **URL of the newly created resource** (e.g. `Location: /complaints/cmp_1001`), telling the client where the permanent newly minted record is located.
- **On `3xx Redirect` (e.g. `301 Moved Permanently` or `303 See Other`):**
  Points to the **target destination URL** where the client must direct its subsequent request (e.g. `Location: /new-complaints-portal/cmp_1001`), telling the client where to go next.
