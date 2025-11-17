'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { RequestFormProps } from './types'

interface SchemaField {
  id: string
  label?: string
  type?: string
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: Array<{ value: string; label: string }>
  defaultValue?: any
  default?: any
}

export default function GenericRequestForm({
  request,
  values,
  errors,
  submitting,
  success,
  onValueChange,
  onSubmit
}: RequestFormProps) {
  const t = useTranslations('Client_Dashboard')

  const fields: SchemaField[] = (request.form_schema?.fields as SchemaField[]) || []

  const renderSchemaField = useCallback(
    (field: SchemaField) => {
      const value = values[field.id] ?? ''
      const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onValueChange(field.id, e.target.value)
      const label = field.label || field.id
      const placeholder = field.placeholder || ''
      const isRequired = !!field.required

      switch (field.type) {
        case 'textarea':
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                rows={4}
              />
              {field.helperText && (
                <p className='text-xs text-text-secondary'>{field.helperText}</p>
              )}
            </div>
          )
        case 'select':
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <select
                value={value}
                onChange={onChange}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              >
                <option value='' disabled>
                  {placeholder || (t('Select_Option') as string) || 'Select an option'}
                </option>
                {(field.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {field.helperText && (
                <p className='text-xs text-text-secondary'>{field.helperText}</p>
              )}
            </div>
          )
        case 'date':
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <input
                type='date'
                value={value}
                onChange={onChange}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              />
            </div>
          )
        case 'phone':
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <input
                type='tel'
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              />
            </div>
          )
        case 'number':
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <input
                type='number'
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              />
            </div>
          )
        case 'text':
        default:
          return (
            <div key={field.id} className='space-y-2'>
              <label className='mb-2 block text-sm font-medium text-primary'>
                {label}
                {isRequired ? <span className='ml-1 text-red-500'>*</span> : null}
              </label>
              <input
                type='text'
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={isRequired}
                className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
              />
              {field.helperText && (
                <p className='text-xs text-text-secondary'>{field.helperText}</p>
              )}
            </div>
          )
      }
    },
    [values, onValueChange, t]
  )

  // If no fields, show a simple textarea
  if (fields.length === 0) {
    return (
      <div className='space-y-4'>
        <textarea
          value={values['notes'] ?? ''}
          onChange={e => onValueChange('notes', e.target.value)}
          placeholder={t('Provide_Details') || 'Provide the requested information here'}
          className='w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
          rows={4}
        />

        {/* Error */}
        {errors && (
          <div className='mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
            {errors}
          </div>
        )}

        {/* Actions */}
        <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <button
            type='button'
            onClick={onSubmit}
            disabled={submitting}
            className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
          >
            {submitting
              ? t('Submitting_Dots') || 'Submitting...'
              : t('Submit_Information') || 'Submit Information'}
          </button>

          {success && (
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
              {t('Information_Submitted') || 'Information submitted'}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {fields.map(field => renderSchemaField(field))}

      {/* Error */}
      {errors && (
        <div className='mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
          {errors}
        </div>
      )}

      {/* Actions */}
      <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <button
          type='button'
          onClick={onSubmit}
          disabled={submitting}
          className='inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50'
        >
          {submitting
            ? t('Submitting_Dots') || 'Submitting...'
            : t('Submit_Information') || 'Submit Information'}
        </button>

        {success && (
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
            {t('Information_Submitted') || 'Information submitted'}
          </span>
        )}
      </div>
    </div>
  )
}

