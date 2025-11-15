# Lecture 1: Architecture Evolution - Bridge to Bridgeless

## Introduction

React Native's architecture has evolved significantly from its initial bridge-based design to the new bridgeless architecture. This lecture covers the limitations of the old architecture, the motivation for change, and how the new architecture solves fundamental performance issues.

## Old Architecture (Bridge-Based)

### The Three Threads

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   JavaScript │    │    Bridge    │    │    Native    │
│    Thread    │◄──►│  (Async)     │◄──►│    Thread    │
│              │    │              │    │              │
│  React Logic │    │ JSON Messages│    │  UI Rendering│
│  App Code    │    │  Batched     │    │  Platform APIs│
└──────────────┘    └──────────────┘    └──────────────┘
```

**JavaScript Thread**:
- Runs React code
- Executes JavaScript logic
- Manages component state

**Bridge**:
- Asynchronous message queue
- JSON serialization
- Batches messages

**Native Thread**:
- Renders UI
- Handles platform APIs
- Processes user input

### Bridge Limitations

```typescript
// Problem: Async bridge creates lag
function Component() {
  const handlePress = () => {
    // 1. JS thread processes event
    console.log('Button pressed')

    // 2. Message serialized to JSON
    // 3. Sent over bridge (async!)
    // 4. Native thread receives
    // 5. Native executes
    // 6. Result serialized
    // 7. Sent back over bridge
    // 8. JS receives result

    // Total latency: 50-100ms for simple action!
  }

  return <TouchableOpacity onPress={handlePress}>...</TouchableOpacity>
}
```

**Issues**:
1. **Serialization Cost**: Every value must convert to JSON
2. **Async Nature**: Can't synchronously call native code
3. **Memory Copies**: Data copied multiple times
4. **No Type Safety**: JSON loses type information
5. **Batching Latency**: Messages batched for efficiency, adds lag

### Real-World Impact

```typescript
// Scrolling performance
<FlatList
  data={items}
  renderItem={({ item }) => <Item data={item} />}
  onScroll={e => {
    // Problem: onScroll fires 60x per second
    // Each event goes over bridge
    // Can't keep up → dropped frames
    console.log(e.nativeEvent.contentOffset.y)
  }}
/>

// Animation jank
Animated.timing(value, {
  toValue: 1,
  duration: 300,
  useNativeDriver: false, // Runs on JS thread
}).start()
// Animation updates must cross bridge each frame
// Result: Janky, can't maintain 60fps
```

## New Architecture Overview

### Direct Access via JSI

```
┌──────────────┐                    ┌──────────────┐
│   JavaScript │                    │    Native    │
│    Thread    │◄──────JSI──────────►│    Thread    │
│              │  (Synchronous!)    │              │
│  React Logic │                    │  UI Rendering│
└──────────────┘                    └──────────────┘
```

**JSI (JavaScript Interface)**:
- Synchronous native calls
- No JSON serialization
- Direct memory access
- Type-safe communication

### Key Improvements

```typescript
// New: Synchronous native calls
import { NativeModules } from 'react-native'

const { CustomModule } = NativeModules

// Old: Async callback
CustomModule.getValue((value) => {
  console.log(value) // Maybe 50ms later
})

// New: Synchronous with JSI
const value = global.customModule.getValue()
console.log(value) // Immediately!
```

## Fabric Renderer

### Old Renderer (UIManager)

```typescript
// Old: Async UI updates
function Component() {
  const [width, setWidth] = useState(100)

  return (
    <View
      style={{ width }}
      onLayout={e => {
        // 1. Layout happens natively
        // 2. Event serialized
        // 3. Sent over bridge
        // 4. JS processes
        // 5. Sets state
        // 6. New width goes back over bridge
        // Total: ~100ms lag
        const { width } = e.nativeEvent.layout
        setWidth(width + 10)
      }}
    />
  )
}
```

### New Renderer (Fabric)

```typescript
// New: Synchronous layout
function Component() {
  const viewRef = useRef(null)

  const measure = () => {
    // Synchronous measurement via JSI!
    const layout = viewRef.current?.measure()
    console.log(layout) // { x, y, width, height } - immediately
  }

  return <View ref={viewRef} />
}
```

**Fabric Features**:
- **Synchronous Layout**: Read layout synchronously
- **Type-Safe**: C++ types instead of JSON
- **Priority-Based**: Can prioritize UI updates
- **Concurrent**: Works with React 18 concurrent features

## TurboModules

### Old Native Modules

```typescript
// Old: All modules loaded at startup
import { NativeModules } from 'react-native'

const {
  Camera, // Loaded
  Bluetooth, // Loaded
  NFC, // Loaded
  // All loaded even if never used!
} = NativeModules

// Startup time: 500ms+ for all modules
```

### New TurboModules

```typescript
// New: Lazy loading
import { TurboModuleRegistry } from 'react-native'

// Only loaded when first used
const Camera = TurboModuleRegistry.get('Camera')

// First call loads module
Camera.takePicture() // Loads Camera module now

// Startup time: 50ms (90% improvement!)
```

**TurboModule Benefits**:
- **Lazy Loading**: Load only what's needed
- **Type-Safe**: Generated TypeScript definitions
- **Synchronous**: Can be sync or async as needed
- **C++ Core**: Shared code between platforms

## Architecture Comparison

### Startup Performance

```
Old Architecture:
┌─────────────────────────────────────┐
│ Load JS Bundle          300ms       │
│ Initialize Bridge       100ms       │
│ Load All Native Modules 500ms       │
│ First Frame             200ms       │
└─────────────────────────────────────┘
Total: 1100ms

