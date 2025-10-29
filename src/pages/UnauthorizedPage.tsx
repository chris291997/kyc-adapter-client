import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import Button from '../components/ui/Button'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center">
        <ShieldAlert className="h-24 w-24 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          403 - Unauthorized
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don't have permission to access this page.
        </p>
        <Link to="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    </div>
  )
}


