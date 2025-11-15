# Lecture 2: Shared UI Components

## Introduction

Building a cross-platform design system requires abstractions that work on web and mobile.

## Platform Abstraction

```typescript
// packages/ui/primitives/View.tsx
import { View as RNView } from 'react-native'

export const View = RNView

// packages/ui/primitives/View.web.tsx
export function View({ style, ...props }: ViewProps) {
  return <div style={convertStyle(style)} {...props} />
}
```

## Responsive Design

```typescript
// packages/ui/hooks/useBreakpoint.ts
import { useWindowDimensions } from 'react-native'

export function useBreakpoint() {
  const { width } = useWindowDimensions()

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  }
}

// Usage
function MyComponent() {
  const { isMobile } = useBreakpoint()

  return (
    <View style={{ padding: isMobile ? 16 : 24 }}>
      <Text>Responsive content</Text>
    </View>
  )
}
```

## Styling System

```typescript
// packages/ui/theme.ts
export const theme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' },
    body: { fontSize: 16, fontWeight: 'normal' },
  },
}

// Usage
<Text style={theme.typography.h1}>Title</Text>
```

## Summary

Cross-platform UI requires platform-specific implementations with shared APIs.

**Next**: Lecture 3 covers shared business logic.
