# Lecture 3: EAS Update - Over-the-Air Updates Strategy

## Introduction

Shipping bug fixes and features through the app stores is painfully slow. Apple's App Store review takes 1-3 days. Google Play takes 1-2 days. If you discover a critical bug in production, your users are stuck with it for days. If you want to A/B test a new feature, you need to publish multiple builds and wait weeks for reviews.

EAS Update solves this by enabling over-the-air (OTA) updates for JavaScript code and assets. Fix bugs instantly. Deploy features without review. Roll out gradually to test stability. Rollback immediately if issues arise. All without touching native code or waiting for app store approval.

**Why does this matter?** Speed and reliability. CodePush (Microsoft's OTA solution) powers apps like Discord, Zillow, and Bloomberg, serving billions of updates. EAS Update brings the same capability with better developer experience, tighter Expo integration, and modern architecture.

This lecture covers EAS Update's architecture, update strategies, channel management, gradual rollouts, A/B testing, rollback mechanisms, and production deployment patterns. You'll learn how to ship updates confidently while maintaining app stability.

## The Problem: App Store Review Delays

### The Pain of Traditional Releases

**Scenario**: You discover a critical login bug affecting 20% of users.

**Traditional app store process**:
1. Fix bug in code (30 minutes)
2. Build new binary (20 minutes)
3. Upload to App Store Connect (10 minutes)
4. Wait for Apple review (24-72 hours) ⏰
5. Users update app (3-7 days for 80% adoption) ⏰

**Total time to fix**: 4-10 days

**With EAS Update**:
1. Fix bug in code (30 minutes)
2. Publish update: `eas update --branch production` (2 minutes)
3. Users get update on next app launch (immediate - hours)

**Total time to fix**: 1-4 hours (100x faster!)

### What Can Be Updated OTA?

**✅ Can update via OTA**:
- JavaScript code (all React components, business logic)
- Assets (images, fonts, JSON data files)
- App.js and most app.json configuration
- Third-party JavaScript libraries

**❌ Cannot update via OTA (requires native build)**:
- Native code (iOS/Android)
- Native dependencies (new npm packages with native modules)
- app.json configuration affecting native projects (permissions, schemes)
- App icon, splash screen
- SDK version changes

**Why the limitation?** App stores allow updating the JavaScript bundle and assets because they're interpreted at runtime. Native code is compiled into the binary, which app stores review. Changing compiled code requires a new binary and review.

## EAS Update Architecture

```
┌─────────────────────────────────────────────────┐
│           Developer Machine                     │
│                                                 │
│   eas update --branch production                │
│   ├─ Bundle JavaScript                          │
│   ├─ Upload assets                              │
│   └─ Create manifest                            │
└─────────────────┬───────────────────────────────┘
                  │ Upload bundle + manifest
                  ▼
┌─────────────────────────────────────────────────┐
│         EAS Update Server (CDN)                 │
│                                                 │
│  ┌──────────────┐      ┌──────────────┐        │
│  │  production  │      │   staging    │        │
│  │   channel    │      │   channel    │        │
│  │              │      │              │        │
│  │ - update 123 │      │ - update 456 │        │
│  │ - update 124 │      │ - update 457 │        │
│  └──────────────┘      └──────────────┘        │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │ Download update manifest
                  │ + JavaScript bundle
                  ▼
┌─────────────────────────────────────────────────┐
│         User's Device (iOS/Android)             │
│                                                 │
│  App Launch:                                    │
│  1. Check for update (manifest request)         │
│  2. Download if available (bundle + assets)     │
│  3. Apply on next restart/reload                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Update Manifest

Each update has a manifest describing what changed:

```json
{
  "id": "abc123-update-id",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "runtimeVersion": "1.0.0",
  "launchAsset": {
    "hash": "def456",
    "key": "bundles/ios-abc123.bundle",
    "contentType": "application/javascript",
    "url": "https://u.expo.dev/..."
  },
  "assets": [
    {
      "hash": "ghi789",
      "key": "assets/logo.png",
      "contentType": "image/png",
      "url": "https://u.expo.dev/..."
    }
  ],
  "metadata": {
    "branchName": "production",
    "message": "Fix login bug"
  }
}
```

## Getting Started with EAS Update

### Installation

```bash
# Install expo-updates package
npx expo install expo-updates

# Configure EAS Update
eas update:configure
```

**What `eas update:configure` does**:
1. Adds `expo-updates` to package.json
2. Configures `app.json` with update URL
3. Sets up update channels in `eas.json`
4. Generates runtime version

### Configuration

```json
// app.json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "version": "1.0.0",
    "runtimeVersion": {
      "policy": "sdkVersion" // or "appVersion" or custom
    },
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "enabled": true,
      "checkAutomatically": "ON_LOAD", // or "ON_ERROR_RECOVERY"
      "fallbackToCacheTimeout": 3000
    }
  }
}
```

### Runtime Versions

**Critical concept**: OTA updates must match the native binary's `runtimeVersion`.

```json
// Option 1: Tied to SDK version (safest)
{
  "runtimeVersion": {
    "policy": "sdkVersion" // "1.0.0" matches SDK 49.0.0
  }
}

