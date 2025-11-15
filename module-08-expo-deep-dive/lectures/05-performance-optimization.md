# Lecture 5: Performance Optimization for Expo Apps

## Introduction

Performance isn't a feature—it's a requirement. Users expect apps to launch instantly, scroll smoothly at 60fps, and respond to interactions within 100ms. Fail to meet these expectations and users abandon your app. Google found that 53% of mobile users leave sites that take longer than 3 seconds to load. Mobile apps face even stricter scrutiny.

Expo apps have historically faced performance criticism: "too slow," "bundle too large," "startup takes forever." These criticisms were valid in 2018 but are outdated today. Modern Expo with Hermes, EAS Build, and proper optimization techniques produces apps that rival or exceed native performance.

**Why does this matter?** Your app competes with native apps built by teams at Google, Apple, and Meta. Users don't care about your tech stack—they care about speed. A slow Expo app reflects poorly on React Native as a whole. A fast Expo app proves cross-platform can match native performance.

This lecture covers bundle size optimization, startup time reduction, runtime performance tuning, network optimization, and production monitoring. You'll learn how to build Expo apps that feel native, backed by real metrics and profiling data.

## The Performance Pyramid

Mobile app performance has three layers:

```
┌─────────────────────────────────────┐
│      User Perception (UX)           │  ← What users feel
│  - App launches in <2s              │
│  - UI responds within 100ms         │
│  - Scrolling at 60fps               │
└─────────────────────────────────────┘
              ▲
┌─────────────────────────────────────┐
│      Runtime Performance            │  ← During app use
│  - Efficient rendering              │
│  - Optimized animations             │
│  - Smart caching                    │
└─────────────────────────────────────┘
              ▲
┌─────────────────────────────────────┐
│      Startup Performance            │  ← First impression
│  - Small bundle size                │
│  - Fast JavaScript execution        │
│  - Optimized assets                 │
└─────────────────────────────────────┘
```

Each layer builds on the one below. Optimize bottom-up: startup → runtime → UX.

## Bundle Size Optimization

Bundle size directly impacts startup time. Smaller bundle = faster download, faster parse, faster execution.

### Measuring Bundle Size

```bash
# Build production bundle
npx expo export

# Check bundle sizes
ls -lh dist/bundles

# Typical sizes:
# - Without optimization: 3-5 MB
# - With optimization: 1-2 MB
# - With Hermes: 0.5-1 MB
```

### Metro Bundler Configuration

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

module.exports = {
  ...config,
  transformer: {
    ...config.transformer,
    minifierConfig: {
      compress: {
        // Remove console.* in production
        drop_console: true,
        // Remove debugger statements
        drop_debugger: true,
        // Dead code elimination
        dead_code: true,
        // Inline single-use functions
        inline: 2,
        // Remove unused code
        unused: true,
      },
      mangle: {
        // Shorten variable names
        toplevel: true,
      },
      output: {
        // Remove comments
        comments: false,
        // ASCII only (smaller)
        ascii_only: true,
      },
    },
  },
  resolver: {
    ...config.resolver,
    // Resolve only production modules
    sourceExts: [...config.resolver.sourceExts, 'cjs'],
  },
}
```

**Impact**:
```
Before optimization: 3.2 MB
After optimization:  1.8 MB (44% smaller)
```

### Tree Shaking and Dead Code Elimination

```typescript
// ❌ Imports entire library (250 KB)
import _ from 'lodash'
const result = _.debounce(fn, 300)

// ✅ Import only what you need (5 KB)
import debounce from 'lodash/debounce'
const result = debounce(fn, 300)

// ❌ Imports all icons (500 KB)
import * as Icons from '@expo/vector-icons'

// ✅ Import specific icon set (50 KB)
import { Ionicons } from '@expo/vector-icons'
```

**Analyzing bundle composition**:

```bash
# Generate source map
npx expo export --source-maps

