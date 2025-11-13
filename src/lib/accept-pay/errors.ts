/**
 * Accept Pay Error Code Mapping
 * 
 * Converts Accept Pay error codes (9XX for EFT, RXX for ACH) to user-friendly messages
 * Based on Accept Pay API documentation
 */

interface ErrorCodeInfo {
  code: string
  message: string
  category: 'bank' | 'validation' | 'system' | 'authorization'
  retryable: boolean
}

/**
 * Error code mappings
 * 9XX codes = EFT errors
 * RXX codes = ACH errors
 */
const ERROR_CODES: Record<string, ErrorCodeInfo> = {
  // EFT Error Codes (9XX)
  '900': {
    code: '900',
    message: 'Invalid account number',
    category: 'validation',
    retryable: false
  },
  '901': {
    code: '901',
    message: 'Invalid transit number',
    category: 'validation',
    retryable: false
  },
  '902': {
    code: '902',
    message: 'Invalid institution number',
    category: 'validation',
    retryable: false
  },
  '903': {
    code: '903',
    message: 'Account closed',
    category: 'bank',
    retryable: false
  },
  '904': {
    code: '904',
    message: 'Insufficient funds',
    category: 'bank',
    retryable: true
  },
  '905': {
    code: '905',
    message: 'Payment stopped',
    category: 'bank',
    retryable: false
  },
  '906': {
    code: '906',
    message: 'Invalid account type',
    category: 'validation',
    retryable: false
  },
  '907': {
    code: '907',
    message: 'Account frozen',
    category: 'bank',
    retryable: false
  },
  '908': {
    code: '908',
    message: 'Invalid amount',
    category: 'validation',
    retryable: false
  },
  '909': {
    code: '909',
    message: 'Transaction not authorized',
    category: 'authorization',
    retryable: false
  },
  '910': {
    code: '910',
    message: 'Account does not exist',
    category: 'bank',
    retryable: false
  },
  '911': {
    code: '911',
    message: 'Invalid date',
    category: 'validation',
    retryable: false
  },
  '912': {
    code: '912',
    message: 'Transaction limit exceeded',
    category: 'bank',
    retryable: false
  },
  '913': {
    code: '913',
    message: 'Daily limit exceeded',
    category: 'bank',
    retryable: true
  },
  '914': {
    code: '914',
    message: 'Monthly limit exceeded',
    category: 'bank',
    retryable: true
  },
  '915': {
    code: '915',
    message: 'Bank processing error',
    category: 'system',
    retryable: true
  },
  '916': {
    code: '916',
    message: 'Bank system unavailable',
    category: 'system',
    retryable: true
  },
  '917': {
    code: '917',
    message: 'Duplicate transaction',
    category: 'validation',
    retryable: false
  },
  '918': {
    code: '918',
    message: 'Invalid customer',
    category: 'validation',
    retryable: false
  },
  '919': {
    code: '919',
    message: 'Transaction expired',
    category: 'validation',
    retryable: false
  },
  '920': {
    code: '920',
    message: 'Invalid payment type',
    category: 'validation',
    retryable: false
  },

  // ACH Error Codes (RXX)
  'R01': {
    code: 'R01',
    message: 'Insufficient funds',
    category: 'bank',
    retryable: true
  },
  'R02': {
    code: 'R02',
    message: 'Account closed',
    category: 'bank',
    retryable: false
  },
  'R03': {
    code: 'R03',
    message: 'No account / Unable to locate account',
    category: 'bank',
    retryable: false
  },
  'R04': {
    code: 'R04',
    message: 'Invalid account number',
    category: 'validation',
    retryable: false
  },
  'R05': {
    code: 'R05',
    message: 'Unauthorized debit to consumer account',
    category: 'authorization',
    retryable: false
  },
  'R06': {
    code: 'R06',
    message: 'Returned per ODFI request',
    category: 'bank',
    retryable: false
  },
  'R07': {
    code: 'R07',
    message: 'Authorization revoked by customer',
    category: 'authorization',
    retryable: false
  },
  'R08': {
    code: 'R08',
    message: 'Payment stopped',
    category: 'bank',
    retryable: false
  },
  'R09': {
    code: 'R09',
    message: 'Uncollected funds',
    category: 'bank',
    retryable: true
  },
  'R10': {
    code: 'R10',
    message: 'Customer advises not authorized',
    category: 'authorization',
    retryable: false
  },
  'R11': {
    code: 'R11',
    message: 'Check truncation entry return',
    category: 'bank',
    retryable: false
  },
  'R12': {
    code: 'R12',
    message: 'Branch sold to another DFI',
    category: 'bank',
    retryable: false
  },
  'R13': {
    code: 'R13',
    message: 'RDFI not qualified to participate',
    category: 'bank',
    retryable: false
  },
  'R14': {
    code: 'R14',
    message: 'Representative payee deceased or unable to continue',
    category: 'bank',
    retryable: false
  },
  'R15': {
    code: 'R15',
    message: 'Beneficiary or account holder deceased',
    category: 'bank',
    retryable: false
  },
  'R16': {
    code: 'R16',
    message: 'Account frozen',
    category: 'bank',
    retryable: false
  },
  'R17': {
    code: 'R17',
    message: 'File record edit criteria',
    category: 'validation',
    retryable: false
  },
  'R18': {
    code: 'R18',
    message: 'Improper effective entry date',
    category: 'validation',
    retryable: false
  },
  'R19': {
    code: 'R19',
    message: 'Amount field error',
    category: 'validation',
    retryable: false
  },
  'R20': {
    code: 'R20',
    message: 'Non-transaction account',
    category: 'bank',
    retryable: false
  },
  'R21': {
    code: 'R21',
    message: 'Invalid company identification',
    category: 'validation',
    retryable: false
  },
  'R22': {
    code: 'R22',
    message: 'Invalid individual ID number',
    category: 'validation',
    retryable: false
  },
  'R23': {
    code: 'R23',
    message: 'Credit entry refused by receiver',
    category: 'bank',
    retryable: false
  },
  'R24': {
    code: 'R24',
    message: 'Duplicate entry',
    category: 'validation',
    retryable: false
  },
  'R29': {
    code: 'R29',
    message: 'Corporate customer advises not authorized',
    category: 'authorization',
    retryable: false
  },
  'R31': {
    code: 'R31',
    message: 'Permissible return entry (CCD and CTX only)',
    category: 'bank',
    retryable: false
  },
  'R33': {
    code: 'R33',
    message: 'Return of XCK entry',
    category: 'bank',
    retryable: false
  },
  'R34': {
    code: 'R34',
    message: 'Limited participation',
    category: 'bank',
    retryable: false
  },
  'R37': {
    code: 'R37',
    message: 'Return of XCK entry because of improper endorsement',
    category: 'bank',
    retryable: false
  },
  'R38': {
    code: 'R38',
    message: 'Return of XCK entry because of altered item',
    category: 'bank',
    retryable: false
  },
  'R39': {
    code: 'R39',
    message: 'Return of XCK entry because of item cannot be processed',
    category: 'bank',
    retryable: false
  },
  'R40': {
    code: 'R40',
    message: 'Return of ENR entry',
    category: 'bank',
    retryable: false
  },
  'R41': {
    code: 'R41',
    message: 'Invalid transaction code',
    category: 'validation',
    retryable: false
  },
  'R42': {
    code: 'R42',
    message: 'Routing number / Check digit error',
    category: 'validation',
    retryable: false
  },
  'R43': {
    code: 'R43',
    message: 'Invalid DFI account number',
    category: 'validation',
    retryable: false
  },
  'R44': {
    code: 'R44',
    message: 'Invalid individual ID number',
    category: 'validation',
    retryable: false
  },
  'R45': {
    code: 'R45',
    message: 'Invalid individual name / company name',
    category: 'validation',
    retryable: false
  },
  'R46': {
    code: 'R46',
    message: 'Invalid representative payee indicator',
    category: 'validation',
    retryable: false
  },
  'R47': {
    code: 'R47',
    message: 'Duplicate entry',
    category: 'validation',
    retryable: false
  },
  'R50': {
    code: 'R50',
    message: 'State law affecting RCK entry',
    category: 'bank',
    retryable: false
  },
  'R51': {
    code: 'R51',
    message: 'Item is ineligible',
    category: 'bank',
    retryable: false
  },
  'R52': {
    code: 'R52',
    message: 'Stop payment on item',
    category: 'bank',
    retryable: false
  },
  'R53': {
    code: 'R53',
    message: 'Item and ACH entry presented for payment',
    category: 'bank',
    retryable: false
  },
  'R61': {
    code: 'R61',
    message: 'Misrouted return',
    category: 'system',
    retryable: false
  },
  'R62': {
    code: 'R62',
    message: 'Incorrect trace number',
    category: 'validation',
    retryable: false
  },
  'R63': {
    code: 'R63',
    message: 'Incorrect dollar amount',
    category: 'validation',
    retryable: false
  },
  'R64': {
    code: 'R64',
    message: 'Incorrect identification number',
    category: 'validation',
    retryable: false
  },
  'R65': {
    code: 'R65',
    message: 'Incorrect transaction code',
    category: 'validation',
    retryable: false
  },
  'R67': {
    code: 'R67',
    message: 'Duplicate return',
    category: 'validation',
    retryable: false
  },
  'R68': {
    code: 'R68',
    message: 'Untimely return',
    category: 'validation',
    retryable: false
  },
  'R69': {
    code: 'R69',
    message: 'Field error(s)',
    category: 'validation',
    retryable: false
  },
  'R70': {
    code: 'R70',
    message: 'Addenda error',
    category: 'validation',
    retryable: false
  },
  'R71': {
    code: 'R71',
    message: 'Misrouted dishonored return',
    category: 'system',
    retryable: false
  },
  'R72': {
    code: 'R72',
    message: 'Untimely dishonored return',
    category: 'validation',
    retryable: false
  },
  'R73': {
    code: 'R73',
    message: 'Timely original return',
    category: 'validation',
    retryable: false
  },
  'R74': {
    code: 'R74',
    message: 'Corrected return',
    category: 'validation',
    retryable: false
  },
  'R75': {
    code: 'R75',
    message: 'Return not a duplicate',
    category: 'validation',
    retryable: false
  },
  'R76': {
    code: 'R76',
    message: 'Invalid ACH return code',
    category: 'validation',
    retryable: false
  },
  'R77': {
    code: 'R77',
    message: 'Invalid return trace number',
    category: 'validation',
    retryable: false
  },
  'R78': {
    code: 'R78',
    message: 'Invalid return date',
    category: 'validation',
    retryable: false
  },
  'R79': {
    code: 'R79',
    message: 'Invalid return DFI account number',
    category: 'validation',
    retryable: false
  },
  'R80': {
    code: 'R80',
    message: 'Invalid return individual ID',
    category: 'validation',
    retryable: false
  },
  'R81': {
    code: 'R81',
    message: 'Invalid return individual name / company name',
    category: 'validation',
    retryable: false
  },
  'R82': {
    code: 'R82',
    message: 'Invalid return representative payee indicator',
    category: 'validation',
    retryable: false
  },
  'R83': {
    code: 'R83',
    message: 'Invalid return addenda record indicator',
    category: 'validation',
    retryable: false
  },
  'R84': {
    code: 'R84',
    message: 'Invalid return trace number',
    category: 'validation',
    retryable: false
  },
  'R85': {
    code: 'R85',
    message: 'Invalid return dollar amount',
    category: 'validation',
    retryable: false
  },
  'R86': {
    code: 'R86',
    message: 'Invalid return identification number',
    category: 'validation',
    retryable: false
  },
  'R87': {
    code: 'R87',
    message: 'Invalid return transaction code',
    category: 'validation',
    retryable: false
  },
  'R88': {
    code: 'R88',
    message: 'Invalid return addenda record',
    category: 'validation',
    retryable: false
  },
  'R89': {
    code: 'R89',
    message: 'Invalid return code',
    category: 'validation',
    retryable: false
  },
  'R90': {
    code: 'R90',
    message: 'Cross reference error',
    category: 'validation',
    retryable: false
  },
  'R91': {
    code: 'R91',
    message: 'Invalid individual ID number',
    category: 'validation',
    retryable: false
  },
  'R92': {
    code: 'R92',
    message: 'Invalid transaction code',
    category: 'validation',
    retryable: false
  },
  'R93': {
    code: 'R93',
    message: 'Invalid return code',
    category: 'validation',
    retryable: false
  },
  'R94': {
    code: 'R94',
    message: 'Invalid return addenda record',
    category: 'validation',
    retryable: false
  },
  'R95': {
    code: 'R95',
    message: 'Invalid return trace number',
    category: 'validation',
    retryable: false
  },
  'R96': {
    code: 'R96',
    message: 'Invalid return date',
    category: 'validation',
    retryable: false
  },
  'R97': {
    code: 'R97',
    message: 'Invalid return DFI account number',
    category: 'validation',
    retryable: false
  },
  'R98': {
    code: 'R98',
    message: 'Invalid return individual ID',
    category: 'validation',
    retryable: false
  },
  'R99': {
    code: 'R99',
    message: 'Invalid return individual name / company name',
    category: 'validation',
    retryable: false
  }
}

