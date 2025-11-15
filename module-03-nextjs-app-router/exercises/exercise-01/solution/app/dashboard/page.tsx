import { Suspense } from 'react'
import { MetricsCards, MetricsCardsSkeleton } from './components/MetricsCards'
import { RevenueChart, RevenueChartSkeleton } from './components/RevenueChart'
import { RecentOrders, RecentOrdersSkeleton } from './components/RecentOrders'

/**
 * Analytics Dashboard with Progressive Streaming
 *
 * This demonstrates Next.js App Router's streaming capabilities:
 * 1. Header renders immediately (no data fetching)
 * 2. Metrics cards stream in first (~500ms)
 * 3. Revenue chart streams in second (~1000ms)
 * 4. Orders table streams in last (~1500ms)
 *
 * Each component is wrapped in its own Suspense boundary,
 * allowing them to load independently and stream to the client
 * as soon as their data is ready.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Header - renders immediately (no Suspense needed) */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Real-time metrics and revenue tracking
        </p>
      </div>

      {/* Metrics Cards - streams in first (~500ms) */}
      <Suspense fallback={<MetricsCardsSkeleton />}>
        <MetricsCards />
      </Suspense>

      {/* Revenue Chart - streams in second (~1000ms) */}
      <div className="mt-6">
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChart />
        </Suspense>
      </div>

      {/* Recent Orders - streams in last (~1500ms) */}
      <div className="mt-6">
        <Suspense fallback={<RecentOrdersSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  )
}
