# SYSTEM_ARCHITECTURE_GUIDE.md — Practical Implementation-Oriented Architecture Guide

> **Purpose**: Concrete, opinionated guidance for building production backend systems. Every recommendation is grounded in distributed systems principles and production-proven patterns.

---

## 1. RECOMMENDED ARCHITECTURE STYLES

### 1.1 Default Architecture: Modular Monolith First

For teams with fewer than 20 engineers or products without proven traffic requirements, start with a well-structured modular monolith:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Modular Monolith                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  User Module │  │ Order Module │  │Payment Module│          │
│  │  (domain)    │  │  (domain)    │  │  (domain)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                │                  │                   │
│  ┌──────▼───────────────────────────────────▼───────┐          │
│  │               Shared Infrastructure               │          │
│  │        (database, cache, message broker)          │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits**: Simple deployment, easy debugging, low operational overhead, no distributed system complexity.

**When to decompose to microservices**:
- Independent scalability is required (one module gets 100× the traffic of others)
- Independent deployability is required (one team can't ship without coordinating all others)
- Technology heterogeneity is required (one domain needs a different language/stack)
- Team size has grown beyond 50+ engineers and coordination overhead is measurable

### 1.2 Microservices Architecture

Only after the above threshold is crossed:

```
                    ┌──────────────────┐
                    │    API Gateway   │
                    │  (auth, routing, │
                    │  rate limiting)  │
                    └────────┬─────────┘
                             │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
     ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
     │  User Svc   │  │  Order Svc   │  │ Payment Svc │
     │  :8001      │  │  :8002       │  │  :8003      │
     └──────┬──────┘  └───────┬──────┘  └──────┬──────┘
            │                 │                 │
     ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
     │  users DB   │  │  orders DB   │  │payments DB  │
     │  (Postgres) │  │  (Postgres)  │  │  (Postgres) │
     └─────────────┘  └──────────────┘  └─────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              │
                     ┌────────▼────────┐
                     │  Message Broker │
                     │  (Kafka)        │
                     └─────────────────┘
```

---

## 2. MONOLITH VS. MICROSERVICES DECISION MATRIX

| Factor | Favor Monolith | Favor Microservices |
|---|---|---|
| Team size | < 20 engineers | > 50 engineers, multiple teams |
| Product maturity | MVP / unproven market | Established product with clear domains |
| Traffic | < 10K RPS total | > 100K RPS with hotspots |
| Deployment frequency | Monthly | Daily per service |
| Technology diversity | Single language/framework | Multiple specialized stacks |
| Organizational autonomy | Centralized | Federated, independent teams |
| Operational maturity | Basic DevOps | Advanced platform engineering |
| Data model | Highly relational / shared | Domain-isolated data |

**The most common mistake**: decomposing into microservices before the domain is well understood, creating a distributed monolith — all the complexity of microservices with none of the benefits.

---

## 3. BACKEND FOLDER STRUCTURE

### 3.1 Modular Monolith (Node.js/TypeScript)

```
src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts      # HTTP handlers
│   │   ├── users.service.ts         # Business logic
│   │   ├── users.repository.ts      # Data access
│   │   ├── users.schema.ts          # Validation (Zod/Joi)
│   │   ├── users.events.ts          # Domain events
│   │   └── users.test.ts            # Unit tests
│   ├── orders/
│   │   └── ...
│   └── payments/
│       └── ...
├── shared/
│   ├── database/
│   │   ├── client.ts               # DB connection pool
│   │   └── migrations/             # Versioned migrations
│   ├── cache/
│   │   └── redis.ts                # Redis client
│   ├── messaging/
│   │   ├── publisher.ts            # Event publisher
│   │   └── consumer.ts             # Event consumer
│   ├── observability/
│   │   ├── logger.ts               # Structured logger
│   │   ├── tracer.ts               # OpenTelemetry tracer
│   │   └── metrics.ts              # Prometheus metrics
│   ├── auth/
│   │   └── middleware.ts           # JWT validation
│   └── errors/
│       └── errors.ts               # Typed error classes
├── infrastructure/
│   ├── http/
│   │   └── server.ts               # Express/Fastify server
│   └── workers/
│       └── queue.worker.ts         # Background job processor
├── config/
│   ├── app.config.ts               # Application config
│   └── database.config.ts          # DB config
└── main.ts                         # Application entry point
```

### 3.2 Microservice (Python/FastAPI)

```
service-name/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py
│   │   │   └── endpoints/
│   │   │       ├── orders.py
│   │   │       └── health.py
│   │   └── dependencies.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── events.py
│   ├── domain/
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── services.py
│   ├── infrastructure/
│   │   ├── database.py
│   │   ├── cache.py
│   │   ├── messaging.py
│   │   └── repositories.py
│   └── main.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

---

## 4. SERVICE BOUNDARIES

### 4.1 Principles for Drawing Boundaries

**Bounded Context**: Each service owns a coherent domain concept — users, orders, payments, inventory. The boundary is defined by where the domain language changes.

**Database per Service**: No shared databases between services. Each service owns its schema. Cross-service data is obtained through:
- API calls (synchronous, real-time)
- Event consumption (asynchronous, eventual)
- Read-model denormalization (copy relevant data into the service's own store)

**Anti-Pattern — Shared Database**:
```
❌ DO NOT DO THIS:
Service A ───────────────┐
                         ▼
Service B ──────────► Shared DB   ← Creates tight coupling; prevents
                         ▲             independent schema evolution
Service C ───────────────┘
```

**Correct Pattern — Database per Service**:
```
✓ DO THIS:
Service A → DB A
Service B → DB B (may have a copy of relevant A data, kept in sync via events)
Service C → DB C
```

### 4.2 Synchronous vs. Asynchronous Communication

**Use synchronous (REST/gRPC) for**:
- User-initiated operations that need an immediate result
- Simple request-response with low complexity
- When the caller must wait for confirmation

**Use asynchronous (events/queues) for**:
- Operations that trigger cascading effects in other services
- Long-running processes (email sending, report generation, webhooks)
- When you can tolerate eventual consistency
- Fan-out to multiple downstream consumers

---

## 5. QUEUE ARCHITECTURE

### 5.1 Queue vs. Stream

```
Queue (RabbitMQ, SQS, AMQP):
Producer → [Queue] → Consumer A (message deleted after processing)
           Message is consumed by ONE consumer (load distribution)

Stream (Kafka, Kinesis):
Producer → [Log Partition] → Consumer Group A (CG reads all messages)
                           → Consumer Group B (CG reads all messages)
           Messages are retained and replayable; multiple consumer groups
```

### 5.2 Topic Design for Kafka

**One topic per domain event type**:
```
events.users.registered
events.orders.placed
events.orders.cancelled
events.payments.processed
events.payments.failed
events.notifications.email.sent
```

**Partition key guidelines**:
- User events: partition by `user_id` (ordering within a user's events)
- Order events: partition by `order_id`
- Transaction events: partition by `account_id`
- Avoid: partitioning by timestamp (creates hot partitions)

**Retention policy**:
- Business events (orders, payments): 30–90 days
- Audit events: 1 year
- Metrics/telemetry: 7 days
- Use log compaction for "state" topics (latest value per key)

### 5.3 Dead Letter Queue Architecture

```
Producer → [Topic] → Consumer
                        │ failure (after 3 retries with backoff)
                        ▼
                    [DLQ Topic]
                        │
               ┌────────┼──────────┐
               ▼        ▼          ▼
           Alert     Dashboard   Replay Tool
```

Every consumer queue must have a corresponding DLQ. Alert on DLQ depth > 0.

---

## 6. EVENT BUS PATTERNS

### 6.1 Outbox Pattern (Transactional Outbox)

Ensures atomicity between database writes and event publishing without distributed transactions:

```
┌─────────────────────────────────────────────────────┐
│                   Service Transaction               │
│                                                     │
│  UPDATE orders SET status = 'PLACED'                │
│  INSERT INTO outbox (event_type, payload, status)   │
│         VALUES ('OrderPlaced', {...}, 'PENDING')    │
│                                                     │
│  COMMIT  ← Atomic: both succeed or both fail        │
└─────────────────────────────────────────────────────┘
                          │
              ┌───────────▼──────────────┐
              │    Outbox Processor      │
              │  (polls outbox table)    │
              │  Publishes to Kafka      │
              │  Marks outbox PUBLISHED  │
              └──────────────────────────┘
```

Outbox table schema:
```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(255) NOT NULL,
  aggregate_type VARCHAR(255) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  retry_count INT DEFAULT 0
);

