# Lecture 2: Fabric Renderer - The C++ Rendering Engine

## Introduction

Fabric is React Native's new rendering system that fundamentally changes how React components become native UI. While the old architecture relied on an asynchronous JSON bridge to communicate layout and UI changes, Fabric introduces a C++-based rendering pipeline that enables synchronous operations, type safety, and seamless integration with React 18's concurrent features.

This isn't just an "optimization" - Fabric represents a complete reimagining of how React Native renders UI. Understanding Fabric is crucial because it unlocks patterns that were impossible before: synchronous layout measurements, priority-based rendering, and smooth animations that run at native 60fps+.

## The Problem Fabric Solves

### The Old UIManager: Async by Design

In the original React Native architecture, the UIManager was the native component responsible for creating and updating views:

```typescript
// What happens when you render this:
<View style={{ width: 100, backgroundColor: 'red' }}>
  <Text>Hello</Text>
</View>

// Old architecture flow:
// 1. React creates element tree in JavaScript
// 2. Serializes to JSON: {"type": "View", "props": {"width": 100, ...}}
// 3. Sends over bridge to native
// 4. UIManager deserializes JSON
// 5. Creates/updates native views
// 6. Layout calculations happen
// 7. Native views render
// Total time: 30-50ms for simple updates
```

**The fundamental issue**: Every step crossing the bridge added latency, and more importantly, everything was asynchronous. JavaScript couldn't know the actual rendered dimensions until the native side sent them back across the bridge.

### Real-World Pain Points

#### Pain Point 1: Measuring Layout

```typescript
// Common pattern: Need to measure a component after render
function AdaptiveComponent() {
  const viewRef = useRef(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)

  useEffect(() => {
    // Old UIManager: Async measurement
    viewRef.current?.measure((x, y, width, height) => {
      setMeasuredWidth(width)
    })
  }, [])

  return (
    <View ref={viewRef}>
      {/* First render: measuredWidth is 0 */}
      {/* Second render: measuredWidth is correct */}
      {/* User sees layout shift! */}
      <Text style={{ fontSize: measuredWidth / 10 }}>
        Adaptive Text
      </Text>
    </View>
  )
}
```

**Why this hurts**:
- Component renders twice
- Layout shift visible to user
- Can't make layout-dependent decisions synchronously
- No way to avoid the initial wrong render

#### Pain Point 2: Animations

```typescript
// Gesture-driven animation (like pull-to-refresh)
function PullToRefresh() {
  const translateY = useRef(new Animated.Value(0)).current

  const handlePanResponder = (gestureState) => {
    // Problem: gestureState comes from native
    // Must cross bridge to update animation
    // Animation lags behind finger
    translateY.setValue(gestureState.dy)
  }

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Content />
    </Animated.View>
  )
}
```

**The lag**:
- Touch event in native (0ms)
- Event crosses bridge to JS (15-30ms)
- JS updates animation value
- Value crosses bridge back to native (15-30ms)
- **Total: 30-60ms lag** between finger and animation

Users perceive this as the UI "dragging behind" their finger.

#### Pain Point 3: Conditional Rendering Based on Layout

```typescript
// Want to show different UI based on available space
function ResponsiveHeader() {
  const [containerWidth, setContainerWidth] = useState(0)

  // ❌ This doesn't work reliably with old architecture:
  // You can't measure before first render, so you show wrong UI initially
  useEffect(() => {
    measureContainer().then(setContainerWidth)
  }, [])

  return (
    <View>
      {containerWidth > 600 ? (
        <FullHeader />
      ) : (
        <CompactHeader />
      )}
    </View>
  )
}
```

With async layout, you're forced to render twice: once with a guess, then again with actual measurements.

## Fabric's Architecture

Fabric solves these problems by introducing a **C++ shadow tree** that sits between React and native views:

