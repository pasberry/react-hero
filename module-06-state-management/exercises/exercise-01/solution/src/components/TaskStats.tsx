import { useTaskStats } from '../hooks/useStore'

export function TaskStats() {
  const { total, completed, active, highPriority } = useTaskStats()

  const stats = [
    { label: 'Total Tasks', value: total, color: 'text-blue-600' },
    { label: 'Active', value: active, color: 'text-purple-600' },
    { label: 'Completed', value: completed, color: 'text-green-600' },
    { label: 'High Priority', value: highPriority, color: 'text-red-600' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-lg p-4 shadow">
          <p className="text-sm font-medium text-gray-600">{stat.label}</p>
          <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
