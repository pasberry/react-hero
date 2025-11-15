# Lecture 3: Implementation Patterns & Best Practices

## Introduction

This lecture covers proven patterns and practices for building your capstone project. These aren't theoretical concepts—they're battle-tested patterns used in production applications serving millions of users.

**What you'll learn**:
- Authentication patterns with Next.js and Expo
- Data fetching strategies (Server Components vs Client)
- Real-time features architecture
- Error handling and resilience
- Performance optimization techniques

---

## Pattern 1: Authentication Flow

### Why This Matters

Authentication is the foundation of your app. Get it wrong, and you have security vulnerabilities. Get it right once, and it works forever.

### The Complete Auth Architecture

```
┌─────────────┐
│  Web App    │
│  (Next.js)  │
└──────┬──────┘
       │
       ├─── Session Cookie (HTTP-only)
       │
       ▼
┌──────────────┐         ┌──────────────┐
│   Next Auth  │────────▶│  Database    │
│  (Sessions)  │         │  (Users)     │
└──────┬───────┘         └──────────────┘
       │
       ├─── JWT Token
       │
       ▼
┌──────────────┐
│  Mobile App  │
│   (Expo)     │
└──────────────┘
```

### Implementation: NextAuth.js

**Install dependencies**:
```bash
pnpm --filter @repo/web add next-auth @auth/prisma-adapter
```

**`apps/web/lib/auth.ts`**:
```typescript
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@repo/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt', // Use JWT for stateless auth
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Email/Password
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.hashedPassword) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        )

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar
        }
      }
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  }
}
```

**`apps/web/app/api/auth/[...nextauth]/route.ts`**:
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

**`apps/web/app/layout.tsx`**:
```typescript
import { SessionProvider } from '@/components/SessionProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

**`apps/web/components/SessionProvider.tsx`**:
```typescript
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

---

### Mobile Auth with Expo

**`apps/mobile/lib/auth.ts`**:
```typescript
import * as SecureStore from 'expo-secure-store'
import { api } from '@repo/api'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_data'

export async function login(email: string, password: string) {
  try {
    const response = await api.post('auth/login', {
      json: { email, password }
    }).json<{ token: string; user: User }>()

    // Store token securely (encrypted on device)
    await SecureStore.setItemAsync(TOKEN_KEY, response.token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user))

    return response.user
  } catch (error) {
    throw new Error('Login failed')
  }
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(USER_KEY)
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY)
}

export async function getCurrentUser(): Promise<User | null> {
  const userData = await SecureStore.getItemAsync(USER_KEY)
  return userData ? JSON.parse(userData) : null
}
```

**`apps/mobile/context/AuthContext.tsx`**:
```typescript
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@repo/types'
import * as auth from '../lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    auth.getCurrentUser().then(user => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  const login = async (email: string, password: string) => {
    const user = await auth.login(email, password)
    setUser(user)
  }

  const logout = async () => {
    await auth.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

---

## Pattern 2: Data Fetching Strategies

### Server Components (Web Only)

**When to use**: Initial page loads, SEO-critical content, data that doesn't change often

**`apps/web/app/dashboard/page.tsx`**:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@repo/db'
import { PostList } from './PostList'

// This is a Server Component (default in app directory)
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Fetch data directly on the server
  const posts = await prisma.post.findMany({
    where: { authorId: session.user.id },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return (
    <div>
      <h1>Your Posts</h1>
      {/* Pass server-fetched data to client component */}
      <PostList initialPosts={posts} />
    </div>
  )
}
```

**Why this is powerful**:
- No client-side loading state
- No layout shift (data ready on first paint)
- Better SEO (content in HTML)
- Reduced client bundle (no fetch code)

---

### Client Components with SWR

**When to use**: Real-time data, user interactions, data that changes frequently

**`apps/web/app/dashboard/PostList.tsx`**:
```typescript
'use client'

import useSWR from 'swr'
import { Post } from '@repo/types'
import { getPosts } from '@repo/api'

interface PostListProps {
  initialPosts: Post[]
}

export function PostList({ initialPosts }: PostListProps) {
  // Use initialPosts for instant render, then revalidate
  const { data: posts, mutate } = useSWR(
    '/api/posts',
    getPosts,
    {
      fallbackData: initialPosts,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  async function handleDelete(id: string) {
    // Optimistic update
    mutate(
      posts?.filter(p => p.id !== id),
      false // Don't revalidate immediately
    )

    // Delete on server
    await deletePost(id)

    // Revalidate from server
    mutate()
  }

  return (
    <div>
      {posts?.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onDelete={() => handleDelete(post.id)}
        />
      ))}
    </div>
  )
}
```

---

### Mobile Data Fetching

**`apps/mobile/hooks/usePosts.ts`**:
```typescript
import { useEffect, useState } from 'react'
import { getPosts } from '@repo/api'
import { Post } from '@repo/types'

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    try {
      setLoading(true)
      const data = await getPosts()
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load posts'))
    } finally {
      setLoading(false)
    }
  }

  async function refetch() {
    await loadPosts()
  }

  return { posts, loading, error, refetch }
}
```

