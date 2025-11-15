# Lecture 1: React Profiler Deep Dive

## React DevTools Profiler

The Profiler measures how often and how long components render.

## Recording a Profile

1. Open React DevTools
2. Click Profiler tab
3. Click record button
4. Interact with your app
5. Stop recording

## Reading Flamegraphs

```
App (15.2ms)
├─ Header (1.1ms)
├─ Sidebar (2.3ms)
└─ Main (11.8ms)
   ├─ PostList (10.2ms) ← Expensive!
   └─ Footer (1.6ms)
```

## Programmatic Profiling

```typescript
import { Profiler } from 'react'

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log(\`\${id} took \${actualDuration}ms\`)
}

<Profiler id="PostList" onRender={onRenderCallback}>
  <PostList />
</Profiler>
```

## Performance Metrics

**Metrics to track**:
- Render duration
- Commit duration  
- Number of rerenders
- Render reason

## Chrome DevTools

```typescript
// Mark performance events
performance.mark('render-start')
// ... render logic
performance.mark('render-end')
performance.measure('render', 'render-start', 'render-end')
```

## Summary

Profiling is essential for identifying performance bottlenecks systematically.
