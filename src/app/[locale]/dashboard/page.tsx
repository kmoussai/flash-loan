import { redirect } from '@/src/navigation-server'

interface DashboardRedirectProps {
  params: {
    locale: string
  }
}

export default function DashboardRedirect({
  params: { locale }
}: DashboardRedirectProps) {
  redirect('/client/dashboard')
}

