# Lecture 2: EAS Build - Cloud Native App Compilation

## Introduction

Building native apps has traditionally been painful. iOS builds require a Mac running Xcode. Android builds need Android Studio, Java SDK, and Gradle configured correctly. Managing certificates, provisioning profiles, and keystores is error-prone. CI/CD setup requires maintaining build machines and dealing with platform-specific quirks.

EAS (Expo Application Services) Build solves this by providing cloud-based compilation for iOS and Android apps. No Mac required. No local Android SDK. No certificate management headaches. Just push code, configure builds, and get production-ready binaries.

**Why does this matter?** Developer productivity. A traditional native build setup takes days to configure and maintain. EAS Build works in minutes. Teams can build iOS apps from Windows or Linux. CI/CD integrates with a single command. Certificates and signing are managed automatically.

This lecture covers EAS Build's architecture, build profiles, credentials management, native configuration with config plugins, CI/CD integration, and production deployment workflows. You'll learn how to build, sign, and ship production apps without owning a Mac or managing build infrastructure.

## The Problem: Traditional Native Build Complexity

### iOS Build Requirements (Old Way)

```bash
# Requirements for iOS builds:
# 1. Mac hardware ($1,000+ cost)
# 2. Xcode (50GB download, macOS-only)
# 3. Apple Developer Account ($99/year)
# 4. Certificates and provisioning profiles
# 5. Fastlane or manual Xcode configuration
# 6. Code signing headaches

# Traditional iOS build process:
xcodebuild \
  -workspace ios/MyApp.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -archivePath build/MyApp.xcarchive \
  archive

xcodebuild \
  -exportArchive \
  -archivePath build/MyApp.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist

# Result: 30+ minutes, constant certificate issues, Mac required
```

**Problems**:
- Mac hardware required ($1,000-$3,000)
- Xcode updates break builds regularly
- Certificate/provisioning profile management is confusing
- Team sharing credentials is insecure
- CI/CD needs dedicated Mac build machines ($$$)

### Android Build Requirements (Old Way)

```bash
# Requirements for Android builds:
# 1. Android SDK (10GB+)
# 2. Java JDK (specific version matching React Native)
# 3. Gradle (version conflicts common)
# 4. Keystore management
# 5. Environment variables (ANDROID_HOME, JAVA_HOME)

# Traditional Android build:
cd android
./gradlew assembleRelease

# Common errors:
# - "SDK location not found"
# - "Unsupported Gradle version"
# - "Java version mismatch"
# - "Keystore password incorrect"
# - Build takes 10-20 minutes
```

