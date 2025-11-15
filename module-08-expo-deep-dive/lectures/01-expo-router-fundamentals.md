# Lecture 1: Expo Router Fundamentals - File-Based Routing for React Native

## Introduction

Expo Router revolutionizes React Native navigation by bringing file-based routing—the pattern that made Next.js dominant in web development—to mobile apps. Instead of manually configuring navigation stacks with hundreds of lines of boilerplate, your file structure becomes your navigation structure.

**Why does this matter?** React Navigation, while powerful, requires extensive manual configuration. Adding a new screen means updating multiple files: creating the component, registering it in the navigator, defining TypeScript types, and configuring deep links. Expo Router eliminates this friction—create a file in the `app/` directory, and it's automatically routable with full type safety and deep linking.

This lecture covers Expo Router's architecture, file-based routing conventions, dynamic routes, layouts, type safety, and advanced patterns like authentication guards and modals. By the end, you'll understand how to build production-ready navigation that's maintainable, type-safe, and scales with your app.

## The Problem Expo Router Solves

### React Navigation Manual Configuration Hell

Before Expo Router, a typical React Navigation setup looked like this:

```typescript
// navigation/types.ts
export type RootStackParamList = {
  Home: undefined
  Posts: undefined
  PostDetail: { id: string }
  Profile: { userId: string }
  Settings: undefined
  // ... 50 more routes
}

export type TabParamList = {
  Feed: undefined
  Search: undefined
  Notifications: undefined
  Profile: undefined
}

// navigation/RootNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack'
import { NavigationContainer } from '@react-navigation/native'

const Stack = createStackNavigator<RootStackParamList>()

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Posts" component={PostsScreen} />
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={{ title: 'Post' }}
        />
        {/* ... 50 more screens */}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

// navigation/TabNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Tab = createBottomTabNavigator<TabParamList>()

export function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://'],
  config: {
    screens: {
      Home: '',
      Posts: 'posts',
      PostDetail: 'posts/:id',
      Profile: 'profile/:userId',
      // ... manually configure every route
    }
  }
}
```

**Problems**:
1. **Boilerplate**: 200+ lines just for navigation setup
2. **Manual synchronization**: File structure ≠ navigation structure (easy to get out of sync)
3. **Type safety fragility**: Manually maintain param types (easy to make mistakes)
4. **Deep linking tedious**: Manually configure URL mappings for every route
5. **No code splitting**: All screens imported upfront (slower startup)

### Expo Router Solution

The same app with Expo Router:

```
app/
├── _layout.tsx           # Root layout (Stack navigator)
├── index.tsx             # Home screen (/)
├── posts/
│   ├── index.tsx         # Posts list (/posts)
│   └── [id].tsx          # Post detail (/posts/:id)
├── profile/
│   └── [userId].tsx      # Profile (/profile/:userId)
└── (tabs)/
    ├── _layout.tsx       # Tab navigator
    ├── feed.tsx          # Feed tab (/feed)
    ├── search.tsx        # Search tab (/search)
    ├── notifications.tsx # Notifications tab (/notifications)
    └── profile.tsx       # Profile tab (/profile)
```

**Benefits**:
- **Zero boilerplate**: File structure IS the navigation structure
- **Automatic type generation**: TypeScript types generated from file system
- **Deep linking included**: URLs match file paths automatically
- **Code splitting**: Screens lazy-loaded on demand
- **Developer experience**: Add screen = create file (done!)

## File-Based Routing Conventions

Expo Router uses file system conventions inspired by Next.js App Router:

### Basic Routes

```
app/
├── index.tsx          → /
├── about.tsx          → /about
├── settings.tsx       → /settings
└── privacy.tsx        → /privacy
```

```typescript
// app/index.tsx
import { View, Text } from 'react-native'
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View>
      <Text>Welcome to Home</Text>
      <Link href="/about">Go to About</Link>
      <Link href="/settings">Settings</Link>
    </View>
  )
}
```

**Key points**:
- `index.tsx` becomes the route `/`
- Other files become routes matching their filename
- `Link` component handles navigation with type safety

### Nested Routes

