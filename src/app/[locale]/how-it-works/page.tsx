import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Link } from '@/src/navigation'
import Button from '../components/Button'
import { FeatureCard } from '../components/FeatureCard'
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
    title: `${t('How_It_Works_Page_Title')} - Flash-Loan`,
    description: t('How_It_Works_Fast_Loans_Description'),
    openGraph: {
      title: t('How_It_Works_Page_Title'),
      description: t('How_It_Works_Fast_Loans_Description'),
      type: 'website',
      locale: locale,
    },
  }
}

export default async function HowItWorks({
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
            {t('How_It_Works_Page_Title')}
          </h1>
        </div>
      </section>

      {/* Step 01 - Fast Loans */}
      <section className='section-padding bg-white border-b border-gray-200'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
            <div>
              <div className='mb-content inline-flex items-center gap-2 text-2xl font-bold text-primary'>
                01
              </div>
              <h2 className='mb-content text-3xl font-bold text-gray-900'>
                {t('How_It_Works_Fast_Loans_Title')}
              </h2>
              <p className='text-lg text-gray-600 leading-relaxed'>
                {t('How_It_Works_Fast_Loans_Description')}
              </p>
            </div>
            <div className='flex justify-center'>
              <div className='relative w-full max-w-lg'>
                <div className='relative h-80 w-full rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden'>
                  <Image
                    src='/images/money-handover-fast-loans.jpeg'
                    alt={t('How_It_Works_Fast_Loans_Image_Alt')}
                    width={600}
                    height={400}
                    className='h-full w-full object-cover'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 02 - Accessible Conditions */}
      <section className='section-padding bg-gray-50 border-b border-gray-200'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
            <div className='flex justify-center order-2 lg:order-1'>
              <div className='relative w-full max-w-lg'>
                <div className='relative h-80 w-full rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden'>
                  <Image
                    src='/images/contract-signing-fast-loans.jpeg'
                    alt={t('How_It_Works_Accessible_Conditions_Image_Alt')}
                    width={600}
                    height={400}
                    className='h-full w-full object-cover'
                  />
                </div>
              </div>
            </div>
            <div className='order-1 lg:order-2'>
              <div className='mb-content inline-flex items-center gap-2 text-2xl font-bold text-primary'>
                02
              </div>
              <h2 className='mb-content text-3xl font-bold text-gray-900'>
                {t('How_It_Works_Accessible_Conditions_Title')}
              </h2>
              <p className='text-lg text-gray-600 leading-relaxed'>
                {t('How_It_Works_Accessible_Conditions_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Step 03 - Flexible Repayment */}
      <section className='section-padding bg-white border-b border-gray-200'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
            <div>
              <div className='mb-content inline-flex items-center gap-2 text-2xl font-bold text-primary'>
                03
              </div>
              <h2 className='mb-content text-3xl font-bold text-gray-900'>
                {t('How_It_Works_Flexible_Repayment_Title')}
              </h2>
              <p className='text-lg text-gray-600 leading-relaxed'>
                {t('How_It_Works_Flexible_Repayment_Description')}
              </p>
            </div>
            <div className='flex justify-center'>
              <div className='relative w-full max-w-lg'>
                <div className='relative h-80 w-full rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden'>
                  <Image
                    src='/images/money-from-fast-loans.jpeg'
                    alt={t('How_It_Works_Flexible_Repayment_Image_Alt')}
                    width={600}
                    height={400}
                    className='h-full w-full object-cover'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 04 - Loan Renewal */}
      <section className='section-padding bg-gray-50 border-b border-gray-200'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
            <div className='flex justify-center order-2 lg:order-1'>
              <div className='relative w-full max-w-lg'>
                <div className='relative h-80 w-full rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden'>
                  <Image
                    src='/images/agent-shaking-hands-client-fast-loans.jpeg'
                    alt={t('How_It_Works_Loan_Renewal_Image_Alt')}
                    width={600}
                    height={400}
                    className='h-full w-full object-cover'
                  />
                </div>
              </div>
            </div>
            <div className='order-1 lg:order-2'>
              <div className='mb-content inline-flex items-center gap-2 text-2xl font-bold text-primary'>
                04
              </div>
              <h2 className='mb-content text-3xl font-bold text-gray-900'>
                {t('How_It_Works_Loan_Renewal_Title')}
              </h2>
              <p className='text-lg text-gray-600 leading-relaxed'>
                {t('How_It_Works_Loan_Renewal_Description')}
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
