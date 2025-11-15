# Lecture 2: Server Components Mastery

## Introduction

React Server Components (RSC) fundamentally change how we think about building React applications. This lecture covers when and how to use Server vs Client Components effectively.

## Server vs Client Components Decision Matrix

### Use Server Components When:
- ✅ Fetching data
- ✅ Accessing backend resources (database, filesystem)
- ✅ Keeping sensitive information on server (API keys, tokens)
- ✅ Reducing client bundle size (large dependencies)
- ✅ Rendering static content

### Use Client Components When:
- ✅ Need interactivity (onClick, onChange, etc.)
- ✅ Using state (useState, useReducer)
- ✅ Using effects (useEffect, useLayoutEffect)
- ✅ Using browser APIs (localStorage, window, etc.)
- ✅ Using custom hooks that depend on state/effects
- ✅ Using React Class Components

## Data Fetching Patterns

### Pattern 1: Parallel Data Fetching

```typescript
// app/dashboard/page.tsx
async function Dashboard() {
  // All three fetch in parallel!
  const userPromise = db.user.findUnique({ where: { id: 1 } })
  const postsPromise = db.post.findMany({ take: 10 })
  const statsPromise = getAnalytics()

  // Wait for all
  const [user, posts, stats] = await Promise.all([
    userPromise,
    postsPromise,
    statsPromise,
  ])

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <Analytics stats={stats} />
    </div>
  )
}
```

### Pattern 2: Sequential When Dependencies Exist

```typescript
async function UserPosts({ userId }: { userId: string }) {
  // Must fetch user first
  const user = await db.user.findUnique({ where: { id: userId } })

  // Then fetch their posts using user data
  const posts = await db.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return <PostList posts={posts} author={user} />
}
```

### Pattern 3: Component-Level Data Fetching

```typescript
// Each component fetches its own data
async function Page() {
  return (
    <>
      <Header />
      <Sidebar />
      <MainContent />
    </>
  )
}

async function Header() {
  const user = await getCurrentUser()
  return <nav>Welcome {user.name}</nav>
}

async function Sidebar() {
  const notifications = await getNotifications()
  return <aside>{notifications.map(n => <Notification key={n.id} {...n} />)}</aside>
}

async function MainContent() {
  const posts = await getPosts()
  return <main>{posts.map(p => <Post key={p.id} {...p} />)}</main>
}

// React automatically fetches all three in parallel!
```

### Pattern 4: Streaming with Suspense

```typescript
async function Page() {
  return (
    <>
      <Header /> {/* Fast - renders immediately */}
      <Suspense fallback={<PostsSkeleton />}>
        <Posts /> {/* Slow - streams when ready */}
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* Slower - streams after Posts */}
      </Suspense>
    </>
  )
}

async function Posts() {
  const posts = await db.post.findMany() // Takes 500ms
  return <PostList posts={posts} />
}

async function Comments() {
  const comments = await db.comment.findMany() // Takes 1000ms
  return <CommentList comments={comments} />
}
```

**Timeline**:
- 0ms: Header renders, skeletons show
- 500ms: Posts stream in, replace skeleton
- 1000ms: Comments stream in, replace skeleton

## Composition Patterns

### Pattern 1: Server Component with Client Children

```typescript
// app/dashboard/page.tsx (Server Component)
import { ClientSidebar } from './ClientSidebar'

export default async function Dashboard() {
  const data = await fetchData()

  return (
    <div>
      <ServerHeader data={data} />
      <ClientSidebar /> {/* Client Component */}
      <ServerContent data={data} />
    </div>
  )
}
```

### Pattern 2: Passing Server Components as Props

```typescript
// Server Component
export default async function Page() {
  return (
    <ClientWrapper>
      <ServerChild /> {/* Passed as children */}
    </ClientWrapper>
  )
}

// Client Component
'use client'
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children}
    </div>
  )
}

async function ServerChild() {
  const data = await fetchData()
  return <div>{data.title}</div>
}
```

### Pattern 3: Shared Components

```typescript
// components/shared/Button.tsx
// No 'use client' - can be used in both Server and Client
export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>
}

// Server Component can use it
async function ServerPage() {
  return <Button>Click me</Button>
}

// Client Component can use it
'use client'
function ClientPage() {
  return <Button onClick={() => alert('clicked')}>Click me</Button>
}
```

## Error Handling

### Error Boundaries

