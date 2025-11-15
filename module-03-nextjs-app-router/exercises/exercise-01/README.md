# Exercise 1: Analytics Dashboard with Streaming & Suspense

## 🎯 Goal

Build a production-ready analytics dashboard using Next.js App Router that demonstrates progressive streaming, parallel data fetching, Suspense boundaries, Server Components, and Server Actions for optimal perceived performance.

## 📚 Prerequisites

- Complete all 5 lectures in Module 3
- Next.js 14+ installed
- Understanding of React Suspense
- Familiarity with Server Components vs Client Components
- Basic SQL/database knowledge

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Master progressive streaming with Suspense boundaries
✅ Implement parallel data fetching with Promise.all
✅ Build Server Components for zero-bundle JavaScript
✅ Use Server Actions for data mutations
✅ Optimize perceived performance with streaming
✅ Handle loading and error states at granular levels

## 📝 Task Description

Build **"AnalyticsPro"** - a multi-tier analytics dashboard with the following features:

### Progressive Loading Architecture

```
┌─────────────────────────────────────────┐
│ Header (instant)                        │
├─────────────────────────────────────────┤
│ Metrics Cards (500ms delay)             │  ← Suspense Boundary 1
│ [Revenue] [Users] [Orders] [Conversion] │
├─────────────────────────────────────────┤
│ Chart (1000ms delay)                    │  ← Suspense Boundary 2
│ [Revenue Over Time Graph]               │
├─────────────────────────────────────────┤
│ Recent Orders Table (1500ms delay)      │  ← Suspense Boundary 3
│ [Order #1] [Order #2] [Order #3]        │
└─────────────────────────────────────────┘
```

### Core Features

1. **Streaming with Suspense**
   - Header loads instantly (static)
   - Metrics stream in parallel after 500ms
   - Chart streams independently after 1s
   - Table streams last after 1.5s
   - Independent error boundaries for each section

2. **Server Components**
   - All data fetching in Server Components
   - Zero JavaScript shipped for static parts
   - Direct database access (no API routes needed)
   - Automatic code splitting

3. **Server Actions**
   - Add new order via Server Action
   - Optimistic UI updates
   - Revalidation after mutations
   - Error handling with useFormState

4. **Performance Optimizations**
   - Parallel data fetching
   - Streaming responses
   - Static shell rendering
   - Dynamic imports for client components

## 🏗️ Starter Code

See [./starter](./starter) for:
- `app/dashboard/page.tsx` - Main dashboard page
- `app/dashboard/loading.tsx` - Loading UI
- `app/dashboard/error.tsx` - Error boundary
- `components/` - Reusable components
- `lib/data.ts` - Database queries
- `lib/actions.ts` - Server Actions

## ✅ Acceptance Criteria

### 1. Progressive Streaming Setup

**app/dashboard/page.tsx**:
```typescript
import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { MetricsCards } from '@/components/MetricsCards'
import { RevenueChart } from '@/components/RevenueChart'
import { RecentOrders } from '@/components/RecentOrders'
import {
  MetricsCardsSkeleton,
  RevenueChartSkeleton,
  RecentOrdersSkeleton
} from '@/components/Skeletons'

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Loads instantly - no Suspense needed */}
      <Header title="Analytics Dashboard" />

      {/* Metrics stream in first (500ms) */}
      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards />
      </Suspense>

      {/* Chart streams in second (1000ms) */}
      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueChart />
      </Suspense>

      {/* Table streams in last (1500ms) */}
      <Suspense fallback={<RecentOrdersSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}
```

### 2. Server Component Data Fetching

**components/MetricsCards.tsx**:
```typescript
import { fetchMetrics } from '@/lib/data'

export async function MetricsCards() {
  // Simulated delay - in production, this would be actual DB query
  await new Promise(resolve => setTimeout(resolve, 500))

  const metrics = await fetchMetrics()

  return (
    <div className="grid grid-cols-4 gap-4 my-6">
      <MetricCard
        title="Revenue"
        value={formatCurrency(metrics.revenue)}
        change={metrics.revenueChange}
      />
      <MetricCard
        title="Users"
        value={formatNumber(metrics.users)}
        change={metrics.usersChange}
      />
      <MetricCard
        title="Orders"
        value={formatNumber(metrics.orders)}
        change={metrics.ordersChange}
      />
      <MetricCard
        title="Conversion"
        value={formatPercent(metrics.conversion)}
        change={metrics.conversionChange}
      />
    </div>
  )
}

function MetricCard({ title, value, change }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-gray-500 text-sm">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last month
      </p>
    </div>
  )
}
```

