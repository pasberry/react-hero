# Lecture 3: TurboModules - Lazy-Loaded Native Code

## Introduction

TurboModules represent a complete rethinking of how JavaScript interfaces with native platform code in React Native. While the old Native Modules system was functional, it had fundamental issues that made apps slow to start and difficult to optimize. TurboModules solve these problems through lazy loading, type-safe code generation, and direct JSI integration.

Understanding TurboModules is crucial because they eliminate one of React Native's biggest pain points: the several-hundred-millisecond startup penalty from eagerly loading all native modules at app launch, regardless of whether your app actually uses them.

## The Native Modules Problem

### Eager Loading: Startup Time Killer

In the old architecture, **every single native module** loaded at app startup:

```typescript
// app.tsx
import { NativeModules } from 'react-native'

const {
  AsyncStorage,      // Loaded at startup
  Camera,            // Loaded at startup (even if never used!)
  Geolocation,       // Loaded at startup
  Calendar,          // Loaded at startup
  Contacts,          // Loaded at startup
  PushNotificationIOS, // Loaded at startup
  Linking,           // Loaded at startup
  NetInfo,           // Loaded at startup
  Vibration,         // Loaded at startup
  // ... and 40+ more modules
} = NativeModules
```

**Why this happened**: The bridge needed to know about all modules upfront to route method calls correctly. There was no mechanism for lazy initialization.

**The cost**: Each module initialization:
- Allocates native objects
- Registers methods with the bridge
- Sets up constants
- Typical time: 5-15ms per module

For an app with 50 native modules:
- 50 modules × 10ms average = **500ms before your app code runs**
- User stares at splash screen
- First paint delayed
- Poor perceived performance

### No Type Safety

Native Modules used string-based method calls:

```typescript
// No compile-time checking!
NativeModules.Camera.takePicture(
  { quality: 0.9 }, // Typo in object keys? Runtime error!
  photo => console.log(photo.urr), // Typo in callback? Runtime error!
  error => console.error(error)
)

// Calling a method that doesn't exist? Runtime error!
NativeModules.Camera.takePictures() // Note the 's' - crashes at runtime
```

**Problems**:
- Typos discovered at runtime
- No IDE autocomplete
- No TypeScript validation
- Refactoring is dangerous
- Documentation is separate from types

### Always Asynchronous

Even simple checks required callbacks:

```typescript
// Want to check if camera is available?
// Must use callback, even though this is instant in native code
NativeModules.Camera.isAvailable(available => {
  if (available) {
    // Do something...
  }
})

// Can't do this:
// const available = NativeModules.Camera.isAvailable() // ❌ Doesn't work
```

**Why this hurt**:
- Forced async patterns for sync operations
- More complex code
- Hard to reason about state
- Callback hell for sequential operations

### Platform Inconsistency

Each platform implemented modules independently:

```typescript
// iOS might return:
{ uri: 'file:///path/to/image.jpg', width: 1920, height: 1080 }

// Android might return:
{ path: '/storage/emulated/0/image.jpg', dimensions: { width: 1920, height: 1080 } }

// Your code needs to handle both!
```

No shared interface definition meant constant platform-specific bugs.

## TurboModules: The Solution

TurboModules solve all these problems through:
1. **Lazy loading** - modules load only when first accessed
2. **Type-safe codegen** - TypeScript spec generates native code
3. **JSI integration** - can be synchronous or asynchronous
4. **Shared interface** - same API on iOS and Android

### Lazy Loading Architecture

```typescript
// TurboModule isn't loaded yet
import { TurboModuleRegistry } from 'react-native'

// Still not loaded - just getting a reference
const Camera = TurboModuleRegistry.get<CameraSpec>('RNCamera')

// NOW it loads - on first method call
const hasPermission = await Camera.checkPermission() // Module loads here (~5-10ms)

// Subsequent calls are instant - module is cached
const photo = await Camera.takePicture() // No load time
```

**How it works internally**:

