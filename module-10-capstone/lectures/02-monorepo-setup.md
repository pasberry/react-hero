# Lecture 2: Monorepo Setup with Turborepo

## Introduction

A monorepo (mono repository) is a single repository that contains multiple related projects. For your capstone, this means your Next.js web app, Expo mobile app, and all shared packages live in one repository.

**Why monorepo for this capstone?**
- **Share code** between web and mobile (70%+ reuse)
- **Atomic commits** (change API + web + mobile in one commit)
- **Unified tooling** (one ESLint config, one TypeScript config)
- **Faster development** (no version mismatches between packages)

In this lecture, you'll set up a production-ready monorepo using Turborepo and pnpm.

---

## Step 1: Initialize the Monorepo

### Create the root directory

```bash
mkdir my-capstone
cd my-capstone

# Initialize git
git init
git branch -M main

# Create root package.json
pnpm init
```

### Install Turborepo

```bash
pnpm add -Dw turbo
```

**What is Turborepo?**
- Build orchestration tool by Vercel
- Caches build outputs (10x faster rebuilds)
- Runs tasks in parallel across packages
- Understands dependencies between packages

---

## Step 2: Configure Workspace Structure

### Create `pnpm-workspace.yaml`

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

This tells pnpm where to find your packages.

### Create root `package.json`

```json
{
  "name": "my-capstone",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "prettier": "^3.1.0",
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*"
  },
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  },
  "packageManager": "pnpm@8.14.0"
}
```

---

## Step 3: Configure Turborepo