/**
 * Get error information for an Accept Pay error code
 */
export function getErrorInfo(errorCode: string | null | undefined): ErrorCodeInfo | null {
  if (!errorCode) {
    return null
  }

  const code = errorCode.trim().toUpperCase()
  return ERROR_CODES[code] || null
}

/**
 * Get user-friendly error message for an Accept Pay error code
 */
export function getErrorMessage(errorCode: string | null | undefined): string {
  const errorInfo = getErrorInfo(errorCode)
  if (errorInfo) {
    return errorInfo.message
  }

  // Default message for unknown codes
  if (errorCode) {
    if (errorCode.startsWith('9')) {
      return `EFT error: ${errorCode}`
    }
    if (errorCode.startsWith('R')) {
      return `ACH error: ${errorCode}`
    }
    return `Error code: ${errorCode}`
  }

  return 'Unknown error'
}

/**
 * Check if an error code is retryable
 */
export function isRetryableError(errorCode: string | null | undefined): boolean {
  const errorInfo = getErrorInfo(errorCode)
  return errorInfo?.retryable || false
}

/**
 * Get error category
 */
export function getErrorCategory(errorCode: string | null | undefined): string {
  const errorInfo = getErrorInfo(errorCode)
  return errorInfo?.category || 'unknown'
}

/**
 * Format error for display
 */
export function formatError(errorCode: string | null | undefined): {
  code: string
  message: string
  category: string
  retryable: boolean
} {
  const errorInfo = getErrorInfo(errorCode)
  if (errorInfo) {
    return {
      code: errorInfo.code,
      message: errorInfo.message,
      category: errorInfo.category,
      retryable: errorInfo.retryable
    }
  }

  return {
    code: errorCode || 'UNKNOWN',
    message: getErrorMessage(errorCode),
    category: 'unknown',
    retryable: false
  }
}