New Architecture:
┌─────────────────────────────────────┐
│ Load JS Bundle          300ms       │
│ Initialize JSI          20ms        │
│ Load Needed Modules     50ms        │
│ First Frame             100ms       │
└─────────────────────────────────────┘
Total: 470ms (57% faster!)
```

### Runtime Performance

```typescript
// Old: Every call crosses bridge
for (let i = 0; i < 1000; i++) {
  // Each iteration:
  // JS → Serialize → Bridge → Native → Bridge → JS
  NativeModules.Calculator.add(i, 1) // ~5ms each
}
// Total: 5000ms

// New: Direct JSI calls
for (let i = 0; i < 1000; i++) {
  global.calculator.add(i, 1) // ~0.01ms each
}
// Total: 10ms (500x faster!)
```

### Memory Usage

```
Old Architecture:
┌──────────────────────────────────────┐
│ JS Heap              50 MB           │
│ Bridge Queue         10 MB           │
│ Native Heap          40 MB           │
│ JSON Copies          20 MB           │
└──────────────────────────────────────┘
Total: 120 MB

New Architecture:
┌──────────────────────────────────────┐
│ JS Heap              50 MB           │
│ Shared Memory        5 MB            │
│ Native Heap          40 MB           │
└──────────────────────────────────────┘
Total: 95 MB (21% less)
```

## Migration Path

### Enabling New Architecture

```javascript
// android/gradle.properties
newArchEnabled=true

// ios/Podfile
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

### Compatibility Layer

```typescript
// Most code works unchanged!
function App() {
  return (
    <View>
      <Text>Hello</Text>
      {/* Same component APIs */}
    </View>
  )
}

// Gradual migration:
// 1. Enable new architecture
// 2. Most code works immediately
// 3. Optimize critical paths with JSI
// 4. Migrate custom native modules to TurboModules
```

### Writing Backward-Compatible Code

```typescript
// Detect architecture
const isNewArchitecture = global._REACT_NATIVE_BRIDGELESS === true

function getValue(): number {
  if (isNewArchitecture) {
    // Use JSI for sync access
    return global.customModule.getValue()
  } else {
    // Fallback to async
    return new Promise(resolve => {
      NativeModules.CustomModule.getValue(resolve)
    })
  }
}
```

## Real-World Performance Gains

### Case Study: Instagram

**Problem**: List scrolling dropped frames

**Old Architecture**:
```
Scroll event → Bridge → JS → setState → Bridge → Native
Latency: 60ms per event
Result: 15fps scrolling (janky!)
```

**New Architecture**:
```
Scroll event → JSI → JS (sync)
Latency: 5ms per event
Result: 60fps scrolling (smooth!)
```

**Impact**: 12x improvement in scroll performance

### Case Study: Shopify POS

**Problem**: Slow startup (2+ seconds)

**Root Cause**: Loading 50+ native modules at startup

**Solution**: TurboModules lazy loading

**Results**:
- Startup: 2000ms → 800ms (60% faster)
- Memory: 150MB → 110MB (27% less)
- TTI: 3000ms → 1200ms (60% faster)

### Case Study: Microsoft Teams

**Problem**: Animation jank during calls

**Old**: Animations on JS thread, crossing bridge

**New**: Native animations via Fabric

**Results**:
- Animation FPS: 30fps → 60fps
- CPU usage: 40% → 15%
- Battery life: +25%

## Technical Deep Dive

### JSI Architecture

```cpp
// C++ interface (simplified)
class JSI {
public:
  // Call JS from C++
  Value callJSFunction(const std::string& name, const Value* args);

  // Call C++ from JS
  Object createHostObject(std::shared_ptr<HostObject> obj);

  // Shared memory
  std::shared_ptr<ArrayBuffer> createArrayBuffer(size_t size);
};

// Example: Sync native call
class NativeCalculator : public HostObject {
public:
  Value get(Runtime& runtime, const PropNameID& name) override {
    if (name == "add") {
      return Function::createFromHostFunction(
        runtime,
        name,
        2,
        [](Runtime& rt, const Value& thisVal, const Value* args, size_t count) {
          // Synchronous C++ execution!
          double a = args[0].asNumber();
          double b = args[1].asNumber();
          return Value(a + b);
        }
      );
    }
  }
};
```

### Fabric Rendering Pipeline

```
React Update
    ↓
Fiber Reconciliation (JS)
    ↓
Shadow Tree Update (C++)
    ↓
Layout Calculation (Yoga)
    ↓
View Mutations (Platform)
    ↓
Native Rendering
```

**Key Difference**: Shadow tree in C++, shared between platforms

## Summary

**Old Architecture Problems**:
- Asynchronous bridge
- JSON serialization overhead
- Memory copies
- Load all modules at startup
- Can't synchronously call native code

**New Architecture Solutions**:
- **JSI**: Synchronous native calls
- **Fabric**: New concurrent renderer
- **TurboModules**: Lazy-loaded native modules
- **Codegen**: Type-safe interfaces

**Performance Improvements**:
- Startup: 50-70% faster
- Animations: Smooth 60fps
- Scrolling: Buttery smooth
- Memory: 20-30% less
- Native calls: 100-500x faster

**Migration**:
- Most code works unchanged
- Enable with flags
- Gradually optimize critical paths
- Full compatibility layer

**Impact**: Makes React Native competitive with truly native apps for performance-critical scenarios.

**Next**: Lecture 2 covers Fabric renderer internals.
