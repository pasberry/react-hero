# Lecture 1: React Native New Architecture

## The Old Bridge

**Problems**:
- Asynchronous communication (JSON serialization)
- Bridge bottleneck
- No synchronous access to native  

## The New Architecture

**Components**:
1. **JSI** (JavaScript Interface) - Direct JS ↔ Native binding
2. **Fabric** - New rendering system
3. **TurboModules** - New native modules system

## JSI Benefits

```javascript
// Old: Async bridge
NativeModules.DeviceInfo.getBatteryLevel(
  (level) => console.log(level)
)

// New: Synchronous JSI
const level = global.getBatteryLevel() // Instant!
```

## Fabric Renderer

**Improvements**:
- Synchronous layout calculation
- Type-safe communication
- Better priority-based rendering

## TurboModules

```typescript
// Lazy loading - only load when used
import { TurboModuleRegistry } from 'react-native'

const Calculator = TurboModuleRegistry.get('Calculator')
const result = Calculator.add(2, 3) // Synchronous!
```

## Migration Path

1. Enable New Architecture flag
2. Test your app thoroughly
3. Update third-party dependencies
4. Migrate custom native modules

## Summary

The New Architecture makes React Native significantly faster and more capable.
