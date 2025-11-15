# Lecture 4: Typed Custom Hooks

## Introduction

Custom hooks are reusable stateful logic. TypeScript makes hooks type-safe, self-documenting, and prevents common errors.

## Basic Hook Typing

```typescript
// Simple typed hook
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);

  return { count, increment, decrement, reset };
}

// TypeScript infers the return type automatically!
const { count, increment } = useCounter(10);
// count: number
// increment: () => void
```

## Generic Hooks

```typescript
// Generic hook for arrays
function useArray<T>(initialValue: T[] = []) {
  const [array, setArray] = useState<T[]>(initialValue);

  const push = (item: T) => setArray(arr => [...arr, item]);
  const remove = (index: number) => setArray(arr => arr.filter((_, i) => i !== index));
  const clear = () => setArray([]);

  return { array, push, remove, clear };
}

// Usage - T is inferred from initial value
const users = useArray([{ id: 1, name: 'John' }]);
users.push({ id: 2, name: 'Jane' }); // ✅ Typed!
users.push({ id: 3, age: 30 }); // ❌ Type error
```

## Overloaded Hooks

Different signatures based on arguments:

```typescript
// useField with required flag
function useField(name: string, required: true): [string, (v: string) => void, string?];
function useField(name: string, required?: false): [string | undefined, (v: string) => void, string?];
function useField(name: string, required = false) {
  const [value, setValue] = useState<string | undefined>(required ? '' : undefined);
  const [error, setError] = useState<string>();

  const handleChange = (v: string) => {
    if (required && !v) {
      setError('This field is required');
    } else {
      setError(undefined);
    }
    setValue(v);
  };

  return [value, handleChange, error] as const;
}

// Usage
const [email, setEmail, emailError] = useField('email', true);
// email: string (never undefined!)

const [bio, setBio] = useField('bio');
// bio: string | undefined
```

## Discriminated Union Returns

```typescript
type UseAsyncReturn<T> =
  | { status: 'idle'; execute: (promise: Promise<T>) => void }
  | { status: 'loading'; execute: (promise: Promise<T>) => void }
  | { status: 'success'; data: T; execute: (promise: Promise<T>) => void }
  | { status: 'error'; error: Error; execute: (promise: Promise<T>) => void };

function useAsync<T>(): UseAsyncReturn<T> {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error }
  >({ status: 'idle' });

  const execute = async (promise: Promise<T>) => {
    setState({ status: 'loading' });
    try {
      const data = await promise;
      setState({ status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error: error as Error });
    }
  };

  return { ...state, execute } as UseAsyncReturn<T>;
}

// Usage
const result = useAsync<User[]>();

if (result.status === 'success') {
  result.data.map(user => user.name); // data exists and is typed!
}
```

## Typed Context Hooks

```typescript
// Create type-safe context hook
function createContext<T>(displayName: string) {
  const Context = React.createContext<T | undefined>(undefined);
  Context.displayName = displayName;

  function useContext() {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(`use${displayName} must be used within ${displayName}Provider`);
    }
    return context;
  }

  return [Context.Provider, useContext] as const;
}

// Usage
interface AuthContext {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const [AuthProvider, useAuth] = createContext<AuthContext>('Auth');

// In app
function App() {
  const auth = useAuth(); // Fully typed, throws if used outside provider
  return <div>{auth.user?.name}</div>;
}
```

## Ref Hooks

```typescript
// Typed ref with callback
function useCallbackRef<T>(callback: (node: T) => void) {
  const [node, setNode] = useState<T | null>(null);

  const ref = useCallback((node: T | null) => {
    if (node) {
      callback(node);
      setNode(node);
    }
  }, [callback]);

  return [node, ref] as const;
}

// Usage
const [element, ref] = useCallbackRef<HTMLDivElement>((el) => {
  console.log('Element mounted:', el.offsetWidth);
});

<div ref={ref}>Content</div>
```

## Form Hook

```typescript
interface UseFormConfig<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (field: keyof T) => (value: T[keyof T]) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  isValid: boolean;
}

function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormConfig<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T) => (value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (touched[field] && validate) {
      const fieldErrors = validate({ ...values, [field]: value });
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  const handleBlur = (field: keyof T) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (validate) {
      const fieldErrors = validate(values);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<keyof T, boolean>>
    );
    setTouched(allTouched);

    // Validate
    if (validate) {
      const errors = validate(values);
      setErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }

    // Submit
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValid,
  };
}

// Usage
interface LoginForm {
  email: string;
  password: string;
}

function LoginForm() {
  const form = useForm<LoginForm>({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errors: Partial<Record<keyof LoginForm, string>> = {};
      if (!values.email) errors.email = 'Required';
      if (!values.password) errors.password = 'Required';
      return errors;
    },
    onSubmit: async (values) => {
      await login(values.email, values.password);
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <input
        value={form.values.email}
        onChange={(e) => form.handleChange('email')(e.target.value)}
        onBlur={form.handleBlur('email')}
      />
      {form.touched.email && form.errors.email && (
        <span>{form.errors.email}</span>
      )}
      {/* ... */}
    </form>
  );
}
```

## Data Fetching Hook

```typescript
interface UseFetchConfig<T> {
  url: string;
  options?: RequestInit;
  transform?: (data: any) => T;
}

type UseFetchReturn<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useFetch<T = any>(config: UseFetchConfig<T>): UseFetchReturn<T> {
  const [state, setState] = useState<UseFetchReturn<T>>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setState({ status: 'loading' });
      try {
        const response = await fetch(config.url, config.options);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        if (!cancelled) {
          setState({
            status: 'success',
            data: config.transform ? config.transform(data) : data,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ status: 'error', error: error as Error });
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [config.url]);

  return state;
}

// Usage
const result = useFetch<User[]>({
  url: '/api/users',
  transform: (data) => data.users,
});

if (result.status === 'success') {
  result.data.forEach(user => console.log(user.name));
}
```

## Local Storage Hook

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Usage
const [user, setUser] = useLocalStorage<User | null>('user', null);
```

## Summary

**Key Patterns**:

1. **Generic hooks** - Adapt to data types
2. **Overloaded signatures** - Different types based on args
3. **Discriminated unions** - Type-safe state returns
4. **Type-safe context** - Enforces provider usage
5. **Form hooks** - Fully typed form handling

**Best Practices**:
- Let TypeScript infer when possible
- Use `as const` for tuple returns
- Discriminated unions for complex state
- Generic constraints for flexibility

**Next**: Lecture 5 covers TypeScript pitfalls in React.
