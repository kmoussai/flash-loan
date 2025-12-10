import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Link } from '@/src/navigation'
import Button from './components/Button'
import { FeatureCard } from './components/FeatureCard'
import { TestimonialCard } from './components/TestimonialCard'
import { StepCard } from './components/StepCard'
import { SectionHeader } from './components/SectionHeader'
import { StructuredData } from './components/StructuredData'
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
    title: 'Flash-Loan - Personal Loans & Micro-Credits',
    description: t('Get_Up_To_1500_Today'),
    openGraph: {
      title: t('Get_Personal_Loan_Title'),
      description: t('Get_Up_To_1500_Today'),
      type: 'website',
      locale: locale,
    },
  }
}

export default async function HomePage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: 'Flash-Loan',
    description: t('Get_Up_To_1500_Today'),
    offers: {
      '@type': 'Offer',
      name: 'Personal Loan',
      description: t('Get_Personal_Loan_Title'),
      priceCurrency: 'CAD',
      price: '1500',
      availability: 'https://schema.org/InStock'
    },
    areaServed: {
      '@type': 'Country',
      name: 'Canada'
    }
  }

  return (
    <>
      <StructuredData structuredData={structuredData} />
      <div className='min-h-screen bg-white'>
        {/* Hero Section - Modern Flat Design */}
        <section className='relative overflow-hidden bg-white section-padding border-b border-gray-200'>
          <div className='relative mx-auto max-w-7xl px-6'>
            <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
              <div className='text-center lg:text-left'>
                <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary'>
                  <span className='relative flex h-2 w-2'>
                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75'></span>
                    <span className='relative inline-flex h-2 w-2 rounded-full bg-primary'></span>
                  </span>
                  {t('Fast_Reliable_Loans')}
                </div>
                <h1 className='mb-4 text-5xl font-extrabold leading-tight text-gray-900 lg:text-7xl'>
                  {t('Get_Personal_Loan_Title')}
                </h1>
                <p className='mb-6 text-xl leading-relaxed text-gray-600'>
                  {t('Get_Up_To_1500_Today')}
                </p>
                <div className='flex flex-col gap-content sm:flex-row'>
                  <Link href='/apply'>
                    <Button size='large' className='bg-primary text-white hover:bg-primary/90 shadow-md transition-all hover:scale-105'>
                      {t('Apply_Now')}
                    </Button>
                  </Link>
                  
                  <Link href='/how-it-works'>
                    <Button variant='secondary' size='large' className='bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'>
                      {t('Learn_More')}
                    </Button>
                  </Link>
                </div>
              </div>
              <div className='relative flex justify-center'>
                <div className='relative h-[500px] w-full max-w-xl'>
                  <div className='relative h-full w-full overflow-hidden rounded-2xl border border-gray-200 shadow-lg'>
                    <Image 
                      src='/images/laughing-businesswoman-working-in-office-with-laptop-3756679.jpeg'
                      alt={t('Hero_Image_Placeholder')}
                      width={600}
                      height={500}
                      className='h-full w-full object-cover'
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Expertise Section - Clean and Light */}
        <section className='section-padding bg-gray-50 border-b border-gray-200'>
          <div className='mx-auto max-w-7xl px-6'>
            <SectionHeader 
              title={t('Our_Expertise')}
              subtitle={t('What_Makes_Us_Unique')}
            />

            <div className='grid gap-section md:grid-cols-3'>
              <FeatureCard
                number="01"
                title={t('Simplified_Procedures')}
                description={t('Simplified_Procedures_Description')}
              />
              <FeatureCard
                number="02"
                title={t('Total_Transparency')}
                description={t('Total_Transparency_Description')}
              />
              <FeatureCard
                number="03"
                title={t('Flexible_Repayment')}
                description={t('Flexible_Repayment_Description')}
              />
            </div>
          </div>
        </section>

        {/* About Us Section - Clean White */}
        <section className='section-padding bg-white border-b border-gray-200'>
          <div className='mx-auto max-w-7xl px-6'>
            <div className='grid gap-8 lg:grid-cols-2 lg:items-center'>
              <div className='flex justify-center'>
                <div className='relative w-full max-w-lg'>
                  <div className='relative h-80 w-full rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200 shadow-sm'>
                    <div className='text-center p-8'>
                      <div className='mb-4 inline-flex h-20 w-20 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm'>
                        <span className='text-4xl'>💼</span>
                      </div>
                      <p className='text-gray-500 text-sm'>{t('About_Image_Placeholder')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className='mb-4 text-4xl font-bold text-gray-900'>
                  {t('About_Us_Section')}
                </h2>
                <h3 className='mb-3 text-2xl font-semibold text-gray-800'>
                  {t('Our_Mission_Vision')}
                </h3>
                <p className='mb-6 text-gray-600 leading-relaxed text-lg'>
                  {t('About_Us_Description')}
                </p>
                <Link href='/apply'>
                  <Button variant='secondary' size='large' className='bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'>
                    {t('Apply_Now')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - Modern Cards */}
        <section className='section-padding bg-gray-50 border-b border-gray-200'>
          <div className='mx-auto max-w-7xl px-6'>
            <SectionHeader 
              title={t('How_It_Works_Section')}
              subtitle={t('Fast_Affordable_Loans_For_All_Needs')}
            />

            <div className='grid gap-section md:grid-cols-3'>
              <StepCard
                icon="💰"
                title={t('Fast_Loans')}
                description={t('Fast_Loans_Description')}
                ctaText={t('Apply_Now')}
                ctaHref="/apply"
              />
              <StepCard
                icon="📋"
                title={t('Accessible_Conditions')}
                description={t('Accessible_Conditions_Description')}
                ctaText={t('Apply_Now')}
                ctaHref="/apply"
              />
              <StepCard
                icon="💳"
                title={t('Flexible_Repayment')}
                description={t('Flexible_Repayment_Step_Description')}
                ctaText={t('Apply_Now')}
                ctaHref="/apply"
              />
            </div>
          </div>
        </section>

        {/* Testimonials Section - Clean White */}
        <section className='section-padding bg-white border-b border-gray-200'>
          <div className='mx-auto max-w-7xl px-6'>
            <SectionHeader 
              title={t('Testimonials')}
              subtitle={t('What_Our_Clients_Say')}
            />

            <div className='grid gap-section md:grid-cols-2'>
              <TestimonialCard
                text={t('Testimonial_1_Text')}
                name={t('Testimonial_1_Name')}
                title={t('Testimonial_1_Title')}
                initials="JD"
              />
              <TestimonialCard
                text={t('Testimonial_2_Text')}
                name={t('Testimonial_2_Name')}
                title={t('Testimonial_2_Title')}
                initials="SM"
              />
            </div>
          </div>
        </section>

        {/* Conditions Section - Light Gray */}
        <section className='section-padding bg-gray-50 border-b border-gray-200'>
          <div className='mx-auto max-w-7xl px-6'>
            <div className='mb-section text-center'>
              <h2 className='mb-content text-4xl font-bold text-gray-900'>
                {t('Conditions_For_Personal_Loans')}
              </h2>
              <div className='mb-6 rounded-xl bg-white p-6 border border-gray-200 shadow-sm'>
                <p className='mb-4 text-2xl font-bold text-gray-900'>
                  {t('Annual_Interest_Rate')}
                </p>
                <p className='text-lg text-gray-600'>
                  {t('Age_Residence_Income_Requirements')}
                </p>
              </div>
            </div>

            <div className='grid gap-section md:grid-cols-3'>
              <div className='group rounded-xl bg-white p-6 text-center border border-gray-200 transition-all hover:shadow-md hover:border-primary/20'>
                <h3 className='mb-content text-xl font-semibold text-gray-900'>
                  {t('Repayment_Plan')}
                </h3>
                <p className='text-gray-600'>
                  {t('Repayment_Plan_Description')}
                </p>
              </div>
              <div className='group rounded-xl bg-white p-6 text-center border border-gray-200 transition-all hover:shadow-md hover:border-primary/20'>
                <h3 className='mb-content text-xl font-semibold text-gray-900'>
                  {t('Amortization_Schedule')}
                </h3>
                <p className='text-gray-600'>
                  {t('Amortization_Schedule_Description')}
                </p>
              </div>
              <div className='group rounded-xl bg-white p-6 text-center border border-gray-200 transition-all hover:shadow-md hover:border-primary/20'>
                <h3 className='mb-content text-xl font-semibold text-gray-900'>
                  {t('Financial_Assistance')}
                </h3>
                <p className='text-gray-600'>
                  {t('Financial_Assistance_Description')}
                </p>
              </div>
            </div>

            <div className='mt-8 rounded-xl bg-white p-6 border border-gray-200 shadow-sm'>
              <h3 className='mb-content text-2xl font-semibold text-gray-900'>
                {t('Repayment_Options')}
              </h3>
              <p className='mb-4 text-gray-600 leading-relaxed'>
                {t('Repayment_Options_Description')}
              </p>
              <div className='grid gap-content md:grid-cols-3'>
                <div className='rounded-lg bg-gray-50 p-6 border border-gray-200'>
                  <h4 className='mb-2 font-semibold text-gray-900'>{t('Bi_Weekly')}</h4>
                  <p className='text-sm text-gray-600'>{t('Bi_Weekly_Example')}</p>
                </div>
                <div className='rounded-lg bg-gray-50 p-6 border border-gray-200'>
                  <h4 className='mb-2 font-semibold text-gray-900'>{t('Weekly')}</h4>
                  <p className='text-sm text-gray-600'>{t('Weekly_Example')}</p>
                </div>
                <div className='rounded-lg bg-gray-50 p-6 border border-gray-200'>
                  <h4 className='mb-2 font-semibold text-gray-900'>{t('Monthly')}</h4>
                  <p className='text-sm text-gray-600'>{t('Monthly_Example')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Modern Flat Design */}
        <section className='relative overflow-hidden bg-primary section-padding border-t border-primary/20'>
          <div className='relative mx-auto max-w-4xl px-6 text-center'>
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
    </>
  )
}
