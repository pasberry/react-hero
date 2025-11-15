# Lecture 4: Multi-Region Architecture

## Introduction

Multi-region architecture ensures low latency for users worldwide by serving content from the nearest geographic location. This lecture covers implementing global applications on Vercel.

## Vercel Edge Network

Vercel's Edge Network automatically distributes your content globally across 100+ regions.

### Automatic Edge Caching

```typescript
// Static assets automatically cached at edge
export default function Page() {
  return (
    <div>
      <Image src="/logo.png" alt="Logo" width={200} height={50} />
      <link rel="stylesheet" href="/styles.css" />
    </div>
  )
}
```

### Edge Functions

```typescript
// app/api/geo/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  // Runs at edge location nearest to user
  const geo = request.geo || {}

  return Response.json({
    city: geo.city,
    country: geo.country,
    region: geo.region,
    latitude: geo.latitude,
    longitude: geo.longitude,
  })
}
```

## Regional Database Reads

### Database Replication Strategy

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

// Primary database (writes)
const primary = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_PRIMARY,
    },
  },
})

// Read replicas by region
const replicas = {
  'us-east': new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_US_EAST } },
  }),
  'eu-west': new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_EU_WEST } },
  }),
  'ap-south': new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_AP_SOUTH } },
  }),
}

export function getDB(region?: string, readOnly = true) {
  if (!readOnly) return primary

  // Use regional replica for reads
  if (region && replicas[region]) {
    return replicas[region]
  }

  // Fallback to primary
  return primary
}
```

### Using Regional Databases

```typescript
// app/api/posts/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  const region = request.geo?.region
  const db = getDB(region, true) // Use regional read replica

  const posts = await db.post.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(posts)
}
```

## Content Delivery Optimization

### Regional Content

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US'

  // Serve region-specific content
  if (country === 'JP') {
    return NextResponse.rewrite(new URL('/jp' + request.nextUrl.pathname, request.url))
  }

  if (country === 'DE') {
    return NextResponse.rewrite(new URL('/de' + request.nextUrl.pathname, request.url))
  }

  return NextResponse.next()
}
```

### CDN Configuration

```typescript
// next.config.js
export default {
  images: {
    domains: [
      'cdn-us.example.com',
      'cdn-eu.example.com',
      'cdn-asia.example.com',
    ],
  },

  async rewrites() {
    return [
      {
        source: '/cdn/:path*',
        destination: 'https://cdn-us.example.com/:path*',
      },
    ]
  },
}
```

## Latency Optimization

### Edge Caching with KV

```typescript
import { kv } from '@vercel/kv'

// app/api/config/route.ts
export const runtime = 'edge'

export async function GET() {
  // Check edge cache first
  const cached = await kv.get('app-config')

  if (cached) {
    return Response.json(cached, {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  // Fetch from database
  const config = await fetchConfig()

  // Cache at edge for 1 hour
  await kv.set('app-config', config, { ex: 3600 })

  return Response.json(config, {
    headers: { 'X-Cache': 'MISS' },
  })
}
```

### Request Coalescing

```typescript
// lib/coalesce.ts
const pending = new Map<string, Promise<any>>()

export async function coalesce<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // If request is pending, return existing promise
  if (pending.has(key)) {
    return pending.get(key)!
  }

  // Execute and cache promise
  const promise = fn().finally(() => {
    pending.delete(key)
  })

  pending.set(key, promise)
  return promise
}

// Usage
async function getUser(id: string) {
  return coalesce(\`user-\${id}\`, async () => {
    return db.user.findUnique({ where: { id } })
  })
}
```

## A/B Testing by Region

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const country = request.geo?.country
  const bucket = Math.random() > 0.5 ? 'a' : 'b'

  // Regional experiments
  let variant = bucket
  if (country === 'US') {
    variant = 'us-' + bucket
  } else if (country === 'EU') {
    variant = 'eu-' + bucket
  }

  const response = NextResponse.next()
  response.cookies.set('variant', variant)

  return response
}
```

## Multi-Region Deployment Strategy

### Primary Regions

```typescript
// vercel.json
{
  "regions": [
    "iad1",  // US East (primary for US traffic)
    "fra1",  // Europe (primary for EU traffic)
    "hnd1"   // Asia Pacific (primary for APAC traffic)
  ],
  "github": {
    "silent": true
  }
}
```

### Failover Strategy

```typescript
// lib/api.ts
const REGIONS = [
  'https://api-us.example.com',
  'https://api-eu.example.com',
  'https://api-asia.example.com',
]

