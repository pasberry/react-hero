// Core task type
export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

// User type
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  compactView: boolean
}

// Task filter types
export type TaskFilter = 'all' | 'active' | 'completed'

// Toast notification type
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}
