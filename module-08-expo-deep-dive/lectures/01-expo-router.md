# Lecture 1: Expo Router Fundamentals

## File-Based Routing

```
app/
├── _layout.tsx       # Root layout
├── index.tsx         # Home screen (/)
├── about.tsx         # About screen (/about)
└── users/
    └── [id].tsx      # User profile (/users/123)
```

## Navigation

```typescript
import { Link, router } from 'expo-router'

// Declarative
<Link href="/about">About</Link>

// Programmatic
router.push('/about')
router.replace('/login')
router.back()
```

## Layouts

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  )
}
```

## Summary

Expo Router brings Next.js-style routing to React Native.
