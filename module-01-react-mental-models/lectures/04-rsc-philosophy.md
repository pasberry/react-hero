# Lecture 4: React Server Components - A New Paradigm

## Introduction

React Server Components (RSC) is **not** just server-side rendering (SSR). It's a fundamental rethinking of the client-server boundary in React applications.

**Core insight**: Not all components need to be interactive. Many exist only to fetch and display data. Why send their code to the client at all?

## The Problem RSC Solves

Traditional React apps face a trilemma:

```
Pick two:
1. Fast initial load (small bundle)
2. Rich interactivity (large component library)
3. Data colocation (components fetch their own data)
```

**Example**:

```jsx
// ❌ Traditional approach
function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(r => r.json())
      .then(setProduct);
  }, [productId]);

  if (!product) return <Spinner />;

  return (
    <div>
      <h1>{product.title}</h1>
      <Markdown source={product.description} />  {/* 50kb */}
      <Reviews productId={productId} />
    </div>
  );
}
```

**Problems**:
1. **Bundle includes Markdown library** (50kb) even though it's not interactive
2. **Waterfall**: Page loads → JS loads → Data fetches → Markdown loads
3. **Client does unnecessary work**: Parsing markdown that could be done on server

## The RSC Solution

```jsx
// ✅ Server Component (runs only on server)
async function ProductPage({ productId }) {
  // Direct database access, no API layer needed
  const product = await db.product.findUnique({ where: { id: productId } });

  return (
    <div>
      <h1>{product.title}</h1>
      <Markdown source={product.description} />  {/* Runs on server */}
      <Reviews productId={productId} />
    </div>
  );
}
```

**Benefits**:
1. **Zero client JavaScript** for Markdown component
2. **No waterfalls**: Data fetched during render
3. **Server resources**: Can access DB directly
4. **Smaller bundle**: Markdown library never sent to client

## Server vs Client Components

### Server Components

**Characteristics**:
- Run **only** on the server
- Can be `async` functions
- Can access backend resources directly (DB, filesystem, environment variables)
- Cannot use hooks or state
- Cannot access browser APIs
- Code never sent to client

**File convention**:
```jsx
// app/components/ServerComponent.tsx (default in Next.js App Router)
export default async function ServerComponent() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data.title}</div>;
}
```

### Client Components

**Characteristics**:
- Run on **both** server (for SSR) and client (for hydration)
- Cannot be `async`
- Can use hooks, state, effects
- Can access browser APIs
- Code sent to client

**File convention**:
```jsx
// app/components/ClientComponent.tsx
'use client';  // Directive marking client boundary

export default function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### The Composition Rules

**Rule 1**: Server components can render client components

```jsx
// ✅ ServerComponent.tsx
import ClientButton from './ClientButton';  // Has 'use client'

export default async function ServerComponent() {
  const data = await fetchData();

  return (
    <div>
      <h1>{data.title}</h1>
      <ClientButton />  {/* Client component */}
    </div>
  );
}
```

**Rule 2**: Client components **cannot** render server components directly

```jsx
// ❌ ClientComponent.tsx
'use client';
import ServerComponent from './ServerComponent';  // Error!

export default function ClientComponent() {
  return <ServerComponent />;  // Cannot import server component
}
```

**Rule 3**: Client components CAN accept server components as children/props

```jsx
// ✅ ServerComponent.tsx
import ClientWrapper from './ClientWrapper';
import ServerChild from './ServerChild';

export default async function ServerComponent() {
  return (
    <ClientWrapper>
      <ServerChild />  {/* Passed as children */}
    </ClientWrapper>
  );
}

// ClientWrapper.tsx
'use client';
export default function ClientWrapper({ children }) {
  const [open, setOpen] = useState(true);
  return open ? <div>{children}</div> : null;  // children is server component
}
```

**Why this works**: Server renders `<ServerChild />` to React elements, passes result to ClientWrapper.

## The Flight Protocol

RSC uses a new wire format called the **Flight Protocol** to stream server components to the client.

### Traditional SSR Flow

```
1. Server renders to HTML string
2. Browser displays HTML (non-interactive)
3. JS bundle downloads
4. React hydrates (makes interactive)
```

### RSC Flow

```
1. Server renders to Flight format (streaming)
2. Browser receives chunks progressively
3. React reconstructs fiber tree on client
4. Only client components hydrate
```

### Flight Format Example

**Server component**:

```jsx
async function Page() {
  const user = await db.user.findUnique({ id: 1 });

  return (
    <div>
      <h1>{user.name}</h1>
      <ClientCounter initial={0} />
    </div>
  );
}
```

**Flight output** (simplified):

```
M1:{"id":"./ClientCounter.tsx","chunks":["app/counter.js"],"name":"default"}
S2:"John Doe"
J0:["$","div",null,{"children":[
  ["$","h1",null,{"children":S2}],
  ["$","@1",null,{"initial":0}]
]}]
```

**Breakdown**:
- `M1`: Module reference (ClientCounter)
- `S2`: String "John Doe"
- `J0`: JSX tree with references to M1 and S2
- `@1`: Placeholder for ClientCounter

**Client process**:
1. Receive M1 → Load `app/counter.js`
2. Receive S2 → String value
3. Receive J0 → Construct fiber tree
4. Hydrate ClientCounter at `@1` placeholder

### Streaming Benefits

```jsx
<Suspense fallback={<Skeleton />}>
  <SlowComponent />  {/* Takes 2 seconds */}
