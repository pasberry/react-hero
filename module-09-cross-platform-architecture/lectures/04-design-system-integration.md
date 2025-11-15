# Lecture 4: Design System Integration

## Introduction

A design system ensures consistency across platforms while respecting platform conventions.

## Component Library

```typescript
// packages/ui/components/Card.tsx
import { View, Text } from '../primitives'
import { theme } from '../theme'

export function Card({ title, children }: CardProps) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      <Text style={theme.typography.h3}>{title}</Text>
      {children}
    </View>
  )
}
```

## Tokens

```typescript
// packages/ui/tokens/colors.ts
export const colors = {
  // Brand
  primary: '#007AFF',
  secondary: '#5856D6',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  // Neutrals
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    // ...
  },
}

// packages/ui/tokens/spacing.ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  // ...
}
```

## Documentation

```typescript
// Use Storybook for web
// packages/ui/.storybook/main.js

export default {
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-react-native-web'],
}

// Card.stories.tsx
export default {
  title: 'Components/Card',
  component: Card,
}

export const Default = () => (
  <Card title="Example">
    <Text>Card content</Text>
  </Card>
)
```

## Summary

Design systems provide consistency through shared tokens, components, and documentation.

**Next**: Lecture 5 covers server-driven UI.
