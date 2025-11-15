# Lecture 5: Performance Optimization

## Introduction

Optimizing Expo apps requires understanding bundle size, startup time, and runtime performance.

## Bundle Optimization

```javascript
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      compress: {
        drop_console: true, // Remove console.logs in production
      },
    },
  },
}
```

```typescript
// Lazy load heavy screens
import { lazy } from 'react'

const SettingsScreen = lazy(() => import('./screens/Settings'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsScreen />
    </Suspense>
  )
}
```

## Image Optimization

```typescript
import { Image } from 'expo-image'

// Use expo-image for better performance
<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
/>
```

## Hermes Engine

```json
// app.json - Enable Hermes
{
  "expo": {
    "jsEngine": "hermes",
    "android": {
      "enableHermes": true
    },
    "ios": {
      "jsEngine": "hermes"
    }
  }
}
```

**Results with Hermes**:
- App size: -50%
- Startup time: -40%
- Memory: -30%

## Asset Optimization

```bash
# Optimize images during build
npx expo-optimize

# Use vector icons instead of PNGs
import { Ionicons } from '@expo/vector-icons'
<Ionicons name="home" size={24} />
```

## Summary

Performance optimization in Expo involves bundle optimization, Hermes engine, image optimization, and lazy loading.

**Module 8 Complete!** Expo provides a complete development environment with powerful cloud services.
