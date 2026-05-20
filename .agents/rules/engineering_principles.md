# ENGINEERING_PRINCIPLES.md — Distilled Knowledge from Designing Data-Intensive Applications

> **Source**: Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media.  
> **Purpose**: This document translates the book's theoretical foundations into actionable engineering wisdom for production systems.

---

## PART I: FOUNDATIONS OF DATA SYSTEMS

### Chapter 1 — Reliability, Scalability, and Maintainability

#### Key Lesson: Define Terms Before You Design

These three properties are meaningless without concrete definitions. Every engineering discussion must ground them:

**Reliability** = The system continues to work correctly *even when things go wrong*.
- "Correctly" means performing the function the user expected, tolerating user error, meeting performance requirements, and preventing unauthorized access.
- **Fault vs. Failure**: A fault is one component deviating from spec. A failure is when the system as a whole stops serving users. Design to tolerate faults before they become failures.
- Hardware faults: random and independent. Add redundancy (RAID, multi-AZ).
- Software faults: systematic and correlated. They bring down every instance simultaneously. Mitigate with: thorough testing, process isolation, monitoring, and crash-restart loops.
- Human errors: the #1 cause of outages (10–25% from hardware; majority from config errors). Mitigate with: well-designed abstractions that make the right thing easy, sandbox environments, progressive rollouts, fast rollback, monitoring.
- **Chaos Engineering**: deliberately inject faults to prove fault-tolerance machinery works.

