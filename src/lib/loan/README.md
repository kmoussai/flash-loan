# Loan Calculation Library

A comprehensive, abstract library for all loan-related calculations. All functions are pure (no side effects) - they take inputs and return results.

## Features

- ✅ Payment amount calculation (amortization formula)
- ✅ Payment schedule generation with interest/principal breakdown
- ✅ Balance calculations (remaining balance, new balance after payment)
- ✅ Fee calculations (brokerage, origination, other fees)
- ✅ Failed payment fee calculations
- ✅ Loan modification calculations
- ✅ Complete loan calculation (all-in-one function)
- ✅ Validation functions
- ✅ Utility functions (formatting, rounding)

## Quick Start

### Basic Payment Calculation

```typescript
import { calculatePaymentAmount } from '@/src/lib/loan'

const payment = calculatePaymentAmount({
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3
})
// Returns: 175.00
```

### Complete Loan Calculation

```typescript
import { calculateLoan } from '@/src/lib/loan'

const loan = calculateLoan({
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3,
  brokerageFee: 50,
  originationFee: 55
}, '2024-02-01')

// Returns:
// {
//   principalAmount: 500,
//   totalFees: 105,
//   totalLoanAmount: 605,
//   paymentAmount: 211.75,
//   totalRepaymentAmount: 635.25,
//   totalInterest: 30.25,
//   paymentSchedule: [...],
//   numberOfPayments: 3,
//   paymentFrequency: 'monthly'
// }
```

### Balance Calculation

```typescript
import { calculateNewBalance } from '@/src/lib/loan'

const result = calculateNewBalance({
  currentBalance: 500.00,
  paymentAmount: 175.00
})
// Returns: { newBalance: 325.00, amountPaid: 175.00, isPaidOff: false }
```

### Failed Payment Fees

```typescript
import { calculateFailedPaymentFees } from '@/src/lib/loan'

const result = calculateFailedPaymentFees({
  failedPayments: [
    { amount: 175, interest: 12.09, paymentDate: '2024-02-01' },
    { amount: 175, interest: 8.18, paymentDate: '2024-03-01' }
  ],
  originationFee: 55
})
// Returns: { totalFees: 110, totalInterest: 20.27, totalAmount: 130.27, failedPaymentCount: 2 }
```

## API Reference

### Core Functions

#### `calculatePaymentAmount(params: LoanCalculationParams): number | undefined`

Calculates the exact amortized payment amount using the standard amortization formula.

**Parameters:**
- `principalAmount`: Principal loan amount (before fees)
- `interestRate`: Annual interest rate as percentage (e.g., 29 for 29%)
- `paymentFrequency`: Payment frequency ('weekly', 'bi-weekly', 'twice-monthly', 'monthly')
- `numberOfPayments`: Total number of payments
- `brokerageFee?`: Optional brokerage fee
- `originationFee?`: Optional origination fee
- `otherFees?`: Optional other fees

**Returns:** Payment amount per period, or `undefined` if invalid

#### `calculateLoan(params: LoanCalculationParams, firstPaymentDate: string): LoanCalculationResult | undefined`

Complete loan calculation including schedule, fees, and all amounts.

**Returns:** Complete loan calculation result with:
- `principalAmount`: Original principal
- `totalFees`: Sum of all fees
- `totalLoanAmount`: Principal + fees
- `paymentAmount`: Payment per period
- `totalRepaymentAmount`: Total to be repaid
- `totalInterest`: Total interest
- `paymentSchedule`: Array of payment breakdowns
- `numberOfPayments`: Number of payments
- `paymentFrequency`: Payment frequency

#### `calculatePaymentBreakdown(params: LoanCalculationParams, firstPaymentDate: string): PaymentBreakdown[]`

Calculates interest and principal breakdown for each payment.

**Returns:** Array of payment breakdowns with:
- `paymentNumber`: Payment number (1-indexed)
- `dueDate`: Due date (ISO date string)
- `amount`: Total payment amount
- `interest`: Interest portion
- `principal`: Principal portion
- `remainingBalance`: Balance after payment

### Balance Functions

#### `calculateNewBalance(params: BalanceCalculationParams): BalanceCalculationResult`

Calculates new remaining balance after payment or fee adjustment.

**Parameters:**
- `currentBalance`: Current remaining balance
- `paymentAmount`: Payment amount to apply
- `additionalFees?`: Optional fees to add (for modifications)

**Returns:**
- `newBalance`: New remaining balance
- `amountPaid`: Amount paid
- `isPaidOff`: Whether balance is zero

#### `calculateBalanceFromPayments(initialBalance: number, payments: number[]): number`

Calculates remaining balance from payment history.

### Fee Functions

#### `calculateTotalFees(params: LoanCalculationParams): number`

Calculates total fees (brokerage + origination + other).

