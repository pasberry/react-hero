# Exercise 1: Production Zustand Store Architecture

## 🎯 Goal

Build a production-grade task management application using Zustand with advanced patterns including slices, middleware, persistence, devtools integration, and optimistic updates.

## 📚 Prerequisites

- Complete all 5 lectures in Module 6
- Understanding of TypeScript generics
- Familiarity with React hooks
- Basic knowledge of local storage APIs

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Structure Zustand stores using the slice pattern
✅ Implement middleware (persist, devtools, immer)
✅ Handle async actions with proper loading/error states
✅ Optimize re-renders with selective subscriptions
✅ Implement optimistic updates for better UX
✅ Write testable store logic

## 📝 Task Description

Build **"TaskMaster"** - a task management app with the following Zustand store features:

### Core Store Slices

1. **Tasks Slice**
   - CRUD operations for tasks
   - Filter by status (all, active, completed)
   - Search tasks
   - Bulk operations (mark all complete, delete all completed)

2. **User Slice**
   - User authentication state
   - Preferences (theme, notifications)
   - Profile management

3. **UI Slice**
   - Modal states
   - Loading indicators
   - Toast notifications
   - Sidebar collapsed/expanded

### Advanced Features

- **Persistence**: Auto-save to localStorage
- **Devtools**: Redux DevTools integration
- **Optimistic Updates**: Instant UI feedback
- **Middleware**: Logging, persistence, immer
- **Selectors**: Memoized derived state

## 🏗️ Starter Code

See [./starter](./starter) for:
- `store/` - Store slices and configuration
- `hooks/` - Custom hooks for store access
- `components/` - UI components
- `types.ts` - TypeScript interfaces

## ✅ Acceptance Criteria

### 1. Store Architecture

**store/index.ts**:
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createTasksSlice } from './slices/tasks'
import { createUserSlice } from './slices/user'
import { createUISlice } from './slices/ui'

export const useStore = create<Store>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...createTasksSlice(set, get),
        ...createUserSlice(set, get),
        ...createUISlice(set, get)
      })),
      {
        name: 'taskmaster-storage',
        partialize: (state) => ({
          tasks: state.tasks,
          user: state.user
        })
      }
    )
  )
)
```

### 2. Tasks Slice Implementation

**store/slices/tasks.ts**:
```typescript
import { StateCreator } from 'zustand'

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

export interface TasksSlice {
  tasks: Task[]
  filter: 'all' | 'active' | 'completed'
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
  setFilter: (filter: TasksSlice['filter']) => void
  setSearchQuery: (query: string) => void

  // Async actions
  fetchTasks: () => Promise<void>
  syncTasks: () => Promise<void>

  // Selectors
  getFilteredTasks: () => Task[]
  getTasksByPriority: (priority: Task['priority']) => Task[]
  getCompletedCount: () => number
}

export const createTasksSlice: StateCreator<Store, [], [], TasksSlice> = (set, get) => ({
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
      updatedAt: new Date()
    }

    set((state) => {
      state.tasks.push(task)
    })

    // Optimistic update - sync to server
    get().syncTasks()
  },

  updateTask: (id, updates) => {
    set((state) => {
      const task = state.tasks.find(t => t.id === id)
      if (task) {
        Object.assign(task, { ...updates, updatedAt: new Date() })
      }
    })

    get().syncTasks()
  },

  deleteTask: (id) => {
    set((state) => {
      state.tasks = state.tasks.filter(t => t.id !== id)
    })

    get().syncTasks()
  },

  toggleTask: (id) => {
    set((state) => {
      const task = state.tasks.find(t => t.id === id)
      if (task) {
        task.status = task.status === 'done' ? 'todo' : 'done'
        task.updatedAt = new Date()
      }
    })
  },

  bulkComplete: () => {
    set((state) => {
      state.tasks.forEach(task => {
        if (task.status !== 'done') {
          task.status = 'done'
          task.updatedAt = new Date()
        }
      })
    })
  },

  deleteCompleted: () => {
    set((state) => {
      state.tasks = state.tasks.filter(t => t.status !== 'done')
    })
  },

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  fetchTasks: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch('/api/tasks')
      const tasks = await response.json()

      set({ tasks, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        isLoading: false
      })
    }
  },

  syncTasks: async () => {
    const { tasks } = get()

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks)
      })
    } catch (error) {
      console.error('Failed to sync tasks:', error)
    }
  },

  // Memoized selectors
  getFilteredTasks: () => {
    const { tasks, filter, searchQuery } = get()

    let filtered = tasks

    // Apply filter
    if (filter === 'active') {
      filtered = filtered.filter(t => t.status !== 'done')
    } else if (filter === 'completed') {
      filtered = filtered.filter(t => t.status === 'done')
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t => t.title.toLowerCase().includes(query) ||
             t.description.toLowerCase().includes(query)
      )
    }

    return filtered
  },

  getTasksByPriority: (priority) => {
    return get().tasks.filter(t => t.priority === priority)
  },

  getCompletedCount: () => {
    return get().tasks.filter(t => t.status === 'done').length
  }
})
```

### 3. Custom Hooks for Optimized Subscriptions

**hooks/useStore.ts**:
```typescript
import { useStore as useZustandStore } from 'zustand'
import { shallow } from 'zustand/shallow'
import { store } from '../store'

