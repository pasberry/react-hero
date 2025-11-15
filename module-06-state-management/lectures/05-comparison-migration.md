# Lecture 5: State Management Comparison & Migration

## Introduction

Choosing the right state management solution is critical for application scalability. This lecture compares Context, Zustand, Jotai, Redux, and RSC-based patterns, providing decision matrices and migration strategies.

## Comparison Matrix

### Feature Comparison

| Feature | Context | Zustand | Jotai | Redux Toolkit | RSC |
|---------|---------|---------|-------|---------------|-----|
| **Bundle Size** | 0kb | 1kb | 3kb | 12kb | 0kb (client) |
| **Boilerplate** | Medium | Low | Low | High | None |
| **TypeScript** | Good | Excellent | Excellent | Good | Excellent |
| **DevTools** | No | Yes | Yes | Yes | Next DevTools |
| **Learning Curve** | Low | Low | Medium | High | Medium |
| **Performance** | Poor* | Excellent | Excellent | Good | Excellent |
| **SSR Support** | Yes | Yes | Yes | Yes | Native |
| **Async** | Manual | Easy | Native | Manual | Native |
| **Persistence** | Manual | Built-in | Built-in | Manual | Native |
| **Middleware** | No | Yes | Limited | Yes | N/A |

\* Poor when used incorrectly; OK when optimized

### Performance Characteristics

```typescript
// Context: All consumers rerender
const AppContext = createContext({ user, theme, cart })
// Changing theme rerenders EVERYTHING

// Zustand: Selective subscriptions
const useStore = create(...)
const theme = useStore(state => state.theme)
// Only theme consumers rerender

// Jotai: Atomic subscriptions
const themeAtom = atom('light')
// Only components using themeAtom rerender

// Redux: Selective with useSelector
const theme = useSelector(state => state.theme)
// Only theme selectors rerender

// RSC: No client rerenders for server state
async function Page() {
  const theme = await getTheme()
  return <div>{theme}</div>
}
// No JS on client for this state
```

## When to Use Each

### Use Context When

```typescript
// ✅ Infrequent updates
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('light')
  const value = useMemo(() => ({ theme, setTheme }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ✅ Dependency injection
function ApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createApiClient(), [])
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}

// ✅ Configuration
const ConfigContext = createContext({
  apiUrl: process.env.API_URL,
  features: { analytics: true },
})

// ❌ Don't use for:
// - Frequently changing state
// - Large state objects
// - Performance-critical updates
```

### Use Zustand When

```typescript
// ✅ Global app state
const useAppStore = create<AppState>(set => ({
  user: null,
  cart: [],
  notifications: [],

  addToCart: item => set(state => ({
    cart: [...state.cart, item],
  })),
}))

// ✅ Complex async logic
const useAuthStore = create<AuthState>(set => ({
  status: 'idle',
  user: null,

  login: async credentials => {
    set({ status: 'loading' })
    try {
      const user = await api.login(credentials)
      set({ status: 'authenticated', user })
    } catch (error) {
      set({ status: 'error' })
    }
  },
}))

// ✅ Shared state across many components
const useStore = create(...)

// ❌ Don't use for:
// - Server state (use React Query + RSC)
// - URL state (use searchParams)
// - Form state (use local useState)
```

### Use Jotai When

```typescript
// ✅ Atomic, composable state
const userAtom = atom<User | null>(null)
const themeAtom = atom('light')
const cartAtom = atom<Item[]>([])

// ✅ Derived state
const cartTotalAtom = atom(get => {
  const cart = get(cartAtom)
  return cart.reduce((sum, item) => sum + item.price, 0)
})

// ✅ Need Suspense integration
const userAtom = atom(async () => {
  const response = await fetch('/api/user')
  return response.json()
})

function User() {
  const [user] = useAtom(userAtom)
  return <div>{user.name}</div> // Suspends until loaded
}

// ✅ Scoped state with Provider
<Provider>
  <App /> {/* Isolated state */}
</Provider>

// ❌ Don't use for:
// - Simple global state (use Zustand)
// - Server state (use RSC)
```

