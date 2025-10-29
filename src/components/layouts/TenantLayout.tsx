import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function TenantLayout() {
  return (
    <div className="flex h-screen overflow-visible">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


