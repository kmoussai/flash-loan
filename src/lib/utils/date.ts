/**
 * Date utility functions for holidays and date calculations
 */

export interface Holiday {
  date: Date
  name: string
}

/**
 * Parse a date string in local timezone to avoid timezone shifts
 * 
 * When parsing date strings like "2025-12-15", using `new Date("2025-12-15")` 
 * interprets the string as UTC midnight, which can shift to the previous day 
 * in timezones behind UTC. This function parses the date in local timezone instead.
 * 
 * @param dateString - Date string in YYYY-MM-DD format or a Date object
 * @returns Date object created in local timezone
 * 
 * @example
 * ```typescript
 * // This will correctly parse as December 15 in local timezone
 * const date = parseLocalDate("2025-12-15")
 * ```
 */
export function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) {
    return dateString
  }
  
  // If it's in YYYY-MM-DD format, parse it manually in local timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed, creates date in local timezone
  }
  if (dateString.includes('T')) {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  
  // For other formats, fall back to Date.parse
  return new Date(dateString)
}

/**
 * Calculate Easter date for a given year using the Computus algorithm
 * @param year - The year to calculate Easter for
 * @returns Date object representing Easter Sunday
 */
export function getEasterDate(year: number): Date {
  // Computus algorithm for calculating Easter date
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

/**
 * Get Canadian holidays for the current and next year
 * Includes statutory holidays and common observances
 * @returns Array of Date objects representing Canadian holidays
 */
export function getCanadianHolidays(): Date[] {
  return getCanadianHolidaysWithNames().map(h => h.date)
}

/**
 * Get all weekends (Saturdays and Sundays) for a given year
 * @param year - The year to get weekends for
 * @returns Array of Holiday objects with date and name
 */
function getWeekendsForYear(year: number): Holiday[] {
  const weekends: Holiday[] = []
  const startDate = new Date(year, 0, 1) // January 1
  const endDate = new Date(year, 11, 31) // December 31

  // Start from the first day of the year
  const currentDate = new Date(startDate)

  // Find the first Saturday or Sunday
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0) {
      weekends.push({
        date: new Date(currentDate),
        name: 'Sunday'
      })
    } else if (dayOfWeek === 6) {
      weekends.push({
        date: new Date(currentDate),
        name: 'Saturday'
      })
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return weekends
}

/**
 * Get Canadian holidays with names for the current and next year
 * Includes statutory holidays, common observances, and weekends
 * @returns Array of Holiday objects with date and name
 */
export function getCanadianHolidaysWithNames(): Holiday[] {
  const holidays: Holiday[] = []
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1

  // Function to get holidays for a given year
  const getHolidaysForYear = (year: number): Holiday[] => {
    const yearHolidays: Holiday[] = []

    // New Year's Day - January 1
    yearHolidays.push({ date: new Date(year, 0, 1), name: "New Year's Day" })

    // Good Friday - Friday before Easter
    const easter = getEasterDate(year)
    const goodFriday = new Date(easter)
    goodFriday.setDate(easter.getDate() - 2)
    yearHolidays.push({ date: goodFriday, name: 'Good Friday' })

    // Easter Monday - Monday after Easter
    const easterMonday = new Date(easter)
    easterMonday.setDate(easter.getDate() + 1)
    yearHolidays.push({ date: easterMonday, name: 'Easter Monday' })

    // Victoria Day - Last Monday before May 25
    const victoriaDay = new Date(year, 4, 25)
    while (victoriaDay.getDay() !== 1) {
      victoriaDay.setDate(victoriaDay.getDate() - 1)
    }
    yearHolidays.push({ date: victoriaDay, name: 'Victoria Day' })

    // Canada Day - July 1
    yearHolidays.push({ date: new Date(year, 6, 1), name: 'Canada Day' })

    // Labour Day - First Monday in September
    const labourDay = new Date(year, 8, 1)
    while (labourDay.getDay() !== 1) {
      labourDay.setDate(labourDay.getDate() + 1)
    }
    yearHolidays.push({ date: labourDay, name: 'Labour Day' })

    // Thanksgiving - Second Monday in October
    const thanksgiving = new Date(year, 9, 8)
    while (thanksgiving.getDay() !== 1) {
      thanksgiving.setDate(thanksgiving.getDate() + 1)
    }
    yearHolidays.push({ date: thanksgiving, name: 'Thanksgiving' })

    // Remembrance Day - November 11
    yearHolidays.push({ date: new Date(year, 10, 11), name: 'Remembrance Day' })

    // Christmas - December 25
    yearHolidays.push({ date: new Date(year, 11, 25), name: 'Christmas' })

    // Boxing Day - December 26
    yearHolidays.push({ date: new Date(year, 11, 26), name: 'Boxing Day' })

    return yearHolidays
  }

  // Add statutory holidays
  holidays.push(...getHolidaysForYear(currentYear))
  holidays.push(...getHolidaysForYear(nextYear))

  // Add weekends (Saturdays and Sundays)
  holidays.push(...getWeekendsForYear(currentYear))
  holidays.push(...getWeekendsForYear(nextYear))

  // Set all holidays to midnight for consistent comparison
  holidays.forEach(holiday => {
    holiday.date.setHours(0, 0, 0, 0)
  })

  // Deduplicate holidays (in case a statutory holiday falls on a weekend)
  // Keep the first occurrence, prioritizing statutory holiday names over "Saturday"/"Sunday"
  const uniqueHolidays = new Map<string, Holiday>()
  holidays.forEach(holiday => {
    const dateKey = `${holiday.date.getFullYear()}-${holiday.date.getMonth()}-${holiday.date.getDate()}`
    if (!uniqueHolidays.has(dateKey)) {
      uniqueHolidays.set(dateKey, holiday)
    } else {
      // If we already have this date, prefer the statutory holiday name over "Saturday"/"Sunday"
      const existing = uniqueHolidays.get(dateKey)!
      if (existing.name === 'Saturday' || existing.name === 'Sunday') {
        if (holiday.name !== 'Saturday' && holiday.name !== 'Sunday') {
          uniqueHolidays.set(dateKey, holiday)
        }
      }
    }
  })

  return Array.from(uniqueHolidays.values())
}

/**
 * Check if a date is a holiday
 * @param date - Date to check (can be Date object or date string in YYYY-MM-DD format)
 * @returns true if the date is a holiday
 */
export function isHoliday(date: Date | string): boolean {
  const holidays = getCanadianHolidays()
  
  // Parse date to Date object if it's a string
  const dateToCheck = typeof date === 'string' ? parseLocalDate(date) : date
  
  // Normalize date to midnight for comparison
  const normalizedDate = new Date(dateToCheck)
  normalizedDate.setHours(0, 0, 0, 0)
  
  // Check if it's a holiday
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday)
    holidayDate.setHours(0, 0, 0, 0)
    return (
      normalizedDate.getDate() === holidayDate.getDate() &&
      normalizedDate.getMonth() === holidayDate.getMonth() &&
      normalizedDate.getFullYear() === holidayDate.getFullYear()
    )
  })
}

