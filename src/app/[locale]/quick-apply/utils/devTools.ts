import type { QuickApplyFormData } from '../types'
import { PROVINCE_CODES } from '../constants/provinces'

export function generateRandomFormData(locale: string): QuickApplyFormData {
  const firstNames = [
    'Jean',
    'Marie',
    'Pierre',
    'Sophie',
    'Michel',
    'Isabelle',
    'Andre',
    'Nathalie',
    'David',
    'Julie'
  ]
  const lastNames = [
    'Tremblay',
    'Gagnon',
    'Roy',
    'Cote',
    'Bouchard',
    'Gauthier',
    'Morin',
    'Lavoie',
    'Fortin',
    'Gagne'
  ]
  const provinces = PROVINCE_CODES
  const streetNames = [
    'Maple',
    'Elm',
    'Saint-Laurent',
    'Crescent',
    'Sherbrooke',
    'Peel',
    'Queen',
    'King'
  ]
  const cities = [
    'Montréal',
    'Laval',
    'Longueuil',
    'Québec',
    'Gatineau',
    'Sherbrooke'
  ]
  const postalCodes = ['H2X 1Y4', 'H3B 2Y7', 'H4N 3K6', 'H1A 0A1']
  const loanAmounts = [
    '250',
    '300',
    '400',
    '500',
    '600',
    '750',
    '800',
    '900',
    '1000',
    '1250',
    '1500'
  ]

  const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)]
  const randomProvince = provinces[Math.floor(Math.random() * provinces.length)]
  const randomLoanAmount = loanAmounts[Math.floor(Math.random() * loanAmounts.length)]
  const randomStreetName = streetNames[Math.floor(Math.random() * streetNames.length)]
  const randomCity = cities[Math.floor(Math.random() * cities.length)]
  const randomPostalCode = postalCodes[Math.floor(Math.random() * postalCodes.length)]

  const randomMovingDate = () => {
    const today = new Date()
    const pastMonths = Math.floor(Math.random() * 24)
    today.setMonth(today.getMonth() - pastMonths)
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(Math.min(today.getDate(), 28)).padStart(2, '0')
    return `${today.getFullYear()}-${month}-${day}`
  }

  // Remove accents for email generation
  const cleanFirstName = randomFirstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const cleanLastName = randomLastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return {
    firstName: randomFirstName,
    lastName: randomLastName,
    email: `${cleanFirstName.toLowerCase()}.${cleanLastName.toLowerCase()}${Math.floor(Math.random() * 999)}@email.com`,
    phone: `${Math.floor(Math.random() * 2) === 0 ? '514' : '438'}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    dateOfBirth: `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
    preferredLanguage: locale || 'en',
    streetNumber: String(Math.floor(Math.random() * 900) + 100),
    streetName: `${randomStreetName} ${Math.random() > 0.5 ? 'Street' : 'Avenue'}`,
    apartmentNumber:
      Math.random() > 0.5 ? `${Math.floor(Math.random() * 20) + 1}` : '',
    city: randomCity,
    province: randomProvince,
    postalCode: randomPostalCode,
    movingDate: randomMovingDate(),
    country: 'Canada',
    rentCost: String(Math.floor(Math.random() * 1000 + 500)),
    loanAmount: randomLoanAmount,
    confirmInformation: true
  }
}

