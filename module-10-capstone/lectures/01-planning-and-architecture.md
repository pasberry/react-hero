# Lecture 1: Capstone Project Planning & Architecture

## Introduction

The capstone project is where you synthesize everything you've learned in this course into a single, production-ready, cross-platform application. This isn't just a coding exercise—it's your opportunity to demonstrate mastery of modern React development, from architecture decisions to deployment strategies.

## Why This Matters

In real-world development, you rarely start with a blank slate. You need to:
- **Make architectural decisions** that will support the app for years
- **Balance tradeoffs** between developer experience and performance
- **Choose the right tools** for the problem at hand
- **Plan for scale** even if you're starting small
- **Think cross-platform** from day one

This lecture guides you through the planning phase, helping you avoid common pitfalls and set yourself up for success.

---

## Step 1: Choose Your Project

### The Four Project Options

#### Option 1: Social Media Platform
**Complexity**: High
**Best for**: Demonstrating real-time features and complex state management

**Core Features**:
- User authentication and profiles
- Post creation with rich media (images, videos)
- Social graph (following/followers)
- Real-time notifications
- Feed algorithm (chronological or ranked)
- Comments and reactions

**Technical Challenges**:
- Real-time updates via WebSocket or SSE
- Optimistic UI updates for instant feedback
- Infinite scroll with pagination
- Image/video upload and optimization
- Complex state management (posts, users, relationships)

**Why Choose This**:
- Forces you to master real-time architectures
- Demonstrates complex data relationships
- Showcases performance optimization skills
- Great for portfolio (everyone understands social media)

---

#### Option 2: E-Commerce Marketplace
**Complexity**: Medium-High
**Best for**: Demonstrating business logic and payment integration

**Core Features**:
- Product catalog with search and filters
- Shopping cart and checkout flow
- Payment processing (Stripe integration)
- Order management and history
- Seller dashboard (if marketplace)
- Inventory management

**Technical Challenges**:
- Payment security and PCI compliance
- Cart state persistence
- Order state machines
- Search and filtering performance
- Inventory synchronization
- Transaction handling

**Why Choose This**:
- Real-world business application
- Demonstrates understanding of commerce flows
- Payment integration is valuable skill
- Clear success metrics (conversion funnel)

---

#### Option 3: Project Management Tool
**Complexity**: High
**Best for**: Demonstrating collaboration features and complex UI

**Core Features**:
- Project and task management
- Kanban board with drag-and-drop
- Team collaboration and assignments
- File attachments
- Real-time updates
- Time tracking

**Technical Challenges**:
- Drag-and-drop UX (react-beautiful-dnd or dnd-kit)
- Real-time collaboration (CRDT or operational transform)
- Complex permission system
- File upload and storage
- Offline support

**Why Choose This**:
- Demonstrates advanced UI patterns
- Showcases collaboration features
- Complex state management
- Great for B2B portfolio piece

---

#### Option 4: Content Platform (Blog/Documentation)
**Complexity**: Medium
**Best for**: Demonstrating content strategy and SEO

**Core Features**:
- MDX content rendering
- Search functionality (Algolia or Typesense)
- Comments and discussions
- Author dashboard
- Analytics and insights
- Newsletter integration

**Technical Challenges**:
- MDX compilation and rendering
- Search indexing and ranking
- SEO optimization
- Content versioning
- Performance (static generation)

**Why Choose This**:
- Demonstrates content-first architecture
- SEO mastery
- Static generation patterns
- Good for technical writing portfolio

---

### Decision Framework

Ask yourself:

