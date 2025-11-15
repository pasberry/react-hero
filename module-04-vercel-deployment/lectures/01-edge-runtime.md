# Lecture 1: Edge Runtime Mastery

## Introduction

Vercel's Edge Runtime runs code at the edge, closer to users, for ultra-low latency responses.

## Edge vs Serverless

**Edge Runtime**:
- ✅ Global distribution
- ✅ <50ms cold starts
- ✅ Limited to Edge-compatible APIs
- ✅ Best for: Middleware, redirects, A/B testing

**Serverless Functions**:
- ✅ Full Node.js API
- ✅ ~500ms cold starts  
- ✅ Best for: Database queries, complex logic

## Edge Functions

```typescript
// app/api/hello/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  return new Response('Hello from the edge!', {
    headers: { 'content-type': 'text/plain' }
  })
}
```

## Geolocation

```typescript
import { geolocation } from '@vercel/edge'

export async function GET(request: Request) {
  const { city, country } = geolocation(request)
  return Response.json({ city, country })
}
```

## Edge Middleware

```typescript
// middleware.ts
export const config = { matcher: '/dashboard/:path*' }

export function middleware(request: Request) {
  const country = request.geo?.country || 'US'
  
  // Redirect based on location
  if (country === 'CN') {
    return Response.redirect('/cn/dashboard')
  }
  
  return Response.next()
}
```

## Summary

Edge Runtime provides global, low-latency execution for performance-critical paths.
