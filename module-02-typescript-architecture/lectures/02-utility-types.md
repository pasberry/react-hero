# Lecture 2: Advanced Utility Types for React

## Introduction

TypeScript's utility types are powerful tools for transforming and extracting types. This lecture covers building a utility type library for React development.

## Built-in Utility Types

### Essential Utilities

```typescript
// Partial - Make all properties optional
type PartialUser = Partial<User>;
// { name?: string; email?: string; age?: number }

// Required - Make all properties required
type RequiredConfig = Required<Config>;

// Pick - Select specific properties
type UserPreview = Pick<User, 'name' | 'email'>;
// { name: string; email: string }

// Omit - Exclude specific properties
type UserWithoutPassword = Omit<User, 'password'>;

// Record - Create object type with specific keys
type PageInfo = Record<'home' | 'about' | 'contact', { title: string; path: string }>;
```

### React-Specific Utilities

```typescript
import { ComponentProps, ComponentPropsWithoutRef, ElementType } from 'react';

// Extract props from any component
type ButtonProps = ComponentProps<'button'>;
type CustomButtonProps = ComponentProps<typeof CustomButton>;

// Extract props without ref
type DivPropsNoRef = ComponentPropsWithoutRef<'div'>;

// Get return type of component
type ButtonElement = React.ReactElement<typeof Button>;
```

## Custom Utility Types

### ExtractProps - Get props from component

```typescript
type ExtractProps<T> = T extends React.ComponentType<infer P> ? P : never;

// Usage
const MyComponent = (props: { name: string; age: number }) => null;
type MyProps = ExtractProps<typeof MyComponent>;
// { name: string; age: number }
```

### MakeRequired - Require specific props

```typescript
type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

interface FormProps {
  name?: string;
  email?: string;
  phone?: string;
}

type FormWithRequired = MakeRequired<FormProps, 'name' | 'email'>;
// { name: string; email: string; phone?: string }
```

### PropsWithVariant - Discriminated union builder

```typescript
type PropsWithVariant<
  Base,
  Variants extends Record<string, any>
> = Base & {
  [K in keyof Variants]: { variant: K } & Variants[K];
}[keyof Variants];

// Usage
type ButtonProps = PropsWithVariant<
  { className?: string },
  {
    primary: { color: 'blue' | 'red' };
    secondary: { outlined: boolean };
    link: { href: string };
  }
>;

// Results in:
// { className?: string; variant: 'primary'; color: 'blue' | 'red' } |
// { className?: string; variant: 'secondary'; outlined: boolean } |
// { className?: string; variant: 'link'; href: string }
```

### DeepPartial - Recursive partial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface Config {
  api: {
    baseUrl: string;
    timeout: number;
    headers: {
      authorization: string;
    };
  };
}

type PartialConfig = DeepPartial<Config>;
// All properties at all levels are optional
```

### StrictOmit - Type-safe omit

```typescript
type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Unlike Omit, this catches typos:
interface User {
  name: string;
  email: string;
}

type Bad = Omit<User, 'namee'>; // ❌ No error, but typo!
type Good = StrictOmit<User, 'namee'>; // ✅ Type error - 'namee' doesn't exist
```

## Form Utilities

### FieldConfig - Type-safe form fields

```typescript
type FieldConfig<T> = {
  [K in keyof T]-?: {
    name: K;
    label: string;
    type: 'text' | 'email' | 'number' | 'select';
    required: boolean;
    validate?: (value: T[K]) => string | undefined;
  };
}[keyof T][];

interface UserForm {
  name: string;
  email: string;
  age: number;
}

const fields: FieldConfig<UserForm> = [
  {
    name: 'name', // Autocompletes with 'name' | 'email' | 'age'
    label: 'Full Name',
    type: 'text',
    required: true,
    validate: (value) => value.length < 2 ? 'Too short' : undefined,
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    required: true,
  },
];
```

### FormState - Infer form state from schema

```typescript
type FormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
};

type UserFormState = FormState<UserForm>;
// {
//   values: UserForm;
//   errors: { name?: string; email?: string; age?: string };
//   touched: { name?: boolean; email?: boolean; age?: boolean };
//   isSubmitting: boolean;
// }
```

## Event Handler Utilities

### StrictEventHandler - Type-safe event handlers

```typescript
type StrictEventHandler<
  E extends React.SyntheticEvent,
  T = void
