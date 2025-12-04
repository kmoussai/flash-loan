# Loan Library Testing Guide

## Overview

Comprehensive test suite for the loan calculation library to ensure all calculations are correct and accurate.

## Test Setup

The project uses **Jest** as the testing framework with the following configuration:

- **Jest Config**: `jest.config.js`
- **Jest Setup**: `jest.setup.js`
- **Test Files**: `src/lib/loan/__tests__/loan.test.ts`

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- loan.test.ts
```

## Test Coverage

The test suite covers:

### ✅ Core Functions
- `calculatePaymentAmount` - Payment amount calculation
- `calculateTotalFees` - Fee calculations
- `calculateTotalLoanAmount` - Total loan amount
- `calculatePaymentBreakdown` - Interest/principal breakdown
- `calculateTotalInterest` - Total interest calculation
- `calculateTotalRepaymentAmount` - Total repayment
- `calculateLoan` - Complete loan calculation

### ✅ Balance Functions
- `calculateNewBalance` - Balance after payment
- `calculateBalanceFromPayments` - Balance from payment history

### ✅ Failed Payment Functions
- `calculateFailedPaymentFees` - Failed payment fees
- `calculateModificationBalance` - Loan modification balance

### ✅ Validation Functions
- `validateLoanParams` - Parameter validation
- `validatePaymentAmount` - Payment amount validation

### ✅ Utility Functions
- `getNumberOfPayments` - Payment count by frequency
- `formatCurrency` - Currency formatting
- `roundCurrency` - Rounding to 2 decimals

## Test Scenarios

### 1. Basic Payment Calculation
- ✅ Monthly payment for $500 loan at 29% APR, 3 months = $175.00
- ✅ Payment calculation with fees included
- ✅ Invalid input handling (negative, zero, undefined)
- ✅ Zero interest rate handling
- ✅ All payment frequencies (weekly, bi-weekly, twice-monthly, monthly)

### 2. Fee Calculations
- ✅ Total fees calculation (brokerage + origination + other)
- ✅ Total loan amount (principal + fees)
- ✅ Zero fees handling

### 3. Payment Breakdown
- ✅ Correct payment schedule generation
- ✅ Interest and principal calculation
- ✅ Due date calculation for all frequencies
- ✅ Last payment pays off remaining balance

### 4. Complete Loan Calculation
- ✅ Complete loan with all amounts
- ✅ Fees included in calculation
- ✅ Total interest calculation
- ✅ Total repayment calculation
- ✅ Payment schedule consistency

### 5. Balance Calculations
- ✅ Balance after payment
- ✅ Payment that pays off loan
- ✅ Payment larger than balance (should not go negative)
- ✅ Additional fees handling
- ✅ Balance from payment history

### 6. Failed Payment Calculations
- ✅ Failed payment fees calculation
- ✅ Multiple failed payments
- ✅ Empty failed payments array
- ✅ Failed payments without interest

### 7. Loan Modification
- ✅ Modification balance calculation
- ✅ Zero fees handling
- ✅ Integration with failed payment fees

### 8. Validation
- ✅ Valid loan parameters
- ✅ Invalid parameters (negative, zero, invalid frequency)
- ✅ Payment amount validation
- ✅ Payment exceeding balance

### 9. Edge Cases
- ✅ Very small loan amounts
- ✅ Very large loan amounts
- ✅ Very high interest rates
- ✅ Single payment loan

### 10. Integration Tests
- ✅ Consistency across all calculations
- ✅ Payment schedule sums match total repayment
- ✅ Last payment brings balance to zero
- ✅ Interest + principal = payment amount
- ✅ Complete loan modification scenario

## Expected Test Results

When all tests pass, you should see:

```
PASS  src/lib/loan/__tests__/loan.test.ts
  Loan Calculation Library
    calculatePaymentAmount
      ✓ should calculate correct monthly payment for $500 loan at 29% APR, 3 months
      ✓ should calculate correct payment with fees included
      ✓ should return undefined for invalid principal amount
      ...
    [More test suites...]

Test Suites: 1 passed, 1 total
Tests:       75+ passed, 75+ total
Snapshots:   0 total
Time:        X.XXX s
```

## Key Test Cases

### Example 1: Standard Loan
```typescript
const params = {
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3
}

// Expected: Payment = $175.00
```

### Example 2: Loan with Fees
```typescript
const params = {
  principalAmount: 500,
  interestRate: 29,
  paymentFrequency: 'monthly',
  numberOfPayments: 3,
  brokerageFee: 50,
  originationFee: 55
}

// Expected: Total Loan = $605, Payment ≈ $211.75
```

### Example 3: Balance After Payment
```typescript
const result = calculateNewBalance({
  currentBalance: 500.00,
  paymentAmount: 175.00
})

// Expected: { newBalance: 325.00, amountPaid: 175.00, isPaidOff: false }
```

## Troubleshooting

### Tests fail with "Cannot find name 'describe'"
- Ensure `@types/jest` is installed: `npm install --save-dev @types/jest`
- Check that `jest.config.js` is properly configured

### Tests fail with module resolution errors
- Check `jest.config.js` has correct `moduleNameMapper` for `@/` paths
- Ensure `tsconfig.json` paths match Jest configuration

### Payment calculations don't match expected values
- Check that interest rate is in percentage (29 for 29%)
- Verify payment frequency mapping is correct
- Ensure rounding is to 2 decimal places

## Continuous Integration

These tests should be run:
- Before committing code
- In CI/CD pipeline
- Before deploying to production

## Adding New Tests

When adding new functions to the loan library:

1. Add test cases in `loan.test.ts`
2. Test both valid and invalid inputs
3. Test edge cases
4. Test integration with other functions
5. Ensure coverage remains high

## Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

Run `npm run test:coverage` to see current coverage.

