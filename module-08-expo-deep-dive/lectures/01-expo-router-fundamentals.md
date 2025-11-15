# Lecture 1: Expo Router Fundamentals

## Introduction

Expo Router brings file-based routing to React Native, similar to Next.js App Router. Built on React Navigation, it provides type-safe navigation with zero configuration.

## File-Based Routing

```
app/
├── index.tsx          # /
├── about.tsx          # /about
├── posts/
│   ├── index.tsx      # /posts
│   └── [id].tsx       # /posts/:id
└── (tabs)/
    ├── _layout.tsx
    ├── home.tsx       # /home (tab)
    └── profile.tsx    # /profile (tab)
```

## Basic Routes

```typescript
// app/index.tsx
export default function Home() {
  return (
    <View>
      <Text>Home Screen</Text>
      <Link href="/about">About</Link>
    </View>
  )
}

// app/about.tsx
export default function About() {
  return <Text>About Screen</Text>
}
```

## Dynamic Routes

```typescript
// app/posts/[id].tsx
import { useLocalSearchParams } from 'expo-router'

export default function Post() {
  const { id } = useLocalSearchParams()

  return <Text>Post ID: {id}</Text>
}

// Navigate: <Link href="/posts/123">Post 123</Link>
```

## Layouts

```typescript
// app/_layout.tsx - Root layout
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  )
}

// app/(tabs)/_layout.tsx - Tab layout
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

## Navigation

```typescript
import { router } from 'expo-router'

// Programmatic navigation
router.push('/about')
router.replace('/login')
router.back()

// With params
router.push({
  pathname: '/posts/[id]',
  params: { id: '123' }
})
```

## Type Safety

```typescript
// Auto-generated types
import { Href } from 'expo-router'

const href: Href = '/posts/123' // Type-checked!

// Invalid route causes TypeScript error
const invalid: Href = '/invalid' // Error!
```

## Summary

Expo Router provides file-based routing, automatic type generation, and seamless navigation for React Native apps.

**Next**: Lecture 2 covers EAS Build system.
