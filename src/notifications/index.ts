/**
 * Notifications module
 * 
 * Main entry point for the notification system.
 * 
 * Usage:
 * ```ts
 * import { emitNotificationEvent, createNotificationEvent } from '@/src/notifications'
 * 
 * await emitNotificationEvent(
 *   createNotificationEvent(
 *     'contract_sent',
 *     {
 *       id: clientId,
 *       type: 'client',
 *       email: 'client@example.com',
 *       preferredLanguage: 'en',
 *       firstName: 'John'
 *     },
 *     {
 *       contractId: '...',
 *       loanApplicationId: '...',
 *       contractNumber: 12345
 *     }
 *   )
 * )
 * ```
 */

// Export events
export * from './events'

// Export handlers (for advanced usage)
export * from './handlers'

// Export providers (for advanced usage)
export * from './providers'

// Export workers (for background processing)
export * from './workers'

// Export email templates (for advanced usage)
export * from './emails/templates'