### Use Redux Toolkit When

```typescript
// ✅ Large team with established patterns
const store = configureStore({
  reducer: {
    user: userReducer,
    cart: cartReducer,
    products: productsReducer,
  },
})

// ✅ Need middleware ecosystem
const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware()
      .concat(logger)
      .concat(analytics),
})

// ✅ Time-travel debugging required
// DevTools provide time-travel

// ✅ Existing Redux app
// Already invested in Redux

// ❌ Don't use for:
// - New projects (prefer Zustand/Jotai)
// - Small apps
// - Simple state
```

### Use RSC When

```typescript
// ✅ Server data as state
async function Posts() {
  const posts = await db.post.findMany()
  return <PostList posts={posts} />
}

// ✅ SEO-critical content
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  return <ProductDetails product={product} />
}

// ✅ Fresh data on navigation
async function Dashboard() {
  const stats = await getStats()
  return <StatsDisplay stats={stats} />
}

// ❌ Don't use for:
// - Real-time updates
// - Client-only state
// - Offline-first apps
```

## Migration Strategies

### Context to Zustand

```typescript
// Before: Context
const CartContext = createContext<CartState | null>(null)

function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Item[]>([])

  const addItem = useCallback((item: Item) => {
    setCart(prev => [...prev, item])
  }, [])

  const value = useMemo(() => ({ cart, addItem }), [cart, addItem])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

function Component() {
  const { cart } = useContext(CartContext)!
  return <div>{cart.length}</div>
}

// After: Zustand
import create from 'zustand'

const useCartStore = create<CartState>(set => ({
  cart: [],

  addItem: item =>
    set(state => ({
      cart: [...state.cart, item],
    })),
}))

function Component() {
  const cart = useCartStore(state => state.cart)
  return <div>{cart.length}</div>
}

// Migration steps:
// 1. Create Zustand store alongside Context
// 2. Migrate components one at a time
// 3. Remove Context when done
// 4. Remove Provider from app
```

### Redux to Zustand

```typescript
// Before: Redux
// store.ts
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem: (state, action) => {
      state.items.push(action.payload)
    },
  },
})

export const { addItem } = cartSlice.actions

// Component
function Component() {
  const dispatch = useDispatch()
  const cart = useSelector(state => state.cart.items)

  return <button onClick={() => dispatch(addItem(item))}>Add</button>
}

// After: Zustand
const useCartStore = create<CartState>(set => ({
  items: [],

  addItem: item =>
    set(state => ({
      items: [...state.items, item],
    })),
}))

function Component() {
  const cart = useCartStore(state => state.items)
  const addItem = useCartStore(state => state.addItem)

  return <button onClick={() => addItem(item)}>Add</button>
}

// Migration steps:
// 1. Keep Redux store
// 2. Create Zustand stores for new features
// 3. Gradually migrate old features
// 4. Remove Redux when complete
```

### Client State to RSC

```typescript
// Before: Client state + fetch
'use client'

function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data)
        setIsLoading(false)
      })
  }, [])

  if (isLoading) return <div>Loading...</div>

  return <PostList posts={posts} />
}

// After: RSC
// app/posts/page.tsx
async function Posts() {
  const posts = await db.post.findMany()
  return <PostList posts={posts} />
}

// Migration steps:
// 1. Move data fetching to Server Components
// 2. Remove client state for server data
// 3. Keep client state only for interactions
// 4. Use Server Actions for mutations
```

### Zustand + RSC Hybrid

```typescript
// Server Component for data
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } })

  return <ProductClient product={product} />
}

// Client Component for cart (global state)
'use client'

const useCartStore = create<CartState>(set => ({
  items: [],
  addItem: item => set(state => ({ items: [...state.items, item] })),
}))

function ProductClient({ product }: { product: Product }) {
  const addItem = useCartStore(state => state.addItem)

  return (
    <div>
      <h1>{product.name}</h1>
      <button onClick={() => addItem(product)}>Add to Cart</button>
    </div>
  )
}

// Best of both worlds:
// - Server data: Fresh, SEO-friendly
// - Client state: For cart, shared across app
```

