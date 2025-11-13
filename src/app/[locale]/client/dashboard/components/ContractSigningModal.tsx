'use client'

import { useState, Fragment } from 'react'
import { useTranslations } from 'next-intl'
import type { LoanContract } from '@/src/lib/supabase/types'
import ContractViewer from '@/src/app/admin/components/ContractViewer'

interface ContractSigningModalProps {
  contract: LoanContract
  applicationId: string
  locale: string
  onClose: () => void
  onSign: (signatureName: string) => Promise<void>
  isSigning?: boolean
}

export default function ContractSigningModal({
  contract,
  applicationId,
  locale,
  onClose,
  onSign,
  isSigning = false
}: ContractSigningModalProps) {
  const t = useTranslations('Client_Dashboard')
  const [signatureName, setSignatureName] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSign = async () => {
    setError(null)

    if (!isConfirmed) {
      setError(t('Contract_Sign_Confirmation_Required'))
      return
    }

    if (!signatureName.trim()) {
      setError(t('Contract_Signature_Name_Required'))
      return
    }

    try {
      await onSign(signatureName.trim())
    } catch (err) {
      setError(t('Contract_Sign_Error') || 'Failed to sign contract')
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10'>
      <div className='relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'>
        {/* Header */}
        <div className='flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4'>
          <h2 className='text-lg font-semibold text-gray-900'>
            {t('Contract_Sign_Title')}
          </h2>
          <button
            type='button'
            onClick={onClose}
            disabled={isSigning}
            className='rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label={t('Contract_Close_Viewer')}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              className='h-5 w-5'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
        {/* Contract Viewer */}
        <div className='min-h-0 flex-1 overflow-hidden'>
          <ContractViewer
            contract={contract}
            applicationId={applicationId}
            onClose={onClose}
            embedded={true}
          />
        </div>

        {/* Signing Form */}
        <div className='shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4'>
          <div className='space-y-4'>
            {/* Error Message */}
            {error && (
              <div className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700'>
                {error}
              </div>
            )}

            {/* Signature Name Input */}
            <div>
              <label
                htmlFor='signature-name'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                {t('Contract_Signature_Name_Label')}
              </label>
              <input
                id='signature-name'
                type='text'
                value={signatureName}
                onChange={e => setSignatureName(e.target.value)}
                disabled={isSigning}
                placeholder={t('Contract_Signature_Name_Placeholder')}
                className='focus:ring-primary/20 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500'
              />
              <p className='mt-1 text-xs text-gray-500'>
                {t('Contract_Signature_Name_Help')}
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div className='flex items-start gap-3'>
              <input
                id='sign-confirmation'
                type='checkbox'
                checked={isConfirmed}
                onChange={e => setIsConfirmed(e.target.checked)}
                disabled={isSigning}
                className='focus:ring-primary/20 mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50'
              />
              <label
                htmlFor='sign-confirmation'
                className='text-sm text-gray-700'
              >
                {t('Contract_Sign_Confirmation_Text')}
              </label>
            </div>

            {/* Action Buttons */}
            <div className='flex items-center justify-end gap-3'>
              <button
                type='button'
                onClick={onClose}
                disabled={isSigning}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {t('Contract_Sign_Cancel')}
              </button>
              <button
                type='button'
                onClick={handleSign}
                disabled={isSigning || !isConfirmed || !signatureName.trim()}
                className='hover:bg-primary/90 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSigning
                  ? t('Contract_Signing_In_Progress')
                  : t('Contract_Sign_Button')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
