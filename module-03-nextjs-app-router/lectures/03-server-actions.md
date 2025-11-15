# Lecture 3: Server Actions & Mutations

## Introduction

Server Actions allow you to run server-side code directly from your components, providing a seamless way to handle mutations, form submissions, and data updates without building API routes.

## Defining Server Actions

### Basic Server Action

```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  const post = await db.post.create({
    data: { title, content },
  })

  revalidatePath('/posts')
  return { success: true, postId: post.id }
}
```

### Inline Server Actions

```typescript
// app/posts/page.tsx
export default function Page() {
  async function create(formData: FormData) {
    'use server'

    const title = formData.get('title') as string
    await db.post.create({ data: { title } })
    revalidatePath('/posts')
  }

  return (
    <form action={create}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  )
}
```

## Form Handling

### Progressive Enhancement

```typescript
// Works without JavaScript!
export default function CreatePostForm() {
  async function createPost(formData: FormData) {
    'use server'

    const title = formData.get('title') as string
    const content = formData.get('content') as string

    await db.post.create({
      data: { title, content },
    })

    redirect('/posts')
  }

  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

### With Client-Side Enhancement

```typescript
// app/posts/new/page.tsx
'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createPost } from './actions'

export default function CreatePostForm() {
  const [state, formAction] = useFormState(createPost, { message: '' })

  return (
    <form action={formAction}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
      {state.message && <p>{state.message}</p>}
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Post'}
    </button>
  )
}

// app/posts/new/actions.ts
'use server'

export async function createPost(prevState: any, formData: FormData) {
  try {
    const title = formData.get('title') as string
    const content = formData.get('content') as string

    await db.post.create({
      data: { title, content },
    })

    revalidatePath('/posts')
    return { message: 'Post created successfully!' }
  } catch (error) {
    return { message: 'Failed to create post' }
  }
}
```

## Revalidation

### Path Revalidation

```typescript
'use server'

import { revalidatePath } from 'next/cache'

export async function updatePost(id: string, data: PostData) {
  await db.post.update({
    where: { id },
    data,
  })

  // Revalidate specific path
  revalidatePath('/posts')
  revalidatePath(`/posts/${id}`)
}
```

### Tag Revalidation

```typescript
// Fetch with tag
async function getPosts() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }
  })
  return posts.json()
}

// Revalidate by tag
'use server'

import { revalidateTag } from 'next/cache'

export async function createPost(data: PostData) {
  await db.post.create({ data })

  // Revalidates all fetches tagged with 'posts'
  revalidateTag('posts')
}
```

### Revalidate Entire Route

```typescript
'use server'

export async function updateSettings(settings: Settings) {
  await db.settings.update({ data: settings })

  // Revalidate all routes
  revalidatePath('/', 'layout')
}
```

## Type-Safe Server Actions

### With Zod Validation

```typescript
// app/actions.ts
'use server'

import { z } from 'zod'

const CreatePostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1),
  published: z.boolean().default(false),
})

export async function createPost(formData: FormData) {
  const validatedFields = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'on',
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { title, content, published } = validatedFields.data

  await db.post.create({
    data: { title, content, published },
  })

  revalidatePath('/posts')
  redirect('/posts')
}
```

### Typed Return Values

```typescript
type ActionResult = {
  success: boolean
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export async function updateProfile(
  formData: FormData
): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string

    if (!name) {
      return {
        success: false,
        errors: { name: ['Name is required'] },
      }
    }

    const user = await db.user.update({
      where: { id: '...' },
      data: { name },
    })

    revalidatePath('/profile')

    return {
      success: true,
      message: 'Profile updated',
      data: user,
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to update profile',
    }
  }
}
```

## Optimistic Updates

### With useOptimistic

```typescript
// app/posts/[id]/page.tsx
'use client'

import { useOptimistic } from 'react'
import { likePost } from './actions'

export function Post({ post }: { post: Post }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    post.likes,
    (state, newLikes: number) => state + newLikes
  )

  async function handleLike() {
    addOptimisticLike(1) // Instant UI update
    await likePost(post.id) // Server update
  }

  return (
    <div>
      <h1>{post.title}</h1>
      <button onClick={handleLike}>
        ❤️ {optimisticLikes}
      </button>
    </div>
  )
}