# Analyze with source-map-explorer
npx source-map-explorer dist/bundles/*.js.map

# Output shows:
# - lodash: 85 KB (remove unused imports)
# - moment.js: 230 KB (use date-fns instead)
# - react-native-vector-icons: 120 KB (use expo-vector-icons)
```

### Code Splitting and Lazy Loading

```typescript
// App.tsx - Split by route
import { lazy, Suspense } from 'react'
import { NavigationContainer } from '@react-navigation/native'

// Eagerly loaded (always needed)
import HomeScreen from './screens/Home'
import LoginScreen from './screens/Login'

// Lazy loaded (only when accessed)
const ProfileScreen = lazy(() => import('./screens/Profile'))
const SettingsScreen = lazy(() => import('./screens/Settings'))
const AnalyticsScreen = lazy(() => import('./screens/Analytics'))

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Always loaded */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Lazy loaded with Suspense */}
        <Stack.Screen name="Profile">
          {(props) => (
            <Suspense fallback={<LoadingScreen />}>
              <ProfileScreen {...props} />
            </Suspense>
          )}
        </Stack.Screen>

        <Stack.Screen name="Settings">
          {(props) => (
            <Suspense fallback={<LoadingScreen />}>
              <SettingsScreen {...props} />
            </Suspense>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

**Impact**:
```
Initial bundle (eager): 800 KB
Profile screen (lazy): 150 KB (loaded on demand)
Settings screen (lazy): 100 KB (loaded on demand)

Startup improvement: 250 KB smaller initial bundle = 30% faster startup
```

### Conditional Imports

```typescript
// Only import heavy libraries when needed
async function exportToCSV(data: any[]) {
  // PapaParse is 100 KB - only load when exporting
  const Papa = await import('papaparse')
  const csv = Papa.unparse(data)
  return csv
}

// Only load charting library on Analytics screen
export function AnalyticsScreen() {
  const [Chart, setChart] = useState<any>(null)

  useEffect(() => {
    // Victory chart is 200 KB - load async
    import('victory-native').then((module) => {
      setChart(() => module.VictoryChart)
    })
  }, [])

  if (!Chart) return <LoadingSpinner />

  return <Chart data={chartData} />
}
```

## Startup Time Optimization

### Hermes JavaScript Engine

Hermes is a JavaScript engine optimized for React Native, developed by Meta.

**Why Hermes?**
- Ahead-of-time (AOT) compilation: JavaScript compiled to bytecode during build
- Smaller bundle size: Bytecode is smaller than JavaScript
- Faster startup: No JIT compilation needed
- Less memory: More efficient garbage collection

**Enabling Hermes**:

```json
// app.json
{
  "expo": {
    "jsEngine": "hermes",
    "ios": {
      "jsEngine": "hermes"
    },
    "android": {
      "jsEngine": "hermes"
    }
  }
}
```

**Hermes performance metrics**:

| Metric | JSC (Default) | Hermes | Improvement |
|--------|---------------|---------|-------------|
| **App size** | 3.5 MB | 1.8 MB | -49% |
| **Startup time** | 2.1s | 1.3s | -38% |
| **Time to interactive** | 3.2s | 2.0s | -38% |
| **Memory (idle)** | 45 MB | 32 MB | -29% |
| **JS bundle parse** | 850ms | 120ms | -86% |

**Testing Hermes**:

```bash
# Build with Hermes
eas build --profile production --platform android

# Check bundle is Hermes bytecode
unzip app.aab
file base/assets/index.android.bundle
# Output: Hermes bytecode, version 74

# Measure startup
adb logcat | grep "START u0"
# Without Hermes: 2100ms
# With Hermes: 1300ms
```

### Initial Bundle Optimization

```typescript
// ❌ Heavy computation at module level (blocks startup)
import { heavyAnalytics } from './analytics'

// Runs immediately on import!
heavyAnalytics.initialize()

// ✅ Defer heavy work until after mount
import { heavyAnalytics } from './analytics'

export function App() {
  useEffect(() => {
    // Runs after UI renders (non-blocking)
    setTimeout(() => {
      heavyAnalytics.initialize()
    }, 100)
  }, [])

  return <AppContent />
}
```

**Impact**: 400ms faster startup (heavy work deferred)

### Splash Screen Optimization

```typescript
// app.json
{
  "expo": {
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }
  }
}
```

```typescript
// App.tsx - Keep splash visible until ready
import * as SplashScreen from 'expo-splash-screen'

// Prevent auto-hide
SplashScreen.preventAutoHideAsync()

export function App() {
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts, data, etc.
        await Font.loadAsync(customFonts)
        await loadUserData()
      } catch (error) {
        console.error(error)
      } finally {
        setAppReady(true)
      }
    }

    prepare()
  }, [])

  useEffect(() => {
    if (appReady) {
      // Hide splash when ready
      SplashScreen.hideAsync()
    }
  }, [appReady])

  if (!appReady) return null

  return <AppContent />
}
```

**Best practice**: Show splash until app is truly interactive, not just mounted.

## Runtime Performance

### Image Optimization with expo-image

`expo-image` is significantly faster than React Native's default `Image`:

```typescript
// ❌ React Native Image (slower)
import { Image } from 'react-native'

<Image
  source={{ uri: imageUrl }}
  style={{ width: 300, height: 200 }}
/>

// ✅ expo-image (faster, better caching)
import { Image } from 'expo-image'

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
  style={{ width: 300, height: 200 }}
/>
```

**Performance comparison**:

| Feature | React Native Image | expo-image |
|---------|-------------------|------------|
| **Loading time** | 850ms | 320ms |
| **Memory usage** | 12 MB (10 images) | 8 MB (10 images) |
| **Caching** | Manual | Automatic (memory + disk) |
| **Blurhash support** | ❌ | ✅ |
| **WebP support** | Limited | Full |

**Advanced expo-image features**:

```typescript
import { Image } from 'expo-image'

// Blurhash placeholder (looks better than gray box)
<Image
  source="https://example.com/photo.jpg"
  placeholder="LGF5]+Yk^6#M@-5c,1J5@[or[Q6."
  contentFit="cover"
  transition={200}
/>

// Priority loading (load critical images first)
<Image
  source={userAvatar}
  priority="high"
  cachePolicy="memory-disk"
/>

// Recycling for lists (FlatList optimization)
<Image
  source={item.image}
  recyclingKey={item.id}
  contentFit="cover"
/>
```

### List Performance (FlatList)

```typescript
// ❌ Slow FlatList (renders too much)
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
/>

// ✅ Optimized FlatList
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={(item) => item.id}

  // Performance optimizations
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}

  // getItemLayout for known heights (important!)
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}

  // Memoized components
  ItemSeparatorComponent={MemoizedSeparator}
  ListHeaderComponent={MemoizedHeader}
/>

// Memoize list items (critical!)
const ItemCard = memo(({ item }: { item: Item }) => {
  return (
    <View>
      <Text>{item.name}</Text>
    </View>
  )
})
```

**Performance impact**:

```
Without optimization:
- Rendering 1000 items: 3200ms
- Scroll FPS: 35-45 (janky)
- Memory: 180 MB

With optimization:
- Rendering 1000 items: 800ms (4x faster)
- Scroll FPS: 58-60 (smooth)
- Memory: 95 MB (47% less)
```

### Memory Management

```typescript
// ❌ Memory leak: listeners not cleaned up
useEffect(() => {
  const subscription = messaging.onMessage(handleMessage)
  // Missing cleanup!
}, [])

// ✅ Proper cleanup
useEffect(() => {
  const subscription = messaging.onMessage(handleMessage)

  return () => {
    subscription.unsubscribe()
  }
}, [])

// ❌ Memory leak: large data in state
const [allData, setAllData] = useState<Item[]>([])

useEffect(() => {
  // Loads 100,000 items into memory
  loadAllItems().then(setAllData)
}, [])

// ✅ Pagination (only load what's needed)
const [page, setPage] = useState(0)
const [items, setItems] = useState<Item[]>([])

useEffect(() => {
  // Load 50 items at a time
  loadItems(page, 50).then((newItems) => {
    setItems((prev) => [...prev, ...newItems])
  })
}, [page])
```

### Animation Performance

```typescript
// ❌ Slow: Animated.Value on JS thread
import { Animated } from 'react-native'

const fadeAnim = useRef(new Animated.Value(0)).current

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: false, // Runs on JS thread (slow!)
}).start()

// ✅ Fast: useNativeDriver on UI thread
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // Runs on native thread (60fps)
}).start()

// ✅ Best: react-native-reanimated (most performant)
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

function AnimatedComponent() {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 })
  }, [])

  return (
    <Animated.View style={{ opacity }}>
      <Text>Smooth animation</Text>
    </Animated.View>
  )
}
```

**FPS comparison**:
- `useNativeDriver: false`: 35-45 FPS (janky)
- `useNativeDriver: true`: 55-60 FPS (smooth)
- Reanimated: 60 FPS (buttery smooth)

## Network Performance

### API Request Optimization

```typescript
// ❌ Sequential requests (slow)
async function loadData() {
  const user = await api.getUser()
  const posts = await api.getPosts(user.id)
  const comments = await api.getComments(posts[0].id)
  // Total: 900ms (300ms × 3)
}

// ✅ Parallel requests (fast)
async function loadData() {
  const [user, posts, comments] = await Promise.all([
    api.getUser(),
    api.getPosts(),
    api.getComments()
  ])
  // Total: 300ms (parallel)
}

// ✅ Best: GraphQL (single request)
const { data } = await apollo.query({
  query: gql`
    query LoadData {
      user {
        id
        name
      }
      posts {
        id
        title
      }
      comments {
        id
        text
      }
    }
  `
})
// Total: 250ms (one request with all data)
```

### Caching with React Query

```typescript
import { useQuery } from '@tanstack/react-query'

// Automatic caching, deduplication, background refetch
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.getUser(userId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  })

  if (isLoading) return <Skeleton />

  return <UserCard user={data} />
}

// First load: API request (300ms)
// Second load (within 5 min): Instant (cached)
// Background refetch: Silent update when stale
```

### Offline-First with AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

async function loadUserWithCache(userId: string) {
  // 1. Load from cache immediately (instant UX)
  const cached = await AsyncStorage.getItem(`user:${userId}`)
  if (cached) {
    return JSON.parse(cached)
  }

  // 2. Fetch from API (fallback)
  const user = await api.getUser(userId)

  // 3. Cache for next time
  await AsyncStorage.setItem(`user:${userId}`, JSON.stringify(user))

  return user
}

// First load: 300ms (API request)
// Subsequent loads: 10ms (AsyncStorage)
```

## Measuring Performance

### React DevTools Profiler

```typescript
import { Profiler } from 'react'

function App() {
  const onRender = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    console.log(`${id} (${phase}): ${actualDuration.toFixed(2)}ms`)

    // Send to analytics
    if (actualDuration > 100) {
      analytics.logEvent('slow_render', {
        component: id,
        duration: actualDuration,
      })
    }
  }

  return (
    <Profiler id="App" onRender={onRender}>
      <AppContent />
    </Profiler>
  )
}
```

### Production Monitoring

```typescript
// Sentry Performance Monitoring
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: 'YOUR_DSN',
  enableAutoPerformanceTracking: true,
  tracesSampleRate: 0.1, // 10% of users
})