**Problems**:
- SDK version fragmentation
- Gradle dependency hell
- Keystore management (easy to lose keys = can't update app!)
- Different results on different machines
- Slow builds (no caching between machines)

### EAS Build Solution

```bash
# EAS Build - works from any OS
eas build --platform all

# That's it! EAS handles:
# - iOS compilation (no Mac needed)
# - Android compilation (no SDK needed)
# - Certificate/keystore management
# - Code signing
# - Build caching (fast subsequent builds)
# - Artifact storage
```

**Benefits**:
- Build from Windows, Linux, or Mac
- No local SDKs or Xcode required
- Automatic certificate management
- Reproducible builds (same output every time)
- Fast builds with cloud caching
- Integrated with EAS Submit for app store deployment

## EAS Build Architecture

```
┌─────────────────────────────────────────────────┐
│           Your Development Machine              │
│         (Windows, Linux, or Mac)                │
│                                                 │
│  eas build --platform all                       │
└─────────────────┬───────────────────────────────┘
                  │ Upload source code
                  │ + eas.json config
                  ▼
┌─────────────────────────────────────────────────┐
│            EAS Build Cloud                      │
│                                                 │
│  ┌──────────────┐        ┌──────────────┐      │
│  │ iOS Builder  │        │Android Builder│     │
│  │ (macOS VM)   │        │ (Linux VM)    │     │
│  │              │        │               │     │
│  │ - Xcode      │        │ - Android SDK │     │
│  │ - CocoaPods  │        │ - Gradle      │     │
│  │ - Fastlane   │        │ - Java        │     │
│  └──────┬───────┘        └───────┬───────┘     │
│         │                        │             │
│         ├─ Fetch certificates    │             │
│         ├─ Install dependencies  ├─ Fetch      │
│         ├─ Run native build      │   keystore  │
│         ├─ Sign binary           ├─ Build APK  │
│         └─ Upload .ipa           └─ Upload     │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │ Download built artifacts
                  ▼
┌─────────────────────────────────────────────────┐
│         Built Binaries (signed & ready)         │
│  - MyApp.ipa (iOS)                              │
│  - MyApp.apk or .aab (Android)                  │
└─────────────────────────────────────────────────┘
```

## Getting Started with EAS Build

### Installation and Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version

# Login to your Expo account
eas login

# Navigate to your Expo project
cd my-expo-app

# Initialize EAS in your project
eas build:configure
```

**What `eas build:configure` does**:
1. Creates `eas.json` configuration file
2. Generates default build profiles
3. Prompts for platform configuration
4. Sets up credentials (certificates/keystores)

### Initial eas.json Configuration

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
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
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890"
      },
      "android": {
        "serviceAccountKeyPath": "./android-service-account.json",
        "track": "production"
      }
    }
  }
}
```

## Build Profiles Deep Dive

Build profiles define different build configurations for different purposes.

### Development Profile

**Purpose**: Fast iteration during development

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true,
        "buildConfiguration": "Debug"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**Key features**:
- `developmentClient: true` - Builds with Expo dev client (hot reload, debugging)
- `simulator: true` - iOS builds can run in simulator (faster, no device needed)
- `buildType: "apk"` - Android APK (faster than AAB)
- Fast builds (~5 minutes)

**Usage**:
```bash
eas build --profile development --platform ios
```

**When to use**:
- Testing on physical devices
- Debugging native modules
- QA testing

### Preview Profile

**Purpose**: Internal testing and stakeholder demos

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "ios": {
        "buildConfiguration": "Release",
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "API_URL": "https://staging-api.example.com"
      }
    }
  }
}
```

**Key features**:
- Production-like builds (Release configuration)
- Internal distribution (Ad Hoc for iOS, APK for Android)
- Staging environment configuration
- No app store submission

**Usage**:
```bash
eas build --profile preview --platform all
```

**When to use**:
- Beta testing
- Stakeholder demos
- Pre-production validation

### Production Profile

**Purpose**: App Store and Google Play submission

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "channel": "production",
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "API_URL": "https://api.example.com"
      }
    }
  }
}
```

**Key features**:
- `distribution: "store"` - App Store and Google Play
- `buildType: "app-bundle"` - Android AAB (required for Play Store)
- Production environment configuration
- Full optimizations enabled

**Usage**:
```bash
eas build --profile production --platform all
```

**When to use**:
- Production releases
- App store submissions
- Public distribution

## Advanced Build Configuration

### Platform-Specific Configuration

```json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "scheme": "MyApp",
        "autoIncrement": true,
        "image": "latest",
        "node": "18.17.0",
        "bundler": "1.0.0"
      },
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease",
        "image": "latest",
        "autoIncrement": "versionCode",
        "withoutCredentials": false
      }
    }
  }
}
```

**iOS-specific options**:
- `buildConfiguration` - Xcode build configuration
- `scheme` - Xcode scheme to build
- `autoIncrement` - Auto-increment build number
- `image` - Ubuntu version (affects Xcode version)
- `bundler` - CocoaPods bundler version

**Android-specific options**:
- `buildType` - `apk` or `app-bundle`
- `gradleCommand` - Custom Gradle command
- `autoIncrement` - Auto-increment `versionCode`

### Environment Variables

```json
{
  "build": {
    "production": {
      "env": {
        "API_URL": "https://api.example.com",
        "SENTRY_DSN": "https://abc@sentry.io/123",
        "GOOGLE_MAPS_API_KEY": "AIza..."
      }
    },
    "preview": {
      "env": {
        "API_URL": "https://staging-api.example.com",
        "SENTRY_DSN": "https://xyz@sentry.io/456"
      }
    }
  }
}
```