## Decision Tree

```
START: Do you need state?
│
├─ YES, for server data
│  │
│  ├─ SEO important? → Use RSC
│  ├─ Real-time? → Use client state + WebSocket
│  └─ Complex caching? → Use React Query + RSC
│
├─ YES, for client data
│  │
│  ├─ Temporary UI state (modal open, etc)?
│  │  └─ Use useState
│  │
│  ├─ Form state?
│  │  └─ Use useState or React Hook Form
│  │
│  ├─ Shared across few components?
│  │  └─ Lift state or use Context
│  │
│  ├─ Shared across many components?
│  │  │
│  │  ├─ Simple global state?
│  │  │  └─ Use Zustand
│  │  │
│  │  ├─ Atomic, composable?
│  │  │  └─ Use Jotai
│  │  │
│  │  ├─ Large team, established patterns?
│  │  │  └─ Use Redux Toolkit
│  │  │
│  │  └─ Just theme/config?
│  │     └─ Use Context
│  │
│  └─ URL should reflect state?
│     └─ Use searchParams + RSC
│
└─ NO
   └─ Don't use state!
```

## Real-World Architecture

### E-commerce App

```typescript
// Server state: Product catalog, user data
// app/products/[id]/page.tsx
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  const recommendations = await db.product.findMany({ take: 4 })

  return <ProductView product={product} recommendations={recommendations} />
}

// Client state: Cart (Zustand - persists across navigation)
const useCartStore = create(
  persist<CartState>(
    set => ({
      items: [],
      addItem: item => set(state => ({ items: [...state.items, item] })),
    }),
    { name: 'cart' }
  )
)

// Client state: Product interactions (local useState)
'use client'

function ProductView({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore(state => state.addItem)

  return (
    <div>
      <ImageGallery
        images={product.images}
        selected={selectedImage}
        onSelect={setSelectedImage}
      />
      <button onClick={() => addItem({ ...product, quantity })}>
        Add to Cart
      </button>
    </div>
  )
}
```

### Dashboard App

```typescript
// Server state: All data
async function Dashboard() {
  const [user, stats, recentActivity] = await Promise.all([
    getUser(),
    getStats(),
    getRecentActivity(),
  ])

  return <DashboardView user={user} stats={stats} activity={recentActivity} />
}

// Client state: UI preferences (Zustand)
const usePrefsStore = create<PrefsState>(set => ({
  sidebarOpen: true,
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  chartType: 'bar',
  setChartType: type => set({ chartType: type }),
}))

// URL state: Filters
// app/dashboard/page.tsx?filter=week&category=sales
async function Dashboard({ searchParams }: {
  searchParams: { filter?: string; category?: string }
}) {
  const filter = searchParams.filter || 'week'
  const category = searchParams.category || 'all'

  const stats = await getStats(filter, category)

  return <DashboardView stats={stats} filter={filter} category={category} />
}
```

## Summary

**State Management Spectrum**:
```
Simplest                                        Most Complex
│                                                          │
└─ useState → Context → Zustand/Jotai → Redux → Custom ──┘
```

**Modern Best Practice**:
```
RSC for server state
  ↓
Zustand for global client state
  ↓
Context for DI and config
  ↓
useState for local state
```

**Key Decisions**:
1. **Server vs Client**: Can this be server state?
2. **Scope**: How many components need it?
3. **Frequency**: How often does it change?
4. **Persistence**: Should it survive navigation?
5. **Team**: What does team know?

**Migration Strategy**:
1. Don't rewrite everything at once
2. Start with new features
3. Gradually migrate old code
4. Keep both systems during transition
5. Remove old system when safe

**Common Patterns**:
- RSC for server data
- Zustand for cart, auth status, global UI
- Context for theme, i18n, API client
- useState for local UI state
- URL for filters, pagination, search

**Module 6 Complete!** You now understand all major state management approaches and when to use each.