```
app/
├── index.tsx              → /
└── blog/
    ├── index.tsx          → /blog
    ├── getting-started.tsx → /blog/getting-started
    └── advanced-tips.tsx   → /blog/advanced-tips
```

**Automatic navigation hierarchy**:
- `/blog` shows `blog/index.tsx`
- `/blog/getting-started` shows nested content
- Back button automatically works (navigates to `/blog`)

### Dynamic Routes

```
app/
├── users/
│   ├── index.tsx       → /users
│   └── [id].tsx        → /users/:id (matches /users/123)
└── posts/
    └── [slug].tsx      → /posts/:slug (matches /posts/hello-world)
```

```typescript
// app/users/[id].tsx
import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <View>
      <Text>User Profile: {id}</Text>
    </View>
  )
}

// Navigate with Link
<Link href="/users/123">User 123</Link>

// Navigate programmatically
import { router } from 'expo-router'
router.push('/users/456')
```

### Catch-All Routes

```
app/
└── blog/
    └── [...slug].tsx  → /blog/* (matches /blog/a, /blog/a/b, /blog/a/b/c)
```

```typescript
// app/blog/[...slug].tsx
import { useLocalSearchParams } from 'expo-router'

export default function BlogPost() {
  const { slug } = useLocalSearchParams<{ slug: string[] }>()

  // /blog/2023/12/my-post → slug = ['2023', '12', 'my-post']
  const [year, month, postSlug] = slug

  return <Text>Post: {postSlug} from {month}/{year}</Text>
}
```

### Optional Catch-All Routes

```
app/
└── shop/
    └── [[...categories]].tsx  → /shop AND /shop/* (optional)
```

```typescript
// app/shop/[[...categories]].tsx
import { useLocalSearchParams } from 'expo-router'

export default function Shop() {
  const { categories } = useLocalSearchParams<{ categories?: string[] }>()

  if (!categories) {
    // /shop - show all categories
    return <AllCategoriesView />
  }

  // /shop/electronics/phones - filter by categories
  return <FilteredView categories={categories} />
}
```

### Route Groups (No URL Segment)

Groups organize routes without affecting URLs:

```
app/
├── (auth)/           # Group: doesn't appear in URL
│   ├── _layout.tsx   # Shared auth layout
│   ├── login.tsx     → /login (not /auth/login)
│   └── register.tsx  → /register
└── (main)/           # Group: doesn't appear in URL
    ├── _layout.tsx   # Shared main layout
    ├── index.tsx     → /
    └── profile.tsx   → /profile
```

**Why groups?**
- Share layouts across routes
- Organize related screens
- No impact on URLs

### Hidden Routes (Underscore Prefix)

```
app/
├── index.tsx         → / (visible)
├── about.tsx         → /about (visible)
├── _components/      # Hidden: not routable
│   └── Header.tsx    # Shared component
└── _utils/           # Hidden: not routable
    └── auth.ts       # Utility functions
```

**Use cases**:
- Shared components
- Utility functions
- Anything that shouldn't be a route

## Layouts: The Navigation Foundation

Layouts define navigation structure and wrap child screens.

### Root Layout

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen
        name="posts/[id]"
        options={{ title: 'Post Detail' }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false }} // Hide header for tabs
      />
    </Stack>
  )
}
```

**What this does**:
- Creates a stack navigator (push/pop transitions)
- Configures screen options (title, header style)
- Wraps all routes in app directory

### Nested Layouts

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

### Shared Context via Layouts

```typescript
// app/_layout.tsx - Root layout with providers
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  )
}
```

**Pattern**: Layouts are perfect for:
- Authentication context
- Theme providers
- Analytics wrappers
- Error boundaries

## Navigation API: Complete Reference

### Router API

```typescript
import { router } from 'expo-router'

// Push (add to stack)
router.push('/profile/123')

// Replace (replace current route)
router.replace('/login')

// Navigate back
router.back()

// Check if can go back
if (router.canGoBack()) {
  router.back()
} else {
  router.replace('/') // Go home if no history
}

// Navigate with params
router.push({
  pathname: '/posts/[id]',
  params: { id: '456', highlight: 'true' }
})
// Results in: /posts/456?highlight=true