// Option 2: Tied to app version
{
  "runtimeVersion": {
    "policy": "appVersion" // Uses "1.0.0" from version field
  }
}

// Option 3: Custom (full control)
{
  "runtimeVersion": "1.0.0" // Manually managed
}
```

**Why it matters**:
```
Native Binary (runtimeVersion: "1.0.0")
  ✅ Can load update with runtimeVersion: "1.0.0"
  ❌ Cannot load update with runtimeVersion: "1.1.0"
```

## Update Channels and Branches

Channels link builds to update branches, enabling environment-specific deployments.

### Channel Configuration

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "distribution": "store",
      "channel": "production"
    }
  }
}
```

**How it works**:
1. Build app with channel: `eas build --profile production`
2. App embeds channel name: `production`
3. Publish update to channel: `eas update --branch production`
4. App fetches updates from its channel

### Multiple Environments

```bash
# Development updates (internal testing)
eas update --branch development --message "Test new login flow"

# Staging updates (QA testing)
eas update --branch staging --message "Pre-release testing"

# Production updates (public users)
eas update --branch production --message "Fix critical bug"
```

**Result**: Same codebase, different branches for different environments.

## Publishing Updates

### Basic Publish

```bash
# Publish to production
eas update --branch production --message "Fix login bug"

# What happens:
# 1. Bundles JavaScript for iOS and Android
# 2. Uploads assets (images, fonts, etc.)
# 3. Creates manifest
# 4. Publishes to "production" branch
# 5. Users on "production" channel get update
```

### Platform-Specific Updates

```bash
# iOS only
eas update --branch production --platform ios

# Android only
eas update --branch production --platform android

# Both (default)
eas update --branch production --platform all
```

### Message and Metadata

```bash
# Descriptive message
eas update --branch production --message "Fix: Login button not responsive on Android"

# View update history
eas update:list --branch production

# Output:
# ID       Created              Message                    Runtime
# abc123   2024-01-15 10:30:00  Fix: Login button...       1.0.0
# def456   2024-01-14 15:20:00  Add dark mode support      1.0.0
```

## Update Strategies

### Strategy 1: Automatic Updates (Default)

```typescript
// App.tsx - No code needed!
// Updates check automatically on app launch
export default function App() {
  return <NavigationContainer>{/* app */}</NavigationContainer>
}
```

**Configuration**:
```json
// app.json
{
  "expo": {
    "updates": {
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 3000
    }
  }
}
```

**Behavior**:
1. User opens app
2. App checks for update (3 second timeout)
3. If update found, downloads in background
4. Applies on next app restart

**Pros**: Zero code, works for most apps
**Cons**: Update not immediate (requires restart)

### Strategy 2: Manual Update Check

