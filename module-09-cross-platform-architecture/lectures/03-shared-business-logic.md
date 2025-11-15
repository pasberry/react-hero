# Lecture 3: Shared Business Logic

## Introduction

Business logic, state management, and API clients should be shared between web and mobile.

## Shared API Client

```typescript
// packages/api/client.ts
export class ApiClient {
  async getUser(id: string) {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  }

  async updateUser(id: string, data: UserData) {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  }
}

// Used in both web and mobile
import { ApiClient } from '@repo/api'

const api = new ApiClient()
const user = await api.getUser('123')
```

## Shared State

```typescript
// packages/store/user.ts
import create from 'zustand'

export const useUserStore = create<UserState>(set => ({
  user: null,
  setUser: user => set({ user }),
  logout: () => set({ user: null }),
}))

// Same store in web and mobile!
```

## Shared Utilities

```typescript
// packages/utils/format.ts
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US').format(date)
}

// Validation
import { z } from 'zod'

export const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})
```

## Summary

Business logic, API clients, and utilities should be platform-agnostic and shared.

**Next**: Lecture 4 covers design system integration.
