import { useTranslations } from 'next-intl'
import Button from '../components/Button'

export default function Contact() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h1 className='mb-6 text-5xl font-bold text-primary'>
            {t('Contact_Us_Title')}
          </h1>
          <p className='text-xl text-text-secondary'>
            {t('Contact_Us_Subtitle')}
          </p>
          <p className='mt-4 text-lg text-text-secondary'>
            {t('Contact_Us_Description')}
          </p>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-6xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-6 text-4xl font-bold text-primary'>
              {t('How_To_Reach_Us')}
            </h2>
          </div>

          <div className='grid gap-8 md:grid-cols-3'>
            {/* Phone */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  📞
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Phone')}
              </h3>
              <p className='text-text-secondary'>
                {t('Phone_Number')}
              </p>
            </div>

            {/* Email */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  ✉️
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Email')}
              </h3>
              <p className='text-text-secondary'>
                {t('Email_Address')}
              </p>
            </div>

            {/* Address */}
            <div className='rounded-lg bg-background-secondary p-8 text-center'>
              <div className='mb-6 flex justify-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white'>
                  📍
                </div>
              </div>
              <h3 className='mb-4 text-xl font-semibold text-primary'>
                {t('Address')}
              </h3>
              <p className='text-text-secondary'>
                {t('Full_Address')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className='bg-background-secondary py-20'>
        <div className='mx-auto max-w-4xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-6 text-4xl font-bold text-primary'>
              {t('Frequently_Asked_Questions')}
            </h2>
          </div>

          <div className='space-y-6'>
            {/* FAQ 1 */}
            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-3 text-lg font-semibold text-primary'>
                {t('FAQ_Question_1')}
              </h3>
              <p className='text-text-secondary'>
                {t('FAQ_Answer_1')}
              </p>
            </div>

            {/* FAQ 2 */}
            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-3 text-lg font-semibold text-primary'>
                {t('FAQ_Question_2')}
              </h3>
              <p className='text-text-secondary'>
                {t('FAQ_Answer_2')}
              </p>
            </div>

            {/* FAQ 3 */}
            <div className='rounded-lg bg-background p-6'>
              <h3 className='mb-3 text-lg font-semibold text-primary'>
                {t('FAQ_Question_3')}
              </h3>
              <p className='text-text-secondary'>
                {t('FAQ_Answer_3')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className='py-20'>
        <div className='mx-auto max-w-2xl px-6'>
          <div className='mb-16 text-center'>
            <h2 className='mb-6 text-4xl font-bold text-primary'>
              {t('Send_Us_Message')}
            </h2>
            <p className='text-lg text-text-secondary'>
              {t('Contact_Form_Description')}
            </p>
          </div>

          <div className='rounded-lg bg-background-secondary p-8'>
            <form className='space-y-6'>
              {/* Name Field */}
              <div>
                <label htmlFor='name' className='mb-2 block text-sm font-medium text-primary'>
                  {t('Your_Name')} *
                </label>
                <input
                  type='text'
                  id='name'
                  name='name'
                  required
                  className='w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                  placeholder={t('Name_Placeholder')}
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor='email' className='mb-2 block text-sm font-medium text-primary'>
                  {t('Your_Email')} *
                </label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  required
                  className='w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                  placeholder={t('Email_Placeholder')}
                />
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor='message' className='mb-2 block text-sm font-medium text-primary'>
                  {t('Message')} *
                </label>
                <textarea
                  id='message'
                  name='message'
                  rows={6}
                  required
                  className='w-full rounded-lg border border-border bg-background px-4 py-3 text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
                  placeholder={t('Message_Placeholder')}
                />
              </div>

              {/* Submit Button */}
              <div className='text-center'>
                <Button 
                  type='submit'
                  variant='primary' 
                  size='large'
                  className='w-full sm:w-auto'
                >
                  {t('Send')}
                </Button>
              </div>
            </form>
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
          <Button 
            variant='secondary' 
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
