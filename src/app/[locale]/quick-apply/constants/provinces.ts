const normalizeValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

interface ProvinceOption {
  code: string
  synonyms: string[]
}

export const PROVINCE_OPTIONS: ProvinceOption[] = [
  { code: 'AB', synonyms: ['Alberta'] },
  { code: 'BC', synonyms: ['British Columbia', 'Colombie-Britannique'] },
  { code: 'MB', synonyms: ['Manitoba'] },
  { code: 'NB', synonyms: ['New Brunswick', 'Nouveau-Brunswick'] },
  { code: 'NL', synonyms: ['Newfoundland and Labrador', 'Terre-Neuve-et-Labrador'] },
  { code: 'NT', synonyms: ['Northwest Territories', 'Territoires du Nord-Ouest'] },
  { code: 'NS', synonyms: ['Nova Scotia', 'Nouvelle-Écosse'] },
  { code: 'NU', synonyms: ['Nunavut'] },
  { code: 'ON', synonyms: ['Ontario'] },
  {
    code: 'PE',
    synonyms: ['Prince Edward Island', "Île-du-Prince-Édouard", 'Ile-du-Prince-Edouard']
  },
  { code: 'QC', synonyms: ['Quebec', 'Québec'] },
  { code: 'SK', synonyms: ['Saskatchewan'] },
  { code: 'YT', synonyms: ['Yukon'] }
]

const LOOKUP = PROVINCE_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  const normalizedCode = normalizeValue(option.code)
  acc[normalizedCode] = option.code

  for (const synonym of option.synonyms) {
    const normalizedSynonym = normalizeValue(synonym)
    acc[normalizedSynonym] = option.code
  }

  return acc
}, {})

export const PROVINCE_CODES = PROVINCE_OPTIONS.map(option => option.code)

export const provinceNameToCode = (value: string | null | undefined) => {
  if (!value) return ''
  const normalized = normalizeValue(value)
  if (!normalized) return ''

  return LOOKUP[normalized] ?? value.toUpperCase()
}

export const getProvinceTranslationKey = (code: string) =>
  `Province_Code_${code.trim().toUpperCase()}`

