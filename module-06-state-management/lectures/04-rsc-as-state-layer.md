# Lecture 4: React Server Components as State Layer

## Introduction

React Server Components (RSC) fundamentally change how we think about state management. Instead of fetching data client-side and managing it with Context or state libraries, RSC moves data fetching to the server. This lecture covers using RSC as your primary state layer and when to augment with client state.

## RSC State Model

### Server as Source of Truth

```typescript
// app/dashboard/page.tsx
// Server Component - runs on server
export default async function Dashboard() {
  // This is "state" - but fetched fresh on navigation
  const user = await db.user.findUnique({ where: { id: '123' } })
  const posts = await db.post.findMany({ take: 10 })
  const stats = await getAnalytics()

  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <Analytics stats={stats} />
    </div>
  )
}

// No useState, no Context, no Zustand needed!
```

**Benefits**:
- No loading states on client
- No client-side caching logic
- Always fresh data
- Smaller client bundle
- Better SEO

### Composition for Fresh Data

```typescript
// Each component fetches its own data
async function Page() {
  return (
    <div>
      <Header /> {/* Fetches user */}
      <Sidebar /> {/* Fetches notifications */}
      <Content /> {/* Fetches posts */}
    </div>
  )
}

async function Header() {
  const user = await getUser()
  return <nav>{user.name}</nav>
}

async function Sidebar() {
  const notifications = await getNotifications()
  return <aside>{notifications.length} new</aside>
}

async function Content() {
  const posts = await getPosts()
  return <main>{posts.map(p => <Post key={p.id} {...p} />)}</main>
}

// React fetches all three in parallel automatically!
```

## Mixing Server and Client State

### Server State + Client Interactions

```typescript
// app/posts/page.tsx
async function PostsPage() {
  const posts = await db.post.findMany() // Server state

  return <PostList initialPosts={posts} />
}

// Client Component for interactions
'use client'

function PostList({ initialPosts }: { initialPosts: Post[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null) // Client state

  return (
    <div>
      {initialPosts.map(post => (
        <div
          key={post.id}
          onClick={() => setSelectedId(post.id)}
          style={{
            background: selectedId === post.id ? '#eee' : 'white',
          }}
        >
          {post.title}
        </div>
      ))}

      {selectedId && (
        <PostDetail postId={selectedId} />
      )}
    </div>
  )
}
```

### When to Use Client State

```typescript
// ✅ Client state for UI interactions
'use client'

function Accordion({ items }: { items: Item[] }) {
  const [openId, setOpenId] = useState<string | null>(null) // UI state

  return (
    <>
      {items.map(item => (
        <div key={item.id}>
          <button onClick={() => setOpenId(openId === item.id ? null : item.id)}>
            {item.title}
          </button>
          {openId === item.id && <div>{item.content}</div>}
        </div>
      ))}
    </>
  )
}

// ✅ Client state for form inputs
function SearchForm() {
  const [query, setQuery] = useState('') // Transient state

  return (
    <form action="/search">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        name="q"
      />
      <button>Search</button>
    </form>
  )
}

// ✅ Client state for optimistic updates
function TodoItem({ todo }: { todo: Todo }) {
  const [optimisticCompleted, setOptimisticCompleted] = useState(todo.completed)

  const handleToggle = async () => {
    setOptimisticCompleted(!optimisticCompleted) // Optimistic
    await toggleTodo(todo.id) // Server Action
  }

  return (
    <input
      type="checkbox"
      checked={optimisticCompleted}
      onChange={handleToggle}
    />
  )
}
```

## Server Actions for Mutations

### Mutations Without Client State

```typescript
// app/posts/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({
    data: { title, content },
  })

  revalidatePath('/posts') // Refresh server state
  redirect('/posts')
}

// app/posts/new/page.tsx
import { createPost } from '../actions'

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button>Create</button>
    </form>
  )
}

// No client state management needed!
```

### Progressive Enhancement

```typescript
// Works without JavaScript!
export default function DeletePost({ postId }: { postId: string }) {
  async function deletePost() {
    'use server'

    await db.post.delete({ where: { id: postId } })
    revalidatePath('/posts')
  }

  return (
    <form action={deletePost}>
      <button>Delete</button>
    </form>
  )
}

// With JavaScript enhancement
'use client'

export default function DeletePostEnhanced({ postId }: { postId: string }) {
  const [isPending, setIsPending] = useState(false)

  const handleDelete = async () => {
    setIsPending(true)
    await deletePost(postId)
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```

## Revalidation Strategies

### Path Revalidation

```typescript
'use server'

export async function updateProfile(formData: FormData) {
  const name = formData.get('name') as string

  await db.user.update({
    where: { id: '123' },
    data: { name },
  })

  // Revalidate specific paths
  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
```

### Tag Revalidation

```typescript
// app/posts/[id]/page.tsx
async function Post({ params }: { params: { id: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.id}`, {
    next: { tags: ['posts', `post-${params.id}`] },
  })

  return <div>{post.title}</div>
}

// actions.ts
'use server'

export async function updatePost(id: string, data: PostData) {
  await db.post.update({ where: { id }, data })

  // Revalidate all fetches tagged with 'posts'
  revalidateTag('posts')

  // Or specific post
  revalidateTag(`post-${id}`)
}
```

### Time-Based Revalidation

```typescript
// Revalidate every hour
export const revalidate = 3600

async function NewsPage() {
  const news = await fetchNews()

  return <NewsList news={news} />
}
```

## Caching Strategies

### Default Caching

```typescript
// Cached indefinitely
async function StaticPage() {
  const data = await fetch('https://api.example.com/data')
  const json = await data.json()

  return <div>{json.value}</div>
}
```

### Opt-Out of Caching

```typescript
// Fresh on every request
async function DynamicPage() {
  const data = await fetch('https://api.example.com/data', {
    cache: 'no-store', // Don't cache
  })

  return <div>{data.value}</div>
}

