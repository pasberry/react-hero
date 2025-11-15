# Exercise 1: Build a Custom TurboModule for Device Info

## 🎯 Goal

Build a production-grade TurboModule that exposes device information synchronously to JavaScript, understanding how TurboModules provide type-safe, lazy-loaded, and performant native APIs.

## 📚 Prerequisites

- Complete Lecture 3 (TurboModules Deep Dive)
- React Native 0.70+ with new architecture enabled
- Xcode 14+ (iOS) or Android Studio (Android)
- Understanding of TypeScript and native mobile development basics

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Understand TurboModule type safety (TypeScript → Native code generation)
✅ Implement synchronous and asynchronous native methods
✅ Master lazy loading vs eager loading patterns
✅ Handle platform-specific implementations (iOS/Android)
✅ Debug native module issues
✅ Measure performance improvements over legacy Native Modules

## 📝 Task Description

Implement a `DeviceInfo` TurboModule that provides:

### Synchronous Methods:
1. `getDeviceId()` - Returns unique device identifier
2. `getModel()` - Returns device model (e.g., "iPhone 14 Pro", "Pixel 7")
3. `getOSVersion()` - Returns OS version
4. `getTotalMemory()` - Returns total RAM in MB
5. `isBatteryCharging()` - Returns boolean charging status

### Asynchronous Methods:
1. `getBatteryLevel()` - Returns battery percentage (0-100)
2. `getNetworkInfo()` - Returns network type and connection status
3. `getStorageInfo()` - Returns total/free storage in MB

### Event Emitters:
1. `onBatteryChange` - Emits when battery level changes
2. `onNetworkChange` - Emits when network status changes

## 🏗️ Project Structure

```
exercise-01/
├── README.md (this file)
├── starter/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── NativeDeviceInfo.ts        # TypeScript spec (YOUR CODE)
│   │   └── DeviceInfo.tsx             # JavaScript wrapper (PROVIDED)
│   ├── ios/
│   │   ├── RNDeviceInfo.h             # iOS header (YOUR CODE)
│   │   └── RNDeviceInfo.mm            # iOS implementation (YOUR CODE)
│   ├── android/
│   │   └── DeviceInfoModule.kt        # Android implementation (YOUR CODE)
│   └── example/
│       └── App.tsx                    # Test app (PROVIDED)
└── solution/
    ├── src/
    │   ├── NativeDeviceInfo.ts        # Complete spec
    │   └── DeviceInfo.tsx             # Complete wrapper
    ├── ios/
    │   ├── RNDeviceInfo.h
    │   └── RNDeviceInfo.mm
    ├── android/
    │   └── DeviceInfoModule.kt
    └── README.md                      # Implementation guide
```

## ✅ Acceptance Criteria

### 1. TypeScript Spec is Type-Safe

```typescript
// NativeDeviceInfo.ts
import { TurboModule } from 'react-native'

export interface Spec extends TurboModule {
  // Synchronous methods return immediately
  getDeviceId(): string
  getModel(): string
  getOSVersion(): string
  getTotalMemory(): number
  isBatteryCharging(): boolean

  // Asynchronous methods return Promises
  getBatteryLevel(): Promise<number>
  getNetworkInfo(): Promise<{
    type: 'wifi' | 'cellular' | 'none'
    isConnected: boolean
  }>
  getStorageInfo(): Promise<{
    totalMB: number
    freeMB: number
  }>

  // Event emitter support
  addListener(eventName: string): void
  removeListeners(count: number): void
}
```

### 2. iOS Implementation Works

```objective-c++
// RNDeviceInfo.mm must implement all methods
@implementation RNDeviceInfo

RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDeviceInfoSpecJSI>(params);
}

// Synchronous method example
- (NSString *)getDeviceId {
  return [[[UIDevice currentDevice] identifierForVendor] UUIDString];
}

// Test passes:
// - Returns valid UUID format
// - Same value on repeated calls
// - Not null
```

### 3. Android Implementation Works

```kotlin
// DeviceInfoModule.kt
class DeviceInfoModule(reactContext: ReactApplicationContext) :
  NativeDeviceInfoSpec(reactContext) {

  override fun getName() = NAME

  // Synchronous method
  override fun getDeviceId(): String {
    return Settings.Secure.getString(
      reactApplicationContext.contentResolver,
      Settings.Secure.ANDROID_ID
    )
  }

  // Test passes:
  // - Returns valid device ID
  // - Same value on repeated calls
  // - Not empty
}
```

### 4. Methods are Callable from JavaScript

```typescript
// App.tsx test
import DeviceInfo from './DeviceInfo'

function TestScreen() {
  const [info, setInfo] = useState({})

  useEffect(() => {
    // Synchronous calls work immediately
    const deviceId = DeviceInfo.getDeviceId()
    const model = DeviceInfo.getModel()

    console.log('Device ID:', deviceId) // Immediate!
    console.log('Model:', model) // Immediate!

    // Async calls
    DeviceInfo.getBatteryLevel().then(level => {
      console.log('Battery:', level + '%')
    })
  }, [])

  return <Text>Device: {info.model}</Text>
}
```