```typescript
// app/dashboard/error.tsx
'use client' // Error boundaries must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to service
    console.error(error)
  }, [error])

  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Nested Error Boundaries

```typescript
app/
├── error.tsx              # Catches errors in entire app
└── dashboard/
    ├── error.tsx          # Catches errors in dashboard
    └── settings/
        └── error.tsx      # Catches errors in settings
```

### Try-Catch in Server Components

```typescript
async function Page() {
  try {
    const data = await fetchData()
    return <Content data={data} />
  } catch (error) {
    return <ErrorMessage error={error} />
  }
}
```

## Loading States

### loading.tsx

```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />
}

// Automatically wraps page in Suspense:
<Suspense fallback={<Loading />}>
  <Page />
</Suspense>
```

### Nested Loading States

```typescript
app/
├── loading.tsx            # Root loading
└── dashboard/
    ├── loading.tsx        # Dashboard loading
    └── analytics/
        └── loading.tsx    # Analytics loading
```

### Manual Suspense Boundaries

```typescript
export default function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <AnotherSlowComponent />
      </Suspense>
    </>
  )
}
```

## Data Caching

### Request Memoization

```typescript
// Next.js automatically deduplicates requests
async function Page() {
  return (
    <>
      <Header />
      <Sidebar />
    </>
  )
}

async function Header() {
  const user = await getUser(1) // Request 1
  return <div>{user.name}</div>
}

async function Sidebar() {
  const user = await getUser(1) // Same request - cached!
  return <div>{user.avatar}</div>
}

// Only ONE database query executes
```

### Route Cache

```typescript
// app/posts/page.tsx
export const revalidate = 3600 // Revalidate every hour

async function PostsPage() {
  const posts = await db.post.findMany()
  return <PostList posts={posts} />
}
```

### Data Cache

```typescript
// Cached by default
const data = await fetch('https://api.example.com/data')

// Opt out of caching
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
})

// Revalidate after time
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }
})
```

## Advanced Patterns

### Preloading Data

```typescript
// lib/data.ts
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})

// app/users/[id]/page.tsx
async function UserPage({ params }: { params: { id: string } }) {
  // Start fetching early
  const userPromise = getUser(params.id)

  return (
    <>
      <UserHeader userPromise={userPromise} />
      <UserPosts userId={params.id} />
    </>
  )
}

async function UserHeader({ userPromise }: { userPromise: Promise<User> }) {
  const user = await userPromise
  return <h1>{user.name}</h1>
}
```

### Conditional Rendering

```typescript
async function Page({ searchParams }: { searchParams: { show?: string } }) {
  const showAnalytics = searchParams.show === 'analytics'

  return (
    <>
      <Header />
      {showAnalytics && (
        <Suspense fallback={<AnalyticsSkeleton />}>
          <Analytics />
        </Suspense>
      )}
      <MainContent />
    </>
  )
}
```

## Performance Considerations

### Bundle Size Impact

```typescript
// ❌ Bad: Large library included in client bundle
'use client'
import { HeavyChartLibrary } from 'heavy-charts' // 200kb

export function Chart({ data }) {
  return <HeavyChartLibrary data={data} />
}

// ✅ Good: Library stays on server
import { HeavyChartLibrary } from 'heavy-charts' // 0kb to client!

export async function Chart() {
  const data = await getData()
  return <HeavyChartLibrary data={data} />
}
```

### Waterfall Elimination

```typescript
// ❌ Bad: Sequential waterfalls
async function Page() {
  const user = await getUser()              // 100ms
  const posts = await getPosts(user.id)     // +150ms
  const comments = await getComments()      // +200ms
  // Total: 450ms
}

// ✅ Good: Parallel fetching
async function Page() {
  const [user, comments] = await Promise.all([
    getUser(),          // 100ms
    getComments(),      // 200ms
  ])
  const posts = await getPosts(user.id)  // +150ms
  // Total: 250ms (saved 200ms!)
}
```

## Summary

**Key Patterns**:

1. **Server Components by default** - Only use 'use client' when needed
2. **Parallel data fetching** - Use Promise.all when possible
3. **Component-level fetching** - React parallelizes automatically
4. **Streaming with Suspense** - Progressive rendering
5. **Composition over props** - Pass Server Components as children
6. **Error boundaries** - Isolate errors
7. **Loading states** - Better UX during data fetching

**Next**: Lecture 3 covers Server Actions for mutations.
