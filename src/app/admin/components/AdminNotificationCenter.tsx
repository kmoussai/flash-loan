'use client'

import { useCallback, useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { cn, fetcher } from '@/lib/utils'
import type { Notification } from '@/src/types'
import { useRouter, usePathname } from 'next/navigation'
import Link from '@/src/app/[locale]/components/Button'

interface AdminNotificationCenterProps {
  limit?: number
  unreadOnly?: boolean
}

interface NotificationsResponse {
  notifications: Notification[]
  total: number
  filters: {
    unread: boolean
    limit: number | null
    since: string | null
  }
}

export function AdminNotificationCenter({
  limit = 20,
  unreadOnly = false
}: AdminNotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  
  // Detect if we're on admin or client side based on pathname
  const isAdminContext = useMemo(() => {
    return pathname?.includes('/admin') ?? false
  }, [pathname])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (unreadOnly) {
      params.set('unread', 'true')
    }
    return `/api/user/notifications?${params.toString()}`
  }, [limit, unreadOnly])

  const { data, error, isLoading, mutate, isValidating } = useSWR<NotificationsResponse>(query, fetcher, {
    refreshInterval: 10_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true
  })

  const notifications = data?.notifications ?? []
  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read_at).length,
    [notifications]
  )
  const totalCount = data?.total ?? 0
  const hasUnread = unreadCount > 0

  const markNotificationsAsRead = useCallback(
    async (notificationIds: string[], options: { silent?: boolean } = {}) => {
      if (!notificationIds.length) return

      const { silent = false } = options

      if (!silent) setIsMarkingRead(true)
      try {
        const response = await fetch('/api/user/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notificationIds })
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          console.error('[AdminNotificationCenter] Failed to mark notifications as read:', payload)
        }
      } catch (error) {
        console.error('[AdminNotificationCenter] Unexpected error while marking notifications as read:', error)
      } finally {
        if (!silent) setIsMarkingRead(false)
        await mutate()
      }
    },
    [mutate]
  )

  const handleRefresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const handleMarkAllRead = useCallback(async () => {
    if (notifications.length === 0) return

    const unreadNotifications = notifications.filter(notification => !notification.read_at)
    if (unreadNotifications.length === 0) return

    await markNotificationsAsRead(unreadNotifications.map(notification => notification.id))
  }, [notifications, markNotificationsAsRead])

  const resolveNotificationTarget = useCallback((notification: Notification) => {
    const metadata = notification.metadata as Record<string, any> | null | undefined
    
    if (!metadata || typeof metadata !== 'object') {
      return null
    }

    // Admin context routes
    if (isAdminContext) {
      if (metadata.type === 'request_submission' && metadata.loanApplicationId) {
        return `/admin/applications/${metadata.loanApplicationId}`
      }

      if (metadata.loanApplicationId) {
        return `/admin/applications/${metadata.loanApplicationId}`
      }

      if (metadata.type === 'contract_event' && metadata.contractId && metadata.loanApplicationId) {
        return `/admin/applications/${metadata.loanApplicationId}`
      }

      if (metadata.type === 'application_event' && metadata.loanApplicationId) {
        return `/admin/applications/${metadata.loanApplicationId}`
      }

      if (metadata.type === 'ibv_event' && metadata.loanApplicationId) {
        return `/admin/applications/${metadata.loanApplicationId}`
      }

      return null
    }

    // Client context routes (using query params for dashboard sections)
    // Use current pathname if we're on client dashboard, otherwise construct path
    const basePath = pathname?.includes('/client/dashboard') 
      ? pathname 
      : pathname?.replace(/\/[^/]+$/, '') || '/client/dashboard'
    
    if (metadata.type === 'contract_event' && metadata.contractId) {
      // Navigate to contracts section
      return `${basePath}?section=contracts`
    }

    if (metadata.type === 'request_prompt' || metadata.type === 'request_submission') {
      // Navigate to documents section for document requests
      return `${basePath}?section=documents`
    }

    if (metadata.loanApplicationId) {
      // Navigate to applications section
      return `${basePath}?section=applications`
    }

    if (metadata.type === 'application_event' && metadata.loanApplicationId) {
      return `${basePath}?section=applications`
    }

    if (metadata.type === 'ibv_event' && metadata.loanApplicationId) {
      // Navigate to applications section for IBV events
      return `${basePath}?section=applications`
    }

    return null
  }, [isAdminContext, pathname])

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      const target = resolveNotificationTarget(notification)
      

      if (!notification.read_at) {
        await markNotificationsAsRead([notification.id], { silent: true })
      }

      if (target) {
        setOpen(false)
        router.push(target)
      }
    },
    [markNotificationsAsRead, resolveNotificationTarget, router]
  )

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600',
            'hover:border-gray-300 hover:text-gray-900',
            open && '!border-gray-400 !text-gray-900'
          )}
          aria-label='Open notifications'
        >
          <svg className='h-5 w-5' viewBox='0 0 24 24' fill='none' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.6}
              d='M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z'
            />
          </svg>
          {unreadCount > 0 && (
            <span className='absolute -right-1 -top-1 inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-gray-900 px-1 text-[0.6rem] font-semibold text-white'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side='bottom'
          align='end'
          sideOffset={12}
          className='z-50 w-[50rem] max-w-[85vw] rounded-lg border border-gray-200 bg-white p-0 shadow-lg'
        >
          <div className='flex items-center justify-between border-b border-gray-200 px-4 py-2.5'>
            <div>
              <p className='text-sm font-semibold text-gray-900'>Notifications</p>
              <p className='text-xs text-gray-500'>
                {isLoading && !data
                  ? 'Loading your updates...'
                  : `${notifications.length} items${isValidating ? ' · syncing' : ''}`}
              </p>
            </div>
            <div className='flex items-center space-x-2'>
              <button
                type='button'
                onClick={handleRefresh}
                className='rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:border-gray-300 hover:text-gray-900'
              >
                Refresh
              </button>
              <button
                type='button'
                onClick={handleMarkAllRead}
                disabled={!hasUnread || isMarkingRead}
                className={cn(
                  'rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600',
                  'hover:border-gray-300 hover:text-gray-900',
                  (!hasUnread || isMarkingRead) && 'cursor-not-allowed opacity-40 hover:border-gray-200 hover:text-gray-600'
                )}
              >
                {isMarkingRead ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
          </div>

          <div className='max-h-72 overflow-y-auto px-4 py-3'>
            {isLoading ? (
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className='space-y-2 rounded-lg border border-gray-200/70 p-3'>
                    <div className='h-3 w-3/4 rounded-full bg-gray-200' />
                    <div className='h-3 w-5/6 rounded-full bg-gray-100' />
                    <div className='h-3 w-1/3 rounded-full bg-gray-100' />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className='rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600'>
                <p className='font-medium'>Unable to load notifications</p>
                <p className='mt-1 text-xs text-red-500'>
                  {error.message ?? 'An unexpected error occurred. Please try again in a moment.'}
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-10 text-center'>
                <svg className='h-9 w-9 text-gray-400' viewBox='0 0 24 24' fill='none' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.4}
                    d='M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2h16l-2-2z'
                  />
                </svg>
                <p className='mt-3 text-sm font-medium text-gray-700'>No notifications yet</p>
                <p className='mt-1 max-w-[16rem] text-xs text-gray-500'>
                  Updates for your team will appear here as they arrive.
                </p>
              </div>
            ) : (
              <ul className='space-y-1.5'>
                {notifications.map(notification => {
                  const isUnread = !notification.read_at
                  const createdAtLabel = notification.created_at
                    ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                    : 'Unknown'
                  const targetHref = resolveNotificationTarget(notification)
                  const isNavigable = Boolean(targetHref)

                  return (
                    <li key={notification.id}>
                      <button
                        type='button'
                        onClick={() => handleNotificationClick(notification)}
                        className='w-full cursor-pointer rounded-lg text-left focus:outline-none'
                      >
                        <article
                          className={cn(
                            'grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors',
                            isUnread && 'border-[#097fa5]/40 bg-[#097fa5]/5',
                            isNavigable && 'hover:border-[#097fa5]/40 hover:bg-[#097fa5]/5'
                          )}
                        >
                          <div>
                            <p className='font-medium text-gray-900 line-clamp-1'>{notification.title}</p>
                            {notification.message && (
                              <p className='mt-0.5 text-[0.8rem] text-gray-600 line-clamp-2'>
                                {notification.message}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-right text-[0.7rem] text-gray-500 whitespace-nowrap',
                              isUnread && 'text-[#097fa5]'
                            )}
                          >
                            {createdAtLabel}
                          </span>
                          <div className='text-[0.65rem] uppercase tracking-wide text-gray-500'>
                            {notification.category && notification.category.replace(/_/g, ' ')}
                          </div>
                          {isUnread && (
                            <span className='h-2 w-2 self-center justify-self-end rounded-full bg-[#097fa5]' />
                          )}
                        </article>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className='border-t border-gray-200 px-4 py-2 text-xs text-gray-500'>
            <div className='flex items-center justify-between'>
              <span>
                {hasUnread
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'All notifications read'}
              </span>
              {data?.filters?.unread && <span>Filtered by unread</span>}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

