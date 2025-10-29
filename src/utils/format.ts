import { format, formatDistance, formatRelative } from 'date-fns'

/**
 * Format date string to readable format
 */
export function formatDate(date: string | Date | null | undefined, formatStr = 'MMM dd, yyyy'): string {
  if (!date) return 'N/A'
  
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date'
    }
    return format(parsedDate, formatStr)
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}

/**
 * Format date as time ago (e.g., "2 hours ago")
 */
export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date'
    }
    return formatDistance(parsedDate, new Date(), { addSuffix: true })
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}

/**
 * Format date as relative time (e.g., "today at 3:30 PM")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A'
  
  try {
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid Date'
    }
    return formatRelative(parsedDate, new Date())
  } catch (error) {
    console.error('Date formatting error:', error)
    return 'Invalid Date'
  }
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Format API key for display (show prefix only)
 */
export function formatApiKey(key: string): string {
  return `${key.substring(0, 16)}...`
}

