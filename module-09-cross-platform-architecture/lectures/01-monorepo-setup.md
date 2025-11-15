# Lecture 1: Monorepo Setup with Turborepo

## Introduction

Monorepos enable code sharing between web and mobile apps. Turborepo optimizes build and test performance across packages.

## Setup

```bash
npx create-turbo@latest
cd my-turbo
```

## Structure

```
my-monorepo/
├── apps/
│   ├── web/               # Next.js app
│   └── mobile/            # Expo app
├── packages/
│   ├── ui/                # Shared components
│   ├── api/               # API client
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
└── turbo.json             # Turborepo config
```

## Configuration

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

## Shared Package

```typescript
// packages/ui/Button.tsx
export function Button({ children, onPress }: ButtonProps) {
  // Platform-agnostic API
  return <button onClick={onPress}>{children}</button>
}

// packages/ui/Button.native.tsx
import { TouchableOpacity, Text } from 'react-native'

export function Button({ children, onPress }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{children}</Text>
    </TouchableOpacity>
  )
}
```

## Summary

Turborepo enables efficient monorepo management with caching and parallel execution.

**Next**: Lecture 2 covers shared UI components.
