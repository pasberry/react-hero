# Lecture 5: TypeScript Pitfalls in React

## Introduction

Even experienced developers make TypeScript mistakes in React. This lecture covers common pitfalls and how to avoid them.

## Pitfall 1: Any Escape Hatches

### The Problem

```typescript
// ❌ Bad: any defeats the purpose of TypeScript
function handleChange(e: any) {
  setQuery(e.target.value);
}

const data: any = await fetch('/api/users');
```

### The Solution

```typescript
// ✅ Good: Precise types
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setQuery(e.target.value);
}

interface ApiResponse {
  users: User[];
}
const data: ApiResponse = await fetch('/api/users').then(r => r.json());
```

### When `any` is Acceptable

```typescript
// ✅ OK: Truly dynamic data from third-party
const dynamicData: any = JSON.parse(userInput);

// But immediately validate and narrow
if (isValidUser(dynamicData)) {
  const user: User = dynamicData; // Now typed
}
```

## Pitfall 2: Incorrect Event Types

### The Problem

```typescript
// ❌ Wrong: Generic event type
const handleClick = (e: Event) => {};
const handleChange = (e: ChangeEvent) => {}; // Missing generic param
```

### The Solution

```typescript
// ✅ Correct: React-specific event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.disabled); // Fully typed!
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value); // Typed as string
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // currentTarget is HTMLFormElement
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    // ...
  }
};
```

## Pitfall 3: Ref Typing Errors

### The Problem

```typescript
// ❌ Wrong: Ref without initial value
const ref = useRef<HTMLDivElement>();

// Later...
ref.current.focus(); // Error: Object is possibly undefined
```

### The Solution

```typescript
// ✅ Correct: Ref with null initial value
const ref = useRef<HTMLDivElement>(null);

// Use with null check
useEffect(() => {
  if (ref.current) {
    ref.current.focus(); // Safe!
  }
}, []);

// Or use non-null assertion if you're certain
useEffect(() => {
  ref.current!.focus(); // Use sparingly!
}, []);
```

### Mutable Refs

```typescript
// For storing mutable values (not DOM refs)
const countRef = useRef<number>(0); // No null needed
countRef.current = 5; // Always defined
```

## Pitfall 4: Children Typing

### The Problem

```typescript
// ❌ Too restrictive
interface Props {
  children: React.ReactElement; // Only single element
}

<Component>
  <div>First</div>
  <div>Second</div> {/* Error: children must be single element */}
</Component>
```

### The Solution

```typescript
// ✅ Use ReactNode for flexibility
interface Props {
  children: React.ReactNode; // Allows anything
}

// ✅ Or be specific when needed
interface StrictProps {
  children: React.ReactElement<typeof SpecificComponent>;
}

// ✅ Render prop pattern
interface RenderProps {
  children: (data: User) => React.ReactNode;
}
```

## Pitfall 5: Generic Component Props

### The Problem

```typescript
// ❌ Wrong: Type parameter shadows component props
function Table<T>(props: { data: T[] }) {
  // TypeScript doesn't infer T from usage
}

<Table data={users} /> // T is unknown!
```

### The Solution

```typescript
// ✅ Correct: Constrain generic
function Table<T extends { id: string | number }>(
  props: { data: T[]; onRowClick: (row: T) => void }
) {
  // T is inferred from props!
}

<Table
  data={users}
  onRowClick={(user) => console.log(user.name)} // user is User!
/>
```

## Pitfall 6: Component Type Exports

### The Problem

```typescript
// ❌ Exporting component without props type
export default function Button(props: { text: string }) {
  return <button>{props.text}</button>;
}

// Consumers can't easily get props type
```

### The Solution

```typescript
// ✅ Export both component and props type
export interface ButtonProps {
  text: string;
  variant?: 'primary' | 'secondary';
}

export function Button({ text, variant }: ButtonProps) {
  return <button className={variant}>{text}</button>;
}

// Or extract from component
import { ComponentProps } from 'react';
type ButtonProps = ComponentProps<typeof Button>;
```

## Pitfall 7: setState with Derived State

### The Problem

```typescript
// ❌ Wrong: Type doesn't match state
const [user, setUser] = useState<User | null>(null);

// Later...
setUser({ name: 'John' }); // Error: Missing properties!
```

### The Solution

