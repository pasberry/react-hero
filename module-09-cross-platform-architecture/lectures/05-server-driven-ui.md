# Lecture 5: Server-Driven UI

## Introduction

After building a complete cross-platform architecture with shared components (Lecture 2), business logic (Lecture 3), and a design system (Lecture 4), one challenge remains: **How do you update the UI instantly without waiting days for app store approval?**

Traditional mobile development has a critical bottleneck:
- **Change a button**: Write code, build app, submit to App Store, wait 2-7 days for review
- **Fix a typo**: Same 7-day process
- **A/B test a layout**: Deploy two app versions, complex release management
- **Emergency update**: Users on old versions for weeks

**Server-Driven UI solves this** by moving UI configuration from compiled code to JSON fetched from your backend. When you want to change the UI, update the server response—all users get the change instantly, no app deployment required.

**How it works**:
1. **Server** defines UI as JSON schema: `{ type: 'button', props: { label: 'Buy Now' } }`
2. **App** fetches schema from API: `GET /api/screens/product-details`
3. **Renderer** converts JSON to native components: `<Button>Buy Now</Button>`

**Benefits**:
- ✅ **Instant updates**: Change UI in production in 5 seconds
- ✅ **A/B testing**: Serve different layouts to different user segments
- ✅ **Personalization**: Show different UI based on user data
- ✅ **Feature flags**: Enable/disable features remotely
- ✅ **Emergency fixes**: Fix critical UI bugs without app deployment

This lecture teaches you how to build a production-grade server-driven UI system with:
1. **Type-safe schema design** with Zod validation
2. **Component renderer** that converts JSON to React components
3. **Action handling** for navigation, API calls, and analytics
4. **Security patterns** to prevent XSS and injection attacks
5. **Performance optimization** with caching and lazy loading

---

## Why Server-Driven UI?

### The Problem: Slow Release Cycles

Imagine you're running a Black Friday sale in your e-commerce app:

**Thursday 11:59 PM**: Marketing realizes the "Shop Now" button should be red instead of blue

**Traditional approach**:
1. Developer changes button color in code
2. Build iOS and Android apps (20 minutes)
3. Submit to App Store and Google Play
4. **Wait 2-7 days for review** ⏳
5. Users gradually update their apps over 2 weeks
6. **Result**: Only 30% of users see the red button by Black Friday

**Server-driven approach**:
1. Marketing changes button color in CMS
2. Server updates JSON: `{ "buttonColor": "red" }`
3. All users see red button **instantly** ⚡
4. **Result**: 100% of users see the red button in 5 seconds

### Real-World Example: Airbnb

Airbnb uses server-driven UI to:
- **Update home screen layout** during peak seasons (holidays, events)
- **A/B test search filters** across millions of users
- **Personalize listings** based on user preferences and location
- **Roll out features gradually** (5% → 25% → 100%)

**Results**:
- **Feature deployment speed**: 100x faster (5 seconds vs 7 days)
- **A/B test velocity**: 10x more experiments (no app deployments)
- **Conversion rate**: +12% from personalized UI
- **Emergency fix time**: 30 seconds (vs 7 days for app store approval)

---

## Schema Design

### Component Schema

