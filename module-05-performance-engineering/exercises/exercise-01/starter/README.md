# Virtual List - Starter Code

This is the starter code for Module 5 Exercise 1: Build a Custom Virtualization Library.

## Getting Started

```bash
npm install
npm run dev
```

## Your Task

Build a production-grade virtualization library that efficiently renders massive lists (10,000+ items) by only rendering visible items in the viewport.

### Files to Complete

1. **`src/useVirtualizer.ts`** - Core virtualization hook
   - Calculate item positions
   - Find visible range with binary search
   - Return virtual items array

2. **`src/VirtualList.tsx`** - Main component
   - Handle scroll events with RAF
   - Render only visible items
   - Support fixed and function-based item heights

3. **`src/VariableList.tsx`** - Variable height support
   - Measure item heights with ResizeObserver
   - Update positions as heights change

### Performance Goals

- Initial render: < 50ms for 10,000 items
- Scroll performance: Consistent 60 FPS
- Memory usage: < 50MB for 10,000 items
- DOM nodes: < 20 at any time

### Tips

1. Use `requestAnimationFrame` for scroll handling
2. Use `useMemo` for expensive calculations
3. Use binary search for O(log n) visible range lookup
4. Use absolute positioning for items
5. Add overscan to prevent white flashes

See the main [README.md](../README.md) for detailed acceptance criteria.

Good luck! 🚀