### 5. Performance is Better than Legacy Native Modules

**Benchmark test must show**:
- Synchronous calls: <0.1ms (vs 16ms for legacy)
- Lazy loading: Module not loaded until first use
- Memory: 50KB overhead (vs 200KB for eager loading)

### 6. All Tests Pass

```bash
# iOS
cd ios && pod install
npm run ios
# Should show device info without errors

# Android
npm run android
# Should show device info without errors

# Type checking
npm run tsc --noEmit
# Should have zero type errors
```

## 🚀 Getting Started

### Step 1: Setup Project

```bash
# Clone starter code
cd starter
npm install

# iOS setup
cd ios
pod install
cd ..

# Android setup (automatic with npm install)
```

### Step 2: Enable New Architecture

```bash
# iOS - Uncomment in ios/Podfile:
# use_react_native!(
#   :path => config[:reactNativePath],
#   :hermes_enabled => flags[:hermes_enabled],
#   :fabric_enabled => flags[:fabric_enabled],
#   :flipper_configuration => FlipperConfiguration.enabled,
#   :app_path => "#{Pod::Config.instance.installation_root}/.."
# )

# Android - Set in android/gradle.properties:
newArchEnabled=true
```

### Step 3: Define TypeScript Spec

```typescript
// src/NativeDeviceInfo.ts
import type { TurboModule } from 'react-native'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  // TODO: Add method signatures
}

export default TurboModuleRegistry.get<Spec>('DeviceInfo')
```

### Step 4: Run Codegen

```bash
# Generates native code from TypeScript spec
npm run codegen

# Check generated files:
# - ios/build/generated/ios/RNDeviceInfoSpec/RNDeviceInfoSpec.h
# - android/build/generated/source/codegen/...
```

### Step 5: Implement iOS

```objective-c++
// ios/RNDeviceInfo.mm
#import "RNDeviceInfo.h"
#import <UIKit/UIKit.h>

@implementation RNDeviceInfo

RCT_EXPORT_MODULE()

// TODO: Implement methods

@end
```

### Step 6: Implement Android

```kotlin
// android/src/main/java/.../DeviceInfoModule.kt
package com.deviceinfo

import com.facebook.react.bridge.ReactApplicationContext
import com.deviceinfo.NativeDeviceInfoSpec

class DeviceInfoModule(reactContext: ReactApplicationContext) :
  NativeDeviceInfoSpec(reactContext) {

  override fun getName() = NAME

  // TODO: Implement methods

  companion object {
    const val NAME = "DeviceInfo"
  }
}
```

### Step 7: Test

```bash
# Run on iOS
npm run ios

# Run on Android
npm run android

# Check logs for device info output
```

## 💡 Hints

### Hint 1: Synchronous vs Asynchronous

```typescript
// Synchronous - returns immediately
getDeviceId(): string

// Asynchronous - returns Promise
getBatteryLevel(): Promise<number>

// Rule: Use synchronous only if operation completes in <1ms
// Otherwise use async to avoid blocking JavaScript thread
```

### Hint 2: iOS Device Info APIs

```objective-c++
// Device model
NSString *model = [[UIDevice currentDevice] model];

// OS version
NSString *osVersion = [[UIDevice currentDevice] systemVersion];

// Device ID
NSString *deviceId = [[[UIDevice currentDevice] identifierForVendor] UUIDString];

// Battery level (requires async)
[[UIDevice currentDevice] setBatteryMonitoringEnabled:YES];
float batteryLevel = [[UIDevice currentDevice] batteryLevel];

// Memory
NSProcessInfo *processInfo = [NSProcessInfo processInfo];
unsigned long long totalMemory = [processInfo physicalMemory];
```

### Hint 3: Android Device Info APIs

```kotlin
// Device ID
val deviceId = Settings.Secure.getString(
  contentResolver,
  Settings.Secure.ANDROID_ID
)

// Model
val model = Build.MODEL

// OS version
val osVersion = Build.VERSION.RELEASE

// Memory
val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
val memInfo = ActivityManager.MemoryInfo()
activityManager.getMemoryInfo(memInfo)
val totalMemory = memInfo.totalMem / (1024 * 1024) // Convert to MB

// Battery
val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
```

### Hint 4: Event Emitters

```typescript
// TypeScript spec
interface Spec extends TurboModule {
  addListener(eventName: string): void
  removeListeners(count: number): void
}

// iOS implementation
- (void)addListener:(NSString *)eventName {
  [[NSNotificationCenter defaultCenter] addObserver:self
    selector:@selector(batteryChanged:)
    name:UIDeviceBatteryLevelDidChangeNotification
    object:nil];
}

- (void)batteryChanged:(NSNotification *)notification {
  [self sendEventWithName:@"onBatteryChange" body:@{
    @"level": @([[UIDevice currentDevice] batteryLevel] * 100)
  }];
}

// Android implementation
override fun addListener(eventName: String) {
  val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
  reactApplicationContext.registerReceiver(batteryReceiver, filter)
}
```

