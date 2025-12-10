import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Link } from '@/src/navigation'
import { locales } from '@/src/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale }
}: {
  params: { locale: string }
}): Promise<Metadata> {
  setRequestLocale(locale)
  const t = await getTranslations()
  
  return {
    title: `${t('Privacy_Policy_Page')} - Flash-Loan`,
    description: t('Privacy_Policy_Introduction'),
    openGraph: {
      title: t('Privacy_Policy_Page'),
      description: t('Privacy_Policy_Introduction'),
      type: 'website',
      locale: locale,
    },
  }
}

export default async function PrivacyPolicyPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()

  return (
    <div className='min-h-screen bg-white section-padding'>
      <div className='mx-auto max-w-4xl px-6'>
        <h1 className='mb-content text-4xl font-bold text-gray-900'>
          {t('Privacy_Policy_Page')}
        </h1>
        
        <div className='mb-6 text-sm text-gray-600'>
          <p>{t('Privacy_Policy_Last_Updated')}: 03-02-2025</p>
          <p>{t('Privacy_Policy_Effective_Date')}: 03-02-2025</p>
        </div>

        <div className='prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-4'>
          <p>
            {t('Privacy_Policy_Introduction')}
          </p>

          <p>
            {t('Privacy_Policy_Changes')}
          </p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Information_We_Collect')}
          </h2>
          <p>{t('Privacy_Policy_Information_We_Collect_Description')}</p>
          <ul className='list-disc pl-6 space-y-2'>
            <li>{t('Privacy_Policy_Info_Name')}</li>
            <li>{t('Privacy_Policy_Info_Email')}</li>
          </ul>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_How_We_Use')}
          </h2>
          <p>{t('Privacy_Policy_How_We_Use_Description')}</p>
          <ul className='list-disc pl-6 space-y-2'>
            <li>{t('Privacy_Policy_Use_Marketing')}</li>
            <li>{t('Privacy_Policy_Use_Targeted_Advertising')}</li>
            <li>{t('Privacy_Policy_Use_Other_Purposes')}</li>
          </ul>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_How_We_Share')}
          </h2>
          <p>{t('Privacy_Policy_How_We_Share_Description')}</p>
          <ul className='list-disc pl-6 space-y-2'>
            <li>{t('Privacy_Policy_Share_Advertising')}</li>
            <li>{t('Privacy_Policy_Share_Analytics')}</li>
            <li>{t('Privacy_Policy_Share_Data_Collection')}</li>
          </ul>
          <p className='mt-3'>{t('Privacy_Policy_Share_Third_Parties')}</p>
          <p className='mt-3'>{t('Privacy_Policy_Share_Disclosure')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Retention')}
          </h2>
          <p>{t('Privacy_Policy_Retention_Description')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Your_Rights')}
          </h2>
          <p>{t('Privacy_Policy_Your_Rights_Description')}</p>
          <p className='mt-3'>
            {t('Privacy_Policy_Your_Rights_Contact')}{' '}
            <a 
              href='mailto:contact@flash-loan.ca' 
              className='text-primary hover:underline'
            >
              contact@flash-loan.ca
            </a>
            . {t('Privacy_Policy_Your_Rights_Response')}
          </p>
          <p className='mt-3'>{t('Privacy_Policy_Your_Rights_Note')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Cookies')}
          </h2>
          <p>
            {t('Privacy_Policy_Cookies_Description')}{' '}
            <Link href='/cookie-policy' className='text-primary hover:underline'>
              {t('Cookie_Policy')}
            </Link>
            .
          </p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Security')}
          </h2>
          <p>{t('Privacy_Policy_Security_Description')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Third_Party_Links')}
          </h2>
          <p>{t('Privacy_Policy_Third_Party_Links_Description')}</p>

          <h2 className='text-2xl font-bold text-gray-900 mt-6 mb-content'>
            {t('Privacy_Policy_Data_Protection_Officer')}
          </h2>
          <p>
            {t('Privacy_Policy_Data_Protection_Officer_Description')}{' '}
            <a 
              href='mailto:contact@flash-loan.ca' 
              className='text-primary hover:underline'
            >
              contact@flash-loan.ca
            </a>
            . {t('Privacy_Policy_Data_Protection_Officer_Response')}
          </p>
        </div>
      </div>
    </div>
  )
}