// Custom performance tracking
const transaction = Sentry.startTransaction({
  name: 'Load Dashboard',
  op: 'screen.load',
})

await loadDashboardData()

transaction.finish()

// View in Sentry dashboard:
// - P50: 850ms
// - P95: 1500ms
// - P99: 2100ms
```

### Startup Time Measurement

```typescript
// App.tsx
import { AppState } from 'react-native'

let startupTime = Date.now()

export function App() {
  useEffect(() => {
    const elapsed = Date.now() - startupTime

    console.log(`App startup: ${elapsed}ms`)

    analytics.logEvent('app_startup', {
      duration_ms: elapsed,
    })
  }, [])

  return <AppContent />
}
```

## Platform-Specific Optimizations

### iOS Optimizations

```json
// app.json
{
  "expo": {
    "ios": {
      // Enable bitcode (smaller app size)
      "bitcode": true,

      // Deployment target (drop old iOS versions)
      "deploymentTarget": "13.0",

      // App thinning (device-specific assets)
      "supportsTablet": false
    }
  }
}
```

### Android Optimizations

```json
// app.json
{
  "expo": {
    "android": {
      // Enable Proguard (code shrinking)
      "enableProguardInReleaseBuilds": true,

      // Enable R8 (modern code optimizer)
      "enableShrinkingInReleaseBuilds": true,

      // Split APKs by CPU architecture
      "enableABISplit": true
    }
  }
}
```

**Impact of Android optimizations**:
```
Before:
- APK size: 85 MB (universal)
- Startup: 2.3s

