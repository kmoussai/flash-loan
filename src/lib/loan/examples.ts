/**
 * Loan Library Usage Examples
 * 
 * This file demonstrates how to use the loan calculation library
 * in various scenarios.
 */

import { PaymentFrequency } from '@/src/types'
import {
  calculateLoan,
  calculatePaymentAmount,
  calculateNewBalance,
  calculateFailedPaymentFees,
  calculateModificationBalance,
  validateLoanParams,
  validatePaymentAmount,
  formatCurrency,
  getNumberOfPayments,
  type LoanCalculationParams,
} from './index'

// ============================================================================
// Example 1: Basic Payment Calculation
// ============================================================================

export function example1_BasicPayment() {
  const params: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3
  }

  const payment = calculatePaymentAmount(params)
  console.log(`Monthly payment: ${formatCurrency(payment || 0)}`)
  // Output: Monthly payment: $175.00
}

// ============================================================================
// Example 2: Complete Loan Calculation with Fees
// ============================================================================

export function example2_CompleteLoan() {
  const params: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3,
    brokerageFee: 50,
    originationFee: 55
  }

  // Validate first
  const validationError = validateLoanParams(params)
  if (validationError) {
    console.error('Validation error:', validationError)
    return
  }

  // Calculate complete loan
  const loan = calculateLoan(params, '2024-02-01')
  if (!loan) {
    console.error('Failed to calculate loan')
    return
  }

  console.log('Loan Summary:')
  console.log(`  Principal: ${formatCurrency(loan.principalAmount)}`)
  console.log(`  Total Fees: ${formatCurrency(loan.totalFees)}`)
  console.log(`  Total Loan Amount: ${formatCurrency(loan.totalLoanAmount)}`)
  console.log(`  Payment Amount: ${formatCurrency(loan.paymentAmount)}`)
  console.log(`  Total Repayment: ${formatCurrency(loan.totalRepaymentAmount)}`)
  console.log(`  Total Interest: ${formatCurrency(loan.totalInterest)}`)
  console.log(`  Number of Payments: ${loan.numberOfPayments}`)

  console.log('\nPayment Schedule:')
  loan.paymentSchedule.forEach((payment) => {
    console.log(
      `  Payment ${payment.paymentNumber} (${payment.dueDate}): ` +
      `${formatCurrency(payment.amount)} ` +
      `(Interest: ${formatCurrency(payment.interest)}, ` +
      `Principal: ${formatCurrency(payment.principal)}, ` +
      `Remaining: ${formatCurrency(payment.remainingBalance)})`
    )
  })
}

// ============================================================================
// Example 3: Balance Calculation After Payment
// ============================================================================

export function example3_BalanceAfterPayment() {
  const currentBalance = 500.00
  const paymentAmount = 175.00

  // Validate payment amount
  const error = validatePaymentAmount(paymentAmount, currentBalance)
  if (error) {
    console.error('Validation error:', error)
    return
  }

  // Calculate new balance
  const result = calculateNewBalance({
    currentBalance,
    paymentAmount
  })

  console.log(`Current Balance: ${formatCurrency(currentBalance)}`)
  console.log(`Payment Amount: ${formatCurrency(paymentAmount)}`)
  console.log(`New Balance: ${formatCurrency(result.newBalance)}`)
  console.log(`Amount Paid: ${formatCurrency(result.amountPaid)}`)
  console.log(`Is Paid Off: ${result.isPaidOff}`)
}

// ============================================================================
// Example 4: Failed Payment Fees Calculation
// ============================================================================

export function example4_FailedPaymentFees() {
  const failedPayments = [
    {
      amount: 175,
      interest: 12.09,
      paymentDate: '2024-02-01'
    },
    {
      amount: 175,
      interest: 8.18,
      paymentDate: '2024-03-01'
    }
  ]

  const result = calculateFailedPaymentFees({
    failedPayments,
    originationFee: 55
  })

  console.log('Failed Payment Fees:')
  console.log(`  Number of Failed Payments: ${result.failedPaymentCount}`)
  console.log(`  Total Fees: ${formatCurrency(result.totalFees)}`)
  console.log(`  Total Interest: ${formatCurrency(result.totalInterest)}`)
  console.log(`  Total Amount: ${formatCurrency(result.totalAmount)}`)
}

// ============================================================================
// Example 5: Loan Modification
// ============================================================================

export function example5_LoanModification() {
  // Current loan state
  const currentBalance = 325.00
  const brokerageFee = 50
  const originationFee = 55

  // Failed payments
  const failedPayments = [
    {
      amount: 175,
      interest: 12.09,
      paymentDate: '2024-02-01'
    }
  ]

  // Calculate failed payment fees
  const failedFees = calculateFailedPaymentFees({
    failedPayments,
    originationFee
  })

  // Calculate new total balance for modification
  const newTotalBalance = calculateModificationBalance(
    currentBalance,
    brokerageFee,
    failedFees
  )

  console.log('Loan Modification:')
  console.log(`  Current Balance: ${formatCurrency(currentBalance)}`)
  console.log(`  Brokerage Fee: ${formatCurrency(brokerageFee)}`)
  console.log(`  Failed Payment Fees: ${formatCurrency(failedFees.totalAmount)}`)
  console.log(`  New Total Balance: ${formatCurrency(newTotalBalance)}`)

  // Calculate new payment schedule
  const newLoan = calculateLoan(
    {
      principalAmount: 0, // Not used for modification
      interestRate: 29,
      paymentFrequency: 'monthly',
      numberOfPayments: 2
    },
    '2024-04-01'
  )

  if (newLoan) {
    // Note: For actual modification, you'd recalculate with newTotalBalance
    console.log(`  New Payment Amount: ${formatCurrency(newLoan.paymentAmount)}`)
  }
}

