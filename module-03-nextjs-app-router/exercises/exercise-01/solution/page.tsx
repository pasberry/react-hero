// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div className="p-6">
      <Header />
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Suspense fallback={<MetricsSkeleton />}>
          <Metrics />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <Chart />
        </Suspense>
      </div>
    </div>
  )
}

function Header() {
  return <h1 className="text-3xl font-bold">Dashboard</h1>
}

async function Metrics() {
  await new Promise(resolve => setTimeout(resolve, 500))
  const metrics = await fetchMetrics()
  
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2>Metrics</h2>
      <div className="text-4xl font-bold">{metrics.total}</div>
    </div>
  )
}

async function Chart() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const data = await fetchChartData()
  
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2>Chart</h2>
      {/* Render chart */}
    </div>
  )
}

function MetricsSkeleton() {
  return <div className="bg-gray-200 h-32 rounded animate-pulse" />
}

function ChartSkeleton() {
  return <div className="bg-gray-200 h-64 rounded animate-pulse" />
}