// app/posts/[id]/actions.ts
'use server'

export async function likePost(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: { likes: { increment: 1 } },
  })

  revalidatePath(`/posts/${postId}`)
}
```

### Optimistic List Updates

```typescript
'use client'

import { useOptimistic } from 'react'
import { deletePost } from './actions'

export function PostList({ posts }: { posts: Post[] }) {
  const [optimisticPosts, removeOptimisticPost] = useOptimistic(
    posts,
    (state, deletedId: string) => state.filter(p => p.id !== deletedId)
  )

  async function handleDelete(id: string) {
    removeOptimisticPost(id) // Remove from UI immediately
    await deletePost(id) // Delete on server
  }

  return (
    <ul>
      {optimisticPosts.map(post => (
        <li key={post.id}>
          {post.title}
          <button onClick={() => handleDelete(post.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

## Error Handling

### Try-Catch Pattern

```typescript
'use server'

export async function createPost(formData: FormData) {
  try {
    const title = formData.get('title') as string

    if (!title) {
      return { error: 'Title is required' }
    }

    await db.post.create({
      data: { title },
    })

    revalidatePath('/posts')
    return { success: true }
  } catch (error) {
    console.error('Failed to create post:', error)
    return { error: 'Failed to create post' }
  }
}
```

### With Error Boundaries

```typescript
// app/posts/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Failed to load posts</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Authentication & Authorization

### Checking Auth in Server Actions

```typescript
'use server'

import { auth } from '@/lib/auth'

export async function createPost(formData: FormData) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const title = formData.get('title') as string

  await db.post.create({
    data: {
      title,
      authorId: session.user.id,
    },
  })

  revalidatePath('/posts')
}
```

### Role-Based Actions

```typescript
'use server'

export async function deletePost(postId: string) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const post = await db.post.findUnique({
    where: { id: postId },
  })

  if (post.authorId !== session.user.id && session.user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  await db.post.delete({
    where: { id: postId },
  })

  revalidatePath('/posts')
}
```

## Advanced Patterns

### Batch Actions

```typescript
'use server'

export async function bulkDeletePosts(postIds: string[]) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Forbidden')
  }

  await db.post.deleteMany({
    where: {
      id: { in: postIds },
    },
  })

  revalidatePath('/posts')
  return { deleted: postIds.length }
}
```

### Conditional Revalidation

```typescript
'use server'

export async function updatePost(
  postId: string,
  data: Partial<Post>,
  shouldPublish: boolean
) {
  await db.post.update({
    where: { id: postId },
    data,
  })

  // Only revalidate if publishing
  if (shouldPublish && data.published) {
    revalidatePath('/posts')
    revalidatePath(`/posts/${postId}`)
  }
}
```

### Server Actions with Streaming

```typescript
'use server'

export async function generateReport() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 100; i++) {
        const chunk = `Processing ${i}%\n`
        controller.enqueue(encoder.encode(chunk))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      controller.close()
    },
  })

  return new Response(stream)
}
```

## Performance Best Practices

### Minimize Data Sent

```typescript
// ❌ Bad: Sending entire object
'use server'
export async function updateUser(user: User) {
  // ...
}

// ✅ Good: Only send what's needed
'use server'
export async function updateUserName(userId: string, name: string) {
  // ...
}
```

### Avoid Unnecessary Revalidations

```typescript
// ❌ Bad: Revalidating on every action
'use server'
export async function incrementView(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: { views: { increment: 1 } },
  })
  revalidatePath('/posts') // Unnecessary!
}

// ✅ Good: No revalidation for analytics
'use server'
export async function incrementView(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: { views: { increment: 1 } },
  })
  // No revalidation needed
}
```

## Summary

**Key Concepts**:

1. **Server Actions** - Run server code from components
2. **Progressive Enhancement** - Works without JS
3. **useFormState** - Client-side form state
4. **useFormStatus** - Pending states
5. **Revalidation** - Path, tag, and layout revalidation
6. **useOptimistic** - Instant UI updates
7. **Type Safety** - Zod validation
8. **Authentication** - Check auth in actions

**Best Practices**:
- Validate inputs with Zod
- Use optimistic updates for better UX
- Revalidate only what changed
- Handle errors gracefully
- Check authentication/authorization

**Next**: Lecture 4 covers advanced data patterns and caching.
