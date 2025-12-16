/**
 * Payment Repository
 * 
 * Repository interface for payment persistence.
 * Abstracts database operations from domain/application layers.
 */

import { Payment, PaymentData } from '../../domain/Payment'
import { PaymentStatus } from '../../domain/PaymentStatus'

export interface PaymentRepository {
  /**
   * Get payment by ID
   * 
   * @param id - Payment ID
   * @returns Payment entity or null if not found
   */
  getById(id: string): Promise<Payment | null>

  /**
   * Save payment (create or update)
   * 
   * @param payment - Payment entity to save
   * @returns Promise that resolves when saved
   */
  save(payment: Payment): Promise<void>

  /**
   * Find payments by loan ID
   * 
   * @param loanId - Loan ID
   * @returns Array of payments for the loan
   */
  findByLoanId(loanId: string): Promise<Payment[]>

  /**
   * Find payments by provider transaction ID
   * 
   * @param provider - Provider name (e.g., 'zumrails')
   * @param providerTransactionId - Provider transaction ID
   * @returns Payment entity or null if not found
   */
  findByProviderTransactionId(
    provider: string,
    providerTransactionId: string
  ): Promise<Payment | null>
}

/**
 * Supabase Payment Repository Implementation
 * 
 * Maps Payment entities to/from loan_payments table.
 */
export class SupabasePaymentRepository implements PaymentRepository {
  private readonly defaultProvider = 'zumrails' // Global app default

  constructor(
    private supabase: any // Supabase client (typed as any to avoid circular deps)
  ) {}

  async getById(id: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('loan_payments')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch payment: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return this._mapToPayment(data)
  }

  async save(payment: Payment): Promise<void> {
    const paymentData = payment.toData()
    const dbData = this._mapToDb(paymentData)

    const { error } = await this.supabase
      .from('loan_payments')
      .upsert(dbData, { onConflict: 'id' })

    if (error) {
      throw new Error(`Failed to save payment: ${error.message}`)
    }
  }

  async findByLoanId(loanId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    return (data || []).map((row: any) => this._mapToPayment(row))
  }

  async findByProviderTransactionId(
    provider: string,
    providerTransactionId: string
  ): Promise<Payment | null> {
    // This assumes we store provider info in a separate table or JSONB field
    // For now, we'll search in provider_data or a dedicated field
    // Adjust based on your actual schema

    // TODO: Implement based on your actual database schema
    // This might require querying a payment_provider_transactions table
    // or searching in a JSONB field

    throw new Error('Not yet implemented - requires schema design')
  }

  private _mapToPayment(dbRow: any): Payment {
    // Map database row to Payment entity
    // Provider is global app setting, not stored in DB
    // updated_at column doesn't exist in loan_payments table

    return new Payment({
      id: dbRow.id,
      loanId: dbRow.loan_id,
      amount: parseFloat(dbRow.amount),
      status: this._mapStatusFromDb(dbRow.status),
      provider: this.defaultProvider, // Global app default
      providerTransactionId: dbRow.provider_transaction_id,
      providerData: dbRow.provider_data,
      errorCode: dbRow.error_code,
      errorMessage: dbRow.error_message,
      cancelledReason: dbRow.cancelled_reason,
      refundAmount: dbRow.refund_amount
        ? parseFloat(dbRow.refund_amount)
        : undefined,
      createdAt: new Date(dbRow.created_at),
      updatedAt: new Date(dbRow.created_at), // Use created_at since updated_at doesn't exist
    })
  }

  private _mapToDb(paymentData: PaymentData): any {
    // Map Payment entity to database row
    // Provider is global app setting, not stored in DB
    // updated_at column doesn't exist in loan_payments table

    return {
      id: paymentData.id,
      loan_id: paymentData.loanId,
      amount: paymentData.amount,
      status: this._mapStatusToDb(paymentData.status),
      // provider is not stored in DB (global app setting)
      provider_transaction_id: paymentData.providerTransactionId,
      provider_data: paymentData.providerData,
      error_code: paymentData.errorCode,
      error_message: paymentData.errorMessage,
      cancelled_reason: paymentData.cancelledReason,
      refund_amount: paymentData.refundAmount,
      // updated_at is not stored (column doesn't exist in loan_payments table)
    }
  }

  private _mapStatusFromDb(dbStatus: string): PaymentStatus {
    // Map database status to PaymentStatus enum
    // Adjust based on your actual status values
    const statusMap: Record<string, PaymentStatus> = {
      created: PaymentStatus.CREATED,
      processing: PaymentStatus.PROCESSING,
      succeeded: PaymentStatus.SUCCEEDED,
      failed: PaymentStatus.FAILED,
      cancelled: PaymentStatus.CANCELLED,
      refunded: PaymentStatus.REFUNDED,
      // Map legacy statuses if needed
      pending: PaymentStatus.CREATED,
      confirmed: PaymentStatus.PROCESSING,
      paid: PaymentStatus.SUCCEEDED,
      rejected: PaymentStatus.FAILED,
    }

    return statusMap[dbStatus] || PaymentStatus.CREATED
  }

  private _mapStatusToDb(status: PaymentStatus): string {
    // Map PaymentStatus enum to database payment_status enum values
    // Database enum: pending, confirmed, paid, failed, rejected, deferred, manual, cancelled, rebate
    const statusMap: Record<PaymentStatus, string> = {
      [PaymentStatus.CREATED]: 'pending',      // New payment, not yet processed
      [PaymentStatus.PROCESSING]: 'confirmed', // Payment being processed
      [PaymentStatus.SUCCEEDED]: 'paid',       // Payment completed successfully
      [PaymentStatus.FAILED]: 'failed',        // Payment failed
      [PaymentStatus.CANCELLED]: 'cancelled',  // Payment cancelled
      [PaymentStatus.REFUNDED]: 'rebate',      // Payment refunded (using rebate as closest match)
    }
    return statusMap[status] || 'pending'
  }
}