CREATE INDEX idx_outbox_pending ON outbox(status, created_at) 
  WHERE status = 'PENDING';
```

### 6.2 Event Saga Pattern

For distributed transactions across services:

```
Order Service          Payment Service        Inventory Service
     │                       │                       │
 PlaceOrder ────────── ChargPayment ─────── ReserveInventory
     │                       │                       │
     │        Success path:  │                       │
     │◄── PaymentProcessed ──┘                       │
     │◄───────────────── InventoryReserved ──────────┘
     │                                               
     │        Failure path (compensating txns):       
 CancelOrder ────── RefundPayment ──── ReleaseInventory
```

Saga rules:
- Each step publishes an event on success and a compensation event on failure
- Compensation transactions must be idempotent
- Track saga state in a dedicated saga store
- Use timeouts to detect stuck sagas

---

## 7. DATABASE ARCHITECTURE

### 7.1 Database Selection Per Domain

```
Domain             │ Technology        │ Rationale
───────────────────┼───────────────────┼────────────────────────────────
User profiles      │ PostgreSQL        │ Relational, ACID, rich queries
Orders/Payments    │ PostgreSQL        │ ACID critical, financial data
Product catalog    │ PostgreSQL        │ Relational, infrequent writes
Session store      │ Redis             │ Low-latency, TTL native
Shopping cart      │ Redis             │ Low-latency, user-scoped
Search             │ Elasticsearch     │ Full-text, faceted search
Time-series/metrics│ InfluxDB/Timescale│ Optimized for time-series
Recommendations    │ Redis + offline   │ Precomputed, fast lookup
Event log          │ Kafka             │ Durable, ordered, replayable
Object storage     │ S3                │ Files, images, exports
Analytics          │ BigQuery/Redshift │ Column-store, petabyte-scale
Feature store      │ Redis + S3        │ ML features, online + offline
```

### 7.2 Read/Write Scaling Architecture

```
Write Path:
Client → API → Service → Primary DB (PostgreSQL)
                              │
                      Replication stream
                              │
                    ┌─────────▼─────────┐
                    │   Read Replicas   │
                    │  (2+ replicas)    │
                    └─────────┬─────────┘
                              │
