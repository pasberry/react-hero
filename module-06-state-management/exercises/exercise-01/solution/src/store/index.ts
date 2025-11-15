import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createTasksSlice, TasksSlice } from './slices/tasks'
import { createUserSlice, UserSlice } from './slices/user'
import { createUISlice, UISlice } from './slices/ui'

// Combined store type
export interface Store extends TasksSlice, UserSlice, UISlice {}

// Create store with middleware composition
export const useStore = create<Store>()(
  devtools(
    persist(
      immer((set, get, api) => ({
        ...createTasksSlice(set, get, api),
        ...createUserSlice(set, get, api),
        ...createUISlice(set, get, api),
      })),
      {
        name: 'taskmaster-storage',
        // Only persist specific slices (exclude UI state)
        partialize: (state) => ({
          tasks: state.tasks,
          filter: state.filter,
          searchQuery: state.searchQuery,
          user: state.user,
          preferences: state.preferences,
          isAuthenticated: state.isAuthenticated,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    {
      name: 'TaskMaster Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)
