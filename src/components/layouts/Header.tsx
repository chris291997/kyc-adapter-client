import { Bell } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'
import { useAppSelector } from '../../hooks/useRedux'

export default function Header() {
  const { user } = useAppSelector((state) => state.auth)

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumb or Title */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}


