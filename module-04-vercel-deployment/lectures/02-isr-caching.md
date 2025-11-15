# Lecture 2: ISR & Caching Strategies

## Incremental Static Regeneration (ISR)

```typescript
// app/blog/[slug]/page.tsx
export const revalidate = 3600 // Revalidate every hour

async function BlogPost({ params }) {
  const post = await getPost(params.slug)
  return <Article post={post} />
}
```

## On-Demand Revalidation

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const { path } = await request.json()
  
  revalidatePath(path)
  
  return Response.json({ revalidated: true })
}
```

## Cache Control Headers

```typescript
export async function GET() {
  return new Response('Hello', {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
    }
  })
}
```

## Summary

ISR and on-demand revalidation provide the best of static and dynamic rendering.
