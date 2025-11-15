# Lecture 1: Architecture Evolution - Understanding the Bridge to Bridgeless Journey

## Introduction

React Native's architecture has undergone one of the most significant transformations in mobile development history. This isn't just about making things "faster" - it's about fundamentally rethinking how JavaScript and native code communicate, how UI updates are processed, and how we can achieve truly native performance while maintaining React's developer experience.

This lecture examines the journey from the original bridge-based architecture to the new bridgeless architecture, exploring not just *what* changed, but *why* these changes were necessary and *how* they solve fundamental limitations that made certain types of apps impossible to build with React Native.

## The Original Architecture: Understanding the Bridge

### The Three-Thread Model

To understand why the new architecture matters, we first need to deeply understand what the bridge was and why it existed.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  JavaScript      │    │     Bridge       │    │     Native       │
│  Thread          │◄──►│  (Async Queue)   │◄──►│     Thread       │
│                  │    │                  │    │                  │
│ • React Runtime  │    │ • JSON Messages  │    │ • UI Rendering   │
│ • Your App Code  │    │ • Serialization  │    │ • Platform APIs  │
│ • State Logic    │    │ • Message Queue  │    │ • Gestures       │
│ • Event Handlers │    │ • Batching       │    │ • Hardware       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

**Why three threads?** React Native needed to solve a fundamental problem: how do you run JavaScript (which expects a single-threaded event loop) while also running native UI (which has its own threading requirements on iOS/Android)?

The solution was elegant but came with costs:

1. **JavaScript Thread**: Runs your React code, manages state, processes events. This is where `setState`, `useEffect`, and your business logic execute.

2. **Native Thread**: Manages the actual native views (UIView on iOS, View on Android), handles user gestures, and communicates with platform APIs.

3. **Bridge**: An asynchronous message queue that serializes data to JSON, sends it between threads, and deserializes it on the other side.

### Why This Architecture Made Sense Initially

When React Native launched in 2015, this architecture was a brilliant compromise:

**Advantages**:
- **Platform Isolation**: JS and native could evolve independently
- **Cross-Platform**: Same bridge worked on iOS and Android
- **Safety**: Crashes in JS wouldn't necessarily crash the native app
- **Familiar Model**: Web developers understood async message passing

**The Async-First Design**:

```typescript
// JavaScript side
import { NativeModules } from 'react-native'

function getUserLocation() {
  NativeModules.LocationManager.getCurrentPosition(
    position => {
      console.log('Got position:', position)
    },
    error => {
      console.error('Location error:', error)
    }
  )
}
```

Notice the callback pattern? Everything had to be async because crossing the bridge took time. The JavaScript thread would:
1. Serialize the method name and parameters to JSON
2. Queue the message for the bridge
3. Wait for the native thread to process it
4. Receive the callback when native finished

### The Hidden Costs of Bridging

As React Native apps grew more complex, the bridge's limitations became apparent. Let's examine them in depth:

#### 1. JSON Serialization Tax

Every single value crossing the bridge had to convert to JSON:

```typescript
// Example: Sending image data to native
const processImage = (imageData: Uint8Array) => {
  // Problem: imageData must serialize to JSON
  // Uint8Array → Array → JSON string
  // For a 1MB image: ~3MB JSON string
  NativeModules.ImageProcessor.applyFilter(
    Array.from(imageData), // Expensive conversion!
    'sepia'
  )
}
```

**Why this hurts**:
- **Memory**: A Uint8Array of 1MB becomes ~3MB JSON string
- **CPU**: Converting to JSON is computationally expensive
- **GC Pressure**: Creates temporary objects that need garbage collection
- **Copies**: Data gets copied multiple times (JS memory → JSON → Native memory)

For text and numbers, this overhead was acceptable. For images, audio, or large datasets, it was prohibitive.

#### 2. Async Everything

Because the bridge was fundamentally asynchronous, you couldn't synchronously read values from native:

```typescript
// ❌ This was IMPOSSIBLE with the bridge:
function getScreenWidth(): number {
  return NativeModules.Dimensions.get('window').width
}

// ✅ Had to do this instead:
function Component() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    NativeModules.Dimensions.get('window', dimensions => {
      setWidth(dimensions.width)
    })
  }, [])

  // width is 0 on first render!
  return <View style={{ width }} />
}
```

