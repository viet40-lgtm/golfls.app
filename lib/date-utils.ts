/**
 * Utility functions for handling dates in local timezone
 * Prevents timezone offset issues when working with date-only strings
 */

/**
 * Parse a date string (YYYY-MM-DD) as local date, not UTC
 * This prevents the "off by one day" issue in timezones west of UTC
 */
export function parseLocalDate(dateString: string): Date {
    if (!dateString) return new Date();

    // If it's already a full ISO string with time, use it directly
    if (dateString.includes('T')) {
        return new Date(dateString);
    }

    // For date-only strings (YYYY-MM-DD), parse as local date
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Format a date for display in local timezone
 * For date-only strings, this preserves the exact date without timezone shifts
 */
export function formatLocalDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    // If it's already a string in YYYY-MM-DD format, parse it locally
    if (typeof date === 'string') {
        const [year, month, day] = date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        const defaultOptions: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        };

        return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    // For Date objects, format directly without timezone conversion
    const defaultOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Get today's date in YYYY-MM-DD format in local timezone
 */
export function getTodayLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD string in local timezone
 */
export function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