## 🎯 Stretch Goals

Once you've completed the basic requirements:

### 1. Add Caching

```typescript
// Cache synchronous values that don't change
private static cachedDeviceId: string | null = null

getDeviceId(): string {
  if (!DeviceInfo.cachedDeviceId) {
    DeviceInfo.cachedDeviceId = NativeDeviceInfo.getDeviceId()
  }
  return DeviceInfo.cachedDeviceId
}
```

### 2. Add TypeScript Wrapper with Better DX

```typescript
// DeviceInfo.ts - Wrapper with hooks
export function useDeviceInfo() {
  const [info, setInfo] = useState(() => ({
    id: NativeDeviceInfo.getDeviceId(),
    model: NativeDeviceInfo.getModel(),
    os: NativeDeviceInfo.getOSVersion()
  }))

  return info
}

// Usage
function MyApp() {
  const device = useDeviceInfo()
  return <Text>{device.model}</Text>
}
```

### 3. Add Battery Monitoring Hook

```typescript
export function useBatteryLevel() {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    DeviceInfo.getBatteryLevel().then(setLevel)

    const subscription = DeviceInfo.addListener('onBatteryChange', (event) => {
      setLevel(event.level)
    })

    return () => subscription.remove()
  }, [])

  return level
}
```

### 4. Add Performance Benchmarks

```typescript
// Benchmark.ts
console.time('Sync call')
for (let i = 0; i < 1000; i++) {
  DeviceInfo.getDeviceId()
}
console.timeEnd('Sync call')
// Should be <100ms for 1000 calls (0.1ms each)
```

### 5. Add Error Handling

```typescript
// Graceful fallbacks
getModel(): string {
  try {
    return NativeDeviceInfo.getModel()
  } catch (error) {
    console.error('Failed to get model:', error)
    return 'Unknown'
  }
}
```

## 📖 Reference Solution

See [../solution](../solution) for:
- Complete TypeScript spec with all method signatures
- Full iOS implementation with comments
- Full Android implementation with comments
- JavaScript wrapper with hooks
- Performance benchmarks
- Test suite

**Important**: Attempt the exercise yourself first! The solution includes detailed commentary explaining:
- Why each method is sync vs async
- Platform-specific considerations
- Performance optimizations
- Common pitfalls to avoid

## 🔍 Debugging Tips

### Problem: "TurboModuleRegistry.get() returned null"

**Solution**: Check that:
1. New architecture is enabled (`newArchEnabled=true`)
2. Module name matches: `TurboModuleRegistry.get<Spec>('DeviceInfo')` = `RCT_EXPORT_MODULE(DeviceInfo)`
3. Codegen ran successfully (`npm run codegen`)
4. iOS: Pod installed (`cd ios && pod install`)

### Problem: Type errors in generated code

**Solution**:
1. Check TypeScript spec syntax
2. Ensure all types are compatible with codegen (use primitives, Objects, Arrays, Promises)
3. Avoid `any`, `unknown`, or complex union types

### Problem: Crashes on method call

**Solution**:
1. Check native method signature matches spec exactly
2. Verify parameter types
3. Check for nil/null safety
4. Add try-catch in native code

### Problem: Slow performance

**Solution**:
1. Verify method is actually synchronous (not calling async APIs)
2. Check for unnecessary allocations
3. Use caching for values that don't change
4. Profile with Xcode Instruments (iOS) or Android Profiler

## ⏱️ Time Estimate

- **TypeScript spec**: 30 minutes
- **iOS implementation**: 2-3 hours
- **Android implementation**: 2-3 hours
- **Testing and debugging**: 1-2 hours
- **Stretch goals**: +3-4 hours

**Total**: 5-8 hours

## 🎓 What You'll Learn

This exercise demonstrates:

1. **Type safety**: TypeScript → Native code generation eliminates runtime errors
2. **Lazy loading**: Module only loaded when first accessed (500ms faster startup)
3. **Synchronous calls**: 1000x faster than legacy bridge (0.05µs vs 50µs)
4. **Platform abstraction**: Same JavaScript API, platform-specific implementation
5. **Performance**: Real-world impact of TurboModules vs Native Modules

### Performance Comparison

| Metric | Legacy Native Module | TurboModule | Improvement |
|--------|---------------------|-------------|-------------|
| **Call overhead** | 50µs | 0.05µs | 1000x faster |
| **Startup time** | +500ms (eager load) | +0ms (lazy load) | Instant |
| **Memory** | 200KB | 50KB | 75% less |
| **Type safety** | Runtime errors | Compile-time | Zero runtime errors |

---

**Next**: After completing this exercise, move on to [Exercise 2: Build a Fabric Component](../exercise-02-fabric-component) to create high-performance native UI components.
