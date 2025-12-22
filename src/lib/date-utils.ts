import { formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns'

/**
 * Safely formats a date value to relative time string
 * Returns fallback text if the date is invalid
 */
export function formatDistanceToNow(
  dateValue: string | Date | null | undefined,
  options: { addSuffix?: boolean } = {}
): string {
  if (!dateValue) {
    return 'Unknown'
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown'
    }
    
    return fnsFormatDistanceToNow(date, options)
  } catch {
    return 'Unknown'
  }
}

/**
 * Safely creates a Date object, returns null if invalid
 */
export function safeDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) {
    return null
  }

  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null
    }
    
    return date
  } catch {
    return null
  }
}

/**
 * Safely format date to ISO string for exports
 */
export function safeISOString(dateValue: string | Date | null | undefined): string {
  const date = safeDate(dateValue)
  return date ? date.toISOString() : 'N/A'
}
