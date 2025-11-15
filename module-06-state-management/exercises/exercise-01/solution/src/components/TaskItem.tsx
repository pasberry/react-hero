import { Task } from '../types'

interface TaskItemProps {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<Task>) => void
}

export function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }

  const statusColors = {
    todo: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    done: 'bg-green-100 text-green-800',
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={onToggle}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-medium text-gray-900 ${
                task.status === 'done' ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h3>

            {/* Delete button */}
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 transition-colors"
              aria-label="Delete task"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          {task.description && (
            <p className="mt-1 text-sm text-gray-600">{task.description}</p>
          )}

          {/* Badges */}
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                priorityColors[task.priority]
              }`}
            >
              {task.priority}
            </span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                statusColors[task.status]
              }`}
            >
              {task.status.replace('_', ' ')}
            </span>
            {task.dueDate && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Due: {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
