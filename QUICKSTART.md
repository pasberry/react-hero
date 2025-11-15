# Quick Start Guide - React Jedi Mastery Course

Get started with the React Jedi Mastery Course in under 10 minutes.

## ⚡ Fast Track Setup

### 1. Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check Git
git --version

# Install pnpm (recommended)
npm install -g pnpm
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd react-hero

# Install any dependencies (if needed)
npm install
```

### 3. Choose Your Path

Pick a learning path based on your goals:

#### 🌐 **Web Developer Path** (Fastest)
Focus on Next.js and web development
```
Modules: 1 → 2 → 3 → 4 → 5 → 6
Time: ~8-12 weeks (10 hrs/week)
```

#### 📱 **Mobile Developer Path**
Focus on React Native and Expo
```
Modules: 1 → 2 → 5 → 6 → 7 → 8
Time: ~10-14 weeks (10 hrs/week)
```

#### 🚀 **Full-Stack Path** (Complete Mastery)
Master the entire ecosystem
```
Modules: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Time: ~16-24 weeks (10 hrs/week)
```

### 4. Start Learning

```bash
# Navigate to Module 1
cd module-01-react-mental-models

# Open README
cat README.md

# Start with first lecture
cd lectures
cat 01-reconciliation-deep-dive.md
```

## 📋 Daily Study Routine

### Recommended Schedule (10 hrs/week)

**Weekday Evening (2 hours)**:
- Read one lecture section (1 hour)
- Take notes and sketch concepts (30 min)
- Code along with examples (30 min)

**Saturday (3 hours)**:
- Complete exercise starter code (1.5 hours)
- Compare with solution (30 min)
- Refine your implementation (1 hour)

**Sunday (3 hours)**:
- Build a mini-project applying the week's concepts (2 hours)
- Review and document learnings (1 hour)

**Weekly (2 hours)**:
- Review notes from entire module
- Participate in community discussions
- Help others with questions

## 🎯 Module 1 Kickstart

### Day 1: Reconciliation
- [ ] Read Lecture 1: Reconciliation Deep Dive
- [ ] Draw a diagram of React's reconciliation process
- [ ] Experiment with React DevTools Profiler

### Day 2: Fiber Architecture
- [ ] Read Lecture 2: Fiber Architecture
- [ ] Sketch fiber tree structure
- [ ] Trace an update through the work loop

### Day 3: Concurrent Rendering
- [ ] Read Lecture 3: Concurrent Rendering
- [ ] Build a simple useTransition example
- [ ] Measure before/after performance

### Day 4-5: RSC and Meta Scale
- [ ] Read Lectures 4-5
- [ ] Understand Server vs Client components
- [ ] Study Meta's patterns

### Day 6-7: Exercise Week
- [ ] Complete Exercise 1: Mini Reconciler
- [ ] Complete Exercise 2: Concurrent UI
- [ ] Review solutions and compare

## 🛠️ Essential Tools

### Install These

```bash
# React DevTools (Chrome Extension)
https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

# VS Code Extensions
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

### Set Up Environment

```bash
# Create a workspace for exercises
mkdir ~/react-jedi-workspace
cd ~/react-jedi-workspace

# Create a Next.js playground
npx create-next-app@latest my-playground --typescript --tailwind --app

# Create an Expo playground (for mobile modules)
npx create-expo-app@latest mobile-playground --template blank-typescript
```

## 📚 Reading List (Parallel Reading)

While going through modules, read these:

**Week 1-2**:
- [React as a UI Runtime](https://overreacted.io/react-as-a-ui-runtime/) by Dan Abramov
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)

**Week 3-4**:
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Next.js App Router Docs](https://nextjs.org/docs/app)

**Week 5-6**:
- [React Performance](https://react.dev/learn/render-and-commit)
- [Zustand Docs](https://docs.pmnd.rs/zustand)

## 💡 Learning Tips

### Active Learning Techniques

1. **Teach Back**: Explain concepts to someone (or a rubber duck)
2. **Build Analogies**: Connect to concepts you already know
3. **Draw Diagrams**: Visualize fiber trees, component lifecycles
4. **Code First**: Try exercises before reading solutions
5. **Debug Intentionally**: Break things to understand how they work

### Note-Taking System

Create a notes file for each module:

```markdown
# Module 1 Notes

## Key Concepts
- Reconciliation: ...
- Fiber: ...

## Aha Moments
- Realized why keys matter when...

## Questions
- How does React handle...?

## Code Snippets
[useful examples]

## TODO
- [ ] Review fiber architecture again
```

## 🚨 Common Pitfalls

### Avoid These Mistakes

❌ **Skipping Module 1**
→ You'll struggle with later modules

❌ **Reading without coding**
→ You won't truly understand

❌ **Rushing through exercises**
→ Exercises build deep intuition

❌ **Not asking for help**
→ Community is here to support you

✅ **Do This Instead**:
- Complete modules in order
- Code along with examples
- Take time with exercises
- Engage with community

## 📊 Progress Tracking

### Create a Progress Board

```markdown
# My React Jedi Journey

## Completed ✅
- [x] Module 1: React Mental Models
- [x] Exercise 1-1: Mini Reconciler

## In Progress 🔄
- [ ] Module 2: TypeScript Architecture
  - [x] Lecture 1
  - [ ] Lecture 2
  - [ ] Exercise 1

## Up Next 📋
- [ ] Module 3: Next.js App Router
- [ ] Module 4: Vercel Deployment

## Projects Built 🚀
1. Mini reconciler
2. Concurrent search UI
...
```

## 🎯 First Week Goals

By the end of Week 1, you should:

✅ Understand React's reconciliation algorithm
✅ Know what Fiber is and why it exists
✅ Comprehend concurrent rendering basics
✅ Complete at least one exercise
✅ Have a React DevTools workflow
✅ Feel confident about the learning path ahead

## 🤝 Get Help

### When Stuck

1. **Re-read the section** - Often clears confusion
2. **Check solutions** - Compare your approach
3. **Search React docs** - Official documentation
4. **Ask community** - Discord, Reddit, Twitter
5. **Google the error** - Someone else had it too

### Community Resources

- **React Discord**: https://discord.gg/react
- **Next.js Discord**: https://nextjs.org/discord
- **Expo Discord**: https://chat.expo.dev
- **Reddit**: r/reactjs, r/nextjs
- **Stack Overflow**: Tag with [reactjs]

## ✅ Pre-Flight Checklist

Before starting Module 1:

- [ ] Node.js 18+ installed
- [ ] Git configured
- [ ] VS Code (or editor) set up
- [ ] React DevTools installed
- [ ] Chosen a learning path
- [ ] Set aside dedicated study time
- [ ] Created a workspace folder
- [ ] Joined React community (Discord/Reddit)
- [ ] Read this quick start guide
- [ ] Ready to commit to the journey!

## 🚀 Launch!

You're ready! Open Module 1 and begin:

```bash
cd module-01-react-mental-models
cat README.md
```

---

**Remember**: Becoming a React Jedi takes time and practice. Be patient with yourself, stay consistent, and enjoy the journey!

**May the Force be with you!** ⚔️
