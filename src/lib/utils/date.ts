/**
 * Date utility functions for holidays and date calculations
 */

export interface Holiday {
  date: Date
  name: string
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
 * Get Canadian holidays with names for the current and next year
 * Includes statutory holidays and common observances
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

  holidays.push(...getHolidaysForYear(currentYear))
  holidays.push(...getHolidaysForYear(nextYear))

  // Set all holidays to midnight for consistent comparison
  holidays.forEach(holiday => {
    holiday.date.setHours(0, 0, 0, 0)
  })

  return holidays
}

