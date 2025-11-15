# Lecture 1: Monorepo Setup with Turborepo

## Introduction

Building cross-platform applications—spanning web, iOS, and Android—presents a fundamental challenge: **how do you share code effectively without duplicating logic, components, and types?**

The traditional approach of maintaining separate repositories for each platform leads to:
- **Duplicated code**: The same Button component written 3 times
- **Drift**: Web and mobile implementations diverge over time
- **Slow iteration**: Coordinating changes across multiple repos requires multiple PRs, multiple CI runs, and manual synchronization
- **Type safety breakage**: Shared types defined in separate packages fall out of sync

**Monorepos solve this** by housing all platform apps and shared packages in a single repository with a unified build system. When you update a shared component or API client, all platforms get the update simultaneously with full type safety.

But monorepos introduce new challenges: **how do you prevent slow build times when the codebase grows large?** A naive monorepo might rebuild everything on every change, making development painfully slow.

**Turborepo solves this** through intelligent caching and parallel execution. It remembers previous build outputs and skips rebuilding unchanged packages, making monorepo builds as fast as single-app builds.

This lecture teaches you how to set up a production-grade monorepo for React Native (Expo) and Next.js web apps using Turborepo, achieving code sharing without sacrificing performance.

---

## Why Monorepos for Cross-Platform Development?

### The Problem: Code Duplication Across Platforms

Imagine you're building a food delivery app with web and mobile versions. You need:

1. **Shared UI Components**: Button, Card, TextField (same design system)
2. **Shared Business Logic**: Order validation, price calculations, cart management
3. **Shared Types**: `Order`, `Restaurant`, `User` interfaces
4. **Shared API Client**: REST/GraphQL client with authentication

**Polyrepo approach (separate repos)**:

```
food-delivery-web/       (Next.js)
├── components/Button.tsx
├── utils/validateOrder.ts
├── types/Order.ts
└── api/orderClient.ts

food-delivery-mobile/    (React Native)
├── components/Button.tsx
├── utils/validateOrder.ts
├── types/Order.ts
└── api/orderClient.ts
```

**Problems**:
- **100% duplication**: Every file copied manually
- **Drift**: Mobile team changes `validateOrder()` logic, web team doesn't know
- **Type breakage**: API changes `Order.status` from string to enum, mobile updates but web doesn't, runtime errors occur
- **Coordination overhead**: Updating Button requires 2 PRs, 2 reviews, 2 CI runs

**Monorepo approach**:

```
food-delivery/
├── apps/
│   ├── web/              # Next.js (imports from packages/)
│   └── mobile/           # Expo (imports from packages/)
└── packages/
    ├── ui/               # Shared components
    ├── business-logic/   # Shared validation/calculations
    ├── types/            # Shared TypeScript types
    └── api-client/       # Shared API client
```

**Benefits**:
- **Single source of truth**: One `Button`, one `validateOrder`, one `Order` type
- **Atomic changes**: Update types and all consuming apps in one commit
- **Type safety**: TypeScript ensures all apps use updated types
- **Instant synchronization**: No coordination needed between teams

### Real-World Example: Microsoft Teams

Microsoft Teams uses a monorepo for web, desktop, and mobile:
- **1.2M+ lines of shared code** (UI components, business logic)
- **Build time**: 45 seconds for full rebuild (was 20 minutes before Turborepo)
- **Developer experience**: Change shared component → all platforms rebuild automatically
- **Result**: 3x faster feature development

---

## Monorepo vs Polyrepo: When to Use Each

| Aspect | Monorepo | Polyrepo |
|--------|----------|----------|
| **Code sharing** | Easy (import from packages) | Hard (npm publish workflow) |
| **Atomic changes** | Yes (single commit) | No (multiple PRs) |
| **Type safety** | Guaranteed across all apps | Can break between repos |
| **Build complexity** | Higher (need orchestration) | Lower (independent builds) |
| **Onboarding** | Slower (larger codebase) | Faster (focused repos) |
| **Team boundaries** | Flexible (shared ownership) | Strict (repo = team boundary) |
| **Best for** | Cross-platform apps, shared libraries | Microservices, separate products |