```typescript
// ✅ Correct: Complete object
setUser({ id: 1, name: 'John', email: 'john@example.com' });

// ✅ Or use updater function
setUser(prev => prev ? { ...prev, name: 'John' } : null);

// ✅ Or Partial type for updates
const [user, setUser] = useState<User | null>(null);

const updateUser = (updates: Partial<User>) => {
  setUser(prev => prev ? { ...prev, ...updates } : null);
};

updateUser({ name: 'John' }); // Only name updated
```

## Pitfall 8: Props Spreading

### The Problem

```typescript
// ❌ Loses type safety
function Button({ className, ...rest }: any) {
  return <button className={className} {...rest} />;
}
```

### The Solution

```typescript
// ✅ Proper rest props typing
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

function Button({ variant, className, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn-${variant} ${className || ''}`}
      {...rest}
    />
  );
}

// All button props are typed!
<Button onClick={() => {}} disabled={true} variant="primary" />
```

## Pitfall 9: Async Event Handlers

### The Problem

```typescript
// ❌ Event handler can't be async directly
<form onSubmit={async (e) => {
  e.preventDefault();
  await submitForm();
}} />
```

### The Solution

```typescript
// ✅ Wrap async logic
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  await submitForm();
};

<form onSubmit={(e) => { handleSubmit(e); }} />

// Or
<form onSubmit={handleSubmit} />

// Or use void operator (not recommended)
<form onSubmit={async (e) => void await handleSubmit(e)} />
```

## Pitfall 10: Context Default Values

### The Problem

```typescript
// ❌ Undefined default value
const MyContext = React.createContext<MyContextType>(undefined);
// Type error: undefined not assignable to MyContextType
```

### The Solution

```typescript
// ✅ Option 1: Make context nullable
const MyContext = React.createContext<MyContextType | undefined>(undefined);

function useMyContext() {
  const context = React.useContext(MyContext);
  if (context === undefined) {
    throw new Error('useMyContext must be used within Provider');
  }
  return context;
}

// ✅ Option 2: Use non-null assertion (if you control usage)
const MyContext = React.createContext<MyContextType>(null as unknown as MyContextType);

// ✅ Option 3: Provide sensible defaults
const MyContext = React.createContext<MyContextType>({
  user: null,
  login: () => Promise.resolve(),
  logout: () => {},
});
```

## Pitfall 11: Third-Party Library Types

### The Problem

```typescript
// ❌ Library without types
import SomeLibrary from 'some-library';
// Implicit any
```

### The Solution

```typescript
// ✅ Option 1: Install @types package
npm install --save-dev @types/some-library

// ✅ Option 2: Declare module types
declare module 'some-library' {
  export function someFunction(arg: string): number;
}

// ✅ Option 3: Create .d.ts file
// types/some-library.d.ts
declare module 'some-library' {
  interface SomeType {
    id: number;
    name: string;
  }
  export default SomeType;
}
```

## Pitfall 12: Enum vs Union Types

### The Problem

```typescript
// ❌ Enums can cause issues
enum Color {
  Red,
  Green,
  Blue,
}

// Numeric enums can be error-prone
const color: Color = 999; // No error!
```

### The Solution

```typescript
// ✅ Use const objects or union types
const Color = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
} as const;

type Color = typeof Color[keyof typeof Color];
// 'red' | 'green' | 'blue'

// Or simple union
type Color = 'red' | 'green' | 'blue';
```

## Strict Mode Configuration

### Enable Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional helpful flags
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Summary

**Common Pitfalls**:

1. ❌ Using `any` instead of specific types
2. ❌ Wrong event types (Event vs React.MouseEvent)
3. ❌ Ref without null handling
4. ❌ Too restrictive children types
5. ❌ Generic components without constraints
6. ❌ Not exporting props types
7. ❌ Incomplete setState updates
8. ❌ Unsafe props spreading
9. ❌ Async event handlers
10. ❌ Undefined context defaults
11. ❌ Missing third-party types
12. ❌ Enums instead of unions

**Best Practices**:

✅ Enable strict mode in tsconfig.json
✅ Use React-specific event types
✅ Handle null/undefined explicitly
✅ Export props types
✅ Use union types over enums
✅ Type third-party libraries
✅ Never use `any` without good reason

**Module Complete!** Proceed to exercises to practice these patterns.
