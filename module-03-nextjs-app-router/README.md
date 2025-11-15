# Module 3: Next.js App Router + Server Components (Advanced)

## 🎯 Module Overview

Master Next.js 14+ App Router, React Server Components, Server Actions, and advanced data fetching patterns. Build production-ready apps with optimal performance.

### Learning Objectives

✅ Architect apps with Server and Client Components
✅ Master streaming, Suspense, and loading states
✅ Implement Server Actions for mutations
✅ Understand the Flight Protocol internals
✅ Build with advanced caching strategies

### Time Estimate: 10-14 hours

---

## 📚 Key Lectures

### 1. App Router Architecture Deep Dive
- File-based routing with layouts
- Parallel routes and intercepting routes
- Route groups and organization
- Dynamic routes with params

### 2. Server Components Mastery
- When to use Server vs Client Components
- Data fetching patterns
- Streaming with Suspense
- Error boundaries and loading states

### 3. Server Actions
- Type-safe mutations
- Form handling with progressive enhancement
- Revalidation strategies
- Optimistic updates

### 4. Advanced Data Patterns
- Parallel data fetching
- Waterfall elimination
- Request deduplication
- Partial prerendering

### 5. Caching Strategies
- Request-level caching (`fetch` cache)
- Route-level caching (ISR)
- Data cache with `cache()`
- Client-side router cache

---

## 🛠️ Exercises

### Exercise 1: Multi-Tier Dashboard with Streaming

Build a dashboard that streams data progressively:

```tsx
// app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <>
      <DashboardHeader />  {/* Fast */}
      <Suspense fallback={<MetricsSkeleton />}>
        <Metrics />  {/* Slow - streams in */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <Chart />  {/* Slower - streams after metrics */}
      </Suspense>
    </>
  );
}
```

**Time**: 3-4 hours

---

### Exercise 2: Infinite Scroll Feed with RSC

Build infinite scroll using Server Components:

- Server components render posts
- Client component handles scroll detection
- Server Action loads more posts
- Optimistic updates for likes/comments

**Time**: 3-4 hours

---

### Exercise 3: E-commerce Product Page

Complete product page with:
- RSC for product data
- Client components for cart interaction
- Server Actions for add-to-cart
- ISR for product caching

**Time**: 4-5 hours

---

## 🎯 Projects

### Project: Full-Stack Blog Platform

Build a complete blog with:
- Server Components for posts
- MDX rendering (server-side)
- Comments (Client Component + Server Action)
- Admin dashboard
- SEO optimization
- ISR with on-demand revalidation

---

## 📈 Key Patterns

### Pattern 1: Parallel Data Fetching

```tsx
async function Page() {
  // All fetch in parallel automatically!
  const userPromise = getUser();
  const postsPromise = getPosts();
  const commentsPromise = getComments();

  const [user, posts, comments] = await Promise.all([
    userPromise,
    postsPromise,
    commentsPromise,
  ]);

  return <Dashboard user={user} posts={posts} comments={comments} />;
}
```

### Pattern 2: Streaming with Suspense Boundaries

```tsx
export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <AnotherSlowComponent />
      </Suspense>
    </div>
  );
}
```

### Pattern 3: Server Actions with Optimistic Updates

```tsx
'use client';
import { useOptimistic } from 'react';
import { likePost } from './actions';

export function LikeButton({ postId, initialLikes }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    initialLikes,
    (state, amount) => state + amount
  );

  return (
    <button
      onClick={async () => {
        addOptimisticLike(1);  // Instant UI update
        await likePost(postId);  // Server action
      }}
    >
      ❤️ {optimisticLikes}
    </button>
  );
}
```

---

## 🔜 Next: [Module 4: Vercel Deployment Mastery](../module-04-vercel-deployment)
