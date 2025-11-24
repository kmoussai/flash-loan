'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { ClientDocumentRequest } from './types'

interface DocumentRequestFormProps {
  request: ClientDocumentRequest
  file: File | null
  uploading: boolean
  uploadSuccess: boolean
  error: string | null
  onFileChange: (file: File | null) => void
  onUpload: () => void
}

export default function DocumentRequestForm({
  request,
  file,
  uploading,
  uploadSuccess,
  error,
  onFileChange,
  onUpload
}: DocumentRequestFormProps) {
  const t = useTranslations('Client_Dashboard')

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFileChange(e.target.files?.[0] || null)
    },
    [onFileChange]
  )

  if (request.status === 'uploaded' || request.status === 'verified') {
    return (
      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700'>
        {t('File_Uploaded_Successfully') || 'File uploaded successfully'}
        {request.status === 'verified' && (
          <span className='ml-2 font-medium'>{t('Verified') || 'Verified'}</span>
        )}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {request.status === 'rejected' && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {t('Document_Rejected') ||
            'Document was rejected. Please upload a new file.'}
        </div>
      )}

      <div>
        <label
          htmlFor={`file-${request.id}`}
          className='mb-2 block text-sm font-medium text-primary'
        >
          {t('Select_File') || 'Select File'} *
        </label>
        <input
          type='file'
          id={`file-${request.id}`}
          onChange={handleFileChange}
          accept='image/jpeg,image/png,application/pdf'
          className='block w-full cursor-pointer text-sm text-gray-700 file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90'
        />
        <p className='mt-1 text-xs text-gray-500'>
          {t('Allowed_Formats') || 'Allowed: JPEG, PNG, PDF. Max size: 10MB'}
        </p>
        {file && (
          <p className='mt-2 text-sm text-gray-600'>
            {t('Selected') || 'Selected'}: {file.name}
          </p>
        )}
      </div>

      {error && (
        <div className='rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {error}
        </div>
      )}

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <button
          type='button'
          onClick={onUpload}
          disabled={!file || uploading}
          className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
        >
          {uploading
            ? t('Uploading_Dots') || 'Uploading...'
            : t('Upload_Document') || 'Upload Document'}
        </button>

        {uploadSuccess && (
          <span className='inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700'>
            <svg
              className='mr-2 h-4 w-4'
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
            {t('Uploaded_Successfully') || 'Uploaded successfully'}
          </span>
        )}
      </div>
    </div>
  )
}