// Selective subscription - only re-render when specific values change
export function useTasks() {
  return useZustandStore(
    store,
    (state) => ({
      tasks: state.getFilteredTasks(),
      isLoading: state.isLoading,
      addTask: state.addTask,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask
    }),
    shallow
  )
}

export function useTaskFilters() {
  return useZustandStore(
    store,
    (state) => ({
      filter: state.filter,
      searchQuery: state.searchQuery,
      setFilter: state.setFilter,
      setSearchQuery: state.setSearchQuery
    }),
    shallow
  )
}

export function useTaskStats() {
  return useZustandStore(
    store,
    (state) => ({
      total: state.tasks.length,
      completed: state.getCompletedCount(),
      active: state.tasks.length - state.getCompletedCount()
    }),
    shallow
  )
}
```

### 4. Component Usage

**components/TaskList.tsx**:
```typescript
import { useTasks } from '../hooks/useStore'

export function TaskList() {
  const { tasks, isLoading, updateTask, deleteTask } = useTasks()

  if (isLoading) return <Spinner />

  return (
    <div>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={() => updateTask(task.id, {
            status: task.status === 'done' ? 'todo' : 'done'
          })}
          onDelete={() => deleteTask(task.id)}
        />
      ))}
    </div>
  )
}
```

### 5. Testing

**store/__tests__/tasks.test.ts**:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useStore } from '../index'

describe('Tasks Slice', () => {
  beforeEach(() => {
    useStore.setState({ tasks: [] })
  })

  it('adds a task', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Test Task',
        description: 'Description',
        status: 'todo',
        priority: 'high',
        dueDate: null
      })
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Test Task')
  })

  it('toggles task status', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Test',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null
      })
    })

    const taskId = result.current.tasks[0].id

    act(() => {
      result.current.toggleTask(taskId)
    })

    expect(result.current.tasks[0].status).toBe('done')
  })

  it('filters tasks correctly', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({ title: 'Task 1', status: 'todo', ... })
      result.current.addTask({ title: 'Task 2', status: 'done', ... })
      result.current.setFilter('completed')
    })

    expect(result.current.getFilteredTasks()).toHaveLength(1)
  })
})
```

## 🚀 Getting Started

```bash
cd starter
npm install
npm run dev      # Start development server
npm test         # Run tests
```

## 💡 Hints

1. **Slice Pattern**: Keep each slice focused on a single domain
2. **Immer Middleware**: Allows mutating state directly (internally uses immutability)
3. **Persist Middleware**: Automatically saves to localStorage
4. **Selective Subscriptions**: Use `shallow` to prevent unnecessary re-renders
5. **Async Actions**: Set loading states before async operations

## 🎯 Stretch Goals

1. **Undo/Redo**: Implement time-travel debugging
2. **Real-time Sync**: WebSocket integration for collaborative editing
3. **Offline Support**: Queue actions while offline, sync when online
4. **Performance Monitoring**: Track re-render counts
5. **Migration**: Add Jotai atoms for form state management

## 📖 Reference Solution

See [./solution](./solution) for a complete implementation with:
- All store slices
- Custom hooks
- Middleware configuration
- Comprehensive tests
- Performance optimizations

## ⏱️ Time Estimate

- **Core store**: 2-3 hours
- **Middleware setup**: 1 hour
- **Custom hooks**: 1 hour
- **Testing**: 1-2 hours
- **Stretch goals**: +3-4 hours

**Total**: 5-7 hours

## 🎓 What You'll Learn

- Zustand slice pattern for scalable stores
- Middleware composition (persist, devtools, immer)
- Optimizing React re-renders with selective subscriptions
- Implementing optimistic updates for better UX
- Testing Zustand stores
- Production-ready state management patterns

---

**Next**: Move to [Exercise 2: RSC State Layer](../exercise-02) to explore React Server Components as a state management solution.