// Or at route level
export const dynamic = 'force-dynamic'

async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

### Custom Cache Duration

```typescript
async function TimedPage() {
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }, // Revalidate after 60 seconds
  })

  return <div>{data.value}</div>
}
```

## Patterns for Complex State

### URL as State

```typescript
// app/search/page.tsx
async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string }
}) {
  const query = searchParams.q || ''
  const filter = searchParams.filter || 'all'

  // Server fetches based on URL state
  const results = await searchDatabase(query, filter)

  return (
    <div>
      <SearchForm initialQuery={query} initialFilter={filter} />
      <Results results={results} />
    </div>
  )
}

// Client form updates URL
'use client'

function SearchForm({
  initialQuery,
  initialFilter,
}: {
  initialQuery: string
  initialFilter: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState(initialFilter)

  const handleSearch = () => {
    router.push(`/search?q=${query}&filter=${filter}`)
  }

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="posts">Posts</option>
        <option value="users">Users</option>
      </select>
      <button onClick={handleSearch}>Search</button>
    </div>
  )
}

// URL is the source of truth!
```

### Cookies as State

```typescript
import { cookies } from 'next/headers'

async function ThemePage() {
  const cookieStore = cookies()
  const theme = cookieStore.get('theme')?.value || 'light'

  return (
    <div data-theme={theme}>
      <ThemeToggle currentTheme={theme} />
    </div>
  )
}

// Server Action to update cookie
'use server'

export async function setTheme(theme: 'light' | 'dark') {
  cookies().set('theme', theme)
  revalidatePath('/', 'layout')
}
```

### Database as Single Source of Truth

```typescript
// No client state needed - everything in DB
async function TodoApp() {
  const todos = await db.todo.findMany()

  return (
    <div>
      <AddTodoForm />
      <TodoList todos={todos} />
    </div>
  )
}

// Server Actions modify DB directly
'use server'

export async function addTodo(formData: FormData) {
  await db.todo.create({
    data: { text: formData.get('text') as string },
  })
  revalidatePath('/todos')
}

export async function toggleTodo(id: string) {
  const todo = await db.todo.findUnique({ where: { id } })
  await db.todo.update({
    where: { id },
    data: { completed: !todo.completed },
  })
  revalidatePath('/todos')
}

export async function deleteTodo(id: string) {
  await db.todo.delete({ where: { id } })
  revalidatePath('/todos')
}
```

## When to Add Client State

### Scenarios Requiring Client State

```typescript
// 1. Real-time updates
'use client'

function ChatMessages({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    const ws = new WebSocket('/api/chat')

    ws.onmessage = event => {
      const newMessage = JSON.parse(event.data)
      setMessages(prev => [...prev, newMessage])
    }

    return () => ws.close()
  }, [])

  return <>{messages.map(m => <Message key={m.id} {...m} />)}</>
}

// 2. Complex client interactions
function DataTable({ data }: { data: Row[] }) {
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Complex sorting/filtering/selection
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      const result = aVal > bVal ? 1 : -1
      return sortDir === 'asc' ? result : -result
    })
  }, [data, sortBy, sortDir])

  return <>{/* ... */}</>
}

// 3. Temporary UI state
function Modal({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div className="modal">
          {children}
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  )
}
```

### Hybrid Approach

```typescript
// Server Component gets data
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await db.product.findUnique({ where: { id: params.id } })

  return <ProductDetail product={product} />
}

// Client Component handles interactions
'use client'

function ProductDetail({ product }: { product: Product }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0])
  const [quantity, setQuantity] = useState(1)

  return (
    <div>
      <h1>{product.name}</h1>

      <select
        value={selectedVariant.id}
        onChange={e =>
          setSelectedVariant(
            product.variants.find(v => v.id === e.target.value)!
          )
        }
      >
        {product.variants.map(v => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        value={quantity}
        onChange={e => setQuantity(Number(e.target.value))}
      />

      <AddToCartButton
        productId={product.id}
        variantId={selectedVariant.id}
        quantity={quantity}
      />
    </div>
  )
}
```

## Performance Considerations

### Parallel Data Fetching

```typescript
async function Dashboard() {
  // All fetch in parallel
  const [user, posts, stats] = await Promise.all([
    getUser(),
    getPosts(),
    getStats(),
  ])

  return (
    <div>
      <UserCard user={user} />
      <PostFeed posts={posts} />
      <Statistics stats={stats} />
    </div>
  )
}
```

### Streaming with Suspense

```typescript
async function Page() {
  return (
    <div>
      <Header /> {/* Fast */}

      <Suspense fallback={<Skeleton />}>
        <SlowData /> {/* Streams when ready */}
      </Suspense>

      <Footer />
    </div>
  )
}

async function SlowData() {
  await new Promise(resolve => setTimeout(resolve, 2000))
  const data = await fetchSlowData()
  return <div>{data}</div>
}
```

## Summary

**RSC as State Layer**:
- Server is source of truth
- No client caching needed
- Fresh data on navigation
- Smaller client bundles
- Better SEO

**When to Use**:
- Data that changes infrequently
- Public data
- SEO-critical content
- Initial page load data

**When to Add Client State**:
- Real-time updates
- Complex interactions
- Temporary UI state
- Optimistic updates
- Form inputs

**Best Practices**:
- Start with server state
- Add client state only when needed
- Use URL/cookies for persistent client state
- Leverage Server Actions for mutations
- Use revalidation for data freshness

**Key Insight**: RSC shifts mental model from "fetch data, manage in client" to "server provides latest state, client handles interactions."

**Next**: Lecture 5 compares state management solutions and migration strategies.
