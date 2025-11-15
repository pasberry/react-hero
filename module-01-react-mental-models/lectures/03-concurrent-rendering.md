# Lecture 3: Concurrent React - Scheduling and Lanes

## Introduction

Concurrent React is not a feature—it's a **paradigm shift**. It fundamentally changes how React schedules and executes work, enabling UIs that stay responsive under heavy load.

**Key insight**: Concurrency means React can work on multiple versions of the UI at the same time, pausing, aborting, and prioritizing work as needed.

## What Concurrency Is NOT

❌ **Not parallelism**: React doesn't use multiple threads (JavaScript is single-threaded)
❌ **Not automatic**: You opt-in via specific APIs
❌ **Not magic**: It's sophisticated scheduling built on Fiber

## What Concurrency IS

✅ **Interruptible rendering**: React can pause work and resume later
✅ **Prioritized updates**: Urgent updates can interrupt less urgent work
✅ **Multiple UI versions**: React can prepare next state without blocking current UI
✅ **Abortable work**: React can throw away work that's no longer needed

**Analogy**: Like a chef cooking multiple dishes:
- **Non-concurrent**: Must finish dish 1 completely before starting dish 2
- **Concurrent**: Can pause dish 1 to stir dish 2, then return to dish 1

## The Lane System: React's Priority Queue

React uses a **lane-based priority system** (32-bit bitfield):

```typescript
type Lanes = number;  // 32-bit integer
type Lane = number;   // Single bit

const NoLanes: Lanes = 0b0000000000000000000000000000000;
const SyncLane: Lane = 0b0000000000000000000000000000001;
const InputContinuousLane: Lane = 0b0000000000000000000000000000100;
const DefaultLane: Lane = 0b0000000000000000000000000010000;
const TransitionLane1: Lane = 0b0000000000000000000000001000000;
const TransitionLane2: Lane = 0b0000000000000000000000010000000;
// ... 16 transition lanes total
const IdleLane: Lane = 0b0100000000000000000000000000000;
const OffscreenLane: Lane = 0b1000000000000000000000000000000;
```

**Why lanes (not simple priority numbers)?**

1. **Batching**: Multiple updates can share a lane
2. **Expiration**: Lanes can be escalated if they take too long
3. **Entanglement**: Child lanes bubble up to parents
4. **Efficiency**: Bitwise operations are fast

### Lane Priority Hierarchy

```
Highest Priority (must be synchronous):
├─ SyncLane (0b1)
│  └─ Events: onClick, onInput (controlled inputs)

High Priority (should be responsive):
├─ InputContinuousLane (0b100)
│  └─ Events: onMouseMove, onScroll

Normal Priority (visible, not urgent):
├─ DefaultLane (0b10000)
│  └─ Network responses, timers

Low Priority (can be deferred):
├─ TransitionLanes (0b1000000 to ...)
│  └─ startTransition updates

Lowest Priority (run when idle):
├─ IdleLane
│  └─ Analytics, prefetching
└─ OffscreenLane
   └─ Content not currently visible
```

### Lane Operations

```javascript
// Assign a lane to an update
function requestUpdateLane() {
  // Check if we're in a transition
  const isTransition = ReactCurrentBatchConfig.transition !== null;
  if (isTransition) {
    return claimTransitionLane();  // Get a transition lane
  }

  // Check current event priority
  const updateLane = getCurrentEventPriority();
  return updateLane;
}

// Merge lanes (bitwise OR)
function mergeLanes(a, b) {
  return a | b;
}

// Check if lane is subset
function includesSomeLane(a, b) {
  return (a & b) !== NoLanes;
}

// Get highest priority lane (rightmost set bit)
function getHighestPriorityLane(lanes) {
  return lanes & -lanes;  // Bit trick!
}
```

**Example**:

```javascript
// Fiber has updates in both default and transition lanes
fiber.lanes = 0b0000000000000000000000011010000;
//              transition2^  transition1^  default^

// Get highest priority lane
const nextLane = getHighestPriorityLane(fiber.lanes);
// Result: 0b0000000000000000000000000010000 (DefaultLane)
```