**Why this matters for performance**:
- Initial render has wrong dimensions
- Component renders twice (once with 0, once with actual width)
- Layout shift visible to user
- Can't make layout decisions based on measurements

#### 3. Batching Creates Latency

The bridge batched messages for efficiency, but this added perceptible lag:

```typescript
<ScrollView
  onScroll={event => {
    // This fires 60 times per second while scrolling
    const offsetY = event.nativeEvent.contentOffset.y
    updateScrollPosition(offsetY)
  }}
>
```

**What actually happens**:
1. Native detects scroll (0ms)
2. Event batched with other events (wait up to 16ms for batch)
3. Batch serialized to JSON (3-5ms)
4. Sent across bridge (1-2ms)
5. Deserialized in JS (2-3ms)
6. Event handler executes (2ms)
7. setState causes re-render
8. New UI serialized back across bridge (5-10ms)

**Total latency: 30-40ms minimum**

At 60fps, you have 16ms per frame. This bridge roundtrip eats 2-3 frames, making smooth scrolling impossible for JS-driven UI updates.

#### 4. Startup Time Death by a Thousand Modules

```typescript
// At app startup, ALL native modules loaded:
import { NativeModules } from 'react-native'

const {
  AsyncStorage,    // ✓ Loaded
  Camera,          // ✓ Loaded (even if you never take photos!)
  Geolocation,     // ✓ Loaded
  PushNotifications, // ✓ Loaded
  Bluetooth,       // ✓ Loaded
  NFC,             // ✓ Loaded
  Calendar,        // ✓ Loaded
  Contacts,        // ✓ Loaded
  // ... 50+ modules
} = NativeModules
```

**Impact on startup**:
- Each module: 5-15ms initialization
- 50 modules × 10ms = 500ms just loading modules
- This happens BEFORE your app code runs
- User sees splash screen for longer

**Why was this necessary?** The bridge needed to know about all modules upfront to route messages correctly. There was no way to lazily load a module when first accessed.

### Real-World Breaking Points

Let's examine scenarios where the bridge architecture fundamentally couldn't deliver acceptable performance:

#### Example 1: Real-Time Audio Visualization

```typescript
// Imagine building an audio waveform visualizer
function AudioVisualizer() {
  const [waveform, setWaveform] = useState([])

  useEffect(() => {
    // Audio samples come in at 44,100 Hz
    // We want to visualize 60fps = 735 samples per frame
    const interval = setInterval(() => {
      NativeModules.AudioEngine.getWaveform(735, samples => {
        setWaveform(samples) // Triggers re-render
      })
    }, 16)

    return () => clearInterval(interval)
  }, [])

  return <WaveformCanvas data={waveform} />
}
```

**Why this fails**:
- Need fresh data every 16ms (60fps)
- Bridge roundtrip takes 30-40ms
- You'll get ~25fps maximum
- Data is stale by the time it arrives
- Visualizer looks janky and laggy

**The fundamental problem**: Async bridge can't keep up with real-time requirements.

#### Example 2: Scroll-Synced Animations

```typescript
// Parallax effect that tracks scroll position
function ParallaxHeader() {
  const [scrollY, setScrollY] = useState(0)

  return (
    <View>
      <Animated.View style={{
        transform: [{ translateY: scrollY * 0.5 }]
      }}>
        <Image source={headerImage} />
      </Animated.View>

      <ScrollView
        onScroll={event => {
          setScrollY(event.nativeEvent.contentOffset.y)
        }}
      >
        <Content />
      </ScrollView>
    </View>
  )
}
```

**Why this feels laggy**:
- User scrolls (0ms)
- Bridge delay (30ms)
- setState + re-render (5ms)
- Animated value update crosses bridge again (30ms)
- **Total: 65ms lag between scroll and animation**

Users perceive lag above ~20ms. This 65ms delay makes the UI feel unresponsive and "mushy."

## The New Architecture: JSI, Fabric, and TurboModules

The new architecture doesn't just improve performance - it fundamentally changes what's possible. Let's understand each piece and why it matters.

