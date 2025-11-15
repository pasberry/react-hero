# Lecture 3: State Machines with TypeScript

## Introduction

State machines eliminate impossible states by modeling all valid states explicitly. TypeScript makes state machines type-safe and self-documenting.

## The Problem: Impossible States

```typescript
// ❌ Bad: Allows impossible combinations
interface BadAsyncState {
  isLoading: boolean;
  isError: boolean;
  data?: User;
  error?: Error;
}

// Impossible states:
const impossible1 = { isLoading: true, isError: true, data: user };
const impossible2 = { isLoading: false, isError: false, data: user, error: err };
```

## The Solution: Discriminated Unions

```typescript
// ✅ Good: Only valid states possible
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Impossible states are now type errors!
```

## Building a State Machine Type

```typescript
type State = 'idle' | 'loading' | 'success' | 'error';
type Event = 'FETCH' | 'RESOLVE' | 'REJECT' | 'RESET';

type StateMachine<S extends string, E extends string> = {
  state: S;
  transition: (event: E) => S;
};

// Define valid transitions
type Transitions = {
  idle: { FETCH: 'loading' };
  loading: { RESOLVE: 'success'; REJECT: 'error' };
  success: { RESET: 'idle'; FETCH: 'loading' };
  error: { RESET: 'idle'; FETCH: 'loading' };
};

type ValidTransition<
  CurrentState extends State,
  E extends Event
> = E extends keyof Transitions[CurrentState]
  ? Transitions[CurrentState][E]
  : never;
```

## Practical Example: Form State Machine

```typescript
type FormState =
  | { status: 'editing'; values: FormValues; errors: {} }
  | { status: 'validating'; values: FormValues }
  | { status: 'submitting'; values: FormValues }
  | { status: 'success'; submittedValues: FormValues }
  | { status: 'error'; values: FormValues; error: string };

type FormEvent =
  | { type: 'CHANGE'; field: string; value: any }
  | { type: 'SUBMIT' }
  | { type: 'VALIDATION_SUCCESS' }
  | { type: 'VALIDATION_ERROR'; errors: Record<string, string> }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

function formReducer(state: FormState, event: FormEvent): FormState {
  switch (state.status) {
    case 'editing':
      switch (event.type) {
        case 'CHANGE':
          return {
            ...state,
            values: { ...state.values, [event.field]: event.value },
          };
        case 'SUBMIT':
          return { status: 'validating', values: state.values };
        default:
          return state;
      }

    case 'validating':
      switch (event.type) {
        case 'VALIDATION_SUCCESS':
          return { status: 'submitting', values: state.values };
        case 'VALIDATION_ERROR':
          return {
            status: 'editing',
            values: state.values,
            errors: event.errors,
          };
        default:
          return state;
      }

    case 'submitting':
      switch (event.type) {
        case 'SUBMIT_SUCCESS':
          return { status: 'success', submittedValues: state.values };
        case 'SUBMIT_ERROR':
          return {
            status: 'error',
            values: state.values,
            error: event.error,
          };
        default:
          return state;
      }

    case 'success':
      return event.type === 'RESET'
        ? { status: 'editing', values: {}, errors: {} }
        : state;

    case 'error':
      return event.type === 'RESET'
        ? { status: 'editing', values: state.values, errors: {} }
        : state;
  }
}
```

## React Hook Integration

```typescript
function useFormMachine(initialValues: FormValues) {
  const [state, dispatch] = useReducer(formReducer, {
    status: 'editing',
    values: initialValues,
    errors: {},
  });

  const handleChange = (field: string, value: any) => {
    dispatch({ type: 'CHANGE', field, value });
  };

  const handleSubmit = async () => {
    dispatch({ type: 'SUBMIT' });

    // Validate
    const errors = validate(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'VALIDATION_ERROR', errors });
      return;
    }

    dispatch({ type: 'VALIDATION_SUCCESS' });

    // Submit
    try {
      await submitForm(state.values);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatch({ type: 'SUBMIT_ERROR', error: String(error) });
    }
  };

  return { state, handleChange, handleSubmit };
}

// Usage
function MyForm() {
  const { state, handleChange, handleSubmit } = useFormMachine({
    email: '',
    password: '',
  });

  if (state.status === 'success') {
    return <div>Form submitted successfully!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={state.status === 'editing' ? state.values.email : ''}
        onChange={(e) => handleChange('email', e.target.value)}
        disabled={state.status === 'submitting'}
      />
      {state.status === 'error' && <div>{state.error}</div>}
      <button disabled={state.status === 'submitting'}>
        {state.status === 'submitting' ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

## XState Integration

```typescript
import { createMachine, assign } from 'xstate';
import { useMachine } from '@xstate/react';

