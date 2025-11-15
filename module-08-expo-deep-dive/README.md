# Module 8: Expo Deep Dive (Web + iOS + Android)

## 🎯 Module Overview

Master the Expo ecosystem for building production cross-platform apps, including Expo Router, EAS Build, OTA updates, and native modules.

### Learning Objectives

✅ Build apps with Expo Router (file-based routing)
✅ Deploy with EAS Build and EAS Update
✅ Implement OTA (Over-The-Air) updates
✅ Create custom native modules with Expo
✅ Optimize app performance and bundle size

### Time Estimate: 8-12 hours

---

## 📚 Key Topics

### 1. Expo Router Mastery
- File-based routing for React Native
- Shared routes (web + mobile)
- Navigation patterns
- Deep linking

### 2. EAS (Expo Application Services)
- EAS Build (cloud builds)
- EAS Submit (app store deployment)
- EAS Update (OTA updates)
- Build profiles and environments

### 3. OTA Updates
- Push updates without app store review
- Update strategies (critical, optional)
- Rollback mechanisms
- Version compatibility

### 4. Native Modules with Expo
- Expo Modules API
- Config plugins
- Building custom native modules
- TypeScript integration

### 5. Performance Optimization
- Bundle splitting
- Lazy loading screens
- Image optimization
- Startup time optimization

---

## 🛠️ Exercises

### Exercise 1: Cross-Platform Expo App

Build a complete app with:

```
app/
├── (tabs)/
│   ├── index.tsx          # Home tab
│   ├── profile.tsx        # Profile tab
│   └── settings.tsx       # Settings tab
├── post/[id].tsx          # Dynamic post page
├── modal.tsx              # Modal route
└── _layout.tsx            # Root layout
```

**Features**:
- Tab navigation
- Stack navigation
- Modals
- Deep linking

**Time**: 4-5 hours

---

### Exercise 2: EAS Build + OTA Pipeline

Set up production deployment:

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "user@example.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json"
      }
    }
  }
}
```

**Implement**:
- Development builds
- Preview builds for testing
- Production builds for app stores
- OTA updates with channels

**Time**: 3-4 hours

---

### Exercise 3: Custom Native Module

Create an Expo module:

```tsx
// modules/device-info/index.ts
import { requireNativeModule } from 'expo-modules-core';

const DeviceInfo = requireNativeModule('DeviceInfo');

export function getBatteryLevel(): number {
  return DeviceInfo.getBatteryLevel();
}

export function getDeviceId(): string {
  return DeviceInfo.getDeviceId();
}
```

**Implement native code**:
- iOS (Swift with Expo Modules API)
- Android (Kotlin with Expo Modules API)

**Time**: 4-5 hours

---

## 🎯 Production Patterns

### OTA Update Strategy

```tsx
import * as Updates from 'expo-updates';

export function useOTAUpdates() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();

          // Show prompt to user
          Alert.alert(
            'Update Available',
            'A new version is available. Restart to update?',
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Restart',
                onPress: () => Updates.reloadAsync(),
              },
            ]
          );
        }
      } catch (e) {
        console.error(e);
      }
    }

    checkForUpdates();
  }, []);
}
```

---

## 🔜 Next: [Module 9: Cross-Platform Architecture](../module-09-cross-platform)
