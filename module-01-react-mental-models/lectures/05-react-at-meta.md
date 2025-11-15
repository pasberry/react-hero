# Lecture 5: React at Meta Scale

## Introduction

React was created at Meta (Facebook) and continues to be battle-tested at a scale few companies match:
- **3+ billion monthly users**
- **Thousands of engineers** contributing to the same codebase
- **Millions of lines** of React code
- **Products**: Facebook, Instagram, WhatsApp Web, Messenger, Quest VR

This lecture explores how Meta scales React and the patterns that emerged from real-world constraints.

## The Meta Monorepo

Meta's web infrastructure is a **single monorepo** containing:
- All product code (Facebook, Instagram, etc.)
- Shared UI components
- Infrastructure libraries
- Build tools

**Scale**:
- Millions of lines of code
- Thousands of active developers
- Tens of thousands of commits per day

### Why Monorepo?

**Benefits**:
1. **Atomic changes**: Update shared component across all products in one commit
2. **Code sharing**: No dependency versioning hell
3. **Refactoring**: Can update all callsites when changing an API
4. **Tooling**: Unified build, test, lint infrastructure

**Challenges**:
1. **Build time**: Can't rebuild entire monorepo on every change
2. **Ownership**: Need clear boundaries and code owners
3. **Testing**: Can't run all tests for every commit

**Meta's solution**:
- Incremental builds (Buck/Buck2)
- Selective test execution
- Strong ownership model

## React Native Integration

Meta uses both React DOM (web) and React Native (mobile) **with significant code sharing**.

### Shared Component Library

```jsx
// Shared component works on web AND mobile
function Button({ onPress, children, variant = 'primary' }) {
  // Platform-agnostic implementation
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, styles[variant]]}
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

// Works on:
// - facebook.com
// - Facebook iOS app
// - Facebook Android app
```

