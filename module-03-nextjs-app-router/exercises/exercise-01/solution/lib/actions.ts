'use server'

import { revalidatePath } from 'next/cache'

/**
 * Server Actions for order management
 * These run on the server and can mutate data
 */

export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'completed' | 'cancelled'
) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 300))

  // In production, update database here
  console.log(`Updating order ${orderId} to ${status}`)

  // Revalidate the dashboard page to show updated data
  revalidatePath('/dashboard')

  return { success: true }
}

export async function deleteOrder(orderId: string) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 200))

  // In production, delete from database here
  console.log(`Deleting order ${orderId}`)

  // Revalidate the dashboard page
  revalidatePath('/dashboard')

  return { success: true }
}
