// Mock data fetching functions
// In a real app, these would fetch from a database or API

export interface Metrics {
  totalRevenue: number
  revenueGrowth: number
  totalCustomers: number
}

export interface ChartDataPoint {
  month: string
  revenue: number
}

export interface Order {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'completed' | 'cancelled'
  date: string
}

// TODO: Implement fetchMetrics with 500ms delay
export async function fetchMetrics(): Promise<Metrics> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    totalRevenue: 0,
    revenueGrowth: 0,
    totalCustomers: 0,
  }
}

// TODO: Implement fetchChartData with 1000ms delay
export async function fetchChartData(): Promise<ChartDataPoint[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return []
}

// TODO: Implement fetchOrders with 1500ms delay
export async function fetchOrders(): Promise<Order[]> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return []
}
