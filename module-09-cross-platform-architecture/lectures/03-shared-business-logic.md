# Lecture 3: Shared Business Logic

## Introduction

After building shared UI components in Lecture 2, the next layer of code sharing is **business logic**: the rules, calculations, and data operations that define how your application works.

**Business logic includes**:
- **API clients**: Making network requests to your backend
- **State management**: Managing application state (user, cart, settings)
- **Data validation**: Ensuring data meets requirements before submission
- **Business rules**: Pricing calculations, tax computation, discount logic
- **Utilities**: Date formatting, currency conversion, string manipulation
- **Authentication**: Login, logout, token management

**The problem with duplicating business logic**:
- **Inconsistent behavior**: Web calculates tax differently than mobile
- **Security vulnerabilities**: Authentication bug exists on one platform but not the other
- **Maintenance nightmare**: Fix a pricing calculation bug in 3 places (web, iOS, Android)
- **Data drift**: Cart totals differ between platforms due to rounding differences

**The solution: Platform-agnostic business logic**

Write your business logic once in pure TypeScript/JavaScript (no platform-specific code), then import it in both web and mobile apps. When you fix a bug or add a feature, all platforms get the update simultaneously.

This lecture teaches you how to architect shared business logic using:
1. **API clients** with error handling and interceptors
2. **State management** with Zustand and React Query
3. **Data validation** with Zod schemas
4. **Business rules** as pure functions
5. **Offline-first patterns** for resilient apps

---

## Why Shared Business Logic?

### The Problem: Inconsistent Calculations

Imagine you're building an e-commerce app with web and mobile versions. You have a shopping cart with:
- **Subtotal**: Sum of item prices
- **Tax**: 8.5% of subtotal
- **Shipping**: Free over $50, otherwise $5.99
- **Discount**: 10% off for first-time users
- **Total**: Subtotal + tax + shipping - discount

**Without shared logic** (duplicate implementations):

```typescript
// Web version
function calculateTotal(cart: Cart, user: User): number {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.085
  const shipping = subtotal >= 50 ? 0 : 5.99
  const discount = user.isFirstTime ? subtotal * 0.1 : 0
  return subtotal + tax + shipping - discount
}

// Mobile version (accidentally different!)
function calculateTotal(cart: Cart, user: User): number {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.085
  const shipping = subtotal > 50 ? 0 : 5.99  // ❌ Bug: > instead of >=
  const discount = user.isFirstTime ? subtotal * 0.1 : 0
  return Math.round(subtotal + tax + shipping - discount)  // ❌ Different rounding
}
```

**Result**: User sees $49.99 total on web, but $55.98 on mobile. They abandon checkout due to confusion.

**With shared logic**:

```typescript
// packages/business-logic/cart.ts
export function calculateTotal(cart: Cart, user: User): number {
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.085
  const shipping = subtotal >= 50 ? 0 : 5.99
  const discount = user.isFirstTime ? subtotal * 0.1 : 0
  return Number((subtotal + tax + shipping - discount).toFixed(2))
}

// Both web and mobile import this:
import { calculateTotal } from '@my-app/business-logic'

const total = calculateTotal(cart, user)  // ✅ Identical everywhere
```

**Benefits**:
- ✅ **Consistency**: Same calculation everywhere
- ✅ **Single bug fix**: Fix rounding once, both platforms updated
- ✅ **Testability**: Write unit tests once for shared logic
- ✅ **Confidence**: Changes are atomic across platforms

### Real-World Example: Uber

Uber's pricing algorithm (distance, time, surge pricing) is shared across:
- iOS app (Swift + shared TypeScript logic via JSI)
- Android app (Kotlin + shared TypeScript logic via JSI)
- Web app (React)
- Driver app (React Native)
- Internal admin tools

**Result**:
- **Consistency**: Rider and driver see the exact same price estimate
- **Single source of truth**: Pricing formula updated once, propagates everywhere
- **Reduced bugs**: 60% fewer pricing discrepancy incidents after sharing logic

---

## Shared API Client

### Architecture

An API client is a TypeScript class/module that handles all network requests to your backend.

**Design principles**:
1. **Platform-agnostic**: Uses `fetch` or `axios` (works on web and mobile)
2. **Type-safe**: Returns typed responses using shared types
3. **Error handling**: Consistent error mapping
4. **Interceptors**: Add authentication tokens automatically
5. **Retry logic**: Retry failed requests automatically

### Basic API Client

