import { useState, FormEvent } from 'react';

/**
 * Form state as discriminated union
 * This eliminates impossible states!
 */
type FormState<T> =
  | { status: 'editing'; values: T }
  | { status: 'validating'; values: T }
  | { status: 'submitting'; values: T }
  | { status: 'success'; submittedValues: T }
  | { status: 'error'; values: T; error: string };

/**
 * Field configuration type
 * Generic T ensures field names and types match the form schema
 */
type FieldValidator<T, K extends keyof T> = (
  value: T[K],
  allValues: T
) => string | undefined | Promise<string | undefined>;

interface FieldConfig<T, K extends keyof T = keyof T> {
  name: K;
  label: string;
  validate?: FieldValidator<T, K>;
  required?: boolean;
}

/**
 * Form configuration
 */
interface UseFormConfig<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  onSubmit: (values: T) => void | Promise<void>;
}

/**
 * Form hook return type
 */
interface UseFormReturn<T> {
  // State
  state: FormState<T>;
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;

  // Computed
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;

  // Actions
  handleChange: <K extends keyof T>(field: K) => (value: T[K]) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  reset: () => void;
  clearErrors: () => void;
}

/**
 * Fully typed form hook
 *
 * Example usage:
 *
 * interface LoginForm {
 *   email: string;
 *   password: string;
 * }
 *
 * const form = useForm<LoginForm>({
 *   initialValues: { email: '', password: '' },
 *   validate: (values) => {
 *     const errors: Partial<Record<keyof LoginForm, string>> = {};
 *     if (!values.email) errors.email = 'Required';
 *     return errors;
 *   },
 *   onSubmit: async (values) => {
 *     await login(values.email, values.password);
 *   },
 * });
 */
export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormConfig<T>): UseFormReturn<T> {
  // State machine
  const [state, setState] = useState<FormState<T>>({
    status: 'editing',
    values: initialValues,
  });

  // Form metadata
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  // Current values - extracted from state
  const values = state.status === 'success' ? state.submittedValues : state.values;

  // Computed properties
  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const isSubmitting = state.status === 'submitting';

  /**
   * Handle field change
   * Returns a function that accepts the new value
   * Generics ensure type safety!
   */
  const handleChange = <K extends keyof T>(field: K) => (value: T[K]) => {
    // Update state
    if (state.status === 'editing' || state.status === 'error') {
      setState({ ...state, values: { ...state.values, [field]: value } });
    }

    // Validate if field has been touched
    if (touched[field] && validate) {
      const newValues = { ...values, [field]: value };
      const fieldErrors = validate(newValues);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  /**
   * Handle field blur - mark as touched
   */
  const handleBlur = (field: keyof T) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate on blur
    if (validate) {
      const fieldErrors = validate(values);
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<keyof T, boolean>>
    );
    setTouched(allTouched);

    // Validate entire form
    setState({ status: 'validating', values });

    if (validate) {
      const validationErrors = await validate(values);
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        setState({ status: 'editing', values });
        return;
      }
    }

    // Submit
    setState({ status: 'submitting', values });

    try {
      await onSubmit(values);
      setState({ status: 'success', submittedValues: values });
    } catch (error) {
      setState({
        status: 'error',
        values,
        error: error instanceof Error ? error.message : 'Submission failed',
      });
    }
  };

  /**
   * Set field value programmatically
   */
  const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
    if (state.status === 'editing' || state.status === 'error') {
      setState({ ...state, values: { ...state.values, [field]: value } });
    }
  };

  /**
   * Set field error programmatically
   */
  const setFieldError = (field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  /**
   * Reset form to initial state
   */
  const reset = () => {
    setState({ status: 'editing', values: initialValues });
    setErrors({});
    setTouched({});
  };

  /**
   * Clear all errors
   */
  const clearErrors = () => {
    setErrors({});
  };

  return {
    state,
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
    clearErrors,
  };
}

/**
 * Helper: Create field configuration with type safety
 */
export function createField<T, K extends keyof T>(
  config: FieldConfig<T, K>
): FieldConfig<T, K> {
  return config;
}

/**
 * Example usage:
 */

interface UserForm {
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
}

// Type-safe field configuration
const nameField = createField<UserForm, 'name'>({
  name: 'name',
  label: 'Full Name',
  required: true,
  validate: (value) => {
    if (value.length < 2) return 'Name too short';
    return undefined;
  },
});

// Usage in component
export function ExampleForm() {
  const form = useForm<UserForm>({
    initialValues: {
      name: '',
      email: '',
      age: 0,
      role: 'user',
    },
    validate: (values) => {
      const errors: Partial<Record<keyof UserForm, string>> = {};

      if (!values.name) {
        errors.name = 'Name is required';
      }

      if (!values.email.includes('@')) {
        errors.email = 'Invalid email';
      }

      if (values.age < 18) {
        errors.age = 'Must be 18 or older';
      }

      return errors;
    },
    onSubmit: async (values) => {
      console.log('Submitting:', values);
      // API call here
    },
  });

  return (
    <form onSubmit={form.handleSubmit}>
      <div>
        <label>Name</label>
        <input
          type="text"
          value={form.values.name}
          onChange={(e) => form.handleChange('name')(e.target.value)}
          onBlur={form.handleBlur('name')}
        />
        {form.touched.name && form.errors.name && (
          <span className="error">{form.errors.name}</span>
        )}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={form.values.email}
          onChange={(e) => form.handleChange('email')(e.target.value)}
          onBlur={form.handleBlur('email')}
        />
        {form.touched.email && form.errors.email && (
          <span className="error">{form.errors.email}</span>
        )}
      </div>

      <div>
        <label>Role</label>
        <select
          value={form.values.role}
          onChange={(e) => form.handleChange('role')(e.target.value as UserForm['role'])}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button type="submit" disabled={form.isSubmitting || !form.isValid}>
        {form.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>

      {form.state.status === 'success' && (
        <div className="success">Form submitted successfully!</div>
      )}

      {form.state.status === 'error' && (
        <div className="error">{form.state.error}</div>
      )}
    </form>
  );
}
