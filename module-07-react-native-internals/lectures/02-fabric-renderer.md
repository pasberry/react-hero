# Lecture 2: Fabric Renderer Deep Dive

## Introduction

Fabric is React Native's new rendering system that replaces the old UIManager. It enables synchronous layout, concurrent rendering, and better integration with React 18's concurrent features.

## Fabric Architecture

### Shadow Tree

The Shadow Tree is Fabric's core innovation - a C++ representation of the UI tree that's shared across platforms.

```
React Component Tree (JS)
         ↓
  Shadow Tree (C++)  ← Shared between iOS/Android!
         ↓
  Native Views (Platform)
```

**Benefits**:
- **Type-safe**: C++ types instead of JSON
- **Cross-platform**: Same layout logic everywhere
- **Fast**: No serialization needed
- **Synchronous**: Can read layout immediately

### Component Lifecycle

```typescript
// Component mounts
<View style={{ width: 100 }}>
  <Text>Hello</Text>
</View>

// Fabric creates:
// 1. Shadow Node (C++) for View
// 2. Shadow Node (C++) for Text
// 3. Native View (iOS/Android)
// 4. Links them together
```

## Synchronous Layout

### Old UIManager (Async)

```typescript
const viewRef = useRef(null)

// Measure layout
viewRef.current.measure((x, y, width, height) => {
  // Async callback - maybe 50ms later
  console.log({ x, y, width, height })
})
```

### Fabric (Sync)

```typescript
import { measureLayout } from 'react-native/Libraries/ReactNative/UIManager'

const layout = measureLayout(viewRef.current)
console.log(layout) // Immediately!
```

## Concurrent Rendering

Fabric works with React 18's concurrent features:

```typescript
import { startTransition } from 'react'

function App() {
  const [items, setItems] = useState([])

  const loadMore = () => {
    startTransition(() => {
      // Low-priority update
      setItems(prev => [...prev, ...newItems])
    })
  }

  return <FlatList data={items} />
}

// Fabric can interrupt low-priority renders
// for high-priority updates (like user input)
```

## Priority-Based Rendering

```cpp
// Simplified C++ priority system
enum class Priority {
  Immediate,   // User input, animations
  Normal,      // Most updates
  Low,         // Offscreen content
  Idle,        // Prefetching
};

// Fabric processes high-priority updates first
```

## Real-World Performance

### Before Fabric
- Layout: Async, 50ms lag
- Animations: Janky
- Concurrent features: Not supported

### After Fabric
- Layout: Synchronous
- Animations: 60fps
- Concurrent features: Full support

## Summary

Fabric provides:
- Synchronous layout measurement
- Type-safe C++ shadow tree
- Concurrent rendering support
- Cross-platform layout consistency
- Better animation performance

**Next**: Lecture 3 covers TurboModules for native code integration.
