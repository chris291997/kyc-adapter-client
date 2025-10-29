import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../utils/cn'

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export default function ThemeToggle({ showLabel = true, className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
        'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
        'text-gray-700 dark:text-gray-300',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </div>
      {showLabel && (
        <span className="text-sm font-medium hidden sm:inline">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}