</Suspense>
<FastComponent />    {/* Returns instantly */}
```

**Timeline**:

```
0ms: Server starts rendering
10ms: FastComponent ready → stream to client
10ms: Client displays FastComponent + Skeleton
2000ms: SlowComponent ready → stream to client
2000ms: Client replaces Skeleton with SlowComponent
```

**No need to wait** for slow component before showing anything!

## Data Fetching Patterns

### Pattern 1: Collocated Fetching

```jsx
// Each component fetches its own data
async function Page() {
  return (
    <>
      <Header />
      <Sidebar />
      <MainContent />
    </>
  );
}

async function Header() {
  const user = await db.user.getCurrent();
  return <div>Hello, {user.name}</div>;
}

async function Sidebar() {
  const notifications = await db.notifications.getRecent();
  return <ul>{notifications.map(n => <li>{n.text}</li>)}</ul>;
}

async function MainContent() {
  const posts = await db.posts.getRecent();
  return <div>{posts.map(p => <Post key={p.id} post={p} />)}</div>;
}
```

**Automatic parallelization**: React fetches all three in parallel!

**How?** React starts rendering all components, encounters `await`, and doesn't block. When all promises resolve, rendering continues.

### Pattern 2: Suspense Boundaries

```jsx
async function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />  {/* Can take a while */}
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />  {/* Can take a while */}
      </Suspense>
    </>
  );
}
```

**Streaming**:
1. Header renders immediately
2. Skeletons display while Sidebar/MainContent fetch
3. Each resolves independently and streams down

### Pattern 3: Parallel Data Fetching

```jsx
async function Page({ productId }) {
  // Start all fetches in parallel
  const productPromise = db.product.get(productId);
  const reviewsPromise = db.reviews.getForProduct(productId);
  const recommendationsPromise = db.products.getRecommended(productId);

  return (
    <>
      <Product product={await productPromise} />
      <Reviews reviews={await reviewsPromise} />
      <Recommended products={await recommendationsPromise} />
    </>
  );
}
```

**Result**: All three queries run in parallel, not waterfall.

### Pattern 4: Sequential When Needed

```jsx
async function Page({ userId }) {
  // Must wait for user before fetching their posts
  const user = await db.user.get(userId);
  const posts = await db.posts.getForUser(user.id);

  return (
    <>
      <UserProfile user={user} />
      <PostList posts={posts} />
    </>
  );
}
```

**When sequential is correct**: Second query depends on first query's result.

## Caching Strategies

### Request-Level Caching

Next.js automatically dedupes requests within a single render:

```jsx
async function Page() {
  return (
    <>
      <Header />
      <Sidebar />
    </>
  );
}

async function Header() {
  const user = await db.user.getCurrent();  // Query 1
  return <div>{user.name}</div>;
}

async function Sidebar() {
  const user = await db.user.getCurrent();  // Same query - cached!
  return <div>{user.avatar}</div>;
}
```

**Only one database query** executes. Second call returns cached result.

### Route-Level Caching

```jsx
// app/products/[id]/page.tsx
export const revalidate = 3600;  // Cache for 1 hour

async function ProductPage({ params }) {
  const product = await db.product.get(params.id);
  return <ProductView product={product} />;
}
```

**ISR (Incremental Static Regeneration)**:
1. First request → Fetch data, cache for 1 hour
2. Subsequent requests → Serve cached version
3. After 1 hour → Revalidate in background
4. New requests → Serve fresh data

### Data-Level Caching

```jsx
import { cache } from 'react';

const getUser = cache(async (id) => {
  return db.user.get(id);
});

// Anywhere in your app
const user = await getUser(123);  // Fetches
const sameUser = await getUser(123);  // Cached within this request
```

**Scope**: Single request. Next request starts with fresh cache.

## Client-Server Boundaries

### Serialization Constraints

Only certain types can cross the server-client boundary:

**✅ Serializable**:
- Primitives (string, number, boolean, null, undefined)
- Plain objects and arrays
- Dates
- BigInts
- Typed arrays
- React elements

**❌ Not serializable**:
- Functions
- Class instances (with methods)
- Symbols
- undefined in object values (becomes null)

**Example**:

```jsx
// ❌ Server Component
async function ServerComponent() {
  const user = await db.user.get(1);

  const handleClick = () => console.log('clicked');  // ERROR: Function

  return <ClientButton onClick={handleClick} />;  // Cannot serialize function
}

// ✅ Use Client Component
'use client';
function ClientButton() {
  const handleClick = () => console.log('clicked');  // OK: Stays on client

  return <button onClick={handleClick}>Click</button>;
}
```

### Actions: Functions That Cross Boundaries

**Server Actions** are special functions that can be called from client:

```jsx
// app/actions.ts
'use server';

