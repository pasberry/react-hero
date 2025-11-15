# Lecture 2: Fiber Architecture - React's Secret Weapon

## Introduction

If reconciliation is React's algorithm, **Fiber** is its data structure. Fiber is what enables:
- Concurrent rendering
- Prioritizing updates
- Pausing and resuming work
- Aborting work that's no longer needed
- Error boundaries
- Suspense

Understanding Fiber transforms you from someone who uses React to someone who understands React.

## Pre-Fiber React (Stack Reconciler)

Before Fiber (React <16), React used a **stack reconciler**:

```javascript
// Simplified pre-Fiber reconciliation
function reconcile(element) {
  // Create or update instance
  const instance = createOrUpdateInstance(element);

  // Recursively reconcile children
  element.children.forEach(child => {
    reconcile(child);  // BLOCKING - must finish before returning
  });

  return instance;
}
```

**Problem**: This recursion was **synchronous and uninterruptible**.

For a tree with 10,000 components:
- All 10,000 components must render
- Cannot pause for user input
- Browser freezes until complete
- Janky user experience

**The 16ms budget**: Browsers have ~16ms per frame to render at 60fps. If reconciliation takes longer, frames drop.

## Enter Fiber: The Solution

Fiber restructures reconciliation to be **incremental** and **interruptible**.

### Core Concept: Work Units

Instead of recursive function calls (stack), Fiber uses a **linked data structure** where each node is a "unit of work" that can be:
- Paused
- Resumed later
- Aborted if no longer needed
- Prioritized

### The Fiber Node

A Fiber is a JavaScript object representing:
1. A component instance
2. A unit of work
3. A linked list node

```typescript
type Fiber = {
  // Instance
  type: Function | string,        // Component function or 'div'
  key: string | null,
  stateNode: any,                 // DOM node or component instance

  // Fiber tree structure (doubly linked)
  child: Fiber | null,            // First child
  sibling: Fiber | null,          // Next sibling
  return: Fiber | null,           // Parent

  // Work
  pendingProps: any,              // New props
  memoizedProps: any,             // Previous props
  memoizedState: any,             // Previous state
  updateQueue: UpdateQueue | null, // Queue of state updates

  // Effects
  flags: Flags,                   // What type of work (placement, update, deletion)
  subtreeFlags: Flags,            // Aggregate of child flags
  deletions: Array<Fiber> | null, // Children to delete

  // Scheduling
  lanes: Lanes,                   // Priority of this update
  childLanes: Lanes,              // Priority of child updates

  // Double buffering
  alternate: Fiber | null,        // Reference to other version of this fiber
};
```

**Key insight**: This is a persistent data structure. React maintains two trees:
- **current**: reflects what's on screen
- **workInProgress**: the tree being built

## The Fiber Tree Structure

Instead of parent → children arrays, Fiber uses a **linked list**:

```
      Parent
        ↓
      Child1 → Child2 → Child3
        ↓        ↓        ↓
      GrandC1  GrandC2  GrandC3
```

Each Fiber has:
- `child`: first child
- `sibling`: next sibling
- `return`: parent

**Example**:

```jsx
<App>
  <Header />
  <Main>
    <Article />
  </Main>
  <Footer />
</App>
```

**Fiber tree**:

```
App (root)
├─ child → Header
│          ├─ sibling → Main
│                      ├─ child → Article
│                      └─ sibling → Footer
```

**Why linked list vs array of children?**

