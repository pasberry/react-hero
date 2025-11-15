# Lecture 4: Native Modules with Expo - Config Plugins & Expo Modules API

## Introduction

Expo has evolved from a "managed workflow" where native code was inaccessible, to a flexible system where you can add any native functionality while maintaining Expo's developer experience. The game changers: **Config Plugins** and **Expo Modules API**.

**Why does this matter?** Historically, using a library with native code (like Firebase, Maps, or Camera) meant "ejecting" from Expo—permanently losing the managed workflow benefits. Config Plugins eliminate this tradeoff. You can use any native library, customize native projects, and still use EAS Build, OTA updates, and `npx expo prebuild` to regenerate native code.

Expo Modules API goes further: it provides a modern, ergonomic way to write native modules that's easier than React Native's TurboModules while being equally performant. Companies like Expo, Software Mansion, and dozens of library authors now use Expo Modules for their native implementations.

This lecture covers config plugins architecture, using and creating plugins, Expo Modules API for writing native code, the prebuild workflow, and migration strategies from bare React Native.

## The Problem: The Old "Eject" Model

### Expo's Original Limitation

**Before 2020**, Expo had two workflows:

**Managed Workflow** (no native code access):
- ✅ Use `expo start` for development
- ✅ Build with `expo build`
- ✅ OTA updates
- ❌ Cannot add libraries with native code
- ❌ Cannot modify AndroidManifest.xml or Info.plist
- ❌ Stuck with Expo's predefined native modules

**Bare Workflow** (ejected):
- ✅ Full native code access
- ✅ Use any native library
- ❌ Lose managed workflow benefits
- ❌ Manually manage native code
- ❌ No more `expo build`
- ❌ Complex upgrades

**The dilemma**: Need Firebase? Camera? Maps? You had to eject, losing all managed workflow benefits permanently.

### The Solution: Config Plugins + Prebuild

**New model** (2021+):

```bash
# No ejecting! Generate native code on-demand
npx expo prebuild

# Outputs:
# - ios/ directory (generated from app.json + plugins)
# - android/ directory (generated from app.json + plugins)

# Commit to git? NO!
# ios/ and android/ are .gitignore'd
# They're regenerated from app.json each build
```

**Benefits**:
1. Use any native library (Firebase, Maps, Camera)
2. Customize native projects (permissions, config)
3. Keep managed workflow (EAS Build, OTA updates)
4. Upgrades are easy (regenerate with new SDK)
5. Native code stays in sync (single source of truth: app.json)

## Config Plugins Architecture

Config plugins are JavaScript functions that modify native projects during `prebuild`.

### How Prebuild Works

```
┌─────────────────────────────────────────┐
│         app.json + plugins              │
│  {                                      │
│    "plugins": [                         │
│      "expo-camera",                     │
│      "@react-native-firebase/app"       │
│    ]                                    │
│  }                                      │
└────────────────┬────────────────────────┘
                 │
                 ▼ npx expo prebuild
┌─────────────────────────────────────────┐
│      Config Plugins Execute             │
│  1. expo-camera plugin:                 │
│     - Add camera permission to Info.plist│
│     - Add camera feature to Manifest    │
│  2. firebase plugin:                    │
│     - Add GoogleService-Info.plist      │
│     - Configure build.gradle            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Generated Native Projects             │
│   ios/                                  │
│   ├── MyApp.xcodeproj                   │
│   ├── Info.plist (with camera perms)    │
│   └── GoogleService-Info.plist          │
│                                         │
│   android/                              │
│   ├── app/build.gradle (firebase)       │
│   └── AndroidManifest.xml (camera perms)│
└─────────────────────────────────────────┘
```

**Key insight**: Native code is **generated**, not manually written. Change app.json, run `prebuild`, native code updates automatically.

## Using Config Plugins

### Built-in Expo Plugins

Most Expo SDK packages include config plugins:

