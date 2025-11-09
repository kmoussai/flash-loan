import { redirect } from 'next/navigation'

interface DashboardRedirectProps {
  params: {
    locale: string
  }
}

export default function DashboardRedirect({
  params: { locale }
}: DashboardRedirectProps) {
  redirect(`/${locale}/client/dashboard`)
}