```
┌─────────────────────────────────────┐
│   React (JavaScript)                │
│   - Component tree                  │
│   - Fiber reconciliation            │
└──────────────┬──────────────────────┘
               │ JSI (synchronous!)
               ↓
┌─────────────────────────────────────┐
│   Shadow Tree (C++)                 │
│   - Type-safe nodes                 │
│   - Yoga layout engine              │
│   - Shared iOS/Android              │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Native Views (Platform-specific)  │
│   - UIView (iOS)                    │
│   - View (Android)                  │
└─────────────────────────────────────┘
```

### Why C++?

**Performance**: C++ is compiled, runs close to the metal
**Cross-platform**: Same code works on iOS and Android
**Type safety**: Compile-time checking vs runtime JSON parsing
**Memory efficiency**: Better control over allocations
**Integration**: Can call into Objective-C++ (iOS) and JNI (Android) efficiently

### The Shadow Tree: Fabric's Core Innovation

The Shadow Tree is a C++ representation of your UI that mirrors React's Fiber tree:

```cpp
// Simplified shadow node structure
class ShadowNode {
  std::string componentName;          // "View", "Text", etc.
  folly::dynamic props;                // Component props
  std::vector<ShadowNode*> children;   // Child nodes
  LayoutMetrics layoutMetrics;         // Calculated layout

  // Methods
  LayoutMetrics measure();             // Synchronous layout calculation
  void updateProps(folly::dynamic newProps);
  void appendChild(ShadowNode* child);
};
```

**What makes it special**:

1. **Lives in C++**: No bridge crossing for layout calculations
2. **Type-safe**: Props are C++ structs, not JSON
3. **Synchronously queryable**: JavaScript can read layout via JSI
4. **Shared state**: iOS and Android use identical shadow tree
5. **Persistent**: Doesn't recreate on every update like JSON serialization

## Synchronous Layout: The Game Changer

This is Fabric's killer feature. With the shadow tree in C++, JavaScript can synchronously measure layout:

```typescript
// Fabric enables this:
function PerfectlyAdaptiveComponent() {
  const viewRef = useRef(null)

  const handleLayout = () => {
    // Synchronous measurement via JSI!
    const layout = viewRef.current?.measureLayout()
    // layout = { x, y, width, height } - immediately!

    // Make decisions based on actual layout
    if (layout.width < 400) {
      showCompactUI()
    }
  }

  return (
    <View ref={viewRef} onLayout={handleLayout}>
      {/* UI renders correctly the first time! */}
      {/* No layout shift! */}
    </View>
  )
}
```

### How Synchronous Measurement Works

```cpp
// C++ implementation (simplified)
LayoutMetrics ShadowNode::measureLayout() {
  if (!layoutMetrics.isDirty) {
    // Cache hit - return immediately
    return layoutMetrics;
  }

  // Calculate layout using Yoga
  YGNodeCalculateLayout(yogaNode, YGUndefined, YGUndefined, YGDirectionLTR);

  // Cache result
  layoutMetrics = {
    .x = YGNodeLayoutGetLeft(yogaNode),
    .y = YGNodeLayoutGetTop(yogaNode),
    .width = YGNodeLayoutGetWidth(yogaNode),
    .height = YGNodeLayoutGetHeight(yogaNode)
  };

  layoutMetrics.isDirty = false;
  return layoutMetrics;
}
```

**Exposed to JavaScript via JSI**:

```typescript
// JavaScript can call C++ synchronously
const layout = viewRef.current.measureLayout()
// Calls C++ function directly, returns immediately
```

**Performance impact**:
- Old async: 30-50ms
- New sync: <1ms
- **30-50x faster**

### Real-World Example: Adaptive Typography

```typescript
function AdaptiveTypography({ children }: { children: string }) {
  const [fontSize, setFontSize] = useState(16)
  const textRef = useRef(null)

  const adjustFontSize = () => {
    // Synchronous measurement!
    const layout = textRef.current?.measureLayout()

    if (!layout) return

    // Calculate perfect font size to fit
    const containerWidth = layout.width
    const optimalSize = calculateOptimalFontSize(children, containerWidth)

    setFontSize(optimalSize)
  }

  return (
    <View onLayout={adjustFontSize}>
      <Text ref={textRef} style={{ fontSize }}>
        {children}
      </Text>
    </View>
  )
}
```

