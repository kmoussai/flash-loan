import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Button from './components/Button'

export default function HomePage() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='grid gap-12 lg:grid-cols-2 lg:items-center'>
            <div className='text-center lg:text-left'>
              <p className='mb-4 text-lg font-medium text-primary'>
                {t('Fast_Reliable_Loans')}
              </p>
              <h1 className='mb-6 text-5xl font-bold leading-tight text-primary lg:text-6xl'>
                {t('Get_Personal_Loan_Title')}
              </h1>
              <p className='mb-8 text-xl text-text-secondary'>
                {t('Get_Up_To_1500_Today')}
              </p>
              <Button size='large' className='bg-primary text-white hover:bg-primary/90'>
                {t('Apply_Now')}
              </Button>
            </div>
            <div className='flex justify-center'>
              <div className='h-96 w-full max-w-md rounded-lg overflow-hidden'>
                <Image 
                  src='https://flash-loan.ca/wp-content/uploads/2025/01/laughing-businesswoman-working-in-office-with-laptop-3756679.jpeg'
                  alt={t('Hero_Image_Placeholder')}
                  width={400}
                  height={384}
                  className='w-full h-full object-cover rounded-lg'
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Expertise Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('Our_Expertise')}
            </h2>
            <p className='text-xl text-text-secondary'>
              {t('What_Makes_Us_Unique')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Feature 1 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  01
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Simplified_Procedures')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Simplified_Procedures_Description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  02
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Total_Transparency')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Total_Transparency_Description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  03
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Flexible_Repayment')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Flexible_Repayment_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className='bg-background-secondary py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='grid gap-12 lg:grid-cols-2 lg:items-center'>
            <div className='flex justify-center'>
              <div className='h-96 w-full max-w-md rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center'>
                <div className='text-center p-8'>
                  <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-primary/30 flex items-center justify-center'>
                    <span className='text-2xl'>💼</span>
                  </div>
                  <p className='text-text-secondary text-sm'>{t('About_Image_Placeholder')}</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className='mb-6 text-4xl font-bold text-primary'>
                {t('About_Us_Section')}
              </h2>
              <h3 className='mb-4 text-2xl font-semibold text-primary'>
                {t('Our_Mission_Vision')}
              </h3>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('About_Us_Description')}
              </p>
              <Button variant='secondary' size='medium'>
                {t('Apply_Now')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('How_It_Works_Section')}
            </h2>
            <p className='text-xl text-text-secondary'>
              {t('Fast_Affordable_Loans_For_All_Needs')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Step 1 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='h-24 w-24 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center'>
                  <span className='text-3xl'>💰</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Fast_Loans')}
              </h3>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('Fast_Loans_Description')}
              </p>
              <Button variant='secondary' size='small'>
                {t('Apply_Now')}
              </Button>
            </div>

            {/* Step 2 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='h-24 w-24 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center'>
                  <span className='text-3xl'>📋</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Accessible_Conditions')}
              </h3>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('Accessible_Conditions_Description')}
              </p>
              <Button variant='secondary' size='small'>
                {t('Apply_Now')}
              </Button>
            </div>

            {/* Step 3 */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='h-24 w-24 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center'>
                  <span className='text-3xl'>💳</span>
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Flexible_Repayment')}
              </h3>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('Flexible_Repayment_Step_Description')}
              </p>
              <Button variant='secondary' size='small'>
                {t('Apply_Now')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className='bg-background-secondary py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('Testimonials')}
            </h2>
            <p className='text-xl text-text-secondary'>
              {t('What_Our_Clients_Say')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-2'>
            {/* Testimonial 1 */}
            <div className='rounded-lg bg-background p-8 shadow-lg'>
              <div className='mb-4 flex text-yellow-400'>
                {'★★★★★'.split('').map((star, index) => (
                  <span key={index}>{star}</span>
                ))}
              </div>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('Testimonial_1_Text')}
              </p>
              <div className='flex items-center'>
                <div className='mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center'>
                  <span className='text-primary font-semibold'>JD</span>
                </div>
                <div>
                  <p className='font-semibold text-primary'>{t('Testimonial_1_Name')}</p>
                  <p className='text-sm text-text-secondary'>{t('Testimonial_1_Title')}</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className='rounded-lg bg-background p-8 shadow-lg'>
              <div className='mb-4 flex text-yellow-400'>
                {'★★★★★'.split('').map((star, index) => (
                  <span key={index}>{star}</span>
                ))}
              </div>
              <p className='mb-6 text-text-secondary leading-relaxed'>
                {t('Testimonial_2_Text')}
              </p>
              <div className='flex items-center'>
                <div className='mr-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center'>
                  <span className='text-primary font-semibold'>SM</span>
                </div>
                <div>
                  <p className='font-semibold text-primary'>{t('Testimonial_2_Name')}</p>
                  <p className='text-sm text-text-secondary'>{t('Testimonial_2_Title')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conditions Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('Conditions_For_Personal_Loans')}
            </h2>
            <div className='mb-8 rounded-lg bg-background-secondary p-8'>
              <p className='mb-4 text-2xl font-bold text-primary'>
                {t('Annual_Interest_Rate')}
              </p>
              <p className='text-lg text-text-secondary'>
                {t('Age_Residence_Income_Requirements')}
              </p>
            </div>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            <div className='rounded-lg bg-background-secondary p-6 text-center'>
              <h3 className='mb-3 text-xl font-semibold text-primary'>
                {t('Repayment_Plan')}
              </h3>
              <p className='text-text-secondary'>
                {t('Repayment_Plan_Description')}
              </p>
            </div>
            <div className='rounded-lg bg-background-secondary p-6 text-center'>
              <h3 className='mb-3 text-xl font-semibold text-primary'>
                {t('Amortization_Schedule')}
              </h3>
              <p className='text-text-secondary'>
                {t('Amortization_Schedule_Description')}
              </p>
            </div>
            <div className='rounded-lg bg-background-secondary p-6 text-center'>
              <h3 className='mb-3 text-xl font-semibold text-primary'>
                {t('Financial_Assistance')}
              </h3>
              <p className='text-text-secondary'>
                {t('Financial_Assistance_Description')}
              </p>
            </div>
          </div>

          <div className='mt-12 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 p-8'>
            <h3 className='mb-4 text-2xl font-semibold text-primary'>
              {t('Repayment_Options')}
            </h3>
            <p className='mb-6 text-text-secondary leading-relaxed'>
              {t('Repayment_Options_Description')}
            </p>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='rounded-lg bg-background p-4'>
                <h4 className='mb-2 font-semibold text-primary'>{t('Bi_Weekly')}</h4>
                <p className='text-sm text-text-secondary'>{t('Bi_Weekly_Example')}</p>
              </div>
              <div className='rounded-lg bg-background p-4'>
                <h4 className='mb-2 font-semibold text-primary'>{t('Weekly')}</h4>
                <p className='text-sm text-text-secondary'>{t('Weekly_Example')}</p>
              </div>
              <div className='rounded-lg bg-background p-4'>
                <h4 className='mb-2 font-semibold text-primary'>{t('Monthly')}</h4>
                <p className='text-sm text-text-secondary'>{t('Monthly_Example')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className='bg-gradient-to-r from-primary to-secondary py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-6 text-4xl font-bold text-white'>
            {t('Dont_Wait_Start_Today')}
          </h2>
          <p className='mb-8 text-xl text-white/90'>
            {t('CTA_Description')}
          </p>
          <Button 
            size='large'
            className='bg-white text-primary hover:bg-white/90'
          >
            {t('Apply_Now')}
          </Button>
        </div>
      </section>
    </div>
  )
}