/**
 * Check if a date is a holiday or weekend
 * @param date - Date to check
 * @returns true if the date is a holiday or weekend
 */
export function isHolidayOrWeekend(date: Date): boolean {
  const holidays = getCanadianHolidays()
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  
  // Check if it's a weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true
  }
  
  // Normalize date to midnight for comparison
  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)
  
  // Check if it's a holiday
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday)
    holidayDate.setHours(0, 0, 0, 0)
    return (
      normalizedDate.getDate() === holidayDate.getDate() &&
      normalizedDate.getMonth() === holidayDate.getMonth() &&
      normalizedDate.getFullYear() === holidayDate.getFullYear()
    )
  })
}

/**
 * Find the next business day (skipping holidays and weekends)
 * @param date - Starting date
 * @param maxDays - Maximum number of days to look ahead (default: 30)
 * @returns Next business day as Date object
 */
export function getNextBusinessDay(date: Date, maxDays: number = 30): Date {
  let currentDate = new Date(date)
  currentDate.setHours(0, 0, 0, 0)
  
  let daysChecked = 0
  while (isHolidayOrWeekend(currentDate) && daysChecked < maxDays) {
    currentDate.setDate(currentDate.getDate() + 1)
    daysChecked++
  }
  
  // If we couldn't find a business day within maxDays, return the original date
  if (daysChecked >= maxDays) {
    return date
  }
  
  return currentDate
}

export function getPreviousBusinessDay(date: Date, maxDays: number = 30): Date {
  let currentDate = new Date(date)
  currentDate.setHours(0, 0, 0, 0)
  
  let daysChecked = 0
  while (isHolidayOrWeekend(currentDate) && daysChecked < maxDays) {
    currentDate.setDate(currentDate.getDate() - 1)
    daysChecked++
  }

  // If we couldn't find a business day within maxDays, return the original date
  if (daysChecked >= maxDays) {
    return date
  }
  
  return currentDate
}