**lib/data.ts**:
```typescript
import { sql } from '@vercel/postgres'

export async function fetchMetrics() {
  try {
    const data = await sql`
      SELECT
        SUM(total) as revenue,
        COUNT(DISTINCT user_id) as users,
        COUNT(*) as orders,
        (COUNT(*) * 100.0 / NULLIF(COUNT(DISTINCT user_id), 0)) as conversion
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `

    return {
      revenue: data.rows[0].revenue,
      users: data.rows[0].users,
      orders: data.rows[0].orders,
      conversion: data.rows[0].conversion,
      revenueChange: 12.5,  // Would calculate from previous period
      usersChange: 8.2,
      ordersChange: -3.1,
      conversionChange: 5.7
    }
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    throw new Error('Failed to fetch metrics')
  }
}

export async function fetchRevenueData() {
  await new Promise(resolve => setTimeout(resolve, 1000))

  const data = await sql`
    SELECT
      DATE(created_at) as date,
      SUM(total) as revenue
    FROM orders
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `

  return data.rows
}

export async function fetchRecentOrders() {
  await new Promise(resolve => setTimeout(resolve, 1500))

  const data = await sql`
    SELECT
      orders.id,
      orders.total,
      orders.status,
      orders.created_at,
      users.name as customer_name
    FROM orders
    JOIN users ON orders.user_id = users.id
    ORDER BY orders.created_at DESC
    LIMIT 10
  `

  return data.rows
}
```

### 3. Parallel Data Fetching

**Alternative: Fetch all data in parallel**:
```typescript
// Instead of sequential Suspense boundaries, fetch in parallel
export default async function DashboardPage() {
  // All promises start immediately
  const metricsPromise = fetchMetrics()
  const revenueDataPromise = fetchRevenueData()
  const ordersPromise = fetchRecentOrders()

  return (
    <div className="p-8">
      <Header title="Analytics Dashboard" />

      {/* Each resolves independently */}
      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards promise={metricsPromise} />
      </Suspense>

      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueChart promise={revenueDataPromise} />
      </Suspense>

      <Suspense fallback={<RecentOrdersSkeleton />}>
        <RecentOrders promise={ordersPromise} />
      </Suspense>
    </div>
  )
}

// Component awaits passed promise
async function MetricsCards({ promise }: { promise: Promise<Metrics> }) {
  const metrics = await promise
  // ... render
}
```

### 4. Server Actions for Mutations

**lib/actions.ts**:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@vercel/postgres'
import { z } from 'zod'

const OrderSchema = z.object({
  userId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })),
  total: z.number().positive()
})

export async function createOrder(prevState: any, formData: FormData) {
  // Validate input
  const validatedFields = OrderSchema.safeParse({
    userId: formData.get('userId'),
    items: JSON.parse(formData.get('items') as string),
    total: Number(formData.get('total'))
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields. Failed to create order.'
    }
  }

  const { userId, items, total } = validatedFields.data

  try {
    // Insert order
    await sql`
      INSERT INTO orders (user_id, total, status, created_at)
      VALUES (${userId}, ${total}, 'pending', NOW())
    `

    // Revalidate dashboard to show new data
    revalidatePath('/dashboard')

    return { message: 'Order created successfully' }
  } catch (error) {
    console.error('Failed to create order:', error)
    return { message: 'Database error: Failed to create order.' }
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await sql`
      UPDATE orders
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${orderId}
    `

    revalidatePath('/dashboard')
    return { message: 'Order updated successfully' }
  } catch (error) {
    return { message: 'Failed to update order' }
  }
}
```

**components/AddOrderForm.tsx** (Client Component):
```typescript
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createOrder } from '@/lib/actions'

export function AddOrderForm() {
  const [state, formAction] = useFormState(createOrder, null)

  return (
    <form action={formAction} className="space-y-4">
      <input name="userId" type="hidden" value="user-123" />
      <input name="items" type="hidden" value='[{"productId":"prod-1","quantity":2}]' />

      <div>
        <label htmlFor="total">Total Amount</label>
        <input
          id="total"
          name="total"
          type="number"
          step="0.01"
          required
          className="border rounded px-3 py-2"
        />
        {state?.errors?.total && (
          <p className="text-red-500 text-sm">{state.errors.total}</p>
        )}
      </div>

      <SubmitButton />

      {state?.message && (
        <p className={state.errors ? 'text-red-500' : 'text-green-500'}>
          {state.message}
        </p>
      )}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      {pending ? 'Creating...' : 'Create Order'}
    </button>
  )
}
```

### 5. Error Handling

**app/dashboard/error.tsx**:
```typescript
'use client'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Try again
      </button>
    </div>
  )
}
```

**components/MetricsCards.tsx** (with error boundary):
```typescript
import { ErrorBoundary } from 'react-error-boundary'

