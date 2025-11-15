# Lecture 3: TurboModules System

## Introduction

TurboModules replace the old Native Modules system with lazy-loaded, type-safe, and high-performance native code integration.

## Old Native Modules

```typescript
// All modules loaded at startup
import { NativeModules } from 'react-native'

const { Calendar, Camera, Bluetooth } = NativeModules

// Problems:
// 1. All loaded even if unused (slow startup)
// 2. No type safety
// 3. Async only
// 4. No code generation
```

## TurboModules

```typescript
// Lazy-loaded on first use
import { TurboModuleRegistry } from 'react-native'
import type { Spec } from './NativeCalculator'

const Calculator = TurboModuleRegistry.get<Spec>('Calculator')

// Benefits:
// 1. Loads only when needed
// 2. TypeScript types generated
// 3. Can be sync or async
// 4. Codegen ensures type safety
```

## Creating a TurboModule

### 1. Define Spec (TypeScript)

```typescript
// NativeCalculator.ts
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport'
import { TurboModuleRegistry } from 'react-native'

export interface Spec extends TurboModule {
  add(a: number, b: number): number // Sync
  addAsync(a: number, b: number): Promise<number> // Async
  getConstants(): { PI: number } // Constants
}

export default TurboModuleRegistry.get<Spec>('Calculator')
```

### 2. Implement iOS (Objective-C++)

```objc
// RCTCalculator.mm
#import "RCTCalculator.h"

@implementation RCTCalculator

RCT_EXPORT_MODULE()

// Sync method
- (NSNumber *)add:(double)a b:(double)b {
  return @(a + b);
}

// Async method
- (void)addAsync:(double)a
               b:(double)b
          resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject {
  resolve(@(a + b));
}

// Constants
- (NSDictionary *)getConstants {
  return @{ @"PI": @(M_PI) };
}

@end
```

### 3. Implement Android (Kotlin)

```kotlin
// CalculatorModule.kt
class CalculatorModule(context: ReactApplicationContext) :
  NativeCalculatorSpec(context) {

  override fun getName() = "Calculator"

  // Sync method
  override fun add(a: Double, b: Double): Double {
    return a + b
  }

  // Async method
  override fun addAsync(a: Double, b: Double, promise: Promise) {
    promise.resolve(a + b)
  }

  // Constants
  override fun getTypedExportedConstants(): Map<String, Any> {
    return mapOf("PI" to Math.PI)
  }
}
```

### 4. Use in App

```typescript
import Calculator from './NativeCalculator'

function App() {
  // Sync call
  const result = Calculator.add(5, 3) // 8 immediately

  // Async call
  const asyncResult = await Calculator.addAsync(5, 3)

  // Constants
  const pi = Calculator.getConstants().PI

  return <Text>{result}</Text>
}
```

## Codegen

TurboModules use Codegen to generate type-safe bindings:

```
TypeScript Spec
      ↓
   Codegen
      ↓
  ┌─────┴─────┐
  ↓           ↓
iOS C++    Android C++
Bindings   Bindings
```

**Benefits**:
- Compile-time type checking
- No runtime overhead
- Consistent across platforms
- Auto-generated boilerplate

## Performance Comparison

### Startup Time

```
Old Native Modules:
Load 50 modules: 500ms

TurboModules:
Load 0 modules: 0ms
Load on demand: 5-10ms each
```

### Call Performance

```typescript
// Old: Always async, crosses bridge
NativeModules.Calculator.add(5, 3, result => {
  console.log(result) // 5ms later
})

// New: Can be sync via JSI
const result = Calculator.add(5, 3) // Immediate!
```

## Real-World Usage

### Camera Module

```typescript
import type { TurboModule } from 'react-native'

export interface Spec extends TurboModule {
  takePicture(options: {
    quality: number
    flash: boolean
  }): Promise<{ uri: string }>

  hasPermission(): boolean // Sync check

  requestPermission(): Promise<boolean>
}
```

### Analytics Module

```typescript
export interface Spec extends TurboModule {
  logEvent(name: string, params: Object): void // Fire and forget

  setUserId(id: string): void

  getSessionId(): string // Sync
}
```

## Summary

**TurboModules provide**:
- Lazy loading (faster startup)
- Type safety (codegen)
- Sync or async methods
- Better performance
- Cross-platform consistency

**Migration Path**:
1. Define TypeScript spec
2. Implement native code
3. Run codegen
4. Replace old module

**Next**: Lecture 4 covers JSI (JavaScript Interface) internals.
