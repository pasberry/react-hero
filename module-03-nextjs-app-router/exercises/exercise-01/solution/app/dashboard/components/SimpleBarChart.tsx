'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartDataPoint } from '@/lib/data'

interface SimpleBarChartProps {
  data: ChartDataPoint[]
}

/**
 * Client Component for rendering the chart
 * Uses recharts library for visualization
 */
export function SimpleBarChart({ data }: SimpleBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="revenue" fill="#3B82F6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
