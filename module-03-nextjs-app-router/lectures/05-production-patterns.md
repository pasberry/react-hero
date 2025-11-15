# Lecture 5: Production Patterns

## Environment Variables

```typescript
// .env.local
DATABASE_URL="postgres://..."
NEXT_PUBLIC_API_URL="https://api.example.com"

// Access in Server Components
const dbUrl = process.env.DATABASE_URL

// Access in Client Components  
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

## Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request) {
  // A/B testing
  const bucket = request.cookies.get('bucket')?.value || Math.random() > 0.5 ? 'a' : 'b'
  
  const response = NextResponse.next()
  response.cookies.set('bucket', bucket)
  
  return response
}

export const config = {
  matcher: '/dashboard/:path*'
}
```

## Monitoring

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
```

## Summary

Production-ready patterns for environment config, middleware, and monitoring.