```cpp
// C++ TurboModuleRegistry (simplified)
class TurboModuleRegistry {
  std::unordered_map<std::string, std::shared_ptr<TurboModule>> cache_;

  std::shared_ptr<TurboModule> get(const std::string& name) {
    // Check cache first
    auto it = cache_.find(name);
    if (it != cache_.end()) {
      return it->second; // Return cached module
    }

    // Not in cache - lazy load it now
    auto module = loadModule(name); // ~5-10ms
    cache_[name] = module;
    return module;
  }

private:
  std::shared_ptr<TurboModule> loadModule(const std::string& name) {
    // Platform-specific loading
    #ifdef __APPLE__
      return loadiOSModule(name);
    #else
      return loadAndroidModule(name);
    #endif
  }
};
```

**Startup impact**:

```
Old Native Modules (50 modules):
- Load all at startup: 500ms
- First frame: After 500ms

TurboModules (50 available, 8 used):
- Load registry: 20ms
- First frame: After 20ms
- Load 8 modules as needed: 8 × 8ms = 64ms (spread over user session)
- Total: 84ms vs 500ms
- **6x faster perceived startup**
```

## Type-Safe Code Generation

TurboModules use a **spec-first** approach. You define the interface in TypeScript, and codegen creates the native bindings.

### Step 1: Define the Spec

```typescript
// NativeCamera.ts
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  // Synchronous methods (via JSI)
  hasPermission(): boolean
  getDefaultOptions(): CameraOptions

  // Asynchronous methods
  requestPermission(): Promise<boolean>
  takePicture(options: CameraOptions): Promise<Photo>

  // Constants
  getConstants(): {
    Type: {
      FRONT: string
      BACK: string
    }
  }

  // Events (advanced)
  addListener(eventName: string): void
  removeListeners(count: number): void
}

// Type definitions
export interface CameraOptions {
  quality: number        // 0.0 - 1.0
  flashMode: 'on' | 'off' | 'auto'
  cameraType: 'front' | 'back'
}

export interface Photo {
  uri: string
  width: number
  height: number
  timestamp: number
}

export default TurboModuleRegistry.get<Spec>('RNCamera')
```

**Why this is powerful**:
- TypeScript compiler validates your spec
- IDE provides autocomplete
- Types documented in code
- Single source of truth

### Step 2: Codegen Runs

```bash
npx react-native codegen
```

**What codegen creates**:

```
ios/
  RCTNativeCameraSpec.h          # C++ header
  RCTNativeCameraSpec.mm         # C++ implementation stub

android/
  java/
    com/
      NativeCameraSpec.java      # Java interface
```

**Generated C++ header (simplified)**:

```cpp
// RCTNativeCameraSpec.h
namespace facebook::react {

class NativeCameraSpec : public TurboModule {
public:
  // Synchronous methods - return immediately
  virtual bool hasPermission(jsi::Runtime &rt) = 0;
  virtual jsi::Object getDefaultOptions(jsi::Runtime &rt) = 0;

  // Asynchronous methods - use promises
  virtual jsi::Value requestPermission(
    jsi::Runtime &rt,
    jsi::Function resolve,
    jsi::Function reject
  ) = 0;

  virtual jsi::Value takePicture(
    jsi::Runtime &rt,
    jsi::Object options,
    jsi::Function resolve,
    jsi::Function reject
  ) = 0;

  // Constants
  virtual jsi::Object getConstants(jsi::Runtime &rt) = 0;
};

} // namespace facebook::react
```

**Type safety guarantee**: If your native implementation doesn't match the spec, **it won't compile**.

### Step 3: Implement Native Code

**iOS (Objective-C++)**:

