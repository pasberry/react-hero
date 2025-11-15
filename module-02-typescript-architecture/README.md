# Module 2: TypeScript for React Architecture

## 🎯 Module Overview

Master TypeScript patterns that create robust, maintainable React architectures. This module goes beyond basic typing to advanced patterns used in production codebases.

### Learning Objectives

✅ Design type-safe component contracts
✅ Model complex UI state with discriminated unions
✅ Build powerful utility types for React patterns
✅ Create fully typed custom hooks
✅ Avoid common TypeScript pitfalls in React

### Time Estimate

- **Lectures**: 3-4 hours
- **Exercises**: 4-6 hours
- **Total**: 7-10 hours

---

## 📚 Lectures

### 1. Component Contracts with TypeScript

Deep dive into designing component APIs with types:

**Topics**:
- Props interface design
- Children typing (`ReactNode` vs `ReactElement`)
- Generic components
- Render props patterns
- Component composition types

**Example**:

```typescript
// Generic data table
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  renderRow?: (row: T) => ReactNode;
}

function Table<T extends { id: string }>({ data, columns, onRowClick }: TableProps<T>) {
  // Fully type-safe implementation
}

// Usage
<Table
  data={users}  // User[]
  columns={userColumns}  // Column<User>[]
  onRowClick={(user) => {/* user is User type */}}
/>
```

---

### 2. Advanced Utility Types

Build powerful type utilities for React:

**Topics**:
- Extracting component props: `ComponentProps<typeof Component>`
- Props with requirements: `Required<Pick<Props, 'name'>>`
- Conditional props: `PropsWithChildren<{ variant: 'a' } | { variant: 'b', special: string }>`
- Polymorphic components with `as` prop

**Example**:

```typescript
// Polymorphic button that can be button, a, or any element
type ButtonProps<T extends React.ElementType> = {
  as?: T;
  variant?: 'primary' | 'secondary';
} & React.ComponentPropsWithoutRef<T>;

function Button<T extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  return <Component className={variant} {...props} />;
}

// Usage
<Button>Click</Button>  // renders <button>
<Button as="a" href="/home">Link</Button>  // renders <a> with href typed!
```

---

### 3. State Machines with TypeScript

Model complex UI states to eliminate impossible states:

**Topics**:
- Discriminated unions for state
- Type-safe state transitions
- XState with TypeScript
- Finite state machines in React

**Example**:

```typescript
// Model async operation states
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

function useAsync<T>(): [
  AsyncState<T>,
  (promise: Promise<T>) => void
] {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });

  const execute = async (promise: Promise<T>) => {
    setState({ status: 'loading' });
    try {
      const data = await promise;
      setState({ status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error: error as Error });
    }
  };

  return [state, execute];
}

// Usage - impossible states eliminated!
const [state, execute] = useAsync<User>();

if (state.status === 'success') {
  state.data; // TypeScript knows this exists
}
if (state.status === 'loading') {
  state.data; // TypeScript error - data doesn't exist in loading state
}
```

---

### 4. Typed Custom Hooks

Build reusable, type-safe hooks:

**Topics**:
- Generic hooks
- Hook return type inference
- Overloaded hooks (different signatures based on args)
- Typed context hooks

**Example**:

```typescript
// Overloaded useField hook
function useField(name: string, required: true): [string, (v: string) => void, string?];
function useField(name: string, required?: false): [string | undefined, (v: string) => void, string?];
function useField(name: string, required = false) {
  const [value, setValue] = useState<string>();
  const [error, setError] = useState<string>();

  const handleChange = (v: string) => {
    if (required && !v) {
      setError('Required');
    } else {
      setError(undefined);
    }
    setValue(v);
  };

  return [value, handleChange, error];
}

// Usage
const [email, setEmail, error] = useField('email', true);
// email is string (never undefined because required=true)

const [bio, setBio] = useField('bio');
// bio is string | undefined (optional field)
```

---

### 5. TypeScript Pitfalls in React

Common mistakes and how to avoid them:

**Topics**:
- `any` escape hatches and alternatives
- Event handler types (`React.ChangeEvent` vs `ChangeEvent`)
- Ref typing (`useRef<HTMLDivElement>(null)`)
- Context typing pitfalls
- Third-party library types

**Example**:

```typescript
// ❌ Wrong - forces null check everywhere
const ref = useRef<HTMLDivElement>();

// ✅ Correct - null is expected initially
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (ref.current) {
    ref.current.focus();  // Type-safe!
  }
}, []);

// ❌ Wrong - too loose
const handleChange = (e: any) => setQuery(e.target.value);

// ✅ Correct - precise type
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setQuery(e.target.value);
};
```

---

## 🛠️ Exercises

### Exercise 1: Fully Typed Form System

Build a type-safe form library with validation.

**Features**:
- Generic form type: `Form<TSchema>`
- Type-safe field access
- Inferred validation types
- Type-safe submit handler

**Acceptance Criteria**:
- Fields autocomplete based on schema
- Validation errors are typed
- Submit receives fully typed data
- No `any` types

**Time**: 3-4 hours

---

### Exercise 2: State Machine for Multi-Step Flow

Model a complex multi-step wizard (e.g., checkout) using state machines.

**Features**:
- Each step has different data
- Type-safe transitions
- Can't skip required steps
- Back/forward navigation

**Acceptance Criteria**:
- Impossible states eliminated
- TypeScript catches invalid transitions
- State is serializable
- Fully typed at every step

**Time**: 2-3 hours

---

## 🎯 Key Patterns

### 1. Discriminated Unions for Props

```typescript
// ❌ Weak - can have invalid combinations
type ButtonProps = {
  variant: 'link' | 'button';
  href?: string;  // Required for link, invalid for button
  onClick?: () => void;  // Required for button, invalid for link
};

// ✅ Strong - impossible states eliminated
type ButtonProps =
  | { variant: 'link'; href: string }
  | { variant: 'button'; onClick: () => void };
```

### 2. Extract Props from Components

```typescript
import { ComponentProps } from 'react';

// Extract props from native element
type DivProps = ComponentProps<'div'>;

// Extract props from component
type MyButtonProps = ComponentProps<typeof MyButton>;

// Modify extracted props
type CustomDivProps = Omit<DivProps, 'onClick'> & {
  onClick: (id: string) => void;  // More specific onClick
};
```

### 3. Strict Null Checks

```typescript
// Enable in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}

// Forces explicit null handling
const user: User | null = getUser();

user.name;  // Error: Object is possibly null

if (user) {
  user.name;  // OK - narrowed to User
}
```

---

## 📈 Learning Outcomes

After this module, you will:

✅ Design rock-solid component APIs with TypeScript
✅ Eliminate entire classes of runtime errors
✅ Build self-documenting code through types
✅ Create reusable type utilities
✅ Model complex state safely with discriminated unions

---

## 🔜 Next Module

Proceed to [Module 3: Next.js App Router + Server Components](../module-03-nextjs-app-router) to apply these TypeScript skills to building production Next.js apps.
