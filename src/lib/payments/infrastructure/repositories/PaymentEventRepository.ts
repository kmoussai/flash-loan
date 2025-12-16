/**
 * Payment Event Repository
 * 
 * Repository for persisting payment domain events (outbox pattern).
 * No business logic - pure data access.
 */

import { PaymentDomainEvent } from '../../domain/PaymentEvents'

export interface PaymentEventRecord {
  id: string
  paymentId: string
  type: string
  payload: PaymentDomainEvent
  status: 'pending' | 'processed' | 'failed'
  createdAt: Date
  processedAt: Date | null
  errorMessage: string | null
}

export interface PaymentEventRepository {
  /**
   * Save a payment event to the outbox
   * 
   * @param paymentId - Payment ID
   * @param event - Domain event to persist
   * @returns The saved event record ID
   */
  save(paymentId: string, event: PaymentDomainEvent): Promise<string>

  /**
   * Mark an event as processed
   * 
   * @param eventId - Event record ID
   */
  markProcessed(eventId: string): Promise<void>

  /**
   * Mark an event as failed
   * 
   * @param eventId - Event record ID
   * @param errorMessage - Error message (optional)
   */
  markFailed(eventId: string, errorMessage?: string): Promise<void>

  /**
   * Get pending events
   * 
   * @param limit - Maximum number of events to return
   * @returns Array of pending event records
   */
  getPending(limit?: number): Promise<PaymentEventRecord[]>
}

/**
 * Supabase Payment Event Repository Implementation
 */
export class SupabasePaymentEventRepository implements PaymentEventRepository {
  constructor(
    private supabase: any // Supabase client (typed as any to avoid circular deps)
  ) {}

  async save(paymentId: string, event: PaymentDomainEvent): Promise<string> {
    const { data, error } = await this.supabase
      .from('payment_events')
      .insert({
        payment_id: paymentId,
        type: event.type,
        payload: event,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to save payment event: ${error.message}`)
    }

    return data.id
  }

  async markProcessed(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (error) {
      throw new Error(`Failed to mark event as processed: ${error.message}`)
    }
  }

  async markFailed(eventId: string, errorMessage?: string): Promise<void> {
    const { error } = await this.supabase
      .from('payment_events')
      .update({
        status: 'failed',
        error_message: errorMessage || null,
      })
      .eq('id', eventId)

    if (error) {
      throw new Error(`Failed to mark event as failed: ${error.message}`)
    }
  }

  async getPending(limit: number = 100): Promise<PaymentEventRecord[]> {
    const { data, error } = await this.supabase
      .from('payment_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch pending events: ${error.message}`)
    }

    return (data || []).map((row: any) => this._mapToRecord(row))
  }

  private _mapToRecord(dbRow: any): PaymentEventRecord {
    return {
      id: dbRow.id,
      paymentId: dbRow.payment_id,
      type: dbRow.type,
      payload: dbRow.payload as PaymentDomainEvent,
      status: dbRow.status as 'pending' | 'processed' | 'failed',
      createdAt: new Date(dbRow.created_at),
      processedAt: dbRow.processed_at ? new Date(dbRow.processed_at) : null,
      errorMessage: dbRow.error_message,
    }
  }
}

