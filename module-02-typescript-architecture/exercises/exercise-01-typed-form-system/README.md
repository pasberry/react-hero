# Exercise 1: Fully Typed Form System

## 🎯 Goal

Build a completely type-safe form library that provides compile-time guarantees for form handling, validation, and submission.

## 📚 Prerequisites

- Complete Module 2 lectures 1-4
- Understanding of generics and utility types
- Basic form handling in React

## 🎓 Learning Objectives

✅ Build generic form types
✅ Create type-safe field configuration
✅ Implement typed validation
✅ Design discriminated union for form state
✅ Build reusable form hooks

## 📝 Task Description

Create a form system with the following features:

### 1. Type-Safe Form Schema

```typescript
// Define form schema
interface UserForm {
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user' | 'guest';
}

// Form configuration should be typed from schema
```

### 2. Field Configuration

```typescript
// Each field knows its type from the schema
const fields: FieldConfig<UserForm> = [
  {
    name: 'name', // Autocompletes: 'name' | 'email' | 'age' | 'role'
    label: 'Full Name',
    type: 'text',
    validate: (value) => value.length < 2 ? 'Too short' : undefined,
  },
  // TypeScript ensures validate function receives correct type!
];
```

### 3. Form Hook

```typescript
const form = useForm<UserForm>({
  initialValues: { name: '', email: '', age: 0, role: 'user' },
  onSubmit: async (values) => {
    // values is fully typed as UserForm!
    await api.createUser(values);
  },
});

// form.values.name - typed as string
// form.errors.email - typed as string | undefined
```

### 4. Form State Machine

Form should have these states:
- `editing` - User is filling out form
- `validating` - Running validation
- `submitting` - Submitting to server
- `success` - Successfully submitted
- `error` - Submission failed

## ✅ Acceptance Criteria

1. **Full type safety**
   - Field names autocomplete
   - Validation functions are typed
   - No `any` types

2. **State machine**
   - Impossible states eliminated
   - Clear state transitions
   - Typed error states

3. **Validation**
   - Field-level validation
   - Form-level validation
   - Async validation support

4. **Features**
   - Touched field tracking
   - Dirty field tracking
   - Reset form
   - Clear errors

## 🚀 Getting Started

See `./starter` for skeleton code.

## 💡 Hints

1. Use generic constraints: `<T extends Record<string, any>>`
2. Use discriminated unions for state
3. Use `Partial<Record<keyof T, string>>` for errors
4. Use utility types to extract field types

## ⏱️ Time Estimate

3-4 hours

## 📖 Solution

Complete solution with commentary in `./solution`
