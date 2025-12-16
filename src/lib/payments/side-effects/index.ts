/**
 * Side Effects Wiring
 * 
 * Wires payment domain events to their handlers.
 * This is where we connect events to side effects.
 */

import { EventBus } from '../events/EventBus'
import { OnPaymentSucceeded, defaultUpdateLoanBalance, defaultGetLoanDetails } from './handlers/OnPaymentSucceeded'
import { OnPaymentFailed } from './handlers/OnPaymentFailed'
import { OnPaymentCancelled } from './handlers/OnPaymentCancelled'
import type { OnPaymentSucceededDependencies } from './handlers/OnPaymentSucceeded'
import type { OnPaymentFailedDependencies } from './handlers/OnPaymentFailed'
import type { OnPaymentCancelledDependencies } from './handlers/OnPaymentCancelled'
import type { PaymentDomainEvent } from '../domain/PaymentEvents'

export interface SideEffectDependencies {
  onPaymentSucceeded?: OnPaymentSucceededDependencies
  onPaymentFailed?: OnPaymentFailedDependencies
  onPaymentCancelled?: OnPaymentCancelledDependencies
}

/**
 * Wire up payment event handlers
 * 
 * @param eventBus - Event bus instance
 * @param deps - Dependencies for side effect handlers
 */
export function wirePaymentSideEffects(
  eventBus: EventBus,
  deps: SideEffectDependencies = {}
): void {
  // Wire PaymentSucceeded event
  // Use default implementations if not provided
  const succeededDeps: OnPaymentSucceededDependencies = {
    updateLoanBalance: deps.onPaymentSucceeded?.updateLoanBalance || defaultUpdateLoanBalance,
    getLoanDetails: deps.onPaymentSucceeded?.getLoanDetails || defaultGetLoanDetails,
    sendEmail: deps.onPaymentSucceeded?.sendEmail,
    updateLedger: deps.onPaymentSucceeded?.updateLedger,
  }
  const succeededHandler = new OnPaymentSucceeded(succeededDeps)
  eventBus.subscribe<PaymentDomainEvent>('PaymentSucceeded', (event) => {
    if (event.type === 'PaymentSucceeded') {
      return succeededHandler.handle(event)
    }
  })

  // Wire PaymentFailed event
  const failedHandler = new OnPaymentFailed(deps.onPaymentFailed)
  eventBus.subscribe<PaymentDomainEvent>('PaymentFailed', (event) => {
    if (event.type === 'PaymentFailed') {
      return failedHandler.handle(event)
    }
  })

  // Wire PaymentCancelled event
  const cancelledHandler = new OnPaymentCancelled(deps.onPaymentCancelled)
  eventBus.subscribe<PaymentDomainEvent>('PaymentCancelled', (event) => {
    if (event.type === 'PaymentCancelled') {
      return cancelledHandler.handle(event)
    }
  })
}

