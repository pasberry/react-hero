# Module 1: Modern React Mental Models (The "Jedi Mindset")

## 🎯 Module Overview

This module establishes the foundational mental models needed to truly master React. You'll learn how React works **under the hood**, not just how to use it. This is the difference between a React user and a React expert.

### Learning Objectives

By the end of this module, you will:

✅ Understand React's reconciliation algorithm at a deep level
✅ Comprehend the fiber architecture and how it enables concurrent rendering
✅ Master the concept of lanes and priority-based scheduling
✅ Understand how React Server Components (RSC) fundamentally change the paradigm
✅ Learn how Meta scales React to billions of users
✅ Build intuition for performance implications of different patterns

### Time Estimate

- **Lectures**: 4-6 hours
- **Exercises**: 6-8 hours
- **Total**: 10-14 hours

---

## 📚 Lectures

### [1. React Rendering Pipeline: Reconciliation Deep Dive](./lectures/01-reconciliation-deep-dive.md)
Learn how React transforms your component tree into DOM operations, the virtual DOM myth, and how reconciliation actually works.

**Key Concepts**: Virtual DOM, Diffing Algorithm, Keys, Reconciliation

---

### [2. Fiber Architecture: React's Secret Weapon](./lectures/02-fiber-architecture.md)
Understand React's internal data structure that powers incremental rendering and enables all concurrent features.

**Key Concepts**: Fiber Nodes, Work Loop, Double Buffering, Commit Phase

---

### [3. Concurrent React: Scheduling and Lanes](./lectures/03-concurrent-rendering.md)
Deep dive into concurrent rendering, how React schedules work, and the lane-based priority system.

**Key Concepts**: Concurrent Rendering, useTransition, useDeferredValue, Lanes, Time Slicing

---

### [4. React Server Components: A New Paradigm](./lectures/04-rsc-philosophy.md)
Understand the fundamental shift that RSC represents and why it's not just "server-side rendering".

**Key Concepts**: Server vs Client Components, Flight Protocol, Streaming, Serialization Boundary

---

### [5. React at Meta Scale](./lectures/05-react-at-meta.md)
Learn how Meta's engineering teams use React to build products serving billions, including performance patterns and architectural decisions.

**Key Concepts**: Code Splitting, Relay, Recoil, React Native integration

---

## 🛠️ Exercises

### [Exercise 1: Build a Mini Reconciler](./exercises/exercise-01-mini-reconciler)

Build a simplified version of React's reconciliation algorithm to deeply understand how React updates the DOM efficiently.

**Difficulty**: Advanced
**Time**: 3-4 hours

**Skills**: Reconciliation, Diffing, DOM manipulation

---

### [Exercise 2: Concurrent UI with Transitions](./exercises/exercise-02-concurrent-ui)

Build a search interface that demonstrates the power of concurrent rendering using `useTransition` and `useDeferredValue`.

**Difficulty**: Intermediate-Advanced
**Time**: 2-3 hours

**Skills**: Concurrent features, Performance optimization, User experience

---

## 🚀 Projects

### Project: Fiber Visualizer

Build a tool that visualizes React's fiber tree in real-time, showing how React schedules and prioritizes work.

**See**: [./projects/fiber-visualizer](./projects/fiber-visualizer)

---

## 📖 Recommended Reading

- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture) by Andrew Clark
- [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) by Dan Abramov
- [Inside Fiber: in-depth overview of the new reconciliation algorithm](https://angularindepth.com/posts/1008/inside-fiber-in-depth-overview-of-the-new-reconciliation-algorithm-in-react)
- [React 18 Working Group Discussions](https://github.com/reactwg/react-18/discussions)

---

## ✅ Module Completion Checklist

- [ ] Read all lectures
- [ ] Complete Exercise 1: Mini Reconciler
- [ ] Complete Exercise 2: Concurrent UI
- [ ] Build the Fiber Visualizer project (optional but recommended)
- [ ] Can explain reconciliation to a colleague
- [ ] Can explain when to use concurrent features
- [ ] Understand the RSC paradigm shift

---

## 🔜 Next Module

Once you've completed this module, proceed to [Module 2: TypeScript for React Architecture](../module-02-typescript-architecture) to learn how to build robust, type-safe React applications.

---

**Note**: This module is theory-heavy but essential. The mental models you build here will pay dividends throughout the rest of the course.
