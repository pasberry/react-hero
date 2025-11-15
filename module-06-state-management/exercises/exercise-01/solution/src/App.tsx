import { useEffect } from 'react'
import { TaskList } from './components/TaskList'
import { TaskFilters } from './components/TaskFilters'
import { TaskStats } from './components/TaskStats'
import { AddTaskForm } from './components/AddTaskForm'
import { ToastContainer } from './components/ToastContainer'
import { useTaskActions, useModals } from './hooks/useStore'

function App() {
  const { fetchTasks, bulkComplete, deleteCompleted } = useTaskActions()
  const { openModal } = useModals()

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">TaskMaster</h1>
            <div className="flex gap-3">
              <button
                onClick={bulkComplete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Complete All
              </button>
              <button
                onClick={deleteCompleted}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Delete Completed
              </button>
              <button
                onClick={() => openModal('taskCreate')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                + New Task
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats */}
          <TaskStats />

          {/* Filters */}
          <TaskFilters />

          {/* Task List */}
          <TaskList />
        </div>
      </main>

      {/* Modals */}
      <AddTaskForm />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default App
