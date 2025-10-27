'use client'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/src/navigation'
import Button from './components/Button'

export default function HomePage() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-white'>
      {/* Hero Section - Modern and Light */}
      <section className='relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-24'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent'></div>
        <div className='relative mx-auto max-w-7xl px-6'>
          <div className='grid gap-12 lg:grid-cols-2 lg:items-center'>
            <div className='text-center lg:text-left'>
              <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm'>
                <span className='relative flex h-2 w-2'>
                  <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75'></span>
                  <span className='relative inline-flex h-2 w-2 rounded-full bg-primary'></span>
                </span>
                {t('Fast_Reliable_Loans')}
              </div>
              <h1 className='mb-6 text-5xl font-extrabold leading-tight text-gray-900 lg:text-7xl'>
                {t('Get_Personal_Loan_Title')}
              </h1>
              <p className='mb-8 text-xl leading-relaxed text-gray-600'>
                {t('Get_Up_To_1500_Today')}
              </p>
              <div className='flex flex-col gap-4 sm:flex-row'>
                <Link href='/apply'>
                  <Button size='large' className='bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105'>
                    {t('Apply_Now')}
                  </Button>
                </Link>
                <Link href='/how-it-works'>
                  <Button variant='secondary' size='large' className='bg-white text-gray-700 hover:bg-gray-50'>
                    {t('Learn_More')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className='relative flex justify-center'>
              <div className='relative h-[500px] w-full max-w-xl'>
                <div className='absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 blur-3xl'></div>
                <div className='relative h-full w-full overflow-hidden rounded-3xl shadow-2xl'>
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
      <section className='py-24 bg-gray-50'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-gray-900'>
              {t('Our_Expertise')}
            </h2>
            <p className='text-xl text-gray-600'>
              {t('What_Makes_Us_Unique')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Feature 1 */}
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-lg hover:-translate-y-1'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-bold text-primary transition-transform group-hover:scale-110'>
                  01
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Simplified_Procedures')}
              </h3>
              <p className='text-gray-600 leading-relaxed'>
                {t('Simplified_Procedures_Description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-lg hover:-translate-y-1'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-bold text-primary transition-transform group-hover:scale-110'>
                  02
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Total_Transparency')}
              </h3>
              <p className='text-gray-600 leading-relaxed'>
                {t('Total_Transparency_Description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-lg hover:-translate-y-1'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-bold text-primary transition-transform group-hover:scale-110'>
                  03
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Flexible_Repayment')}
              </h3>
              <p className='text-gray-600 leading-relaxed'>
                {t('Flexible_Repayment_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section - Clean White */}
      <section className='py-24 bg-white'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='grid gap-16 lg:grid-cols-2 lg:items-center'>
            <div className='flex justify-center'>
              <div className='relative w-full max-w-lg'>
                <div className='absolute -bottom-4 -left-4 h-full w-full rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10'></div>
                <div className='relative h-80 w-full rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-xl'>
                  <div className='text-center p-12'>
                    <div className='mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg'>
                      <span className='text-4xl'>💼</span>
                    </div>
                    <p className='text-gray-500 text-sm'>{t('About_Image_Placeholder')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className='mb-6 text-4xl font-bold text-gray-900'>
                {t('About_Us_Section')}
              </h2>
              <h3 className='mb-4 text-2xl font-semibold text-gray-800'>
                {t('Our_Mission_Vision')}
              </h3>
              <p className='mb-8 text-gray-600 leading-relaxed text-lg'>
                {t('About_Us_Description')}
              </p>
              <Link href='/apply'>
                <Button variant='secondary' size='large' className='bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'>
                  {t('Apply_Now')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Modern Cards */}
      <section className='py-24 bg-gradient-to-b from-white to-gray-50'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-gray-900'>
              {t('How_It_Works_Section')}
            </h2>
            <p className='text-xl text-gray-600'>
              {t('Fast_Affordable_Loans_For_All_Needs')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Step 1 */}
            <div className='group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2'>
              <div className='mb-6 flex justify-center'>
                <div className='h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center transition-transform group-hover:scale-110'>
                  <span className='text-4xl'>💰</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Fast_Loans')}
              </h3>
              <p className='mb-6 text-gray-600 leading-relaxed'>
                {t('Fast_Loans_Description')}
              </p>
              <Link href='/apply'>
                <Button variant='secondary' size='small' className='bg-gray-50 text-gray-900 hover:bg-gray-100'>
                  {t('Apply_Now')}
                </Button>
              </Link>
            </div>

            {/* Step 2 */}
            <div className='group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2'>
              <div className='mb-6 flex justify-center'>
                <div className='h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center transition-transform group-hover:scale-110'>
                  <span className='text-4xl'>📋</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Accessible_Conditions')}
              </h3>
              <p className='mb-6 text-gray-600 leading-relaxed'>
                {t('Accessible_Conditions_Description')}
              </p>
              <Link href='/apply'>
                <Button variant='secondary' size='small' className='bg-gray-50 text-gray-900 hover:bg-gray-100'>
                  {t('Apply_Now')}
                </Button>
              </Link>
            </div>

            {/* Step 3 */}
            <div className='group rounded-2xl bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2'>
              <div className='mb-6 flex justify-center'>
                <div className='h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center transition-transform group-hover:scale-110'>
                  <span className='text-4xl'>💳</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Flexible_Repayment')}
              </h3>
              <p className='mb-6 text-gray-600 leading-relaxed'>
                {t('Flexible_Repayment_Step_Description')}
              </p>
              <Link href='/apply'>
                <Button variant='secondary' size='small' className='bg-gray-50 text-gray-900 hover:bg-gray-100'>
                  {t('Apply_Now')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Clean White */}
      <section className='py-24 bg-white'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-gray-900'>
              {t('Testimonials')}
            </h2>
            <p className='text-xl text-gray-600'>
              {t('What_Our_Clients_Say')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-2'>
            {/* Testimonial 1 */}
            <div className='rounded-2xl bg-gradient-to-br from-gray-50 to-white p-8 shadow-sm border border-gray-100'>
              <div className='mb-4 flex text-yellow-400'>
                {'★★★★★'.split('').map((star, index) => (
                  <span key={index}>{star}</span>
                ))}
              </div>
              <p className='mb-6 text-gray-700 leading-relaxed'>
                {t('Testimonial_1_Text')}
              </p>
              <div className='flex items-center'>
                <div className='mr-4 h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center'>
                  <span className='text-gray-800 font-semibold'>JD</span>
                </div>
                <div>
                  <p className='font-semibold text-gray-900'>{t('Testimonial_1_Name')}</p>
                  <p className='text-sm text-gray-600'>{t('Testimonial_1_Title')}</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className='rounded-2xl bg-gradient-to-br from-gray-50 to-white p-8 shadow-sm border border-gray-100'>
              <div className='mb-4 flex text-yellow-400'>
                {'★★★★★'.split('').map((star, index) => (
                  <span key={index}>{star}</span>
                ))}
              </div>
              <p className='mb-6 text-gray-700 leading-relaxed'>
                {t('Testimonial_2_Text')}
              </p>
              <div className='flex items-center'>
                <div className='mr-4 h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center'>
                  <span className='text-gray-800 font-semibold'>SM</span>
                </div>
                <div>
                  <p className='font-semibold text-gray-900'>{t('Testimonial_2_Name')}</p>
                  <p className='text-sm text-gray-600'>{t('Testimonial_2_Title')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions Section - Light Gray */}
      <section className='py-24 bg-gradient-to-b from-gray-50 to-white'>
        <div className='mx-auto max-w-7xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-gray-900'>
              {t('Conditions_For_Personal_Loans')}
            </h2>
            <div className='mb-8 rounded-2xl bg-white p-8 shadow-sm border border-gray-100'>
              <p className='mb-4 text-2xl font-bold text-gray-900'>
                {t('Annual_Interest_Rate')}
              </p>
              <p className='text-lg text-gray-600'>
                {t('Age_Residence_Income_Requirements')}
              </p>
            </div>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-md'>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Repayment_Plan')}
              </h3>
              <p className='text-gray-600'>
                {t('Repayment_Plan_Description')}
              </p>
            </div>
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-md'>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Amortization_Schedule')}
              </h3>
              <p className='text-gray-600'>
                {t('Amortization_Schedule_Description')}
              </p>
            </div>
            <div className='group rounded-2xl bg-white p-8 text-center shadow-sm transition-all hover:shadow-md'>
              <h3 className='mb-4 text-xl font-semibold text-gray-900'>
                {t('Financial_Assistance')}
              </h3>
              <p className='text-gray-600'>
                {t('Financial_Assistance_Description')}
              </p>
            </div>
          </div>

          <div className='mt-12 rounded-2xl bg-gradient-to-br from-white to-gray-50 p-8 shadow-sm border border-gray-100'>
            <h3 className='mb-4 text-2xl font-semibold text-gray-900'>
              {t('Repayment_Options')}
            </h3>
            <p className='mb-6 text-gray-600 leading-relaxed'>
              {t('Repayment_Options_Description')}
            </p>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-xl bg-white p-6 border border-gray-100'>
                <h4 className='mb-2 font-semibold text-gray-900'>{t('Bi_Weekly')}</h4>
                <p className='text-sm text-gray-600'>{t('Bi_Weekly_Example')}</p>
              </div>
              <div className='rounded-xl bg-white p-6 border border-gray-100'>
                <h4 className='mb-2 font-semibold text-gray-900'>{t('Weekly')}</h4>
                <p className='text-sm text-gray-600'>{t('Weekly_Example')}</p>
              </div>
              <div className='rounded-xl bg-white p-6 border border-gray-100'>
                <h4 className='mb-2 font-semibold text-gray-900'>{t('Monthly')}</h4>
                <p className='text-sm text-gray-600'>{t('Monthly_Example')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Modern Gradient */}
      <section className='relative overflow-hidden bg-gradient-to-br from-gray-900 via-primary to-gray-900 py-24'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20'></div>
        <div className='relative mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-6 text-5xl font-bold text-white'>
            {t('Dont_Wait_Start_Today')}
          </h2>
          <p className='mb-10 text-xl text-white/90'>
            {t('CTA_Description')}
          </p>
          <Link href='/apply'>
            <Button 
              size='large'
              className='bg-white text-primary hover:bg-gray-100 shadow-2xl transition-all hover:scale-105'
            >
              {t('Apply_Now')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
