'use client'
import { capitalize } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'
import { FiGlobe } from 'react-icons/fi'
import Button from './Button'

const LangSwitcher: React.FC = () => {
  interface Option {
    country: string
    code: string
  }
  const pathname = usePathname()

  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false)
  const options: Option[] = [
    { country: 'English', code: 'en' }, // Native name is the same
    { country: 'Français', code: 'fr' }
  ]

  // Get current language from pathname
  const currentLang = pathname.startsWith('/fr') ? 'fr' : 'en'
  const displayText = currentLang === 'en' ? 'En' : 'Fr'
  
  // Extract the path without the locale prefix
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/'

  return (
    <div className='flex items-center justify-center'>
      <div className='relative'>
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
          <div className='absolute right-0 mt-2 w-full origin-top-right rounded-md bg-dropdown shadow-lg'>
            <div
              className='py-1'
              role='menu'
              aria-orientation='vertical'
              aria-labelledby='options-menu'
            >
              {options.map(lang => {
                const newPath = pathWithoutLocale === '/' 
                  ? `/${lang.code}` 
                  : `/${lang.code}${pathWithoutLocale}`
                
                return (
                  <Link
                    key={lang.code}
                    href={newPath}
                  >
                    <button
                      lang={lang.code}
                      onMouseDown={e => {
                        e.preventDefault()
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-dropdownHover ${
                        pathname.includes(`/${lang.code}`)
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