**With old architecture**: Text renders at 16px, measures, rerenders at correct size (layout shift)

**With Fabric**: Text can potentially render at correct size immediately (no layout shift)

## The Yoga Layout Engine

Fabric uses Yoga, Facebook's cross-platform layout engine that implements Flexbox:

```cpp
// Yoga node creation
YGNodeRef yogaNode = YGNodeNew();

// Configure flexbox properties
YGNodeStyleSetFlexDirection(yogaNode, YGFlexDirectionRow);
YGNodeStyleSetJustifyContent(yogaNode, YGJustifyCenter);
YGNodeStyleSetAlignItems(yogaNode, YGAlignCenter);

// Set dimensions
YGNodeStyleSetWidth(yogaNode, 100);
YGNodeStyleSetHeight(yogaNode, 50);

// Calculate layout
YGNodeCalculateLayout(yogaNode, YGUndefined, YGUndefined, YGDirectionLTR);

// Read results
float left = YGNodeLayoutGetLeft(yogaNode);
float top = YGNodeLayoutGetTop(yogaNode);
```

**Why Yoga matters**:
- **Consistent**: Same layout algorithm on iOS and Android
- **Fast**: C++ implementation, highly optimized
- **Proven**: Powers Facebook, Instagram, other major apps
- **Standards-based**: Implements CSS Flexbox spec

### Layout Calculation Flow

```
React Update
    ↓
Create/Update Shadow Nodes (C++)
    ↓
Mark layout as dirty
    ↓
Yoga calculates layout (C++)
    ↓
Layout metrics cached in shadow nodes
    ↓
Native views positioned/sized
    ↓
Screen renders
```

**Key insight**: Layout happens in C++, shared between platforms, synchronously accessible.

## Mount/Update Pipeline

Understanding how Fabric mounts and updates components is crucial:

### Mounting New Components

```typescript
// When you render this:
<View style={{ padding: 10 }}>
  <Text>Hello</Text>
</View>
```

**Fabric's mounting process**:

```cpp
// 1. Create shadow node
auto viewShadowNode = std::make_shared<ViewShadowNode>();
viewShadowNode->props = ViewProps{.padding = 10};

// 2. Create child shadow node
auto textShadowNode = std::make_shared<TextShadowNode>();
textShadowNode->props = TextProps{.text = "Hello"};

// 3. Build tree
viewShadowNode->appendChild(textShadowNode);

// 4. Calculate layout
viewShadowNode->layout();

// 5. Create native views
UIView* nativeView = [[UIView alloc] init];
nativeView.padding = UIEdgeInsetsMake(10, 10, 10, 10);

UILabel* nativeLabel = [[UILabel alloc] init];
nativeLabel.text = @"Hello";

[nativeView addSubview:nativeLabel];

// 6. Apply layout
nativeView.frame = CGRectMake(
  viewShadowNode->layoutMetrics.x,
  viewShadowNode->layoutMetrics.y,
  viewShadowNode->layoutMetrics.width,
  viewShadowNode->layoutMetrics.height
);
```

**Timeline**:
- Create shadow nodes: <1ms
- Layout calculation: 1-3ms
- Create native views: 2-5ms
- **Total: 3-9ms** (vs 30-50ms with old architecture)

### Updating Components

```typescript
// Update from:
<View style={{ backgroundColor: 'red' }} />

// To:
<View style={{ backgroundColor: 'blue' }} />
```

**Fabric's update process**:

