# Lecture 5: Monitoring, Analytics & Observability

## Introduction

Production applications require comprehensive monitoring to track performance, errors, and user behavior. This lecture covers observability strategies on Vercel.

## Vercel Analytics

### Speed Insights

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Tracks**:
- Real User Monitoring (RUM)
- Core Web Vitals (LCP, FID, CLS)
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)

### Web Analytics

```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Tracks**:
- Page views
- Unique visitors
- Referrers
- Geographic distribution
- Device types

## Custom Event Tracking

```typescript
'use client'

import { track } from '@vercel/analytics'

export function PurchaseButton({ product }: { product: Product }) {
  const handlePurchase = async () => {
    // Track custom event
    track('purchase', {
      product: product.id,
      price: product.price,
      currency: 'USD',
    })

    await processPurchase(product)
  }

  return <button onClick={handlePurchase}>Buy Now</button>
}
```

## Error Monitoring with Sentry

### Setup

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Configuration

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of requests
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out known errors
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null
    }
    return event
  },
})

// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})

// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

### Error Boundaries with Sentry

```typescript
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Performance Monitoring

### Custom Performance Marks

```typescript
'use client'

export function DataTable({ data }: { data: any[] }) {
  useEffect(() => {
    performance.mark('table-render-start')

    return () => {
      performance.mark('table-render-end')
      performance.measure('table-render', 'table-render-start', 'table-render-end')

      const measure = performance.getEntriesByName('table-render')[0]
      console.log(\`Table rendered in \${measure.duration}ms\`)

      // Send to analytics
      track('performance', {
        metric: 'table-render',
        duration: measure.duration,
      })
    }
  }, [data])

  return <table>{/* render */}</table>
}
```

### API Response Time Tracking

```typescript
// app/api/posts/route.ts
export async function GET() {
  const start = Date.now()

  try {
    const posts = await db.post.findMany()
    const duration = Date.now() - start

    // Log slow queries
    if (duration > 1000) {
      console.warn(\`Slow query: \${duration}ms\`)
    }

    return Response.json(posts, {
      headers: {
        'X-Response-Time': \`\${duration}ms\`,
      },
    })
  } catch (error) {
    const duration = Date.now() - start

    // Track error with duration
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/posts',
        duration,
      },
    })

    throw error
  }
}
```

## Logging

### Structured Logging

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
})

// Usage
logger.info({ userId: '123', action: 'login' }, 'User logged in')
logger.error({ error, userId: '123' }, 'Login failed')
```

### Log Aggregation

```typescript
// Send logs to external service
export function log(level: string, message: string, meta?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
    environment: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION,
  }

  // Log to console
  console.log(JSON.stringify(logEntry))

  // Send to log aggregation service
  if (process.env.NODE_ENV === 'production') {
    fetch('https://logs.example.com/ingest', {
      method: 'POST',
      body: JSON.stringify(logEntry),
    }).catch(console.error)
  }
}
```

## Alerting

### Custom Alerts

```typescript
// lib/alerts.ts
export async function sendAlert(alert: {
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  metadata?: any
}) {
  // Send to Slack
  if (alert.severity === 'critical' || alert.severity === 'high') {
    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: \`*\${alert.severity.toUpperCase()}*: \${alert.title}\`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alert.message,
            },
          },
        ],
      }),
    })
  }

  // Send to PagerDuty for critical
  if (alert.severity === 'critical') {
    await fetch('https://api.pagerduty.com/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Token token=\${process.env.PAGERDUTY_TOKEN}\`,
      },
      body: JSON.stringify({
        incident: {
          type: 'incident',
          title: alert.title,
          service: {
            id: process.env.PAGERDUTY_SERVICE_ID,
            type: 'service_reference',
          },
          body: {
            type: 'incident_body',
            details: alert.message,
          },
        },
      }),
    })
  }
}
```

### Error Rate Monitoring

```typescript
// middleware.ts
let errorCount = 0
let requestCount = 0
let lastAlertTime = 0

export async function middleware(request: NextRequest) {
  requestCount++

  const response = await NextResponse.next()

  if (response.status >= 500) {
    errorCount++

    // Alert if error rate > 5%
    const errorRate = errorCount / requestCount
    const now = Date.now()

    if (errorRate > 0.05 && now - lastAlertTime > 300000) {
      // Alert max once per 5 minutes
      await sendAlert({
        severity: 'high',
        title: 'High Error Rate Detected',
        message: \`Error rate: \${(errorRate * 100).toFixed(2)}%\`,
        metadata: {
          errorCount,
          requestCount,
          region: process.env.VERCEL_REGION,
        },
      })

      lastAlertTime = now
    }
  }

  // Reset counters every hour
  if (requestCount > 10000) {
    errorCount = 0
    requestCount = 0
  }

  return response
}
```

## Real User Monitoring (RUM)

```typescript
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    })

    // Use sendBeacon if available
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/vitals', body)
    } else {
      fetch('/api/vitals', {
        method: 'POST',
        body,
        keepalive: true,
      })
    }
  })

  return null
}
```

## Database Query Monitoring

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

prisma.$on('query', (e) => {
  // Log slow queries
  if (e.duration > 1000) {
    logger.warn({
      query: e.query,
      duration: e.duration,
      params: e.params,
    }, 'Slow query detected')

    // Send alert for very slow queries
    if (e.duration > 5000) {
      sendAlert({
        severity: 'medium',
        title: 'Very Slow Database Query',
        message: \`Query took \${e.duration}ms\`,
        metadata: { query: e.query },
      })
    }
  }
})
```

## Deployment Tracking

```typescript
// Track deployments in Sentry
// .github/workflows/deploy.yml
- name: Create Sentry release
  run: |
    sentry-cli releases new "$GITHUB_SHA"
    sentry-cli releases set-commits "$GITHUB_SHA" --auto
    sentry-cli releases finalize "$GITHUB_SHA"
    sentry-cli releases deploys "$GITHUB_SHA" new -e production
```

## Dashboard Setup

### Custom Metrics Dashboard

```typescript
// app/admin/metrics/page.tsx
export default async function MetricsDashboard() {
  const [errorRate, responseTime, activeUsers] = await Promise.all([
    getErrorRate(),
    getAverageResponseTime(),
    getActiveUsers(),
  ])

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="Error Rate"
        value={\`\${errorRate.toFixed(2)}%\`}
        trend={errorRate > 1 ? 'up' : 'down'}
        critical={errorRate > 5}
      />
      <MetricCard
        title="Avg Response Time"
        value={\`\${responseTime}ms\`}
        trend={responseTime > 500 ? 'up' : 'down'}
        critical={responseTime > 1000}
      />
      <MetricCard title="Active Users" value={activeUsers} />
    </div>
  )
}
```

## Summary

**Monitoring Stack**:

1. **Vercel Analytics** - Web Vitals, page views
2. **Speed Insights** - Real user performance
3. **Sentry** - Error tracking and performance
4. **Custom Logging** - Structured application logs
5. **Alerting** - Slack, PagerDuty for critical issues

**Key Metrics to Track**:
- Core Web Vitals (LCP, FID, CLS)
- Error rates
- API response times
- Database query performance
- Active users
- Conversion rates

**Best Practices**:
- Monitor in production from day one
- Set up alerts for critical metrics
- Track deployments
- Review metrics regularly
- Act on performance degradations quickly

**Module 4 Complete!** You now understand Vercel deployment, edge runtime, performance optimization, multi-region architecture, and observability.