After (with splits):
- APK size: 28 MB (arm64-v8a only)
- Startup: 1.5s (35% faster)
```

## Best Practices Summary

### 1. Bundle Size
- ✅ Use Hermes engine
- ✅ Enable Metro minification
- ✅ Import only what you need (tree shaking)
- ✅ Lazy load routes and heavy components
- ✅ Remove console.log in production

### 2. Startup Time
- ✅ Defer heavy initialization
- ✅ Use splash screen until truly ready
- ✅ Optimize initial bundle
- ✅ Cache critical data

### 3. Runtime Performance
- ✅ Use expo-image for images
- ✅ Optimize FlatList (getItemLayout, memoization)
- ✅ Use useNativeDriver for animations
- ✅ Clean up listeners and timers
- ✅ Avoid inline functions in renders

### 4. Network
- ✅ Parallelize API requests
- ✅ Use caching (React Query)
- ✅ Implement offline-first patterns
- ✅ Compress images before upload

### 5. Monitoring
- ✅ Use React Profiler in dev
- ✅ Enable Sentry in production
- ✅ Track startup time
- ✅ Monitor bundle size over time

## Real-World Performance Metrics

**Case study: Expo app before/after optimization**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Bundle size** | 3.8 MB | 1.2 MB | -68% |
| **App size (Android)** | 85 MB | 28 MB | -67% |
| **Startup time** | 2.3s | 1.1s | -52% |
| **Time to interactive** | 3.5s | 1.8s | -49% |
| **Memory (idle)** | 65 MB | 38 MB | -42% |
| **FlatList FPS** | 38 FPS | 59 FPS | +55% |
| **Image load time** | 750ms | 280ms | -63% |

**Optimizations applied**:
1. Enabled Hermes
2. Metro minification config
3. Lazy loaded 3 heavy screens
4. Switched to expo-image
5. Optimized FlatList with getItemLayout
6. Used React Query for caching
7. Removed 4 unused large dependencies

**Development time**: 3 days
**Impact**: App feels native, 5-star reviews increased 40%

## Summary

**Performance optimization is critical for mobile apps**:
- **Users expect native speed** regardless of tech stack
- **Bundle size impacts startup** (smaller = faster)
- **Runtime performance affects retention** (janky = users leave)
- **Measurement is essential** (can't improve what you don't measure)

**Key optimization areas**:
1. **Bundle size**: Hermes, minification, tree shaking, lazy loading
2. **Startup time**: Defer heavy work, optimize splash, cache data
3. **Runtime**: expo-image, FlatList optimization, native animations
4. **Network**: Parallel requests, caching, offline-first
5. **Monitoring**: Profiler, Sentry, startup tracking

**Proven techniques**:
- Hermes engine: -50% bundle size, -40% startup time
- expo-image: -60% image load time
- FlatList optimization: 60 FPS smooth scrolling
- React Query: Instant cached loads
- Code splitting: -30% initial bundle

**Production checklist**:
- [ ] Hermes enabled
- [ ] Metro minification configured
- [ ] Heavy screens lazy loaded
- [ ] expo-image for all images
- [ ] FlatList with getItemLayout
- [ ] useNativeDriver for animations
- [ ] React Query for API caching
- [ ] Sentry performance monitoring
- [ ] Bundle size tracked in CI/CD

**Real-world results**: With these optimizations, Expo apps achieve:
- <2 second startup (competitive with native)
- 60 FPS scrolling (indistinguishable from native)
- <30 MB app size (smaller than many native apps)
- <40 MB memory usage (efficient)

**Module 8 Complete!** You now have comprehensive knowledge of Expo's ecosystem: file-based routing, cloud builds, OTA updates, native customization, and performance optimization. You can build production-ready cross-platform apps that rival native quality.

**Next module**: We'll explore cross-platform architecture patterns, including monorepo setup, shared component libraries, and server-driven UI for maximum code reuse across web, iOS, and Android.