**packages/api-client/client.ts**:
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import type { User, Order, Product } from '@my-app/types'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, logout user
          this.logout()
        }
        return Promise.reject(this.normalizeError(error))
      }
    )
  }

  private async getAuthToken(): Promise<string | null> {
    // Get token from storage (platform-specific implementation)
    // Web: localStorage.getItem('token')
    // Mobile: AsyncStorage.getItem('token')
    return null  // Implement based on platform
  }

  private normalizeError(error: AxiosError): ApiError {
    return {
      message: error.response?.data?.message || error.message,
      code: error.response?.status || 500,
      details: error.response?.data
    }
  }

  // ============================================
  // User API
  // ============================================

  async getUser(id: string): Promise<User> {
    const response = await this.client.get<User>(`/users/${id}`)
    return response.data
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.client.put<User>(`/users/${id}`, data)
    return response.data
  }

  // ============================================
  // Products API
  // ============================================

  async getProducts(params?: {
    category?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<Product[]> {
    const response = await this.client.get<Product[]>('/products', { params })
    return response.data
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.client.get<Product>(`/products/${id}`)
    return response.data
  }

  // ============================================
  // Orders API
  // ============================================

  async getOrders(userId: string): Promise<Order[]> {
    const response = await this.client.get<Order[]>('/orders', {
      params: { userId }
    })
    return response.data
  }

  async createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const response = await this.client.post<Order>('/orders', order)
    return response.data
  }

  // ============================================
  // Authentication
  // ============================================

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post<{ user: User; token: string }>('/auth/login', {
      email,
      password
    })
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
    // Clear token from storage
  }
}

export interface ApiError {
  message: string
  code: number
  details?: any
}
```

### Singleton Instance

**packages/api-client/index.ts**:
```typescript
import { ApiClient } from './client'

// Create singleton instance
export const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
)

// Export types
export type { ApiError } from './client'
```

**Usage in components**:
```typescript
// Works on both web and mobile!
import { apiClient } from '@my-app/api-client'
import type { User } from '@my-app/types'

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .getUser(userId)
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Text>Loading...</Text>
  if (error) return <Text>Error: {error}</Text>
  if (!user) return <Text>User not found</Text>

  return (
    <View>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
    </View>
  )
}
```

---

## State Management with Zustand

### Why Zustand for Cross-Platform?

**Zustand** is ideal for monorepos because:
- ✅ **Platform-agnostic**: Pure JavaScript, no platform-specific code
- ✅ **Lightweight**: 1KB, minimal API surface
- ✅ **TypeScript-first**: Excellent type inference
- ✅ **No boilerplate**: No actions, reducers, or providers required
- ✅ **DevTools**: Works with Redux DevTools

**Comparison**:

| Feature | Zustand | Redux | MobX |
|---------|---------|-------|------|
| **Size** | 1KB | 5KB | 16KB |
| **Boilerplate** | Minimal | High | Medium |
| **Learning curve** | Easy | Hard | Medium |
| **TypeScript** | Excellent | Good | Good |
| **Cross-platform** | ✅ | ✅ | ✅ |

### User Store Example

**packages/store/user.ts**:
```typescript
import create from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@my-app/types'
import { apiClient } from '@my-app/api-client'

interface UserState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const { user, token } = await apiClient.login(email, password)
          set({ user, token, isAuthenticated: true })
        } catch (error) {
          throw error
        }
      },

      logout: async () => {
        await apiClient.logout()
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateUser: async (data) => {
        const { user } = get()
        if (!user) throw new Error('No user logged in')

        const updatedUser = await apiClient.updateUser(user.id, data)
        set({ user: updatedUser })
      }
    }),
    {
      name: 'user-storage',  // Storage key
      // Storage is platform-specific:
      // - Web: localStorage
      // - Mobile: AsyncStorage
    }
  )
)
```

### Cart Store Example

**packages/store/cart.ts**:
```typescript
import create from 'zustand'
import type { Product, CartItem } from '@my-app/types'

interface CartState {
  items: CartItem[]

  // Actions
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void

  // Derived state
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product, quantity) => {
    const items = get().items
    const existingItem = items.find(item => item.productId === product.id)

    if (existingItem) {
      set({
        items: items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      })
    } else {
      set({
        items: [...items, {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity
        }]
      })
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter(item => item.productId !== productId) })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity === 0) {
      get().removeItem(productId)
    } else {
      set({
        items: get().items.map(item =>
          item.productId === productId ? { ...item, quantity } : item
        )
      })
    }
  },

  clearCart: () => {
    set({ items: [] })
  },

  subtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },

  total: () => {
    const subtotal = get().subtotal()
    const tax = subtotal * 0.085
    const shipping = subtotal >= 50 ? 0 : 5.99
    return Number((subtotal + tax + shipping).toFixed(2))
  }
}))
```

**Usage**:
```typescript
import { useCartStore } from '@my-app/store'

