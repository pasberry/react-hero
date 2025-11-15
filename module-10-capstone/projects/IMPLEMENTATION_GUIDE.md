# Capstone Implementation Guide

## Introduction

This guide walks you through implementing a complete Social Media Platform capstone project from start to finish. While this guide focuses on the Social Media option, the patterns and practices apply to all capstone projects.

**What you'll build**:
- Full-stack social media app
- Web app (Next.js 14+)
- Mobile app (Expo)
- Real-time notifications
- Image uploads
- Following system

**Time estimate**: 80-120 hours over 2-3 weeks

---

## Phase 1: Foundation (Week 1 - Days 1-3)

### Day 1: Monorepo Setup (4-6 hours)

✅ **Step 1**: Initialize monorepo
```bash
mkdir social-app
cd social-app
pnpm init
pnpm add -Dw turbo prettier
```

✅ **Step 2**: Create workspace configuration

Follow Lecture 2 to set up:
- `pnpm-workspace.yaml`
- `turbo.json`
- Root `package.json`
- `.gitignore`

✅ **Step 3**: Create shared config packages
- `packages/typescript-config`
- `packages/eslint-config`

✅ **Step 4**: Initialize apps
```bash
cd apps
pnpx create-next-app@latest web --typescript --tailwind --app
pnpx create-expo-app mobile --template blank-typescript
```

✅ **Checkpoint**: Run `pnpm dev` - both apps should start

---

### Day 2: Database & Schema (4-6 hours)

✅ **Step 1**: Install Prisma
```bash
pnpm add -w prisma @prisma/client
pnpx prisma init
```

✅ **Step 2**: Define schema

**`prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  username      String    @unique
  bio           String?
  avatar        String?
  hashedPassword String?
  emailVerified DateTime?

  posts         Post[]
  comments      Comment[]
  likes         Like[]

  // Following system
  followers     Follow[]  @relation("followers")
  following     Follow[]  @relation("following")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([email])
  @@index([username])
}

model Post {
  id          String    @id @default(cuid())
  content     String
  imageUrl    String?

  author      User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String

  comments    Comment[]
  likes       Like[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([authorId])
  @@index([createdAt])
}

model Comment {
  id        String   @id @default(cuid())
  content   String

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String

  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String

  createdAt DateTime @default(now())

  @@index([postId])
  @@index([authorId])
}

model Like {
  id        String   @id @default(cuid())

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String

  createdAt DateTime @default(now())

  @@unique([postId, userId])
  @@index([postId])
  @@index([userId])
}

model Follow {
  id          String   @id @default(cuid())

  follower    User     @relation("following", fields: [followerId], references: [id], onDelete: Cascade)
  followerId  String

  following   User     @relation("followers", fields: [followingId], references: [id], onDelete: Cascade)
  followingId String

  createdAt   DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
```

✅ **Step 3**: Set up database
```bash
# Local PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Or use Vercel Postgres / Supabase
# Add DATABASE_URL to .env

# Run migration
pnpx prisma migrate dev --name init
pnpx prisma generate
```

✅ **Step 4**: Create database client package

**`packages/db/src/client.ts`**:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

✅ **Checkpoint**: Run `pnpx prisma studio` - database should be accessible

---

### Day 3: Authentication (6-8 hours)

✅ **Step 1**: Install NextAuth.js
```bash
pnpm --filter @repo/web add next-auth @auth/prisma-adapter bcryptjs
pnpm --filter @repo/web add -D @types/bcryptjs
```

✅ **Step 2**: Implement auth (see Lecture 3, Pattern 1)

Files to create:
- `apps/web/lib/auth.ts` - NextAuth configuration
- `apps/web/app/api/auth/[...nextauth]/route.ts` - Auth API route
- `apps/web/components/SessionProvider.tsx` - Client provider
- `apps/web/app/(auth)/login/page.tsx` - Login page
- `apps/web/app/(auth)/signup/page.tsx` - Signup page

✅ **Step 3**: Create signup API route