**Usage**:
```typescript
import { usePosts } from '../hooks/usePosts'

export function FeedScreen() {
  const { posts, loading, error, refetch } = usePosts()

  if (loading) return <Loading />
  if (error) return <Error message={error.message} />

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    />
  )
}
```

---

## Pattern 3: Real-Time Features

### Option 1: Server-Sent Events (SSE) - Simpler

**Best for**: One-way updates (notifications, live feeds)

**`apps/web/app/api/events/route.ts`**:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      )

      // Set up interval to check for new notifications
      const interval = setInterval(async () => {
        const notifications = await prisma.notification.findMany({
          where: {
            userId: session.user.id,
            read: false
          },
          orderBy: { createdAt: 'desc' }
        })

        if (notifications.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'notifications',
              data: notifications
            })}\n\n`)
          )
        }
      }, 5000) // Check every 5 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Client**:
```typescript
'use client'

import { useEffect, useState } from 'react'

export function NotificationBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'notifications') {
        setCount(data.data.length)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <div className="relative">
      <BellIcon />
      {count > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  )
}
```

---

### Option 2: WebSocket - Full Duplex

**Best for**: Chat, collaboration, live editing

**Install**:
```bash
pnpm add ws @types/ws
```

**`apps/web/server/websocket.ts`**:
```typescript
import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'

interface Client {
  ws: WebSocket
  userId: string
}

const clients = new Map<string, Client>()

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const userId = req.headers['user-id'] as string

    if (!userId) {
      ws.close()
      return
    }

    // Register client
    clients.set(userId, { ws, userId })

    // Handle messages
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString())

      if (message.type === 'chat') {
        // Broadcast to all clients
        broadcast({
          type: 'chat',
          from: userId,
          message: message.content,
          timestamp: Date.now()
        })
      }
    })

    // Handle disconnect
    ws.on('close', () => {
      clients.delete(userId)
    })
  })
}

function broadcast(message: any) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message))
    }
  })
}

export function sendToUser(userId: string, message: any) {
  const client = clients.get(userId)
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message))
  }
}
```

---

## Pattern 4: Error Handling

### Error Boundaries (React 18+)

**`apps/web/components/ErrorBoundary.tsx`**:
```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to error reporting service (Sentry)
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Usage**:
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Page() {
  return (
    <ErrorBoundary>
      <FeedComponent />
    </ErrorBoundary>
  )
}
```

---

### API Error Handling

**`packages/api/src/client.ts`**:
```typescript
import ky, { HTTPError } from 'ky'

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const api = ky.create({
  prefixUrl: API_URL,
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new APIError(
            response.status,
            body.code || 'UNKNOWN_ERROR',
            body.message || 'An error occurred'
          )
        }
      }
    ]
  }
})
```

**Usage with error handling**:
```typescript
import { APIError } from '@repo/api'

async function handleSubmit() {
  try {
    await createPost(data)
    toast.success('Post created!')
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 401) {
        router.push('/login')
      } else if (error.status === 400) {
        toast.error(error.message)
      } else {
        toast.error('Something went wrong')
      }
    }
  }
}
```

---

## Pattern 5: Performance Optimization

### Image Optimization

**Web (Next.js)**:
```typescript
import Image from 'next/image'

<Image
  src={post.imageUrl}
  alt={post.title}
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL={post.blurHash}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
/>
```

**Mobile (Expo)**:
```typescript
import { Image } from 'expo-image'

<Image
  source={{ uri: post.imageUrl }}
  style={{ width: 400, height: 300 }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

### Code Splitting

**Dynamic imports**:
```typescript
import dynamic from 'next/dynamic'

// Lazy load heavy component
const Editor = dynamic(() => import('./Editor'), {
  loading: () => <Skeleton />,
  ssr: false // Don't render on server
})

// Lazy load only when needed
const Analytics = dynamic(() => import('./Analytics'), {
  loading: () => null,
  ssr: false
})

export function PostEditor() {
  const [showAnalytics, setShowAnalytics] = useState(false)

  return (
    <div>
      <Editor />
      {showAnalytics && <Analytics />}
    </div>
  )
}
```

---

### Database Query Optimization

**Bad**: N+1 queries
```typescript
// Fetches posts, then makes a query for each post's author
const posts = await prisma.post.findMany()
for (const post of posts) {
  post.author = await prisma.user.findUnique({ where: { id: post.authorId } })
}
```

**Good**: Single query with include
```typescript
// One query, includes author for each post
const posts = await prisma.post.findMany({
  include: {
    author: true
  }
})
```

---

## Summary

**Key Patterns Covered**:

1. **Authentication**: NextAuth.js for web, SecureStore for mobile
2. **Data Fetching**: Server Components + SWR for web, custom hooks for mobile
3. **Real-Time**: SSE for simple updates, WebSocket for collaboration
4. **Error Handling**: Error boundaries + API error classes
5. **Performance**: Image optimization, code splitting, query optimization

**Remember**:
- Start simple, add complexity only when needed
- Measure performance before optimizing
- Handle errors gracefully
- Test on real devices (mobile)

In the next lecture, we'll cover deployment strategies for Vercel and EAS.

---

**Time to Complete**: 1-2 hours
**Recommended Reading**: [Next.js Patterns](https://nextjs.org/docs/app/building-your-application), [Expo Best Practices](https://docs.expo.dev/guides/)