```cpp
// 1. React detects prop change
// 2. Creates new shadow node (shadow nodes are immutable!)
auto newShadowNode = viewShadowNode->clone();
newShadowNode->props.backgroundColor = Color::blue;

// 3. Diff algorithm determines what changed
auto mutations = diff(oldShadowNode, newShadowNode);
// mutations = [UpdateProp{node: view, prop: "backgroundColor", value: blue}]

// 4. Apply mutations to native
nativeView.backgroundColor = [UIColor blueColor];

// 5. If layout changed, recalculate
if (propsAffectLayout(mutations)) {
  newShadowNode->layout();
  applyLayoutToNative(nativeView, newShadowNode->layoutMetrics);
}
```

**Immutability benefit**: Can compare pointers for equality (fast), and old tree stays valid for concurrent rendering.

## Concurrent Rendering Support

Fabric is designed to work with React 18's concurrent features:

```typescript
import { startTransition } from 'react'

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = (text: string) => {
    // High priority: Update input immediately
    setQuery(text)

    // Low priority: Update results can be interrupted
    startTransition(() => {
      const filtered = searchLargeDataset(text)
      setResults(filtered)
    })
  }

  return (
    <>
      <TextInput
        value={query}
        onChangeText={handleSearch}
      />
      <ResultsList results={results} />
    </>
  )
}
```

**How Fabric handles this**:

1. **High-priority update (input)**:
   - Fabric immediately updates shadow tree
   - Applies to native view
   - User sees input update with no lag

2. **Low-priority update (results)**:
   - Fabric starts building new shadow tree
   - If another high-priority update arrives, **interrupts**
   - Discards partial work, processes high-priority update
   - Resumes low-priority work when idle

**This is impossible with the old architecture** because the async bridge couldn't be interrupted.

### Priority Levels in Fabric

```cpp
enum class EventPriority {
  Discrete = 0,      // Clicks, key presses - highest priority
  Continuous = 1,    // Scroll, mousemove - high priority
  Default = 2,       // Most updates - normal priority
  Idle = 3,          // Prefetching, analytics - lowest priority
};
```

Fabric schedules shadow tree updates based on priority, ensuring responsive UI.

## Avoiding Unnecessary Work

Fabric optimizes rendering through several techniques:

### 1. Shadow Node Reuse

```typescript
// When these props don't change:
<View style={{ width: 100 }}>
  <Text>Static</Text>
</View>

// Fabric reuses shadow nodes:
if (oldProps === newProps) {
  // Pointer equality check - very fast!
  return oldShadowNode; // Reuse, no work needed
}
```

**Impact**: Components that don't change do zero work.

### 2. Layout Result Caching

```cpp
LayoutMetrics ShadowNode::layout() {
  if (!isDirty && cachedLayout.isValid) {
    return cachedLayout; // Return immediately
  }

  // Only calculate if dirty
  return calculateLayout();
}
```

**Impact**: Measuring the same component multiple times is essentially free.

### 3. Granular Updates

```typescript
// Only the changed property updates:
<View
  style={{
    backgroundColor: 'red',  // Changes
    width: 100,              // Doesn't change
    height: 100              // Doesn't change
  }}
/>

// Fabric mutation:
{
  type: 'updateProp',
  node: viewNode,
  prop: 'backgroundColor',
  value: 'red'
}

// Only backgroundColor updates in native, not width/height
```

**Impact**: Minimal work for small changes.

## Performance Characteristics

Let's quantify Fabric's improvements:

### Benchmark 1: Mounting 1000 Views

```typescript
// Render 1000 simple views
<View>
  {Array.from({ length: 1000 }, (_, i) => (
    <View key={i} style={{ width: 100, height: 50 }} />
  ))}
</View>
```

**Old UIManager**:
- Create JSON for 1000 nodes: 50ms
- Serialize and send: 30ms
- Native deserialize: 40ms
- Create views: 100ms
- Layout: 80ms
- **Total: 300ms**

**Fabric**:
- Create shadow nodes: 20ms
- Layout (Yoga): 40ms
- Create native views: 80ms
- **Total: 140ms**
- **2.1x faster**

### Benchmark 2: Updating 100 Views

```typescript
// Change backgroundColor on 100 views
views.forEach(view => {
  view.setBackgroundColor('blue')
})
```