### JSI: The JavaScript Interface

JSI is the foundation that makes everything else possible. It's a C++ API that allows direct, synchronous communication between JavaScript and native code.

**The Mental Model Shift**:

Old bridge model:
```
JavaScript World    |    Native World
(Isolated)         |    (Isolated)
       ↓           |
   JSON Message →  Bridge → JSON Parse
                   |           ↓
              Async callback
```

New JSI model:
```
JavaScript World ←→ C++ ←→ Native World
(Direct function calls, shared memory)
```

**Why C++?** C++ provides:
- **Performance**: Compiled, no interpretation overhead
- **Type Safety**: Compile-time type checking
- **Cross-Platform**: Same code works on iOS and Android
- **Memory Control**: Can share memory between JS and native

#### Synchronous Calls Enable New Patterns

```typescript
// With JSI, this actually works:
function getScreenDimensions() {
  // Synchronous call to native!
  return global.__nativeAPI.getWindowDimensions()
}

function Component() {
  // Gets correct dimensions immediately, no useEffect needed
  const { width, height } = getScreenDimensions()

  return <View style={{ width, height }}>
    <Text>No layout shift!</Text>
  </View>
}
```

**Why this is revolutionary**:
- **No loading states** for synchronous values
- **No layout shifts** from async dimension updates
- **Can make decisions** based on actual measurements
- **Simpler code** without useEffect boilerplate

#### Host Objects: Shared State

JSI introduces "Host Objects" - C++ objects that JavaScript can access directly:

```cpp
// C++ side: Create a host object
class DeviceInfoHostObject : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& runtime, const jsi::PropNameID& name) override {
    auto propName = name.utf8(runtime);

    if (propName == "screenWidth") {
      // Return actual screen width synchronously
      return jsi::Value(getScreenWidth());
    }

    if (propName == "isTablet") {
      return jsi::Value(checkIsTablet());
    }

    return jsi::Value::undefined();
  }
};

// Expose to JavaScript
runtime.global().setProperty(
  runtime,
  "DeviceInfo",
  jsi::Object::createFromHostObject(runtime, std::make_shared<DeviceInfoHostObject>())
);
```

```typescript
// JavaScript side: Direct property access
const width = global.DeviceInfo.screenWidth // Immediate!
const isTablet = global.DeviceInfo.isTablet // No async!
```

**The performance difference**:
- Bridge: 30-40ms async callback
- JSI: <0.1ms synchronous read

**That's 300-400x faster.**

#### Zero-Copy ArrayBuffers

For large data (images, audio, sensor data), JSI enables zero-copy sharing:

```typescript
// Old bridge approach:
function processImage(pixels: Uint8Array) {
  // Convert to Array (copy #1)
  // Serialize to JSON (copy #2, creates ~3x size string)
  // Native deserializes (copy #3)
  NativeModules.ImageProcessor.filter(Array.from(pixels))
}

// New JSI approach:
function processImage(pixels: Uint8Array) {
  // pixels.buffer is shared directly with C++!
  // Zero copies, instant access
  global.ImageProcessor.filter(pixels.buffer)
}
```

**For a 4MB image**:
- Old: 12MB+ memory allocations, 50ms+ processing
- New: 4MB (original), <1ms access

### Fabric: The New Renderer

Fabric replaces the old UIManager with a C++-based renderer that enables:

1. **Synchronous layout**
2. **Priority-based rendering**
3. **Concurrent React support**

#### The Shadow Tree: Cross-Platform UI State

Fabric introduces a "Shadow Tree" - a C++ representation of your UI:

```
React Component Tree (JavaScript)
          ↓
   Fiber Tree (JavaScript)
          ↓
   Shadow Tree (C++)  ← This is new!
          ↓
   Native Views (iOS UIView / Android View)
```

**Why add another tree?** The Shadow Tree provides:

1. **Type Safety**: No more JSON - C++ structs with real types
2. **Shared State**: iOS and Android use the same shadow tree
3. **Fast Diff**: C++ performance for tree diffing
4. **Synchronous Access**: JS can read layout immediately

#### Synchronous Layout: The Game Changer

