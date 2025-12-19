'use client'

import { ZumrailsHolder, UserInfo } from './types'

interface IbvCardHolderProps {
  holder?: ZumrailsHolder | null
  userInfo?: UserInfo | null
}

/**
 * Normalize names for comparison (remove extra spaces, convert to lowercase)
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Compare holder name with user name from application
 */
function compareNames(
  holder: ZumrailsHolder | null | undefined,
  userInfo: UserInfo | null | undefined
): {
  matches: boolean
  matchType: 'exact' | 'partial' | 'mismatch' | 'unknown'
  details: string
} {
  if (!holder || !userInfo) {
    return {
      matches: false,
      matchType: 'unknown',
      details: 'Missing information for comparison'
    }
  }

  const holderFirstName = normalizeName(holder.FirstName)
  const holderLastName = normalizeName(holder.LastName)
  const holderFullName = normalizeName(holder.FullName)
  const userFirstName = normalizeName(userInfo.first_name)
  const userLastName = normalizeName(userInfo.last_name)
  const userFullName = `${userFirstName} ${userLastName}`.trim()

  // Exact match on full name
  if (holderFullName === userFullName) {
    return {
      matches: true,
      matchType: 'exact',
      details: 'Full name matches exactly'
    }
  }

  // Exact match on first + last name
  if (holderFirstName === userFirstName && holderLastName === userLastName) {
    return {
      matches: true,
      matchType: 'exact',
      details: 'First and last name match exactly'
    }
  }

  // Partial match - check if names contain each other
  const holderNameParts = holderFullName.split(' ')
  const userNameParts = userFullName.split(' ')
  
  // Check if all user name parts are found in holder name
  const allPartsMatch = userNameParts.every(part => 
    part && holderNameParts.some(holderPart => holderPart.includes(part) || part.includes(holderPart))
  )

  if (allPartsMatch && userNameParts.length > 0) {
    return {
      matches: true,
      matchType: 'partial',
      details: 'Names partially match (similar but not exact)'
    }
  }

  // Check last name match (common case)
  if (holderLastName && userLastName && holderLastName === userLastName) {
    return {
      matches: false,
      matchType: 'partial',
      details: 'Last name matches, but first name differs'
    }
  }

  return {
    matches: false,
    matchType: 'mismatch',
    details: 'Names do not match'
  }
}

export default function IbvCardHolder({
  holder,
  userInfo
}: IbvCardHolderProps) {
  if (!holder) {
    return null
  }

  const nameComparison = compareNames(holder, userInfo)

  return (
    <div className='rounded-lg border border-gray-200 bg-white p-3'>
      <div className='mb-2 flex items-center justify-between'>
        <h3 className='text-xs font-bold text-gray-900'>Account Holder</h3>
        {nameComparison.matchType !== 'unknown' && (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              nameComparison.matches
                ? 'bg-emerald-100 text-emerald-700'
                : nameComparison.matchType === 'partial'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
            title={nameComparison.details}
          >
            {nameComparison.matches ? (
              <>
                <svg
                  className='h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
                Match
              </>
            ) : nameComparison.matchType === 'partial' ? (
              <>
                <svg
                  className='h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
                Partial
              </>
            ) : (
              <>
                <svg
                  className='h-3 w-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
                Mismatch
              </>
            )}
          </div>
        )}
      </div>

      <div className='space-y-1.5'>
        <div>
          <p className='text-[10px] text-gray-500'>Full Name</p>
          <p className='text-xs font-semibold text-gray-900'>
            {holder.FullName || `${holder.FirstName} ${holder.LastName}`.trim()}
          </p>
          {userInfo && (
            <p className='mt-0.5 text-[10px] text-gray-400'>
              Application: {userInfo.first_name} {userInfo.last_name}
            </p>
          )}
        </div>

        {holder.Email && (
          <div>
            <p className='text-[10px] text-gray-500'>Email</p>
            <p className='text-xs text-gray-700'>{holder.Email}</p>
          </div>
        )}

        {holder.PhoneNumber && (
          <div>
            <p className='text-[10px] text-gray-500'>Phone</p>
            <p className='text-xs text-gray-700'>{holder.PhoneNumber}</p>
          </div>
        )}

        {(holder.AddressCivic ||
          holder.AddressCity ||
          holder.AddressProvince ||
          holder.AddressPostalCode) && (
          <div>
            <p className='text-[10px] text-gray-500'>Address</p>
            <p className='text-xs text-gray-700'>
              {[
                holder.AddressCivic,
                holder.AddressCity,
                holder.AddressProvince,
                holder.AddressPostalCode
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        {nameComparison.matchType !== 'unknown' && (
          <div className='mt-2 rounded border border-gray-100 bg-gray-50 p-1.5'>
            <p className='text-[10px] text-gray-600'>
              <strong>Name Verification:</strong> {nameComparison.details}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