Read Path:                    │
Client → API → Cache (Redis) ─┘ (cache miss → read replica → populate cache)
```

**Connection pooling** (critical at scale):
- Use PgBouncer (PostgreSQL) or connection poolers in application layer
- Target: max 100 connections per PostgreSQL node
- Pool size per service instance: 10–20 connections
- Monitor: active connections, waiting connections, connection wait time

### 7.3 Database Migration Strategy

```
Migration Rules:
1. All migrations live in version-controlled files
2. Migrations must be backward compatible (forward only, no breaking changes)
3. Schema changes in phases: add column → backfill → make required → remove old

Phase 1 (safe to deploy now):
  ALTER TABLE orders ADD COLUMN new_field VARCHAR(255);
  
Phase 2 (deploy after backfill complete):
  -- Application writes both old_field and new_field
  UPDATE orders SET new_field = <computed from old_field> WHERE new_field IS NULL;
  
Phase 3 (after all reads use new_field):
  ALTER TABLE orders ALTER COLUMN new_field SET NOT NULL;
  ALTER TABLE orders DROP COLUMN old_field;
```

---

## 8. API GATEWAY STRATEGY

### 8.1 Gateway Responsibilities (What Goes in the Gateway)

```
┌───────────────────────────────────────────────────────────────┐
│                        API Gateway                            │
│                                                               │
│  ✓ TLS termination                                            │
│  ✓ JWT validation / session verification                      │
│  ✓ Rate limiting (per IP, per user, per API key)              │
│  ✓ Request routing (by path prefix, header, service)          │
│  ✓ Request/response logging (with trace IDs)                  │
│  ✓ CORS headers                                               │
│  ✓ Request ID injection                                       │
│  ✓ API versioning (route /api/v1 → v1 services)               │
│  ✓ Circuit breaking to backend services                       │
│                                                               │
│  ✗ Business logic                                             │
│  ✗ Data transformation beyond protocol bridging               │
│  ✗ Database access                                            │
└───────────────────────────────────────────────────────────────┘
```

**Technology choices**:
- **Kong**: feature-rich, Lua plugins, battle-tested at scale
- **AWS API Gateway**: fully managed, native Lambda integration
- **Nginx**: simple, high performance, extensible via OpenResty
- **Envoy / Istio**: service mesh with advanced traffic management

### 8.2 BFF (Backend for Frontend) Pattern

When different clients (web, mobile, third-party) have different data requirements:

```
Mobile App ──────► Mobile BFF ─────────────────┐
                   (compact responses,           │
                    mobile-optimized)            ▼
                                         Microservices