```objc
// RCTNativeCamera.mm
#import "RCTNativeCamera.h"
#import <React/RCTConvert.h>
#import <AVFoundation/AVFoundation.h>

@implementation RCTNativeCamera

RCT_EXPORT_MODULE(RNCamera)

// Implement from generated spec
- (BOOL)hasPermission {
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  return status == AVAuthorizationStatusAuthorized;
}

- (NSDictionary *)getDefaultOptions {
  return @{
    @"quality": @(0.9),
    @"flashMode": @"auto",
    @"cameraType": @"back"
  };
}

- (void)requestPermission:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
    resolve(@(granted));
  }];
}

- (void)takePicture:(NSDictionary *)options
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  // Implementation details...
  AVCapturePhotoSettings *settings = [self settingsFromOptions:options];

  [self.photoOutput capturePhotoWithSettings:settings delegate:self.delegate];

  // On completion:
  resolve(@{
    @"uri": photoPath,
    @"width": @(image.size.width),
    @"height": @(image.size.height),
    @"timestamp": @([[NSDate date] timeIntervalSince1970])
  });
}

- (NSDictionary *)getConstants {
  return @{
    @"Type": @{
      @"FRONT": @"front",
      @"BACK": @"back"
    }
  };
}

@end
```

**Android (Kotlin)**:

```kotlin
// NativeCameraModule.kt
package com.myapp

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import android.hardware.camera2.*

@ReactModule(name = "RNCamera")
class NativeCameraModule(context: ReactApplicationContext) :
  NativeCameraSpec(context) {

  override fun getName() = "RNCamera"

  // Synchronous - returns immediately
  override fun hasPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
      reactApplicationContext,
      Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED
  }

  override fun getDefaultOptions(): WritableMap {
    return Arguments.createMap().apply {
      putDouble("quality", 0.9)
      putString("flashMode", "auto")
      putString("cameraType", "back")
    }
  }

  // Asynchronous - uses Promise
  override fun requestPermission(promise: Promise) {
    val activity = currentActivity ?: run {
      promise.reject("E_ACTIVITY", "Activity not available")
      return
    }

    ActivityCompat.requestPermissions(
      activity,
      arrayOf(Manifest.permission.CAMERA),
      CAMERA_PERMISSION_REQUEST
    )

    // Store promise to resolve later
    permissionPromise = promise
  }

  override fun takePicture(options: ReadableMap, promise: Promise) {
    val quality = options.getDouble("quality").toFloat()
    val flashMode = options.getString("flashMode")
    val cameraType = options.getString("cameraType")

    // Implementation...
    camera.takePicture(/* callbacks */) { photo ->
      promise.resolve(Arguments.createMap().apply {
        putString("uri", photo.uri)
        putInt("width", photo.width)
        putInt("height", photo.height)
        putDouble("timestamp", System.currentTimeMillis() / 1000.0)
      })
    }
  }

  override fun getTypedExportedConstants(): Map<String, Any> {
    return mapOf(
      "Type" to mapOf(
        "FRONT" to "front",
        "BACK" to "back"
      )
    )
  }
}
```

### Step 4: Use with Full Type Safety

```typescript
import NativeCamera from './NativeCamera'

function CameraScreen() {
  const [photo, setPhoto] = useState<Photo | null>(null)

  const takePicture = async () => {
    // TypeScript knows the exact method signature!
    // IDE autocomplete works perfectly
    const result = await NativeCamera.takePicture({
      quality: 0.9,           // ✓ TypeScript validates type
      flashMode: 'auto',      // ✓ TypeScript validates enum
      cameraType: 'back',     // ✓ TypeScript validates enum
      // typo: true            // ❌ TypeScript error: unknown property
    })

    // TypeScript knows result structure
    setPhoto(result)          // ✓ Photo type
    console.log(result.uri)   // ✓ string type
    // console.log(result.url) // ❌ TypeScript error: unknown property
  }

  // Synchronous check - no callback!
  const hasPermission = NativeCamera.hasPermission() // ✓ boolean

  // Constants are typed
  const frontCamera = NativeCamera.getConstants().Type.FRONT // ✓ string

  return (
    <View>
      {hasPermission ? (
        <Button onPress={takePicture} title="Take Photo" />
      ) : (
        <Text>No camera permission</Text>
      )}
      {photo && <Image source={{ uri: photo.uri }} />}
    </View>
  )
}
```