export function CartScreen() {
  const items = useCartStore(state => state.items)
  const total = useCartStore(state => state.total())
  const addItem = useCartStore(state => state.addItem)

  return (
    <View>
      {items.map(item => (
        <View key={item.productId}>
          <Text>{item.name}</Text>
          <Text>${item.price} x {item.quantity}</Text>
        </View>
      ))}

      <Text>Total: ${total}</Text>

      <Button onPress={() => addItem(product, 1)}>
        Add to Cart
      </Button>
    </View>
  )
}
```

---

## Data Caching with React Query

### Why React Query?

**React Query** provides:
- ✅ **Automatic caching**: Fetch once, reuse everywhere
- ✅ **Background refetching**: Keep data fresh
- ✅ **Optimistic updates**: Update UI immediately, sync later
- ✅ **Infinite scrolling**: Built-in pagination support
- ✅ **Offline support**: Works without network

### Setup

**packages/data/client.ts**:
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,  // Data fresh for 1 minute
      cacheTime: 300000,  // Keep in cache for 5 minutes
      retry: 3,  // Retry failed requests 3 times
      refetchOnWindowFocus: false  // Don't refetch on window focus
    }
  }
})
```

### Custom Hooks

**packages/data/useProducts.ts**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@my-app/api-client'
import type { Product } from '@my-app/types'

// Fetch products
export function useProducts(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => apiClient.getProducts(params),
    staleTime: 300000  // Products fresh for 5 minutes
  })
}

// Fetch single product
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id  // Only fetch if id exists
  })
}

// Create order mutation
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (order: Omit<Order, 'id' | 'createdAt'>) => apiClient.createOrder(order),
    onSuccess: () => {
      // Invalidate orders query to refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
  })
}

// Optimistic update example
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      apiClient.updateProduct(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['product', id] })

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData<Product>(['product', id])

      // Optimistically update
      queryClient.setQueryData<Product>(['product', id], (old) => ({
        ...old!,
        ...data
      }))

      return { previousProduct }
    },

    onError: (err, { id }, context) => {
      // Rollback on error
      queryClient.setQueryData(['product', id], context?.previousProduct)
    },

    onSettled: ({ id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['product', id] })
    }
  })
}
```

**Usage**:
```typescript
import { useProducts, useCreateOrder } from '@my-app/data'

export function ProductList() {
  const { data: products, isLoading, error } = useProducts({ category: 'electronics' })
  const createOrder = useCreateOrder()

  if (isLoading) return <Text>Loading...</Text>
  if (error) return <Text>Error: {error.message}</Text>

  return (
    <View>
      {products?.map(product => (
        <Card key={product.id}>
          <Text>{product.name}</Text>
          <Text>${product.price}</Text>
          <Button
            onPress={() => {
              createOrder.mutate({
                userId: 'user-123',
                items: [{ productId: product.id, quantity: 1, price: product.price }],
                total: product.price
              })
            }}
          >
            Buy Now
          </Button>
        </Card>
      ))}
    </View>
  )
}
```

---

## Data Validation with Zod

### Why Zod?

**Zod** provides:
- ✅ **Type inference**: TypeScript types generated from schemas
- ✅ **Runtime validation**: Catch invalid data before it breaks your app
- ✅ **Platform-agnostic**: Pure TypeScript
- ✅ **Composable**: Build complex schemas from simple ones

### Validation Schemas

**packages/validation/schemas.ts**:
```typescript
import { z } from 'zod'

// User schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  age: z.number().int().min(18, 'Must be 18 or older').optional(),
  avatarUrl: z.string().url().optional()
})

export type User = z.infer<typeof UserSchema>

// Product schema
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().positive('Price must be positive'),
  description: z.string().optional(),
  category: z.enum(['electronics', 'clothing', 'food', 'books']),
  inStock: z.boolean(),
  images: z.array(z.string().url()).min(1, 'At least one image required')
})

export type Product = z.infer<typeof ProductSchema>

// Order schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive()
    })
  ).min(1, 'Order must have at least one item'),
  total: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  createdAt: z.date()
})

export type Order = z.infer<typeof OrderSchema>

// Login credentials schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export type LoginCredentials = z.infer<typeof LoginSchema>
```

### Form Validation

**packages/validation/useFormValidation.ts**:
```typescript
import { useState } from 'react'
import { z } from 'zod'

export function useFormValidation<T extends z.ZodType>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(data: any): data is z.infer<T> {
    try {
      schema.parse(data)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          const field = err.path.join('.')
          fieldErrors[field] = err.message
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }

  return { errors, validate, clearErrors: () => setErrors({}) }
}
```

**Usage in forms**:
```typescript
import { useState } from 'react'
import { LoginSchema } from '@my-app/validation'
import { useFormValidation } from '@my-app/validation/useFormValidation'
import { apiClient } from '@my-app/api-client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { errors, validate } = useFormValidation(LoginSchema)

  async function handleSubmit() {
    const formData = { email, password }

    if (validate(formData)) {
      try {
        await apiClient.login(formData.email, formData.password)
        // Navigate to home
      } catch (error) {
        alert('Login failed')
      }
    }
  }

  return (
    <View>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoComplete="email"
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="password"
      />

      <Button onPress={handleSubmit}>Log In</Button>
    </View>
  )
}
```

---

## Business Rules as Pure Functions

### Pricing Engine

**packages/business-logic/pricing.ts**:
```typescript
import type { CartItem, User } from '@my-app/types'

