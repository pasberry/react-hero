// Mock data fetching functions
// In production, these would fetch from a database or API

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

/**
 * Fetch metrics data
 * Simulates 500ms API delay
 */
export async function fetchMetrics(): Promise<Metrics> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return {
    totalRevenue: 284520,
    revenueGrowth: 12.5,
    totalCustomers: 1843,
  }
}

/**
 * Fetch chart data
 * Simulates 1000ms API delay
 */
export async function fetchChartData(): Promise<ChartDataPoint[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return [
    { month: 'Jan', revenue: 45230 },
    { month: 'Feb', revenue: 52180 },
    { month: 'Mar', revenue: 48920 },
    { month: 'Apr', revenue: 61450 },
    { month: 'May', revenue: 55320 },
    { month: 'Jun', revenue: 71840 },
    { month: 'Jul', revenue: 68290 },
    { month: 'Aug', revenue: 76520 },
    { month: 'Sep', revenue: 82410 },
    { month: 'Oct', revenue: 79340 },
    { month: 'Nov', revenue: 88920 },
    { month: 'Dec', revenue: 95430 },
  ]
}

/**
 * Fetch recent orders
 * Simulates 1500ms API delay
 */
export async function fetchOrders(): Promise<Order[]> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  return [
    {
      id: 'ORD-001',
      customer: 'John Doe',
      amount: 1250.0,
      status: 'completed',
      date: '2024-03-15',
    },
    {
      id: 'ORD-002',
      customer: 'Jane Smith',
      amount: 890.5,
      status: 'pending',
      date: '2024-03-14',
    },
    {
      id: 'ORD-003',
      customer: 'Bob Johnson',
      amount: 2100.0,
      status: 'completed',
      date: '2024-03-14',
    },
    {
      id: 'ORD-004',
      customer: 'Alice Williams',
      amount: 450.75,
      status: 'pending',
      date: '2024-03-13',
    },
    {
      id: 'ORD-005',
      customer: 'Charlie Brown',
      amount: 3200.0,
      status: 'completed',
      date: '2024-03-13',
    },
    {
      id: 'ORD-006',
      customer: 'Diana Prince',
      amount: 675.25,
      status: 'cancelled',
      date: '2024-03-12',
    },
  ]
}