// Set params without navigation
router.setParams({ tab: 'comments' })
```

### Link Component

```typescript
import { Link } from 'expo-router'

// Basic link
<Link href="/about">About Us</Link>

// With params
<Link
  href={{
    pathname: '/users/[id]',
    params: { id: user.id }
  }}
>
  View Profile
</Link>

// Replace (no history entry)
<Link href="/login" replace>
  Login
</Link>

// Custom styling
<Link
  href="/settings"
  style={{ color: 'blue', fontWeight: 'bold' }}
>
  Settings
</Link>

// As child (render prop)
<Link href="/profile" asChild>
  <Pressable style={styles.button}>
    <Text>Go to Profile</Text>
  </Pressable>
</Link>
```

### Hooks

```typescript
import {
  useRouter,
  usePathname,
  useLocalSearchParams,
  useGlobalSearchParams,
  useSegments
} from 'expo-router'

function MyScreen() {
  // Access router
  const router = useRouter()

  // Current pathname
  const pathname = usePathname() // "/posts/123"

  // Local params (current route)
  const { id } = useLocalSearchParams<{ id: string }>()

  // Global params (across all routes)
  const globalParams = useGlobalSearchParams()

  // Current segments
  const segments = useSegments() // ['posts', '123']

  return (
    <View>
      <Text>Current path: {pathname}</Text>
      <Text>Post ID: {id}</Text>
      <Button title="Back" onPress={() => router.back()} />
    </View>
  )
}
```

## Type Safety: Auto-Generated Types

Expo Router generates TypeScript types from your file structure:

### Generated Href Type

```typescript
// Auto-generated based on your routes
type Href =
  | '/'
  | '/about'
  | '/posts'
  | `/posts/${string}` // Dynamic route
  | '/profile'
  | `/(tabs)/feed`
  | `/(tabs)/search`

// Type-safe links
import { Href } from 'expo-router'

const validHref: Href = '/posts/123' // ✅ Works
const invalidHref: Href = '/invalid-route' // ❌ TypeScript error
```

### Type-Safe Navigation

```typescript
import { router } from 'expo-router'

// TypeScript knows valid routes
router.push('/posts/123') // ✅ Valid
router.push('/invalid') // ❌ TypeScript error

// Type-safe params
router.push({
  pathname: '/posts/[id]',
  params: { id: '123' } // ✅ Correct param name
})

router.push({
  pathname: '/posts/[id]',
  params: { postId: '123' } // ❌ Wrong param name
})
```

### Typed Params Hook

```typescript
// app/posts/[id].tsx
import { useLocalSearchParams } from 'expo-router'

export default function PostDetail() {
  // Typed params
  const { id } = useLocalSearchParams<{ id: string }>()

  // TypeScript error if accessing wrong param
  const { postId } = useLocalSearchParams<{ id: string }>() // ❌ Error
}
```

## Advanced Patterns

### Authentication Guard

```typescript
// app/_layout.tsx
import { Stack, router, useSegments } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function RootLayout() {
  const { user, loading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      // Logged in but on auth screen, redirect home
      router.replace('/(tabs)')
    }
  }, [user, loading, segments])

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  )
}
```

### Modal Routes

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Modal presentation */}
      <Stack.Screen
        name="modal/[id]"
        options={{
          presentation: 'modal',
          title: 'Details'
        }}
      />
    </Stack>
  )
}

// Navigate to modal
<Link href="/modal/123">Open Modal</Link>
```

### Deep Linking Configuration

```typescript
// app.json
{
  "expo": {
    "scheme": "myapp",
    "plugins": [
      [
        "expo-router",
        {
          "origin": "https://myapp.com"
        }
      ]
    ]
  }
}
```

**Automatic deep links**:
- `myapp://` → `/`
- `myapp://posts/123` → `/posts/123`
- `https://myapp.com/posts/123` → `/posts/123`

No manual configuration needed!

### Error Boundaries

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'
import { ErrorBoundary } from 'expo-router'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ErrorBoundary>
  )
}

// app/+not-found.tsx - Custom 404 page
import { Link } from 'expo-router'