```typescript
// UpdateButton.tsx - Give users control
import * as Updates from 'expo-updates'
import { useState } from 'react'

export function UpdateButton() {
  const [checking, setChecking] = useState(false)

  async function checkForUpdates() {
    try {
      setChecking(true)

      // Check if update available
      const update = await Updates.checkForUpdateAsync()

      if (update.isAvailable) {
        // Download update
        await Updates.fetchUpdateAsync()

        // Prompt user to restart
        Alert.alert(
          'Update Available',
          'A new version is ready. Restart to apply?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart Now', onPress: () => Updates.reloadAsync() }
          ]
        )
      } else {
        Alert.alert('No Updates', 'You are on the latest version')
      }
    } catch (error) {
      console.error('Update check failed:', error)
      Alert.alert('Error', 'Failed to check for updates')
    } finally {
      setChecking(false)
    }
  }

  return (
    <Button
      title={checking ? 'Checking...' : 'Check for Updates'}
      onPress={checkForUpdates}
      disabled={checking}
    />
  )
}
```

**Pros**: User control, immediate feedback
**Cons**: Requires UI, users might ignore

### Strategy 3: Conditional Updates

```typescript
// ConditionalUpdates.ts - Smart update logic
import * as Updates from 'expo-updates'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function checkForUpdatesConditionally() {
  // Don't check too frequently
  const lastCheck = await AsyncStorage.getItem('last_update_check')
  const now = Date.now()

  if (lastCheck && now - parseInt(lastCheck) < 3600000) {
    // Checked within last hour, skip
    return
  }

  // Don't check on metered connections
  const connectionInfo = await NetInfo.fetch()
  if (connectionInfo.type === 'cellular' && !connectionInfo.isConnectionExpensive) {
    return // Save user's data
  }

  // Check for update
  const update = await Updates.checkForUpdateAsync()

  if (update.isAvailable) {
    // Download silently
    await Updates.fetchUpdateAsync()
    // Will apply on next restart
  }

  await AsyncStorage.setItem('last_update_check', now.toString())
}
```

### Strategy 4: Force Update for Critical Bugs

```typescript
// ForceUpdate.ts - Block app until updated
import * as Updates from 'expo-updates'

export function useForceUpdate() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    async function checkCriticalUpdate() {
      const update = await Updates.checkForUpdateAsync()

      if (update.isAvailable) {
        // Check if update is marked as critical (custom metadata)
        const manifest = update.manifest

        if (manifest?.metadata?.critical) {
          // Force update
          setBlocked(true)
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync() // Immediate reload
        }
      }
    }

    checkCriticalUpdate()
  }, [])

  if (blocked) {
    return (
      <View style={styles.blocked}>
        <ActivityIndicator size="large" />
        <Text>Updating app...</Text>
      </View>
    )
  }

  return null // Normal app
}
```

## Gradual Rollouts and A/B Testing

### Gradual Rollout

Roll out updates to increasing percentages of users:

```bash
# Step 1: Deploy to 10% of users
eas update --branch production --message "New checkout flow" --rollout 10

# Monitor crash rate, performance metrics for 24 hours

# Step 2: Increase to 50%
eas update:republish --rollout 50

# Monitor for another 24 hours

# Step 3: Full rollout
eas update:republish --rollout 100

# If issues arise at any point:
eas update:rollback
```