```json
// app.json
{
  "expo": {
    "name": "My App",
    "plugins": [
      // Camera with custom permissions
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for video calls",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
        }
      ],

      // Location with custom message
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location to show nearby stores."
        }
      ],

      // Notifications
      "expo-notifications",

      // Image picker
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos"
        }
      ]
    ]
  }
}
```

**What happens**:
1. `expo-camera` plugin adds camera/microphone permissions to Info.plist (iOS)
2. Adds `<uses-permission>` for camera to AndroidManifest.xml (Android)
3. Configures CocoaPods (iOS) and Gradle dependencies (Android)

### Third-Party Plugins

Many popular libraries provide config plugins:

```json
{
  "expo": {
    "plugins": [
      // Firebase (React Native Firebase)
      "@react-native-firebase/app",

      // Google Sign-In
      "@react-native-google-signin/google-signin",

      // OneSignal push notifications
      "onesignal-expo-plugin",

      // Sentry error tracking
      "@sentry/react-native",

      // Stripe payments
      "@stripe/stripe-react-native"
    ]
  }
}
```

### Plugins with Configuration

```json
{
  "expo": {
    "plugins": [
      // Configure Android build properties
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34,
            "targetSdkVersion": 34,
            "buildToolsVersion": "34.0.0",
            "kotlinVersion": "1.9.0"
          },
          "ios": {
            "deploymentTarget": "13.0",
            "useFrameworks": "static"
          }
        }
      ],

      // Configure app icon
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Inter-Regular.ttf",
            "./assets/fonts/Inter-Bold.ttf"
          ]
        }
      ]
    ]
  }
}
```

## Creating Custom Config Plugins

### Use Case: Custom Deep Links

Let's create a plugin to configure custom URL schemes:

```javascript
// plugins/withCustomScheme.js
const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins')

/**
 * Config plugin to add custom URL scheme
 */
function withCustomScheme(config, { scheme }) {
  // Modify iOS Info.plist
  config = withInfoPlist(config, (config) => {
    // Add URL scheme
    config.modResults.CFBundleURLTypes = [
      {
        CFBundleURLSchemes: [scheme],
        CFBundleURLName: config.ios?.bundleIdentifier || 'com.myapp'
      }
    ]

    return config
  })

  // Modify Android Manifest
  config = withAndroidManifest(config, (config) => {
    const mainActivity = config.modResults.manifest.application[0].activity.find(
      activity => activity.$['android:name'] === '.MainActivity'
    )

    // Add intent filter for deep linking
    mainActivity['intent-filter'].push({
      $: { 'android:autoVerify': 'true' },
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } }
      ],
      data: [
        { $: { 'android:scheme': scheme } }
      ]
    })

    return config
  })

  return config
}

module.exports = withCustomScheme
```

**Usage**:

```json
// app.json
{
  "expo": {
    "plugins": [
      ["./plugins/withCustomScheme", { "scheme": "myapp" }]
    ]
  }
}
```

**Result**:
```bash
npx expo prebuild

# iOS Info.plist now contains:
# <key>CFBundleURLTypes</key>
# <array>
#   <dict>
#     <key>CFBundleURLSchemes</key>
#     <array>
#       <string>myapp</string>
#     </array>
#   </dict>
# </array>

# Android Manifest now contains deep link intent filter
```

### Use Case: Adding Native Dependencies