Web App ─────────► Web BFF ──────────────────────┤
                   (rich responses,              ▼
                    web-optimized)        (shared backend)

Third Parties ───► Public API ─────────────────┘
                   (versioned, documented,
                    rate-limited separately)
```

---

## 9. AUTHENTICATION ARCHITECTURE

### 9.1 Authentication Flow

```
                    ┌───────────────┐
User ──── Login ───►│  Auth Service │
          request   │  (passwords,  │
                    │  OAuth, SAML) │
                    └──────┬────────┘
                           │ issues
                    ┌──────▼────────┐
                    │  Access Token │
                    │  (JWT, 15min) │
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │ Refresh Token │
                    │ (30 days,     │
                    │  stored in DB,│
                    │  rotated)     │
                    └───────────────┘
                    
Access Token Flow:
User ─── [Access Token] ──► API Gateway ─── validates JWT ──► Service
                                              (no DB call needed)
                                              
Refresh Flow:
User ─── [Refresh Token] ──► Auth Service ─── validates in DB 
                                            ─── issues new Access Token 
                                            ─── rotates Refresh Token
```

### 9.2 JWT Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "2024-01-key-id"
  },
  "payload": {
    "sub": "usr_abc123",
    "iss": "https://auth.example.com",
    "aud": "https://api.example.com",
    "iat": 1700000000,
    "exp": 1700000900,
    "jti": "unique-token-id",
    "roles": ["user"],
    "org_id": "org_xyz"
  }
}
```

Rules:
- Use RS256 (asymmetric): public key in API gateway, private key only in auth service
- Short expiry (15 minutes) + refresh token rotation
- Include `jti` (JWT ID) for token revocation capability
- Never include sensitive data (passwords, payment info) in JWT payload

### 9.3 Service-to-Service Authentication

```
Option A: mTLS (preferred for internal services)
  Service A presents a client certificate
  Service B validates the certificate against a trusted CA
  
Option B: Service Account JWTs
  Each service has a private key
  Issues short-lived JWTs signed with its key
  Receiving service validates against service's public key (from a JWKS endpoint)

Option C: API Keys (simple, less secure)
  Suitable for: third-party integrations, less sensitive internal calls
  Must be rotatable; stored in secrets manager; never in code
```

---

## 10. MULTI-TENANT ARCHITECTURE

### 10.1 Tenancy Models

**Silo (Full Isolation)**:
```
Tenant A → Own DB + own services + own infrastructure
Tenant B → Own DB + own services + own infrastructure
```
- Maximum isolation; no noisy-neighbor risk
- Highest cost; complex to operate
- Use for: enterprise SaaS with strict data residency requirements

**Pool (Shared Infrastructure)**:
```
All tenants → Shared services → Shared DB with tenant_id discriminator
```
- Lowest cost; simple to operate
- Noisy-neighbor risk; harder security isolation
- Use for: SMB SaaS, low-sensitivity data