**`apps/web/app/api/auth/signup/route.ts`**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@repo/db'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(8)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, username, password } = signupSchema.parse(body)

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        username,
        hashedPassword
      }
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
```

✅ **Step 4**: Create login/signup forms

**`apps/web/app/(auth)/login/page.tsx`**:
```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })

    if (result?.error) {
      setError('Invalid credentials')
    } else {
      router.push('/feed')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 p-8">
        <h1 className="text-3xl font-bold">Log In</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Log In
        </button>

        <p className="text-center">
          Don't have an account?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  )
}
```

✅ **Step 5**: Mobile auth (see Lecture 3)

Create:
- `apps/mobile/lib/auth.ts` - Auth utilities
- `apps/mobile/context/AuthContext.tsx` - Auth provider
- `apps/mobile/app/(auth)/_layout.tsx` - Auth screens layout
- `apps/mobile/app/(auth)/login.tsx` - Login screen

✅ **Checkpoint**: Users can sign up and log in on both web and mobile

---

## Phase 2: Core Features (Week 1 Day 4 - Week 2)

### Day 4-5: Post Creation & Feed (8-10 hours)

✅ **Step 1**: Create posts API routes

**`apps/web/app/api/posts/route.ts`**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@repo/db'

export async function GET() {
  const posts = await prisma.post.findMany({
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return NextResponse.json(posts)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content, imageUrl } = await request.json()

  const post = await prisma.post.create({
    data: {
      content,
      imageUrl,
      authorId: session.user.id
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true
        }
      }
    }
  })

  return NextResponse.json(post)
}
```

✅ **Step 2**: Create feed page (Server Component)

**`apps/web/app/(dashboard)/feed/page.tsx`**:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@repo/db'
import { FeedClient } from './FeedClient'

export default async function FeedPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const posts = await prisma.post.findMany({
    include: {
      author: true,
      _count: {
        select: { likes: true, comments: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return <FeedClient initialPosts={posts} currentUserId={session.user.id} />
}
```

✅ **Step 3**: Create feed client component

**`apps/web/app/(dashboard)/feed/FeedClient.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { Post } from '@prisma/client'
import { CreatePostForm } from '@/components/CreatePostForm'
import { PostCard } from '@/components/PostCard'

interface FeedClientProps {
  initialPosts: Post[]
  currentUserId: string
}

export function FeedClient({ initialPosts, currentUserId }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts)

  function handlePostCreated(newPost: Post) {
    setPosts([newPost, ...posts])
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <CreatePostForm onPostCreated={handlePostCreated} />

      <div className="mt-8 space-y-4">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
```

✅ **Step 4**: Create post creation form

**`apps/web/components/CreatePostForm.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreatePostFormProps {
  onPostCreated: (post: any) => void
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      const post = await response.json()
      onPostCreated(post)
      setContent('')
      router.refresh()
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
        required
      />
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  )
}
```

✅ **Checkpoint**: Users can create and view posts

---

### Day 6-7: Likes & Comments (6-8 hours)

✅ **Step 1**: Create like API

**`apps/web/app/api/posts/[id]/like/route.ts`**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@repo/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create or delete like (toggle)
    const existing = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: params.id,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } })
      return NextResponse.json({ liked: false })
    } else {
      await prisma.like.create({
        data: {
          postId: params.id,
          userId: session.user.id
        }
      })
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
```

✅ **Step 2**: Add like button to PostCard

**`apps/web/components/PostCard.tsx`**:
```typescript
'use client'

import { useState } from 'react'
import { useOptimistic } from 'react'

export function PostCard({ post, currentUserId }) {
  const [likes, setLikes] = useState(post._count.likes)
  const [isLiked, setIsLiked] = useState(post.isLikedByCurrentUser)

  async function handleLike() {
    // Optimistic update
    setLikes(prev => isLiked ? prev - 1 : prev + 1)
    setIsLiked(prev => !prev)

    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
    } catch (error) {
      // Revert on error
      setLikes(prev => isLiked ? prev + 1 : prev - 1)
      setIsLiked(prev => !prev)
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      {/* Post header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={post.author.avatar || '/default-avatar.png'}
          alt={post.author.name}
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-semibold">{post.author.name}</p>
          <p className="text-sm text-gray-500">@{post.author.username}</p>
        </div>
      </div>

      {/* Post content */}
      <p className="mb-4">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-6 text-gray-600">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 ${
            isLiked ? 'text-red-600' : 'hover:text-red-600'
          }`}
        >
          <span>{isLiked ? '❤️' : '🤍'}</span>
          <span>{likes}</span>
        </button>

        <button className="flex items-center gap-2 hover:text-blue-600">
          <span>💬</span>
          <span>{post._count.comments}</span>
        </button>
      </div>
    </div>
  )
}
```

✅ **Checkpoint**: Users can like posts with optimistic updates

---

## Phase 3: Advanced Features (Week 2-3)

### Week 2: Following System (8-10 hours)

✅ **Implementation**:

1. Create follow/unfollow API routes
2. Add follow button to user profiles
3. Filter feed to show posts from followed users
4. Add "Suggested Users" sidebar

**Key files**:
- `apps/web/app/api/users/[id]/follow/route.ts`
- `apps/web/app/profile/[username]/page.tsx`
- `apps/web/components/FollowButton.tsx`

---

### Week 2-3: Image Uploads (6-8 hours)

✅ **Option 1: Cloudinary**

```bash
pnpm add cloudinary
```

**`apps/web/app/api/upload/route.ts`**:
```typescript
import { v2 as cloudinary } from 'cloudinary'
import { NextRequest, NextResponse } from 'next/server'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'posts' },
      (error, result) => {
        if (error) {
          resolve(NextResponse.json({ error: error.message }, { status: 500 }))
        } else {
          resolve(NextResponse.json({ url: result.secure_url }))
        }
      }
    ).end(buffer)
  })
}
```

---

### Week 3: Real-Time Notifications (8-10 hours)

See Lecture 3, Pattern 3 for full implementation.

**Key components**:
1. Server-Sent Events endpoint
2. Notification bell component
3. Notification model in database
4. Background job to create notifications

---

## Phase 4: Polish & Deploy (Week 3-4)

### Week 3: Testing & Optimization (10-12 hours)

✅ **Add tests**:
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

**Example test**:
```typescript
import { render, screen } from '@testing-library/react'
import { PostCard } from './PostCard'

