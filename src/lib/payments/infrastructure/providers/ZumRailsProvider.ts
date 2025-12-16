/**
 * ZumRails Payment Provider
 * 
 * Implementation of PaymentProvider for ZumRails.
 * Responsible for:
 * - Creating transactions via ZumRails API
 * - Cancelling scheduled transactions
 * - Mapping ZumRails statuses to internal PaymentStatus
 * 
 * No business logic - pure adapter.
 */

import { PaymentProvider } from './PaymentProvider'
import type {
  CreateTransactionParams,
  CreateTransactionResult,
  CancelTransactionParams,
  CancelTransactionResult,
  RefundTransactionParams,
  RefundTransactionResult,
  SyncTransactionParams,
  SyncTransactionResult,
} from './PaymentProvider'
import { PaymentStatus } from '../../domain/PaymentStatus'
import { getZumrailsAuthToken } from '@/src/lib/ibv/zumrails-server'

interface ZumRailsTransactionResponse {
  statusCode?: number
  message?: string
  isError?: boolean
  result?: {
    Id: string
    ZumRailsType: string
    TransactionMethod: string
    Amount: number
    Status: string
    UserId?: string
    WalletId?: string
    FundingSourceId?: string
    Memo?: string
    Comment?: string
    ScheduledStartDate?: string
    ClientTransactionId?: string
    [key: string]: unknown
  }
}

export class ZumRailsProvider implements PaymentProvider {
  private baseUrl: string

  constructor() {
    this.baseUrl =
      process.env.ZUMRAILS_API_BASE_URL || 'https://api-sandbox.zumrails.com'
  }

  getProviderName(): string {
    return 'zumrails'
  }