**Use monorepo when**:
✅ Building web + mobile versions of same product
✅ Sharing UI components across platforms
✅ Need atomic updates to shared code
✅ Small-to-medium team (1-50 developers)

**Use polyrepo when**:
✅ Completely independent products
✅ Separate teams with no code sharing
✅ Need strict access control per repo
✅ Publishing standalone npm packages

---

## Turborepo Architecture

Turborepo is a **build orchestrator** that runs tasks (build, test, lint) across packages in the optimal order with intelligent caching.

### How Turborepo Works

```
┌─────────────────────────────────────────────────────────────┐
│                         Turborepo                           │
│                                                             │
│  ┌───────────────┐     ┌──────────────┐     ┌───────────┐  │
│  │  Dependency   │────▶│ Task Graph   │────▶│  Executor │  │
│  │   Analysis    │     │  Generator   │     │  (Parallel)│  │
│  └───────────────┘     └──────────────┘     └───────────┘  │
│         │                      │                    │       │
│         ▼                      ▼                    ▼       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Cache (Local + Remote)                   │  │
│  │  - Content-based hashing                             │  │
│  │  - Automatic invalidation                            │  │
│  │  - Shared across team                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Key features**:

1. **Dependency Graph**: Analyzes `package.json` dependencies to determine build order
2. **Task Pipeline**: Defines which tasks depend on others (e.g., `test` depends on `build`)
3. **Content Hashing**: Hashes file contents + inputs to determine if rebuild is needed
4. **Parallel Execution**: Runs independent tasks simultaneously (e.g., build `ui` and `api-client` in parallel)
5. **Local Cache**: Stores build outputs in `.turbo/cache/`
6. **Remote Cache**: Shares cache across team via Vercel or custom server

### Performance Example

**Without Turborepo** (naive monorepo):
```bash
# Change one line in packages/ui/Button.tsx
npm run build

# Rebuilds EVERYTHING:
- packages/ui      (2 minutes)
- packages/types   (1 minute)
- packages/api     (3 minutes)
- apps/web         (4 minutes)
- apps/mobile      (5 minutes)
Total: 15 minutes 😱
```

**With Turborepo**:
```bash
turbo run build

# Cache hit for unchanged packages:
- packages/types   ✓ (cached, 0s)
- packages/api     ✓ (cached, 0s)
- apps/mobile      ✓ (cached, 0s)

# Rebuilds only changed packages:
- packages/ui      (2 minutes)
- apps/web         (4 minutes, depends on ui)

Total: 6 minutes (60% faster)
```

**With remote cache** (teammate already built this):
```bash
turbo run build

# All packages cache hit from remote:
Total: 8 seconds ⚡
```

---

## Setting Up a Turborepo Monorepo

### Step 1: Initialize Turborepo

```bash
# Create new monorepo
npx create-turbo@latest my-app

# Select options:
? Where would you like to create your turborepo? my-app
? Which package manager do you want to use? pnpm (recommended)

