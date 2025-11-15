# Lecture 4: Advanced Data Patterns & Caching

## Request Deduplication

Next.js automatically deduplicates identical fetch requests within a single render pass.

```typescript
// Multiple components request same data - only ONE fetch
async function Header() {
  const user = await fetch('/api/user').then(r => r.json())
  return <div>{user.name}</div>
}

async function Sidebar() {
  const user = await fetch('/api/user').then(r => r.json())  
  return <img src={user.avatar} />
}
```

## Partial Prerendering (PPR)

Combine static and dynamic content in one route:

```typescript
export const experimental_ppr = true

async function Page() {
  return (
    <>
      <StaticHeader /> {/* Prerendered */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent /> {/* Rendered on-demand */}
      </Suspense>
      <StaticFooter /> {/* Prerendered */}
    </>
  )
}
```

## Cache Configuration

```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Force static rendering  
export const dynamic = 'force-static'

// Set revalidation time
export const revalidate = 3600

// Edge runtime
export const runtime = 'edge'
```

## Summary

Master data fetching, caching, and rendering modes to build optimal Next.js applications.