**Type safety benefits**:
- Compile-time error checking
- IDE autocomplete
- Refactoring safety (rename works across languages)
- Documentation in types
- Prevents runtime crashes from typos

## Synchronous vs Asynchronous Methods

TurboModules can be truly synchronous via JSI:

```typescript
// Synchronous methods return immediately
const hasPermission = NativeCamera.hasPermission()
// No await, no callback - instant result

// Asynchronous methods return Promises
const granted = await NativeCamera.requestPermission()
// User interaction required - must be async
```

**When to use sync vs async**:

**Use Synchronous**:
- Reading constants or cached values
- Quick computations (< 1ms)
- Checking permissions/state
- Getting device info

**Use Asynchronous**:
- Network requests
- File I/O
- User interaction (dialogs, permissions)
- Heavy computation
- Anything that might block

**Example - Image Processor**:

```typescript
export interface ImageProcessorSpec extends TurboModule {
  // Sync: Just returns capability
  supportsFormat(format: string): boolean

  // Async: Actually processes (slow)
  resizeImage(uri: string, width: number, height: number): Promise<string>

  // Sync: Cached metadata
  getImageDimensions(uri: string): { width: number; height: number } | null

  // Async: Reads file
  loadImageMetadata(uri: string): Promise<ImageMetadata>
}
```

## Performance Characteristics

### Startup Time Comparison

**Real app with 45 native modules**:

```
Old Native Modules:
- Initialize all 45 modules: 450ms
- App uses 12 of them
- Wasted: 33 modules × 10ms = 330ms

TurboModules:
- Initialize registry: 15ms
- Load 12 modules as needed: 12 × 7ms = 84ms
- Total: 99ms
- **Improvement: 450ms → 99ms (78% faster)**
```

### Method Call Performance

```typescript
// Benchmark: 1000 synchronous calls
for (let i = 0; i < 1000; i++) {
  const result = NativeModule.getValue()
}
```

**Old Native Modules** (async callback):
- Per call: ~5ms (bridge crossing)
- Total: 5000ms

**TurboModules** (sync via JSI):
- Per call: ~0.01ms (direct C++ call)
- Total: 10ms
- **500x faster**

### Memory Usage

**Old Native Modules**:
- All 45 modules in memory: ~12MB
- Used 12 modules: ~3MB
- Wasted: 9MB

**TurboModules**:
- Registry overhead: ~200KB
- 12 loaded modules: ~3MB
- Total: ~3.2MB
- **73% less memory**

## Real-World Migration Example

### Before: Old Native Module

```typescript
// OldBatteryModule.ts
import { NativeModules } from 'react-native'

const { BatteryManager } = NativeModules

export function getBatteryLevel(): Promise<number> {
  return new Promise((resolve, reject) => {
    BatteryManager.getBatteryLevel(
      (level: number) => resolve(level),
      (error: Error) => reject(error)
    )
  })
}

// No type safety!
// Loads at startup even if never used!
// Always async even though it's instant in native code!
```

### After: TurboModule

```typescript
// NativeBatteryManager.ts
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  // Synchronous - instant result
  getBatteryLevel(): number

  // Async - registers listener
  addBatteryListener(): Promise<void>

  getConstants(): {
    LOW_BATTERY_THRESHOLD: number
  }
}

export default TurboModuleRegistry.get<Spec>('BatteryManager')
```

```typescript
// Usage
import BatteryManager from './NativeBatteryManager'

function BatteryIndicator() {
  // Synchronous! No useState/useEffect needed
  const level = BatteryManager.getBatteryLevel()

  return (
    <Text style={{ color: level < 20 ? 'red' : 'green' }}>
      Battery: {level}%
    </Text>
  )
}
```

**Benefits of migration**:
- **Startup**: Doesn't load until first use
- **Type safety**: Compile-time checking
- **Performance**: Synchronous call is instant
- **Code quality**: Simpler, no Promise wrapping

## Advanced Patterns

### Hybrid Sync/Async Module

