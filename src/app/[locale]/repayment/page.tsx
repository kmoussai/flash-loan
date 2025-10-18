import { useTranslations } from 'next-intl'

export default function Repayment() {
  const t = useTranslations('')

  return (
    <div className='min-h-screen bg-background'>
      <section className='bg-gradient-to-br from-primary/10 to-secondary/10 py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <h1 className='mb-6 text-5xl font-bold text-primary'>
            {t('Repayment')}
          </h1>
          <p className='text-xl text-text-secondary'>
            {t('Repayment_Subtitle')}
          </p>
        </div>
      </section>

      <section className='py-20'>
        <div className='mx-auto max-w-4xl px-6 text-center'>
          <div className='rounded-lg bg-background-secondary p-12'>
            <h2 className='mb-6 text-3xl font-bold text-primary'>
              {t('Coming_Soon')}
            </h2>
            <p className='text-lg text-text-secondary'>
              {t('Repayment_Coming_Soon')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