#### `calculateTotalLoanAmount(params: LoanCalculationParams): number`

Calculates total loan amount (principal + fees).

#### `calculateFailedPaymentFees(params: FailedPaymentCalculationParams): FailedPaymentCalculationResult`

Calculates fees and interest from failed payments.

### Validation Functions

#### `validateLoanParams(params: LoanCalculationParams): string | null`

Validates loan calculation parameters. Returns error message if invalid, `null` if valid.

#### `validatePaymentAmount(paymentAmount: number, currentBalance: number): string | null`

Validates payment amount doesn't exceed balance.

### Utility Functions

#### `getNumberOfPayments(paymentFrequency: PaymentFrequency): number`

Gets number of payments for a frequency (max 3 months).

#### `formatCurrency(amount: number, currency?: string): string`

Formats amount as currency string.

#### `roundCurrency(amount: number): number`

Rounds amount to 2 decimal places.

## Migration Guide

### From `src/lib/utils/loan.ts`

**Old:**
```typescript
import { calculatePaymentAmount } from '@/src/lib/utils/loan'

const payment = calculatePaymentAmount('monthly', 500, 29, 3)
```

**New:**
```typescript
import { calculatePaymentAmount } from '@/src/lib/loan'

const payment = calculatePaymentAmount({
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3
})
```

### From `src/lib/utils/schedule.ts`

**Old:**
```typescript
import { buildSchedule } from '@/src/lib/utils/schedule'

const schedule = buildSchedule({
  paymentAmount: 175,
  paymentFrequency: 'monthly',
  numberOfPayments: 3,
  nextPaymentDate: '2024-02-01'
})
```

**New:**
```typescript
import { calculateLoan } from '@/src/lib/loan'

const loan = calculateLoan({
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3
}, '2024-02-01')

const schedule = loan.paymentSchedule
```

## Examples

### Example 1: Calculate Loan with Fees

```typescript
import { calculateLoan, validateLoanParams } from '@/src/lib/loan'

const params = {
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly' as const,
  numberOfPayments: 3,
  brokerageFee: 50,
  originationFee: 55
}

// Validate first
const validationError = validateLoanParams(params)
if (validationError) {
  console.error(validationError)
  return
}

// Calculate
const loan = calculateLoan(params, '2024-02-01')
if (!loan) {
  console.error('Invalid loan parameters')
  return
}

console.log(`Payment amount: ${loan.paymentAmount}`)
console.log(`Total to repay: ${loan.totalRepaymentAmount}`)
console.log(`Total interest: ${loan.totalInterest}`)
```

### Example 2: Calculate Balance After Payment

```typescript
import { calculateNewBalance, validatePaymentAmount } from '@/src/lib/loan'

const currentBalance = 500.00
const paymentAmount = 175.00

// Validate
const error = validatePaymentAmount(paymentAmount, currentBalance)
if (error) {
  console.error(error)
  return
}

// Calculate
const result = calculateNewBalance({
  currentBalance,
  paymentAmount
})

console.log(`New balance: ${result.newBalance}`)
if (result.isPaidOff) {
  console.log('Loan is paid off!')
}
```

### Example 3: Loan Modification

```typescript
import {
  calculateFailedPaymentFees,
  calculateModificationBalance,
  calculateLoan
} from '@/src/lib/loan'

// Get failed payments
const failedPayments = [
  { amount: 175, interest: 12.09, paymentDate: '2024-02-01' }
]

// Calculate failed payment fees
const failedFees = calculateFailedPaymentFees({
  failedPayments,
  originationFee: 55
})

// Calculate new total balance
const currentBalance = 325.00
const brokerageFee = 50
const newTotalBalance = calculateModificationBalance(
  currentBalance,
  brokerageFee,
  failedFees
)

// Calculate new payment schedule
const newLoan = calculateLoan({
  principalAmount: 0, // Not used for modification
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 2
}, '2024-04-01')

// Note: For modification, you'd use newTotalBalance as the starting balance
```

## Type Definitions

All types are exported from the library. Key types:

- `LoanCalculationParams`: Input parameters for loan calculations
- `LoanCalculationResult`: Complete loan calculation result
- `PaymentBreakdown`: Single payment breakdown
- `BalanceCalculationParams`: Parameters for balance calculation
- `BalanceCalculationResult`: Balance calculation result
- `FailedPaymentCalculationParams`: Parameters for failed payment calculation
- `FailedPaymentCalculationResult`: Failed payment calculation result

## Notes

- All amounts are rounded to 2 decimal places
- All functions are pure (no side effects)
- All date strings use ISO format (YYYY-MM-DD)
- Interest rates are annual percentages (e.g., 29 for 29%)
- Payment frequencies: 'weekly', 'bi-weekly', 'twice-monthly', 'monthly'
- Maximum loan term is 3 months (enforced by `getNumberOfPayments`)