interface FetchContext {
  data?: User[];
  error?: string;
}

type FetchEvent =
  | { type: 'FETCH' }
  | { type: 'RESOLVE'; data: User[] }
  | { type: 'REJECT'; error: string }
  | { type: 'RETRY' };

const fetchMachine = createMachine<FetchContext, FetchEvent>({
  id: 'fetch',
  initial: 'idle',
  context: {},
  states: {
    idle: {
      on: { FETCH: 'loading' },
    },
    loading: {
      on: {
        RESOLVE: {
          target: 'success',
          actions: assign({ data: (_, event) => event.data }),
        },
        REJECT: {
          target: 'error',
          actions: assign({ error: (_, event) => event.error }),
        },
      },
    },
    success: {
      on: { FETCH: 'loading' },
    },
    error: {
      on: {
        RETRY: 'loading',
        FETCH: 'loading',
      },
    },
  },
});

// Usage
function DataFetcher() {
  const [state, send] = useMachine(fetchMachine);

  useEffect(() => {
    if (state.matches('loading')) {
      fetchUsers()
        .then((data) => send({ type: 'RESOLVE', data }))
        .catch((error) => send({ type: 'REJECT', error: String(error) }));
    }
  }, [state]);

  if (state.matches('success')) {
    return <UserList users={state.context.data!} />;
  }

  if (state.matches('error')) {
    return (
      <div>
        Error: {state.context.error}
        <button onClick={() => send('RETRY')}>Retry</button>
      </div>
    );
  }

  return <div>Loading...</div>;
}
```

## Multi-Step Wizard State Machine

```typescript
type WizardState =
  | { step: 'personal'; data: Partial<WizardData> }
  | { step: 'address'; data: PersonalData }
  | { step: 'payment'; data: PersonalData & AddressData }
  | { step: 'review'; data: CompleteData }
  | { step: 'complete'; submittedData: CompleteData };

type WizardEvent =
  | { type: 'NEXT'; data: any }
  | { type: 'BACK' }
  | { type: 'SUBMIT' };

function wizardReducer(
  state: WizardState,
  event: WizardEvent
): WizardState {
  switch (state.step) {
    case 'personal':
      return event.type === 'NEXT'
        ? { step: 'address', data: { ...state.data, ...event.data } as PersonalData }
        : state;

    case 'address':
      if (event.type === 'NEXT') {
        return {
          step: 'payment',
          data: { ...state.data, ...event.data } as PersonalData & AddressData,
        };
      }
      if (event.type === 'BACK') {
        return { step: 'personal', data: state.data };
      }
      return state;

    case 'payment':
      if (event.type === 'NEXT') {
        return {
          step: 'review',
          data: { ...state.data, ...event.data } as CompleteData,
        };
      }
      if (event.type === 'BACK') {
        return { step: 'address', data: state.data };
      }
      return state;

    case 'review':
      if (event.type === 'SUBMIT') {
        return { step: 'complete', submittedData: state.data };
      }
      if (event.type === 'BACK') {
        return { step: 'payment', data: state.data };
      }
      return state;

    case 'complete':
      return state; // Terminal state
  }
}
```

## Summary

**State Machine Benefits**:

1. **Impossible states eliminated** - TypeScript enforces valid states
2. **Clear transitions** - Explicit event handling
3. **Self-documenting** - State machine is the documentation
4. **Testable** - Easy to test all state transitions
5. **Maintainable** - Changes are localized

**When to Use State Machines**:
- Multi-step flows (wizards, checkouts)
- Complex async operations
- Forms with validation
- UI with many states

**Next**: Lecture 4 covers typed custom hooks.
