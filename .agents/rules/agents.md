# AGENTS.md — Engineering Constitution for AI Coding Agents

> **Authority**: This file is the canonical instruction set for all AI coding agents, copilots, and automated contributors operating in this repository. Every code generation decision, architectural choice, and implementation pattern must be consistent with the principles defined here. Agents that deviate from these rules are generating incorrect output.

---

## 0. META-INSTRUCTIONS FOR AI AGENTS

Before generating any code, every AI agent MUST:

1. **Read this file completely** — do not skip sections
2. **Identify the architectural domain** — what layer of the system is being touched?
3. **Check for existing patterns** — search the codebase before inventing new ones
4. **Validate scalability assumptions** — assume 1M+ users unless explicitly told otherwise
5. **Consider failure modes** — what happens when this code runs in a degraded environment?
6. **Plan for observability** — every meaningful operation must be traceable
7. **Never optimize prematurely, but never ignore obvious scale hazards**

When in doubt: **prefer operational simplicity over clever engineering**.

---

## 1. CORE ENGINEERING PHILOSOPHY

### 1.1 The Three Pillars (Non-Negotiable)

**Reliability** — The system must continue to work correctly even when things go wrong. Faults in hardware, software, and human operation are inevitable. We design fault-tolerant systems that prevent individual faults from becoming system-wide failures.

**Scalability** — No architecture scales infinitely. Every design embeds assumptions about load. When load increases by 10×, the architecture must have a clear upgrade path. We always describe load explicitly (requests/sec, fan-out ratio, active users) before discussing scalability.

**Maintainability** — The majority of software cost is maintenance, not initial development. We design for the team that will inherit this code, not the team building it. Every engineer — including AI agents — is responsible for not creating legacy software.

### 1.2 The Failure-First Mindset

