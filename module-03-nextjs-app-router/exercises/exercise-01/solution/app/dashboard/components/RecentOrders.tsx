import { fetchOrders } from '@/lib/data'
import { OrdersTable } from './OrdersTable'

/**
 * RecentOrders Server Component
 * Fetches and displays recent orders with actions
 */
export async function RecentOrders() {
  const orders = await fetchOrders()

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Orders</h2>
      <OrdersTable initialOrders={orders} />
    </div>
  )
}

/**
 * Skeleton component shown while RecentOrders is loading
 */
export function RecentOrdersSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  )
}
