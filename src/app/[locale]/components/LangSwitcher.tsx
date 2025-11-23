'use client'
import { capitalize } from '@/lib/utils'
import { Link, usePathname } from '@/src/navigation'
import { useParams } from 'next/navigation'
import React, { useState } from 'react'
import { FiGlobe } from 'react-icons/fi'
import Button from './Button'

const LangSwitcher: React.FC = () => {
  interface Option {
    country: string
    code: string
  }
  const pathname = usePathname()
  const params = useParams()
  const currentLocale = (params.locale as string) || 'en'

  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false)
  const options: Option[] = [
    { country: 'English', code: 'en' }, // Native name is the same
    { country: 'Français', code: 'fr' }
  ]

  // Get current language from params
  const currentLang = currentLocale
  const displayText = currentLang === 'en' ? 'En' : 'Fr'
  
  // Use the locale-aware pathname (already without locale prefix)
  const pathWithoutLocale = pathname || '/'

  return (
    <div className='flex items-center justify-center'>
      <div className='relative z-[100]'>
        <Button
          className='text-destructive inline-flex w-full items-center justify-between gap-3'
          size='small'
          onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
          onBlur={() => setIsOptionsExpanded(false)}
        >
          {displayText}
          <FiGlobe />
        </Button>
        {isOptionsExpanded && (
          <div className='absolute right-0 mt-2 w-full origin-top-right rounded-md bg-dropdown shadow-lg z-[100]'>
            <div
              className='py-1'
              role='menu'
              aria-orientation='vertical'
              aria-labelledby='options-menu'
            >
              {options.map(lang => {
                // Use locale-aware Link - it will automatically add the locale prefix
                // For locale switching, we need to construct the full path with the target locale
                const targetPath = pathWithoutLocale === '/' ? '/' : pathWithoutLocale
                
                return (
                  <Link
                    key={lang.code}
                    href={targetPath}
                    locale={lang.code}
                  >
                    <button
                      lang={lang.code}
                      onMouseDown={e => {
                        e.preventDefault()
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-dropdownHover ${
                        currentLocale === lang.code
                          ? 'bg-selected text-primary hover:bg-selected'
                          : 'text-secondary'
                      }`}
                    >
                      {lang.code === 'en' ? 'En' : 'Fr'}
                    </button>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LangSwitcher
