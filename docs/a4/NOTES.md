# Assignment 4: Rebuilding a Service in REST - Notes and Architectural Audit

**Service Implemented:** Nivaaran Complaints Service (`services/complaints`)  
**Technology Stack:** Node.js, Express, JavaScript (MERN Stack Backend)  
**Team Members:**
- Ritik (20251651078) - Complaints Service & Client Integration
- Abhishek (20251651006) - Complaints Service & Orchestration
- Aarambhika (20251651001) - Accounts & Directory Services

---

## Part A · Resource Modelling

### A4: Resource Table

| Method | URL | What it does | Success Code | Failure Codes |
|---|---|---|---|---|
| `POST` | `/complaints` | File a new grievance complaint (supports `Idempotency-Key` header) | `201 Created` with `Location` (`200 OK` on idempotent repeat) | `400 Bad Request`<br/>`422 Unprocessable`<br/>`503 Service Unavailable` |
| `GET` | `/complaints/{id}` | Read single complaint by ID | `200 OK` | `404 Not Found` |
| `GET` | `/complaints?category=&status=` | Filter complaints list by category or lifecycle status | `200 OK` | `400 Bad Request` |
| `POST` | `/complaints/{id}/escalate` | Escalate an overdue complaint (state-changing sub-resource) | `200 OK` | `400 Bad Request`<br/>`404 Not Found`<br/>`409 Conflict` |
| `POST` | `/complaints/{id}/comments` | Append discussion comment or staff note to thread | `201 Created` | `400 Bad Request`<br/>`404 Not Found` |

---

### A5: Justification of One Hard Choice

The operation that mapped least comfortably onto a REST resource was **`escalateComplaint(...)`**.

In traditional RPC/SOAP, escalation was represented as a procedure call: `escalateComplaint(complaintId, initiatorId, reason)`. In REST, URLs must represent durable things (nouns), and verbs must never survive into path names.

We evaluated three potential designs:
1. **Top-level collection (`POST /escalations`):** Rejected because escalation is not an independent top-level entity; decoupling it from the complaint weakens the lifecycle encapsulation.
2. **Generic property update (`PATCH /complaints/{id}` with `{ "isEscalated": true }`):** Rejected because escalation is not merely mutating a flag; it is a critical business event that enforces prerequisite checks (SLA deadline breach), records an immutable audit reason, notifies administrative oversight tiers, and must deterministically reject repeated submissions with `409 Conflict`.
3. **State-changing sub-resource (`POST /complaints/{id}/escalate`):** **Selected.** This maps escalation as an action on a specific grievance resource while maintaining proper URI hierarchy. It allows clear semantic distinction: a successful first escalation returns `200 OK`, while a subsequent call returns `409 Conflict` (State Conflict).

---

## Part D · Network Resilience and Fallback

### D3: Fallback Reasoning

When Complaints calls the Accounts service (`GET /users/{userId}`) to verify student registration, the outbound call is hardened with a 2.0-second timeout, exponential backoff with randomized jitter, and a circuit breaker (`src/breaker.js`).

If the Accounts service is completely offline after all retries, Complaints applies a **graceful degradation fallback**:
- The complaint is accepted and persisted with `user_validation_pending: true`, returning `201 Created` with a `Location` header to the caller.
- **Why failing would have been wrong:** If Complaints rejected the request with `503 Service Unavailable`, a student reporting an active electrical emergency, broken water pipe, or safety hazard would be blocked entirely simply because an auxiliary directory service had a transient network restart. The foundational rule of Nivaaran is: **never lose a student's grievance due to temporary helper service outages.**
- **How degradation is handled:** The grievance enters the queue immediately for triage, while an asynchronous outbox worker re-validates the user account once the Accounts service recovers.

---

## Answers to Assignment 4 Questions

### Question 1: Line Count Comparison (WSDL vs. OpenAPI)

- **Assignment 3 WSDL (`docs/a3/partner.wsdl`):** **94 lines** (defining only 1 operation: `sendSMS`).
- **Assignment 4 OpenAPI (`services/complaints/openapi.yaml`):** **377 lines** (defining 5 complete REST operations).

**What the difference is made of:**
WSDL requires massive XML syntactic ceremony. In WSDL, even a single operation demands declarations across 6 separate XML elements: `<types>`, two distinct `<message>` elements, `<portType>`, `<binding>`, and `<service>/<port>`. In contrast, OpenAPI expresses rich schema validation, multiple failure responses, and parameter descriptions concisely in YAML.

**Two things the WSDL declared that OpenAPI does not need to:**
1. **`<binding>`:** WSDL had to explicitly declare protocol binding, transport style (`soap:binding transport=".../http" style="document"`), and SOAP action headers (`soap:operation soapAction="..."`). In OpenAPI, REST over HTTP with JSON is the universal convention; transport binding declarations vanish completely.
2. **`<message>`:** WSDL forced authoring separate named message envelopes per direction (`sendSMSRequestMessage`, `sendSMSResponseMessage`) tying parts to types. OpenAPI directly binds schemas to `requestBody` and `responses` using `$ref` without intermediate wrapper declarations.

