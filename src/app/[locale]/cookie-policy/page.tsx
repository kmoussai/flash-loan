import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { locales } from '@/src/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations()
  
  return {
    title: `${t('Cookie_Policy')} - Flash-Loan`,
    description: t('Cookie_Policy_What_Is_Cookie_Description'),
    openGraph: {
      title: t('Cookie_Policy'),
      description: t('Cookie_Policy_What_Is_Cookie_Description'),
      type: 'website',
      locale: locale,
    },
  }
}

export default async function CookiePolicyPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const t = await getTranslations()

  return (
    <div className='min-h-screen bg-white section-padding'>
      <div className='mx-auto max-w-4xl px-6'>
        <h1 className='mb-content text-4xl font-bold text-gray-900'>
          {t('Cookie_Policy')}
        </h1>
        
        <div className='mb-6 text-sm text-gray-600'>
          <p>{t('Cookie_Policy_Effective_Date')}: 03-02-2025</p>
          <p>{t('Cookie_Policy_Last_Updated')}: 03-02-2025</p>
        </div>

        <div className='prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-4'>
          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Cookie_Policy_What_Is_Cookie')}
          </h2>
          <p>{t('Cookie_Policy_What_Is_Cookie_Description')}</p>
          <p>{t('Cookie_Policy_What_Is_Cookie_Explanation')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Cookie_Policy_How_We_Use')}
          </h2>
          <p>{t('Cookie_Policy_How_We_Use_First_Party')}</p>
          <p>{t('Cookie_Policy_How_We_Use_Third_Party')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Cookie_Policy_Types_We_Use')}
          </h2>
          <p>{t('Cookie_Policy_Types_We_Use_Description')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Cookie_Policy_Manage_Preferences')}
          </h2>
          <div className='my-4'>
            <button className='px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium'>
              {t('Cookie_Policy_Settings')}
            </button>
          </div>
          <p>{t('Cookie_Policy_Manage_Preferences_Description')}</p>
          <p>{t('Cookie_Policy_Browser_Methods')}</p>
          
          <div className='mt-6 space-y-2'>
            <p>
              <strong>Chrome:</strong>{' '}
              <a 
                href='https://support.google.com/accounts/answer/32050' 
                target='_blank' 
                rel='noopener noreferrer'
                className='text-primary hover:underline'
              >
                https://support.google.com/accounts/answer/32050
              </a>
            </p>
            <p>
              <strong>Safari:</strong>{' '}
              <a 
                href='https://support.apple.com/en-in/guide/safari/sfri11471/mac' 
                target='_blank' 
                rel='noopener noreferrer'
                className='text-primary hover:underline'
              >
                https://support.apple.com/en-in/guide/safari/sfri11471/mac
              </a>
            </p>
            <p>
              <strong>Firefox:</strong>{' '}
              <a 
                href='https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox?redirectslug=delete-cookies-remove-info-websites-stored&redirectlocale=en-US' 
                target='_blank' 
                rel='noopener noreferrer'
                className='text-primary hover:underline'
              >
                https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox?redirectslug=delete-cookies-remove-info-websites-stored&redirectlocale=en-US
              </a>
            </p>
            <p>
              <strong>Internet Explorer:</strong>{' '}
              <a 
                href='https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc' 
                target='_blank' 
                rel='noopener noreferrer'
                className='text-primary hover:underline'
              >
                https://support.microsoft.com/en-us/topic/how-to-delete-cookie-files-in-internet-explorer-bca9446f-d873-78de-77ba-d42645fa52fc
              </a>
            </p>
          </div>
          
          <p className='mt-4'>{t('Cookie_Policy_Other_Browser')}</p>
        </div>
      </div>
    </div>
  )
}