export function MetricsSection() {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 p-4 rounded">
          Failed to load metrics. Please try again.
        </div>
      }
    >
      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## 🚀 Getting Started

### Step 1: Setup

```bash
cd starter
npm install
npm run db:setup  # Setup Postgres database
npm run db:seed   # Seed with sample data
npm run dev
```

### Step 2: Implementation Timeline

1. **Day 1**: Basic page layout + Suspense boundaries
2. **Day 2**: Server Components with data fetching
3. **Day 3**: Server Actions for mutations
4. **Day 4**: Error handling + optimizations

### Step 3: Test Streaming

```bash
# Open DevTools Network tab
# Visit http://localhost:3000/dashboard

# Expected behavior:
# 1. Header appears immediately
# 2. Metrics cards stream in after 500ms
# 3. Chart streams in after 1s
# 4. Table streams in after 1.5s

# Each section loads independently
```

## 💡 Hints

### Streaming Performance Tips

1. **Start fetches early**:
```typescript
// ❌ Sequential - slow
const metrics = await fetchMetrics()
const revenue = await fetchRevenueData()

// ✅ Parallel - fast
const [metrics, revenue] = await Promise.all([
  fetchMetrics(),
  fetchRevenueData()
])
```

2. **Use loading.tsx for route-level loading**:
```typescript
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />
}
```

3. **Optimize Suspense boundaries**:
```typescript
// ❌ One boundary for everything - slow perceived performance
<Suspense fallback={<FullPageSkeleton />}>
  <Everything />
</Suspense>

// ✅ Granular boundaries - fast perceived performance
<>
  <Suspense fallback={<MetricsSkeleton />}><Metrics /></Suspense>
  <Suspense fallback={<ChartSkeleton />}><Chart /></Suspense>
</>
```

4. **Prefetch data in layout**:
```typescript
// app/dashboard/layout.tsx
export default async function Layout({ children }) {
  // Start fetching early
  const userPromise = fetchUser()

  return (
    <div>
      <Suspense fallback={<UserSkeleton />}>
        <UserNav promise={userPromise} />
      </Suspense>
      {children}
    </div>
  )
}
```

## 🎯 Stretch Goals

1. **Real-time Updates**
   - Integrate React Server Components with WebSockets
   - Auto-refresh data every 30 seconds
   - Show "New data available" banner

2. **Advanced Filtering**
   - Date range selector (last 7/30/90 days)
   - Use searchParams for filter state
   - Maintain filters in URL

3. **Export Functionality**
   - Server Action to generate CSV
   - Stream large exports
   - Download progress indicator

4. **Optimistic UI**
   - Instant order creation feedback
   - Revert on error
   - Show pending state

5. **Partial Prerendering**
   - Static shell with dynamic data
   - Use `loading.tsx` strategically
   - Optimize TTFB

## 📖 Reference Solution

See [./solution](./solution) for complete implementation with:
- All Suspense boundaries configured
- Server Components for data fetching
- Server Actions for mutations
- Error boundaries at each level
- Loading skeletons
- Optimistic updates
- Comprehensive tests

## 🔍 Debugging Tips

### Common Issues

1. **Data not streaming**:
   - Check: Are you using `async` Server Components?
   - Check: Is `Suspense` wrapping the component?
   - Solution: Ensure components are `async` and wrapped in `<Suspense>`

2. **Client boundary error**:
   - Check: Are you using hooks in Server Component?
   - Solution: Mark with `'use client'` directive

3. **Actions not revalidating**:
   - Check: Did you call `revalidatePath()` after mutation?
   - Solution: Add `revalidatePath('/dashboard')` in Server Action

4. **Data shows stale after mutation**:
   - Check: Is caching enabled?
   - Solution: Use `{ cache: 'no-store' }` or revalidate

## ⏱️ Time Estimate

- **Setup + basic streaming**: 1-2 hours
- **Server Components + data fetching**: 1-2 hours
- **Server Actions**: 1 hour
- **Error handling + polish**: 1 hour

**Total**: 4-6 hours

## 🎓 What You'll Learn

- **Progressive streaming**: How to optimize perceived performance
- **Suspense boundaries**: Granular loading states
- **Server Components**: Zero-bundle data fetching
- **Server Actions**: Type-safe mutations without API routes
- **Parallel fetching**: Waterfall elimination
- **Error boundaries**: Graceful failure handling

### Real-World Applications

✅ Analytics dashboards
✅ E-commerce admin panels
✅ Social media feeds
✅ Content management systems
✅ Data-heavy applications

---

**Next**: After completing this exercise, move on to [Module 4: TypeScript Architecture](../../module-04-typescript-architecture) to learn advanced typing patterns.

## 📚 Additional Resources

- [Next.js Streaming Documentation](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/forms-and-mutations)
- [Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
