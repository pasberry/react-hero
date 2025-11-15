import { StateCreator } from 'zustand'
import { User, UserPreferences } from '../../types'
import { Store } from '../index'

export interface UserSlice {
  user: User | null
  preferences: UserPreferences
  isAuthenticated: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  updateProfile: (updates: Partial<User>) => void
}

export const createUserSlice: StateCreator<
  Store,
  [['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]],
  [],
  UserSlice
> = (set, get) => ({
  user: null,
  preferences: {
    theme: 'system',
    notifications: true,
    compactView: false,
  },
  isAuthenticated: false,

  login: async (email, password) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // In real app: const { user, token } = await apiClient.login(email, password)

      const user: User = {
        id: '1',
        name: 'John Doe',
        email,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      }

      set(
        {
          user,
          isAuthenticated: true,
        },
        false,
        'user/login'
      )

      get().addToast({
        message: `Welcome back, ${user.name}!`,
        type: 'success',
      })
    } catch (error) {
      get().addToast({
        message: 'Login failed. Please try again.',
        type: 'error',
      })
      throw error
    }
  },

  logout: async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 200))

      // In real app: await apiClient.logout()

      set(
        {
          user: null,
          isAuthenticated: false,
        },
        false,
        'user/logout'
      )

      get().addToast({
        message: 'Logged out successfully',
        type: 'info',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },

  updatePreferences: (preferences) => {
    set((state) => {
      Object.assign(state.preferences, preferences)
    }, false, 'user/updatePreferences')

    get().addToast({
      message: 'Preferences updated',
      type: 'success',
    })
  },

  updateProfile: (updates) => {
    set((state) => {
      if (state.user) {
        Object.assign(state.user, updates)
      }
    }, false, 'user/updateProfile')

    get().addToast({
      message: 'Profile updated',
      type: 'success',
    })
  },
})
