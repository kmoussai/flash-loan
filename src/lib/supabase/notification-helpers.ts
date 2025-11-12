'use server'

// Reusable helpers for notifications targeting clients and staff

import type { Notification, NotificationRecipient } from '@/src/types'
import type { Database } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseOptions {
  client?: SupabaseClient<Database>
  useAdminClient?: boolean
}

type NotificationClient = SupabaseClient<Database>

const NOTIFICATIONS_TABLE = 'notifications' satisfies keyof Database['public']['Tables']

async function getSupabaseClient(options: SupabaseOptions = {}): Promise<NotificationClient> {
  const { client, useAdminClient = false } = options

  if (client) {
    return client
  }

  if (useAdminClient) {
    const { createServerSupabaseAdminClient } = await import('./server')
    return createServerSupabaseAdminClient()
  }

  const { createServerSupabaseClient } = await import('./server')
  return await createServerSupabaseClient()
}

function buildInsertPayload(
  params: CreateNotificationParams
): Database['public']['Tables']['notifications']['Insert'] {
  const { recipientId, recipientType, title, message, category, metadata, readAt } = params

  const insertPayload: Database['public']['Tables']['notifications']['Insert'] = {
    title,
    message,
    category: category ?? null,
    metadata: metadata ?? null,
    read_at: readAt ?? null
  }

  if (recipientType === 'client') {
    insertPayload.client_id = recipientId
    insertPayload.staff_id = null
  } else {
    insertPayload.staff_id = recipientId
    insertPayload.client_id = null
  }

  return insertPayload
}

function buildRecipientFilter(
  recipientId: string,
  recipientType: NotificationRecipient
) {
  return recipientType === 'client'
    ? { column: 'client_id', value: recipientId }
    : { column: 'staff_id', value: recipientId }
}

export interface CreateNotificationParams {
  recipientId: string
  recipientType: NotificationRecipient
  title: string
  message: string
  category?: string | null
  metadata?: Record<string, any> | null
  readAt?: string | null
}

export async function createNotification(
  params: CreateNotificationParams,
  options?: SupabaseOptions
) {
  const supabase = await getSupabaseClient(options)

  const insertPayload = buildInsertPayload(params)

  const { data, error } = await (supabase as any)
    .from(NOTIFICATIONS_TABLE)
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('[createNotification] Failed to insert notification:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Notification, error: null }
}

export interface GetNotificationsParams extends SupabaseOptions {
  recipientId: string
  recipientType: NotificationRecipient
  onlyUnread?: boolean
  limit?: number
  since?: string
}

export async function getNotificationsForRecipient(params: GetNotificationsParams) {
  const { recipientId, recipientType, onlyUnread = false, limit, since, ...options } = params

  const supabase = await getSupabaseClient(options)
  const recipientFilter = buildRecipientFilter(recipientId, recipientType)

  let query = (supabase as any)
    .from(NOTIFICATIONS_TABLE)
    .select('*')
    .eq(recipientFilter.column, recipientFilter.value)
    .order('created_at', { ascending: false })

  if (onlyUnread) {
    query = query.is('read_at', null)
  }

  if (since) {
    query = query.gte('created_at', since)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getNotificationsForRecipient] Failed to fetch notifications:', error)
    return { success: false, error: error.message, data: [] as Notification[] }
  }

  return { success: true, data: (data as Notification[]) ?? [], error: null }
}

export interface MarkNotificationAsReadParams extends SupabaseOptions {
  readAt?: string | null
}

export async function markNotificationAsRead(
  notificationId: string,
  params: MarkNotificationAsReadParams = {}
) {
  const { readAt = new Date().toISOString(), ...options } = params

  const supabase = await getSupabaseClient(options)

  const updatePayload: Database['public']['Tables']['notifications']['Update'] = {
    read_at: readAt
  }

  const { data, error } = await (supabase as any)
    .from(NOTIFICATIONS_TABLE)
    .update(updatePayload)
    .eq('id', notificationId)
    .select()
    .single()

  if (error) {
    console.error('[markNotificationAsRead] Failed to update notification:', error)
    return { success: false, error: error.message, data: null }
  }

  return { success: true, data: data as Notification, error: null }
}

export async function markAllNotificationsAsRead(
  recipientId: string,
  recipientType: NotificationRecipient,
  params: MarkNotificationAsReadParams = {}
) {
  const { readAt = new Date().toISOString(), ...options } = params
  const supabase = await getSupabaseClient(options)
  const recipientFilter = buildRecipientFilter(recipientId, recipientType)

  const updatePayload: Database['public']['Tables']['notifications']['Update'] = {
    read_at: readAt
  }

  const { error } = await (supabase as any)
    .from(NOTIFICATIONS_TABLE)
    .update(updatePayload)
    .eq(recipientFilter.column, recipientFilter.value)
    .is('read_at', null)

  if (error) {
    console.error('[markAllNotificationsAsRead] Failed to mark notifications as read:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}


