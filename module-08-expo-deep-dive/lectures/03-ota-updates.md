# Lecture 3: OTA Updates Strategy

## Introduction

OTA (Over-The-Air) updates let you push JavaScript and asset updates instantly without app store approval.

## EAS Update

```bash
# Install
npm install expo-updates

# Configure
eas update:configure

# Publish update
eas update --branch production --message "Fix login bug"
```

## Update Channels

```json
// eas.json
{
  "build": {
    "production": {
      "channel": "production"
    },
    "staging": {
      "channel": "staging"
    }
  }
}
```

## Checking for Updates

```typescript
import * as Updates from 'expo-updates'

async function checkForUpdates() {
  const update = await Updates.checkForUpdateAsync()

  if (update.isAvailable) {
    await Updates.fetchUpdateAsync()
    await Updates.reloadAsync()
  }
}

// Auto-check on app launch
useEffect(() => {
  checkForUpdates()
}, [])
```

## Rollback Strategy

```typescript
// Gradual rollout
eas update --branch production --message "New feature" --rollout 10%

// Monitor metrics, then increase
eas update:republish --rollout 50%

// Full rollout
eas update:republish --rollout 100%

// Rollback if issues
eas update:rollback
```

## Summary

EAS Update enables instant updates, gradual rollouts, and easy rollbacks for JavaScript changes.

**Next**: Lecture 4 covers native modules with Expo.