---

### Question 2: SOAP Fault vs. HTTP Status Code and Problem Details

**Assignment 3 `soap:Fault` (`docs/a3/soap-fault.xml`):**
```xml
<soap:Fault>
    <faultcode>soap:Client</faultcode>
    <faultstring>Invalid Recipient Mobile Number</faultstring>
    <detail>
        <sms:smsFaultDetail>
            <sms:errorCode>INVALID_MSISDN</sms:errorCode>
            <sms:detailMessage>The mobile destination +910000000000 failed telecom prefix validation.</sms:detailMessage>
        </sms:smsFaultDetail>
    </detail>
</soap:Fault>
```

**Replaced in Assignment 4 REST by HTTP Status `422 Unprocessable Entity` with RFC 7807 Problem Details:**
```json
{
  "type": "/errors/user-not-verified",
  "title": "User Not Verified",
  "status": 422,
  "detail": "User 20251651078 not found in Accounts directory"
}
```

**Why returning that error inside a 200 OK is a problem for the network in between:**
In SOAP architectures, HTTP was treated purely as a blind transport pipe; servers routinely wrapped `<soap:Fault>` XML payloads inside an HTTP `200 OK` response. 

This creates severe issues for intermediate network infrastructure:
1. **HTTP Caches (Proxies / CDNs):** Caching intermediaries (such as Nginx, Cloudflare, or Varnish) examine only the HTTP status line. Seeing `200 OK`, a cache stores the response and serves the cached "error" or "declined" payload to subsequent valid requests from other clients.
2. **Load Balancers and Circuit Breakers:** Health monitors, reverse proxies, and cloud gateways rely on 5xx/4xx metrics to detect failing instances and trip circuit breakers. When errors return as `200 OK`, automated health checks report 100% success while end-users experience complete service outage.
3. **Operational Dashboards:** SRE alerting rules trigger on HTTP error rate spikes. Masking faults under `200 OK` blinds monitoring systems and requires complex, expensive deep packet inspection of XML bodies.

REST restores semantic correctness: status codes inform the network layer, while the Problem Details body informs the application.

---

### Question 3: UDDI's Three Moves (Publish, Find, Bind)

| UDDI Move | Status in New Setup | What Took Over the Job |
|---|---|---|
| **Publish** | Replaced | In UDDI, an operator registered XML taxonomies (`businessEntity`, `tModel`) into a registry server. In our modern setup, **the container platform takes over**: on startup, the container automatically registers its service name in Docker Compose / Kubernetes cluster DNS. |
| **Find** | Replaced | In UDDI, consumers executed programmatic `<find_service>` XML queries against the UDDI registry. In our modern setup, **platform DNS and environment variables** take over: Complaints resolves Accounts using `ACCOUNTS_URL=http://accounts:8080`. DNS handles routing to healthy instances. |
| **Bind** | **Disappeared** | In UDDI, binding required downloading the WSDL from the `bindingTemplate`, generating client proxy stubs, and configuring SOAP message marshalling. In REST, **nothing needs to be bound**: the client makes standard HTTP requests (`GET`, `POST`) carrying standard JSON. The universal HTTP/JSON interface eliminates stub compilation entirely. |

---

### Question 4: XML Schema vs. Hand-Written Validation

- **Specific Function in Code:** `validateCreateComplaint(body)` in `services/complaints/src/validate.js`.
- **One Failure That Would Get Through If Not Written:**
  If `validateCreateComplaint` were not executed, an incoming request missing required attributes (e.g., `{}` or `{ "title": "broken tap" }` omitting `userId` and `categoryId`), or containing invalid category enums (`{ "categoryId": "library" }`), would reach the controller unchecked. 
  In Node.js, attempting to execute `body.userId.trim()` or computing SLA turnaround based on an undefined category would trigger an unhandled runtime error:
  `TypeError: Cannot read properties of undefined (reading 'trim')`
  This would crash the handler and return an unhelpful `500 Internal Server Error` instead of an informative, field-specific `400 Bad Request` with Problem Details.

---

### Question 5: Choosing SOAP Stack Over REST

We would still choose the SOAP stack at the **External Financial Bank Payment Gateway Boundary** (such as integrating SBI/HDFC institutional payment gateways for student mess fee transactions).

**Exact Guarantee Bought:**
We would be buying **WS-Security (WSS) message-level signing and encryption** combined with **WS-AtomicTransaction (two-phase commit)**:
1. **End-to-End Message Protection:** In enterprise banking, payment packets pass through multiple intermediate proxy servers, cloud gateways, and telco switches. HTTPS TLS only encrypts point-to-point connections; at each intermediate hop where TLS terminates, the payload is exposed in plaintext memory. WS-Security digitally signs and encrypts the XML payload at the sender, ensuring tamper-proof integrity and non-repudiation across arbitrary intermediate hops.
2. **ACID Distributed Transactions:** WS-AtomicTransaction provides formal two-phase commit protocols across heterogeneous banking databases, guaranteeing that money debited from a student account is atomically credited to the institute without partial or duplicate execution.
