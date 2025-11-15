# Lecture 1: App Router Architecture Deep Dive

## Introduction

Next.js App Router (introduced in v13, stable in v14) represents a fundamental shift in how Next.js applications are built. It's built on React Server Components and provides a new paradigm for routing, data fetching, and rendering.

## File-Based Routing

### Basic Structure

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── about/
│   └── page.tsx        # About page (/about)
├── blog/
│   ├── page.tsx        # Blog index (/blog)
│   └── [slug]/
│       └── page.tsx    # Blog post (/blog/post-1)
└── dashboard/
    ├── layout.tsx      # Dashboard layout
    ├── page.tsx        # Dashboard home (/dashboard)
    └── settings/
        └── page.tsx    # Settings (/dashboard/settings)
```

### Special Files

```typescript
// layout.tsx - Shared UI for a segment and its children
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

// page.tsx - Unique UI for a route
export default function Page() {
  return <h1>Home</h1>
}

// loading.tsx - Loading UI (wraps page in Suspense)
export default function Loading() {
  return <div>Loading...</div>
}

// error.tsx - Error UI (wraps page in Error Boundary)
'use client'
export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// not-found.tsx - Not found UI
export default function NotFound() {
  return <h2>404 - Page Not Found</h2>
}
```

## Layouts and Nested Routes

### Nested Layouts

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <nav>
        <Link href="/dashboard">Overview</Link>
        <Link href="/dashboard/settings">Settings</Link>
      </nav>
      <main>{children}</main>
    </div>
  )
}

// app/dashboard/page.tsx - Uses dashboard layout
export default function Dashboard() {
  return <h1>Dashboard</h1>
}

// app/dashboard/settings/page.tsx - Also uses dashboard layout
export default function Settings() {
  return <h1>Settings</h1>
}
```

**Result**: Both `/dashboard` and `/dashboard/settings` render inside DashboardLayout.

### Layout Nesting

```
app/
├── layout.tsx (Root)
└── dashboard/
    ├── layout.tsx (Dashboard)
    └── settings/
        ├── layout.tsx (Settings)
        └── page.tsx

Renders as:
<RootLayout>
  <DashboardLayout>
    <SettingsLayout>
      <SettingsPage />
    </SettingsLayout>
  </DashboardLayout>
</RootLayout>
```

## Dynamic Routes

### Basic Dynamic Route

```typescript
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>Post: {params.slug}</h1>
}

// Matches: /blog/hello-world, /blog/my-post, etc.
```

### Multiple Dynamic Segments

```typescript
// app/shop/[category]/[product]/page.tsx
export default function Product({
  params,
}: {
  params: { category: string; product: string }
}) {
  return (
    <div>
      <h1>Category: {params.category}</h1>
      <h2>Product: {params.product}</h2>
    </div>
  )
}

// Matches: /shop/electronics/laptop
```

### Catch-All Segments

```typescript
// app/docs/[...slug]/page.tsx
export default function Docs({
  params,
}: {
  params: { slug: string[] }
}) {
  return <h1>Docs: {params.slug.join('/')}</h1>
}

// Matches: /docs/a, /docs/a/b, /docs/a/b/c, etc.
```

### Optional Catch-All

```typescript
// app/shop/[[...category]]/page.tsx
export default function Shop({
  params,
}: {
  params: { category?: string[] }
}) {
  if (!params.category) {
    return <h1>All Products</h1>
  }
  return <h1>Category: {params.category.join('/')}</h1>
}

// Matches: /shop, /shop/electronics, /shop/electronics/laptops, etc.
```

## Route Groups

Organize routes without affecting URL structure:

```
app/
├── (marketing)/
│   ├── layout.tsx      # Marketing layout
│   ├── about/
│   │   └── page.tsx    # /about (not /(marketing)/about)
│   └── contact/
│       └── page.tsx    # /contact
└── (shop)/
    ├── layout.tsx      # Shop layout
    ├── products/
    │   └── page.tsx    # /products
    └── cart/
        └── page.tsx    # /cart
```

