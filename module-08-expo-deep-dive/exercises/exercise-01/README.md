# Exercise 1: E-Commerce Mobile App with Expo

## 🎯 Goal

Build a production-ready e-commerce mobile application using Expo that demonstrates mastery of Expo Router, EAS Build, OTA Updates, native modules, and performance optimization.

## 📚 Prerequisites

- Complete all 5 lectures in Module 8
- Node.js 18+ and npm/yarn installed
- Expo CLI installed (`npm install -g expo-cli`)
- EAS CLI installed (`npm install -g eas-cli`)
- iOS Simulator (Mac) or Android Emulator configured
- Expo account (sign up at expo.dev)

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Master Expo Router's file-based routing and navigation patterns
✅ Configure and use EAS Build for iOS and Android builds
✅ Implement OTA updates for instant feature deployment
✅ Create custom native modules using Expo Modules API
✅ Apply performance optimization techniques for production apps
✅ Understand the complete Expo development-to-production workflow

## 📝 Task Description

Build a fully-functional e-commerce app called **"ShopHub"** with the following features:

### Core Features

1. **Product Catalog** (Expo Router)
   - Tab-based navigation (Home, Categories, Cart, Profile)
   - Stack navigation for product details
   - Search with query parameters
   - Deep linking support (`shopHub://product/123`)

2. **EAS Build Integration**
   - Configure build profiles (development, preview, production)
   - Generate iOS and Android builds
   - Implement environment-specific configurations
   - Set up custom splash screens and app icons

3. **OTA Update System**
   - Implement automatic update checking on app launch
   - Create update channels (development, staging, production)
   - Show update progress UI
   - Handle rollback scenarios

4. **Custom Native Module**
   - Build a "Haptic Feedback" module using Expo Modules API
   - Expose native haptic feedback for iOS and Android
   - Use haptics for cart actions (add to cart, checkout)

5. **Performance Optimizations**
   - Implement image optimization with expo-image
   - Use FlatList with proper optimization props
   - Lazy load product images
   - Minimize bundle size with Hermes
   - Track performance with React Profiler

## 🏗️ Starter Code

See [./starter](./starter) for:
- `app/` - Expo Router directory structure
- `components/` - Reusable UI components
- `lib/` - Business logic and API clients
- `modules/haptic-feedback/` - Native module skeleton
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration

## ✅ Acceptance Criteria

### 1. Expo Router Implementation

Your app must have:

```
app/
├── (tabs)/
│   ├── index.tsx           # Home (Product list)
│   ├── categories.tsx      # Categories grid
│   ├── cart.tsx            # Shopping cart
│   └── profile.tsx         # User profile
├── product/[id].tsx        # Product details
├── search.tsx              # Search results
└── _layout.tsx             # Root layout
```

**Navigation requirements**:
- Tab navigation with icons
- Stack navigation for product details
- Search with query params: `/search?q=shoes`
- Deep links: `shopHub://product/123`

**Test**:
```bash
npx expo start
# Navigate through all screens
# Test deep linking from browser: shopHub://product/1
```

### 2. EAS Build Configuration