1. **What interests me?** (You'll spend 80-120 hours on this)
2. **What demonstrates my target skills?** (Real-time? Payments? Content?)
3. **What's portfolio-worthy?** (What will impress hiring managers?)
4. **What's achievable in my timeline?** (Be realistic)

---

## Step 2: Architecture Planning

### The Monorepo Structure

**Why Monorepo?**
- **Shared code** between web and mobile
- **Atomic commits** across multiple packages
- **Unified tooling** and dependencies
- **Easier refactoring** (change propagates automatically)

**Recommended Structure**:

```
my-capstone/
├── apps/
│   ├── web/                    # Next.js 14+ App Router
│   │   ├── app/
│   │   │   ├── (auth)/        # Auth routes (login, signup)
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (dashboard)/   # Protected routes
│   │   │   │   ├── feed/
│   │   │   │   ├── profile/
│   │   │   │   └── settings/
│   │   │   ├── api/           # API routes
│   │   │   │   ├── auth/
│   │   │   │   └── webhooks/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/        # Web-specific components
│   │   ├── lib/              # Web-specific utilities
│   │   ├── public/           # Static assets
│   │   ├── styles/           # Global styles
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                # Expo App
│       ├── app/              # Expo Router
│       │   ├── (auth)/       # Auth screens
│       │   ├── (tabs)/       # Tab navigation
│       │   └── _layout.tsx
│       ├── components/       # Mobile-specific components
│       ├── lib/             # Mobile-specific utilities
│       ├── assets/          # Images, fonts
│       ├── app.config.ts
│       ├── eas.json
│       └── package.json
│
├── packages/
│   ├── ui/                   # Shared UI components
│   │   ├── src/
│   │   │   ├── primitives/  # Base components (Button, Input)
│   │   │   ├── patterns/    # Composite components (Card, Modal)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                  # API client
│   │   ├── src/
│   │   │   ├── client.ts    # HTTP client (axios/ky)
│   │   │   ├── auth.ts      # Auth endpoints
│   │   │   ├── posts.ts     # Post endpoints
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── db/                   # Database layer
│   │   ├── src/
│   │   │   ├── schema/      # Prisma/Drizzle schema
│   │   │   ├── queries/     # Reusable queries
│   │   │   ├── mutations/   # Reusable mutations
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   ├── types/                # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── models/      # Data models (User, Post, etc.)
│   │   │   ├── api/         # API request/response types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/               # Shared configuration
│       ├── eslint/          # ESLint configs
│       ├── typescript/      # TypeScript configs
│       └── package.json
│
├── turbo.json                # Turborepo configuration
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # PNPM workspaces
├── .gitignore
└── README.md
```

---

### Technology Stack Decisions

#### Frontend Web

**Next.js 14+ (Required)**
```typescript
// Why: React Server Components, Server Actions, Edge Runtime
// When to use RSC: Data fetching, initial render
// When to use Client: Interactivity, hooks, browser APIs

// Example: Server Component for feed
async function Feed() {
  const posts = await db.posts.findMany() // Server-side fetch
  return posts.map(post => <PostCard key={post.id} post={post} />)
}

// Example: Client Component for like button
'use client'
function LikeButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes)
  const [optimisticLikes, addOptimisticLike] = useOptimistic(likes)

  async function handleLike() {
    addOptimisticLike(likes + 1)
    await likePost(postId)
  }

  return <button onClick={handleLike}>{optimisticLikes} ❤️</button>
}
```

**Tailwind CSS (Required)**
```javascript
// Why: Utility-first, fast iteration, tiny runtime
// Performance: ~10KB gzipped (vs ~100KB for CSS-in-JS)

// tailwind.config.ts
export default {
  content: ['./app/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
      },
    },
  },
}
```

---

#### Frontend Mobile

**Expo SDK 50+ (Required)**
```typescript
// Why: Over-the-air updates, managed workflow, EAS Build
// When to use Expo: 95% of apps (unless you need custom native code)

// app.json
{
  "expo": {
    "name": "MyApp",
    "runtimeVersion": { "policy": "sdkVersion" },
    "updates": {
      "url": "https://u.expo.dev/[project-id]"
    },
    "plugins": [
      "expo-router",
      "expo-image",
      // Add native modules as needed
    ]
  }
}
```

**Expo Router (Required)**
```typescript
// Why: File-based routing like Next.js, type-safe navigation
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

---

#### Backend

**Choice 1: Next.js API Routes (Recommended for smaller apps)**
```typescript
// Why: Same deployment as frontend, serverless, easy
// When to use: <100k users, simple business logic

// app/api/posts/route.ts
export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  const post = await db.posts.create({
    data: {
      ...body,
      authorId: session.user.id,
    },
  })

  return Response.json(post)
}
```

**Choice 2: Separate Backend (Recommended for complex apps)**
```typescript
// Why: Independent scaling, different languages, microservices
// When to use: >100k users, complex business logic, team with backend devs

// Technologies:
// - Node.js + Express/Fastify
// - tRPC (type-safe API without codegen)
// - GraphQL (if you have complex data requirements)
// - WebSocket server for real-time features
```

---

#### Database

**Choice 1: PostgreSQL (Vercel Postgres or Supabase)**
```prisma
// Why: Relational data, ACID transactions, great for complex queries
// When to use: Structured data, relationships, financial data

// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  likes     Int      @default(0)
  createdAt DateTime @default(now())

  @@index([authorId])
}
```

**Choice 2: MongoDB (MongoDB Atlas)**
```typescript
// Why: Flexible schema, horizontal scaling, document model
// When to use: Unstructured data, rapid iteration, flexible schemas

interface User {
  _id: string
  email: string
  profile: {
    name: string
    avatar?: string
    bio?: string
    // Flexible: add fields without migrations
  }
  posts: string[] // Array of post IDs
}
```

---

#### State Management

**Server State (RSC + Server Actions)**
```typescript
// For: Data from database, authenticated state
// Why: Automatic caching, optimistic updates, no client bundle

// Server Component
async function UserProfile({ userId }) {
  const user = await db.users.findUnique({ where: { id: userId } })
  return <ProfileView user={user} />
}

// Server Action
async function updateProfile(formData: FormData) {
  'use server'
  const session = await getServerSession()
  await db.users.update({
    where: { id: session.user.id },
    data: { name: formData.get('name') }
  })
  revalidatePath('/profile')
}
```

**Client State (Zustand)**
```typescript
// For: UI state, form state, temporary data
// Why: Small bundle (~1KB), simple API, TypeScript-friendly