## User-Facing Concurrency APIs

### 1. useTransition

Mark updates as low-priority (can be interrupted):

```typescript
function useTransition(): [boolean, (callback: () => void) => void]
```

**Usage**:

```jsx
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // Urgent: update input immediately
    setQuery(e.target.value);

    // Not urgent: expensive search can wait
    startTransition(() => {
      const newResults = searchLargeDataset(e.target.value);
      setResults(newResults);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <Results items={results} />
    </div>
  );
}
```

**What happens**:

1. User types → `setQuery` scheduled in **SyncLane**
2. `startTransition` → `setResults` scheduled in **TransitionLane**
3. React processes SyncLane first → input updates immediately
4. React starts TransitionLane work
5. If user types again → React **abandons** transition work, starts over

**Benefits**:
- Input stays responsive
- No debouncing needed
- No state tearing (always consistent)

### 2. useDeferredValue

Create a deferred version of a value:

```typescript
function useDeferredValue<T>(value: T): T
```

**Usage**:

```jsx
function SearchResults({ query }) {
  // deferredQuery lags behind query during transitions
  const deferredQuery = useDeferredValue(query);

  // This expensive component uses deferred value
  return <ExpensiveResultsList query={deferredQuery} />;
}

function App() {
  const [query, setQuery] = useState('');

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <SearchResults query={query} />
    </>
  );
}
```

**What happens**:

1. User types → `query` updates in SyncLane
2. `SearchResults` re-renders with new `query`
3. `deferredQuery` is **still old value**
4. React schedules deferred update in TransitionLane
5. When browser has time, `deferredQuery` catches up

**Difference from useTransition**:

```
useTransition: You control what's low-priority (callback)
useDeferredValue: React automatically makes the value lag
```

**When to use which**:

```jsx
// useTransition: You trigger the update
const handleClick = () => {
  startTransition(() => {
    setState(newValue);
  });
};

// useDeferredValue: Parent passes prop you can't control
function Child({ value }) {
  const deferred = useDeferredValue(value);
  return <ExpensiveComponent value={deferred} />;
}
```

### 3. useId (Concurrent-Safe IDs)

Generate stable IDs that work with concurrent rendering:

```jsx
function TextField() {
  const id = useId();

  return (
    <>
      <label htmlFor={id}>Name</label>
      <input id={id} type="text" />
    </>
  );
}
```

**Why needed**: With concurrent rendering, a component might render multiple times. Random IDs would change, breaking accessibility.

`useId` guarantees:
- Same ID across server and client (no hydration mismatch)
- Same ID across aborted and retried renders
- Unique IDs even when multiple instances mount

## Time Slicing: The Implementation

Time slicing is how React actually achieves concurrency:

```javascript
let startTime = -1;
let frameYieldMs = 5;  // Yield every 5ms by default

function shouldYieldToHost() {
  const currentTime = performance.now();

  if (currentTime >= startTime + frameYieldMs) {
    // Time's up, yield to browser
    return true;
  }

  return false;
}

function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYieldToHost()) {
    performUnitOfWork(workInProgress);
  }
}
```

**5ms is carefully chosen**:
- Small enough to feel instant
- Large enough to make progress on most components

**Adaptive**: React can adjust based on device performance.

### Execution Timeline

```
Frame 1 (16ms total):
├─ React work: 5ms
│  └─ Render Fibers 1-50
├─ Browser work: 11ms
│  └─ Paint, handle events

Frame 2:
├─ React work: 5ms
│  └─ Render Fibers 51-100
├─ Browser work: 11ms

...continues until render complete
```

**Key**: User input is processed between React work chunks.

## Transitions: Deep Dive

### What Transitions Do

```jsx
startTransition(() => {
  setState(newValue);
});
```

1. **Mark updates as transitions** (TransitionLane)
2. **Allow interruption** by higher priority work
3. **Keep old UI visible** until new UI is ready
4. **Track pending state** with `isPending`