cd my-app
```

**Why pnpm?**
- **Faster installs**: Hardlinks instead of copying (3x faster than npm)
- **Disk space**: Deduplicates packages globally (70% less space)
- **Strict**: Prevents phantom dependencies (only declared deps are accessible)

### Step 2: Project Structure

```
my-app/
├── apps/
│   ├── web/                    # Next.js web app
│   │   ├── package.json
│   │   ├── pages/
│   │   └── tsconfig.json
│   └── mobile/                 # Expo mobile app
│       ├── package.json
│       ├── app.json
│       ├── App.tsx
│       └── tsconfig.json
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── package.json
│   │   ├── Button.tsx
│   │   ├── Button.native.tsx
│   │   └── index.ts
│   ├── types/                  # Shared TypeScript types
│   │   ├── package.json
│   │   └── index.ts
│   ├── api-client/             # Shared API client
│   │   ├── package.json
│   │   └── index.ts
│   └── config/                 # Shared configs (ESLint, TS)
│       ├── package.json
│       ├── eslint-preset.js
│       └── tsconfig.json
├── turbo.json                  # Turborepo configuration
├── package.json                # Root package.json
└── pnpm-workspace.yaml         # Workspace configuration
```

**apps/** = Deployable applications (Next.js, Expo)
**packages/** = Shared libraries imported by apps

### Step 3: Configure Workspaces

**pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Root package.json**:
```json
{
  "name": "my-app-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "prettier": "^3.0.0"
  },
  "packageManager": "pnpm@8.6.0"
}
```

### Step 4: Configure Turborepo Pipeline

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  },
  "globalDependencies": [
    ".env",
    "tsconfig.json"
  ]
}
```

**Pipeline explanation**:

1. **`"dependsOn": ["^build"]`**: Run `build` in dependencies first
   - `^` means "upstream dependencies"
   - Example: Before building `apps/web`, build `packages/ui` and `packages/types`

2. **`"outputs"`**: Files to cache
   - `.next/**`: Next.js build output
   - `dist/**`: Package build output
   - If outputs haven't changed, skip rebuilding

3. **`"cache": false`**: Don't cache `test` or `dev` tasks
   - Tests should always run (might be flaky)
   - Dev server can't be cached (it's persistent)

4. **`"persistent": true`**: Task runs indefinitely (dev servers)

5. **`"globalDependencies"`**: Files that invalidate all caches when changed
   - `.env`: Environment variables affect all builds
   - `tsconfig.json`: TypeScript config affects all packages

---

## Creating Shared Packages

### Package 1: Shared TypeScript Types

**packages/types/package.json**:
```json
{
  "name": "@my-app/types",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts"
}
```

**packages/types/index.ts**:
```typescript
export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'confirmed' | 'delivered'
  createdAt: Date
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
}

// Shared validation types
export type ValidationError = {
  field: string
  message: string
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError }
```

### Package 2: Shared UI Components

**packages/ui/package.json**:
```json
{
  "name": "@my-app/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

**packages/ui/Button.tsx** (Web implementation):
```typescript
import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      className={`btn btn-${variant}`}
      style={{
        padding: '12px 24px',
        borderRadius: 8,
        backgroundColor: variant === 'primary' ? '#007AFF' : '#F0F0F0',
        color: variant === 'primary' ? 'white' : 'black',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  )
}
```

**packages/ui/Button.native.tsx** (React Native implementation):
```typescript
import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { ButtonProps } from './Button'

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        disabled && styles.disabled
      ]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' ? styles.primaryText : styles.secondaryText
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primary: {
    backgroundColor: '#007AFF'
  },
  secondary: {
    backgroundColor: '#F0F0F0'
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    fontSize: 16,
    fontWeight: '600'
  },
  primaryText: {
    color: 'white'
  },
  secondaryText: {
    color: 'black'
  }
})
```

**How platform-specific extensions work**:

When importing `Button` from web (Next.js):
```typescript
import { Button } from '@my-app/ui'
// Resolves to: Button.tsx (web version)
```

When importing from mobile (Expo):
```typescript
import { Button } from '@my-app/ui'
// Resolves to: Button.native.tsx (React Native version)
```

Metro bundler (React Native) and Webpack (Next.js) automatically select the correct file based on the `.native.tsx` extension.

**packages/ui/index.ts**:
```typescript
export { Button } from './Button'
export type { ButtonProps } from './Button'
// Export more components as you add them
```

### Package 3: Shared API Client

**packages/api-client/package.json**:
```json
{
  "name": "@my-app/api-client",
  "version": "0.0.0",
  "private": true,
  "main": "./index.ts",
  "dependencies": {
    "@my-app/types": "*",
    "axios": "^1.4.0"
  }
}
```

**packages/api-client/index.ts**:
```typescript
import axios from 'axios'
import type { User, Order } from '@my-app/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Authentication
export async function login(email: string, password: string): Promise<User> {
  const response = await apiClient.post<User>('/auth/login', { email, password })
  return response.data
}