Assume components fail. Design accordingly:
- Hardware fails randomly and independently
- Software fails systematically across all instances
- Humans fail through configuration errors (this is the #1 cause of outages)
- Networks fail with partial failures, not clean all-or-nothing failures
- Clocks are unreliable — never use wall-clock time for ordering events across nodes

### 1.3 Operational Simplicity as a Feature

A system that is easy to operate is a system that can be recovered from failure quickly. Prefer:
- Boring, well-understood technologies over novel but complex ones
- Explicit configuration over implicit convention (at the system boundary)
- Self-healing systems with manual override capability
- Predictable behavior over clever optimizations

---

## 2. SYSTEM DESIGN PRINCIPLES

### 2.1 Data Modeling Philosophy

**Choose the right data model for the access pattern:**

| Access Pattern | Preferred Model |
|---|---|
| Entity relationships, joins, complex queries | Relational (PostgreSQL) |
| Document-centric, schema flexibility, self-contained records | Document (MongoDB, DynamoDB) |
| High-throughput key-value, simple lookups | Key-value (Redis, DynamoDB) |
| Graph traversal, relationship queries | Graph (Neo4j, Neptune) |
| Immutable event history, audit trail | Append-only log (Kafka, event store) |
| Analytical aggregation, time-series | Column-store (ClickHouse, BigQuery, Redshift) |

**Data modeling rules for agents:**
- Use normalized schemas unless denormalization is explicitly justified by performance measurement
- Every table must have a meaningful primary key — use UUIDs for distributed systems, not auto-increment integers
- Foreign keys express intent; enforce them in the application layer if the database cannot
- Schema changes must be backward AND forward compatible (rolling deployments require this)
- Avoid storing derived data in the primary store — compute it or cache it

### 2.2 Service Boundaries

Define service boundaries by:
1. **Data ownership** — one service owns one domain of data
2. **Change cadence** — services that change together can be the same service
3. **Scalability requirements** — services with different load profiles should scale independently
4. **Team ownership** — Conway's Law is real; service boundaries should mirror team boundaries

**Hard rules:**
- No service reads directly from another service's database
- Communication between services is async-by-default (queues/events)
- Synchronous inter-service calls (REST/gRPC) are used for real-time requirements only
- Every service exposes a contract (API schema) that is versioned

### 2.3 OLTP vs. OLAP Separation

- **OLTP systems** (user-facing): optimize for low-latency reads/writes of individual records; use row-oriented storage; index aggressively
- **OLAP systems** (analytics): optimize for throughput over large scans; use column-oriented storage; separate database entirely (data warehouse)
- **Never run analytics queries against production OLTP databases** — use read replicas, CDC pipelines, or a dedicated warehouse
- ETL/ELT pipelines bridge OLTP to OLAP; keep them idempotent and restartable

---

## 3. CODING PHILOSOPHY

### 3.1 Abstractions

A good abstraction hides complexity behind a clean interface. Build abstractions that:
- Have a single, well-defined purpose
- Are composable with other abstractions
- Can be tested in isolation
- Do not leak implementation details to callers

Bad abstractions are worse than no abstraction — they mislead without simplifying.

### 3.2 Naming and Clarity

- Name variables, functions, and services by what they **do**, not how they work
- Never use abbreviations unless they are industry-standard (e.g., `id`, `url`, `HTTP`)
- Functions should have one responsibility; if you need "and" in the description, split it
- Comments explain **why**, not **what** — the code should be self-explanatory

### 3.3 Error Handling

Every function that can fail MUST:
- Return typed errors (not generic exceptions where possible)
- Document what errors it can return
- Not silently swallow errors
- Include context in error messages (what operation, what input, what failed)

```
// WRONG:
catch (err) {
  console.log(err);
}

// RIGHT:
catch (err) {
  throw new ServiceError(`Failed to fetch user ${userId} from cache`, {
    cause: err,
    operation: 'getUserFromCache',
    userId,
  });
}
```

### 3.4 State Management

Mandated state management tools by state type:
- **API / Server Data**: Always use **TanStack Query** (caching, autosync, retries, background fetching).
- **Global App/UI State**: Always use **Zustand** (lightweight, fast, simple global state).

Additional guidelines:
- Prefer stateless components — easier to scale, restart, and reason about
- When state is required, make it explicit and isolated
- Shared mutable state is the root of most concurrency bugs
- Use immutable data structures when possible
- Keep state in the persistence layer, not in application memory

---

## 4. SCALABILITY MINDSET

### 4.1 Describe Load Before Optimizing

Before any performance work, define:
- **Throughput**: requests per second, events per second, records per batch
- **Fan-out**: how many downstream effects does one action cause?
- **Read/write ratio**: what fraction of operations are reads vs. writes?
- **Data volume**: GB/TB in the system today and in 1 year
- **Latency requirements**: P50, P95, P99 targets (not averages — percentiles)

> "Amazon observed a 100ms increase in response time reduces sales by 1%." — measure tail latencies, not averages.

### 4.2 Scaling Strategies

**Vertical scaling (scale up):** Simpler, no distributed complexity. Do this first.

**Horizontal scaling (scale out):** Required when vertical limits are hit. Introduces:
- State synchronization challenges
- Network partition risk
- Distributed coordination overhead

**Rules for scaling:**
- Stateless services scale trivially — keep services stateless
- Stateful systems (databases) are hard to scale — scale them last and carefully
- Read replicas are cheap scalability for read-heavy workloads
- Caching is the highest ROI scalability investment
- Queue-based load leveling absorbs traffic spikes without dropping requests

### 4.3 The Fan-Out Problem

When one write triggers many downstream writes (e.g., Twitter's home timeline), consider:
- **Push model** (fan-out on write): pre-compute results; fast reads, slow writes
- **Pull model** (fan-out on read): compute at read time; slow reads, fast writes
- **Hybrid**: push for most users, pull for high-fan-out edge cases (celebrities)

Agents: always identify fan-out patterns in features that involve "notify all followers", "update all subscribers", etc.

### 4.4 Head-of-Line Blocking

A single slow request can block the queue for all subsequent requests. Mitigate with:
- Timeout on all blocking operations
- Circuit breakers to fast-fail when dependencies are degraded
- Separate thread pools/queues for different priority operations
- Async processing for non-critical operations

---

## 5. DISTRIBUTED SYSTEMS BEST PRACTICES

### 5.1 The Fallacies of Distributed Computing

Agents must never assume:
- The network is reliable
- Latency is zero
- Bandwidth is infinite
- The network is secure
- Topology doesn't change
- There is one administrator
- Transport cost is zero
- The network is homogeneous

Every inter-service call must handle: network timeouts, partial failures, retries, and idempotency.

### 5.2 Clocks and Ordering

**Never use wall-clock timestamps to order events across distributed nodes.** Clocks drift. NTP synchronization is imperfect. Two events with timestamps 1ms apart may have happened in any order.

Use instead:
- **Logical clocks** (Lamport timestamps, vector clocks) for causality tracking
- **Sequence numbers from a single leader** for total ordering within a partition
- **Event IDs with happens-before metadata** for causal ordering in event-driven systems
- **Database sequence numbers / auto-increment** for ordering within a single node

### 5.3 Partial Failures

In a distributed system, partial failure is the normal operating mode. Design for it:
- A service can be reachable from some nodes but not others
- A node can be alive but unresponsive (GC pause, CPU saturation, slow disk)
- A write can succeed at some replicas but not others
- A message can be delivered 0, 1, or N times — design for idempotency

### 5.4 Process Pauses

Long GC pauses, VM migrations, and OS scheduling preemptions can stop a process for seconds or minutes. A process that was a leader before a pause may no longer be the leader after it. This means:
- Never assume you are still the leader after a blocking operation
- Use fencing tokens (monotonically increasing sequence numbers) to prevent split-brain writes
- Design for the case where a process "wakes up" from a pause into a world that has moved on

---

## 6. EVENT-DRIVEN ARCHITECTURE GUIDANCE

### 6.1 When to Use Events

Use event-driven patterns when:
- Multiple downstream services need to react to state changes
- You need to decouple producers from consumers
- You need audit trails and event history
- You want to support event replay for backfill or recovery
- Processing can tolerate some latency

Use synchronous calls when:
- You need an immediate response to complete the operation
- The caller must know the result before proceeding
- The operation is short-lived and the dependency is highly available

### 6.2 Event Schema Design

Events are the API contract of an event-driven system. Design them carefully:
- Events must be backward compatible (new consumers must handle old events)
- Events must be forward compatible (old consumers must handle new event fields gracefully)
- Use schema registries (Avro + Schema Registry, or Protobuf) for binary formats
- Include: event type, version, timestamp, source service, correlation ID, causation ID
- Events describe **what happened**, not **what to do** — use past tense naming (`OrderPlaced`, `PaymentFailed`)

### 6.3 Event Sourcing

When to use event sourcing:
- When audit trails are required
- When you need point-in-time reconstruction of state
- When you need to support multiple read models from the same data

Event sourcing rules:
- Events are immutable — never update or delete events
- Aggregate state is derived by replaying events from the beginning (or from a snapshot)
- Snapshotting is required for long-lived aggregates to avoid unbounded replay time
- The event store is the system of record; projections are derived data

### 6.4 Message Delivery Guarantees

| Guarantee | Cost | When to Use |
|---|---|---|
| At-most-once | Lowest | Metrics, non-critical notifications |
| At-least-once | Medium | Most business events (requires idempotent consumers) |
| Exactly-once | Highest | Financial transactions, inventory changes |

**Default to at-least-once delivery with idempotent consumers.** True exactly-once requires distributed transactions, which are expensive and operationally complex.

---

## 7. DATABASE SELECTION LOGIC

Use this decision matrix:

```
Need full ACID transactions?
  YES → PostgreSQL (default choice)
  NO → continue

Need low-latency key-value access?
  YES → Redis (in-memory) or DynamoDB (durable)
  NO → continue

Need flexible document schema?
  YES → MongoDB or DynamoDB
  NO → continue

Need analytical aggregations over large datasets?
  YES → BigQuery / Redshift / ClickHouse (data warehouse)
  NO → continue

Need full-text search?
  YES → Elasticsearch / OpenSearch (as a secondary index)
  NO → continue

Need graph traversal?
  YES → Neo4j / Neptune
  NO → Use PostgreSQL
```

**Rules:**
- Default to PostgreSQL for new relational data
- Default to Redis for caching and session storage
- Default to Kafka for durable event streaming
- Default to S3 for blob/file storage
- Never store large blobs in a relational database
- Use polyglot persistence — one database is rarely the right answer for all needs

---

## 8. API DESIGN PRINCIPLES

### 8.1 REST API Rules

- Use nouns for resources, verbs for HTTP methods: `GET /orders/{id}`, `POST /orders`
- Versioning is mandatory: `/api/v1/...` — never break existing clients
- Return consistent error envelopes: `{ "error": { "code": "ORDER_NOT_FOUND", "message": "...", "requestId": "..." } }`
- Pagination is required for all list endpoints — use cursor-based pagination for scalability
- Use HTTP status codes correctly: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests, 500 Internal Server Error
- Rate limiting is required on all public-facing APIs
- Idempotency keys are required for all non-idempotent POST/PATCH/DELETE operations

### 8.2 gRPC/RPC Rules

- Define service contracts in Protobuf; version them
- Use streaming for large response sets instead of pagination
- Implement deadlines on all calls (not timeouts — deadlines propagate across services)
- Use metadata for tracing headers (trace-id, span-id)

### 8.3 API Gateway Responsibilities

The API gateway handles:
- Authentication & authorization (JWT validation)
- Rate limiting
- Request routing
- TLS termination
- Request/response logging
- CORS headers

Services behind the gateway should NOT re-implement these concerns.

---

## 9. FAULT TOLERANCE PATTERNS

### 9.1 Circuit Breaker

Implement circuit breakers on all external service calls:
- **Closed**: Normal operation; failures counted
- **Open**: Fast-fail all requests; dependency is considered down
- **Half-open**: Probe with occasional requests to test recovery

Use libraries: `cockatiel` (Node.js), `resilience4j` (Java/Kotlin), `polly` (Python)

### 9.2 Retry with Exponential Backoff

```
Initial delay: 100ms
Multiplier: 2x
Max delay: 30s
Max attempts: 5
Jitter: ±20% (prevents thundering herd)
Retry on: 429, 503, network timeouts
Do NOT retry on: 400, 401, 403, 404 (client errors are not retriable)
```

### 9.3 Timeout Hierarchy

Every level of the call stack must have shorter timeouts than the level above:
- User-facing request timeout: 10s
- Service-to-service call: 5s
- Database query: 3s
- Cache lookup: 100ms

If inner timeouts are longer than outer timeouts, cascading failures become unrecoverable.

### 9.4 Bulkhead Pattern

Isolate different workload types into separate thread pools / queue workers:
- Critical path (user-facing) is isolated from background jobs
- One failing consumer does not exhaust shared resources
- Use `p-limit` (Node.js) or semaphores to bound concurrency

### 9.5 Idempotency

Every write operation that may be retried MUST be idempotent:
- Use idempotency keys on API endpoints that change state
- Idempotency keys must be stored and checked at the database level
- For queue consumers: use the message ID as the idempotency key
- Idempotency window: at minimum 24 hours, ideally 7 days

---

## 10. CACHING STRATEGY

### 10.1 Cache Placement

| Layer | Tool | TTL | Use Case |
|---|---|---|---|
| Application memory | In-process LRU | Seconds | Hot config, feature flags |
| Distributed cache | Redis | Minutes to hours | Session, computed results |
| CDN | CloudFront/Fastly | Hours to days | Static assets, public API responses |
| Browser | HTTP Cache-Control | Per resource | Static assets |

### 10.2 Cache Invalidation

The two hardest problems in computing: cache invalidation and naming things.

Strategies:
- **TTL-based expiration**: simple; accept eventual staleness
- **Write-through**: update cache on every write; strong consistency
- **Write-behind (write-back)**: buffer writes in cache, persist asynchronously; risk of data loss
- **Cache-aside (lazy loading)**: populate cache on miss; risk of cold-start stampede (use locks)
- **Event-driven invalidation**: publish invalidation events on write; most accurate but complex

**Default to cache-aside with TTL.** Use event-driven invalidation only when staleness is unacceptable.

### 10.3 Cache Anti-Patterns

- **Cache the database**: caching every database row creates cache bloat; cache query results or domain objects
- **Cache without TTL**: memory leaks; stale data forever
- **Stampede on cold start**: use probabilistic early expiration or locks
- **Caching user-specific data in a shared cache without key isolation**: security vulnerability
- **Caching errors**: a failed API call that is cached will fail for all subsequent callers

---

## 11. QUEUE AND STREAM PROCESSING GUIDANCE

### 11.1 When to Use Queues vs. Streams

| Queue (RabbitMQ, SQS) | Stream (Kafka, Kinesis) |
|---|---|
| Task distribution to workers | Event log / audit trail |
| Work queue pattern | Fan-out to multiple consumers |
| Message deleted after processing | Messages retained (replay possible) |
| Point-to-point | Publish-subscribe |
| Short retention | Long retention (days to forever) |

### 11.2 Consumer Groups and Partitioning

- Each consumer group processes the full stream independently
- Partition count determines max parallelism — plan this at topic creation
- Partition key determines ordering — events with the same partition key are processed in order
- Choose partition keys carefully: user_id distributes well; timestamp creates hot partitions

### 11.3 Backpressure

When consumers are slower than producers:
- **Queue**: messages accumulate; monitor queue depth
- **Stream**: consumer lag increases; monitor consumer offset lag
- Never let unbounded lag accumulate — set alerts and auto-scaling rules
- If consumers cannot keep up: scale consumers, optimize consumer logic, or reduce producer rate

### 11.4 Dead Letter Queues

Every queue must have a dead letter queue (DLQ):
- Move messages to DLQ after N failed processing attempts
- Alert on DLQ depth > 0
- DLQ messages require manual intervention or automated retry logic
- Include original message, failure reason, and attempt count in DLQ metadata

---

## 12. CONSISTENCY VS. AVAILABILITY DECISION RULES

### 12.1 Understanding the CAP Theorem

In the presence of a network partition, choose:
- **Consistency**: reject operations that cannot be confirmed by a quorum (CP)
- **Availability**: accept operations and reconcile conflicts later (AP)

Most real systems don't live at either extreme. The spectrum is:
```
Strong Consistency ←————————————————→ Eventual Consistency
(Linearizability)   Snapshot   Read-committed   (Eventual)
```

### 12.2 When to Choose Consistency

Use strong consistency (linearizability) for:
- Financial transactions (account balances, payment processing)
- Inventory management (prevent overselling)
- Distributed locks and leader election
- Any operation where duplicate or out-of-order execution causes corruption

Trade-off: higher latency, lower availability during network partitions.

### 12.3 When to Choose Availability

Use eventual consistency for:
- Social media feeds (slightly stale is acceptable)
- Shopping cart contents (stale reads are recoverable)
- Recommendation engines (approximation is fine)
- Read-heavy dashboards with tolerable lag

Trade-off: must handle conflict resolution, stale reads, and reconciliation.

### 12.4 Isolation Levels (Relational Databases)

| Level | What It Prevents | Use When |
|---|---|---|
| Read Committed | Dirty reads | Default for most OLTP |
| Repeatable Read | Dirty reads, non-repeatable reads | Default in MySQL/InnoDB |
| Snapshot Isolation (MVCC) | Most anomalies except write skew | Complex multi-read transactions |
| Serializable | All anomalies including write skew | Financial operations, booking systems |

**Default to Snapshot Isolation.** Use Serializable when write skew would be catastrophic. Avoid weaker levels in critical paths.

---

## 13. PERFORMANCE OPTIMIZATION PHILOSOPHY

### 13.1 Measure Before Optimizing

Never optimize without a benchmark that proves the optimization is needed. The optimization workflow:
1. Define the performance requirement (P99 < 200ms)
2. Measure current performance against the requirement
3. Profile to identify the actual bottleneck
4. Optimize the bottleneck
5. Measure again to confirm improvement
6. Repeat

### 13.2 Common Bottlenecks and Solutions

| Bottleneck | Diagnostic | Solution |
|---|---|---|
| N+1 database queries | Slow query log, APM traces | Eager loading, DataLoader pattern |
| Missing database indexes | EXPLAIN ANALYZE | Add targeted indexes |
| Lock contention | Database lock monitoring | Optimistic locking, smaller transactions |
| Memory allocation | Heap profiling | Object pooling, streaming instead of buffering |
| Network round trips | Distributed tracing | Batch requests, caching, co-location |
| Disk I/O | Disk utilization metrics | SSD, caching, column-oriented storage for analytics |

### 13.3 Database Query Rules

- Every query must have a EXPLAIN ANALYZE reviewed before merging
- No queries without WHERE clause on large tables (unless intentional full scan)
- Indexes must cover the query; avoid index + filter patterns on large tables
- Avoid SELECT * — select only required columns
- Use connection pooling — opening a new DB connection per request is fatal at scale
- Limit result sets — unbounded queries will OOM under load

---

## 14. SECURITY ENGINEERING PRACTICES

### 14.1 Authentication and Authorization

- Authentication verifies identity; authorization verifies permissions — keep them separate
- Use JWT for stateless authentication with short expiry (15 min) + refresh tokens
- Refresh tokens must be rotated on use (sliding expiration)
- Use RBAC (Role-Based Access Control) or ABAC (Attribute-Based) — document the model
- Never check authorization in the database query — check it in the service layer
- Service-to-service auth: mTLS or signed JWTs with service identity

### 14.2 Data Protection

- Encrypt data at rest (AES-256) and in transit (TLS 1.2+)
- PII must be identified, minimized, and access-controlled
- Passwords: never store plaintext; use bcrypt/argon2 with appropriate cost factor
- Secrets: never hardcode; use secret managers (AWS Secrets Manager, Vault, GCP Secret Manager)
- Never log sensitive data (passwords, tokens, PII, payment data)
- Implement field-level encryption for highly sensitive data

### 14.3 Input Validation

- Validate and sanitize all inputs at the API boundary
- Use parameterized queries — never concatenate user input into SQL
- Validate content type, size, and structure of all uploads
- Rate limit by IP and authenticated user — prevent abuse before it hits the database

---

## 15. MONITORING AND OBSERVABILITY EXPECTATIONS

### 15.1 The Three Pillars of Observability

**Metrics**: Quantitative measurements over time
- Use the RED method for services: Rate, Errors, Duration
- Use the USE method for resources: Utilization, Saturation, Errors
- Implement SLOs (Service Level Objectives): latency P99, error rate, availability

**Logs**: Discrete events with context
- Structured logging only (JSON) — never unstructured text logs at scale
- Include: timestamp, level, service, version, trace_id, span_id, user_id (when applicable)
- Log at the right level: DEBUG (dev only), INFO (normal operations), WARN (degraded), ERROR (failure)

**Traces**: Distributed request tracing
- Every request gets a trace ID at the entry point
- Trace IDs propagate via headers to all downstream services
- Use OpenTelemetry for vendor-neutral instrumentation
- Trace all database queries, cache operations, and external HTTP calls

### 15.2 Alerting Standards

Alerts must be:
- **Actionable**: if you can't do anything about it, it's not an alert — it's a metric
- **Clear**: include what failed, what the impact is, and a runbook link
- **Calibrated**: alerts should page someone only when human action is required

Alert on:
- Error rate > N% (SLO breach)
- P99 latency > threshold
- Queue depth / consumer lag > threshold
- Database connection pool saturation
- Memory/disk approaching limits
- Security events (failed auth bursts, unusual access patterns)

### 15.3 SLO / SLA Framework

Define for every critical service:
- **Availability SLO**: e.g., 99.9% uptime (8.7 hours downtime/year budget)
- **Latency SLO**: e.g., P99 < 200ms, P50 < 50ms
- **Error rate SLO**: e.g., < 0.1% server errors

Track error budgets. When the error budget is consumed, all feature development stops until reliability is restored.

---

## 16. LOGGING STANDARDS

```json
{
  "timestamp": "2026-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "order-service",
  "version": "1.4.2",
  "environment": "production",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "usr_789",
  "request_id": "req_xyz",
  "message": "Order created successfully",
  "order_id": "ord_123",
  "duration_ms": 45
}
```

**NEVER log:**
- Passwords or authentication tokens
- Credit card numbers or payment data
- Personal health information
- Raw request/response bodies that contain PII
- API keys or secrets

---

## 17. RELIABILITY ENGINEERING PRINCIPLES

### 17.1 Chaos Engineering

Production reliability is proven by controlled failure injection. Implement:
- Random node termination in non-critical hours
- Network latency injection between services
- Database connection pool exhaustion tests
- Disk full simulation

If you haven't tested a failure scenario, assume it will fail badly when it happens in production.

### 17.2 Deployment Reliability

- **Blue-green deployments**: two identical environments; swap traffic; rollback by swapping back
- **Canary deployments**: route X% of traffic to new version; monitor; gradually increase
- **Feature flags**: decouple deployment from release; roll back features without redeploying
- **Database migrations**: must be backward compatible; run migrations before deploying new code
- **Never deploy on Friday** unless you will monitor through the weekend

### 17.3 Incident Response

- Define severity levels (P0–P4) with expected response times
- Document runbooks for all common failure scenarios
- Conduct blameless post-mortems for every P0/P1 incident
- Track action items from post-mortems to completion

---

## 18. INFRASTRUCTURE EXPECTATIONS

### 18.1 Cloud-Native Architecture

- Services run in containers (Docker) orchestrated by Kubernetes
- Use managed services where possible (RDS, ElastiCache, MSK) — avoid managing infrastructure for infrastructure
- Infrastructure is defined as code (Terraform, Pulumi, CDK)
- Immutable infrastructure — never SSH into a running server to make changes
- Environments are identical except for scale and data (dev = staging = prod, structurally)

### 18.2 Service Mesh

For services with complex inter-service communication:
- Use a service mesh (Istio, Linkerd) for: mTLS, observability, traffic management
- Circuit breaking and retry policies configured at the mesh level (not per service)

### 18.3 Multi-Region / Multi-AZ

- Critical services must span multiple availability zones
- Stateless services span regions trivially
- Stateful services require: active-passive failover, or active-active with conflict resolution
- RTO (Recovery Time Objective) and RPO (Recovery Point Objective) must be defined for every service

---

## 19. TECHNICAL DEBT MANAGEMENT RULES

- Technical debt is a trade-off, not a failure. Document it explicitly when taken on.
- All debt must have a ticket in the issue tracker — if it's not tracked, it doesn't exist
- No more than 20% of every sprint should be technical debt repayment (minimum)
- "Quick fixes" that survive more than one sprint become permanent — treat them as such
- Never take on technical debt in: security, data integrity, or observability
- Refactoring must be covered by tests before and after — if you can't test it, you can't safely refactor it

---

## 20. PRODUCTION READINESS CHECKLIST

Before any service ships to production, verify:

**Architecture**
- [ ] Service contract (API schema) is documented and versioned
- [ ] Data model is documented and reviewed
- [ ] Failure modes are documented with mitigation strategies
- [ ] Dependencies are identified with their SLAs

**Scalability**
- [ ] Load test performed at 3× expected peak load
- [ ] Auto-scaling configured with appropriate triggers
- [ ] Database connection pool sized correctly
- [ ] Caching strategy defined and implemented

**Reliability**
- [ ] Circuit breakers configured on all external dependencies
- [ ] Retries with exponential backoff implemented
- [ ] Idempotency implemented for all mutating operations
- [ ] Health check endpoints implemented (`/health`, `/readiness`)
- [ ] Graceful shutdown implemented (drain in-flight requests before termination)

**Observability**
- [ ] Structured logging implemented
- [ ] Distributed tracing instrumented
- [ ] Key metrics exported (RED + USE)
- [ ] Alerts defined and tested
- [ ] Dashboard created

**Security**
- [ ] Authentication and authorization implemented and reviewed
- [ ] No secrets in code or logs
- [ ] Input validation implemented
- [ ] Dependency vulnerability scan clean

**Operations**
- [ ] Deployment runbook written
- [ ] Rollback procedure tested
- [ ] Backup and restore procedure tested (for stateful services)
- [ ] On-call rotation updated

---

## 21. AI AGENT CODING BEHAVIOR INSTRUCTIONS

### 21.1 Before Writing Code

1. **Identify the layer**: UI, API, service, data access, infrastructure?
2. **Identify the data flow**: where does data come from, where does it go?
3. **Identify the scale**: how many requests per second? how much data?
4. **Identify the failure modes**: what happens if this code fails?
5. **Search for existing patterns**: is there already a pattern in this codebase for this problem?

### 21.2 Code Generation Standards

- Generate complete, working code — no `// TODO: implement this`
- Include error handling — never generate try-catch with empty bodies
- Include input validation — never trust caller input
- Include logging at meaningful operation boundaries
- Generate unit tests alongside business logic
- Use the language's type system — avoid `any` types

### 21.3 Database Code Standards

- Always use parameterized queries
- Always add appropriate indexes when creating tables (check the likely query patterns)
- Always handle database errors explicitly
- Never do database operations in loops — batch them
- Always use transactions for multi-step operations
- Use database migrations (not manual SQL) for schema changes

### 21.4 What Not to Generate

- Do NOT generate: hardcoded credentials, secrets, or API keys
- Do NOT generate: SQL with string concatenation
- Do NOT generate: code that ignores errors
- Do NOT generate: infinite loops without break conditions
- Do NOT generate: code that stores sensitive data in logs or plain text
- Do NOT generate: N+1 query patterns
- Do NOT generate: synchronous blocking calls where async is appropriate

---

## 22. REPOSITORY CONTRIBUTION RULES

1. All changes must have a corresponding issue/ticket
2. Branch naming: `feat/`, `fix/`, `refactor/`, `chore/` prefixes
3. Commits: conventional commit format (`feat: add order cancellation endpoint`)
4. PRs require: description of change, testing notes, performance impact assessment
5. PRs must not decrease code coverage (coverage gates enforced in CI)
6. Database migrations must be reversible (include rollback migration)
7. API changes must be backward compatible within a major version
8. Generated code (OpenAPI clients, protobuf) must not be manually edited

---

## 23. DECISION-MAKING FRAMEWORKS

### 23.1 The Architecture Decision Record (ADR)

For significant architectural decisions, document:
1. **Context**: what is the situation requiring a decision?
2. **Options considered**: what alternatives were evaluated?
3. **Decision**: what was chosen and why?
4. **Consequences**: what are the trade-offs and risks?

ADRs live in `docs/decisions/` and are never deleted (only superseded).

### 23.2 Technology Selection Criteria

Evaluate technologies by:
1. **Maturity**: how long has this been in production use at scale?
2. **Community**: is the ecosystem healthy? are bugs fixed promptly?
3. **Operational complexity**: can our team run this in production?
4. **Vendor lock-in risk**: can we migrate away if needed?
5. **Total cost**: licensing, infrastructure, engineering time

Default to boring, proven technology. Introduce novel technology only when proven options are insufficient.

### 23.3 Build vs. Buy Decision

Build when:
- The capability is a core competitive differentiator
- No adequate off-the-shelf solution exists
- Full control over the implementation is required for regulatory reasons

Buy/use OSS when:
- The capability is infrastructure (logging, monitoring, queuing)
- A mature open-source solution exists
- The build cost exceeds the buy cost over 2 years

---

## 24. ARCHITECTURE REVIEW CHECKLIST

Every significant architecture proposal must address:

**Data**
- [ ] What data is stored? What is its schema?
- [ ] Who owns this data? What other services access it?
- [ ] What is the data retention policy?
- [ ] How is the data backed up and restored?
- [ ] What are the privacy implications?

**Scalability**
- [ ] What are the expected load parameters (RPS, data volume, user count)?
- [ ] What is the bottleneck at current and 10× load?
- [ ] How does the system scale (horizontal, vertical, partitioning)?

**Reliability**
- [ ] What are the dependencies and their SLAs?
- [ ] What happens when each dependency fails?
- [ ] What is the RTO and RPO?

**Security**
- [ ] How is authentication and authorization enforced?
- [ ] What data is sensitive? How is it protected?
- [ ] What is the attack surface?

**Operational**
- [ ] How is the system deployed and rolled back?
- [ ] What are the operational runbooks?
- [ ] Who is on-call? What do they need to know?

---

*This document is the living engineering constitution of this repository. AI agents that deviate from these principles are generating code that will fail in production.*

*Version: 1.0 | Source: Designing Data-Intensive Applications (Kleppmann) + 2026 Engineering Standards*