**packages/types/ui-schema.ts**:
```typescript
import { z } from 'zod'

// 1. Text Component
export const TextComponentSchema = z.object({
  type: z.literal('text'),
  props: z.object({
    content: z.string(),
    variant: z.enum(['h1', 'h2', 'h3', 'body', 'caption']).optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional()
  })
})

// 2. Button Component
export const ButtonComponentSchema = z.object({
  type: z.literal('button'),
  props: z.object({
    label: z.string(),
    variant: z.enum(['primary', 'secondary', 'outline']).optional(),
    action: z.object({
      type: z.enum(['navigate', 'api', 'external', 'analytics']),
      payload: z.record(z.any())
    })
  })
})

// 3. Image Component
export const ImageComponentSchema = z.object({
  type: z.literal('image'),
  props: z.object({
    url: z.string().url(),
    aspectRatio: z.number().optional(),
    alt: z.string().optional()
  })
})

// 4. Stack Component (layout)
export const StackComponentSchema = z.object({
  type: z.literal('stack'),
  props: z.object({
    direction: z.enum(['vertical', 'horizontal']).optional(),
    spacing: z.number().optional(),
    children: z.array(z.lazy(() => UIComponentSchema))  // Recursive
  })
})

// 5. Card Component
export const CardComponentSchema = z.object({
  type: z.literal('card'),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    image: z.string().url().optional(),
    children: z.array(z.lazy(() => UIComponentSchema))
  })
})

// Union of all component types
export const UIComponentSchema = z.discriminatedUnion('type', [
  TextComponentSchema,
  ButtonComponentSchema,
  ImageComponentSchema,
  StackComponentSchema,
  CardComponentSchema
])

export type UIComponent = z.infer<typeof UIComponentSchema>

// Screen schema
export const ScreenSchema = z.object({
  id: z.string(),
  title: z.string(),
  version: z.string(),
  components: z.array(UIComponentSchema),
  metadata: z.object({
    createdAt: z.string().datetime(),
    updatedBy: z.string(),
    tags: z.array(z.string()).optional()
  }).optional()
})

export type Screen = z.infer<typeof ScreenSchema>
```

### Schema Validation

**packages/ui/renderer/validate.ts**:
```typescript
import { ScreenSchema } from '@my-app/types/ui-schema'

export function validateScreen(data: unknown): Screen {
  try {
    return ScreenSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid screen schema:', error.errors)
      throw new Error('Invalid server response')
    }
    throw error
  }
}
```

---

## Component Renderer

### Renderer Architecture

**packages/ui/renderer/ComponentRenderer.tsx**:
```typescript
import React from 'react'
import { View, Text, Image, Button, Card } from '@my-app/ui'
import type { UIComponent } from '@my-app/types/ui-schema'
import { useTheme } from '@my-app/ui/theme'

interface ComponentRendererProps {
  component: UIComponent
  onAction: (action: ActionPayload) => void
}

export function ComponentRenderer({ component, onAction }: ComponentRendererProps) {
  const { theme } = useTheme()

  switch (component.type) {
    // 1. Text Component
    case 'text': {
      const { content, variant = 'body', color, align } = component.props

      return (
        <Text
          style={{
            ...theme.typography.styles[variant],
            color: color || theme.colors.text.primary,
            textAlign: align
          }}
        >
          {content}
        </Text>
      )
    }

    // 2. Button Component
    case 'button': {
      const { label, variant = 'primary', action } = component.props

      return (
        <Button
          variant={variant}
          onPress={() => onAction(action)}
        >
          {label}
        </Button>
      )
    }

    // 3. Image Component
    case 'image': {
      const { url, aspectRatio, alt } = component.props

      return (
        <Image
          source={{ uri: url }}
          style={{
            width: '100%',
            aspectRatio: aspectRatio || 16 / 9
          }}
          accessibilityLabel={alt}
        />
      )
    }

    // 4. Stack Component
    case 'stack': {
      const { direction = 'vertical', spacing = 16, children } = component.props

      return (
        <View
          style={{
            flexDirection: direction === 'horizontal' ? 'row' : 'column',
            gap: spacing
          }}
        >
          {children.map((child, index) => (
            <ComponentRenderer
              key={index}
              component={child}
              onAction={onAction}
            />
          ))}
        </View>
      )
    }

    // 5. Card Component
    case 'card': {
      const { title, subtitle, image, children } = component.props

      return (
        <Card
          title={title}
          subtitle={subtitle}
          imageUrl={image}
        >
          {children.map((child, index) => (
            <ComponentRenderer
              key={index}
              component={child}
              onAction={onAction}
            />
          ))}
        </Card>
      )
    }

    default:
      // Type-safe exhaustive check
      const exhaustiveCheck: never = component
      console.warn('Unknown component type:', exhaustiveCheck)
      return null
  }
}
```

### Error Boundary