> = (event: E) => T;

type InputChangeHandler = StrictEventHandler<
  React.ChangeEvent<HTMLInputElement>,
  void
>;

type FormSubmitHandler<T> = StrictEventHandler<
  React.FormEvent<HTMLFormElement>,
  Promise<T>
>;

// Usage
const handleChange: InputChangeHandler = (e) => {
  console.log(e.target.value); // Fully typed!
};

const handleSubmit: FormSubmitHandler<User> = async (e) => {
  e.preventDefault();
  return await createUser(/* ... */);
};
```

## Component Prop Utilities

### InheritProps - Extend native element props

```typescript
type InheritProps<
  T extends ElementType,
  P = {}
> = P & Omit<ComponentPropsWithoutRef<T>, keyof P>;

interface CustomInputProps {
  label: string;
  error?: string;
}

type InputProps = InheritProps<'input', CustomInputProps>;

// Results in:
// {
//   label: string;
//   error?: string;
//   // + all input props except ones defined above
//   type?: string;
//   value?: string;
//   onChange?: ChangeEventHandler;
//   // ... etc
// }
```

### AsProps - Polymorphic component helper

```typescript
type AsProps<T extends ElementType> = {
  as?: T;
} & ComponentPropsWithoutRef<T>;

function Heading<T extends ElementType = 'h1'>({
  as,
  ...props
}: AsProps<T>) {
  const Component = as || 'h1';
  return <Component {...props} />;
}

// Usage
<Heading>Default h1</Heading>
<Heading as="h2">H2 heading</Heading>
<Heading as="div" onClick={() => {}}>Div heading</Heading>
```

## Hook Return Type Utilities

### UseStateReturn - Type useState returns

```typescript
type UseStateReturn<T> = [T, React.Dispatch<React.SetStateAction<T>>];

// Better: Infer from actual useState
type InferUseState<T> = ReturnType<typeof useState<T>>;

// Usage in custom hook
function useToggle(initial = false): UseStateReturn<boolean> {
  return useState(initial);
}

const [isOpen, setIsOpen] = useToggle(); // Fully typed!
```

### AsyncState - Type async state patterns

```typescript
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

type UseAsyncReturn<T, E = Error> = [
  AsyncState<T, E>,
  (promise: Promise<T>) => Promise<void>
];

function useAsync<T>(): UseAsyncReturn<T> {
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
```

## API Response Utilities

### ApiResponse - Type API responses

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}>;

// Usage
async function getUsers(page: number): Promise<PaginatedResponse<User>> {
  const res = await fetch(`/api/users?page=${page}`);
  return res.json();
}
```

### Unwrap - Extract data from wrapper types

```typescript
type Unwrap<T> =
  T extends Promise<infer U> ? U :
  T extends Array<infer U> ? U :
  T extends { data: infer U } ? U :
  T;

type PromiseData = Unwrap<Promise<User>>; // User
type ArrayData = Unwrap<User[]>; // User
type ResponseData = Unwrap<{ data: User }>; // User
```

## Building a Utility Library

Create a reusable type utility library:

```typescript
// types/utils.ts
export type {
  // Component utilities
  InheritProps,
  AsProps,
  ExtractProps,
  PropsWithVariant,

  // Form utilities
  FormState,
  FieldConfig,

  // Async utilities
  AsyncState,
  ApiResponse,

  // General utilities
  DeepPartial,
  StrictOmit,
  MakeRequired,
};

// Usage across your app
import type { FormState, InheritProps } from '@/types/utils';
```

## Summary

**Key Utility Types**:

1. **Component Props**: ExtractProps, InheritProps, AsProps
2. **Forms**: FormState, FieldConfig
3. **Async**: AsyncState, ApiResponse
4. **Transformations**: DeepPartial, MakeRequired, StrictOmit
5. **Safety**: StrictEventHandler, discriminated unions

**Pro Tip**: Build these utilities once, reuse across all projects.

**Next**: Lecture 3 covers state machines with TypeScript.