// Orders
export async function getOrders(userId: string): Promise<Order[]> {
  const response = await apiClient.get<Order[]>(`/orders?userId=${userId}`)
  return response.data
}

export async function createOrder(order: Omit<Order, 'id'>): Promise<Order> {
  const response = await apiClient.post<Order>('/orders', order)
  return response.data
}
```

**Key benefits**:
- **Single API client** used by web and mobile
- **Type safety**: Returns `User` and `Order` from shared types package
- **Environment variables**: Web and mobile can use different API URLs

---

## Using Shared Packages in Apps

### Web App (Next.js)

**apps/web/package.json**:
```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^13.4.0",
    "react": "^18.2.0",
    "@my-app/ui": "*",
    "@my-app/types": "*",
    "@my-app/api-client": "*"
  }
}
```

**apps/web/pages/index.tsx**:
```typescript
import { useState, useEffect } from 'react'
import { Button } from '@my-app/ui'
import { getOrders } from '@my-app/api-client'
import type { Order } from '@my-app/types'

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    getOrders('user-123').then(setOrders)
  }, [])

  return (
    <div>
      <h1>My Orders</h1>
      {orders.map(order => (
        <div key={order.id}>
          <p>Order #{order.id}</p>
          <p>Status: {order.status}</p>
          <p>Total: ${order.total}</p>
        </div>
      ))}

      <Button onPress={() => alert('Create new order')}>
        New Order
      </Button>
    </div>
  )
}
```

### Mobile App (Expo)

**apps/mobile/package.json**:
```json
{
  "name": "mobile",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "expo start",
    "build": "expo export"
  },
  "dependencies": {
    "expo": "^49.0.0",
    "react": "^18.2.0",
    "react-native": "^0.72.0",
    "@my-app/ui": "*",
    "@my-app/types": "*",
    "@my-app/api-client": "*"
  }
}
```

**apps/mobile/App.tsx**:
```typescript
import { useState, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { Button } from '@my-app/ui'
import { getOrders } from '@my-app/api-client'
import type { Order } from '@my-app/types'

export default function App() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    getOrders('user-123').then(setOrders)
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text>Order #{item.id}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Total: ${item.total}</Text>
          </View>
        )}
      />

      <Button onPress={() => alert('Create new order')}>
        New Order
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  orderCard: {
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  }
})
```

**Notice**: Both web and mobile import the exact same packages:
- `@my-app/ui` → Platform-specific Button is automatically selected
- `@my-app/api-client` → Same API client logic
- `@my-app/types` → Same TypeScript types ensuring consistency

---

## Development Workflow

### Running Tasks

```bash
# Run all dev servers in parallel
pnpm dev
# Starts:
# - apps/web (Next.js on http://localhost:3000)
# - apps/mobile (Expo on exp://localhost:8081)

# Build all apps and packages
pnpm build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint
```

### Filtering Tasks (Run Specific Apps/Packages)

```bash
# Run dev for web app only
pnpm turbo run dev --filter=web

# Build mobile app only
pnpm turbo run build --filter=mobile

# Run tests for ui package only
pnpm turbo run test --filter=@my-app/ui

# Build everything that depends on ui package
pnpm turbo run build --filter=...@my-app/ui
```

### Affected Packages (Only Build What Changed)

```bash
# Build only packages affected since last commit
pnpm turbo run build --filter=[HEAD^1]

# Build packages affected since main branch
pnpm turbo run build --filter=[origin/main]
```

**Use case**: In CI, only test packages that changed in the PR.

---

## Caching Strategy

### Local Cache

Turborepo caches task outputs in `.turbo/cache/`:

```
.turbo/
└── cache/
    ├── abc123.tar.gz  # Build output for packages/ui
    ├── def456.tar.gz  # Build output for apps/web
    └── ...