**packages/ui/renderer/ErrorBoundary.tsx**:
```typescript
import React, { Component, ErrorInfo } from 'react'
import { View, Text } from '@my-app/ui'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class RendererErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Renderer error:', error, errorInfo)
    // Log to analytics
    analytics.track('renderer_error', {
      error: error.message,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'red' }}>
            Failed to render this section
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}
```

---

## Action Handling

### Action Types

**packages/types/actions.ts**:
```typescript
export type Action =
  | { type: 'navigate'; payload: { screen: string; params?: Record<string, any> } }
  | { type: 'api'; payload: { endpoint: string; method: 'GET' | 'POST' } }
  | { type: 'external'; payload: { url: string } }
  | { type: 'analytics'; payload: { event: string; properties?: Record<string, any> } }
```

### Action Handler

**packages/ui/renderer/useActionHandler.ts**:
```typescript
import { useNavigation } from '@react-navigation/native'
import { Linking } from 'react-native'
import { apiClient } from '@my-app/api-client'
import { analytics } from '@my-app/analytics'
import type { Action } from '@my-app/types/actions'

export function useActionHandler() {
  const navigation = useNavigation()

  async function handleAction(action: Action) {
    switch (action.type) {
      // 1. Navigation
      case 'navigate': {
        const { screen, params } = action.payload
        navigation.navigate(screen, params)
        break
      }

      // 2. API Call
      case 'api': {
        const { endpoint, method } = action.payload
        try {
          if (method === 'GET') {
            await apiClient.get(endpoint)
          } else {
            await apiClient.post(endpoint)
          }
          // Handle response (update state, show success message, etc.)
        } catch (error) {
          console.error('API call failed:', error)
          // Show error toast
        }
        break
      }

      // 3. External Link
      case 'external': {
        const { url } = action.payload
        const canOpen = await Linking.canOpenURL(url)
        if (canOpen) {
          await Linking.openURL(url)
        } else {
          console.warn('Cannot open URL:', url)
        }
        break
      }

      // 4. Analytics Event
      case 'analytics': {
        const { event, properties } = action.payload
        analytics.track(event, properties)
        break
      }

      default:
        const exhaustiveCheck: never = action
        console.warn('Unknown action type:', exhaustiveCheck)
    }
  }

  return { handleAction }
}
```

---

## Dynamic Screen Component

**apps/mobile/screens/DynamicScreen.tsx**:
```typescript
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { ComponentRenderer } from '@my-app/ui/renderer'
import { RendererErrorBoundary } from '@my-app/ui/renderer/ErrorBoundary'
import { validateScreen } from '@my-app/ui/renderer/validate'
import { useActionHandler } from '@my-app/ui/renderer/useActionHandler'
import { apiClient } from '@my-app/api-client'
import type { Screen } from '@my-app/types/ui-schema'

interface DynamicScreenProps {
  screenId: string
}

export function DynamicScreen({ screenId }: DynamicScreenProps) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { handleAction } = useActionHandler()

  useEffect(() => {
    async function fetchScreen() {
      try {
        setLoading(true)
        setError(null)

        // Fetch screen configuration from server
        const response = await apiClient.get(`/screens/${screenId}`)

        // Validate schema
        const validatedScreen = validateScreen(response.data)

        setScreen(validatedScreen)
      } catch (err) {
        console.error('Failed to fetch screen:', err)
        setError('Failed to load screen')
      } finally {
        setLoading(false)
      }
    }

    fetchScreen()
  }, [screenId])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (error || !screen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>
          {error || 'Screen not found'}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', padding: 16 }}>
        {screen.title}
      </Text>

      <RendererErrorBoundary>
        {screen.components.map((component, index) => (
          <ComponentRenderer
            key={index}
            component={component}
            onAction={handleAction}
          />
        ))}
      </RendererErrorBoundary>
    </View>
  )
}
```

---

## Server-Side Example

### Backend API