**Scalability** = Having strategies for keeping performance good *as load increases*.
- Scalability is not a binary label ("X scales"). It's a question: "If load doubles, what are our options?"
- **Load parameters**: Choose the right metrics. Twitter's challenge wasn't tweet volume — it was fan-out (each user's followers). 300K timeline reads/sec vs. 4.6K write/sec means fan-out is the load parameter to optimize.
- **Performance metrics**: Use percentiles, not averages.
  - P50 = median: half of users are faster, half are slower
  - P99 = 99th percentile: your worst 1% of users — often the most valuable customers
  - Amazon found: 100ms increase in response time → 1% decrease in sales
  - Percentile amplification: if one endpoint makes 7 backend calls, even if each backend has 1% slow response, the probability that at least one call is slow in the chain is much higher
  - **Never average percentiles** — aggregate histograms instead
- **Head-of-line blocking**: one slow request blocks the queue for all subsequent requests
- Vertical vs. horizontal scaling: most systems use pragmatic combinations; distributing stateless services is simple; distributing stateful data systems is hard
- **Elastic vs. manual scaling**: elastic is useful for unpredictable load; manual is simpler and less surprising

**Maintainability** = Making life better for engineers who maintain the system.
- Three sub-properties: **Operability** (easy to operate), **Simplicity** (easy to understand), **Evolvability** (easy to change)
- Complexity is the enemy. Accidental complexity (complexity not inherent to the problem) is your fault and is solvable.
- Good abstractions hide complexity behind clean interfaces. But good abstractions are hard to find.
- The best abstraction can be reused across many applications, multiplying its value.

#### Real-World Application

```
When designing a new feature:
1. Define the load parameters (RPM, data size, user concurrency)
2. Define the performance SLO (P99 latency, error rate)
3. Design for 3× current load (headroom)
4. Identify failure modes and add fault tolerance
5. Make it operable: health checks, runbooks, alerts
```

---

### Chapter 2 — Data Models and Query Languages

#### Key Lesson: Data Models Shape Everything

Every data model embeds assumptions about usage. Choosing the wrong model makes some operations painful or impossible.

**The Layered Abstraction Principle**:
- Application developer → objects/data structures
- Data store → relational tables, JSON documents, graphs
- Database engine → bytes on disk
- Hardware → electrical signals

Each layer hides the complexity below. The art is choosing the right data model for each layer.

**Relational Model**:
- Dominant for 40+ years: tables, rows, relations, SQL
- Excellent for: normalized data, complex joins, ad-hoc queries, data integrity constraints
- Impedance mismatch: the gap between relational tables and in-memory objects; ORMs reduce but don't eliminate it
- One-to-many relationships can be modeled as: multiple tables with foreign keys, JSON/XML columns, or document embedding

**Document Model**:
- Suited for: self-contained documents, tree-structured data, schema flexibility, one-to-many from the document root
- Better **data locality**: entire document loaded in one query
- Weakness: many-to-many and many-to-one relationships require application-side joins
- Schema-on-read (no enforcement) vs. schema-on-write (enforced by DB)

**Graph Model**:
- Best for: highly interconnected data where relationships are as important as entities
- Property Graph: vertices and edges with properties (Neo4j)
- Triple Store: subject-predicate-object triples (SPARQL)
- Use case: social networks, fraud detection, recommendation engines, knowledge graphs

**Choosing a Data Model**:
```
Self-contained hierarchical data → Document model
Many-to-many relationships → Relational
Highly connected data, traversal queries → Graph
Everything else → Relational (default)
```

**Query Language Design Principles**:
- Declarative (SQL, GraphQL): specify *what*, not *how*. Enables query optimizer to choose execution strategy. More concise.
- Imperative: specify *how*. More control, but you lock in one execution strategy.
- MapReduce: batch processing paradigm. map + reduce functions are pure and parallelizable. Superseded by higher-level abstractions (Spark, Flink).

#### Real-World Application

```
Bad: Using a document DB for a highly relational dataset 
     → application-side joins are slow and inconsistent

Good: Using a document DB for user profile data 
      where the profile is the natural unit of retrieval

Bad: Using a relational DB for social graph traversal 
     (finding all friends-of-friends) → recursive CTEs are slow

Good: Using a graph DB (Neo4j) for social recommendations
```

---

### Chapter 3 — Storage and Retrieval

#### Key Lesson: Storage Engine Internals Determine Query Performance

Understanding how databases store data lets you reason about performance, index design, and system selection.

**The Log-Structured Approach**:
- All writes are appended to a log (append-only, sequential I/O)
- Old values are marked with tombstones, compacted later
- Sequential writes are 10–100× faster than random writes on spinning disks; SSDs also benefit
- **Hash index**: in-memory hash table maps keys to byte offsets in the log. Fast for known-key lookups; cannot range scan; entire index must fit in RAM (Bitcask)
- **SSTables (Sorted String Tables)**: keys sorted within log segments; enables efficient merging (merge sort) and range scans; forms the basis of LSM-Trees
- **LSM-Trees (Log-Structured Merge Trees)**: writes go to in-memory memtable → flushed to SSTables → background compaction merges SSTables. Used by: LevelDB, RocksDB, Cassandra, HBase, Lucene. Excellent write throughput.

**The B-Tree (Update-in-Place)**:
- Pages of fixed size; hierarchical tree structure
- Write in-place to existing pages; write-ahead log for crash recovery
- Page splits when a page is full; page merges when pages become too sparse
- The dominant data structure in relational databases (PostgreSQL, MySQL, SQL Server)
- Optimized for reads and mixed read/write workloads

**LSM-Trees vs. B-Trees**:
| Property | LSM-Trees | B-Trees |
|---|---|---|
| Write throughput | Higher (sequential writes) | Lower (random writes) |
| Read performance | Slower (multiple SSTables to check) | Faster (single tree traversal) |
| Space amplification | Lower (compaction cleans dead data) | Higher (fragmentation) |
| Write amplification | Higher (compaction rewrites data) | Lower |
| Range scans | Good (sorted SSTables) | Good (sorted B-tree) |

**Indexes**:
- Primary index: defines sort order of data on disk (clustered index)
- Secondary indexes: separate data structure pointing to row locations
- Composite indexes: multiple columns; order matters; prefix queries efficient, suffix queries not
- Covering indexes: index contains all columns needed for the query; avoids heap lookup
- Index cost: every write updates all indexes; indexes slow writes, speed reads
- Rule: create indexes for the columns in WHERE clauses of your most frequent queries; remove unused indexes

**OLTP vs. OLAP**:

| Property | OLTP | OLAP |
|---|---|---|
| Access pattern | Small number of records by key | Aggregate over millions of records |
| Write pattern | Low-latency random writes | Bulk ETL or streaming |
| Users | End users | Business analysts |
| Data represents | Current state | Historical events |
| Dataset size | GB to TB | TB to PB |

- **Data Warehousing**: separate OLAP system loaded from OLTP via ETL; star schema (fact tables + dimension tables); protects OLTP from analytical query load
- **Column-Oriented Storage**: store values from each column together (not each row). Allows queries to read only the columns they need. Enables vectorized processing. Excellent for analytics (read few columns over many rows). Used by: BigQuery, Redshift, ClickHouse, Vertica.
- **Column Compression**: similar values in a column → bitmap encoding + run-length encoding → 10× compression common
- **Materialized Views / Data Cubes**: pre-computed aggregates. Fast for known aggregation patterns; inflexible for ad-hoc queries.

#### Real-World Application

```
Choosing a storage engine:
- Write-heavy (IoT, logging, time-series): LSM-Tree (Cassandra, RocksDB)
- Read-heavy with point lookups: B-Tree (PostgreSQL, MySQL)
- Analytics over large datasets: Column store (BigQuery, ClickHouse)
- Hot data in memory: In-memory DB (Redis, VoltDB)

Index design rule:
- Understand your top-10 queries
- Add indexes to support the WHERE + ORDER BY clauses
- Monitor slow query logs weekly
- Remove indexes that haven't been used in 30 days
```

---

### Chapter 4 — Encoding and Evolution

#### Key Lesson: Data Outlives Code; Plan for Schema Evolution

Code changes; the data it created persists. In rolling deployments, old and new code coexist simultaneously. Your encoding format must support both.

**Two Compatibility Directions**:
- **Backward compatibility**: new code reads data written by old code ← easier; you control it
- **Forward compatibility**: old code reads data written by new code ← harder; old code ignores new fields

**Encoding Format Comparison**:

| Format | Schema Required | Binary | Forward Compat | Backward Compat | Human Readable |
|---|---|---|---|---|---|
| JSON | No | No | Partial | Partial | Yes |
| XML | Optional | No | Partial | Partial | Yes |
| CSV | No | No | No | No | Yes |
| Thrift / Protobuf | Yes | Yes | Yes | Yes | No |
| Avro | Yes | Yes | Yes | Yes | No |
| Language-specific (pickle, Java serialization) | No | Yes | No | No | No |

**Key Encoding Principles**:
- **Never use language-specific serialization** for cross-service or persistent data — it couples you to one language and version
- **Protobuf / Thrift**: field tags (numbers) are the contract; you can rename fields but not change tag numbers; optional fields provide forward/backward compat
- **Avro**: schema embedded in or registered alongside data; reader's schema and writer's schema can differ; schema resolution handles evolution
- **JSON**: ubiquitous but has pitfalls: no binary support (use Base64), number precision issues (64-bit integers), no schema enforcement

**Schema Evolution Rules**:
- Adding a new field: safe if old readers can ignore it (forward compat)
- Removing a field: safe if new readers can handle missing values (backward compat)
- Changing a field's data type: risky; test explicitly
- Changing a field's name: same as delete + add
- Renumbering a protobuf field tag: catastrophic — do not do this

**Data Flow Modes**:
- **Via database**: write and read schema may differ over time; database must support both versions during migration
- **Via services (REST/RPC)**: client and server must agree on schema; use semantic versioning for APIs
- **Via message queues**: producers and consumers may be deployed independently; schema must support both reading old and new messages

**RPC vs. REST**:
- RPC (gRPC, Thrift): generated client code; type-safe; tighter coupling; excellent for internal services
- REST: loose coupling; easier for external APIs; schema validation optional; widely supported

#### Real-World Application

```
Migration strategy for schema change:
1. Add new column/field (nullable, with default) 
2. Deploy new code that writes BOTH old and new fields
3. Backfill existing records to set the new field
4. Deploy new code that reads from the new field only
5. Deploy code that stops writing the old field
6. Remove old field

This rolling migration ensures zero-downtime compatibility.
```

---

## PART II: DISTRIBUTED DATA

### Chapter 5 — Replication

#### Key Lesson: Replication Solves Availability and Read Scalability, But Introduces Consistency Complexity

**Why Replicate?**
1. **High availability**: keep serving when nodes fail
2. **Read scalability**: distribute read load across replicas
3. **Latency**: serve users from geographically close replicas
4. **Disconnected operation**: continue working during network interruptions

**Single-Leader Replication**:
- One node accepts all writes (leader/primary)
- Followers receive a replication log and apply changes in order
- Reads can go to any replica (accept potential staleness) or leader-only (strong consistency)
- Leader election is the hard problem: must prevent split-brain (two nodes believing they're leader)
- **Synchronous replication**: leader waits for follower acknowledgment before confirming write. Guarantees follower is up-to-date. Slow if follower is slow or down.
- **Asynchronous replication**: leader confirms write immediately; replication happens later. Fast but you can lose data if leader fails before replication completes.
- **Semi-synchronous**: one follower is synchronous; rest are async. Common practical compromise.

**Replication Lag Anomalies**:
- **Read-your-own-writes consistency**: a user who just wrote must see their own data on subsequent reads (route their reads to the leader or use a version token)
- **Monotonic reads**: a user who read a certain point in time should not see an earlier point in subsequent reads (route user's reads to the same replica)
- **Consistent prefix reads**: if A causes B, you should never see B before A (critical in causal chains)

**Multi-Leader Replication**:
- Multiple nodes accept writes; each leader replicates to the others
- Use case: multiple datacenters (lower write latency at each DC), offline clients, collaborative editing
- **Conflict resolution is the main challenge**:
  - Last Write Wins (LWW): use timestamp; simple but loses data
  - Merge conflicts: application-defined merge logic
  - CRDTs (Conflict-free Replicated Data Types): automatic, mathematically sound merging for specific data types (counters, sets, lists)
  - Avoid multi-leader if possible — conflicts are the Achilles heel

**Leaderless Replication (Dynamo-style)**:
- Clients write to multiple nodes directly; read from multiple nodes
- **Quorum reads/writes**: with N replicas, write to W nodes, read from R nodes, maintain W + R > N to guarantee seeing the latest write
- Typical: N=3, W=2, R=2 (tolerate 1 node failure)
- **Sloppy quorum**: if normal nodes unavailable, temporarily use other nodes; hinted handoff returns data when home nodes recover
- **Anti-entropy**: background process that syncs differences between replicas
- **Version vectors**: track causality across replicas; detect concurrent writes

**Conflict Detection and Resolution**:
- **Happens-before**: operation B happened-after A if B knows about A's result
- **Concurrent**: neither A nor B knows about the other
- Use version numbers to detect conflicts; use merge logic to resolve them
- **Tombstones**: deletion markers that prevent deleted items from reappearing during merge

#### Real-World Application

```
Choosing a replication strategy:
- Single-leader (PostgreSQL streaming): simple, consistent, 
  good for write-once read-many patterns
- Multi-leader: multiple datacenters requiring low write latency
- Leaderless (Cassandra): high write availability, tolerate node failure 
  during writes, accept eventual consistency

Practical rule: 
Default to single-leader. Add complexity only when required.
For analytics replicas: use async replication with lag monitoring.
Alert when replication lag > 30 seconds.
```

---

### Chapter 6 — Partitioning (Sharding)

#### Key Lesson: Partitioning Distributes Data to Scale Beyond a Single Machine

**Why Partition?**
- Dataset too large for one node
- Query throughput too high for one CPU
- Combine with replication for both scale and fault tolerance

**Partitioning Strategies**:

**Key-Range Partitioning**:
- Assign contiguous ranges of keys to partitions (like encyclopedia volumes A-B, C-D, ...)
- Advantage: efficient range queries
- Disadvantage: hot spots if writes cluster around recent timestamps (e.g., all IoT data goes to "today's" partition)
- Mitigation: prefix the key with something that distributes writes (sensor_id + timestamp)

**Hash Partitioning**:
- Apply a hash function; assign range of hash values to partitions
- Advantage: uniform load distribution
- Disadvantage: range queries require querying all partitions (scatter/gather)
- Cassandra compromise: hash the first part of a compound key; sort by remaining parts within a partition

**Hot Spot Mitigation**:
- A celebrity user with 30M followers causes a hot spot even with hash partitioning (same key)
- Solution: add a random suffix to the key (split into 100 keys); reads must combine from all 100 keys
- This is an application-level concern — databases cannot automatically fix hot spots caused by high-frequency access to a single key

**Secondary Index Partitioning**:
- **Document-partitioned (local index)**: each partition maintains its own secondary index for its data. Writes are single-partition; reads are scatter/gather across all partitions.
- **Term-partitioned (global index)**: the secondary index itself is partitioned by the indexed term. Reads are single-partition; writes update multiple index partitions. Asynchronous update.

**Rebalancing**:
- Don't use hash mod N — adding/removing a node requires moving almost all data
- Use **fixed number of partitions** (many more than nodes; move whole partitions when nodes change). Elasticsearch, Riak, Cassandra 1.2+.
- Use **dynamic partitioning** (split when too large, merge when too small). HBase, RethinkDB.
- Prefer manual rebalancing for critical systems — automated rebalancing during a node failure can cause cascading load problems

**Request Routing**:
- Client to any node → node forwards if it's the wrong partition
- Routing tier / partition-aware proxy (mongos, etcd)
- Clients that know the partition assignment directly
- ZooKeeper/etcd maintains cluster metadata; routing tiers subscribe to changes

#### Real-World Application

```
Partitioning rules:
1. Define your access patterns before choosing partition key
2. Avoid using timestamps as the sole partition key in time-series data
3. For user data: hash by user_id (uniform distribution)
4. For geospatial data: geohash partitioning
5. Plan partition count for 5× growth: if you have 10 nodes today, 
   create 100 partitions (10 per node), so you can grow to 100 nodes

Hot spot detection:
- Monitor per-partition metrics (read/write RPS, storage)
- Alert when one partition > 3× average load
- Have a documented procedure to split hot partitions
```

---

### Chapter 7 — Transactions

#### Key Lesson: ACID Is a Contract Between the Database and Your Application

**ACID Defined Precisely**:
- **Atomicity**: all operations in a transaction either all succeed (commit) or all fail (abort/rollback). Not about concurrency — about "all or nothing" in the face of failure.
- **Consistency**: the database transitions from one valid state to another. This is actually an application-level property; the database enforces constraints (foreign keys, uniqueness), but consistency is your responsibility.
- **Isolation**: concurrently executing transactions see each other as if they ran serially. Degrees of isolation are a trade-off between correctness and performance.
- **Durability**: committed data survives system failure. Requires: write-ahead logging, fsync, replication, or RAID.

**Isolation Levels and Race Conditions**:

| Race Condition | Read Committed | Snapshot Isolation | Serializable |
|---|---|---|---|
| Dirty read | Prevented | Prevented | Prevented |
| Non-repeatable read | NOT prevented | Prevented | Prevented |
| Lost update | NOT prevented | Sometimes | Prevented |
| Write skew | NOT prevented | NOT prevented | Prevented |
| Phantom read | NOT prevented | Prevented (simple) | Prevented |

**Dirty Read**: reading uncommitted data from another transaction  
**Non-repeatable Read**: reading the same row twice and getting different values because another committed transaction changed it  
**Lost Update**: two transactions read a value, both modify it, one overwrites the other's update (e.g., increment counter)  
**Write Skew**: two transactions read the same data, make decisions based on it, and both commit based on a premise that is no longer true (e.g., two doctors simultaneously taking themselves off-call when exactly one must remain)  
**Phantom Read**: a query that returns a set of rows; another transaction inserts a row matching the query condition  

**Implementing Isolation**:
- **Read Committed**: no dirty reads (use separate read/write locks); no dirty writes (row-level locks held until commit)
- **Snapshot Isolation (MVCC)**: each transaction reads from a consistent snapshot of the database at its start time. No blocking between readers and writers. PostgreSQL's default is MVCC.
- **Two-Phase Locking (2PL)**: shared locks on reads, exclusive locks on writes; writers block readers and vice versa; prevents all anomalies but causes high lock contention. Historical standard for serializable isolation.
- **Serializable Snapshot Isolation (SSI)**: optimistic concurrency control. Transactions run without blocking; at commit time, the DB checks for serialization conflicts and aborts if violated. Best performance/correctness trade-off. PostgreSQL 9.1+ uses SSI.

**Actual Serial Execution** (VoltDB, Redis, Datomic):
- Single thread processes all transactions; avoids all locking overhead
- Viable because: data fits in RAM, transactions are short stored procedures
- Throughput limited to single CPU core; requires careful partition design

**Distributed Transactions and Two-Phase Commit (2PC)**:
- Coordinator node prepares all participants (phase 1) → all vote yes → coordinator commits (phase 2)
- If coordinator crashes after "prepare" but before "commit", participants are stuck in doubt
- 2PC blocks the entire system during coordinator failure — a significant availability risk
- **Saga pattern**: alternative to 2PC for long-running transactions; use compensating transactions (rollback by undoing) rather than atomic commit
- **Outbox pattern**: write events to an outbox table in the same transaction as business data; a separate process publishes outbox records to message queues; achieves atomic publish without distributed transactions

#### Real-World Application

```
Isolation level decision:
- Financial operations (balance transfers): Serializable
- Booking systems (prevent double-booking): Serializable  
- User profile updates: Snapshot Isolation
- Analytics reads: Snapshot Isolation (reads don't block)
- Logging writes: Read Committed (performance matters more)

Practical patterns for write skew:
1. Use SELECT FOR UPDATE to lock the rows the decision depends on
2. Use materialized conflict tables (pre-create lock objects)
3. Use Serializable isolation (SSI in PostgreSQL)
4. Redesign data model to avoid the race (e.g., use uniqueness constraints)

Avoiding distributed transactions:
- Design service boundaries so transactions don't cross them
- Use the Outbox Pattern + event streaming for cross-service atomicity
- Use Sagas with compensating transactions for long-running processes
```

---

### Chapter 8 — The Trouble with Distributed Systems

#### Key Lesson: Distributed Systems Are Fundamentally Different From Single-Node Systems

**The Fundamental Difference**:
- In a single-node system, when something fails, it fails completely. You know it failed.
- In a distributed system, components can fail partially. A node can be alive to some nodes and unreachable to others. You don't know if a request was received, processed, or lost.
- **Partial failure is the normal operating mode** of distributed systems.

**Unreliable Networks**:
- Packets are delayed, dropped, duplicated, or reordered
- A request may arrive, be processed, and the response may be lost
- A timeout tells you nothing about what happened: the request may or may not have been processed
- **Consequence**: every network call must be designed for idempotency
- **Practical limits**: datacenter networks have median latency < 1ms, P99 < 10ms, but occasional spikes of seconds
- **Head-of-line blocking** at network switches can cause latency spikes even on healthy networks

**Unreliable Clocks**:
- System clocks drift (typically 0.01%-0.1% per day) and are periodically corrected by NTP
- NTP sync introduces jumps — time can go backward
- **Never use wall-clock timestamps to determine event ordering across nodes**
- Monotonic clocks (System.nanoTime) are safe for measuring elapsed time within one process; meaningless to compare across nodes
- **Google TrueTime API** (used by Spanner): returns an interval [earliest, latest]; waits out the uncertainty interval before committing, ensuring strict ordering
- The lesson: if you care about ordering, use logical clocks (Lamport timestamps, vector clocks) — not wall clocks

**Process Pauses**:
- JVM GC pauses can last seconds
- Virtual machine live migration pauses the entire process
- CPU contention in cloud environments can cause unexpected delays
- A node that pauses and resumes may think it still holds a lease or lock — but the lease may have expired
- **Fencing tokens**: use a monotonically increasing sequence number when acquiring a lock; the downstream resource rejects requests with old tokens, even if the holder thinks it still holds the lock

**The Impossibility of Knowing**:
- You cannot reliably distinguish a slow node from a dead node
- You cannot know if your request was processed (only that it timed out)
- A node cannot trust its own judgment alone — it may be isolated from the network

**System Models**:
- **Synchronous model**: bounded delays, bounded processing time. Too optimistic for real systems.
- **Partially synchronous model**: synchronous most of the time, occasional violations. Realistic for stable datacenters.
- **Asynchronous model**: no timing assumptions. Maximum robustness.
- **Crash-stop model**: faulty nodes stop and never return
- **Crash-recovery model**: faulty nodes can recover with persistent state intact (more realistic)
- **Byzantine model**: faulty nodes can behave arbitrarily, including maliciously. Required for public blockchain systems.

**Safety vs. Liveness**:
- **Safety**: "nothing bad happens" (e.g., uniqueness constraint is never violated). Can always be checked on a finite execution.
- **Liveness**: "something good eventually happens" (e.g., every request eventually completes). Requires reasoning about infinite executions.
- FLP Impossibility: in an asynchronous crash-stop model, consensus is impossible. In practice, we use timeouts (partial synchrony) to work around this.

#### Real-World Application

```
Designing for distributed system reality:
1. All inter-service calls have explicit timeouts (not unlimited)
2. All mutating calls are idempotent (safe to retry)
3. Assume any node can pause for 30 seconds; design liveness around this
4. Use distributed tracing to understand actual latency distributions
5. Never use wall-clock timestamps for ordering; use event sequence numbers
6. Use fencing tokens when acquiring distributed locks

Network fault rules:
- Test by introducing artificial network delays (100ms, 1s, 10s)
- Test by dropping packets (50% packet loss scenarios)
- Test by partitioning the network between service groups
```

---

### Chapter 9 — Consistency and Consensus

#### Key Lesson: Consistency Is a Spectrum; Consensus Is Fundamental

**Consistency Models**:

**Linearizability (Strong Consistency)**:
- Behavior as if there's a single copy of the data, and all operations are atomic
- Once a write completes, all subsequent reads return the new value
- Expensive: requires coordination; high latency; unavailable during network partitions
- Required for: distributed locks, leader election, uniqueness constraints, account balances

**Causal Consistency**:
- Operations that have a causal relationship are seen in the correct order
- Concurrent operations may be seen in any order
- Weaker than linearizability; doesn't require global coordination
- Suitable for: most social media applications, collaborative editing

**Sequential Consistency**:
- All nodes see operations in the same order, but not necessarily in real-time order
- Stronger than causal; weaker than linearizable
- Used in some distributed databases

**Eventual Consistency**:
- If no new updates are made, eventually all nodes converge to the same value
- No guarantees about timing or intermediate states
- Suitable for: shopping carts, DNS, caches, recommendation systems

**CAP Theorem** (with nuance):
- In the presence of a network **P**artition, you choose:
  - **C** (Consistency = linearizability): reject operations that can't be confirmed
  - **A** (Availability): serve requests possibly with stale data
- CAP is widely misunderstood: "AP" vs. "CP" is a false dichotomy. Real systems make nuanced trade-offs at different operations, not system-wide.
- The more useful spectrum: consistency vs. latency trade-offs in the absence of network partitions

**Ordering and Causality**:
- Linearizable timestamps give total ordering consistent with real time
- **Lamport timestamps**: each node/client maintains a counter; increments on every operation; when receiving a message, take the max of local counter and message counter, increment
- Lamport timestamps ensure causal consistency but don't help real-time decisions
- **Total order broadcast**: deliver messages to all nodes in the same order; foundational for database replication

**Consensus**:
The problem: get several nodes to agree on a value, with properties:
1. **Uniform agreement**: no two nodes decide differently
2. **Integrity**: no node decides twice
3. **Validity**: the decided value was proposed by some node
4. **Termination**: every non-crashed node eventually decides (liveness)

**Consensus Algorithms**:
- **Paxos**: original algorithm; complex to implement correctly; many variants (Multi-Paxos)
- **Raft**: designed for understandability; leader-based; used by etcd, CockroachDB
- **Zab**: Kafka uses ZooKeeper which uses Zab
- These algorithms achieve fault-tolerant total order broadcast

**Two-Phase Commit (2PC) vs. Consensus**:
- 2PC requires ALL participants to vote yes; one failure blocks forever (no liveness guarantee)
- Consensus requires only a MAJORITY; can continue if minority fails
- 2PC is not consensus; it's a weaker, blocking commit protocol

**ZooKeeper / etcd as Coordination Services**:
- Implement consensus + total order broadcast
- Provide: linearizable atomic operations, ephemeral nodes (TTL leases), event notifications, sequentially ordered operations
- Used for: leader election, distributed locks, cluster membership, service discovery
- NOT designed for general application data storage (low write throughput, small data)

**The Equivalence of Consensus Problems**:
All of these are equivalent in difficulty (solving one solves all):
- Linearizable compare-and-set
- Atomic transaction commit
- Total order broadcast
- Distributed lock with fencing
- Leader election
- Uniqueness constraints in distributed systems

#### Real-World Application

```
Consistency choice for common operations:
- Distributed lock for leader election: linearizable (etcd/ZooKeeper)
- Financial account balance: linearizable (PostgreSQL serializable)
- User session: eventual consistency (Redis with TTL)
- Social media feed: eventual consistency (Cassandra)
- Product inventory: linearizable (prevent oversell)
- Analytics dashboard: eventual consistency (data warehouse)

Consensus in practice:
- Use ZooKeeper/etcd for distributed coordination; don't implement your own
- Use a proven consensus library, never roll your own
- Design systems to minimize how often consensus is required
  (consensus is expensive — 2-3 round trips minimum)
```

---

## PART III: DERIVED DATA

### Chapter 10 — Batch Processing

#### Key Lesson: Batch Processing Is the Foundation of Scalable Data Pipelines

**The Three Types of Data Systems**:
- **Online services**: wait for requests, respond quickly (databases, API servers)
- **Batch processing**: process large volumes of data offline, periodically (Hadoop, Spark)
- **Stream processing**: process events continuously, low-latency (Kafka Streams, Flink)

**Unix Philosophy as a Design Pattern**:
1. Make each program do one thing well
2. Programs pipe output to other programs (compose)
3. Prefer text streams (universal interface)
4. Fail early and loudly

This philosophy maps directly to microservices, Lambda functions, and data pipeline design: small, composable, independently deployable units connected by well-defined interfaces.

**MapReduce**:
- **Map**: applies a function to each record independently (embarrassingly parallel)
- **Reduce**: aggregates values by key (requires shuffle/sort between map and reduce)
- Advantages: handles data larger than any single machine; fault-tolerant (re-runs failed tasks)
- Disadvantages: high latency (minutes to hours); materializes intermediate state to disk
- Largely superseded by: Apache Spark (in-memory processing), Apache Flink (streaming+batch unification)

**Joins in Batch Processing**:
- **Reduce-side joins**: both datasets are partitioned and sorted by the join key; mapper emits (key, record) pairs; reducer joins records with the same key. Expensive shuffle.
- **Map-side joins**: broadcast the smaller dataset to all mapper nodes; avoids shuffle. Only works when one dataset fits in memory.
- **Sort-merge joins**: both datasets sorted by key; merged sequentially. Efficient for large datasets.

**Output of Batch Workflows**:
- Search indexes (pre-built Lucene/Elasticsearch indexes)
- Key-value store snapshots (pre-computed lookups)
- Recommendations / ML model training outputs
- Data warehouse ETL outputs

**Beyond MapReduce**:
- **Materialization of intermediate state**: unlike Unix pipes, MapReduce writes intermediate results to disk. Spark/Flink keep intermediate state in memory (much faster).
- **DAG execution**: batch frameworks represent jobs as directed acyclic graphs; execute stages in dependency order; restart only failed stages on failure
- **High-level APIs**: DataFrames (Spark), SQL (Hive, Presto) — closer to declarative query languages over distributed data

#### Real-World Application

```
Batch processing patterns:
- Daily ETL: Spark SQL → data warehouse (BigQuery, Redshift)
- Backfill: reprocess historical events with updated business logic
- ML feature engineering: batch compute features → feature store
- Report generation: aggregate → cache results

Design rules:
- Batch jobs must be idempotent (can be re-run without duplicate effects)
- Batch jobs must checkpoint progress (can resume from checkpoint after failure)
- Output must be atomic (write to staging, then atomic swap to production)
- Monitor job duration, failure rate, and output record count
```

---

### Chapter 11 — Stream Processing

#### Key Lesson: Stream Processing Applies Batch Concepts with Low Latency

**Transmitting Event Streams**:
- **Direct messaging (webhooks, UDP)**: low latency; no durability; best-effort
- **Message brokers (RabbitMQ, SQS)**: in-memory queuing; at-least-once delivery; limited replay
- **Partitioned logs (Kafka, Kinesis)**: durable, ordered, replayable; consumers track their offset

**The Partitioned Log (Kafka) Model**:
- Messages are appended to a durable log; retained for configurable period
- Consumers read at their own pace; track their offset (position in log)
- Multiple consumer groups read the same log independently
- Partition count = max parallelism; partition key determines ordering
- Replay: a consumer can reset its offset to replay from any point in history
- This is fundamentally different from a queue: the log is a shared, immutable record

**Databases and Streams**:
- **Change Data Capture (CDC)**: tap into the database's replication log to produce a stream of all changes. Debezium is the leading CDC tool. Every database write becomes an event.
- **Event Sourcing**: store state as a sequence of immutable events; derive current state by replaying. Different from CDC: event sourcing is designed explicitly at the application level.
- **Stream as the Source of Truth**: the event log is the system of record; database tables are derived read-optimized views (CQRS pattern)

**Stream Processing Operations**:
- **Stateless**: map, filter, enrichment — process each event independently
- **Stateful**: aggregation, joins, windowing — require state across events
- **Windowing**: group events by time windows:
  - Tumbling: fixed, non-overlapping windows (every 5 minutes)
  - Hopping: fixed windows with overlap (every 1 minute, covers last 5 minutes)
  - Session: variable-size windows based on user activity gaps
  - Sliding: continuous window of fixed size (last N events or last N seconds)

**Stream Joins**:
- **Stream-stream join**: both inputs are streams; join events within a time window; requires buffering one side
- **Stream-table join (enrichment)**: one input is a stream, the other is a database table; query the table for each event (table lookups, or broadcast the table to all workers)
- **Table-table join (materialized view maintenance)**: both sides are streams of database changes; maintain a joined materialized view that updates when either side changes

**Time in Stream Processing**:
- **Event time**: when the event actually happened (timestamp on the event)
- **Processing time**: when the event is processed by the stream processor
- Events arrive out of order; processing time ≠ event time
- **Watermarks**: a signal that says "we believe no events with timestamp < T will arrive"; allows triggering windows at the right time while handling late events
- **Late events**: handle by triggering windows early (with incomplete data) and issuing corrections when late events arrive

**Fault Tolerance in Stream Processing**:
- **Exactly-once processing**: achieved through: atomic writes to output + committed offsets; or idempotent output + at-least-once delivery
- **Micro-batching**: batch N events at a time, process as a mini-batch (Spark Streaming)
- **Checkpointing**: periodically save state to durable storage; restart from last checkpoint on failure (Flink)

#### Real-World Application

```
Stream processing patterns:
1. CDC → Kafka → Stream processor → Search index (real-time search updates)
2. User events → Kafka → Aggregation → Real-time dashboard
3. IoT sensor data → Kafka → Anomaly detection → Alert service
4. Order events → Kafka → Inventory update + Email notification (fan-out)
5. Payment events → Kafka → Fraud detection + Transaction history

Architecture principles:
- The Kafka topic is the system of record for events; databases are derived
- All stream processing must be idempotent or exactly-once
- Monitor consumer lag per partition; alert when lag exceeds SLA
- Design topics: one topic per event type (not one topic per service)
- Use compacted topics for the latest state per key (Kafka log compaction)
```

---

## CROSS-CUTTING PRINCIPLES

### The Data Reliability Stack

Every layer must be designed for its role:

```
User Requests
     ↓
API Gateway (auth, rate limiting, routing)
     ↓
Service Layer (business logic, validation)
     ↓
Transaction / Saga Layer (atomicity, consistency)
     ↓
Storage Layer (durability, partitioning, replication)
     ↓
Observability (metrics, logs, traces at every layer)
```

### The Immutability Principle

Immutable data is easier to reason about, cache, and replicate:
- Prefer append-only logs to mutable state
- Version records instead of updating them (soft deletes with timestamps)
- Derive computed state from events; don't store computed state as the source of truth
- Immutable S3 objects are safer backups than snapshot databases that can be overwritten

### The Interface Stability Principle

The hardest constraint in distributed systems is that you cannot change everything at once:
- API versions are forever — breaking changes require a new version
- Data schemas must be backward and forward compatible
- Event formats are permanent once published; use schemas with compatibility enforcement
- Deprecation requires a communication period and a migration path

### The Observability Principle

You cannot fix what you cannot see:
- Instrument at the system boundary (inbound/outbound calls)
- Trace across service boundaries (distributed tracing)
- Measure what matters to users (latency, error rate) not just what's easy (CPU, memory)
- Use structured logging — free-text logs at scale become unsearchable

---

*Document version: 1.0 | Derived from: Designing Data-Intensive Applications, Kleppmann (2017)*