```typescript
// Old UIManager (async layout):
function MeasureExample() {
  const viewRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    viewRef.current?.measure((x, y, width, height) => {
      // Callback fires ~50ms later
      setDimensions({ width, height })
    })
  }, [])

  // First render: dimensions are wrong (0, 0)
  // Second render: dimensions are correct
  return <View ref={viewRef}>
    <Text>Width: {dimensions.width}</Text>
  </View>
}

// New Fabric (sync layout):
function MeasureExample() {
  const viewRef = useRef(null)

  const handlePress = () => {
    // Synchronous measurement!
    const layout = viewRef.current?.measureLayout()
    console.log(layout) // { x, y, width, height } immediately!
  }

  return <View ref={viewRef}>
    <Button onPress={handlePress} title="Measure" />
  </View>
}
```

**Why synchronous layout matters**:
- **No layout shifts**: Get dimensions before first paint
- **Immediate feedback**: Respond to layout changes instantly
- **Simpler state**: No useEffect/useState dance
- **Better UX**: No flicker from wrong initial dimensions

#### Priority-Based Rendering

Fabric integrates with React 18's concurrent features:

```typescript
import { startTransition } from 'react'

function SearchResults() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const handleSearch = (text: string) => {
    // High priority: Update input immediately
    setQuery(text)

    // Low priority: Update results can be interrupted
    startTransition(() => {
      const filtered = expensiveSearch(text)
      setResults(filtered)
    })
  }

  return (
    <>
      <TextInput value={query} onChangeText={handleSearch} />
      <ResultsList results={results} />
    </>
  )
}
```

**What Fabric does differently**:
- **Prioritizes text input**: Renders immediately, never drops frames
- **Defers results**: Can interrupt expensive result rendering if user types again
- **Smooth UX**: Input stays responsive even during heavy computation

With the old renderer, both updates competed equally - your input could lag while results rendered.

### TurboModules: Lazy Native Code

TurboModules solve the startup time problem with lazy loading:

```typescript
// Old: Everything loads at startup
// All 50+ native modules initialized before app runs

// New: Modules load on first use
import { TurboModuleRegistry } from 'react-native'

// Module not loaded yet
const Camera = TurboModuleRegistry.get<CameraSpec>('RNCamera')

// First call triggers load (5-10ms)
const hasPermission = await Camera.checkPermission()

// Subsequent calls are instant
const photo = await Camera.takePicture()
```

**Startup impact**:
- Old: 500ms loading all modules
- New: 20ms loading TurboModule system, 5-10ms per module as needed

**For an app using 10 of 50 available modules**:
- Old: 500ms (loaded all 50)
- New: 20ms + (10 × 8ms) = 100ms
- **5x faster startup**

#### Type Safety Through Codegen

TurboModules use code generation for type safety:

```typescript
// spec/NativeCameraModule.ts
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport'

export interface Spec extends TurboModule {
  checkPermission(): Promise<boolean>
  takePicture(options: {
    quality: number
    flash: boolean
  }): Promise<{ uri: string; width: number; height: number }>
}

export default TurboModuleRegistry.get<Spec>('RNCamera')
```

**Codegen creates**:
- C++ header files for iOS
- Java/Kotlin interface files for Android
- TypeScript definitions for JavaScript
- All kept in sync automatically

**Benefits**:
- **Compile-time safety**: Typos caught before runtime
- **Better IDE support**: Autocomplete knows exact method signatures
- **Less runtime overhead**: No dynamic type checking
- **Cross-platform consistency**: Same types everywhere

## Performance Comparison: Real Numbers

Let's quantify the improvements across different scenarios:

### Scenario 1: High-Frequency Native Calls

```typescript
// Test: Call native 1000 times
for (let i = 0; i < 1000; i++) {
  const result = nativeMultiply(i, 2)
}
```

**Old Bridge**:
- Per call: ~5ms (serialization + queue + deserialization)
- Total: 5000ms
- Can't maintain 60fps with this overhead

**New JSI**:
- Per call: ~0.01ms (direct C++ function call)
- Total: 10ms
- **500x faster**

### Scenario 2: Transferring Large Data

```typescript
// Process 4MB image data
const imagePixels = new Uint8Array(4_000_000)
processImageFilter(imagePixels)
```