### Create `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env",
    "tsconfig.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        "build/**"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

**What this does**:
- `dependsOn: ["^build"]` - Build dependencies first
- `outputs` - Cache these directories
- `cache: false` - Don't cache dev/test (always run fresh)
- `persistent: true` - Keep dev server running

---

## Step 4: Create Shared Configuration Packages

### TypeScript Configuration

```bash
mkdir -p packages/typescript-config
cd packages/typescript-config
```

**`packages/typescript-config/package.json`**:
```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "files": [
    "base.json",
    "nextjs.json",
    "react-library.json"
  ]
}
```

**`packages/typescript-config/base.json`**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "incremental": true,
    "noEmit": true
  },
  "exclude": ["node_modules"]
}
```

**`packages/typescript-config/nextjs.json`**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "lib": ["dom", "dom.iterable", "ES2022"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`packages/typescript-config/react-library.json`**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  }
}
```

---

### ESLint Configuration

```bash
mkdir -p packages/eslint-config
cd packages/eslint-config
```

**`packages/eslint-config/package.json`**:
```json
{
  "name": "@repo/eslint-config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint-config-next": "^14.0.4",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.33.2"
  }
}
```

**`packages/eslint-config/next.js`**:
```javascript
module.exports = {
  extends: [
    'next/core-web-vitals',
    'prettier'
  ],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
    'react/jsx-key': 'off'
  }
}
```

**`packages/eslint-config/react-internal.js`**:
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' }
    ]
  }
}
```

---

## Step 5: Set Up Next.js Web App

```bash
cd apps
pnpx create-next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

### Configure Next.js

**`apps/web/package.json`**:
```json
{
  "name": "@repo/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@repo/ui": "workspace:*",
    "@repo/api": "workspace:*",
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

**`apps/web/tsconfig.json`**:
```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@repo/ui": ["../../packages/ui/src"],
      "@repo/api": ["../../packages/api/src"],
      "@repo/types": ["../../packages/types/src"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`apps/web/.eslintrc.js`**:
```javascript
module.exports = {
  extends: ['@repo/eslint-config/next']
}
```

**`apps/web/next.config.js`**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/ui'],
  experimental: {
    serverActions: true
  }
}

module.exports = nextConfig
```

---

## Step 6: Set Up Expo Mobile App

```bash
cd apps
pnpx create-expo-app mobile --template blank-typescript
```

### Configure Expo

**`apps/mobile/package.json`**:
```json
{
  "name": "@repo/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "lint": "eslint ."
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@repo/ui": "workspace:*",
    "@repo/api": "workspace:*",
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  }
}
```

**`apps/mobile/tsconfig.json`**:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@repo/ui": ["../../packages/ui/src"],
      "@repo/api": ["../../packages/api/src"],
      "@repo/types": ["../../packages/types/src"]
    }
  }
}
```

**`apps/mobile/app.json`**:
```json
{
  "expo": {
    "name": "MyApp",
    "slug": "myapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "myapp",
    "plugins": ["expo-router"],
    "ios": {
      "bundleIdentifier": "com.yourname.myapp"
    },
    "android": {
      "package": "com.yourname.myapp"
    },
    "extra": {
      "router": {
        "origin": false
      }
    }
  }
}
```

---

## Step 7: Create Shared Packages

### Shared UI Package

```bash
mkdir -p packages/ui/src
cd packages/ui
```

**`packages/ui/package.json`**:
```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@repo/eslint-config": "workspace:*",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.3",
    "eslint": "^8.55.0"
  }
}
```

**`packages/ui/src/Button.tsx`**:
```typescript
import { ReactNode } from 'react'

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: variant === 'primary' ? '#007AFF' : '#F0F0F0',
        color: variant === 'primary' ? 'white' : 'black',
        fontSize: '16px',
        fontWeight: '600',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  )
}
```

**`packages/ui/src/index.ts`**:
```typescript
export { Button, type ButtonProps } from './Button'
// Export more components as you create them
```

**`packages/ui/tsconfig.json`**:
```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

---

### Shared API Package

```bash
mkdir -p packages/api/src
cd packages/api
```

**`packages/api/package.json`**:
```json
{
  "name": "@repo/api",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@repo/types": "workspace:*",
    "ky": "^1.1.3"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.3.3"
  }
}
```

**`packages/api/src/client.ts`**:
```typescript
import ky from 'ky'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const api = ky.create({
  prefixUrl: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  hooks: {
    beforeRequest: [
      request => {
        const token = typeof window !== 'undefined'
          ? localStorage.getItem('auth_token')
          : null

        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    ]
  }
})
```

**`packages/api/src/posts.ts`**:
```typescript
import { api } from './client'
import type { Post, CreatePostInput } from '@repo/types'

export async function getPosts(): Promise<Post[]> {
  return api.get('posts').json()
}

export async function getPost(id: string): Promise<Post> {
  return api.get(`posts/${id}`).json()
}

export async function createPost(data: CreatePostInput): Promise<Post> {
  return api.post('posts', { json: data }).json()
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`posts/${id}`)
}
```

**`packages/api/src/index.ts`**:
```typescript
export * from './client'
export * from './posts'
// Export more API modules as you create them
```

---

### Shared Types Package

```bash
mkdir -p packages/types/src
cd packages/types
```

**`packages/types/package.json`**:
```json
{
  "name": "@repo/types",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.3.3"
  }
}
```

**`packages/types/src/models.ts`**:
```typescript
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface Post {
  id: string
  title: string
  content: string
  author: User
  authorId: string
  likes: number
  createdAt: Date
  updatedAt: Date
}

export interface CreatePostInput {
  title: string
  content: string
}

export interface UpdatePostInput {
  title?: string
  content?: string
}
```

**`packages/types/src/index.ts`**:
```typescript
export * from './models'
```

---

## Step 8: Install Dependencies

From the root directory:

```bash
pnpm install
```

This installs dependencies for all packages in parallel.

---

## Step 9: Test the Setup

### Start development servers

```bash
# Start all dev servers (web + mobile)
pnpm dev

# Or start individually
pnpm --filter @repo/web dev
pnpm --filter @repo/mobile dev
```

### Verify builds

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @repo/web build
```

### Verify linting

```bash
# Lint all packages
pnpm lint

# Fix lint errors
pnpm lint --fix
```

---

## Step 10: Configure Git

**`.gitignore`**:
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Expo
.expo/
dist/

# Production
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# Turbo
.turbo

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

---

## Turbo Benefits in Action

### Without Turbo
```bash
# Building 3 packages sequentially
npm run build  # Package 1: 30s
npm run build  # Package 2: 25s
npm run build  # Package 3: 20s
# Total: 75s
```

### With Turbo
```bash
# Building 3 packages in parallel with caching
turbo build    # First run: 30s (parallel)
turbo build    # Second run: 0.1s (from cache!)
# Total: 30s first time, then instant
```

---

## Common Commands

### Development
```bash
pnpm dev                          # All apps
pnpm --filter @repo/web dev       # Just web
pnpm --filter @repo/mobile dev    # Just mobile
```

### Building
```bash
pnpm build                        # All apps
turbo build --force               # Bypass cache
```

### Adding Dependencies
```bash
# Add to specific package
pnpm --filter @repo/web add axios

# Add to all packages
pnpm add -w prettier

# Add dev dependency
pnpm --filter @repo/ui add -D typescript
```

### Clean
```bash
# Clean all build artifacts
pnpm clean

# Remove all node_modules
pnpm clean && rm -rf node_modules
```

---

## Troubleshooting

### Issue: "Package not found"
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Issue: "Module resolution error"
```bash
# Clear TypeScript cache
find . -name "*.tsbuildinfo" -delete
```

### Issue: "Turbo cache stale"
```bash
# Clear Turbo cache
rm -rf .turbo
turbo build --force
```

---

## Next Steps

✅ **You now have**:
- Monorepo set up with Turborepo
- Next.js web app configured
- Expo mobile app configured
- Shared packages (ui, api, types)
- Unified tooling (TypeScript, ESLint)

**In the next lecture**, we'll implement authentication and set up the database.

---

**Time to Complete**: 2-3 hours
**Recommended Reading**: [Turborepo Handbook](https://turbo.build/repo/docs/handbook)
