# Complete Monorepo Project

## Setup

\`\`\`bash
npx create-turbo@latest my-app
cd my-app
\`\`\`

## Structure

\`\`\`
my-app/
├── apps/
│   ├── web/           # Next.js (port 3000)
│   └── mobile/        # Expo
├── packages/
│   ├── ui/            # Shared components
│   ├── api/           # API client
│   ├── types/         # Shared types
│   └── config/        # Shared config
├── turbo.json
└── package.json
\`\`\`

## Development

\`\`\`bash
# Install dependencies
npm install

# Run all apps
npm run dev

# Run specific app
npm run dev --filter=web
npm run dev --filter=mobile

# Build all
npm run build

# Type check
npm run type-check
\`\`\`

## Shared UI Component Example

\`\`\`typescript
// packages/ui/Button.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

export function Button({ onPress, children, variant = 'primary' }) {
  return (
    <Pressable 
      onPress={onPress}
      style={[styles.button, styles[variant]]}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
})
\`\`\`

## Time Estimate
12 hours to complete full monorepo setup with shared components.