**Key pattern**: StyleX (Meta's styling system) compiles to CSS on web, StyleSheet on React Native.

### Product-Specific Adaptations

```jsx
// products/facebook/web/Feed.tsx
import { Feed as SharedFeed } from '@shared/components/Feed';

export function Feed() {
  return (
    <SharedFeed
      platform="web"
      renderItem={WebFeedItem}  // Web-specific renderer
    />
  );
}

// products/facebook/mobile/Feed.tsx
import { Feed as SharedFeed } from '@shared/components/Feed';

export function Feed() {
  return (
    <SharedFeed
      platform="mobile"
      renderItem={MobileFeedItem}  // Mobile-specific renderer
    />
  );
}
```

**Pattern**: Core logic shared, platform-specific rendering.

## Code Splitting at Scale

Meta pioneered aggressive code splitting to keep bundle sizes manageable.

### Route-Based Splitting

```jsx
// Every route is a separate bundle
const HomeRoute = lazy(() => import('./routes/Home'));
const ProfileRoute = lazy(() => import('./routes/Profile'));
const PhotosRoute = lazy(() => import('./routes/Photos'));

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/profile/:id" element={<ProfileRoute />} />
        <Route path="/photos/:id" element={<PhotosRoute />} />
      </Routes>
    </Suspense>
  );
}
```

**Result**: Initial bundle only includes app shell. Routes load on demand.

### Component-Level Splitting

```jsx
// Heavy component loaded on demand
const PhotoViewer = lazy(() => import('./PhotoViewer'));

function Photo({ id }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div>
      <img src={thumbnail(id)} onClick={() => setViewerOpen(true)} />
      {viewerOpen && (
        <Suspense fallback={<Spinner />}>
          <PhotoViewer id={id} onClose={() => setViewerOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
```

**Pattern**: Heavy components only load when needed.

### Prefetching

```jsx
function NavLink({ to, children }) {
  // Prefetch route on hover
  const handleMouseEnter = () => {
    const route = getRouteModule(to);
    route.preload();  // Start downloading bundle
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

**Result**: Route loads instantly when clicked (already prefetched).

## State Management: Relay and Recoil

Meta developed two state management solutions for different use cases.

### Relay: GraphQL State Management

**Use case**: Data fetching and caching

```jsx
function UserProfile({ userId }) {
  const data = useFragment(
    graphql`
      fragment UserProfile_user on User {
        name
        avatar
        friendCount
      }
    `,
    userRef
  );

  return (
    <div>
      <img src={data.avatar} />
      <h1>{data.name}</h1>
      <p>{data.friendCount} friends</p>
    </div>
  );
}
```

**Key features**:
1. **Collocated queries**: Component declares its data needs
2. **Automatic batching**: Multiple queries combined into one request
3. **Normalized cache**: Updates propagate to all components using that data
4. **Type safety**: GraphQL schema generates TypeScript types

**Why Meta needs this**:
- Thousands of components fetching data
- Complex data graphs (users, posts, comments, reactions, etc.)
- Real-time updates
- Offline support

### Recoil: Global State Management

**Use case**: Client-side app state

```jsx
// Atom: Unit of state
const notificationCountState = atom({
  key: 'notificationCount',
  default: 0,
});

// Selector: Derived state
const hasUnreadNotificationsState = selector({
  key: 'hasUnreadNotifications',
  get: ({ get }) => {
    const count = get(notificationCountState);
    return count > 0;
  },
});

// Component: Use state
function NotificationBadge() {
  const [count, setCount] = useRecoilState(notificationCountState);
  const hasUnread = useRecoilValue(hasUnreadNotificationsState);

  return hasUnread ? <Badge count={count} /> : null;
}
```

**Why Recoil over Context**:
1. **Granular updates**: Only components using specific atom re-render
2. **Derived state**: Selectors compute on-demand and cache
3. **Async support**: Atoms can be async (fetch on read)
4. **Time travel**: Built-in support for debugging

**Meta's usage**:
- UI state (modals, tooltips, etc.)
- User preferences
- Draft content (posts being composed)
- Real-time collaboration state

## Performance Patterns

### 1. Intersection Observer for Feed

```jsx
function FeedItem({ post, index }) {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '100px' }  // Start loading 100px before visible
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? (
        <FullFeedItem post={post} />  // Heavy component
      ) : (
        <FeedItemPlaceholder height={calculateHeight(post)} />
      )}
    </div>
  );
}
```

**Result**: Only render feed items when near viewport. Infinite scroll stays fast.

### 2. Virtualization for Long Lists

```jsx
function VirtualizedFeed({ posts }) {
  const [startIndex, setStartIndex] = useState(0);
  const itemHeight = 400;
  const windowHeight = useWindowHeight();
  const visibleCount = Math.ceil(windowHeight / itemHeight) + 2;  // +2 for buffer

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    setStartIndex(newStartIndex);
  };

  const visiblePosts = posts.slice(startIndex, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  return (
    <div onScroll={handleScroll} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: posts.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visiblePosts.map((post, i) => (
            <FeedItem key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Result**: Render only ~10 items instead of 1000. Smooth scrolling.

### 3. Suspense for Data Fetching

```jsx
function ProfilePage({ userId }) {
  return (
    <div>
      <ProfileHeader userId={userId} />  {/* Fast */}
      <Suspense fallback={<TimelineSkeleton />}>
        <ProfileTimeline userId={userId} />  {/* Slow */}
      </Suspense>
      <Suspense fallback={<PhotosSkeleton />}>
        <ProfilePhotos userId={userId} />  {/* Slow */}
      </Suspense>
    </div>
  );
}
```

**Result**: Header shows immediately. Timeline and photos stream in when ready.

### 4. Transition for Expensive Updates

```jsx
function MessengerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value);  // Urgent: update input

    startTransition(() => {
      // Not urgent: filter thousands of conversations
      const filtered = searchConversations(e.target.value);
      setResults(filtered);
    });
  };

  return (
    <>
      <SearchInput value={query} onChange={handleChange} />
      {isPending && <SearchSpinner />}
      <ConversationList conversations={results} />
    </>
  );
}
```

**Result**: Typing stays instant even with 10,000 conversations.

## Real-Time Updates

Meta products are heavily real-time (new posts, messages, reactions).

### Subscription Pattern

```jsx
function Post({ postId }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = subscribeToReactions(postId, (newReaction) => {
      setReactions(prev => [...prev, newReaction]);
    });

    return () => subscription.unsubscribe();
  }, [postId]);

  return (
    <div>
      <PostContent id={postId} />
      <ReactionBar reactions={reactions} />
    </div>
  );
}
```

**Transport**: WebSockets, Server-Sent Events, or GraphQL subscriptions.

### Optimistic Updates

```jsx
function LikeButton({ postId, initialLiked }) {
  const [liked, setLiked] = useState(initialLiked);

  const handleClick = async () => {
    // 1. Optimistic update (instant feedback)
    setLiked(!liked);

    try {
      // 2. Send to server
      await likePost(postId, !liked);
    } catch (error) {
      // 3. Rollback on error
      setLiked(liked);
      showError('Failed to like post');
    }
  };

  return (
    <button onClick={handleClick}>
      {liked ? '❤️ Liked' : '🤍 Like'}
    </button>
  );
}
```

**Result**: UI feels instant even with slow network.

## Error Boundaries and Resilience

Meta's apps are complex. Errors shouldn't crash the entire app.

### Product-Level Error Boundaries

```jsx
function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorPage />}
      onError={(error, errorInfo) => {
        logErrorToService(error, errorInfo);
      }}
    >
      <Navigation />
      <ErrorBoundary fallback={<FeedError />}>
        <Feed />  {/* Feed errors don't crash navigation */}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
```

**Pattern**: Multiple error boundaries at different levels. Failures are isolated.

### Retry Logic

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, errorCount: 0 };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(s => ({ errorCount: s.errorCount + 1 }));
    logError(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.errorCount > 3) {
        return <FatalError />;  // Give up after 3 retries
      }
      return (
        <ErrorFallback onRetry={this.retry} />
      );
    }

    return this.props.children;
  }
}
```

**Result**: Users can retry failed components without refreshing page.

## Internationalization (i18n)

Meta's products support 100+ languages.

### Translation Pattern

```jsx
import { fbt } from 'fbt';