```

**How it works**:
1. Turbo hashes inputs (source files, dependencies, env vars)
2. Checks if hash exists in cache
3. If hit → Extract cached output (0.5s)
4. If miss → Run task, cache output (2 minutes)

**Example**:
```bash
# First build
pnpm build
# packages/ui: Building... (2 minutes)

# Second build (no changes)
pnpm build
# packages/ui: Cache hit! (0.5 seconds)
```

### Remote Cache (Vercel)

Share cache across team and CI:

```bash
# Login to Vercel
pnpm turbo login

# Link to remote cache
pnpm turbo link
```

**turbo.json**:
```json
{
  "remoteCache": {
    "enabled": true
  }
}
```

**Workflow**:
1. Developer A builds packages → Uploads to Vercel cache
2. Developer B pulls same commit → Downloads from Vercel cache (5 seconds instead of 10 minutes)
3. CI runs tests → Cache hit from Developer A's build

**Performance gain**:
- **First CI run**: 15 minutes (full build)
- **Subsequent runs**: 30 seconds (cache hit)

### Custom Remote Cache (Self-Hosted)

For companies that can't use Vercel:

**turbo.json**:
```json
{
  "remoteCache": {
    "enabled": true,
    "url": "https://cache.mycompany.com",
    "token": "process.env.TURBO_TOKEN"
  }
}
```

Host your own cache server using:
- [turbo-remote-cache](https://github.com/ducktors/turborepo-remote-cache) (open source)
- AWS S3 + CloudFront
- Google Cloud Storage

---

## Production Best Practices

### 1. Versioning Shared Packages

Use **Changesets** for semantic versioning:

```bash
pnpm add -D @changesets/cli
pnpm changeset init
```

**Create a changeset**:
```bash
pnpm changeset
# Select packages that changed
# Select version bump (patch/minor/major)
# Describe changes
```

**Release new versions**:
```bash
pnpm changeset version  # Update package.json versions
pnpm changeset publish  # Publish to npm (if public packages)
```

### 2. Continuous Integration

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm turbo run build --filter=[HEAD^1]

      - name: Test
        run: pnpm turbo run test --filter=[HEAD^1]

      - name: Lint
        run: pnpm turbo run lint
```

**Key points**:
- `--filter=[HEAD^1]`: Only build/test changed packages
- Turborepo automatically determines dependencies
- Remote cache speeds up CI by 10x

### 3. Deployment Strategy

**Web (Next.js)**:
```bash
# Deploy to Vercel
cd apps/web
vercel deploy --prod
```

**Mobile (Expo)**:
```bash
# Build production app
cd apps/mobile
eas build --platform all --profile production

# Submit to stores
eas submit --platform all
```

**Backend (if using)**:
```bash
# Deploy API server
cd apps/api
docker build -t my-app-api .
docker push registry.mycompany.com/my-app-api:latest
```

### 4. Environment Variables

**Root .env.local**:
```bash
# Shared across all apps
DATABASE_URL=postgresql://localhost:5432/myapp
NEXT_PUBLIC_API_URL=https://api.myapp.com
```

**App-specific .env.local**:
```bash
# apps/web/.env.local
NEXT_PUBLIC_ANALYTICS_ID=GA-123456

# apps/mobile/.env.local
EXPO_PUBLIC_ANALYTICS_ID=GA-789012
```

Turborepo automatically loads environment variables from:
1. Root `.env.local`
2. App-specific `.env.local`
3. Package-specific `.env.local`

---

## Real-World Case Study: Shopify

**Challenge**: Shopify needed to rebuild their mobile app (Point of Sale) and web app (Admin) with maximum code sharing.

**Solution**: Turborepo monorepo with:
- **Shared packages**: 15 packages (UI, API client, business logic)
- **Apps**: 3 apps (iOS, Android, Web)
- **Team size**: 120 developers

