// TODO: Implement MetricsCards Server Component
// Should fetch metrics data and render three cards:
// 1. Total Revenue
// 2. Revenue Growth
// 3. Total Customers

export async function MetricsCards() {
  // TODO: Fetch metrics data with artificial delay (500ms)
  // TODO: Render metric cards with proper styling

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>TODO: Metric cards</div>
    </div>
  )
}

// TODO: Create MetricsCardsSkeleton component
export function MetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}