Linked lists allow React to:
1. Traverse incrementally (visit one node, pause, resume)
2. Skip subtrees easily (just don't follow `child` pointer)
3. Splice in/out nodes without array reallocation

## The Work Loop

Here's the core of React's concurrent rendering:

```javascript
function workLoopConcurrent() {
  // While there's work AND we have time remaining
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  // 1. Begin work on this fiber
  const next = beginWork(unitOfWork);

  // 2. If has child, that's next unit of work
  if (next !== null) {
    workInProgress = next;
    return;
  }

  // 3. No child, complete this unit
  completeUnitOfWork(unitOfWork);
}
```

**Key**: `shouldYield()` checks if we're running out of time in the current frame. If so, React yields back to the browser.

### shouldYield(): The Secret Sauce

```javascript
function shouldYield() {
  const currentTime = performance.now();
  return currentTime >= deadline;
}
```

React aims to finish work within 5ms chunks by default, constantly yielding to keep the browser responsive.

**Practical impact**:

```jsx
// Rendering 10,000 items
function HugeList() {
  return items.map(item => <ExpensiveItem key={item.id} item={item} />);
}
```

**Pre-Fiber**: Browser freezes for 500ms while rendering all items.

**With Fiber**: React renders items incrementally, yielding every 5ms to keep UI responsive.

## Double Buffering

React maintains **two fiber trees**:

1. **current tree**: what's on screen now
2. **workInProgress tree**: the new tree being built

```
current tree        workInProgress tree
     App    ←──────→     App'
      ↓                   ↓
   Header  ←──────→    Header'
```

Each fiber has an `alternate` pointer to its counterpart in the other tree.

**Why double buffering?**

1. **Can abandon work**: If higher priority update comes in, discard workInProgress tree and start fresh
2. **Avoid inconsistent state**: Build complete tree before swapping (atomic commit)
3. **Efficient updates**: Reuse fibers between trees when possible

### Render Phase vs Commit Phase

```
Render Phase (can be interrupted):
  - Build workInProgress tree
  - Call component functions
  - Reconcile children
  - Mark effects

Commit Phase (synchronous, cannot be interrupted):
  - Apply effects to DOM
  - Run layout effects
  - Swap current ← workInProgress
  - Run passive effects
```

**Analogy**: Render phase is drawing blueprints. Commit phase is actual construction.

## Traversal Algorithm

Fiber uses **depth-first traversal**:

```
        A
       ↙ ↘
      B   C
     ↙     ↘
    D       E
```

**Order of work**:
1. Begin A
2. Begin B (A's child)
3. Begin D (B's child)
4. Complete D (no children)
5. Complete B (no more children)
6. Begin C (B's sibling)
7. Begin E (C's child)
8. Complete E
9. Complete C
10. Complete A

**Code**:

```javascript
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;

  while (completedWork !== null) {
    // Complete this fiber
    completeWork(completedWork);

    // If has sibling, that's next work
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }

    // No sibling, complete parent
    completedWork = completedWork.return;
  }
}
```

## Practical Example: Tracing an Update

```jsx
function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Header />
      <Counter count={count} onClick={() => setCount(c => c + 1)} />
      <Footer />
    </div>
  );
}
```

**When button clicked**:

1. **Schedule update**: Create update object, add to Counter's Fiber updateQueue
2. **Begin work at root**: Start workInProgress tree from App
3. **Traverse**:
   - Begin App → has work (state changed)
   - Call `App()` function → get new elements
   - Begin `div` → no work, but children need reconciliation
   - Begin Header → no props changed → **reuse fiber**, mark as NoWork
   - Begin Counter → props changed → **clone fiber**, mark as Update
   - Call `Counter()` → get new elements
   - ... reconcile Counter's children
   - Complete Counter
   - Begin Footer → no changes → reuse
   - Complete Footer, div, App
4. **Commit**: Apply marked effects to DOM (update Counter's DOM nodes)

**Visualization**:

```
Render Phase:
current            workInProgress
 App     ────────→   App'
  ↓                   ↓
 div    ────────→   div'
  ↓                   ↓
Header ────────→  Header' (reused)
  ↓                   ↓
Counter ───────→  Counter' (new props)
  ↓                   ↓
Footer ────────→  Footer' (reused)

After Commit:
current = workInProgress
workInProgress = null
```

## Fiber Flags (Side Effects)

Each Fiber has `flags` indicating what work is needed:

```javascript
const Placement = 0b000000010;       // Insert into DOM
const Update = 0b000000100;          // Update props/attrs
const Deletion = 0b000001000;        // Remove from DOM
const ChildDeletion = 0b000010000;   // Child was deleted
const Passive = 0b001000000;         // Has useEffect
const Snapshot = 0b010000000;        // Has getSnapshotBeforeUpdate
// ... many more
```

**Usage**:

```javascript
// Mark fiber as needing DOM update
fiber.flags |= Update;

// Check if fiber needs DOM update
if (fiber.flags & Update) {
  updateDOMNode(fiber.stateNode, fiber.memoizedProps, fiber.pendingProps);
}
```

**Effect List** (pre-React 18):

React used to maintain a linked list of fibers with effects for fast iteration during commit:

```
App → Counter → Button
(Only fibers with flags !== NoFlags)
```

**React 18+**: Uses `subtreeFlags` to bubble up child effects, checking during traversal instead.

## Lanes: Priority-Based Scheduling

Fiber tracks update priority using a **lanes** system (bitfield):

```javascript
const SyncLane = 0b0000000000000000000000000000001;
const InputContinuousLane = 0b0000000000000000000000000000100;
const DefaultLane = 0b0000000000000000000000000010000;
const TransitionLane1 = 0b0000000000000000000000001000000;
// ... more lanes
```

**Why lanes?**

1. **Multiple updates at different priorities** can be batched
2. **Higher priority updates** can interrupt lower priority work
3. **Expired updates** can be escalated

**Example**:

```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    // High priority - sync with user input
    setQuery(e.target.value);

    // Low priority - expensive search
    startTransition(() => {
      setResults(search(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      <Results items={results} />
    </>
  );
}
```

**Fiber trees**:

```
Update 1 (SyncLane): query change
  → Renders immediately

Update 2 (TransitionLane): results change
  → Renders when browser is idle
  → Can be interrupted if Update 3 arrives
```

We'll cover lanes in depth in Lecture 3.

## State Storage in Fibers

useState hooks are stored in the Fiber:

```javascript
fiber.memoizedState = {
  memoizedState: 'actual state value',
  queue: updateQueue,
  next: null  // next hook in the list
}
```

**Multiple hooks** form a linked list:

```jsx
function Component() {
  const [a, setA] = useState(0);  // Hook 1
  const [b, setB] = useState(1);  // Hook 2
  const [c, setC] = useState(2);  // Hook 3
}
```

**Fiber.memoizedState**:

```
Hook1 → Hook2 → Hook3
{       {       {
  memoizedState: 0,
  queue: {...},
  next: Hook2
}
```

**Why hooks must be called in the same order**: React relies on call order to match hooks to their stored state.

## Error Boundaries and Fiber

Error boundaries work by catching errors during traversal:

```javascript
function beginWork(fiber) {
  try {
    // Call component or reconcile
    return actualBeginWork(fiber);
  } catch (error) {
    // Walk up fiber tree looking for error boundary
    throwException(fiber, error);
  }
}

function throwException(fiber, error) {
  let errorBoundary = fiber.return;

  while (errorBoundary !== null) {
    if (errorBoundary.type.getDerivedStateFromError) {
      // Found error boundary
      const update = createUpdate();
      update.payload = { error };
      enqueueUpdate(errorBoundary, update);
      scheduleUpdateOnFiber(errorBoundary);
      return;
    }
    errorBoundary = errorBoundary.return;
  }

  // No error boundary, crash
  throw error;
}
```

## Suspense and Fiber

Suspense uses Fiber's ability to pause and resume work:

```jsx
<Suspense fallback={<Spinner />}>
  <AsyncComponent />  // throws Promise
</Suspense>
```

**When Promise is thrown**:

1. **Capture Promise** during beginWork
2. **Attach Promise to Suspense boundary Fiber**
3. **Mark subtree as Incomplete**
4. **Render fallback** instead
5. **When Promise resolves**: schedule update, retry rendering AsyncComponent

**Fiber structure**:

```
Suspense Fiber
├─ flags: SuspenseFlag
├─ memoizedState: {
│    dehydrated: null,
│    baseState: Promise,  // pending promise
│    baseQueue: null
│  }
└─ child: Spinner (while loading)
          or AsyncComponent (when resolved)
```

## Performance: Fiber's Impact

**Before Fiber**:
- Render blocks for entire reconciliation
- No way to prioritize updates
- All updates treated equally

**After Fiber**:
- Incremental rendering
- High-priority updates interrupt low-priority work
- Framework can keep UI responsive even with heavy computation

**Real-world measurement**:

```
Rendering 10,000 items:

Stack Reconciler:
  Input responsiveness: 500ms
  Frame rate: 12fps
  User experience: Janky

Fiber (with concurrent features):
  Input responsiveness: <16ms
  Frame rate: 60fps
  User experience: Smooth
```

## How Meta Uses Fiber

Meta's products benefit from Fiber in several ways:

1. **News Feed**: Infinite scroll doesn't block scrolling
2. **Messenger**: Typing stays responsive even with complex chat UI
3. **React Native**: Smooth animations while JS bundle executes
4. **Code splitting**: Large apps load incrementally without freezing

**Specific pattern** Meta uses:

```jsx
// High priority: user input
const [inputValue, setInputValue] = useState('');

// Low priority: expensive filtered results
const [isPending, startTransition] = useTransition();
const [filteredResults, setFilteredResults] = useState([]);

const handleInput = (e) => {
  setInputValue(e.target.value);  // Immediate

  startTransition(() => {
    // Can be interrupted
    setFilteredResults(expensiveFilter(e.target.value));
  });
};
```

## Architectural Patterns Enabled by Fiber

### 1. Concurrent Rendering

```jsx
function App() {
  const [isPending, startTransition] = useTransition();

  const navigate = (url) => {
    startTransition(() => {
      // Low priority - can be interrupted
      router.push(url);
    });
  };
}
```

### 2. Time Slicing

Large computations can be split across multiple frames:

```jsx
const deferredQuery = useDeferredValue(searchQuery);
// UI stays responsive while deferredQuery catches up
```

### 3. Selective Hydration

Server-rendered HTML can be hydrated incrementally:

```jsx
<Suspense fallback={<Spinner />}>
  <HeavyComponent />  // Hydrates when visible
</Suspense>
```

## Summary

**Key Takeaways**:

1. **Fiber is a linked data structure** that represents units of work
2. **Double buffering** allows React to abandon work and start over
3. **Work loop is interruptible** via `shouldYield()`
4. **Fibers track updates via queues** and priorities via lanes
5. **Render phase is interruptible**, commit phase is synchronous
6. **Fiber enables**: concurrent rendering, Suspense, error boundaries, and prioritization

**Mental Model**:

Think of Fiber as a **work scheduler**:
- Input: Component tree and state updates
- Output: Minimal DOM changes
- Process: Interruptible, prioritized, incremental

The genius is that React can pause, check "do I need to do something more important?", and either continue or start fresh.

## Further Exploration

In the next lecture, we'll explore **Concurrent Rendering and Lanes** - how React uses Fiber to schedule and prioritize work.

**Questions to ponder**:
- How would you implement `shouldYield()` for different platforms (web vs mobile)?
- What are the tradeoffs of linked lists vs arrays for Fiber tree structure?
- How might Fiber architecture evolve with Web Workers or off-main-thread rendering?

---

**Exercise Preview**: Exercise 2 will have you build a concurrent UI using transitions, leveraging the Fiber architecture concepts you've learned.
