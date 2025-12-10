import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { Link } from '@/src/navigation'
import Button from '../components/Button'
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
    title: `${t('Repayment_Page_Title')} - Flash-Loan`,
    description: t('Repayment_At_Your_Pace_Description'),
    openGraph: {
      title: t('Repayment_Page_Title'),
      description: t('Repayment_At_Your_Pace_Description'),
      type: 'website',
      locale: locale,
    },
  }
}

export default async function Repayment({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()

  return (
    <div className='min-h-screen bg-white'>
      {/* Hero Section */}
      <section className='bg-white section-padding border-b border-gray-200'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h1 className='mb-content text-5xl font-bold text-gray-900'>
            {t('Repayment_Page_Title')}
          </h1>
          <h2 className='mb-4 text-2xl font-semibold text-gray-700'>
            {t('Repayment_Solutions_Title')}
          </h2>
        </div>
      </section>

      {/* Main Content Section */}
      <section className='section-padding bg-white border-b border-gray-200'>
        <div className='mx-auto max-w-4xl px-6'>
          <div className='mb-section text-center'>
            <h2 className='mb-content text-3xl font-bold text-gray-900'>
              {t('Repayment_At_Your_Pace')}
            </h2>
            <p className='text-lg text-gray-600 leading-relaxed'>
              {t('Repayment_At_Your_Pace_Description')}
            </p>
          </div>

          {/* Simplified Experience Section */}
          <div className='mb-section'>
            <h2 className='mb-6 text-3xl font-bold text-gray-900 text-center'>
              {t('Repayment_Simplified_Experience')}
            </h2>

            {/* Flexible Repayment Term */}
            <div className='mb-6 rounded-xl bg-gray-50 p-6 border border-gray-200'>
              <h3 className='mb-content text-2xl font-semibold text-gray-900'>
                {t('Repayment_Flexible_Term')}
              </h3>
              <p className='text-gray-600 leading-relaxed'>
                {t('Repayment_Flexible_Term_Description')}
              </p>
            </div>

            {/* Interest Rates */}
            <div className='mb-6 rounded-xl bg-gray-50 p-6 border border-gray-200'>
              <h3 className='mb-content text-2xl font-semibold text-gray-900'>
                {t('Repayment_Interest_Rates')}
              </h3>
              <p className='text-gray-600 leading-relaxed'>
                {t('Repayment_Interest_Rates_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='bg-primary section-padding border-t border-primary/20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-content text-5xl font-bold text-white'>
            {t('Dont_Wait_Start_Today')}
          </h2>
          <p className='mb-6 text-xl text-white/90'>
            {t('CTA_Description')}
          </p>
          <Link href='/apply'>
            <Button 
              size='large'
              className='bg-white text-primary hover:bg-gray-100 shadow-lg transition-all hover:scale-105'
            >
              {t('Apply_Now')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
