# SchoolMesh Monitoring

SchoolMesh's observability foundation covers application logs, HTTP request logging,
multi-tenant logging context, Sentry error tracking, Better Stack uptime, Cloudflare R2
usage, Vercel deployments, and a superadmin observability dashboard.

This document focuses on the **MongoDB / database-per-tenant monitoring** extension.

## Overview

SchoolMesh uses a **database-per-tenant architecture**. Every school owns its own MongoDB
database inside a single MongoDB Atlas cluster:

```
MongoDB Atlas Cluster
├── uca_database        (users, students, grades, payments, reports, ...)
├── riverdale_database  (users, students, grades, payments, ...)
└── abc_database        (users, students, grades, payments, ...)
```

Each `SchoolProfile` document in the central `schoolmesh` database identifies its tenant
database via `system.dbName` and its host via `system.host`.

Monitoring is split into two layers:

1. **Cluster level** — MongoDB Atlas API reports storage, connections, operations and
   cluster state.
2. **Tenant level** — a collector connects to each school database, runs `db.stats()`,
   and persists a `TenantDatabaseMetric` document per school.

## Environment variables

Required only for Atlas cluster metrics (`MONGODB_ATLAS_*`). Tenant-level metrics work
with just `MONGODB_URI`.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Base MongoDB connection string (already used by the app). |
| `MONGODB_ATLAS_PUBLIC_KEY` | For cluster metrics | MongoDB Atlas API public key (read-only). |
| `MONGODB_ATLAS_PRIVATE_KEY` | For cluster metrics | MongoDB Atlas API private key (read-only). |
| `MONGODB_ATLAS_PROJECT_ID` | For cluster metrics | Atlas project (group) id that owns the cluster. |
| `MONGODB_COLLECTION_CONCURRENCY` | No | Concurrent tenant DB scans (default `8`, max `25`). |
| `MONGODB_COLLECTION_SCHOOL_LIMIT` | No | Cap on schools scanned per collection run (`0` = all). |

> Credentials are **server-side only**. They are never serialized into API responses
> or exposed to the client. Use an Atlas API key with read-only permissions
> (`Organization Read Only` / `Project Read Only`).

## How metrics are collected

Collection happens through the **existing monitoring collection mechanism** — it never
runs on dashboard renders.

Flow:

```
Monitoring refresh (GET /api/admin/monitoring/overview?refresh=true)
        │
        ▼
collectMonitoringSnapshot()            lib/monitoring/collector.ts
        │
        ├── collectTenantDatabaseMetrics()      lib/monitoring/collectors/mongodbCollector.ts
        │       │
        │       ├── SchoolProfile.find()        (all active schools)
        │       ├── getTenantConnectionByDbName(dbName)
        │       ├── db.stats()                  (per school, bounded concurrency)
        │       └── TenantDatabaseMetric.create()
        │
        ├── getMonitoringSummary()              lib/monitoring/index.ts
        │       ├── getMongoClusterMetrics()    MongoDB Atlas API
        │       └── getLatestTenantDatabaseUsage()  (stored metrics, no live DB queries)
        │
        └── MonitoringSnapshot.create()         cached dashboard payload
```

Dashboard page loads:

- `GET /api/admin/monitoring/overview` — returns the latest cached `MonitoringSnapshot`
  (includes `database.cluster` + `database.tenants`). No tenant DB is queried.
- `GET /api/admin/monitoring/database` — cluster metrics, tenant usage, and optional
  `?schoolId=` growth history from stored `TenantDatabaseMetric` documents.

## Database models

### `TenantDatabaseMetric` (models/TenantDatabaseMetric.ts)

Stored in the central `schoolmesh` database.

```ts
{
  schoolId: string,        // derived: host slug, e.g. "uca"
  databaseName: string,    // e.g. "uca_database"
  collections: number,     // db.stats().collections
  documents: number,       // db.stats().objects
  dataSizeBytes: number,   // db.stats().dataSize
  storageSizeBytes: number,// db.stats().storageSize
  indexSizeBytes: number,  // db.stats().indexSize
  collectedAt: Date
}
```

Indexes: `{ schoolId: 1, collectedAt: -1 }` and `{ collectedAt: -1 }`.

### `MonitoringSnapshot` (models/MonitoringSnapshot.ts)

Extended with a `database` object containing the last `cluster` metrics and the latest
per-tenant usage summary, so the dashboard can render without live database access.

## Alerts

Alerts are written to `SystemAlert` during `collectMonitoringSnapshot()`:

| Type | Condition | Severity |
| --- | --- | --- |
| `MONGODB_STORAGE` | Cluster storage > 80% | warning |
| `MONGODB_STORAGE` | Cluster storage > 95% | critical |
| `TENANT_DATABASE_GROWTH` | School DB grew ≥ 50% in 24h | warning |
| `MONGODB_CONNECTION` | Cluster / connection failure detected | warning |

## Files

**Created**

- `lib/monitoring/mongodb.ts` — Atlas cluster metrics, per-tenant `db.stats()`, health.
- `lib/monitoring/collectors/mongodbCollector.ts` — collection service, history queries,
  growth detection, MongoDB alerts.
- `models/TenantDatabaseMetric.ts` — historical per-school database metrics.
- `app/api/admin/monitoring/database/route.ts` — database monitoring API.
- `components/admin/monitoring/DatabaseHealthCard.tsx`
- `components/admin/monitoring/TenantDatabaseUsageTable.tsx`
- `components/admin/monitoring/DatabaseDetailPanel.tsx`

**Modified**

- `lib/monitoring/types.ts` — MongoDB types + `database` on `MonitoringSummary`.
- `lib/monitoring/index.ts` — aggregates Mongo cluster + tenant usage into the summary.
- `lib/monitoring/health.ts` — MongoDB provider health via Atlas / connection check.
- `lib/monitoring/collector.ts` — runs tenant collection, adds Mongo alerts.
- `models/schoolmesh/index.ts` — registers `TenantDatabaseMetric`.
- `models/MonitoringSnapshot.ts` — caches `database` payload.
- `components/admin/monitoring/MonitoringOverview.tsx` — MongoDB dashboard section.
- `components/admin/monitoring/types.ts` — dashboard `database` payload types.

## Scaling notes

- Dashboard rendering reads only stored `TenantDatabaseMetric` documents, never each
  tenant database.
- Tenant collection uses bounded concurrency (`MONGODB_COLLECTION_CONCURRENCY`, default 8)
  and can be capped with `MONGODB_COLLECTION_SCHOOL_LIMIT`.
- `{ schoolId: 1, collectedAt: -1 }` supports "latest per school" aggregation and growth
  windows; `{ collectedAt: -1 }` supports global history queries.