**Old Bridge**:
- Convert Uint8Array → Array: 50ms
- Serialize to JSON: 150ms (creates ~12MB string)
- Deserialize in native: 80ms
- Total: 280ms

**New JSI**:
- Share ArrayBuffer: <1ms (pointer passing)
- Process in C++: 20ms
- Total: 21ms
- **13x faster**, plus 66% less memory

### Scenario 3: App Startup

**Old Architecture**:
```
Load JS bundle:          300ms
Initialize bridge:       100ms
Load all native modules: 500ms
First frame:            200ms
─────────────────────────────
Total:                  1100ms
```

**New Architecture**:
```
Load JS bundle:          300ms
Initialize JSI:          20ms
Load needed modules:     80ms (lazy load 8 modules)
First frame:            100ms (Fabric faster)
─────────────────────────────
Total:                  500ms
```

**2.2x faster startup**

### Scenario 4: Scroll Performance

```typescript
<FlatList
  data={items}
  onScroll={e => {
    updateParallax(e.nativeEvent.contentOffset.y)
  }}
/>
```

**Old Bridge**:
- Scroll event latency: 30-40ms
- Can achieve: ~25fps smooth scrolling
- User perception: Janky, laggy

**New JSI + Fabric**:
- Scroll event latency: 3-5ms
- Can achieve: 60fps+ smooth scrolling
- User perception: Buttery smooth, native feel

## Why These Changes Enable New App Categories

The new architecture doesn't just make existing apps faster - it makes previously impossible apps possible:

### Now Possible: Real-Time Audio Apps

```typescript
// Music production app with real-time visualization
function AudioWorkstation() {
  // Process audio at 44.1kHz, visualize at 60fps
  useEffect(() => {
    global.AudioEngine.setCallback((samples: Float32Array) => {
      // samples is shared memory - zero copy!
      // Process 735 samples per frame (44100 / 60)
      visualizer.update(samples)
    })
  }, [])

  return <RealtimeWaveform />
}
```

This was **impossible** with the bridge - too slow, too much memory copying.

### Now Possible: High-Performance Games

```typescript
// Game running physics at 60fps
function GameEngine() {
  useAnimationFrame(() => {
    // Sync read positions
    const positions = global.PhysicsEngine.getPositions()

    // Update UI immediately
    updateSprites(positions)

    // Sync write user input
    global.PhysicsEngine.applyForces(getUserInput())
  })

  return <GameCanvas />
}
```

No lag between physics and rendering - feels like a native game.

### Now Possible: Professional Video Editing

```typescript
// Scrub through video timeline smoothly
function VideoTimeline({ videoUrl }: { videoUrl: string }) {
  const handleScrub = (position: number) => {
    // Seek to exact frame synchronously
    const frame = global.VideoDecoder.seekToFrame(position)
    // Display immediately - no lag
    displayFrame(frame)
  }

  return <ScrubBar onScrub={handleScrub} />
}
```

Bridge lag made precise video scrubbing impossible.

## Migration Strategy

Enabling the new architecture is straightforward:

```bash
# iOS
cd ios && RCT_NEW_ARCH_ENABLED=1 pod install

# Android
# android/gradle.properties
newArchEnabled=true
```

**Compatibility**: 95%+ of React Native apps work immediately with zero code changes.

**Gradual Optimization**:
1. Enable new architecture
2. Profile your app
3. Identify bottlenecks (likely native module calls)
4. Migrate critical native modules to TurboModules
5. Use JSI for performance-critical paths

## Summary: Why This Matters

The new architecture represents a philosophical shift:

**Old Model**: "JavaScript and native are separate worlds, communicate through JSON messages"

**New Model**: "JavaScript and native are part of the same program, share memory and functions"

This enables:
- **Synchronous operations** when needed
- **Zero-copy data sharing**
- **60fps as standard**, not aspirational
- **Lazy loading** for fast startup
- **Type safety** across language boundaries
- **Apps that feel truly native**

The result: React Native apps that compete with truly native apps on performance, while maintaining the developer experience that made React Native popular.

**Next**: Lecture 2 examines Fabric's rendering pipeline in depth, including the Shadow Tree, Yoga layout engine, and concurrent rendering support.