**server/routes/screens.ts** (Express example):
```typescript
import express from 'express'
import { z } from 'zod'
import { ScreenSchema } from '@my-app/types/ui-schema'

const router = express.Router()

// Product details screen
router.get('/screens/product-details', (req, res) => {
  const screen = {
    id: 'product-details',
    title: 'Premium Headphones',
    version: '1.0.0',
    components: [
      {
        type: 'image',
        props: {
          url: 'https://example.com/headphones.jpg',
          aspectRatio: 1,
          alt: 'Premium wireless headphones'
        }
      },
      {
        type: 'stack',
        props: {
          direction: 'vertical',
          spacing: 16,
          children: [
            {
              type: 'text',
              props: {
                content: '$299.99',
                variant: 'h2',
                color: '#007AFF'
              }
            },
            {
              type: 'text',
              props: {
                content: 'Premium wireless headphones with active noise cancellation',
                variant: 'body'
              }
            },
            {
              type: 'stack',
              props: {
                direction: 'horizontal',
                spacing: 12,
                children: [
                  {
                    type: 'button',
                    props: {
                      label: 'Add to Cart',
                      variant: 'primary',
                      action: {
                        type: 'api',
                        payload: {
                          endpoint: '/cart/add',
                          method: 'POST'
                        }
                      }
                    }
                  },
                  {
                    type: 'button',
                    props: {
                      label: 'Buy Now',
                      variant: 'secondary',
                      action: {
                        type: 'navigate',
                        payload: {
                          screen: 'Checkout',
                          params: { productId: '123' }
                        }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedBy: 'admin@example.com'
    }
  }

  // Validate before sending
  const validatedScreen = ScreenSchema.parse(screen)

  res.json(validatedScreen)
})

export default router
```

---

## Security Considerations

### 1. XSS Prevention

**Sanitize user-generated content**:
```typescript
import DOMPurify from 'isomorphic-dompurify'

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })
}

// In renderer:
case 'text': {
  const { content } = component.props
  const sanitized = sanitizeHTML(content)  // Prevent XSS

  return <Text>{sanitized}</Text>
}
```

### 2. Action Validation

**Whitelist allowed actions**:
```typescript
const ALLOWED_NAVIGATION_SCREENS = ['Home', 'Profile', 'Product', 'Checkout']

function validateNavigationAction(screen: string): void {
  if (!ALLOWED_NAVIGATION_SCREENS.includes(screen)) {
    throw new Error(`Navigation to "${screen}" is not allowed`)
  }
}

// In action handler:
case 'navigate': {
  const { screen } = action.payload
  validateNavigationAction(screen)  // Prevent unauthorized navigation
  navigation.navigate(screen)
  break
}
```

### 3. URL Validation

**Prevent malicious URLs**:
```typescript
function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow HTTPS and specific domains
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname.endsWith('.myapp.com') || parsed.hostname === 'myapp.com')
    )
  } catch {
    return false
  }
}

// In renderer:
case 'external': {
  const { url } = action.payload
  if (!isSafeURL(url)) {
    console.warn('Blocked unsafe URL:', url)
    return
  }
  Linking.openURL(url)
}
```

---

## Performance Optimization

### 1. Caching

**Cache screen configurations**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY_PREFIX = 'screen:'
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