**Old UIManager**:
- Create update messages: 10ms
- Serialize: 15ms
- Send across bridge: 10ms
- Apply updates: 20ms
- **Total: 55ms**

**Fabric**:
- Create shadow node mutations: 5ms
- Apply to native: 15ms
- **Total: 20ms**
- **2.75x faster**

### Benchmark 3: Measuring Layout

```typescript
// Measure 100 components
components.forEach(comp => {
  const layout = comp.measureLayout()
})
```

**Old UIManager**:
- Queue 100 measure requests: 5ms
- Wait for callbacks: 40ms (async!)
- **Total: 45ms**

**Fabric**:
- Synchronous measurements: 2ms
- **Total: 2ms**
- **22.5x faster**

## Real-World Impact

### Case Study: Instagram Feed

**Challenge**: Smooth scrolling through feed with images, videos, and interactive elements.

**Old architecture issues**:
- Scroll events lag (30ms bridge delay)
- Image loading triggers reflows across bridge
- Video player controls have input lag

**With Fabric**:
```typescript
function FeedItem({ post }) {
  // Synchronous layout prevents reflows
  const [imageSize, setImageSize] = useState(null)

  const handleImageLoad = () => {
    // Measure immediately, adjust layout
    const layout = imageRef.current.measureLayout()
    setImageSize({ width: layout.width, height: layout.height })
  }

  // Gesture handling is immediate
  const handleDoubleTap = useCallback(() => {
    // No lag - JSI enables synchronous native calls
    likePost(post.id)
  }, [post.id])

  return <FeedCard onDoubleTap={handleDoubleTap}>
    <Image ref={imageRef} onLoad={handleImageLoad} />
  </FeedCard>
}
```

**Results**:
- Scroll FPS: 35-45 → 60
- Input lag: 50ms → <10ms
- Layout shifts: Frequent → Rare

### Case Study: React Native Windows

Microsoft's React Native Windows implementation uses Fabric:

**Why it matters**: Windows has different threading models than iOS/Android. The old bridge didn't map well.

**With Fabric**:
- Shared C++ shadow tree works on Windows
- Yoga layout consistent with iOS/Android
- Same performance characteristics

**Result**: React Native Windows apps feel native, perform like Win32 apps.

## Migration Considerations

### Enabling Fabric

```javascript
// iOS: ios/Podfile
use_frameworks!
use_react_native!(
  :fabric_enabled => true
)

// Android: android/gradle.properties
newArchEnabled=true
```

### Compatibility

Most components work unchanged:

```typescript
// This code works identically with Fabric:
<View style={{ flex: 1 }}>
  <Text>Hello</Text>
  <TouchableOpacity onPress={() => console.log('tap')}>
    <Text>Tap me</Text>
  </TouchableOpacity>
</View>
```

### Potential Breaking Changes

**Custom native components** may need updates:

```objc
// Old UIManager approach
RCT_EXPORT_VIEW_PROPERTY(customProp, NSString)

// Fabric approach - define in C++
class CustomViewProps : public ViewProps {
  std::string customProp;
};
```

**Layout effects** might fire differently:
```typescript
// With Fabric, layout is synchronous
// so useLayoutEffect might behave slightly differently
useLayoutEffect(() => {
  // This runs after layout is calculated
  // but before paint - perfect for measurements
}, [])
```

## Summary: Why Fabric Matters

Fabric fundamentally changes what's possible in React Native:

**Before Fabric**:
- Async layout measurements
- JSON serialization overhead
- Can't interrupt renders
- Platform-specific layout quirks

**With Fabric**:
- **Synchronous layout** - measure immediately
- **Type-safe C++** - no JSON overhead
- **Concurrent rendering** - interruptible updates
- **Cross-platform consistency** - Yoga everywhere
- **60fps standard** - not aspirational

The result: React Native apps that feel truly native, with none of the "lag" that plagued the old architecture.

**Next**: Lecture 3 examines TurboModules - the lazy-loading, type-safe replacement for Native Modules.