export interface PriceBreakdown {
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
}

const TAX_RATE = 0.085
const FREE_SHIPPING_THRESHOLD = 50
const SHIPPING_COST = 5.99

export function calculatePricing(
  items: CartItem[],
  user: User,
  promoCode?: string
): PriceBreakdown {
  // Subtotal
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Tax
  const tax = subtotal * TAX_RATE

  // Shipping
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST

  // Discount
  let discount = 0

  if (user.isFirstTime) {
    discount = subtotal * 0.1  // 10% off for first-time users
  }

  if (promoCode === 'SAVE20') {
    discount = Math.max(discount, subtotal * 0.2)  // 20% off with promo
  }

  // Total
  const total = Number((subtotal + tax + shipping - discount).toFixed(2))

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    total
  }
}

// Loyalty points calculation
export function calculateLoyaltyPoints(orderTotal: number): number {
  return Math.floor(orderTotal)  // 1 point per dollar
}

// Estimate delivery date
export function estimateDeliveryDate(
  shippingSpeed: 'standard' | 'express' | 'overnight'
): Date {
  const now = new Date()
  const daysToAdd = {
    standard: 7,
    express: 3,
    overnight: 1
  }[shippingSpeed]

  now.setDate(now.getDate() + daysToAdd)
  return now
}
```

**Testing**:
```typescript
import { describe, it, expect } from 'vitest'
import { calculatePricing } from './pricing'

describe('calculatePricing', () => {
  it('applies free shipping over $50', () => {
    const items = [{ productId: '1', price: 60, quantity: 1 }]
    const user = { id: '1', isFirstTime: false }

    const result = calculatePricing(items, user)

    expect(result.subtotal).toBe(60)
    expect(result.shipping).toBe(0)  // Free shipping
  })

  it('charges shipping under $50', () => {
    const items = [{ productId: '1', price: 30, quantity: 1 }]
    const user = { id: '1', isFirstTime: false }

    const result = calculatePricing(items, user)

    expect(result.shipping).toBe(5.99)
  })

  it('applies first-time user discount', () => {
    const items = [{ productId: '1', price: 100, quantity: 1 }]
    const user = { id: '1', isFirstTime: true }

    const result = calculatePricing(items, user)

    expect(result.discount).toBe(10)  // 10% of $100
    expect(result.total).toBe(100 + 8.5 - 10)  // subtotal + tax - discount
  })

  it('applies promo code discount', () => {
    const items = [{ productId: '1', price: 100, quantity: 1 }]
    const user = { id: '1', isFirstTime: false }

    const result = calculatePricing(items, user, 'SAVE20')

    expect(result.discount).toBe(20)  // 20% of $100
  })
})
```

---

## Utility Functions

**packages/utils/format.ts**:
```typescript
// Currency formatting
export function formatCurrency(amount: number, locale = 'en-US', currency = 'USD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount)
}

// Date formatting
export function formatDate(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(date)
}

// String utilities
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    groups[groupKey] = groups[groupKey] || []
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}
```

---

## Summary

Shared business logic is the **heart of cross-platform architecture**, ensuring consistency, reliability, and maintainability.

**Key takeaways**:

1. **API clients** centralize network requests with type safety, error handling, and authentication

2. **State management** with Zustand provides a simple, type-safe way to manage global state across platforms

3. **React Query** handles data caching, refetching, and optimistic updates automatically

4. **Zod schemas** validate data at runtime, preventing bugs from invalid input

5. **Business rules as pure functions** (pricing, discounts, calculations) ensure identical behavior everywhere

6. **Utility functions** (formatting, validation, array operations) are reusable across platforms

**Code sharing metrics**:

| Approach | Lines of Code | Bug Surface Area | Development Speed |
|----------|---------------|------------------|-------------------|
| **Duplicate logic** | 8,000 | High (2-3x bugs) | Slow (2x work) |
| **Shared logic** | 4,000 | Low (1 fix everywhere) | Fast (write once) |

**Real-world impact**:
- **Uber**: 60% fewer pricing discrepancy bugs with shared pricing logic
- **Shopify**: 70% code reuse for cart/checkout logic
- **Airbnb**: 2x development speed with shared business rules

**Next lecture**:
- **Lecture 4**: Design System Integration - Building a cohesive visual language with design tokens, component documentation, and Storybook

---

## Additional Resources

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zod Documentation](https://zod.dev/)
- [Clean Architecture for React](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
