# Module 9: Cross-Platform Architecture (Web + Native)

## 🎯 Module Overview

Build production cross-platform applications with shared code between Next.js (web) and React Native (mobile), using monorepos and shared design systems.

### Learning Objectives

✅ Set up monorepos with Turborepo
✅ Share UI components between web and native
✅ Share business logic and types
✅ Build unified design systems
✅ Implement server-driven UI patterns

### Time Estimate: 10-14 hours

---

## 📚 Key Topics

### 1. Monorepo Architecture
- Turborepo setup and configuration
- Package workspace management
- Shared dependencies
- Build optimization

### 2. Shared UI Components
- Platform-agnostic component API
- React Native Web integration
- Conditional platform code
- Styling across platforms

### 3. Shared Business Logic
- Shared state management
- API client libraries
- Validation logic
- Type definitions

### 4. Design System Integration
- Unified design tokens
- Component variants
- Theming across platforms
- Accessibility

### 5. Server-Driven UI
- Dynamic layouts from backend
- A/B testing across platforms
- Feature flags
- Content management

---

## 🛠️ Project: Complete Monorepo

Build a production monorepo:

```
my-app/
├── apps/
│   ├── web/                 # Next.js app
│   │   ├── app/
│   │   └── package.json
│   └── mobile/              # Expo app
│       ├── app/
│       └── package.json
├── packages/
│   ├── ui/                  # Shared UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── package.json
│   ├── api/                 # Shared API client
│   │   ├── posts.ts
│   │   └── package.json
│   ├── types/               # Shared TypeScript types
│   │   └── package.json
│   └── config/              # Shared configs
│       └── package.json
├── turbo.json
└── package.json
```

---

## 📝 Key Patterns

### Pattern 1: Platform-Agnostic Components

```tsx
// packages/ui/Button.tsx
import { Platform, Pressable, Text } from './primitives';

export function Button({ onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

// packages/ui/primitives/index.tsx
export { View, Text } from 'react-native';  // Works on mobile

// packages/ui/primitives/index.web.tsx
export { View, Text } from 'react-native-web';  // Works on web
```

### Pattern 2: Shared API Client

```tsx
// packages/api/client.ts
export class APIClient {
  constructor(private baseURL: string) {}

  async getPosts() {
    const res = await fetch(`${this.baseURL}/posts`);
    return res.json() as Post[];
  }
}

// apps/web/app/page.tsx (Server Component)
import { APIClient } from '@my-app/api';

const api = new APIClient(process.env.API_URL);

export default async function Page() {
  const posts = await api.getPosts();
  return <PostList posts={posts} />;
}

// apps/mobile/app/index.tsx
import { APIClient } from '@my-app/api';
import { useEffect, useState } from 'react';

const api = new APIClient(process.env.EXPO_PUBLIC_API_URL);

export default function Page() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.getPosts().then(setPosts);
  }, []);

  return <PostList posts={posts} />;
}
```

### Pattern 3: Server-Driven UI

```tsx
// Backend defines UI structure
{
  "type": "feed",
  "components": [
    { "type": "hero", "imageUrl": "...", "title": "..." },
    { "type": "postList", "posts": [...] },
    { "type": "ad", "adId": "..." }
  ]
}

// Renderer (works on web + mobile)
function DynamicRenderer({ components }) {
  return components.map((comp) => {
    switch (comp.type) {
      case 'hero': return <Hero {...comp} />;
      case 'postList': return <PostList {...comp} />;
      case 'ad': return <Ad {...comp} />;
    }
  });
}
```

---

## 🎯 Exercise: Full Monorepo

Build a complete app:

**Features**:
- Next.js web app
- Expo mobile app
- Shared UI library (10+ components)
- Shared API client
- Shared TypeScript types
- Unified design tokens
- CI/CD pipeline

**Time**: 10-14 hours

---

## 🔜 Next: [Module 10: Capstone Project](../module-10-capstone)