**Usage in code**:
```typescript
// Constants.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

// Automatically available during build
console.log(API_URL) // "https://api.example.com" in production
```

### Custom Native Code

```json
{
  "build": {
    "production": {
      "ios": {
        "config": "release.yml"
      },
      "android": {
        "config": "release.yml"
      }
    }
  }
}
```

```yaml
# release.yml - Custom build steps
build:
  name: Build with custom steps
  steps:
    - eas/checkout
    - eas/install_node_modules
    - run:
        name: Run custom script
        command: node scripts/pre-build.js
    - eas/pre_build
    - eas/run_gradlew
    - eas/post_build
```

## Credentials Management

EAS Build automatically manages signing certificates and keystores.

### iOS Credentials

**Automatic management (recommended)**:
```bash
# First build - EAS creates certificates
eas build --platform ios --profile production

# EAS will:
# 1. Generate Distribution Certificate
# 2. Generate Provisioning Profile
# 3. Store in Expo's secure servers
# 4. Auto-renew before expiration
```

**Manual management**:
```bash
# Use existing certificates
eas credentials

# Options:
# - Upload existing certificate (.p12)
# - Upload provisioning profile
# - Generate new credentials
# - Download credentials
```

**credentials.json** (for CI/CD):
```json
{
  "ios": {
    "provisioningProfilePath": "path/to/profile.mobileprovision",
    "distributionCertificate": {
      "path": "path/to/cert.p12",
      "password": "CERT_PASSWORD"
    }
  }
}
```

### Android Credentials

**Automatic keystore generation**:
```bash
# First build - EAS generates keystore
eas build --platform android --profile production

# EAS creates and stores:
# - Keystore file
# - Keystore password
# - Key alias
# - Key password
```

**Use existing keystore**:
```bash
# Upload existing keystore
eas credentials

# Select "Use existing keystore"
# Provide:
# - Keystore file (.jks or .keystore)
# - Keystore password
# - Key alias
# - Key password
```

**Important**: Never lose your Android keystore! If lost, you cannot update your app on Google Play.

## Config Plugins: Native Configuration Without Native Code

Config plugins configure native projects dynamically during build.

### Using Config Plugins

```json
// app.json
{
  "expo": {
    "name": "My App",
    "plugins": [
      // Camera permissions
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
        }
      ],

      // Location permissions
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
        }
      ],

      // Firebase
      "@react-native-firebase/app",

      // Custom font
      "expo-font"
    ]
  }
}
```

**What config plugins do**:
1. Modify `Info.plist` (iOS)
2. Modify `AndroidManifest.xml` (Android)
3. Add native dependencies
4. Configure permissions
5. All without writing native code!

### Custom Config Plugin

```typescript
// plugins/withCustomConfig.js
const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins')

function withCustomConfig(config) {
  // Modify iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.CFBundleURLTypes = [
      {
        CFBundleURLSchemes: ['myapp']
      }
    ]
    return config
  })

  // Modify Android Manifest
  config = withAndroidManifest(config, (config) => {
    const mainActivity = config.modResults.manifest.application[0].activity[0]

    mainActivity['android:launchMode'] = 'singleTask'

    return config
  })

  return config
}

module.exports = withCustomConfig
```

```json
// app.json - Use custom plugin
{
  "expo": {
    "plugins": [
      "./plugins/withCustomConfig"
    ]
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/eas-build.yml
name: EAS Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Build App
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive

      - name: Submit to App Stores
        if: github.ref == 'refs/heads/main'
        run: |
          eas submit --platform ios --latest --non-interactive
          eas submit --platform android --latest --non-interactive
```

**Setup secrets**:
```bash
# Get Expo token
eas login
eas whoami
expo token:create

# Add to GitHub Secrets:
# EXPO_TOKEN=<your-token>
```

### GitLab CI

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - build
  - submit

build:
  stage: build
  script:
    - npm ci
    - npm install -g eas-cli
    - eas build --platform all --profile production --non-interactive
  only:
    - main
  variables:
    EXPO_TOKEN: $EXPO_TOKEN

