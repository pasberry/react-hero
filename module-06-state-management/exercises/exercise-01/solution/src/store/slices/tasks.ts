import { StateCreator } from 'zustand'
import { Task, TaskFilter } from '../../types'
import { Store } from '../index'

export interface TasksSlice {
  tasks: Task[]
  filter: TaskFilter
  searchQuery: string
  isLoading: boolean
  error: string | null

  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTask: (id: string) => void
  bulkComplete: () => void
  deleteCompleted: () => void
  setFilter: (filter: TaskFilter) => void
  setSearchQuery: (query: string) => void

  // Async actions
  fetchTasks: () => Promise<void>
  syncTasks: () => Promise<void>

  // Selectors
  getFilteredTasks: () => Task[]
  getTasksByPriority: (priority: Task['priority']) => Task[]
  getCompletedCount: () => number
}

export const createTasksSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  TasksSlice
> = (set, get) => ({
  tasks: [],
  filter: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,

  addTask: (taskData) => {
    const task: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    set((state) => {
      state.tasks.push(task)
    }, false, 'tasks/addTask')

    // Optimistic update - sync to server in background
    get().syncTasks()

    // Show success toast
    get().addToast({
      message: 'Task created successfully',
      type: 'success',
    })
  },

  updateTask: (id, updates) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === id)
      if (task) {
        Object.assign(task, { ...updates, updatedAt: new Date() })
      }
    }, false, 'tasks/updateTask')

    get().syncTasks()

    get().addToast({
      message: 'Task updated',
      type: 'success',
    })
  },

  deleteTask: (id) => {
    set((state) => {
      state.tasks = state.tasks.filter((t) => t.id !== id)
    }, false, 'tasks/deleteTask')

    get().syncTasks()

    get().addToast({
      message: 'Task deleted',
      type: 'info',
    })
  },

  toggleTask: (id) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === id)
      if (task) {
        task.status = task.status === 'done' ? 'todo' : 'done'
        task.updatedAt = new Date()
      }
    }, false, 'tasks/toggleTask')

    get().syncTasks()
  },

  bulkComplete: () => {
    set((state) => {
      state.tasks.forEach((task) => {
        if (task.status !== 'done') {
          task.status = 'done'
          task.updatedAt = new Date()
        }
      })
    }, false, 'tasks/bulkComplete')

    get().syncTasks()

    get().addToast({
      message: 'All tasks marked as complete',
      type: 'success',
    })
  },

  deleteCompleted: () => {
    const completedCount = get().tasks.filter((t) => t.status === 'done').length

    set((state) => {
      state.tasks = state.tasks.filter((t) => t.status !== 'done')
    }, false, 'tasks/deleteCompleted')

    get().syncTasks()

    get().addToast({
      message: `${completedCount} completed tasks deleted`,
      type: 'info',
    })
  },

  setFilter: (filter) => {
    set({ filter }, false, 'tasks/setFilter')
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery }, false, 'tasks/setSearchQuery')
  },

  fetchTasks: async () => {
    set({ isLoading: true, error: null }, false, 'tasks/fetchTasks/pending')

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // In real app: const response = await fetch('/api/tasks')
      // const tasks = await response.json()

      const tasks: Task[] = [
        {
          id: '1',
          title: 'Complete project proposal',
          description: 'Draft the Q4 project proposal document',
          status: 'in_progress',
          priority: 'high',
          dueDate: new Date('2024-03-15'),
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-10'),
        },
        {
          id: '2',
          title: 'Review pull requests',
          description: 'Review and merge pending PRs',
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          createdAt: new Date('2024-03-08'),
          updatedAt: new Date('2024-03-08'),
        },
      ]

      set({ tasks, isLoading: false }, false, 'tasks/fetchTasks/fulfilled')
    } catch (error) {
      set(
        {
          error: error instanceof Error ? error.message : 'Failed to fetch tasks',
          isLoading: false,
        },
        false,
        'tasks/fetchTasks/rejected'
      )

      get().addToast({
        message: 'Failed to load tasks',
        type: 'error',
      })
    }
  },

  syncTasks: async () => {
    const { tasks } = get()

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100))

      // In real app:
      // await fetch('/api/tasks', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(tasks),
      // })

      console.log('Tasks synced to server:', tasks.length)
    } catch (error) {
      console.error('Failed to sync tasks:', error)
      // Don't show error toast for background sync failures
    }
  },

  // Memoized selectors
  getFilteredTasks: () => {
    const { tasks, filter, searchQuery } = get()

    let filtered = tasks

    // Apply filter
    if (filter === 'active') {
      filtered = filtered.filter((t) => t.status !== 'done')
    } else if (filter === 'completed') {
      filtered = filtered.filter((t) => t.status === 'done')
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      )
    }

    return filtered
  },

  getTasksByPriority: (priority) => {
    return get().tasks.filter((t) => t.priority === priority)
  },

  getCompletedCount: () => {
    return get().tasks.filter((t) => t.status === 'done').length
  },
})