### Transitions vs Debouncing

**Old approach** (debouncing):

```jsx
const handleChange = debounce((value) => {
  setResults(search(value));
}, 300);
```

**Problems**:
- Arbitrary delay (why 300ms?)
- Renders old data after delay
- Doesn't adapt to device speed

**Concurrent approach**:

```jsx
const handleChange = (value) => {
  startTransition(() => {
    setResults(search(value));
  });
};
```

**Benefits**:
- No arbitrary delay
- Adapts to device performance
- Can show pending state
- Can be interrupted

### Multiple Transitions

React can handle multiple overlapping transitions:

```jsx
function App() {
  const [tab, setTab] = useState('home');
  const [content, setContent] = useState(null);

  const handleTabClick = (newTab) => {
    startTransition(() => {
      setTab(newTab);  // Transition 1
    });

    startTransition(() => {
      fetch(`/api/${newTab}`).then(data => {
        setContent(data);  // Transition 2
      });
    });
  };
}
```

**React behavior**:

1. Both transitions share a lane (or get separate transition lanes)
2. If user clicks another tab, **both transitions abort**
3. New transitions start fresh
4. No "race condition" between fetches

### useTransition with Suspense

Powerful combination for async UIs:

```jsx
function App() {
  const [resource, setResource] = useState(initialResource);
  const [isPending, startTransition] = useTransition();

  const handleClick = (id) => {
    startTransition(() => {
      // This will suspend
      setResource(fetchResource(id));
    });
  };

  return (
    <div>
      <button onClick={() => handleClick(1)}>Item 1</button>
      {isPending && <Spinner />}
      <Suspense fallback={<Skeleton />}>
        <ResourceView resource={resource} />
      </Suspense>
    </div>
  );
}
```

**What happens when button clicked**:

1. `startTransition` marks update as transition
2. `setResource` triggers re-render
3. `<ResourceView>` suspends (throws Promise)
4. **Instead of showing fallback**, React:
   - Keeps old UI visible
   - Sets `isPending = true`
   - Shows spinner in place
5. When data loads, shows new UI
6. Sets `isPending = false`

**No loading state jank!**

## Automatic Batching

React 18 automatically batches updates **everywhere**:

```jsx
// Before React 18: only events were batched
function handleClick() {
  setCount(c => c + 1);  // Re-render
  setFlag(f => !f);      // Re-render (2 total)
}

setTimeout(() => {
  setCount(c => c + 1);  // Re-render
  setFlag(f => !f);      // Re-render (2 total)
}, 1000);

// React 18: everything is batched
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);      // 1 re-render
}

setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);      // 1 re-render
}, 1000);

fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);      // 1 re-render (batched!)
});
```

**Opt-out** with `flushSync`:

```jsx
import { flushSync } from 'react-dom';

flushSync(() => {
  setCount(c => c + 1);  // Re-render immediately
});
setFlag(f => !f);        // Re-render again
```

## Lane Escalation: Preventing Starvation

Low-priority updates can starve if high-priority work keeps arriving.

**React's solution**: Lane escalation (expiration)

```javascript
const UPDATE_EXPIRATION_TIME = 5000;  // 5 seconds

function markUpdateLaneFromFiberToRoot(fiber, lane) {
  // ... mark lanes on fiber tree

  // Mark expiration time
  const eventTime = performance.now();
  markStarvedLanesAsExpired(root, eventTime);
}

function markStarvedLanesAsExpired(root, currentTime) {
  const pendingLanes = root.pendingLanes;

  // For each lane, check if it's expired
  let lanes = pendingLanes;
  while (lanes > 0) {
    const lane = getHighestPriorityLane(lanes);
    const expirationTime = root.expirationTimes[lane];

    if (expirationTime <= currentTime) {
      // Escalate to sync lane
      root.expiredLanes |= lane;
    }

    lanes &= ~lane;  // Remove this lane, check next
  }
}
```

**Practical impact**:

```jsx
const [isPending, startTransition] = useTransition();

startTransition(() => {
  setHugeList(computeExpensiveList());
});

// User keeps clicking buttons, interrupting transition
// After 5 seconds, transition is escalated to sync
// Guaranteed to finish
```

## Performance Patterns

### 1. Expensive Child Components

```jsx
// ❌ Everything re-renders on every keystroke
function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    setResults(search(e.target.value));
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      <HugeResultsList results={results} />  {/* Blocks input */}
    </>
  );
}

// ✅ Input stays responsive
function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value);

    startTransition(() => {
      setResults(search(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <HugeResultsList results={results} />
    </>
  );
}
```

### 2. Deferred Values for Prop Drilling

```jsx
// ✅ Defer expensive computation without changing parent
function App() {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);

  return (
    <>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      <ExpensiveTree filter={deferredFilter} />
    </>
  );
}
```

**Key**: `ExpensiveTree` gets old `filter` during transitions, keeping input responsive.

### 3. Throttling Without Throttling

```jsx
// Old: Manual throttling
const handleScroll = throttle(() => {
  setScrollPos(window.scrollY);
}, 100);

// New: Concurrent rendering
const handleScroll = () => {
  startTransition(() => {
    setScrollPos(window.scrollY);
  });
};
```

React handles the timing, no need for throttle/debounce.

## Concurrency at Meta

Meta uses concurrent features extensively:

### 1. News Feed Infinite Scroll

```jsx
function NewsFeed() {
  const [posts, setPosts] = useState([]);
  const [isPending, startTransition] = useTransition();

  const loadMore = () => {
    startTransition(() => {
      setPosts(posts => [...posts, ...fetchMorePosts()]);
    });
  };

  return (
    <InfiniteScroll onLoadMore={loadMore}>
      {posts.map(post => <Post key={post.id} {...post} />)}
      {isPending && <LoadingSpinner />}
    </InfiniteScroll>
  );
}
```

**Benefit**: Scrolling stays smooth even while loading/rendering new posts.

### 2. Messenger Search

```jsx
function MessengerSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <SearchInput value={query} onChange={setQuery} />
      <ConversationList query={deferredQuery} />  {/* Heavy */}
      <MessageList query={deferredQuery} />       {/* Heavy */}
    </>
  );
}
```

**Benefit**: Typing in search stays instant even with thousands of conversations.

### 3. Tab Switching

```jsx
function FacebookApp() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  const switchTab = (newTab) => {
    startTransition(() => {
      setTab(newTab);
    });
  };

  return (
    <>
      <TabBar selected={tab} onChange={switchTab} />
      {isPending && <ProgressBar />}
      <Suspense fallback={<TabSkeleton />}>
        {tab === 'home' && <HomeTab />}
        {tab === 'watch' && <WatchTab />}
        {tab === 'marketplace' && <MarketplaceTab />}
      </Suspense>
    </>
  );
}
```

**Benefit**: Old tab stays interactive while new tab loads.

## Summary

**Key Takeaways**:

1. **Concurrency = interruptible rendering**, not parallelism
2. **Lanes** are a priority system using bitfields
3. **useTransition** marks updates as low-priority
4. **useDeferredValue** creates lagging values
5. **Time slicing** keeps browser responsive (5ms chunks)
6. **Automatic batching** reduces re-renders
7. **Lane escalation** prevents starvation

**Mental Model**:

Think of concurrent React as a **smart task scheduler**:
- Urgent tasks (user input) interrupt less urgent tasks (data fetching)
- Multiple tasks can be in progress, but only one executes at a time
- Old UI stays visible until new UI is ready
- Obsolete work is abandoned

## Further Exploration

In the next lecture, we'll explore **React Server Components** - a paradigm shift enabled by this new concurrent foundation.

**Questions to ponder**:
- How would you implement lane-based prioritization in other frameworks?
- What are the tradeoffs of 5ms time slicing vs other durations?
- How does concurrent rendering affect testing strategies?

---

**Exercise Preview**: Exercise 2 will have you build a real concurrent UI, experiencing firsthand how transitions keep apps responsive.