submit:
  stage: submit
  script:
    - npm install -g eas-cli
    - eas submit --platform all --latest --non-interactive
  only:
    - main
  when: manual
```

## Build Workflow: Development to Production

### 1. Development Builds

```bash
# Build for internal testing
eas build --profile development --platform ios

# Install on device via URL
# EAS provides installation URL after build completes
```

### 2. Preview Builds

```bash
# Create preview build for stakeholders
eas build --profile preview --platform all

# Share via URL or TestFlight/Internal Testing
```

### 3. Production Build

```bash
# Increment version
npm version patch # 1.0.0 -> 1.0.1

# Build for stores
eas build --profile production --platform all

# Wait for build completion
# Download artifacts or submit directly
```

### 4. Submit to App Stores

```bash
# Submit iOS to App Store Connect
eas submit --platform ios --latest

# Submit Android to Google Play
eas submit --platform android --latest
```

## Performance and Optimization

### Build Caching

EAS Build caches dependencies for faster subsequent builds:

**First build**:
- Install npm packages: 2 minutes
- Install CocoaPods (iOS): 3 minutes
- Build native code: 10 minutes
- **Total: ~15 minutes**

**Subsequent builds** (with caching):
- Restore cached dependencies: 30 seconds
- Build native code: 5 minutes
- **Total: ~6 minutes** (60% faster)

### Build Priority

```bash
# Normal priority (free tier)
eas build --platform ios
# Queue time: 5-30 minutes

# High priority (paid tier)
eas build --platform ios --priority high
# Queue time: 0-5 minutes
```

### Resource Classes

```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium" // More CPU/RAM
      },
      "android": {
        "resourceClass": "large" // Even more resources
      }
    }
  }
}
```

**Resource classes**:
- `default` - Standard (free tier)
- `m-medium` - 2x CPU, 2x RAM
- `large` - 4x CPU, 4x RAM (faster builds)

## Troubleshooting Common Issues

### Build Failed: Certificate Issues

```bash
# Clear credentials and regenerate
eas credentials

# Select "Remove credentials"
# Then rebuild - EAS will create new ones
eas build --platform ios --clear-cache
```

### Build Failed: Dependency Issues

```bash
# Clear npm cache
npm ci

# Clear build cache
eas build --platform all --clear-cache
```

### Android Build Failed: Gradle Issues

```json
// eas.json - Pin Gradle version
{
  "build": {
    "production": {
      "android": {
        "image": "ubuntu-20.04-jdk-11-ndk-r21e"
      }
    }
  }
}
```

## Cost and Pricing

**Free tier**:
- 30 builds/month (shared across iOS and Android)
- Standard build resources
- Normal priority queue

**Production tier** ($99/month):
- Unlimited builds
- High priority queue
- Faster resource classes
- Build concurrency

**Enterprise tier** (Custom pricing):
- Dedicated build machines
- On-premise options
- Custom SLAs

## Summary

**EAS Build transforms native app compilation**:
- **No Mac required**: Build iOS apps from any OS
- **No SDK setup**: Cloud handles all native tooling
- **Automatic credentials**: Certificates and keystores managed for you
- **Reproducible builds**: Same input = same output
- **Fast iteration**: Caching makes builds 60% faster
- **CI/CD ready**: One command integration

**Key features**:
- Build profiles (development, preview, production)
- Config plugins (native configuration without native code)
- Automatic credential management
- Environment variable support
- CI/CD integration (GitHub Actions, GitLab, etc.)
- Direct app store submission

**Production benefits**:
- 90% less build configuration effort
- No Mac hardware costs ($1,000-$3,000 saved)
- No build machine maintenance
- Faster developer onboarding (no SDK setup)
- Reliable builds (no "works on my machine")

**Real-world performance**:
- Setup time: 5 minutes (vs 1-2 days for native)
- Build time: 5-15 minutes (cached)
- Team onboarding: Instant (vs hours of SDK setup)

**Next lecture**: We'll explore EAS Update for over-the-air updates, allowing you to fix bugs and ship features without app store review.