**Bridge (Hybrid)**:
```
Shared services → Shared DB (schema per tenant) or Separate DBs
```
- Medium isolation; moderate cost
- Most common production pattern

### 10.2 Tenant Isolation in Shared DB

Every table must have `tenant_id`. Apply Row-Level Security at the database level (PostgreSQL):

```sql
-- Enable RLS on every table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Application sets tenant context at connection time
SET app.tenant_id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 11. HORIZONTAL SCALING PATTERNS

### 11.1 Stateless Service Scaling

```
Load Balancer (round-robin / least-connections)
      │
      ├── Service Instance 1
      ├── Service Instance 2
      ├── Service Instance 3 ← Auto-scaled: add more as load increases
      └── Service Instance N
```

**Requirements for stateless scaling**:
- Session data stored in Redis (not in-process memory)
- No local file system state
- Configuration from environment variables (not local files)
- All service instances share the same database

**Auto-scaling triggers**:
- CPU > 70% for 2 minutes → scale out
- P99 latency > SLO threshold → scale out
- Queue depth > N messages → scale out consumers
- CPU < 30% for 10 minutes → scale in

### 11.2 Read Scaling

```
Write client → Primary (write) DB
                    │
             Replication stream
                    │
              ┌─────▼────┐    ┌─────────────┐
Read client ──► Replica 1 │    │  Read cache │
              └─────┬────┘    │  (Redis)    │
                    │         └──────▲──────┘
              ┌─────▼────┐          │ cache-aside
Read client ──► Replica 2 │◄─────────┘
              └──────────┘
```

Cache hit rate target: > 90% for frequently read data.

---

## 12. DEPLOYMENT ARCHITECTURE

### 12.1 Container Architecture

```
Every service is a Docker container:
- Base image: distroless or Alpine Linux (minimal attack surface)
- Single process per container
- No secrets baked into images; inject at runtime via secrets manager
- Health check endpoint: GET /health (200 = healthy, 503 = degraded)
- Readiness endpoint: GET /readiness (200 = ready to receive traffic)
```

Dockerfile best practices:
```dockerfile
# Multi-stage build: separate build and runtime environments
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
USER node                          # Never run as root
EXPOSE 8080
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8080/health
CMD ["node", "dist/main.js"]
```

### 12.2 Kubernetes Architecture

```
Namespace: production
├── Deployments
│   ├── user-service (3 replicas, HPA: 3-10)
│   ├── order-service (3 replicas, HPA: 3-20)
│   └── payment-service (3 replicas, HPA: 3-5)
├── Services (ClusterIP, load-balanced)
├── Ingress (routes external traffic to services)
├── ConfigMaps (non-secret configuration)
├── Secrets (from Vault or AWS Secrets Manager via CSI driver)
├── PodDisruptionBudgets (min 2 pods available during disruption)
└── HorizontalPodAutoscalers (CPU/custom metrics)
```

### 12.3 CI/CD Pipeline

```
Developer pushes code
        │
    ┌───▼──────────────────────────────────────┐
    │             CI Pipeline (GitHub Actions)  │
    │                                           │
    │  1. Unit tests                            │
    │  2. Integration tests                     │
    │  3. Security scan (SAST, dependency scan) │
    │  4. Build Docker image                    │
    │  5. Push to container registry            │
    │  6. Deploy to staging                     │
    │  7. E2E smoke tests                       │
    └───┬──────────────────────────────────────┘
        │ (on main branch, after PR approval)
    ┌───▼──────────────────────────────────────┐
    │              CD Pipeline                  │
    │                                           │
    │  1. Deploy to production (5% canary)      │
    │  2. Monitor error rate + latency (5 min)  │
    │  3. If healthy: deploy to 25%             │
    │  4. Monitor (5 min)                       │
    │  5. If healthy: deploy to 100%            │
    │  6. If unhealthy: automated rollback      │
    └──────────────────────────────────────────┘
