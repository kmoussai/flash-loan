import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Button from '../components/Button'

export default function About() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h1 className='mb-6 text-5xl font-bold text-primary'>
            {t('About_Us')}
          </h1>
          <p className='text-xl text-text-secondary'>
            {t('About_Hero_Subtitle')}
          </p>
        </div>
      </section>

      {/* Mission and Vision Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-6 text-4xl font-bold text-primary'>
              {t('Our_Mission_Vision')}
            </h2>
          </div>
          
          <div className='grid gap-12 lg:grid-cols-2'>
            {/* Mission */}
            <div className='rounded-lg bg-background-secondary p-8'>
              <h3 className='mb-4 text-2xl font-semibold text-primary'>
                {t('Our_Mission')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Mission_Description')}
              </p>
            </div>

            {/* Vision */}
            <div className='rounded-lg bg-background-secondary p-8'>
              <h3 className='mb-4 text-2xl font-semibold text-primary'>
                {t('Our_Vision')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Vision_Description')}
              </p>
            </div>
          </div>

          {/* Contract Signing Image */}
          <div className='mt-12 flex justify-center'>
            <div className='h-80 w-full max-w-2xl rounded-lg overflow-hidden shadow-lg'>
              <Image 
                src='https://flash-loan.ca/wp-content/uploads/2025/01/crop-businessman-giving-contract-to-woman-to-sign-3760067-1024x682.jpeg'
                alt={t('Contract_Signing_Image_Alt')}
                width={1024}
                height={682}
                className='w-full h-full object-cover rounded-lg'
              />
            </div>
          </div>

          {/* Team Description */}
          <div className='mt-12 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 p-8'>
            <p className='text-center text-lg text-text-secondary leading-relaxed'>
              {t('Team_Description')}
            </p>
          </div>
        </div>
      </section>

      {/* Key Advantages Section */}
      <section className='bg-background-secondary py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-4 text-4xl font-bold text-primary'>
              {t('Our_Key_Advantages')}
            </h2>
            <p className='text-xl text-text-secondary'>
              {t('Why_Choose_Us')}
            </p>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Advantage 1 */}
            <div className='rounded-lg bg-background p-8 text-center shadow-lg'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  01
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Quick_Easy_Application')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Quick_Easy_Description')}
              </p>
            </div>

            {/* Advantage 2 */}
            <div className='rounded-lg bg-background p-8 text-center shadow-lg'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  02
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Exceptional_Customer_Service')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Customer_Service_Description')}
              </p>
            </div>

            {/* Advantage 3 */}
            <div className='rounded-lg bg-background p-8 text-center shadow-lg'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  03
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Flexible_Personalized_Repayment')}
              </h3>
              <p className='text-text-secondary leading-relaxed'>
                {t('Flexible_Repayment_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-6 text-3xl font-bold text-primary'>
            {t('Compliance_Transparency')}
          </h2>
          <p className='mb-8 text-lg text-text-secondary leading-relaxed'>
            {t('Compliance_Description')}
          </p>
          <div className='grid gap-6 md:grid-cols-2'>
            <div className='rounded-lg bg-background-secondary p-6'>
              <h3 className='mb-3 text-xl font-semibold text-primary'>
                {t('No_Credit_Check')}
              </h3>
              <p className='text-text-secondary'>
                {t('No_Credit_Check_Description')}
              </p>
            </div>
            <div className='rounded-lg bg-background-secondary p-6'>
              <h3 className='mb-3 text-xl font-semibold text-primary'>
                {t('No_Documentation')}
              </h3>
              <p className='text-text-secondary'>
                {t('No_Documentation_Description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='bg-gradient-to-r from-primary to-secondary py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h2 className='mb-6 text-4xl font-bold text-white'>
            {t('Dont_Wait_Start_Today')}
          </h2>
          <p className='mb-8 text-xl text-white/90'>
            {t('CTA_Description')}
          </p>
          <div className='flex flex-col gap-4 sm:flex-row sm:justify-center'>
            <Button 
              variant='secondary' 
              size='large'
              className='bg-white text-primary hover:bg-white/90'
            >
              {t('Apply_Now')}
            </Button>
            <Button 
              variant='secondary' 
              size='large'
              className='border-white text-white hover:bg-white hover:text-primary'
            >
              {t('Apply_Now')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
