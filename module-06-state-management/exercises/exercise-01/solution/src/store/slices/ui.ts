import { StateCreator } from 'zustand'
import { Toast } from '../../types'
import { Store } from '../index'

export interface UISlice {
  modals: {
    taskEdit: boolean
    taskCreate: boolean
    settings: boolean
  }
  sidebarCollapsed: boolean
  toasts: Toast[]

  // Actions
  openModal: (modal: keyof UISlice['modals']) => void
  closeModal: (modal: keyof UISlice['modals']) => void
  toggleSidebar: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const createUISlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  UISlice
> = (set, get) => ({
  modals: {
    taskEdit: false,
    taskCreate: false,
    settings: false,
  },
  sidebarCollapsed: false,
  toasts: [],

  openModal: (modal) => {
    set((state) => {
      state.modals[modal] = true
    }, false, `ui/openModal/${modal}`)
  },

  closeModal: (modal) => {
    set((state) => {
      state.modals[modal] = false
    }, false, `ui/closeModal/${modal}`)
  },

  toggleSidebar: () => {
    set((state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    }, false, 'ui/toggleSidebar')
  },

  addToast: (toastData) => {
    const toast: Toast = {
      ...toastData,
      id: crypto.randomUUID(),
      duration: toastData.duration ?? 3000,
    }

    set((state) => {
      state.toasts.push(toast)
    }, false, 'ui/addToast')

    // Auto-remove toast after duration
    if (toast.duration) {
      setTimeout(() => {
        get().removeToast(toast.id)
      }, toast.duration)
    }
  },

  removeToast: (id) => {
    set((state) => {
      state.toasts = state.toasts.filter((t) => t.id !== id)
    }, false, 'ui/removeToast')
  },
})