function Welcome({ userName }) {
  return (
    <div>
      <fbt desc="Welcome message">
        Hello, <fbt:param name="userName">{userName}</fbt:param>!
      </fbt>
    </div>
  );
}
```

**Compiled output**:

```jsx
// English
"Hello, {userName}!"

// Spanish
"¡Hola, {userName}!"

// Japanese
"{userName}さん、こんにちは！"
```

**FBT features**:
- Gender/number variations
- Pluralization
- RTL support
- Auto-extraction for translators

### Lazy-Loaded Translations

```jsx
// Only load translations for current locale
const translations = lazy(() => {
  const locale = getUserLocale();  // e.g., 'es_ES'
  return import(`./translations/${locale}.json`);
});

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TranslationsProvider translations={translations}>
        <MainApp />
      </TranslationsProvider>
    </Suspense>
  );
}
```

**Result**: English users don't download Spanish translations (saves ~100kb).

## Accessibility

Meta prioritizes accessibility (screen readers, keyboard navigation, etc.).

### Focus Management

```jsx
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      // Save previously focused element
      const previouslyFocused = document.activeElement;

      // Focus modal
      modalRef.current?.focus();

      // Trap focus in modal
      const handleTab = (e) => {
        if (e.key === 'Tab') {
          trapFocusInModal(e, modalRef.current);
        }
      };
      document.addEventListener('keydown', handleTab);

      return () => {
        // Restore focus when modal closes
        previouslyFocused?.focus();
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);

  return isOpen ? (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
      {children}
    </div>
  ) : null;
}
```

### Semantic HTML

```jsx
function FeedPost({ post }) {
  return (
    <article>  {/* Semantic: This is a self-contained composition */}
      <header>
        <h2>{post.author.name}</h2>
        <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
      </header>
      <p>{post.content}</p>
      <footer>
        <button aria-label={`Like post by ${post.author.name}`}>
          Like
        </button>
      </footer>
    </article>
  );
}
```

## Testing at Scale

### Snapshot Testing

```jsx
// __tests__/FeedPost.test.tsx
import { render } from '@testing-library/react';
import FeedPost from '../FeedPost';

