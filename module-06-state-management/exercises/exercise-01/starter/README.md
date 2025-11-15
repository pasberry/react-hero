# TaskMaster - Starter Code

This is the starter code for Module 6 Exercise 1: Production Zustand Store Architecture.

## Getting Started

```bash
npm install
npm run dev
```

## Your Task

Implement a production-grade task management application using Zustand with:

1. **Store Architecture** (`src/store/`)
   - Combine slices using the slice pattern
   - Add middleware: devtools, persist, immer
   - Complete tasks, user, and UI slices

2. **Custom Hooks** (`src/hooks/useStore.ts`)
   - Implement selective subscriptions
   - Use shallow comparison to prevent re-renders

3. **Components** (`src/components/`)
   - TaskList with filtered tasks
   - TaskItem with optimistic updates
   - TaskFilters for search/filter
   - TaskStats for metrics

4. **Testing** (`src/__tests__/`)
   - Unit tests for store slices
   - Integration tests for components

See the main [README.md](../README.md) for detailed acceptance criteria and requirements.

## Files to Complete

- `src/store/index.ts` - Main store with middleware
- `src/store/slices/tasks.ts` - Tasks slice
- `src/store/slices/user.ts` - User slice
- `src/store/slices/ui.ts` - UI slice
- `src/hooks/useStore.ts` - Custom hooks
- `src/components/TaskList.tsx` - Task list component

Good luck! 🚀
