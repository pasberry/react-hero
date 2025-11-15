# Lecture 1: Monorepo Setup with Turborepo

## Structure

```
my-app/
├── apps/
│   ├── web/           # Next.js
│   └── mobile/        # Expo
├── packages/
│   ├── ui/            # Shared components
│   ├── api/           # API client
│   └── types/         # TypeScript types
├── turbo.json
└── package.json
```

## Turborepo Config

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

## Shared UI Components

```typescript
// packages/ui/Button.tsx
import { Pressable, Text } from 'react-native'

export function Button({ onPress, children }) {
  return (
    <Pressable onPress={onPress}>
      <Text>{children}</Text>
    </Pressable>
  )
}
```

## Summary

Monorepos enable maximum code sharing between web and mobile.
