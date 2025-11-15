import { useStore as useZustandStore } from '../store'
import { shallow } from 'zustand/shallow'

/**
 * Custom hooks with selective subscriptions.
 * These hooks only re-render when their specific slices change,
 * preventing unnecessary re-renders.
 */

// Tasks hooks
export function useTasks() {
  return useZustandStore(
    (state) => ({
      tasks: state.getFilteredTasks(),
      isLoading: state.isLoading,
      error: state.error,
      addTask: state.addTask,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask,
      toggleTask: state.toggleTask,
    }),
    shallow
  )
}

export function useTaskFilters() {
  return useZustandStore(
    (state) => ({
      filter: state.filter,
      searchQuery: state.searchQuery,
      setFilter: state.setFilter,
      setSearchQuery: state.setSearchQuery,
    }),
    shallow
  )
}

export function useTaskStats() {
  return useZustandStore(
    (state) => ({
      total: state.tasks.length,
      completed: state.getCompletedCount(),
      active: state.tasks.length - state.getCompletedCount(),
      highPriority: state.getTasksByPriority('high').length,
    }),
    shallow
  )
}

export function useTaskActions() {
  return useZustandStore(
    (state) => ({
      bulkComplete: state.bulkComplete,
      deleteCompleted: state.deleteCompleted,
      fetchTasks: state.fetchTasks,
    }),
    shallow
  )
}

// User hooks
export function useUser() {
  return useZustandStore(
    (state) => ({
      user: state.user,
      isAuthenticated: state.isAuthenticated,
      login: state.login,
      logout: state.logout,
      updateProfile: state.updateProfile,
    }),
    shallow
  )
}

export function useUserPreferences() {
  return useZustandStore(
    (state) => ({
      preferences: state.preferences,
      updatePreferences: state.updatePreferences,
    }),
    shallow
  )
}

// UI hooks
export function useModals() {
  return useZustandStore(
    (state) => ({
      modals: state.modals,
      openModal: state.openModal,
      closeModal: state.closeModal,
    }),
    shallow
  )
}

export function useSidebar() {
  return useZustandStore(
    (state) => ({
      collapsed: state.sidebarCollapsed,
      toggle: state.toggleSidebar,
    }),
    shallow
  )
}

export function useToasts() {
  return useZustandStore(
    (state) => ({
      toasts: state.toasts,
      addToast: state.addToast,
      removeToast: state.removeToast,
    }),
    shallow
  )
}
