import type { Frequency } from '@/src/lib/supabase/types'

const canonicalize = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')

export const FREQUENCY_OPTIONS: Frequency[] = ['weekly', 'bi-weekly', 'twice-monthly', 'monthly']

export const FREQUENCY_PRIORITY: Frequency[] = ['weekly', 'bi-weekly', 'twice-monthly', 'monthly']

const FREQUENCY_ALIASES: Record<Frequency, string[]> = {
  weekly: [
    'weekly',
    'week',
    'once-a-week',
    'one-week',
    '1w',
    'hebdomadaire',
    'every-week',
    'per-week'
  ],
  'bi-weekly': [
    'bi-weekly',
    'biweekly',
    'every-two-weeks',
    'two-weeks',
    'fortnightly',
    '14-days',
    'every-14-days',
    '2w'
  ],
  'twice-monthly': [
    'twice-monthly',
    'twice-per-month',
    'two-times-per-month',
    'two-time-per-month',
    '2-times-per-month',
    '2-time-per-month',
    '2x-per-month',
    '2x-month',
    'semi-monthly',
    'semimonthly',
    'semi-month',
    'twice-month',
    'twice-per-monthly'
  ],
  monthly: ['monthly', 'month', 'once-a-month', '1m', 'mensuel', 'per-month']
}

const SEGMENT_DELIMITERS = /[:|;,/]+/g

const tryMatchFrequency = (value: string): Frequency | null => {
  const normalizedValue = canonicalize(value)

  for (const frequency of FREQUENCY_OPTIONS) {
    if (canonicalize(frequency) === normalizedValue) {
      return frequency
    }
  }

  const candidateSegments = Array.from(
    new Set(
      [
        normalizedValue,
        normalizedValue.split(':')[0],
        normalizedValue.split('|')[0],
        normalizedValue.split(';')[0],
        ...normalizedValue.split(SEGMENT_DELIMITERS),
        ...normalizedValue.split('-')
      ]
        .map(segment => segment?.trim())
        .filter((segment): segment is string => Boolean(segment))
    )
  )

  for (const [frequency, aliases] of Object.entries(FREQUENCY_ALIASES)) {
    const canonicalAliases = aliases.map(alias => canonicalize(alias))
    if (candidateSegments.some(segment => canonicalAliases.includes(segment))) {
      return frequency as Frequency
    }
  }

  return null
}

export const FREQUENCY_PAYMENTS_PER_MONTH: Record<Frequency, number> = {
  weekly: 4,
  'bi-weekly': 2,
  'twice-monthly': 2,
  monthly: 1
}

export const getPaymentsPerMonth = (frequency: Frequency): number =>
  FREQUENCY_PAYMENTS_PER_MONTH[frequency] ?? 1

export const normalizeFrequency = (value: unknown): Frequency | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    return tryMatchFrequency(value)
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const matched = normalizeFrequency(entry)
      if (matched) {
        return matched
      }
    }
    return null
  }

  if (typeof value === 'object') {
    const candidate =
      (value as { frequency?: unknown; raw_frequency?: unknown; value?: unknown }).frequency ??
      (value as { raw_frequency?: unknown; value?: unknown }).raw_frequency ??
      (value as { value?: unknown }).value
    return normalizeFrequency(candidate)
  }

  return tryMatchFrequency(String(value))
}

export const assertFrequency = (value: unknown, fallback: Frequency = 'monthly'): Frequency =>
  normalizeFrequency(value) ?? fallback