async function fetchScreenWithCache(screenId: string): Promise<Screen> {
  const cacheKey = `${CACHE_KEY_PREFIX}${screenId}`

  // Try cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      if (age < CACHE_TTL) {
        console.log('Cache hit:', screenId)
        return data
      }
    }
  } catch (error) {
    console.warn('Cache read error:', error)
  }

  // Fetch from network
  const response = await apiClient.get(`/screens/${screenId}`)
  const screen = validateScreen(response.data)

  // Update cache
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ data: screen, timestamp: Date.now() })
    )
  } catch (error) {
    console.warn('Cache write error:', error)
  }

  return screen
}
```

### 2. Lazy Loading

**Load images on demand**:
```typescript
case 'image': {
  const { url, aspectRatio } = component.props

  return (
    <Image
      source={{ uri: url }}
      style={{ width: '100%', aspectRatio: aspectRatio || 16 / 9 }}
      loading="lazy"  // Lazy load images
      placeholder={<Skeleton />}  // Show skeleton while loading
    />
  )
}
```

---

## A/B Testing

### User Segmentation

**packages/experiments/segments.ts**:
```typescript
export function getUserSegment(userId: string): 'A' | 'B' {
  // Hash user ID to deterministic segment
  const hash = hashString(userId)
  return hash % 2 === 0 ? 'A' : 'B'
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash  // Convert to 32-bit integer
  }
  return Math.abs(hash)
}
```

### Variant Screens

**server/routes/screens.ts**:
```typescript
router.get('/screens/product-details', (req, res) => {
  const userId = req.query.userId as string
  const segment = getUserSegment(userId)

  // Variant A: Green "Buy Now" button
  const variantA = {
    id: 'product-details-a',
    title: 'Product Details',
    components: [
      // ... product info
      {
        type: 'button',
        props: {
          label: 'Buy Now',
          variant: 'primary',  // Green button
          action: { type: 'navigate', payload: { screen: 'Checkout' } }
        }
      }
    ]
  }

  // Variant B: Red "Buy Now" button
  const variantB = {
    id: 'product-details-b',
    title: 'Product Details',
    components: [
      // ... product info
      {
        type: 'button',
        props: {
          label: 'Buy Now',
          variant: 'secondary',  // Red button
          action: { type: 'navigate', payload: { screen: 'Checkout' } }
        }
      }
    ]
  }

  const screen = segment === 'A' ? variantA : variantB

  // Track experiment exposure
  analytics.track('experiment_viewed', {
    experiment: 'product-button-color',
    variant: segment,
    userId
  })

  res.json(screen)
})
```

---

## Summary

Server-Driven UI is a **powerful pattern for instant UI updates and experimentation** without app deployments.

**Key takeaways**:

1. **Schema-driven architecture** with Zod validation ensures type safety between server and client

2. **Component renderer** maps JSON schemas to native React components dynamically

3. **Action handling** supports navigation, API calls, external links, and analytics

4. **Security** is critical—sanitize content, validate actions, and whitelist URLs

5. **Performance** optimizations (caching, lazy loading) prevent slow experiences

6. **A/B testing** enables data-driven UI decisions with instant deployment

**Trade-offs**:

| Aspect | Traditional UI | Server-Driven UI |
|--------|---------------|-------------------|
| **Deployment speed** | 7 days (app store review) | 5 seconds (API update) |
| **Type safety** | Compile-time | Runtime (with validation) |
| **Complexity** | Low (static components) | High (renderer + schema) |
| **Flexibility** | Low (requires deployment) | High (instant updates) |
| **Performance** | Fast (compiled) | Slower (JSON parsing + rendering) |

**When to use**:
- ✅ Marketing landing pages that change frequently
- ✅ A/B testing product flows
- ✅ Personalized user experiences
- ✅ Emergency UI fixes

**When not to use**:
- ❌ Core navigation (too risky)
- ❌ Complex interactions (better as native code)
- ❌ Performance-critical screens (FlatLists, animations)

**Real-world impact**:
- **Airbnb**: 100x faster feature deployment, +12% conversion from personalization
- **Lyft**: A/B test 10x more experiments, instant emergency fixes
- **Instagram**: Personalized feeds and stories without app updates

**Module 9 Complete!**

You now have a comprehensive cross-platform architecture with:
1. Monorepo setup (Lecture 1)
2. Shared UI components (Lecture 2)
3. Shared business logic (Lecture 3)
4. Design system integration (Lecture 4)
5. Server-driven UI (Lecture 5)

**Next**: Module 10 - Capstone Project: Build a full-stack cross-platform e-commerce app applying everything you've learned!

---

## Additional Resources

- [Airbnb Engineering: Server-Driven UI](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5)
- [Lyft's Server-Driven UI Architecture](https://eng.lyft.com/server-driven-ui-at-lyft-2b83bc2c6c4d)
- [React Native Dynamic Content](https://reactnative.dev/docs/dynamic-content)
- [JSON Schema Validation](https://json-schema.org/)
