# Lecture 4: JSI (JavaScript Interface)

## Introduction

JSI is the foundation of React Native's new architecture. It enables direct, synchronous communication between JavaScript and native code without serialization.

## What is JSI?

JSI (JavaScript Interface) is a C++ API that allows:
- Direct JavaScript to C++ calls
- C++ to JavaScript calls  
- Shared memory between JS and native
- No JSON serialization
- Synchronous execution

## JSI Architecture

```
┌──────────────────┐
│   JavaScript     │
│   (Hermes/JSC)   │
└────────┬─────────┘
         │ JSI API
┌────────▼─────────┐
│   C++ Layer      │
│  (Host Objects)  │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Native Platform │
│  (iOS/Android)   │
└──────────────────┘
```

## Host Objects

Host Objects are C++ objects exposed to JavaScript via JSI:

```cpp
// C++: Define host object
class CalculatorHostObject : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    auto propName = name.utf8(rt);

    if (propName == "add") {
      return jsi::Function::createFromHostFunction(
        rt,
        name,
        2, // argument count
        [](jsi::Runtime& runtime,
           const jsi::Value&,
           const jsi::Value* args,
           size_t count) -> jsi::Value {
          double a = args[0].asNumber();
          double b = args[1].asNumber();
          return jsi::Value(a + b); // Synchronous!
        }
      );
    }

    return jsi::Value::undefined();
  }
};

// Expose to JavaScript
auto calc = std::make_shared<CalculatorHostObject>();
rt.global().setProperty(
  rt,
  "calculator",
  jsi::Object::createFromHostObject(rt, calc)
);
```

```typescript
// JavaScript: Use it
const result = global.calculator.add(5, 3)
console.log(result) // 8 - immediately!
```

## Shared ArrayBuffers

JSI enables zero-copy data sharing:

```cpp
// C++: Create shared buffer
auto buffer = std::make_shared<std::vector<uint8_t>>(1024);

jsi::ArrayBuffer arrayBuffer(
  rt,
  jsi::ArrayBuffer::fromSharedArrayBuffer(rt, buffer)
);

rt.global().setProperty(rt, "sharedBuffer", arrayBuffer);
```

```typescript
// JavaScript: Access same memory
const data = new Uint8Array(global.sharedBuffer)
data[0] = 42 // Writes to C++ buffer directly!

// No copying, instant updates
```

## Real-World Examples

### Image Processing

```cpp
// C++: Process image in native code
class ImageProcessor : public jsi::HostObject {
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    if (name.utf8(rt) == "applyFilter") {
      return jsi::Function::createFromHostFunction(
        rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value&, 
           const jsi::Value* args, size_t) -> jsi::Value {
          // Get image data (shared buffer)
          auto imageData = args[0].asObject(rt).getArrayBuffer(rt);
          uint8_t* pixels = imageData.data(rt);

          // Process pixels in C++ (fast!)
          for (size_t i = 0; i < imageData.size(rt); i += 4) {
            pixels[i] = 255 - pixels[i]; // Invert colors
          }

          return jsi::Value::undefined();
        }
      );
    }
  }
};
```

```typescript
// JavaScript: Zero-copy image processing
const imageData = new Uint8Array(width * height * 4)
global.imageProcessor.applyFilter(imageData.buffer)
// Image processed in C++, no copying!
```

### Audio Processing

```cpp
class AudioProcessor : public jsi::HostObject {
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    if (name.utf8(rt) == "process") {
      return jsi::Function::createFromHostFunction(
        rt, name, 1,
        [this](jsi::Runtime& rt, const jsi::Value&,
               const jsi::Value* args, size_t) -> jsi::Value {
          auto samples = args[0].asObject(rt).getArrayBuffer(rt);
          float* audioData = reinterpret_cast<float*>(samples.data(rt));
          size_t sampleCount = samples.size(rt) / sizeof(float);

          // Apply audio effects in C++ (real-time!)
          for (size_t i = 0; i < sampleCount; i++) {
            audioData[i] *= 0.5; // Reduce volume
          }

          return jsi::Value::undefined();
        }
      );
    }
  }
};
```

## Performance Benefits

```
Old Bridge:
JS → Serialize → Queue → Native → Process → Serialize → Queue → JS
Time: 50-100ms

JSI:
JS → C++ → Process → Return
Time: <1ms (100x faster!)
```

## Summary

**JSI Enables**:
- Synchronous native calls
- Zero-copy data sharing
- Direct memory access
- No serialization overhead
- Type-safe communication

**Use Cases**:
- Real-time audio/video processing
- Game engines
- Cryptography
- Image manipulation
- Performance-critical code

**Next**: Lecture 5 covers industry case studies using these technologies.