describe('PostCard', () => {
  it('renders post content', () => {
    const post = {
      id: '1',
      content: 'Hello world',
      author: { name: 'John', username: 'john' },
      _count: { likes: 5, comments: 2 }
    }

    render(<PostCard post={post} currentUserId="1" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })
})
```

✅ **Optimize performance**:
- Add loading skeletons
- Implement infinite scroll
- Optimize images
- Add error boundaries

---

### Week 4: Deployment (8-10 hours)

✅ **Deploy web to Vercel**:
```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/web
vercel

# Set environment variables in Vercel dashboard
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
```

✅ **Deploy mobile with EAS**:
```bash
# Install EAS CLI
pnpm add -g eas-cli

# Configure EAS
cd apps/mobile
eas login
eas build:configure

# Build for iOS
eas build --platform ios --profile preview

# Build for Android
eas build --platform android --profile preview
```

✅ **Set up CI/CD**:

**`.github/workflows/ci.yml`**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

---

## Completion Checklist

### Functionality
- [ ] Users can sign up and log in
- [ ] Users can create posts with text/images
- [ ] Users can like and comment on posts
- [ ] Users can follow/unfollow others
- [ ] Feed shows posts from followed users
- [ ] Real-time notifications work
- [ ] Mobile app has feature parity with web

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (except where necessary)
- [ ] ESLint passing with no warnings
- [ ] Code is well-organized and modular
- [ ] Following React best practices

### Performance
- [ ] Web Vitals meet thresholds (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Images optimized (Next.js Image / expo-image)
- [ ] Bundle size optimized (code splitting)
- [ ] Mobile app starts in < 3s

### Deployment
- [ ] Web app deployed to Vercel
- [ ] Mobile app in TestFlight/Internal Testing
- [ ] Environment variables configured
- [ ] CI/CD pipeline working

### Documentation
- [ ] README with setup instructions
- [ ] Architecture diagram
- [ ] API documentation
- [ ] Deployment guide

---

## Common Issues & Solutions

### Issue: "Prisma Client not generated"
```bash
pnpx prisma generate
```

### Issue: "Module not found" in monorepo
```bash
# Clear all build caches
pnpm clean
rm -rf node_modules
pnpm install
```

### Issue: "NextAuth session undefined"
- Check `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Verify JWT callback returns user ID

### Issue: "Expo build fails"
- Check `eas.json` configuration
- Verify bundle identifier is unique
- Check all dependencies are compatible

---

## Next Steps After Completion

1. **Add advanced features**:
   - Stories (24-hour posts)
   - Direct messaging
   - Video posts
   - Hashtags and search

2. **Optimize further**:
   - Add caching layer (Redis)
   - Implement CDN for images
   - Add database indices
   - Implement pagination

3. **Scale up**:
   - Add rate limiting
   - Implement queue system (BullMQ)
   - Add monitoring (Sentry, LogRocket)
   - Set up analytics

---

**Congratulations!** You've built a production-ready, cross-platform social media application. You are now a **React Jedi Master**! 🎉

Use this foundation to build amazing products.