```

---

## 13. CI/CD PHILOSOPHY

**Core principles**:
- **Trunk-based development**: all engineers commit to main frequently (daily); feature branches are short-lived (< 1 day)
- **Feature flags**: decouple deployment from release; ship incomplete features behind flags
- **Shift left**: security and quality checks happen in developer's local environment and CI, not at deployment time
- **Automated rollback**: the CD pipeline must be able to automatically roll back when error rate exceeds threshold

**Testing pyramid**:
```
        ┌─────────────────┐
        │   E2E Tests     │  ← Few, slow, catch integration bugs
        │   (5-10%)       │
        ├─────────────────┤
        │ Integration Tests│  ← Medium, catch contract violations
        │   (20-30%)      │
        ├─────────────────┤
        │   Unit Tests    │  ← Many, fast, catch logic bugs
        │   (60-70%)      │
        └─────────────────┘
```

**Coverage requirements**: > 80% line coverage; > 70% branch coverage. Coverage gates enforced in CI — PR cannot merge if coverage drops.

---

## 14. OBSERVABILITY STACK

### 14.1 Recommended Open Source Stack

```
Metrics:     Prometheus + Grafana (or Datadog/NewRelic for managed)
Logs:        Fluentd/Fluent Bit → Elasticsearch + Kibana (or Datadog Logs)
Traces:      OpenTelemetry SDK → Jaeger or Tempo (or Datadog APM)
Alerting:    Alertmanager + PagerDuty (or Datadog)
Dashboards:  Grafana
```

### 14.2 Key Dashboards

Every service must have:

**Service Health Dashboard**:
- Request rate (RPS per endpoint)
- Error rate (4xx, 5xx)
- P50, P95, P99 latency
- Active connections / concurrency
- Downstream dependency error rates

**Infrastructure Dashboard**:
- CPU utilization per pod/instance
- Memory utilization
- Network I/O
- Disk I/O (for stateful services)
- Pod restart count (Kubernetes)

**Business Dashboard** (per domain):
- Orders placed per minute
- Payment success rate
- Failed checkout rate
- Active users

### 14.3 SLO Dashboard

```
Service: Order API
SLO: P99 < 500ms | Error rate < 0.1%

Current:
  P99 latency: 234ms ✓ (budget: 500ms)
  Error rate: 0.03% ✓ (budget: 0.1%)
  
Error budget remaining:
  Latency: 87% of monthly budget remaining
  Errors: 70% of monthly budget remaining
  
Burn rate: 0.3× (healthy)
```

---

## 15. INFRASTRUCTURE RECOMMENDATIONS

### 15.1 Cloud-Native Service Map

```
Layer               │ AWS                    │ GCP                   │ Azure
────────────────────┼────────────────────────┼───────────────────────┼──────────────────
Compute             │ EKS (Kubernetes)       │ GKE                   │ AKS
Functions           │ Lambda                 │ Cloud Run / Functions │ Functions
Relational DB       │ RDS PostgreSQL         │ Cloud SQL             │ Azure Database PG
NoSQL               │ DynamoDB               │ Firestore             │ Cosmos DB
Cache               │ ElastiCache (Redis)    │ Memorystore           │ Azure Cache Redis
Object Storage      │ S3                     │ Cloud Storage         │ Blob Storage
CDN                 │ CloudFront             │ Cloud CDN             │ Azure CDN
Message Queue       │ SQS                    │ Pub/Sub               │ Service Bus
Event Streaming     │ MSK (Kafka) / Kinesis  │ Pub/Sub               │ Event Hubs
Search              │ OpenSearch             │ Vertex AI Search      │ Cognitive Search
Secrets             │ Secrets Manager        │ Secret Manager        │ Key Vault
Container Registry  │ ECR                    │ Artifact Registry     │ ACR
DNS/Load Balancing  │ Route53 + ALB          │ Cloud DNS + LB        │ Azure DNS + LB
API Gateway         │ API Gateway v2         │ API Gateway           │ API Management
```

### 15.2 Multi-AZ / Multi-Region Strategy

**Minimum production setup** (single region, multi-AZ):
```
Region: us-east-1
  AZ: us-east-1a  → 1/3 of pods, DB primary (if active-passive)
  AZ: us-east-1b  → 1/3 of pods, DB replica
  AZ: us-east-1c  → 1/3 of pods, DB replica