```javascript
// plugins/withNativeLibrary.js
const { withDangerousMod, withPlugins } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Plugin to add native SDK dependency
 */
function withNativeLibrary(config) {
  return withPlugins(config, [
    // Android: Modify build.gradle
    [
      withDangerousMod,
      [
        'android',
        async (config) => {
          const buildGradle = path.join(
            config.modRequest.platformProjectRoot,
            'app',
            'build.gradle'
          )

          let contents = fs.readFileSync(buildGradle, 'utf-8')

          // Add dependency
          if (!contents.includes('com.example:native-sdk')) {
            contents = contents.replace(
              'dependencies {',
              `dependencies {
    implementation 'com.example:native-sdk:1.0.0'`
            )

            fs.writeFileSync(buildGradle, contents)
          }

          return config
        }
      ]
    ],

    // iOS: Modify Podfile
    [
      withDangerousMod,
      [
        'ios',
        async (config) => {
          const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile')

          let contents = fs.readFileSync(podfile, 'utf-8')

          // Add pod
          if (!contents.includes('NativeSDK')) {
            contents = contents.replace(
              /target .* do/,
              `target '${config.modRequest.projectName}' do
  pod 'NativeSDK', '~> 1.0'`
            )

            fs.writeFileSync(podfile, contents)
          }

          return config
        }
      ]
    ]
  ])
}

module.exports = withNativeLibrary
```

### Advanced: Generating Files

```javascript
// plugins/withGoogleServices.js
const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Plugin to add Google Services config files
 */
function withGoogleServices(config) {
  // Add GoogleService-Info.plist to iOS
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const sourceFile = path.join(
        config.modRequest.projectRoot,
        'GoogleService-Info.plist'
      )
      const destFile = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'GoogleService-Info.plist'
      )

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile)
      }

      return config
    }
  ])

  // Add google-services.json to Android
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const sourceFile = path.join(
        config.modRequest.projectRoot,
        'google-services.json'
      )
      const destFile = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'google-services.json'
      )

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile)
      }

      return config
    }
  ])

  return config
}

module.exports = withGoogleServices
```

## Expo Modules API: Writing Native Code

Expo Modules API is a modern native module system that's easier than TurboModules while being equally performant.

### Why Expo Modules vs TurboModules?

| Feature | TurboModules | Expo Modules |
|---------|--------------|--------------|
| **Type safety** | Manual codegen | Automatic from native code |
| **iOS language** | Objective-C++ | Swift |
| **Android language** | Kotlin/Java | Kotlin |
| **Boilerplate** | High | Minimal |
| **Learning curve** | Steep | Gentle |
| **Performance** | Excellent | Excellent |
| **Expo integration** | Works | First-class |

### Creating an Expo Module

```bash
# Create new Expo module
npx create-expo-module my-module

# Structure:
# my-module/
# ├── android/          # Android implementation
# ├── ios/              # iOS implementation
# ├── src/              # TypeScript/JavaScript API
# ├── expo-module.config.json
# └── package.json
```

### Example: Calculator Module

**TypeScript API** (auto-generated types):

```typescript
// src/MyModule.ts
import { requireNativeModule } from 'expo-modules-core'

// Type-safe interface (inferred from native code)
const MyModule = requireNativeModule('MyModule')

export function add(a: number, b: number): number {
  return MyModule.add(a, b)
}

export function multiplyAsync(a: number, b: number): Promise<number> {
  return MyModule.multiplyAsync(a, b)
}

export function subscribeToEvents(callback: (event: { value: number }) => void) {
  return MyModule.addListener('onValueChanged', callback)
}
```

**iOS Implementation** (Swift):

```swift
// ios/MyModule.swift
import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    // Module name
    Name("MyModule")

    // Synchronous function
    Function("add") { (a: Double, b: Double) -> Double in
      return a + b
    }

    // Asynchronous function (returns Promise)
    AsyncFunction("multiplyAsync") { (a: Double, b: Double) -> Double in
      // Simulate async work
      Thread.sleep(forTimeInterval: 0.1)
      return a * b
    }

    // Event emitter
    Events("onValueChanged")

    // Function that sends events
    Function("triggerEvent") { (value: Double) in
      self.sendEvent("onValueChanged", ["value": value])
    }

    // View component (if needed)
    View(MyView.self) {
      Prop("color") { (view, color: String) in
        view.backgroundColor = UIColor(named: color)
      }
    }
  }
}
```

**Android Implementation** (Kotlin):

```kotlin
// android/src/main/java/expo/modules/mymodule/MyModule.kt
package expo.modules.mymodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.delay

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    // Module name
    Name("MyModule")

    // Synchronous function
    Function("add") { a: Double, b: Double ->
      a + b
    }

    // Asynchronous function (suspend = Promise)
    AsyncFunction("multiplyAsync") { a: Double, b: Double ->
      // Simulate async work
      delay(100)
      a * b
    }

    // Event emitter
    Events("onValueChanged")

    // Function that sends events
    Function("triggerEvent") { value: Double ->
      sendEvent("onValueChanged", mapOf("value" to value))
    }

    // View component (if needed)
    View(MyView::class) {
      Prop("color") { view: MyView, color: String ->
        view.setBackgroundColor(Color.parseColor(color))
      }
    }
  }
}
```

**Usage in React Native**:

```typescript
import { add, multiplyAsync, subscribeToEvents } from 'my-module'

// Synchronous call
const sum = add(5, 3) // 8

// Async call
const product = await multiplyAsync(4, 7) // 28

// Event subscription
const subscription = subscribeToEvents((event) => {
  console.log('Value changed:', event.value)
})

// Cleanup
subscription.remove()
```

### Advanced: Native UI Components

```swift
// ios/MyView.swift
import ExpoModulesCore
import UIKit

class MyView: ExpoView {
  let label = UILabel()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    addSubview(label)
    label.textAlignment = .center
  }

  func setText(_ text: String) {
    label.text = text
  }
}

// MyModule.swift
View(MyView.self) {
  Prop("text") { (view: MyView, text: String) in
    view.setText(text)
  }

  Events("onPress")

  OnCreate { view in
    let tapGesture = UITapGestureRecognizer(target: view, action: #selector(view.handleTap))
    view.addGestureRecognizer(tapGesture)
  }
}
```

```typescript
// React Native usage
import { requireNativeViewManager } from 'expo-modules-core'
import { ViewProps } from 'react-native'

const NativeView = requireNativeViewManager('MyModule')

interface MyViewProps extends ViewProps {
  text: string
  onPress?: () => void
}

export function MyView({ text, onPress, ...props }: MyViewProps) {
  return <NativeView text={text} onPress={onPress} {...props} />
}
```

## The Prebuild Workflow

### Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Generate native projects (first time or after plugin changes)
npx expo prebuild

# 3. Run on device
npx expo run:ios
npx expo run:android

# 4. Make changes to JS code
# Hot reload works automatically

# 5. Make changes to plugins or app.json
npx expo prebuild --clean  # Regenerate native code

# 6. Make changes to native code (ios/ or android/)
# Edit directly, then rebuild
```

### Clean Regeneration

```bash
# Delete and regenerate native directories
npx expo prebuild --clean

# What this does:
# 1. Delete ios/ and android/
# 2. Regenerate from app.json + plugins
# 3. Apply all config plugins
# 4. Install dependencies (pod install, gradle sync)
```

**When to use `--clean`**:
- After changing plugins in app.json
- After upgrading Expo SDK
- When native projects are in bad state
- Before production builds

### EAS Build Integration

```json
// eas.json
{
  "build": {
    "production": {
      "prebuildCommand": "npx expo prebuild --clean",
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

**EAS Build workflow**:
1. Upload app.json + plugins (not ios/android directories!)
2. EAS runs `npx expo prebuild` in cloud
3. Native projects generated fresh
4. EAS builds iOS/Android binaries
5. You download signed .ipa/.aab files

**Benefits**:
- ios/ and android/ never committed to git
- Always fresh, no drift from config
- Reproducible builds
- Easy SDK upgrades

## Migration from Bare React Native

### Step 1: Install Expo

```bash
# In existing React Native project
npx install-expo-modules@latest
```

This adds:
- `expo` package
- Expo Modules support to iOS/Android
- Ability to use Expo SDK libraries

### Step 2: Configure app.json

```json
// app.json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "ios": {
      "bundleIdentifier": "com.company.myapp"
    },
    "android": {
      "package": "com.company.myapp"
    }
  }
}
```

### Step 3: Adopt Prebuild (Optional)

```bash
# Move existing native code to plugins
npx expo prebuild --clean

# Review generated ios/ and android/
# Commit any necessary custom changes as plugins
```

### Step 4: Use Expo Modules

```bash
# Install Expo SDK packages
npx expo install expo-camera expo-location

# Add plugins
# app.json
{
  "expo": {
    "plugins": ["expo-camera", "expo-location"]
  }
}

# Regenerate
npx expo prebuild
```

## Best Practices

### 1. Don't Commit Native Directories

```bash
# .gitignore
ios/
android/

# Keep:
# - app.json
# - plugins/
# - package.json

# Native code is generated, not source of truth
```

### 2. Use Config Plugins for All Customization

```bash
# ❌ Don't: Manually edit Info.plist
# Edit ios/MyApp/Info.plist directly

# ✅ Do: Create config plugin
# plugins/withCustomPlist.js
# Modify via plugin, regenerate with prebuild
```

### 3. Test Prebuild Locally

```bash
# Before pushing to EAS Build:
npx expo prebuild --clean
npx expo run:ios
# Verify app works

# Then push knowing EAS Build will succeed
```

### 4. Version Lock SDK

```json
// package.json
{
  "dependencies": {
    "expo": "~49.0.0",  // Lock to SDK 49
    "expo-camera": "~13.0.0"
  }
}

// Prevents accidental upgrades mid-project
```

### 5. Document Custom Plugins

```javascript
// plugins/withCustomFeature.js
/**
 * Adds custom deep linking configuration
 *
 * Usage:
 * {
 *   "plugins": [
 *     ["./plugins/withCustomFeature", { "scheme": "myapp" }]
 *   ]
 * }
 *
 * Modifies:
 * - iOS: Info.plist (CFBundleURLTypes)
 * - Android: AndroidManifest.xml (intent-filter)
 */
```

## Comparison: Config Plugins vs Manual Native Code

| Aspect | Config Plugins | Manual Native Code |
|--------|----------------|-------------------|
| **Reproducibility** | ✅ Always same from app.json | ❌ Manual edits drift |
| **Upgrades** | ✅ Regenerate with new SDK | ❌ Manual merge conflicts |
| **Team sync** | ✅ app.json in git | ❌ Native diffs hard to review |
| **EAS Build** | ✅ Works seamlessly | ❌ Must commit ios/android |
| **Learning curve** | Medium | Low (if you know native) |
| **Flexibility** | High (can do anything) | Complete |

## Summary

**Config Plugins enable native customization without ejecting**:
- **Modify native projects** via JavaScript functions
- **Regenerate on demand** with `npx expo prebuild`
- **Keep managed workflow benefits** (EAS Build, OTA updates)
- **Easy upgrades** (regenerate with new SDK)
- **Single source of truth** (app.json, not native code)

**Expo Modules API simplifies native module development**:
- **Modern languages** (Swift for iOS, Kotlin for Android)
- **Minimal boilerplate** compared to TurboModules
- **Automatic type generation** from native code
- **First-class Expo integration**
- **Excellent performance** (on par with TurboModules)

**Key capabilities**:
- Use any third-party library (Firebase, Maps, etc.)
- Create custom config plugins for project-specific needs
- Write native modules with Expo Modules API
- Generate native projects on-demand with prebuild
- Maintain managed workflow benefits

**Development workflow**:
1. Modify app.json + plugins (source of truth)
2. Run `npx expo prebuild` (regenerate native code)
3. Test with `npx expo run:ios`/`android`
4. Push to git (no ios/android directories)
5. EAS Build regenerates and builds in cloud

**Migration path**:
- Existing React Native apps can adopt Expo incrementally
- Start with `npx install-expo-modules`
- Optionally adopt prebuild for managed workflow benefits
- Use Expo SDK libraries alongside community libraries

**Real-world impact**:
- No more "eject" decision
- Use any library (100% compatibility)
- Faster upgrades (regenerate vs manual merge)
- Better team collaboration (app.json vs native diffs)
- Production-ready (used by Expo, Microsoft, others)

**Next lecture**: We'll cover performance optimization strategies for Expo apps, including bundle size reduction, startup time optimization, and runtime performance tuning.
