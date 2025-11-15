# Module 7: React Native Internals + New Architecture

## 🎯 Module Overview

Deep dive into React Native's new architecture (Fabric, TurboModules, JSI) and real-world use cases from industry leaders.

### Learning Objectives

✅ Understand Fabric renderer architecture
✅ Build custom TurboModules
✅ Master JSI (JavaScript Interface)
✅ Learn from industry case studies (Amazon, Microsoft, Shopify, Discord, Bloomberg)
✅ Optimize React Native performance

### Time Estimate: 10-14 hours

---

## 📚 Key Topics

### 1. React Native Architecture Evolution
- Old architecture (Bridge)
- New architecture (Bridgeless)
- Why the change was necessary
- Migration path

### 2. Fabric Renderer
- Synchronous vs asynchronous rendering
- Shadow tree and UI thread
- C++ core and platform views
- Performance improvements

### 3. TurboModules
- Native module system
- TypeScript codegen
- Creating custom TurboModules
- Migration from legacy modules

### 4. JSI (JavaScript Interface)
- Direct JS-to-Native binding
- Eliminating the bridge
- Synchronous native calls
- Host objects

### 5. Industry Case Studies

**Amazon Kindle**:
- Cross-platform reading UI
- Performance for text rendering
- Offline-first architecture

**Microsoft (Windows)**:
- React Native for Windows
- Desktop patterns
- Integration with native Windows APIs

**Shopify**:
- Mobile commerce at scale
- Performance optimization
- Point of Sale app architecture

**Discord**:
- Real-time messaging
- Native audio/video integration
- List performance (thousands of messages)

**Bloomberg Terminal**:
- Financial data visualization
- Native performance requirements
- Complex UI components

---

## 🛠️ Exercises

### Exercise 1: Build a Custom TurboModule

Create a native module using TurboModules:

```tsx
// NativeCalculator.ts (Spec)
import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
  multiply(a: number, b: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Calculator');
```

**Implement native side**:
- iOS (Objective-C++ or Swift)
- Android (Kotlin/Java)

**Time**: 4-5 hours

---

### Exercise 2: Fabric Native Component

Build a custom Fabric component:

```tsx
// High-performance chart component in native code
import { requireNativeComponent } from 'react-native';

interface ChartProps {
  data: number[];
  animated: boolean;
  onDataPointPress: (index: number) => void;
}

const NativeChart = requireNativeComponent<ChartProps>('RNChart');
```

**Time**: 5-6 hours

---

## 🎯 Performance Patterns

### Pattern 1: FlatList Optimization

```tsx
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  // Performance props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={5}
  // Memoize render function
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Pattern 2: JSI for Performance-Critical Code

```tsx
// Native module with JSI
global.factorial = (n: number): number => {
  // Implemented in C++ via JSI
  // Synchronous, no bridge overhead
  return nativeFactorial(n);
};

// Usage - synchronous and fast!
const result = factorial(1000);
```

---

## 🔜 Next: [Module 8: Expo Deep Dive](../module-08-expo-deep-dive)
