'use client'

import { useOptimistic } from 'react'
import { Order } from '@/lib/data'
import { updateOrderStatus, deleteOrder } from '@/lib/actions'

interface OrdersTableProps {
  initialOrders: Order[]
}

/**
 * OrdersTable Client Component
 * Uses useOptimistic for instant UI updates while actions are processing
 */
export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const [optimisticOrders, setOptimisticOrders] = useOptimistic(
    initialOrders,
    (state, action: { type: 'update' | 'delete'; orderId: string; status?: Order['status'] }) => {
      if (action.type === 'delete') {
        return state.filter((order) => order.id !== action.orderId)
      }
      return state.map((order) =>
        order.id === action.orderId && action.status
          ? { ...order, status: action.status }
          : order
      )
    }
  )

  async function handleStatusChange(orderId: string, status: Order['status']) {
    setOptimisticOrders({ type: 'update', orderId, status })
    await updateOrderStatus(orderId, status)
  }

  async function handleDelete(orderId: string) {
    setOptimisticOrders({ type: 'delete', orderId })
    await deleteOrder(orderId)
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {optimisticOrders.map((order) => (
            <tr key={order.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.customer}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${order.amount.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    statusColors[order.status]
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {order.date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(order.id, 'completed')}
                    className="text-green-600 hover:text-green-900"
                  >
                    Complete
                  </button>
                )}
                <button
                  onClick={() => handleDelete(order.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {optimisticOrders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No orders found
        </div>
      )}
    </div>
  )
}