export async function createPost(formData) {
  const title = formData.get('title');
  const post = await db.post.create({ data: { title } });
  revalidatePath('/posts');
  return { success: true, postId: post.id };
}

// app/components/CreatePost.tsx
'use client';
import { createPost } from '../actions';

export function CreatePost() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    startTransition(async () => {
      await createPost(formData);  // Calls server function!
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <button disabled={isPending}>Create</button>
    </form>
  );
}
```

**How it works**:
1. `createPost` gets unique ID during build
2. Client gets reference to server function
3. When called, sends POST request with args
4. Server executes function, returns result
5. Client receives result

**Benefits**:
- Type-safe (TypeScript infers types)
- Progressive enhancement (works without JS)
- Automatic serialization

## Performance Implications

### Bundle Size Reduction

**Traditional**:

```
Bundle includes:
- React (45kb)
- All components (100kb)
- Markdown library (50kb)
- Date formatting library (30kb)
- All data fetching logic (20kb)
Total: ~245kb
```

**With RSC**:

```
Bundle includes:
- React (45kb)
- Only client components (30kb)
Total: ~75kb

Server components: 0kb to client
```

**70% reduction** in this example!

### Faster Initial Load

```
Traditional:
1. HTML: 500ms
2. JS bundle (245kb): +1000ms
3. Data fetch: +300ms
4. Re-render: +100ms
Total: 1900ms

With RSC:
1. HTML + initial data: 600ms
2. JS bundle (75kb): +300ms
3. Hydration: +50ms
Total: 950ms
```

**50% faster** time-to-interactive!

### Waterfalls Eliminated

```jsx
// ❌ Traditional: Waterfall
function Page() {
  const { data: user } = useSWR('/api/user');  // 100ms
  const { data: posts } = useSWR(user ? `/api/posts/${user.id}` : null);  // +150ms

  return <PostList posts={posts} />;
}
// Total: 250ms

// ✅ RSC: Parallel
async function Page() {
  const user = await db.user.getCurrent();  // 100ms
  const posts = await db.posts.getForUser(user.id);  // +50ms (cached user)

  return <PostList posts={posts} />;
}
// Total: 150ms
```

**40% faster** data loading!

## Migration Strategies

### Gradual Adoption

```jsx
// Start: Everything is client component
'use client';
export default function Page() {
  // ...
}

// Step 1: Move non-interactive parts to server
export default async function Page() {
  const data = await fetchData();

  return (
    <>
      <Header data={data} />  {/* Server component */}
      <InteractiveContent />  {/* Still client component */}
    </>
  );
}

// Step 2: Extract more server components
export default async function Page() {
  return (
    <>
      <ServerHeader />
      <ServerSidebar />
      <ClientMain />
    </>
  );
}
```

### When to Use Client Components

Use `'use client'` when you need:

1. **Interactivity**: `onClick`, `onChange`, etc.
2. **State**: `useState`, `useReducer`
3. **Effects**: `useEffect`, `useLayoutEffect`
4. **Browser APIs**: `localStorage`, `window`, `document`
5. **Context**: `useContext` (for client state)
6. **Custom hooks**: That use any of the above

**Rule of thumb**: Start with server components, add `'use client'` only when needed.

## RSC at Scale

How companies use RSC:

### Vercel (Next.js)

```jsx
// Blog post page
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);

  return (
    <>
      <article>
        <h1>{post.title}</h1>
        <ServerMarkdown source={post.content} />  {/* 0kb to client */}
      </article>
      <ClientComments postId={post.id} />  {/* Interactive */}
    </>
  );
}
```

**Result**: Blog content is 0kb JavaScript. Only comments component loads.

### E-commerce

```jsx
export default async function ProductPage({ params }) {
  const product = await db.product.get(params.id);
  const recommendations = await db.products.getRecommended(product.category);

  return (
    <>
      <ServerProductGallery images={product.images} />
      <ServerDescription text={product.description} />
      <ClientAddToCart productId={product.id} />  {/* Only interactive part */}
      <ServerRecommendations products={recommendations} />
    </>
  );
}
```

**Result**: 90% of page is server components. Tiny client bundle.

## Summary

**Key Takeaways**:

1. **RSC ≠ SSR**: New paradigm, not just server rendering
2. **Server components** run only on server, zero client cost
3. **Flight protocol** streams components progressively
4. **Composition rules**: Server can render client, not vice versa
5. **Data colocation**: Components fetch their own data
6. **Automatic parallelization**: React fetches in parallel
7. **Server actions**: Type-safe RPC from client to server

**Mental Model**:

Think of your app as a tree:
- **Server components** (branches): Do heavy lifting, access resources
- **Client components** (leaves): Handle interactivity
- **Data flows down** from server to client
- **Actions flow up** from client to server

The genius: Most of your app can be server components (free), with client components only where needed.

## Further Exploration

In the next lecture, we'll explore **React at Meta Scale** - how Meta's teams use these patterns to build products for billions.

**Questions to ponder**:
- How would you architect a complex app to maximize server components?
- What are the tradeoffs of server vs client components for SEO?
- How does RSC change your approach to state management?

---

**Next**: Module 3 will do a deep dive into Next.js App Router, where you'll build production apps with RSC.
