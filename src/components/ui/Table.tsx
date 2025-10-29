import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface TableProps {
  children: ReactNode
  className?: string
}

export default function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-gray-200 dark:divide-gray-700', className)}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead className={cn('bg-gray-50 dark:bg-gray-800', className)}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tbody className={cn('bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800', className)}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn('px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100', className)}>
      {children}
    </td>
  )
}


