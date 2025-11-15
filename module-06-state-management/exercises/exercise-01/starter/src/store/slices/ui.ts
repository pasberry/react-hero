import { StateCreator } from 'zustand'
import { Toast } from '../../types'

// TODO: Define UISlice interface with:
// - modals: { taskEdit: boolean, taskCreate: boolean, settings: boolean }
// - sidebarCollapsed: boolean
// - toasts: Toast[]
// - Actions: openModal, closeModal, toggleSidebar, addToast, removeToast

export interface UISlice {
  modals: {
    taskEdit: boolean
    taskCreate: boolean
    settings: boolean
  }
  // TODO: Add other state and actions
}

// TODO: Implement createUISlice
export const createUISlice: StateCreator<any> = (set, get) => ({
  modals: {
    taskEdit: false,
    taskCreate: false,
    settings: false,
  },
  // TODO: Implement all actions
})