export async function fetchWithFailover(endpoint: string) {
  for (const region of REGIONS) {
    try {
      const response = await fetch(\`\${region}\${endpoint}\`, {
        timeout: 2000, // 2 second timeout
      })

      if (response.ok) {
        return response
      }
    } catch (error) {
      console.error(\`Region \${region} failed:`, error)
      continue // Try next region
    }
  }

  throw new Error('All regions failed')
}
```

## Global State Management

### Edge Config

```typescript
import { get } from '@vercel/edge-config'

// app/api/features/route.ts
export const runtime = 'edge'

export async function GET() {
  // Globally replicated config
  const features = await get('features')

  return Response.json(features)
}

// Update via API or dashboard
// Propagates to all edge locations in < 1 second
```

### Distributed Locks

```typescript
import { kv } from '@vercel/kv'

async function acquireLock(key: string, ttl: number = 10) {
  const acquired = await kv.set(key, '1', {
    nx: true, // Only set if doesn't exist
    ex: ttl,  // Expire after ttl seconds
  })

  return acquired === 'OK'
}

async function releaseLock(key: string) {
  await kv.del(key)
}

// Usage
async function criticalOperation() {
  const lockKey = 'lock:critical-op'

  if (await acquireLock(lockKey, 30)) {
    try {
      // Perform operation
      await doWork()
    } finally {
      await releaseLock(lockKey)
    }
  } else {
    throw new Error('Could not acquire lock')
  }
}
```

## Monitoring Multi-Region Performance

### Regional Metrics

```typescript
// app/api/metrics/route.ts
export const runtime = 'edge'

export async function POST(request: Request) {
  const { metric, value } = await request.json()
  const region = process.env.VERCEL_REGION

  // Log metrics by region
  await kv.hincrby(\`metrics:\${metric}\`, region, value)

  return Response.json({ success: true })
}

// Query regional metrics
export async function GET() {
  const metrics = await kv.hgetall('metrics:response-time')

  return Response.json({
    'us-east-1': metrics['iad1'],
    'eu-central-1': metrics['fra1'],
    'asia-pacific-1': metrics['hnd1'],
  })
}
```

### Health Checks

```typescript
// app/api/health/route.ts
export const runtime = 'edge'

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkCache(),
    checkThirdParty(),
  ])

  const healthy = checks.every((check) => check.healthy)

  return Response.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      region: process.env.VERCEL_REGION,
      checks,
    },
    { status: healthy ? 200 : 503 }
  )
}
```

## Data Consistency

### Eventual Consistency

```typescript
// Write to primary, read from replicas
async function updateUser(id: string, data: any) {
  // Write to primary database
  await primaryDB.user.update({
    where: { id },
    data,
  })

  // Invalidate caches
  await kv.del(\`user:\${id}\`)

  // Note: Replicas may take a few seconds to sync
  // Design UI to handle this
}

async function getUser(id: string) {
  // Try cache first
  const cached = await kv.get(\`user:\${id}\`)
  if (cached) return cached

  // Read from regional replica (may be slightly stale)
  const user = await replicaDB.user.findUnique({ where: { id } })

  // Cache for 1 minute
  await kv.set(\`user:\${id}\`, user, { ex: 60 })

  return user
}
```

### Conflict Resolution

```typescript
// Last-write-wins with timestamps
async function resolveConflict(localData: any, remoteData: any) {
  if (localData.updatedAt > remoteData.updatedAt) {
    return localData
  }
  return remoteData
}
```

## Cost Optimization

### Regional Routing

```typescript
// Route to cheapest region based on request origin
function selectRegion(country: string) {
  // Route to same geographic region to minimize costs
  if (['US', 'CA', 'MX'].includes(country)) {
    return 'us-east-1'
  }

  if (['GB', 'DE', 'FR', 'IT', 'ES'].includes(country)) {
    return 'eu-central-1'
  }

  return 'asia-pacific-1'
}
```

## Summary

**Key Patterns**:

1. **Edge Functions** - Run code globally at low latency
2. **Regional Databases** - Read from nearest replica
3. **Edge Caching** - Cache at edge with KV or Edge Config
4. **Failover** - Handle regional failures gracefully
5. **Monitoring** - Track metrics by region
6. **Data Consistency** - Design for eventual consistency

**Best Practices**:
- Use edge for static and simple dynamic content
- Replicate databases for reads, single primary for writes
- Cache aggressively at edge
- Monitor regional performance
- Design for eventual consistency
- Implement failover strategies

**Next**: Lecture 5 covers monitoring, analytics, and observability.
