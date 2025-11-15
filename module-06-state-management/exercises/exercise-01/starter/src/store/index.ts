import { create } from 'zustand'

// TODO: Import middleware (devtools, persist, immer)
// TODO: Import store slices

// TODO: Define complete Store type combining all slices
export interface Store {
  // Tasks slice
  // User slice
  // UI slice
}

// TODO: Create store with middleware and slices
export const useStore = create<Store>()((set, get) => ({
  // TODO: Combine slices here
}))
