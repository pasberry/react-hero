# Lecture 1: Component Contracts with TypeScript

## Introduction

TypeScript transforms React development from runtime guessing to compile-time guarantees. This lecture covers designing robust component APIs using TypeScript's type system.

## Core Principle: Props are Contracts

Every component defines a contract with its consumers:

```typescript
// This contract says:
// - variant is required and must be one of these strings
// - size is optional
// - children is required
// - onClick is optional but must match this signature
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function Button({ variant, size = 'medium', children, onClick }: ButtonProps) {
  return (
    <button
      className={`btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// TypeScript enforces the contract:
<Button variant="primary">Click me</Button> // ✅
<Button variant="custom">Click me</Button> // ❌ Type error
<Button>Click me</Button> // ❌ Missing required variant
```

## Children Typing: ReactNode vs ReactElement

```typescript
// ReactNode: Most permissive (strings, numbers, elements, arrays, null)
type Props1 = {
  children: React.ReactNode;
};

// ReactElement: Must be React elements only
type Props2 = {
  children: React.ReactElement;
};

// Specific element type
type Props3 = {
  children: React.ReactElement<typeof SpecificComponent>;
};

// Render function
type Props4 = {
  children: (data: User) => React.ReactNode;
};

// Example usage:
function Container({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

<Container>Hello</Container> // ✅ String works
<Container><div>Hello</div></Container> // ✅ Element works
<Container>{null}</Container> // ✅ Null works

function StrictContainer({ children }: { children: React.ReactElement }) {
  return <div>{children}</div>;
}

<StrictContainer>Hello</StrictContainer> // ❌ String doesn't work
<StrictContainer><div>Hello</div></StrictContainer> // ✅ Element works
```

## Generic Components

Build reusable components that adapt to their data:

```typescript
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface TableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

function Table<T extends { id: string | number }>({
  data,
  columns,
  onRowClick
}: TableProps<T>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map(col => (
              <td key={String(col.key)}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key])
                }
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Type-safe usage:
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const userColumns: Column<User>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  {
    key: 'age',
    header: 'Age',
    render: (age) => `${age} years old`
  },
];

<Table
  data={users}
  columns={userColumns}
  onRowClick={(user) => {
    // user is typed as User!
    console.log(user.email);
  }}
/>
```

## Polymorphic Components

Components that can render as different HTML elements:

```typescript
type PolymorphicProps<T extends React.ElementType> = {
  as?: T;
  variant?: 'primary' | 'secondary';
} & React.ComponentPropsWithoutRef<T>;

function Button<T extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  className,
  ...props
}: PolymorphicProps<T>) {
  const Component = as || 'button';

  return (
    <Component
      className={`btn-${variant} ${className || ''}`}
      {...props}
    />
  );
}

// Usage - fully typed!
<Button>Click me</Button> // Renders <button>
<Button as="a" href="/home">Link</Button> // Renders <a>, href is typed!
<Button as="div" onClick={() => {}}>Div button</Button> // Renders <div>
```

## Component Composition Types

```typescript
// Compound component pattern
interface TabsComposition {
  List: typeof TabList;
  Tab: typeof Tab;
  Panel: typeof TabPanel;
}

const Tabs: React.FC<{ children: React.ReactNode }> & TabsComposition = ({
  children
}) => {
  return <div className="tabs">{children}</div>;
};

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab>Tab 1</Tabs.Tab>
    <Tabs.Tab>Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel>Panel 1</Tabs.Panel>
  <Tabs.Panel>Panel 2</Tabs.Panel>
</Tabs>
```

## Discriminated Union Props

Enforce mutually exclusive props:

```typescript
// ❌ Weak typing - both href and onClick can coexist
interface BadButtonProps {
  href?: string;
  onClick?: () => void;
}

// ✅ Strong typing - enforces one or the other
type ButtonProps =
  | { variant: 'link'; href: string; onClick?: never }
  | { variant: 'button'; onClick: () => void; href?: never };

function Button(props: ButtonProps) {
  if (props.variant === 'link') {
    return <a href={props.href}>{/* ... */}</a>;
  }

  return <button onClick={props.onClick}>{/* ... */}</button>;
}

// Usage
<Button variant="link" href="/home" /> // ✅
<Button variant="button" onClick={() => {}} /> // ✅
<Button variant="link" onClick={() => {}} /> // ❌ Type error
<Button variant="button" href="/home" /> // ❌ Type error
```

## Advanced: Conditional Required Props

```typescript
type ConditionalProps<T extends boolean> = {
  hasDetails: T;
} & (T extends true ? { details: string } : { details?: never });

function Component<T extends boolean>(props: ConditionalProps<T>) {
  if (props.hasDetails) {
    // TypeScript knows details exists here
    console.log(props.details.toUpperCase());
  }
}

// Usage
<Component hasDetails={true} details="info" /> // ✅
<Component hasDetails={false} /> // ✅
<Component hasDetails={true} /> // ❌ Missing details
<Component hasDetails={false} details="info" /> // ❌ Unexpected details
```

## Ref Forwarding Types

```typescript
interface InputProps {
  label: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

// Usage
const inputRef = useRef<HTMLInputElement>(null);

<Input
  ref={inputRef}
  label="Email"
  error="Invalid email"
/>

// Later
inputRef.current?.focus(); // Fully typed!
```

## Summary

**Key Patterns**:

1. **Props are contracts** - Define clear interfaces
2. **ReactNode for flexibility** - Most children should be ReactNode
3. **Generic components** - Adapt to data types
4. **Polymorphic components** - Render as different elements
5. **Discriminated unions** - Enforce mutually exclusive props
6. **Ref forwarding** - Type refs correctly

**Next**: Lecture 2 covers utility types that make these patterns even more powerful.