export default function NotFound() {
  return (
    <View>
      <Text>Page not found</Text>
      <Link href="/">Go Home</Link>
    </View>
  )
}
```

## Performance: Lazy Loading and Code Splitting

Expo Router automatically code-splits your routes:

**Before** (React Navigation):
```typescript
// All screens imported upfront
import HomeScreen from './screens/Home'
import PostsScreen from './screens/Posts'
import ProfileScreen from './screens/Profile'
// ... 50 more imports

// Bundle size: 3MB (everything loaded at startup)
```

**After** (Expo Router):
```typescript
// Routes lazy-loaded automatically
// app/index.tsx, app/posts/index.tsx, etc.

// Bundle breakdown:
// - Main bundle: 500KB (shared code)
// - /index route: 100KB (loaded on demand)
// - /posts route: 150KB (loaded on demand)
// - Total: 750KB, but only 600KB at startup (20% faster!)
```

**Measurement**:
```typescript
// app/posts/[id].tsx
export default function PostDetail() {
  useEffect(() => {
    console.log('PostDetail loaded') // Only logged when route accessed
  }, [])

  return <View>{/* ... */}</View>
}
```

## Comparison: React Navigation vs Expo Router

| Feature | React Navigation | Expo Router |
|---------|------------------|-------------|
| **Configuration** | Manual (200+ lines) | File-based (0 lines) |
| **Type safety** | Manual types | Auto-generated |
| **Deep linking** | Manual config | Automatic |
| **Code splitting** | Manual | Automatic |
| **Developer UX** | Boilerplate-heavy | Intuitive |
| **Flexibility** | Very flexible | Opinionated (but flexible) |
| **Web support** | Limited | Full (SSR/SSG ready) |
| **Learning curve** | Moderate | Easy (if you know Next.js) |

**When to use React Navigation**:
- Need very custom navigation behavior
- Existing large codebase (migration cost high)
- Team unfamiliar with file-based routing

**When to use Expo Router**:
- New projects (default choice)
- Teams familiar with Next.js
- Want best developer experience
- Need web support (universal app)

## Migration from React Navigation

### Step 1: Install Expo Router

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

### Step 2: Create app Directory

```
project/
├── app/                 # New: Expo Router routes
│   ├── _layout.tsx
│   └── index.tsx
└── src/
    ├── screens/         # Old: React Navigation screens
    │   ├── Home.tsx
    │   └── Posts.tsx
    └── navigation/      # Old: Can be deleted after migration
        └── index.tsx
```

### Step 3: Migrate Screen by Screen

```typescript
// Old: src/screens/Home.tsx (React Navigation)
export function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View>
      <Button
        title="Go to Posts"
        onPress={() => navigation.navigate('Posts')}
      />
    </View>
  )
}

// New: app/index.tsx (Expo Router)
import { Link } from 'expo-router'

export default function HomeScreen() {
  return (
    <View>
      <Link href="/posts">Go to Posts</Link>
    </View>
  )
}
```

### Step 4: Update Entry Point

```typescript
// Old: App.tsx (React Navigation)
import { NavigationContainer } from '@react-navigation/native'
import { RootNavigator } from './src/navigation'

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  )
}

// New: app/_layout.tsx (Expo Router)
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="posts/index" />
    </Stack>
  )
}
```

## Summary

**Expo Router transforms React Native navigation**:
- **File-based routing**: Your file structure is your navigation
- **Zero configuration**: Add a file, get a route
- **Type safety**: Auto-generated TypeScript types
- **Deep linking**: Automatic URL → route mapping
- **Code splitting**: Lazy-loaded routes for faster startup
- **Web-ready**: Same code works on web with SSR/SSG

**Key conventions**:
- `index.tsx` → root of directory
- `[param].tsx` → dynamic routes
- `[...slug].tsx` → catch-all routes
- `(group)/` → organization without URL impact
- `_layout.tsx` → navigation structure
- `_components/` → hidden from routing

**Production benefits**:
- 20-40% faster startup (code splitting)
- 80% less navigation boilerplate
- 100% type-safe routing
- Deep linking out-of-the-box
- Works on iOS, Android, and Web

**Next lecture**: We'll explore EAS Build, Expo's cloud build service that compiles native apps with custom native code and integrates seamlessly with Expo Router.