**eas.json**:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "ios": {
        "bundleIdentifier": "com.yourname.shophub"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Test**:
```bash
# Build for iOS simulator
eas build --profile development --platform ios

# Build preview for internal testing
eas build --profile preview --platform all
```

### 3. OTA Update System

Implement in `lib/updates.ts`:

```typescript
import * as Updates from 'expo-updates'

export async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync()

    if (update.isAvailable) {
      await Updates.fetchUpdateAsync()
      Alert.alert(
        'Update Available',
        'A new version is ready. Restart now?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() }
        ]
      )
    }
  } catch (error) {
    console.error('Update check failed:', error)
  }
}
```

**Test**:
```bash
# Publish update to preview channel
eas update --channel preview --message "Add new products"

# App should detect and prompt for update
```

### 4. Custom Haptic Feedback Module

**modules/haptic-feedback/index.ts** (iOS):
```swift
import ExpoModulesCore
import UIKit

public class HapticFeedbackModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HapticFeedback")

    Function("impact") { (style: String) in
      DispatchQueue.main.async {
        let generator: UIImpactFeedbackGenerator
        switch style {
        case "light":
          generator = UIImpactFeedbackGenerator(style: .light)
        case "medium":
          generator = UIImpactFeedbackGenerator(style: .medium)
        case "heavy":
          generator = UIImpactFeedbackGenerator(style: .heavy)
        default:
          generator = UIImpactFeedbackGenerator(style: .medium)
        }
        generator.impactOccurred()
      }
    }

    Function("notification") { (type: String) in
      DispatchQueue.main.async {
        let generator = UINotificationFeedbackGenerator()
        switch type {
        case "success":
          generator.notificationOccurred(.success)
        case "warning":
          generator.notificationOccurred(.warning)
        case "error":
          generator.notificationOccurred(.error)
        default:
          generator.notificationOccurred(.success)
        }
      }
    }
  }
}
```

**Usage**:
```typescript
import * as HapticFeedback from './modules/haptic-feedback'

// In Add to Cart button
function handleAddToCart() {
  HapticFeedback.impact('medium')
  addToCart(product)
}

// On checkout success
function handleCheckoutSuccess() {
  HapticFeedback.notification('success')
}
```

**Test**:
```bash
npx expo run:ios
# Tap "Add to Cart" - should feel haptic feedback
```

### 5. Performance Requirements

Your app must achieve:

**Bundle Size**:
- Initial bundle: < 2MB
- Hermes enabled
- Tree shaking configured

**Runtime Performance**:
- Product list scroll: 60 FPS
- Image loading: < 500ms per image
- Navigation transitions: < 16ms

**Optimization checklist**:
- ✅ expo-image for all images
- ✅ FlatList with `getItemLayout`, `removeClippedSubviews`
- ✅ Memoize expensive components
- ✅ Code splitting for large screens
- ✅ Lazy load off-screen images

**Test**:
```bash
# Measure bundle size
npx expo export --platform ios
du -sh dist

# Profile with React DevTools
# - Enable "Highlight updates"
# - Record profile during scroll
# - Verify 60 FPS
```

## 🚀 Getting Started

### Step 1: Initialize Project

```bash
cd starter
npm install

# Configure EAS
eas login
eas build:configure
```

### Step 2: Run Development Build

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

### Step 3: Implement Features

1. **Days 1-2**: Expo Router navigation + product catalog
2. **Day 3**: EAS Build setup + first build
3. **Day 4**: OTA Updates implementation
4. **Day 5**: Custom haptic module
5. **Day 6**: Performance optimization
6. **Day 7**: Testing + polish

### Step 4: Build and Deploy

```bash
# Build preview version
eas build --profile preview --platform all

# Publish OTA update
eas update --channel preview --message "Initial release"

# Install preview build and test updates
```

## 💡 Hints

### Expo Router Tips

1. **File-based routing**: Each file in `app/` becomes a route
2. **Layouts**: Use `_layout.tsx` for shared UI (tabs, headers)
3. **Dynamic routes**: `[id].tsx` for product details
4. **Type-safe navigation**: Use `useRouter()` hook

```typescript
import { useRouter, useLocalSearchParams } from 'expo-router'

function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return (
    <View>
      <Text>Product {id}</Text>
      <Button onPress={() => router.back()}>Back</Button>
    </View>
  )
}
```

### EAS Build Tips

1. **Credentials**: EAS handles certificates automatically
2. **Internal distribution**: Use `--profile preview` for testing
3. **Environment variables**: Set in `eas.json` → `env`
4. **Build locally**: Add `eas build --local` for debugging

### OTA Update Tips

1. **Runtime versions**: Update when native code changes
2. **Channels**: Separate dev/staging/production
3. **Rollback**: Use `eas update --branch main --message "Rollback"`
4. **Testing**: Test updates in preview builds, not development

### Native Module Tips

1. **Use Expo Modules API**: Simpler than TurboModules
2. **Platform-specific**: Implement iOS (Swift) and Android (Kotlin) separately
3. **Prebuild**: Run `npx expo prebuild` to generate native directories
4. **Testing**: Use `npx expo run:ios` to test native code

### Performance Tips

1. **Images**: Always use `expo-image`, not `react-native Image`
2. **Lists**: Use `FlatList`, not `ScrollView` with `.map()`
3. **Memoization**: Wrap expensive components in `React.memo()`
4. **Bundle analysis**: Run `npx expo export` and check size

## 🎯 Stretch Goals

Once you've completed the basic requirements:

### 1. Advanced Routing

- Add modal routes (e.g., cart as modal)
- Implement search history
- Add route-based analytics

### 2. Enhanced OTA Updates

- A/B test two product layouts
- Gradual rollout (10% → 50% → 100%)
- Automatic rollback on errors

### 3. Additional Native Modules

- Biometric authentication (Face ID / Fingerprint)
- Share sheet integration
- Camera for barcode scanning

### 4. Performance Monitoring

- Integrate Sentry for crash reporting
- Add performance metrics tracking
- Implement startup time measurement

### 5. Offline Support

- Cache product data with AsyncStorage
- Queue cart actions while offline
- Sync when connection restores

## 📖 Reference Solution

See [./solution](./solution) for a complete, production-ready implementation with:
- Full Expo Router navigation
- EAS Build configuration
- OTA Update system
- Custom haptic feedback module
- Performance optimizations
- Unit and integration tests

**Important**: Attempt the exercise independently first! The solution includes detailed comments explaining architecture decisions and tradeoffs.

## 🔍 Debugging Tips

### Common Issues

1. **Build fails on EAS**:
   - Check `eas.json` configuration
   - Verify credentials with `eas credentials`
   - Review build logs on expo.dev

2. **OTA updates not appearing**:
   - Confirm runtime version matches
   - Check channel configuration
   - Verify update was published: `eas update:list`

3. **Native module not working**:
   - Run `npx expo prebuild --clean`
   - Rebuild app with `npx expo run:ios`
   - Check native logs in Xcode/Android Studio

4. **Performance issues**:
   - Profile with React DevTools
   - Check bundle size: `npx expo export`
   - Verify Hermes is enabled in `app.json`

### Debugging Commands

```bash
# View EAS builds
eas build:list

# View updates
eas update:list --branch main

# Check runtime version
eas update:configure

# View build logs
eas build:view [build-id]

# Clear cache
npx expo start -c
```

## ⏱️ Time Estimate

- **Setup + navigation**: 4-6 hours
- **EAS Build setup**: 2-3 hours
- **OTA Updates**: 3-4 hours
- **Native module**: 4-6 hours
- **Performance optimization**: 3-4 hours
- **Testing + polish**: 2-3 hours

**Total**: 18-26 hours over 5-7 days

## 🎓 What You'll Learn

This exercise demonstrates:

- **Expo Router**: File-based routing, layouts, deep linking
- **EAS Build**: Build profiles, credentials, distribution
- **OTA Updates**: Channels, runtime versions, gradual rollout
- **Native Modules**: Expo Modules API, iOS/Android integration
- **Performance**: Bundle optimization, runtime performance, profiling
- **Production workflow**: From development to App Store deployment

### Real-World Skills

✅ Setting up production Expo apps
✅ Configuring CI/CD with EAS
✅ Deploying instant updates without app store review
✅ Building custom native functionality
✅ Optimizing for 60 FPS performance
✅ Managing multi-environment deployments

---

**Next**: After completing this exercise, move on to [Module 9: Cross-Platform Architecture](../../module-09-cross-platform-architecture) to learn how to share code between web and mobile.

## 📚 Additional Resources

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [React Native Performance](https://reactnative.dev/docs/performance)
