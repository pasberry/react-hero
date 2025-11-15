import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      {/* TODO: Add Suspense boundary for Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">Metric Card 1</div>
        <div className="bg-white p-6 rounded-lg shadow">Metric Card 2</div>
        <div className="bg-white p-6 rounded-lg shadow">Metric Card 3</div>
      </div>

      {/* TODO: Add Suspense boundary for Chart */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Chart</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          Chart placeholder
        </div>
      </div>

      {/* TODO: Add Suspense boundary for Orders Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <div className="text-gray-400">Orders table placeholder</div>
      </div>
    </div>
  )
}