**Use cases**:
- Different layouts for different sections
- Organizing routes by feature
- Opt-in to different behaviors (e.g., authentication)

## Parallel Routes

Render multiple pages in the same layout simultaneously:

```
app/
├── layout.tsx
├── @team/
│   └── page.tsx
├── @analytics/
│   └── page.tsx
└── page.tsx

// app/layout.tsx
export default function Layout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode
  team: React.ReactNode
  analytics: React.ReactNode
}) {
  return (
    <>
      {children}
      <div className="grid">
        <div>{team}</div>
        <div>{analytics}</div>
      </div>
    </>
  )
}
```

**Result**: `/` renders page.tsx in children, @team/page.tsx in team slot, @analytics/page.tsx in analytics slot.

### Conditional Rendering with Parallel Routes

```typescript
export default function Layout({
  children,
  team,
  analytics,
  params,
}: Props) {
  const showAnalytics = params.showAnalytics === 'true'

  return (
    <>
      {children}
      {team}
      {showAnalytics && analytics}
    </>
  )
}
```

## Intercepting Routes

Intercept a route to show different UI based on context:

```
app/
├── feed/
│   └── page.tsx                    # Feed page
├── photo/
│   └── [id]/
│       └── page.tsx                # Full photo page
└── feed/
    └── (..)photo/
        └── [id]/
            └── page.tsx            # Intercepted photo (modal)
```

**Behavior**:
- Navigating from /feed to /photo/123 → Shows modal (intercepted route)
- Direct navigation to /photo/123 → Shows full page
- Refresh on /photo/123 → Shows full page

**Convention**:
- `(.)` - same level
- `(..)` - one level up
- `(..)(..)` - two levels up
- `(...)` - root app directory

## generateStaticParams

Pre-render dynamic routes at build time:

```typescript
// app/blog/[slug]/page.tsx

export async function generateStaticParams() {
  const posts = await getPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default function BlogPost({
  params,
}: {
  params: { slug: string }
}) {
  return <h1>{params.slug}</h1>
}
```

**Result**: All blog post pages are statically generated at build time.

### Dynamic Params with Multiple Segments

```typescript
// app/products/[category]/[product]/page.tsx

export async function generateStaticParams() {
  const products = await getAllProducts()

  return products.map((product) => ({
    category: product.category,
    product: product.slug,
  }))
}
```

## Metadata

### Static Metadata

```typescript
// app/about/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'About our company',
}

export default function About() {
  return <h1>About</h1>
}
```

### Dynamic Metadata

```typescript
// app/blog/[slug]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await getPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: [post.coverImage],
    },
  }
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  // ...
}
```

## Route Segment Config

Configure route behavior:

```typescript
// app/dashboard/page.tsx

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Or force static rendering
export const dynamic = 'force-static'

// Set revalidation time (ISR)
export const revalidate = 3600 // Revalidate every hour

// Configure runtime
export const runtime = 'edge' // or 'nodejs' (default)

// Opt out of caching for this route
export const fetchCache = 'force-no-store'

export default function Dashboard() {
  return <h1>Dashboard</h1>
}
```

## Summary

**Key Concepts**:

1. **File-based routing** - Folders and files define routes
2. **Layouts** - Shared UI that persists across routes
3. **Special files** - page, layout, loading, error, not-found
4. **Dynamic routes** - `[param]`, `[...slug]`, `[[...slug]]`
5. **Route groups** - `(name)` for organization without URL impact
6. **Parallel routes** - `@name` for simultaneous rendering
7. **Intercepting routes** - `(..)` for contextual UI
8. **generateStaticParams** - Pre-render dynamic routes
9. **Metadata** - SEO and social sharing
10. **Route config** - Control rendering and caching behavior

**Next**: Lecture 2 covers Server Components and data fetching patterns.
