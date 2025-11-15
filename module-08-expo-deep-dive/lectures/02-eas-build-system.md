# Lecture 2: EAS Build System

## Introduction

EAS (Expo Application Services) Build is a cloud-based build service that compiles your React Native app for iOS and Android without needing a Mac or complex setup.

## Setup

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure
```

## Build Profiles

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
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

## Building

```bash
# Development build
eas build --profile development --platform android

# Production builds
eas build --profile production --platform all

# Submit to stores
eas submit -p ios
eas submit -p android
```

## Native Configuration

```typescript
// app.json - Dynamic configuration
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.company.myapp"
    },
    "android": {
      "package": "com.company.myapp"
    },
    "plugins": [
      "@react-native-firebase/app",
      "expo-camera"
    ]
  }
}
```

## CI/CD Integration

```yaml
# .github/workflows/build.yml
name: EAS Build
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g eas-cli
      - run: eas build --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## Summary

EAS Build provides cloud-based compilation, multiple build profiles, and seamless CI/CD integration.

**Next**: Lecture 3 covers OTA updates.