```typescript
export interface CacheManagerSpec extends TurboModule {
  // Sync: Check memory cache
  getCached(key: string): string | null

  // Async: Read from disk if not in memory
  get(key: string): Promise<string | null>

  // Sync: Write to memory
  setCached(key: string, value: string): void

  // Async: Persist to disk
  set(key: string, value: string): Promise<void>

  // Sync: Memory stats
  getCacheStats(): { size: number; hits: number; misses: number }
}
```

**Usage**:

```typescript
function useCache(key: string) {
  // Try memory first (instant)
  const cached = CacheManager.getCached(key)

  if (cached) {
    return cached // Instant return
  }

  // Fall back to disk (async)
  const [value, setValue] = useState<string | null>(null)

  useEffect(() => {
    CacheManager.get(key).then(setValue)
  }, [key])

  return value
}
```

### Event Emitters

```typescript
export interface LocationManagerSpec extends TurboModule {
  startTracking(): void
  stopTracking(): void

  // Event listener management
  addListener(eventName: string): void
  removeListeners(count: number): void
}
```

```typescript
import { NativeEventEmitter } from 'react-native'
import LocationManager from './NativeLocationManager'

const locationEmitter = new NativeEventEmitter(LocationManager)

function useLocation() {
  const [location, setLocation] = useState(null)

  useEffect(() => {
    LocationManager.startTracking()

    const subscription = locationEmitter.addListener(
      'locationUpdate',
      setLocation
    )

    return () => {
      subscription.remove()
      LocationManager.stopTracking()
    }
  }, [])

  return location
}
```

## Migration Strategy

### Step 1: Identify Candidates

Prioritize migrating modules that:
- Load eagerly (slow startup)
- Have type safety issues (frequent bugs)
- Need synchronous access (awkward callbacks)
- Are used rarely (wasted memory)

### Step 2: Create Spec

Write TypeScript interface defining the API.

### Step 3: Run Codegen

```bash
npx react-native codegen
```

### Step 4: Implement Native Code

Fill in generated stubs with actual implementation.

### Step 5: Update JavaScript Imports

```typescript
// Old
import { NativeModules } from 'react-native'
const { MyModule } = NativeModules

// New
import MyModule from './NativeMyModule'
```

### Step 6: Test

Verify behavior matches old module.

### Step 7: Deprecate Old Module

Remove old implementation after migration.

## Common Pitfalls

### Pitfall 1: Making Everything Sync

```typescript
// ❌ Bad: Heavy operation as sync
export interface ImageProcessorSpec extends TurboModule {
  processImage(uri: string): string // Blocks for 500ms!
}

// ✅ Good: Heavy operation as async
export interface ImageProcessorSpec extends TurboModule {
  processImage(uri: string): Promise<string>
}
```

**Rule**: Only use sync for operations < 1-2ms.

### Pitfall 2: Not Handling Null

```typescript
// ❌ Assumes value always exists
const value = Cache.getCached(key).toUpperCase() // Crash if null!

// ✅ Handle null case
const value = Cache.getCached(key)
if (value) {
  console.log(value.toUpperCase())
}
```

### Pitfall 3: Forgetting Event Cleanup

```typescript
// ❌ Memory leak - listeners not removed
useEffect(() => {
  LocationManager.addListener('update')
  // Missing cleanup!
}, [])

// ✅ Proper cleanup
useEffect(() => {
  LocationManager.addListener('update')
  const subscription = emitter.addListener('update', handler)

  return () => {
    subscription.remove()
    LocationManager.removeListeners(1)
  }
}, [])
```

## Summary: Why TurboModules Matter

TurboModules solve fundamental Native Modules problems:

**Before (Native Modules)**:
- Eager loading → slow startup
- No type safety → runtime errors
- Always async → awkward patterns
- Platform differences → bugs

**After (TurboModules)**:
- **Lazy loading** → 6x faster startup
- **Type-safe codegen** → compile-time safety
- **Sync/async choice** → simpler code
- **Shared spec** → consistency

The result: Faster apps, fewer bugs, better developer experience.

**Next**: Lecture 4 explores JSI internals - the C++ foundation that makes TurboModules possible.