test('renders post correctly', () => {
  const post = {
    id: '123',
    author: { name: 'John' },
    content: 'Hello, world!',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const { container } = render(<FeedPost post={post} />);
  expect(container).toMatchSnapshot();
});
```

**Benefits**:
- Catch unintended visual changes
- Quick to write
- Thousands of components tested

### Integration Testing

```jsx
test('liking a post updates UI', async () => {
  const { getByText, getByLabelText } = render(<FeedPost post={post} />);

  const likeButton = getByLabelText('Like');
  fireEvent.click(likeButton);

  await waitFor(() => {
    expect(getByText('Liked')).toBeInTheDocument();
  });
});
```

### Visual Regression Testing

Meta uses **screenshot diffing** to catch visual bugs:

```jsx
test('renders correctly', async () => {
  const { container } = render(<Component />);

  const screenshot = await takeScreenshot(container);
  expect(screenshot).toMatchImageSnapshot();
  // Compares with baseline image, fails if pixels differ
});
```

## Deployment Strategy

### Gradual Rollout

```jsx
function NewFeature() {
  // Check if user is in experiment group
  const isEnabled = useExperiment('new_feature_rollout');

  if (!isEnabled) {
    return <OldFeature />;
  }

  return <NewFeature />;
}
```

**Process**:
1. Deploy to 1% of users
2. Monitor metrics (errors, performance)
3. Gradually increase to 5%, 10%, 25%, 50%, 100%
4. Rollback if issues detected

### A/B Testing

```jsx
function CommentButton() {
  const variant = useExperiment('comment_button_variant');
  // Variants: 'control', 'variant_a', 'variant_b'

  const buttonText = {
    control: 'Comment',
    variant_a: 'Reply',
    variant_b: '💬 Comment',
  }[variant];

  return <button>{buttonText}</button>;
}
```

**Meta measures**:
- Click-through rate
- Engagement
- Time on site
- Revenue impact

## Key Architectural Decisions

### 1. Component Composition over Props

**❌ Props hell**:

```jsx
<FeedPost
  showLikes={true}
  showComments={true}
  showShares={true}
  likeButtonVariant="primary"
  commentButtonVariant="secondary"
  // ... 20 more props
/>
```

**✅ Composition**:

```jsx
<FeedPost>
  <FeedPost.Header />
  <FeedPost.Content />
  <FeedPost.Actions>
    <LikeButton variant="primary" />
    <CommentButton variant="secondary" />
    <ShareButton />
  </FeedPost.Actions>
</FeedPost>
```

### 2. Hooks over HOCs/Render Props

**Old**:

```jsx
<UserContext.Consumer>
  {user => (
    <PermissionsContext.Consumer>
      {permissions => (
        <ThemeContext.Consumer>
          {theme => (
            <Component user={user} permissions={permissions} theme={theme} />
          )}
        </ThemeContext.Consumer>
      )}
    </PermissionsContext.Consumer>
  )}
</UserContext.Consumer>
```

**Modern**:

```jsx
function Component() {
  const user = useUser();
  const permissions = usePermissions();
  const theme = useTheme();

  return <div>{/* ... */}</div>;
}
```

### 3. Suspense over Loading Props

**Old**:

```jsx
function ProfilePage({ userId }) {
  const { data, loading, error } = useQuery(GET_USER, { variables: { userId } });

  if (loading) return <Spinner />;
  if (error) return <Error />;

  return <Profile user={data.user} />;
}
```

**Modern**:

```jsx
function ProfilePage({ userId }) {
  const user = useQuerySuspense(GET_USER, { variables: { userId } });
  // Suspends if loading, throws if error

  return <Profile user={user} />;
}

// Usage
<Suspense fallback={<Spinner />}>
  <ErrorBoundary fallback={<Error />}>
    <ProfilePage userId={userId} />
  </ErrorBoundary>
</Suspense>
```

## Summary

**Key Takeaways**:

1. **Monorepo** enables atomic changes across massive codebase
2. **Code splitting** keeps bundles small despite large codebase
3. **Relay + Recoil** handle data and state at scale
4. **Performance patterns**: Virtualization, Intersection Observer, Transitions
5. **Real-time** with optimistic updates for instant UX
6. **Error boundaries** isolate failures
7. **i18n** and **a11y** are first-class concerns
8. **Gradual rollouts** and **A/B testing** de-risk deployments

**Meta's React Philosophy**:

1. **Composition over configuration**
2. **Declarative over imperative**
3. **Collocated concerns** (data, styles, logic)
4. **Progressive enhancement**
5. **Measure everything**

These patterns emerged from building products for billions. They're battle-tested and production-ready.

## Further Exploration

**Next steps**:
- Study Relay docs for GraphQL state management
- Explore Recoil for granular global state
- Read Meta Engineering Blog for real-world case studies

**Questions to ponder**:
- How would you architect a similar monorepo for your organization?
- What are the tradeoffs of Relay vs other data fetching solutions?
- How can you apply Meta's performance patterns to your apps?

---

**Module 1 Complete!** You now have the mental models of a React expert. Proceed to the exercises to cement these concepts through practice.