**Results**:
- **Code sharing**: 60% of code shared between platforms
- **Build time**: Reduced from 45 minutes → 8 minutes (with remote cache)
- **Type safety**: Zero runtime errors from API mismatches (shared types)
- **Developer velocity**: 2x faster feature development (atomic changes)

**Architecture**:
```
shopify-monorepo/
├── apps/
│   ├── pos-mobile/        # Expo app (Point of Sale)
│   ├── admin-web/         # Next.js (Shopify Admin)
│   └── storefront-web/    # Next.js (Public storefront)
└── packages/
    ├── ui/                # Polaris design system
    ├── graphql-client/    # GraphQL client + codegen
    ├── types/             # Shared TypeScript types
    ├── business-logic/    # Order processing, inventory
    └── utils/             # Date formatting, validation
```

**Key learnings**:
1. **Platform-specific components**: 70% shared, 30% platform-specific (`.native.tsx`)
2. **Gradual migration**: Started with types, then API client, then UI components
3. **Caching essential**: Remote cache saved 300 developer-hours per week
4. **Tooling investment**: Custom ESLint rules to prevent importing platform-specific code in shared packages

---

## Common Pitfalls and Solutions

### Problem 1: Circular Dependencies

**Symptom**: Build fails with "circular dependency detected".

**Cause**:
```
packages/ui imports packages/types
packages/types imports packages/ui  ❌
```

**Solution**: Create a dependency hierarchy:
```
Layer 1: types, utils (no dependencies)
Layer 2: api-client (depends on Layer 1)
Layer 3: ui (depends on Layer 1, 2)
Layer 4: apps (depends on all)
```

### Problem 2: Slow Builds Despite Caching

**Symptom**: Cache hits but builds still slow.

**Cause**: Too many `globalDependencies` invalidate cache unnecessarily.

**Solution**: Remove unnecessary global dependencies:
```json
{
  "globalDependencies": [
    // Don't include files that change frequently:
    // ".env.local"  ❌ (changes every commit)
    "tsconfig.json"  // ✅ (rarely changes)
  ]
}
```

### Problem 3: Type Errors in Monorepo

**Symptom**: TypeScript can't find types from shared packages.

**Solution**: Configure TypeScript paths in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@my-app/*": ["../../packages/*/src"]
    }
  }
}
```

---

## Summary

Turborepo monorepos solve the fundamental challenge of cross-platform development: **sharing code without sacrificing performance**.

**Key takeaways**:

1. **Monorepos enable atomic changes**: Update types, API client, and UI components in a single commit affecting all platforms simultaneously

2. **Turborepo makes monorepos fast**: Intelligent caching + parallel execution prevents slow builds as the codebase grows

3. **Platform-specific extensions** (`.native.tsx`) allow shared component APIs with platform-specific implementations

4. **Remote caching** multiplies productivity by sharing build outputs across the team and CI

5. **Real-world impact**: Companies like Shopify, Vercel, and Microsoft achieve 60%+ code sharing and 2x faster development with monorepos

**Performance comparison**:

| Metric | Polyrepo | Monorepo (no Turbo) | Monorepo + Turborepo |
|--------|----------|---------------------|----------------------|
| **Build time** | 5 min (single app) | 15 min (all apps) | 6 min (changed apps only) |
| **Type safety** | Runtime errors | Compile errors | Compile errors |
| **Code sharing** | Copy-paste | Imports | Imports |
| **Deployment** | 3 separate PRs | 1 PR | 1 PR |
| **CI time** | 15 min | 45 min | 8 min (cache hit) |

**Next steps**:
- **Lecture 2**: Building shared UI components with platform-specific styling
- **Lecture 3**: Implementing shared business logic and state management
- **Lecture 4**: Creating a unified design system across web and mobile

---

## Additional Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo.tools](https://monorepo.tools) - Comparison of monorepo tools
- [Vercel's Monorepo Guide](https://vercel.com/blog/monorepos)
- [Shopify's Engineering Blog on Monorepos](https://shopify.engineering/monorepo-benefits)
