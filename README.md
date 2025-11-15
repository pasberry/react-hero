# ⚔️ React Jedi Mastery Course

A comprehensive, project-based training program designed to take senior engineers from intermediate React users to React/Next.js/React Native Jedi Masters.

## 🎯 Course Overview

This course is designed for experienced engineers (15+ years) who want expert-level mastery of the React ecosystem, including:

- **React Internals**: Reconciliation, fibers, concurrent rendering
- **Server Components (RSC)**: Architecture and advanced patterns
- **Next.js App Router**: Deep dive into modern Next.js
- **Vercel Deployment**: Edge runtimes, ISR, multi-region architecture
- **React Native**: New architecture (Fabric, JSI, TurboModules)
- **Expo**: EAS, OTA updates, cross-platform development
- **Cross-Platform Architecture**: Shared code between web and mobile

## 📚 Course Structure

### [Module 1: Modern React Mental Models](./module-01-react-mental-models)
Master the React rendering pipeline, concurrent rendering, and how Meta scales React.

**Key Topics**: Reconciliation, Fibers, Lanes, Concurrent Rendering, RSC Philosophy

**Projects**: Miniature reconciler, Concurrent UI with transitions

---

### [Module 2: TypeScript for React Architecture](./module-02-typescript-architecture)
Design robust component contracts and model complex UI state with TypeScript.

**Key Topics**: Component Contracts, Utility Types, State Machines, Typed Hooks

**Projects**: Fully typed form system, Complex UI state machine

---

### [Module 3: Next.js App Router + Server Components](./module-03-nextjs-app-router)
Advanced Next.js patterns including streaming, Suspense, and the Flight Protocol.

**Key Topics**: RSC Architecture, Server Actions, Streaming, Data Caching

**Projects**: Multi-tier dashboard, Infinite scroll feed with RSC

---

### [Module 4: Vercel Deployment Mastery](./module-04-vercel-deployment)
Production deployment strategies, edge runtime, and multi-region architecture.

**Key Topics**: Edge Runtime, ISR, Route Handlers, Cold Starts, Multi-Region

**Projects**: Region-aware routing, Edge functions, Vercel KV integration

---

### [Module 5: React Performance Engineering](./module-05-performance-engineering)
Deep performance optimization techniques and profiling strategies.

**Key Topics**: Rerender Optimization, Profiler, Windowing, Concurrent Features

**Projects**: Custom virtualization, Performance-optimized dashboard

---

### [Module 6: State Management at Scale](./module-06-state-management)
Modern state management patterns for large applications.

**Key Topics**: Context Pitfalls, Zustand, Jotai, RSC as State, Global State

**Projects**: Zustand store architecture, RSC-first state patterns

---

### [Module 7: React Native Internals + New Architecture](./module-07-react-native-internals)
Deep dive into React Native's new architecture and industry use cases.

**Key Topics**: Fabric, TurboModules, JSI, Bridgeless, Industry Case Studies

**Projects**: Custom TurboModule, Fabric-native component

---

### [Module 8: Expo Deep Dive](./module-08-expo-deep-dive)
Complete Expo ecosystem including Router, EAS, and OTA updates.

**Key Topics**: Expo Router, EAS Build, OTA Updates, Native Modules

**Projects**: Cross-platform Expo app, Native module integration

---

### [Module 9: Cross-Platform Architecture](./module-09-cross-platform)
Shared architecture patterns for web and mobile applications.

**Key Topics**: Monorepos, Shared UI, React Native Web, Server-Driven UI

**Projects**: Monorepo with Next.js + React Native + Shared Design System

---

### [Module 10: Capstone Project](./module-10-capstone)
Build a complete production multi-platform application.

**Deliverables**:
- Next.js web app (RSC, Server Actions, Edge runtime)
- React Native mobile app (Expo, shared components)
- Backend with auth and realtime features
- Full deployment on Vercel + EAS
- Performance monitoring and observability

---

## 🧍 Learner Profile

This course assumes you:
- Have 15+ years of engineering experience
- Write TypeScript/JavaScript professionally
- Use Next.js + Vercel (with or without AI assistance)
- Understand React fundamentals (components, hooks, props)
- Want true expert-level understanding of React internals

## 🚀 Getting Started

1. **Clone this repository**
   ```bash
   git clone <repo-url>
   cd react-hero
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start with Module 1**
   ```bash
   cd module-01-react-mental-models
   ```

4. **Follow the module README** for lectures, exercises, and projects

## 📖 How to Use This Course

Each module follows this structure:

```
module-XX-name/
├── README.md                 # Module overview and learning objectives
├── lectures/                 # Deep technical explanations
│   ├── 01-topic-one.md
│   ├── 02-topic-two.md
│   └── ...
├── exercises/                # Hands-on coding exercises
│   ├── exercise-01/
│   │   ├── README.md        # Exercise description & acceptance criteria
│   │   ├── starter/         # Starter code
│   │   └── solution/        # Complete solution with commentary
│   └── ...
└── projects/                 # Larger project work
    └── ...
```

### Learning Path

1. **Read the lectures** - Deep conceptual understanding
2. **Complete the exercises** - Hands-on practice
3. **Review the solutions** - Learn idiomatic patterns
4. **Build the projects** - Integrate knowledge

## 🏢 Industry Context

This course incorporates patterns and insights from companies including:

- **Meta**: React core team, React Native at scale
- **Vercel**: Next.js, Edge runtime, deployment architecture
- **Amazon**: Kindle UI with React Native
- **Microsoft**: Windows UI with React Native
- **Shopify**: Mobile commerce with React Native
- **Discord**: Cross-platform desktop/mobile architecture
- **Bloomberg**: Terminal UI modernization

## 🛠️ Technologies Covered

- **React 18+**: Concurrent features, Suspense, Transitions
- **Next.js 14+**: App Router, Server Components, Server Actions
- **TypeScript 5+**: Advanced type patterns
- **React Native 0.73+**: New Architecture (Fabric, TurboModules)
- **Expo SDK 50+**: Expo Router, EAS, OTA updates
- **Vercel**: Edge Runtime, ISR, KV, Postgres
- **Monorepo Tools**: Turborepo, pnpm workspaces
- **State Management**: Zustand, Jotai, Recoil
- **Performance**: React Profiler, Chrome DevTools

## 📈 Learning Outcomes

After completing this course, you will:

✅ Understand React's reconciliation algorithm and fiber architecture
✅ Master React Server Components and the Flight Protocol
✅ Build high-performance Next.js applications with advanced caching
✅ Deploy production apps on Vercel with edge runtime optimization
✅ Create React Native apps using the new architecture
✅ Build cross-platform apps sharing code between web and mobile
✅ Design scalable state management architectures
✅ Profile and optimize React application performance
✅ Implement custom TurboModules and Fabric components
✅ Ship production apps using Expo EAS with OTA updates

## 🎓 Course Philosophy

This course treats React **as a system**, not just a UI library. You'll learn:

- **Why** React works the way it does
- **When** to use different patterns and architectures
- **How** companies scale React to millions of users
- **What** tradeoffs exist in different approaches

We focus on **production-ready patterns** used by top engineering organizations.

## 🤝 Contributing

This is a living course. If you find issues or want to suggest improvements, please open an issue or PR.

## 📜 License

MIT

---

**Ready to become a React Jedi?** Start with [Module 1: Modern React Mental Models](./module-01-react-mental-models) →