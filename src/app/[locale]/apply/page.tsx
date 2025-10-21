'use client'
import { useTranslations } from 'next-intl'
import Button from '../components/Button'

/**
 * Apply Page - Coming Soon
 * 
 * A professional placeholder page for the loan application portal.
 * Features:
 * - Centered hero section with gradient background
 * - Animated icon with pulse effect
 * - Clear messaging about upcoming features
 * - Preview of what users can expect
 * - Responsive design consistent with the app's theme
 */
export default function ApplyPage() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section with gradient background */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          {/* Animated icon with pulse effect */}
          <div className='mb-8 flex justify-center'>
            <div className='relative'>
              {/* Pulsing outer ring animation */}
              <div className='absolute inset-0 animate-ping rounded-full bg-primary/20 opacity-75'></div>
              {/* Static icon container */}
              <div className='relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg'>
                <span className='text-4xl'>📝</span>
              </div>
            </div>
          </div>

          {/* Main heading */}
          <h1 className='mb-4 text-5xl font-bold text-primary lg:text-6xl'>
            {t('Apply_Page_Title')}
          </h1>

          {/* Coming Soon badge with gradient background */}
          <div className='mb-6 inline-block'>
            <span className='rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 px-6 py-2 text-sm font-semibold text-primary'>
              {t('Apply_Coming_Soon')}
            </span>
          </div>

          {/* Description text */}
          <p className='mb-8 text-xl text-text-secondary'>
            {t('Apply_Description')}
          </p>

          {/* Subtitle with lighter text */}
          <p className='mb-10 text-lg text-text-secondary/80'>
            {t('Apply_Subtitle')}
          </p>

          {/* Call-to-action button */}
          <Button size='large' className='bg-primary text-white hover:bg-primary/90'>
            {t('Contact')}
          </Button>
        </div>
      </section>

      {/* Features Section - What to Expect */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          {/* Section heading */}
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('Apply_Features_Title')}
            </h2>
            <p className='text-xl text-text-secondary'>
              {t('Be_First_To_Know')}
            </p>
          </div>

          {/* Features grid with three cards */}
          <div className='grid gap-8 md:grid-cols-3'>
            {/* Feature 1: Simple & Fast */}
            <div className='rounded-lg bg-background-secondary p-8 text-center transition-transform duration-300 hover:scale-105'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20'>
                  <span className='text-3xl'>⚡</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Apply_Feature_1')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Apply_Feature_1_Description')}
              </p>
            </div>

            {/* Feature 2: Instant Decision */}
            <div className='rounded-lg bg-background-secondary p-8 text-center transition-transform duration-300 hover:scale-105'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20'>
                  <span className='text-3xl'>✅</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Apply_Feature_2')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Apply_Feature_2_Description')}
              </p>
            </div>

            {/* Feature 3: Secure Process */}
            <div className='rounded-lg bg-background-secondary p-8 text-center transition-transform duration-300 hover:scale-105'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20'>
                  <span className='text-3xl'>🔒</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Apply_Feature_3')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Apply_Feature_3_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section with gradient background */}
      <section className='bg-gradient-to-r from-primary to-secondary py-16'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-6 text-3xl font-bold text-white'>
            {t('Dont_Wait_Start_Today')}
          </h2>
          <p className='mb-8 text-lg text-white/90'>
            {t('CTA_Description')}
          </p>
          <Button 
            size='large'
            className='bg-white text-primary hover:bg-white/90'
          >
            {t('Contact_Us_Subtitle')}
          </Button>
        </div>
      </section>
    </div>
  )
}