**How it works**:
- EAS Update uses device ID hash to determine if user gets update
- Same user always gets same rollout decision (consistent)
- Rollout percentage can only increase (can't go 50% → 10%)

### A/B Testing with Multiple Branches

```bash
# Create variant A (current experience)
eas update --branch production-control --message "Control: Blue button"

# Create variant B (new experience)
eas update --branch production-experiment --message "Experiment: Green button"

# Split traffic 50/50 at app level
```

```typescript
// App.tsx - Client-side A/B logic
import * as Updates from 'expo-updates'
import { useEffect, useState } from 'react'

function useABTest() {
  const [variant, setVariant] = useState<'control' | 'experiment'>('control')

  useEffect(() => {
    // Determine user's variant (stable hash of device ID)
    const deviceId = Updates.manifest?.id || ''
    const hash = simpleHash(deviceId)
    const assigned = hash % 2 === 0 ? 'control' : 'experiment'

    setVariant(assigned)

    // Point updates to appropriate branch
    Updates.setExtraParamSync('variant', assigned)
  }, [])

  return variant
}

export default function App() {
  const variant = useABTest()

  return (
    <Button
      title="Checkout"
      color={variant === 'experiment' ? 'green' : 'blue'}
    />
  )
}
```

## Rollback Strategies

### Automatic Rollback

```bash
# Publish update
eas update --branch production --message "New payment flow"

# Monitor error rate, crash analytics

# If crash rate spikes:
eas update:rollback --branch production

# All users revert to previous working version immediately
```

### Rollback to Specific Version

```bash
# View update history
eas update:list --branch production

# Output:
# ID       Created              Message
# abc123   2024-01-15 10:30:00  New payment flow (BROKEN)
# def456   2024-01-14 15:20:00  Fix login bug (WORKING)
# ghi789   2024-01-13 12:00:00  Add dark mode

# Rollback to specific update
eas update:rollback --branch production --group def456

# All users now get "def456" update
```

### Conditional Rollback

```typescript
// ErrorBoundary.tsx - Auto-rollback on critical errors
import * as Updates from 'expo-updates'
import { Component, ErrorInfo, ReactNode } from 'react'

class ErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false, errorCount: 0 }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const newCount = this.state.errorCount + 1

    if (newCount >= 3) {
      // Multiple errors in this session - likely bad update
      try {
        // Check if we can rollback
        const updateInfo = await Updates.checkForUpdateAsync()

        if (updateInfo.isAvailable) {
          // Rollback to previous version
          await Updates.fetchUpdateAsync()
          await Updates.reloadAsync()
        }
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError)
      }
    }

    this.setState({ errorCount: newCount })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }

    return this.props.children
  }
}
```

## Performance and Optimization

### Update Size Optimization

**Problem**: Large updates use user's data and take time to download.

**Solutions**:

```bash
# 1. Check bundle size before publishing
eas update --branch production --dry-run

# Output:
# Bundle size (iOS): 2.3 MB
# Bundle size (Android): 2.5 MB
# Assets: 1.2 MB (10 files)
# Total download: 3.7 MB

# 2. Optimize images
npm install sharp
# Compress images before bundling

# 3. Code splitting (lazy load routes)
const ProfileScreen = lazy(() => import('./screens/Profile'))

# 4. Remove unused dependencies
npm install depcheck
npx depcheck

# Before optimization: 3.7 MB
# After optimization: 1.8 MB (51% smaller!)
```

### Caching Strategy

```json
// app.json - Configure caching
{
  "expo": {
    "updates": {
      "fallbackToCacheTimeout": 3000, // Wait 3s for update
      "codeSigningCertificate": "./certs/certificate.pem", // Verify updates
      "codeSigningMetadata": {
        "keyid": "main",
        "alg": "rsa-v1_5-sha256"
      }
    }
  }
}
```

**Behavior**:
1. App launches, checks for update (3s timeout)
2. If update downloaded within 3s, uses new version
3. If not, uses cached version (app doesn't wait)
4. Update downloads in background, applies next launch

### Monitoring Update Adoption

```typescript
// Analytics.ts - Track update versions
import * as Updates from 'expo-updates'
import * as Analytics from './analytics'

export function trackUpdateVersion() {
  const updateId = Updates.manifest?.id
  const createdAt = Updates.manifest?.createdAt

  Analytics.logEvent('app_version', {
    update_id: updateId,
    update_published_at: createdAt,
    runtime_version: Updates.runtimeVersion
  })
}

// In App.tsx
useEffect(() => {
  trackUpdateVersion()
}, [])
```

**Analytics dashboard shows**:
- What % of users on latest update
- Update adoption curve
- Users stuck on old versions (network issues? app not restarted?)

## Production Workflow

### Step 1: Publish to Staging

```bash
# Publish to staging channel
eas update --branch staging --message "Test new feature"

# QA team tests on staging builds
# Verify: No crashes, expected behavior
```

### Step 2: Gradual Production Rollout

```bash
# Start with 10% rollout
eas update --branch production --message "New feature release" --rollout 10

# Monitor for 24 hours:
# - Crash rate (should be <1%)
# - Error rate (should not increase)
# - Performance metrics (should not degrade)
```

### Step 3: Increase Rollout

```bash
# No issues? Increase to 50%
eas update:republish --branch production --rollout 50

# Monitor for another 24 hours

# Still good? Full rollout
eas update:republish --branch production --rollout 100
```

### Step 4: Monitor and Respond

```bash
# If issues detected:
eas update:rollback --branch production

# Fix issue in code, restart from Step 1
```

## Best Practices

### 1. Always Test Before Publishing

```bash
# ❌ Don't: Publish directly to production
eas update --branch production

# ✅ Do: Test on staging first
eas update --branch staging
# Test thoroughly
eas update --branch production
```

### 2. Use Descriptive Messages

```bash
# ❌ Don't: Vague messages
eas update --branch production --message "fixes"

# ✅ Do: Specific messages
eas update --branch production --message "Fix: Checkout button crash on Android 12"
```

### 3. Start with Small Rollouts

```bash
# ❌ Don't: 100% rollout immediately
eas update --branch production --rollout 100

# ✅ Do: Gradual rollout
eas update --branch production --rollout 10
# Monitor, then increase
```

### 4. Monitor Key Metrics

```typescript
// Track before/after metrics
- Crash rate
- Error rate
- User engagement
- Performance (FPS, memory)
- Network requests success rate
```

### 5. Have Rollback Plan

```bash
# Always know how to rollback
eas update:rollback --branch production

# Keep previous version ID handy
eas update:list --branch production
```

## Common Pitfalls

### Pitfall 1: Breaking Changes in Updates

```typescript
// ❌ Don't: Change data structure without migration
// Old update: AsyncStorage stores { userId: 123 }
// New update: AsyncStorage expects { user: { id: 123 } }
await AsyncStorage.setItem('user', JSON.stringify({ user: { id: 123 } }))
// Breaks for users on old version!

// ✅ Do: Handle both formats
const userData = await AsyncStorage.getItem('user')
const parsed = JSON.parse(userData)

// Support both old and new format
const userId = parsed.userId || parsed.user?.id
```

### Pitfall 2: Updating Native Code via OTA

```bash
# ❌ Don't: Try to update native dependencies via OTA
npm install react-native-camera
eas update --branch production
# Won't work! Native code not included in OTA

# ✅ Do: Require new build for native changes
eas build --profile production --platform all
# Then submit to app stores
```

### Pitfall 3: Not Testing Runtime Version Compatibility

```json
// Binary with runtimeVersion: "1.0.0"
{
  "runtimeVersion": "1.0.0"
}

// Publishing update with "1.1.0"
eas update --branch production
// Users won't get update! Runtime version mismatch

// ✅ Ensure runtime versions match
```

## Summary

**EAS Update enables instant JavaScript updates**:
- **Fix bugs instantly**: 1-4 hours instead of 4-10 days
- **No app store review**: Updates bypass Apple/Google approval
- **Gradual rollouts**: Deploy to 10%, monitor, then 100%
- **Easy rollbacks**: Revert to previous version in seconds
- **A/B testing**: Test features with subset of users
- **Smaller downloads**: Only JavaScript + assets (~2MB vs 50MB native build)

**Key capabilities**:
- Update channels (development, staging, production)
- Runtime version compatibility
- Manual or automatic update strategies
- Gradual rollout percentages
- One-command rollbacks
- Update manifests and caching

**Production workflow**:
1. Test on staging channel
2. Publish to production with 10% rollout
3. Monitor crash rate and metrics for 24 hours
4. Increase to 50%, monitor again
5. Full rollout to 100%
6. Rollback immediately if issues arise

**Limitations to remember**:
- Cannot update native code (iOS/Android)
- Cannot update native dependencies
- Cannot change app icon or splash screen
- Requires matching runtime version

**Real-world impact**:
- Deployment speed: 100x faster (hours vs days)
- Bug fix time: Minutes instead of weeks
- User adoption: 80% in 24 hours (vs 7 days for app store)
- Rollback time: Seconds (vs impossible with app store)

**Next lecture**: We'll explore native modules with Expo, including config plugins for modifying native projects without writing native code, and creating custom modules when needed.
