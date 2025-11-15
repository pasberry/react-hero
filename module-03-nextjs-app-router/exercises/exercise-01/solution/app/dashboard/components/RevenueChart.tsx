import { fetchChartData } from '@/lib/data'
import { SimpleBarChart } from './SimpleBarChart'

/**
 * RevenueChart Server Component
 * Fetches and displays revenue data over time
 */
export async function RevenueChart() {
  const data = await fetchChartData()

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Revenue Over Time
      </h2>
      <SimpleBarChart data={data} />
    </div>
  )
}

/**
 * Skeleton component shown while RevenueChart is loading
 */
export function RevenueChartSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
      <div className="h-64 bg-gray-200 rounded" />
    </div>
  )
}
