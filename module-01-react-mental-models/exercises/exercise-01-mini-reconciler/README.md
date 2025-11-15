# Exercise 1: Build a Mini Reconciler

## 🎯 Goal

Build a simplified version of React's reconciliation algorithm to deeply understand how React efficiently updates the DOM.

## 📚 Prerequisites

- Complete Lecture 1 (Reconciliation Deep Dive)
- Understanding of DOM APIs
- Basic knowledge of algorithms

## 🎓 Learning Objectives

By completing this exercise, you will:

✅ Understand how React diffs element trees
✅ Learn why keys are critical for list reconciliation
✅ Implement a basic diffing algorithm
✅ See the performance implications of different strategies

## 📝 Task Description

Implement a `reconcile()` function that:

1. Takes two element trees (previous and next)
2. Determines the minimal set of DOM operations needed
3. Applies those operations to update the real DOM
4. Handles:
   - Element type changes (unmount/remount)
   - Prop changes (update)
   - Children reconciliation (with keys)
   - Text node updates

## 🏗️ Starter Code

See [./starter](./starter) for:
- `index.html` - Test harness
- `reconciler.ts` - Your implementation goes here
- `types.ts` - Type definitions
- `test.ts` - Test cases

## ✅ Acceptance Criteria

Your reconciler must:

1. **Handle element type changes**
   ```js
   reconcile(<div />, <span />)
   // Should: Remove div, create span
   ```

2. **Update props efficiently**
   ```js
   reconcile(
     <div className="old" />,
     <div className="new" />
   )
   // Should: Update className only, keep same DOM node
   ```

3. **Reconcile children with keys**
   ```js
   reconcile(
     <ul>{[<li key="a">A</li>, <li key="b">B</li>]}</ul>,
     <ul>{[<li key="b">B</li>, <li key="a">A</li>]}</ul>
   )
   // Should: Reorder existing nodes, not recreate
   ```

4. **Handle text nodes**
   ```js
   reconcile(<div>Old text</div>, <div>New text</div>)
   // Should: Update text content only
   ```

5. **Pass all test cases**
   - Run `npm test` to verify

## 🚀 Getting Started

```bash
cd starter
npm install
npm run dev  # Start development server
npm test     # Run tests
```

## 💡 Hints

1. **Start simple**: Handle element type changes first, then props, then children
2. **Keys are crucial**: Use a Map to track elements by key
3. **DOM operations**:
   - `document.createElement(type)`
   - `node.appendChild(child)`
   - `node.removeChild(child)`
   - `node.replaceChild(newChild, oldChild)`
   - `node.setAttribute(name, value)`
4. **Think recursively**: Children are elements too

## 🎯 Stretch Goals

Once you've completed the basic requirements:

1. **Performance tracking**: Count DOM operations, minimize them
2. **Fragment support**: Handle `<>...</>` (array children)
3. **Event handlers**: Support `onClick` props
4. **Lifecycle hooks**: Call `onMount`/`onUnmount` callbacks
5. **Component functions**: Support functional components

## 📖 Reference Solution

See [./solution](./solution) for a complete, commented implementation.

**Important**: Try to complete the exercise on your own first! The solution includes detailed commentary explaining the tradeoffs and decisions.

## 🔍 Debugging Tips

1. **Log operations**: Console.log each DOM operation to see what's happening
2. **Visualize trees**: Print element trees before/after reconciliation
3. **Step through**: Use browser debugger to step through your algorithm
4. **Compare to React**: Use React DevTools to see how React reconciles the same trees

## ⏱️ Time Estimate

- **Core implementation**: 2-3 hours
- **All tests passing**: 3-4 hours
- **Stretch goals**: +2-3 hours

## 🎓 What You'll Learn

This exercise demonstrates:
- Why React's reconciliation is O(n) not O(n³)
- Why keys matter for list performance
- Why changing element types is expensive
- How React minimizes DOM mutations
- The tradeoffs between accuracy and performance

---

**Next**: After completing this exercise, move on to [Exercise 2: Concurrent UI](../exercise-02-concurrent-ui) to explore React's concurrent features.
