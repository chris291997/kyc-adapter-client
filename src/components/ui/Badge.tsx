import { ReactNode, HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
import { STATUS_COLORS } from '../../constants'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: keyof typeof STATUS_COLORS
}

export default function Badge({ children, variant = 'pending', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        STATUS_COLORS[variant] || STATUS_COLORS.pending,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}