  async createTransaction(
    params: CreateTransactionParams
  ): Promise<CreateTransactionResult> {
    try {
      const { token } = await getZumrailsAuthToken()

      // Map to ZumRails transaction type
      // For loan payments, we use AccountsReceivable (debit from customer)
      const payload = {
        ZumRailsType: 'AccountsReceivable',
        TransactionMethod: 'Eft',
        Amount: params.amount,
        Memo: this.sanitizeMemo(`Loan Payment ${params.paymentId.slice(0, 8)}`),
        Comment: `Loan ID: ${params.loanId}, Payment ID: ${params.paymentId}`,
        ScheduledStartDate: params.scheduledDate
          ? params.scheduledDate.toISOString().split('T')[0]
          : undefined,
        ClientTransactionId: params.paymentId,
        ...params.metadata,
      }

      const response = await fetch(`${this.baseUrl}/api/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const rawText = await response.text().catch(() => '')

      if (!response.ok) {
        return {
          success: false,
          error: `ZumRails API error: ${rawText || response.statusText}`,
          errorCode: `HTTP_${response.status}`,
        }
      }

      let data: ZumRailsTransactionResponse
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch (error) {
        return {
          success: false,
          error: 'Failed to parse ZumRails response',
          errorCode: 'PARSE_ERROR',
        }
      }

      if (data.isError || !data.result?.Id) {
        return {
          success: false,
          error: data.message || 'ZumRails transaction creation failed',
          errorCode: 'ZUMRAILS_ERROR',
        }
      }

      return {
        success: true,
        providerTransactionId: data.result.Id,
        providerData: data.result,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create ZumRails transaction',
        errorCode: 'UNKNOWN_ERROR',
      }
    }
  }

  async cancelTransaction(
    params: CancelTransactionParams
  ): Promise<CancelTransactionResult> {
    try {
      const { token } = await getZumrailsAuthToken()

      // Note: ZumRails may not have a direct cancel endpoint
      // This is a placeholder - actual implementation depends on ZumRails API
      // For now, we'll return success if the transaction hasn't been processed yet
      // In production, you'd need to check ZumRails API docs for cancellation

      // TODO: Implement actual ZumRails cancellation API call
      // This might require checking transaction status first
      // and using a void/cancel endpoint if available

      return {
        success: false,
        error: 'Transaction cancellation not yet implemented for ZumRails',
        errorCode: 'NOT_IMPLEMENTED',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel ZumRails transaction',
        errorCode: 'UNKNOWN_ERROR',
      }
    }
  }

  async refundTransaction(
    params: RefundTransactionParams
  ): Promise<RefundTransactionResult> {
    try {
      const { token } = await getZumrailsAuthToken()

      // For refunds, ZumRails uses AccountsPayable (credit to customer)
      const payload = {
        ZumRailsType: 'AccountsPayable',
        TransactionMethod: 'Eft',
        Amount: params.amount,
        Memo: this.sanitizeMemo(`Refund ${params.providerTransactionId.slice(0, 8)}`),
        Comment: params.reason || 'Payment refund',
        ClientTransactionId: `refund-${params.providerTransactionId}`,
      }

      const response = await fetch(`${this.baseUrl}/api/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const rawText = await response.text().catch(() => '')

      if (!response.ok) {
        return {
          success: false,
          error: `ZumRails API error: ${rawText || response.statusText}`,
          errorCode: `HTTP_${response.status}`,
        }
      }

      let data: ZumRailsTransactionResponse
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch (error) {
        return {
          success: false,
          error: 'Failed to parse ZumRails response',
          errorCode: 'PARSE_ERROR',
        }
      }

      if (data.isError || !data.result?.Id) {
        return {
          success: false,
          error: data.message || 'ZumRails refund creation failed',
          errorCode: 'ZUMRAILS_ERROR',
        }
      }

      return {
        success: true,
        providerTransactionId: data.result.Id,
        providerData: data.result,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create ZumRails refund',
        errorCode: 'UNKNOWN_ERROR',
      }
    }
  }

  async syncTransaction(
    params: SyncTransactionParams
  ): Promise<SyncTransactionResult> {
    try {
      const { token } = await getZumrailsAuthToken()

      // Note: ZumRails may not have a direct GET transaction endpoint
      // Status updates typically come via webhooks
      // This is a placeholder for future implementation

      // TODO: Implement ZumRails transaction status sync
      // This might require a GET /api/transaction/{id} endpoint
      // or querying transaction history

      return {
        success: false,
        error: 'Transaction sync not yet implemented for ZumRails',
        errorCode: 'NOT_IMPLEMENTED',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to sync ZumRails transaction',
        errorCode: 'UNKNOWN_ERROR',
      }
    }
  }

  mapProviderStatus(providerStatus: string): PaymentStatus | null {
    // Map ZumRails transaction statuses to internal PaymentStatus
    const statusMap: Record<string, PaymentStatus> = {
      Started: PaymentStatus.PROCESSING,
      WalletFunded: PaymentStatus.PROCESSING,
      WalletWithdrawn: PaymentStatus.PROCESSING,
      EFTFileCreated: PaymentStatus.PROCESSING,
      EFTFileUploaded: PaymentStatus.PROCESSING,
      EFTAnswerReceived: PaymentStatus.PROCESSING,
      EFTAnswerProcessed: PaymentStatus.PROCESSING,
      Succeeded: PaymentStatus.SUCCEEDED,
      // Failure events
      EftFailedInsufficientFunds: PaymentStatus.FAILED,
      EftFailedAccountClosed: PaymentStatus.FAILED,
      EftFailedInvalidAccount: PaymentStatus.FAILED,
      EftFailedInvalidRouting: PaymentStatus.FAILED,
      EftFailedOther: PaymentStatus.FAILED,
      Failed: PaymentStatus.FAILED,
    }

    return statusMap[providerStatus] || null
  }

  /**
   * Sanitize memo field for ZumRails (15 chars max, specific characters only)
   */
  private sanitizeMemo(memo: string): string {
    return memo
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .substring(0, 15)
      .trim()
  }
}

