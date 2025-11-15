# Lecture 4: Native Modules with Expo

## Introduction

Expo Config Plugins let you modify native code without ejecting, and Expo Modules API makes creating native modules easier.

## Using Plugins

```json
// app.json
{
  "expo": {
    "plugins": [
      "expo-camera",
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34
          }
        }
      ]
    ]
  }
}
```

## Creating Expo Module

```typescript
// modules/my-module/index.ts
import { requireNativeModule } from 'expo-modules-core'

const MyModule = requireNativeModule('MyModule')

export function multiply(a: number, b: number): number {
  return MyModule.multiply(a, b)
}
```

```kotlin
// android/src/main/java/expo/modules/mymodule/MyModule.kt
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    Function("multiply") { a: Double, b: Double ->
      a * b
    }
  }
}
```

```swift
// ios/MyModule.swift
import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Function("multiply") { (a: Double, b: Double) in
      return a * b
    }
  }
}
```

## Prebuild Workflow

```bash
# Generate native projects
npx expo prebuild

# Run on device
npx expo run:ios
npx expo run:android

# Clean and regenerate
npx expo prebuild --clean
```

## Summary

Expo supports custom native code through config plugins and the Expo Modules API while maintaining upgrade simplicity.

**Next**: Lecture 5 covers performance optimization.
