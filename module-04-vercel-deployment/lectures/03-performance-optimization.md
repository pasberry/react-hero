# Lecture 3: Performance Optimization on Vercel

## Introduction

Optimizing performance on Vercel requires understanding bundle sizes, rendering strategies, caching, and Core Web Vitals. This lecture covers production optimization techniques.

## Bundle Size Analysis

### Analyzing Your Bundle

```bash
# Build and analyze
npm run build

# Next.js shows bundle analysis
Route (app)                              Size     First Load JS
┌ ○ /                                    5.02 kB        87.3 kB
├ ○ /about                               137 B          77.4 kB
└ ○ /blog/[slug]                         2.83 kB        80.1 kB
```

### Using @next/bundle-analyzer

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // Next.js config
})

// Run analysis
// ANALYZE=true npm run build
```

### Reducing Bundle Size

```typescript
// ❌ Bad: Entire library imported
import _ from 'lodash'
const sorted = _.sortBy(items, 'name')

// ✅ Good: Only import what you need
import sortBy from 'lodash/sortBy'
const sorted = sortBy(items, 'name')

// ✅ Better: Use native methods when possible
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
```

## Dynamic Imports

### Code Splitting Components

```typescript
// app/dashboard/page.tsx
import { lazy, Suspense } from 'react'

// Heavy chart library loaded only when needed
const Chart = lazy(() => import('@/components/Chart'))

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading chart...</div>}>
        <Chart />
      </Suspense>
    </div>
  )
}
```

### Conditional Loading

```typescript
'use client'

export function Admin() {
  const [showEditor, setShowEditor] = useState(false)
  const [Editor, setEditor] = useState<any>(null)

  useEffect(() => {
    if (showEditor && !Editor) {
      import('@/components/RichTextEditor').then((mod) => {
        setEditor(() => mod.default)
      })
    }
  }, [showEditor, Editor])

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>Edit</button>
      {showEditor && Editor && <Editor />}
    </div>
  )
}
```

## Image Optimization

### Next.js Image Component

```typescript
import Image from 'next/image'

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      quality={85}
      priority={false} // Only true for above-the-fold images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    />
  )
}
```

### Image Formats

```typescript
// next.config.js
export default {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}
```

### Remote Images

```typescript
// next.config.js
export default {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/images/**',
      },
    ],
  },
}
```

## Font Optimization

### Using next/font

```typescript
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### Custom Fonts

```typescript
import localFont from 'next/font/local'

const customFont = localFont({
  src: [
    {
      path: './fonts/CustomFont-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/CustomFont-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
})
```

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP)

**Target**: < 2.5 seconds

```typescript
// Optimize LCP
export default function Hero() {
  return (
    <section>
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1920}
        height={1080}
        priority // Load immediately - above the fold
        quality={90}
      />
    </section>
  )
}
```

### First Input Delay (FID)

**Target**: < 100ms

```typescript
// ❌ Bad: Heavy computation blocks main thread
function Component() {
  const result = heavyComputation() // Blocks for 500ms
  return <div>{result}</div>
}

// ✅ Good: Use Web Worker or defer
function Component() {
  const [result, setResult] = useState(null)

  useEffect(() => {
    // Run in background
    const worker = new Worker('/worker.js')
    worker.postMessage({ type: 'compute' })
    worker.onmessage = (e) => setResult(e.data)
  }, [])

  return <div>{result || 'Loading...'}</div>
}
```

### Cumulative Layout Shift (CLS)

**Target**: < 0.1

```typescript
// ❌ Bad: No dimensions specified
<img src="/image.jpg" alt="Product" />

// ✅ Good: Reserve space
<img src="/image.jpg" alt="Product" width="800" height="600" />

// ✅ Better: Use Next Image
<Image src="/image.jpg" alt="Product" width={800} height={600} />

// ✅ CSS aspect ratio
<div style={{ aspectRatio: '16/9' }}>
  <Image src="/image.jpg" alt="Product" fill />
</div>
```

## Caching Headers

### Static Assets

```typescript
// next.config.js
export default {
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

### API Routes

```typescript
// app/api/posts/route.ts
export async function GET() {
  const posts = await getPosts()

  return new Response(JSON.stringify(posts), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=3600',
    },
  })
}
```

## Compression

Vercel automatically enables gzip and Brotli compression, but you can optimize content:

```typescript
// Ensure text assets are compressible
export async function GET() {
  const data = await fetchData()

  return new Response(JSON.stringify(data, null, 0), {
    // Minified JSON compresses better
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'br', // Brotli
    },
  })
}
```

## Server-Side Rendering Optimization

### Streaming

```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <>
      <Header /> {/* Renders immediately */}
      <Suspense fallback={<MetricsSkeleton />}>
        <Metrics /> {/* Streams when ready */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart /> {/* Streams when ready */}
      </Suspense>
    </>
  )
}
```

### Partial Prerendering

```typescript
// Enable PPR
// next.config.js
export default {
  experimental: {
    ppr: true,
  },
}

// app/page.tsx
export const experimental_ppr = true
```

## Database Query Optimization

### Connection Pooling

```typescript
import { Pool } from 'pg'

// Reuse connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function query(sql: string, params: any[]) {
  const client = await pool.connect()
  try {
    return await client.query(sql, params)
  } finally {
    client.release()
  }
}
```

### Query Optimization

```typescript
// ❌ Bad: N+1 query problem
async function getPosts() {
  const posts = await db.post.findMany()

  for (const post of posts) {
    post.author = await db.user.findUnique({ where: { id: post.authorId } })
  }

  return posts
}

// ✅ Good: Single query with join
async function getPosts() {
  return db.post.findMany({
    include: {
      author: true,
    },
  })
}
```

## Monitoring Performance

### Web Vitals Reporting

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Custom Performance Tracking

```typescript
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric)

    // Send to analytics
    if (metric.label === 'web-vital') {
      // Send LCP, FID, CLS to your analytics
      fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
        }),
      })
    }
  })

  return null
}
```

## Performance Budget

```typescript
// next.config.js
export default {
  experimental: {
    performanceBudget: {
      maxInitialJSSize: 200 * 1024, // 200kb
      maxPageJSSize: 300 * 1024, // 300kb
    },
  },
}
```

## Production Checklist

### Pre-Deployment

- [ ] Analyze bundle sizes
- [ ] Optimize images (use Next Image)
- [ ] Enable proper caching headers
- [ ] Set up font optimization
- [ ] Configure compression
- [ ] Test Core Web Vitals
- [ ] Review database queries
- [ ] Set up monitoring
- [ ] Configure error tracking
- [ ] Test on slow connections

### Post-Deployment

- [ ] Monitor Web Vitals
- [ ] Check error rates
- [ ] Review performance metrics
- [ ] Analyze user behavior
- [ ] Optimize based on data

## Summary

**Key Optimizations**:

1. **Bundle Size** - Dynamic imports, tree shaking
2. **Images** - Next Image component, proper sizing
3. **Fonts** - next/font optimization
4. **Core Web Vitals** - LCP, FID, CLS targets
5. **Caching** - Proper cache headers
6. **Streaming** - Progressive rendering
7. **Database** - Connection pooling, query optimization
8. **Monitoring** - Web Vitals tracking

**Performance Budget**:
- First Load JS: < 200kb
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

**Next**: Lecture 4 covers multi-region architecture and global deployment.