// ============================================================================
// Example 6: Different Payment Frequencies
// ============================================================================

export function example6_DifferentFrequencies() {
  const frequencies: PaymentFrequency[] = [
    'weekly',
    'bi-weekly',
    'twice-monthly',
    'monthly'
  ]

  const params: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly', // Will be overridden
    numberOfPayments: 0 // Will be calculated
  }

  console.log('Payment Frequencies Comparison:')
  frequencies.forEach((frequency) => {
    const numberOfPayments = getNumberOfPayments(frequency)
    const payment = calculatePaymentAmount({
      ...params,
      paymentFrequency: frequency,
      numberOfPayments
    })

    if (payment) {
      const totalRepayment = payment * numberOfPayments
      console.log(
        `  ${frequency}: ${numberOfPayments} payments of ${formatCurrency(payment)} ` +
        `(Total: ${formatCurrency(totalRepayment)})`
      )
    }
  })
}

// ============================================================================
// Example 7: Validation Examples
// ============================================================================

export function example7_Validation() {
  // Valid loan
  const validLoan: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3
  }
  console.log('Valid loan:', validateLoanParams(validLoan)) // null

  // Invalid: negative principal
  const invalidLoan1: LoanCalculationParams = {
    principalAmount: -100,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3
  }
  console.log('Invalid loan (negative principal):', validateLoanParams(invalidLoan1))

  // Invalid: negative interest
  const invalidLoan2: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: -5,
    paymentFrequency: 'monthly',
    numberOfPayments: 3
  }
  console.log('Invalid loan (negative interest):', validateLoanParams(invalidLoan2))

  // Payment validation
  console.log('Payment validation:', validatePaymentAmount(200, 100)) // Error
  console.log('Payment validation:', validatePaymentAmount(50, 100)) // null
}

// ============================================================================
// Example 8: Real-World Scenario - Loan Lifecycle
// ============================================================================

export function example8_LoanLifecycle() {
  console.log('=== Loan Lifecycle Example ===\n')

  // Step 1: Create loan
  const loanParams: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3,
    brokerageFee: 50
  }

  const loan = calculateLoan(loanParams, '2024-02-01')
  if (!loan) {
    console.error('Failed to create loan')
    return
  }

  console.log('Step 1: Loan Created')
  console.log(`  Total Loan Amount: ${formatCurrency(loan.totalLoanAmount)}`)
  console.log(`  Payment Amount: ${formatCurrency(loan.paymentAmount)}`)

  // Step 2: First payment
  let currentBalance = loan.totalLoanAmount
  const firstPayment = loan.paymentSchedule[0]
  
  const balanceAfterFirst = calculateNewBalance({
    currentBalance,
    paymentAmount: firstPayment.amount
  })

  console.log('\nStep 2: First Payment Made')
  console.log(`  Payment: ${formatCurrency(firstPayment.amount)}`)
  console.log(`  New Balance: ${formatCurrency(balanceAfterFirst.newBalance)}`)

  // Step 3: Second payment (failed)
  currentBalance = balanceAfterFirst.newBalance
  const secondPayment = loan.paymentSchedule[1]
  
  console.log('\nStep 3: Second Payment Failed')
  console.log(`  Attempted Payment: ${formatCurrency(secondPayment.amount)}`)
  console.log(`  Balance Unchanged: ${formatCurrency(currentBalance)}`)

  // Step 4: Calculate failed payment fees
  const failedFees = calculateFailedPaymentFees({
    failedPayments: [
      {
        amount: secondPayment.amount,
        interest: secondPayment.interest,
        paymentDate: secondPayment.dueDate
      }
    ],
    originationFee: 55
  })

  console.log('\nStep 4: Failed Payment Fees')
  console.log(`  Fees Added: ${formatCurrency(failedFees.totalAmount)}`)

  // Step 5: Loan modification
  const modificationBalance = calculateModificationBalance(
    currentBalance,
    0, // No additional brokerage fee
    failedFees
  )

  console.log('\nStep 5: Loan Modification')
  console.log(`  Balance Before: ${formatCurrency(currentBalance)}`)
  console.log(`  Balance After Modification: ${formatCurrency(modificationBalance)}`)

  // Step 6: New payment schedule
  const modifiedLoan = calculateLoan(
    {
      principalAmount: 0,
      interestRate: 29,
      paymentFrequency: 'monthly',
      numberOfPayments: 2
    },
    '2024-04-01'
  )

  if (modifiedLoan) {
    console.log('\nStep 6: New Payment Schedule')
    console.log(`  New Payment Amount: ${formatCurrency(modifiedLoan.paymentAmount)}`)
    console.log(`  Remaining Payments: ${modifiedLoan.numberOfPayments}`)
  }
}

