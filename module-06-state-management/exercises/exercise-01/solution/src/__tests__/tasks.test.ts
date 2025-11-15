import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStore } from '../store'

describe('Tasks Slice', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({ tasks: [], filter: 'all', searchQuery: '' })
  })

  it('adds a task', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo',
        priority: 'high',
        dueDate: null,
      })
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Test Task')
    expect(result.current.tasks[0].id).toBeDefined()
    expect(result.current.tasks[0].createdAt).toBeInstanceOf(Date)
  })

  it('updates a task', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Original Title',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
    })

    const taskId = result.current.tasks[0].id

    act(() => {
      result.current.updateTask(taskId, {
        title: 'Updated Title',
        priority: 'high',
      })
    })

    expect(result.current.tasks[0].title).toBe('Updated Title')
    expect(result.current.tasks[0].priority).toBe('high')
    expect(result.current.tasks[0].updatedAt.getTime()).toBeGreaterThan(
      result.current.tasks[0].createdAt.getTime()
    )
  })

  it('deletes a task', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Task 1',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 2',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
    })

    const taskId = result.current.tasks[0].id

    act(() => {
      result.current.deleteTask(taskId)
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Task 2')
  })

  it('toggles task status', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Test',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
    })

    const taskId = result.current.tasks[0].id

    act(() => {
      result.current.toggleTask(taskId)
    })

    expect(result.current.tasks[0].status).toBe('done')

    act(() => {
      result.current.toggleTask(taskId)
    })

    expect(result.current.tasks[0].status).toBe('todo')
  })

  it('filters tasks correctly', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Task 1',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 2',
        description: '',
        status: 'done',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 3',
        description: '',
        status: 'in_progress',
        priority: 'low',
        dueDate: null,
      })
    })

    // All filter
    expect(result.current.getFilteredTasks()).toHaveLength(3)

    // Active filter
    act(() => {
      result.current.setFilter('active')
    })
    expect(result.current.getFilteredTasks()).toHaveLength(2)

    // Completed filter
    act(() => {
      result.current.setFilter('completed')
    })
    expect(result.current.getFilteredTasks()).toHaveLength(1)
  })

  it('searches tasks', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Buy groceries',
        description: 'Milk, bread, eggs',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Complete project',
        description: 'Finish the React course',
        status: 'todo',
        priority: 'high',
        dueDate: null,
      })
    })

    act(() => {
      result.current.setSearchQuery('groceries')
    })

    expect(result.current.getFilteredTasks()).toHaveLength(1)
    expect(result.current.getFilteredTasks()[0].title).toBe('Buy groceries')

    act(() => {
      result.current.setSearchQuery('react')
    })

    expect(result.current.getFilteredTasks()).toHaveLength(1)
    expect(result.current.getFilteredTasks()[0].title).toBe('Complete project')
  })

  it('gets tasks by priority', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'High Priority',
        description: '',
        status: 'todo',
        priority: 'high',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Low Priority',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Another High',
        description: '',
        status: 'todo',
        priority: 'high',
        dueDate: null,
      })
    })

    expect(result.current.getTasksByPriority('high')).toHaveLength(2)
    expect(result.current.getTasksByPriority('low')).toHaveLength(1)
    expect(result.current.getTasksByPriority('medium')).toHaveLength(0)
  })

  it('gets completed count', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Task 1',
        description: '',
        status: 'done',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 2',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 3',
        description: '',
        status: 'done',
        priority: 'low',
        dueDate: null,
      })
    })

    expect(result.current.getCompletedCount()).toBe(2)
  })

  it('completes all tasks', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Task 1',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 2',
        description: '',
        status: 'in_progress',
        priority: 'low',
        dueDate: null,
      })
    })

    act(() => {
      result.current.bulkComplete()
    })

    expect(result.current.tasks.every((t) => t.status === 'done')).toBe(true)
  })

  it('deletes completed tasks', () => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.addTask({
        title: 'Task 1',
        description: '',
        status: 'done',
        priority: 'low',
        dueDate: null,
      })
      result.current.addTask({
        title: 'Task 2',
        description: '',
        status: 'todo',
        priority: 'low',
        dueDate: null,
      })
    })

    act(() => {
      result.current.deleteCompleted()
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0].title).toBe('Task 2')
  })
})