import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  theme: 'light',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}))
```

---

### Performance Targets

Set these targets from day one:

#### Web Vitals
```
LCP (Largest Contentful Paint): < 2.5s
FID (First Input Delay):        < 100ms
CLS (Cumulative Layout Shift):  < 0.1
```

**How to achieve**:
- Use Next.js Image component for all images
- Server Components for initial render
- Code splitting with dynamic imports
- Edge Runtime for API routes

#### Mobile Performance
```
App Startup Time:    < 3s (cold start)
Time to Interactive: < 2s
Frame Rate:          60 FPS (16.67ms per frame)
Bundle Size:         < 50MB
```

**How to achieve**:
- Use Hermes JavaScript engine
- Optimize FlatList with windowSize
- Use expo-image instead of RN Image
- Remove unused dependencies

---

## Step 3: Planning Timeline

### Week-by-Week Breakdown

**Weeks 1-2: Foundation** (16-24 hours)
- [ ] Set up monorepo with Turborepo
- [ ] Configure Next.js and Expo projects
- [ ] Set up database and schema
- [ ] Implement authentication
- [ ] Create shared UI component library (buttons, inputs, cards)
- [ ] Configure CI/CD pipeline

**Weeks 3-4: Core Features** (20-30 hours)
- [ ] Implement main data models
- [ ] Build core CRUD operations
- [ ] Create web dashboard UI
- [ ] Create mobile app screens
- [ ] Set up state management
- [ ] Add form validation

**Weeks 5-6: Advanced Features** (20-30 hours)
- [ ] Implement real-time features (WebSocket/SSE)
- [ ] Add file upload functionality
- [ ] Build search and filtering
- [ ] Implement notifications
- [ ] Add analytics tracking
- [ ] Optimize performance

**Weeks 7-8: Polish & Deploy** (20-30 hours)
- [ ] Write tests (unit + integration)
- [ ] Fix bugs and edge cases
- [ ] Optimize Web Vitals
- [ ] Deploy to Vercel (web)
- [ ] Deploy to EAS (mobile)
- [ ] Write documentation
- [ ] Create demo video

**Total**: 76-114 hours (adjust based on your speed)

---

## Step 4: Define Success Criteria

Before writing a single line of code, define what "done" looks like.

### Minimum Viable Product (MVP)

**Must Have**:
- ✅ User authentication working
- ✅ Core CRUD operations functional
- ✅ Web app deployed and accessible
- ✅ Mobile app running on TestFlight/Internal Testing
- ✅ No critical bugs
- ✅ Basic documentation

**Nice to Have**:
- Real-time features
- Advanced UI animations
- Comprehensive test coverage
- Performance monitoring

### Feature Prioritization Matrix

```
High Impact + Easy  → Do First (MVP)
High Impact + Hard  → Do Second (Core Features)
Low Impact + Easy   → Do Third (Polish)
Low Impact + Hard   → Skip (Stretch Goals)
```

**Example for Social Media App**:

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| User auth | High | Medium | 1 (MVP) |
| Create posts | High | Easy | 1 (MVP) |
| View feed | High | Easy | 1 (MVP) |
| Real-time notifications | High | Hard | 2 |
| Post reactions | Medium | Easy | 3 |
| Video posts | Low | Hard | 4 |

---

## Step 5: Risk Assessment

Identify potential blockers before they happen.

### Common Risks

**Technical Risks**:
1. **Real-time complexity** → Mitigation: Start with polling, upgrade to WebSocket later
2. **Authentication security** → Mitigation: Use proven library (NextAuth/Clerk)
3. **Cross-platform bugs** → Mitigation: Test on both platforms daily
4. **Performance issues** → Mitigation: Set budgets and measure from day one

**Timeline Risks**:
1. **Scope creep** → Mitigation: Stick to MVP, track stretch goals separately
2. **Underestimating complexity** → Mitigation: Add 25% buffer to estimates
3. **External dependencies** → Mitigation: Have backup plans for APIs/services

---

## Next Steps

✅ **Action Items**:

1. **Choose your project** (1 hour)
   - Review the four options
   - Decide based on interests and goals

2. **Sketch architecture** (2 hours)
   - Draw system diagram
   - List all data models
   - Define API endpoints

3. **Create project board** (1 hour)
   - Use GitHub Projects or Notion
   - Break down features into tasks
   - Estimate each task

4. **Set up development environment** (2 hours)
   - Initialize monorepo
   - Configure tools (ESLint, Prettier, TypeScript)
   - Create initial folder structure

---

## Summary

**Key Takeaways**:

1. **Choose a project that excites you** - You'll spend 80+ hours on this
2. **Plan architecture before coding** - Saves time in the long run
3. **Use proven technologies** - Not the time to experiment
4. **Set clear success criteria** - Know when you're done
5. **Manage risks proactively** - Anticipate problems

**Remember**: The capstone is not about building the perfect app. It's about demonstrating your mastery of modern React development. Focus on code quality, architecture, and deployment—not on building every feature imaginable.

In the next lecture, we'll dive into setting up the monorepo and configuring the development environment.

---

**Time to Complete This Lecture**: 30-45 minutes
**Recommended Reading**: [Next.js Commerce](https://github.com/vercel/commerce), [Cal.com Architecture](https://github.com/calcom/cal.com)