```

**Global setup** (multi-region active-passive):
```
Primary:  us-east-1  → All writes; primary DB; 60% of reads
Standby:  eu-west-1  → Read traffic; replica DB; failover target
CDN:      Global     → Static assets, cached API responses
```

---

## 16. RESILIENCE ENGINEERING PATTERNS

### 16.1 Resilience Pattern Summary

```
Pattern             Use When                          Implementation
────────────────────┬─────────────────────────────────┬──────────────────────────────
Circuit Breaker     │ Protecting against cascading     │ cockatiel, Resilience4j
                    │ failures from slow dependencies  │
────────────────────┼─────────────────────────────────┼──────────────────────────────
Retry w/ Backoff    │ Transient failures (network,     │ Built-in or retry libraries
                    │ rate limits)                     │ Initial: 100ms, max: 30s
────────────────────┼─────────────────────────────────┼──────────────────────────────
Bulkhead            │ Isolating failure domains        │ Separate thread pools
                    │ (critical vs. background)        │ or queue workers
────────────────────┼─────────────────────────────────┼──────────────────────────────
Timeout             │ Preventing resource starvation   │ Every HTTP call, DB query
                    │ from slow dependencies           │ has an explicit timeout
────────────────────┼─────────────────────────────────┼──────────────────────────────
Rate Limiter        │ Protecting services from         │ Token bucket in Redis
                    │ abusive or misconfigured clients │ (lua script, atomic)
────────────────────┼─────────────────────────────────┼──────────────────────────────
Health Check        │ Load balancer removes unhealthy  │ /health, /readiness endpoints
                    │ instances from rotation          │
────────────────────┼─────────────────────────────────┼──────────────────────────────
Graceful Shutdown   │ Zero-downtime deployments        │ SIGTERM → drain requests →
                    │                                  │ close DB → exit
────────────────────┼─────────────────────────────────┼──────────────────────────────
Fallback            │ Returning degraded response      │ Return cached/default value
                    │ when dependency fails            │ when primary fails
```

### 16.2 Graceful Shutdown Implementation

```typescript
process.on('SIGTERM', async () => {
  server.close();
  await drainInFlightRequests({ timeout: 30000 });
  await kafkaProducer.flush();
  await pool.end();
  await redis.quit();
  process.exit(0);
});
```

---

## 17. CLOUD-NATIVE PATTERNS

### 17.1 The Twelve-Factor App

Applied to modern backend services:

| Factor | Implementation |
|---|---|
| Codebase | One repo per service; one deploy artifact |
| Dependencies | Lock files (package-lock.json, poetry.lock) |
| Config | Environment variables; never hardcoded |
| Backing services | Databases, queues, caches are attached resources |
| Build, release, run | Separate CI (build), CD (release), pod start (run) |
| Processes | Stateless; state in backing services |
| Port binding | Service exposes itself via a port |
| Concurrency | Scale via process model (horizontal) |
| Disposability | Fast startup (< 10s); graceful shutdown |
| Dev/prod parity | Same dependencies, same tools across environments |
| Logs | Write to stdout; infrastructure collects and routes |
| Admin processes | Run as one-off commands, same environment as app |

### 17.2 Service Mesh

For services that require: mutual TLS, advanced traffic management, observability at the network level:

```
Without mesh: service A → HTTP → service B (no mTLS, manual retry config)
With mesh:    service A → sidecar proxy → (mTLS, automatic retry) → sidecar proxy → service B
```

Istio provides:
- Automatic mTLS between services
- Canary traffic splitting (route X% to new version)
- Circuit breaking at the network level
- Detailed L7 metrics (per-route latency, error rates)
- Distributed tracing injection

---

*This guide is a living document. Update when architectural patterns evolve or new production learnings emerge.*

*Version: 1.0 | Derived from distributed systems principles and production engineering standards*
