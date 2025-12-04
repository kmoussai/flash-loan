/**
 * Loan Library Tests
 * 
 * Comprehensive tests for all loan calculation functions
 */

import { PaymentFrequency } from '@/src/types'
import {
  calculatePaymentAmount,
  calculateTotalFees,
  calculateTotalLoanAmount,
  calculatePaymentBreakdown,
  calculateTotalInterest,
  calculateTotalRepaymentAmount,
  calculateLoan,
  calculateNewBalance,
  calculateBalanceFromPayments,
  calculateFailedPaymentFees,
  calculateModificationBalance,
  validateLoanParams,
  validatePaymentAmount,
  getNumberOfPayments,
  formatCurrency,
  roundCurrency,
  calculateBrokerageFee,
  type LoanCalculationParams,
} from '../index'

describe('Loan Calculation Library', () => {
  // ============================================================================
  // Test Data
  // ============================================================================

  const baseLoanParams: LoanCalculationParams = {
    principalAmount: 500,
    interestRate: 29,
    paymentFrequency: 'monthly',
    numberOfPayments: 3,
  }

  const loanWithFees: LoanCalculationParams = {
    ...baseLoanParams,
    brokerageFee: 50,
    originationFee: 55,
  }

  // ============================================================================
  // calculatePaymentAmount Tests
  // ============================================================================

  describe('calculatePaymentAmount', () => {
      it('Sofloan examples 2', () => {
        const payment = calculatePaymentAmount({
            principalAmount: 250+170.94,
            interestRate: 29,
            paymentFrequency: 'bi-weekly',
            numberOfPayments: 6
        })
        expect(payment).toBeCloseTo(72.92, 2)
      })
      it('Sofloan examples 1', () => {
        const payment = calculatePaymentAmount({
            principalAmount: 420.94,
            interestRate: 29,
            paymentFrequency: 'bi-weekly',
            numberOfPayments: 6
        })
        expect(payment).toBeCloseTo(72.92, 2)
      })
      it('should calculate correct monthly payment for $500 loan at 29% APR, 3 months', () => {
        const payment = calculatePaymentAmount(baseLoanParams)
        expect(payment).toBeCloseTo(174.79, 2)
      })

    it('should calculate correct payment with fees included', () => {
      const payment = calculatePaymentAmount(loanWithFees)
      // Total loan amount: 500 + 50 + 55 = 605
      // Payment should be calculated on 605
      expect(payment).toBeCloseTo(211.50, 1)
      expect(payment).toBeGreaterThan(210)
      expect(payment).toBeLessThan(212)
    })

    it('should return undefined for invalid principal amount', () => {
      const result = calculatePaymentAmount({
        ...baseLoanParams,
        principalAmount: -100,
      })
      expect(result).toBeUndefined()
    })

    it('should return undefined for zero principal', () => {
      const result = calculatePaymentAmount({
        ...baseLoanParams,
        principalAmount: 0,
      })
      expect(result).toBeUndefined()
    })

    it('should return undefined for negative interest rate', () => {
      const result = calculatePaymentAmount({
        ...baseLoanParams,
        interestRate: -5,
      })
      expect(result).toBeUndefined()
    })

    it('should return undefined for zero payments', () => {
      const result = calculatePaymentAmount({
        ...baseLoanParams,
        numberOfPayments: 0,
      })
      expect(result).toBeUndefined()
    })

    it('should handle zero interest rate', () => {
      const result = calculatePaymentAmount({
        ...baseLoanParams,
        interestRate: 0,
      })
      // Should be simple division: 500 / 3 = 166.66666666666666 (precise)
      expect(result).toBeCloseTo(166.67, 2)
    })

    it('should calculate correct payment for weekly frequency', () => {
      const result = calculatePaymentAmount({
        principalAmount: 500,
        interestRate: 29,
        paymentFrequency: 'weekly',
        numberOfPayments: 12,
      })
      expect(result).toBeGreaterThan(43)
      expect(result).toBeLessThan(44)
      expect(result).toBeDefined()
    })

    it('should calculate correct payment for bi-weekly frequency', () => {
      const result = calculatePaymentAmount({
        principalAmount: 500,
        interestRate: 29,
        paymentFrequency: 'bi-weekly',
        numberOfPayments: 6,
      })
      expect(result).toBeGreaterThan(86)
      expect(result).toBeLessThan(88)
      expect(result).toBeDefined()
    })

    it('should calculate correct payment for twice-monthly frequency', () => {
      const result = calculatePaymentAmount({
        principalAmount: 500,
        interestRate: 29,
        paymentFrequency: 'twice-monthly',
        numberOfPayments: 6,
      })
      expect(result).toBeGreaterThan(86)
      expect(result).toBeLessThan(88)
      expect(result).toBeDefined()
    })

    it('should generate correct twice-monthly schedule (15th and last day)', () => {
      const breakdown = calculatePaymentBreakdown(
        {
          principalAmount: 500,
          interestRate: 29,
          paymentFrequency: 'twice-monthly',
          numberOfPayments: 6,
        },
        '2024-02-15' // Start on 15th
      )

      expect(breakdown).toHaveLength(6)
      
      // First payment: Feb 15
      expect(breakdown[0].dueDate).toBe('2024-02-15')
      
      // Second payment: Feb 29 (last day of Feb 2024)
      expect(breakdown[1].dueDate).toBe('2024-02-29')
      
      // Third payment: Mar 15
      expect(breakdown[2].dueDate).toBe('2024-03-15')
      
      // Fourth payment: Mar 31 (last day of Mar)
      expect(breakdown[3].dueDate).toBe('2024-03-31')
      
      // Fifth payment: Apr 15
      expect(breakdown[4].dueDate).toBe('2024-04-15')
      
      // Sixth payment: Apr 30 (last day of Apr)
      expect(breakdown[5].dueDate).toBe('2024-04-30')
    })

    it('should handle twice-monthly starting on different dates', () => {
      const breakdown = calculatePaymentBreakdown(
        {
          principalAmount: 500,
          interestRate: 29,
          paymentFrequency: 'twice-monthly',
          numberOfPayments: 4,
        },
        '2024-01-05' // Start on 5th
      )

      expect(breakdown).toHaveLength(4)
      
      // First payment: Jan 15
      expect(breakdown[0].dueDate).toBe('2024-01-15')
      
      // Second payment: Jan 31 (last day)
      expect(breakdown[1].dueDate).toBe('2024-01-31')
      
      // Third payment: Feb 15
      expect(breakdown[2].dueDate).toBe('2024-02-15')
      
      // Fourth payment: Feb 29 (last day of Feb 2024)
      expect(breakdown[3].dueDate).toBe('2024-02-29')
    })
  })
// return 
  // ============================================================================
  // Fee Calculation Tests
  // ============================================================================

  describe('calculateTotalFees', () => {
    it('should calculate total fees correctly', () => {
      const totalFees = calculateTotalFees(loanWithFees)
      expect(totalFees).toBe(105) // 50 + 55
    })

    it('should return 0 when no fees provided', () => {
      const totalFees = calculateTotalFees(baseLoanParams)
      expect(totalFees).toBe(0)
    })

    it('should include all fee types', () => {
      const params: LoanCalculationParams = {
        ...baseLoanParams,
        brokerageFee: 50,
        originationFee: 55,
        otherFees: 25,
      }
      const totalFees = calculateTotalFees(params)
      expect(totalFees).toBe(130) // 50 + 55 + 25
    })
  })

  describe('calculateTotalLoanAmount', () => {
    it('should calculate total loan amount correctly', () => {
      const total = calculateTotalLoanAmount(loanWithFees)
      expect(total).toBe(605) // 500 + 50 + 55
    })

    it('should return principal when no fees', () => {
      const total = calculateTotalLoanAmount(baseLoanParams)
      expect(total).toBe(500)
    })
  })

  // ============================================================================
  // Payment Breakdown Tests
  // ============================================================================

  describe('calculatePaymentBreakdown', () => {
    it('should generate correct payment schedule', () => {
      const breakdown = calculatePaymentBreakdown(
        baseLoanParams,
        '2024-02-01'
      )

      expect(breakdown).toHaveLength(3)
      expect(breakdown[0].paymentNumber).toBe(1)
      expect(breakdown[0].dueDate).toBe('2024-02-01')
      expect(breakdown[0].amount).toBeCloseTo(174.79, 1)
    })

    it('should calculate interest and principal correctly', () => {
      const breakdown = calculatePaymentBreakdown(
        baseLoanParams,
        '2024-02-01'
      )

      // First payment: interest on $500
      const firstPayment = breakdown[0]
      expect(firstPayment.interest).toBeGreaterThan(10)
      expect(firstPayment.interest).toBeLessThan(15)
      expect(firstPayment.principal).toBeGreaterThan(160)
      expect(firstPayment.principal).toBeLessThan(165)

      // Last payment should pay off remaining balance
      const lastPayment = breakdown[2]
      expect(lastPayment.remainingBalance).toBe(0)
    })

    it('should verify interest and principal sum equals payment amount', () => {
      const breakdown = calculatePaymentBreakdown(
        baseLoanParams,
        '2024-02-01'
      )

      breakdown.forEach((payment, index) => {
        const sum = payment.interest + payment.principal
        // Allow small rounding differences (within 1 cent)
        expect(Math.abs(sum - payment.amount)).toBeLessThan(0.02)
        expect(payment.interest).toBeGreaterThanOrEqual(0)
        expect(payment.principal).toBeGreaterThanOrEqual(0)
      })
    })

    it('should calculate decreasing interest and increasing principal over time', () => {
      const breakdown = calculatePaymentBreakdown(
        baseLoanParams,
        '2024-02-01'
      )

      // Interest should decrease as balance decreases
      for (let i = 0; i < breakdown.length - 1; i++) {
        expect(breakdown[i].interest).toBeGreaterThanOrEqual(breakdown[i + 1].interest)
      }

      // Principal should generally increase (except last payment which pays off remainder)
      for (let i = 0; i < breakdown.length - 2; i++) {
        expect(breakdown[i].principal).toBeLessThanOrEqual(breakdown[i + 1].principal)
      }
    })

    it('should calculate exact interest and principal for known loan', () => {
      // Test with a simple loan: $1000 at 12% APR, monthly, 3 payments
      const breakdown = calculatePaymentBreakdown(
        {
          principalAmount: 1000,
          interestRate: 12, // 12% APR
          paymentFrequency: 'monthly',
          numberOfPayments: 3,
        },
        '2024-01-01'
      )

      expect(breakdown).toHaveLength(3)

      // First payment: interest = 1000 * (12/100/12) = 10
      const firstPayment = breakdown[0]
      expect(firstPayment.interest).toBeCloseTo(10, 1)
      // Principal = payment amount - interest
      expect(firstPayment.principal).toBeGreaterThan(0)
      expect(firstPayment.principal + firstPayment.interest).toBeCloseTo(firstPayment.amount, 2)

      // Verify remaining balance decreases correctly
      let expectedBalance = 1000
      breakdown.forEach((payment) => {
        expectedBalance -= payment.principal
        expect(payment.remainingBalance).toBeCloseTo(expectedBalance, 1)
      })

      // Last payment should have balance of 0
      expect(breakdown[breakdown.length - 1].remainingBalance).toBe(0)
    })

    it('should handle interest and principal with fees included', () => {
      const breakdown = calculatePaymentBreakdown(
        {
          principalAmount: 500,
          interestRate: 29,
          paymentFrequency: 'monthly',
          numberOfPayments: 3,
          brokerageFee: 50,
          originationFee: 55,
        },
        '2024-02-01'
      )

      expect(breakdown).toHaveLength(3)

      // Total loan amount = 500 + 50 + 55 = 605
      // First payment interest should be calculated on $605
      const firstPayment = breakdown[0]
      expect(firstPayment.interest).toBeGreaterThan(14) // Interest on 605
      expect(firstPayment.interest).toBeLessThan(15)

      // Verify all payments have valid interest and principal
      breakdown.forEach((payment) => {
        expect(payment.interest).toBeGreaterThanOrEqual(0)
        expect(payment.principal).toBeGreaterThanOrEqual(0)
        expect(payment.interest + payment.principal).toBeCloseTo(payment.amount, 2)
      })
    })

    it('should have correct due dates for monthly payments', () => {
      const breakdown = calculatePaymentBreakdown(
        baseLoanParams,
        '2024-02-01'
      )

      expect(breakdown[0].dueDate).toBe('2024-02-01')
      expect(breakdown[1].dueDate).toBe('2024-03-01')
      expect(breakdown[2].dueDate).toBe('2024-04-01')
    })

    it('should have correct due dates for weekly payments', () => {
      const breakdown = calculatePaymentBreakdown(
        {
          principalAmount: 500,
          interestRate: 29,
          paymentFrequency: 'weekly',
          numberOfPayments: 4,
        },
        '2024-02-01'
      )

      expect(breakdown[0].dueDate).toBe('2024-02-01')
      expect(breakdown[1].dueDate).toBe('2024-02-08')
      expect(breakdown[2].dueDate).toBe('2024-02-15')
      expect(breakdown[3].dueDate).toBe('2024-02-22')
    })

    it('should return empty array for invalid params', () => {
      const breakdown = calculatePaymentBreakdown(
        {
          ...baseLoanParams,
          principalAmount: -100,
        },
        '2024-02-01'
      )
      expect(breakdown).toHaveLength(0)
    })
  })

  // ============================================================================
  // Complete Loan Calculation Tests
  // ============================================================================

  describe('calculateLoan', () => {
    it('should calculate complete loan correctly', () => {
      const loan = calculateLoan(baseLoanParams, '2024-02-01')

      expect(loan).toBeDefined()
      expect(loan?.principalAmount).toBe(500)
      expect(loan?.totalFees).toBe(0)
      expect(loan?.totalLoanAmount).toBe(500)
      expect(loan?.paymentAmount).toBeCloseTo(174.79, 2)
      expect(loan?.numberOfPayments).toBe(3)
      expect(loan?.paymentFrequency).toBe('monthly')
      expect(loan?.paymentSchedule).toHaveLength(3)
    })

    it('should include fees in calculation', () => {
      const loan = calculateLoan(loanWithFees, '2024-02-01')

      expect(loan).toBeDefined()
      expect(loan?.principalAmount).toBe(500)
      expect(loan?.totalFees).toBe(105)
      expect(loan?.totalLoanAmount).toBe(605)
      expect(loan?.paymentAmount).toBeCloseTo(211.50, 1)
    })

    it('should calculate total interest correctly', () => {
      const loan = calculateLoan(baseLoanParams, '2024-02-01')

      expect(loan?.totalInterest).toBeGreaterThan(0)
      // For $500 at 29% APR over 3 months, interest should be around $25-30
      expect(loan?.totalInterest).toBeGreaterThan(20)
      expect(loan?.totalInterest).toBeLessThan(30)
    })

    it('should calculate total repayment correctly', () => {
      const loan = calculateLoan(baseLoanParams, '2024-02-01')

      if (loan) {
        const expectedTotal = loan.totalLoanAmount + loan.totalInterest
        expect(loan.totalRepaymentAmount).toBeCloseTo(expectedTotal, 2)
      }
    })

    it('should return undefined for invalid params', () => {
      const loan = calculateLoan(
        {
          ...baseLoanParams,
          principalAmount: -100,
        },
        '2024-02-01'
      )
      expect(loan).toBeUndefined()
    })
  })

  // ============================================================================
  // Balance Calculation Tests
  // ============================================================================

  describe('calculateNewBalance', () => {
    it('should calculate new balance after payment', () => {
      const result = calculateNewBalance({
        currentBalance: 500.0,
        paymentAmount: 175.0,
      })

      expect(result.newBalance).toBe(325.0)
      expect(result.amountPaid).toBe(175.0)
      expect(result.isPaidOff).toBe(false)
    })

    it('should handle payment that pays off loan', () => {
      const result = calculateNewBalance({
        currentBalance: 175.0,
        paymentAmount: 175.0,
      })

      expect(result.newBalance).toBe(0)
      expect(result.isPaidOff).toBe(true)
    })

    it('should handle payment larger than balance', () => {
      const result = calculateNewBalance({
        currentBalance: 100.0,
        paymentAmount: 200.0,
      })

      expect(result.newBalance).toBe(0) // Should not go negative
      expect(result.isPaidOff).toBe(true)
    })

    it('should add additional fees before subtracting payment', () => {
      const result = calculateNewBalance({
        currentBalance: 500.0,
        paymentAmount: 0,
        additionalFees: 100.0,
      })

      expect(result.newBalance).toBe(600.0)
    })

    it('should handle zero balance', () => {
      const result = calculateNewBalance({
        currentBalance: 0,
        paymentAmount: 0,
      })

      expect(result.newBalance).toBe(0)
      expect(result.isPaidOff).toBe(true)
    })
  })

  describe('calculateBalanceFromPayments', () => {
    it('should calculate balance from payment history', () => {
      const balance = calculateBalanceFromPayments(500, [175, 175])
      expect(balance).toBe(150)
    })

    it('should return 0 when payments exceed balance', () => {
      const balance = calculateBalanceFromPayments(500, [300, 300])
      expect(balance).toBe(0)
    })

    it('should return initial balance when no payments', () => {
      const balance = calculateBalanceFromPayments(500, [])
      expect(balance).toBe(500)
    })

    it('should handle multiple payments', () => {
      const balance = calculateBalanceFromPayments(1000, [100, 200, 300])
      expect(balance).toBe(400)
    })
  })

  // ============================================================================
  // Failed Payment Tests
  // ============================================================================

  describe('calculateFailedPaymentFees', () => {
    it('should calculate failed payment fees correctly', () => {
      const result = calculateFailedPaymentFees({
        failedPayments: [
          {
            amount: 175,
            interest: 12.09,
            paymentDate: '2024-02-01',
          },
          {
            amount: 175,
            interest: 8.18,
            paymentDate: '2024-03-01',
          },
        ],
        originationFee: 55,
      })

      expect(result.totalFees).toBe(110) // 55 * 2
      expect(result.totalInterest).toBe(20.27) // 12.09 + 8.18
      expect(result.totalAmount).toBe(130.27) // 110 + 20.27
      expect(result.failedPaymentCount).toBe(2)
    })

    it('should handle empty failed payments array', () => {
      const result = calculateFailedPaymentFees({
        failedPayments: [],
        originationFee: 55,
      })

      expect(result.totalFees).toBe(0)
      expect(result.totalInterest).toBe(0)
      expect(result.totalAmount).toBe(0)
      expect(result.failedPaymentCount).toBe(0)
    })

    it('should handle failed payments without interest', () => {
      const result = calculateFailedPaymentFees({
        failedPayments: [
          {
            amount: 175,
            interest: 0,
            paymentDate: '2024-02-01',
          },
        ],
        originationFee: 55,
      })

      expect(result.totalFees).toBe(55)
      expect(result.totalInterest).toBe(0)
      expect(result.totalAmount).toBe(55)
    })
  })

  describe('calculateModificationBalance', () => {
    it('should calculate modification balance correctly', () => {
      const failedFees = calculateFailedPaymentFees({
        failedPayments: [
          {
            amount: 175,
            interest: 12.09,
            paymentDate: '2024-02-01',
          },
        ],
        originationFee: 55,
      })

      const newBalance = calculateModificationBalance(325, 50, failedFees)

      // 325 (current) + 50 (brokerage) + 67.09 (failed fees) = 442.09 (may have floating point precision)
      expect(newBalance).toBeCloseTo(442.09, 2)
    })

    it('should handle zero fees', () => {
      const failedFees = {
        totalFees: 0,
        totalInterest: 0,
        totalAmount: 0,
        failedPaymentCount: 0,
      }

      const newBalance = calculateModificationBalance(500, 0, failedFees)
      expect(newBalance).toBe(500)
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('validateLoanParams', () => {
    it('should return null for valid params', () => {
      const result = validateLoanParams(baseLoanParams)
      expect(result).toBeNull()
    })

    it('should return error for negative principal', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        principalAmount: -100,
      })
      expect(result).toBe('Principal amount must be greater than 0')
    })

    it('should return error for zero principal', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        principalAmount: 0,
      })
      expect(result).toBe('Principal amount must be greater than 0')
    })

    it('should return error for negative interest rate', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        interestRate: -5,
      })
      expect(result).toBe('Interest rate cannot be negative')
    })

    it('should return error for zero payments', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        numberOfPayments: 0,
      })
      expect(result).toBe('Number of payments must be greater than 0')
    })

    it('should return error for invalid payment frequency', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        paymentFrequency: 'invalid' as PaymentFrequency,
      })
      expect(result).toBe('Invalid payment frequency')
    })

    it('should return error for negative brokerage fee', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        brokerageFee: -10,
      })
      expect(result).toBe('Brokerage fee cannot be negative')
    })

    it('should return error for negative origination fee', () => {
      const result = validateLoanParams({
        ...baseLoanParams,
        originationFee: -10,
      })
      expect(result).toBe('Origination fee cannot be negative')
    })
  })

  describe('validatePaymentAmount', () => {
    it('should return null for valid payment', () => {
      const result = validatePaymentAmount(175, 500)
      expect(result).toBeNull()
    })

    it('should return error for zero payment', () => {
      const result = validatePaymentAmount(0, 500)
      expect(result).toBe('Payment amount must be greater than 0')
    })

    it('should return error for negative payment', () => {
      const result = validatePaymentAmount(-10, 500)
      expect(result).toBe('Payment amount must be greater than 0')
    })

    it('should return error when payment exceeds balance', () => {
      const result = validatePaymentAmount(600, 500)
      expect(result).toContain('cannot exceed remaining balance')
      expect(result).toContain('$600.00')
      expect(result).toContain('$500.00')
    })

    it('should allow payment equal to balance', () => {
      const result = validatePaymentAmount(500, 500)
      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Utility Function Tests
  // ============================================================================

  describe('getNumberOfPayments', () => {
    it('should return correct number for weekly', () => {
      expect(getNumberOfPayments('weekly')).toBe(12)
    })

    it('should return correct number for bi-weekly', () => {
      expect(getNumberOfPayments('bi-weekly')).toBe(6)
    })

    it('should return correct number for twice-monthly', () => {
      expect(getNumberOfPayments('twice-monthly')).toBe(6)
    })

    it('should return correct number for monthly', () => {
      expect(getNumberOfPayments('monthly')).toBe(3)
    })
  })

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      const formatted = formatCurrency(1234.56)
      expect(formatted).toContain('1,234.56')
      expect(formatted).toContain('$')
    })

    it('should handle zero', () => {
      const formatted = formatCurrency(0)
      expect(formatted).toContain('0.00')
    })

    it('should handle negative amounts', () => {
      const formatted = formatCurrency(-100)
      expect(formatted).toContain('-')
    })
  })

  describe('calculateBrokerageFee', () => {
    it('should calculate brokerage fee as 68% of loan amount', () => {
      expect(calculateBrokerageFee(500)).toBe(340) // 500 * 0.68
      expect(calculateBrokerageFee(1000)).toBe(680) // 1000 * 0.68
      expect(calculateBrokerageFee(250)).toBe(170) // 250 * 0.68
    })

    it('should handle decimal loan amounts', () => {
      expect(calculateBrokerageFee(500.50)).toBeCloseTo(340.34, 2) // 500.50 * 0.68
      expect(calculateBrokerageFee(100.25)).toBeCloseTo(68.17, 2) // 100.25 * 0.68
    })

    it('should return 0 for invalid inputs', () => {
      expect(calculateBrokerageFee(0)).toBe(0)
      expect(calculateBrokerageFee(-100)).toBe(0)
      expect(calculateBrokerageFee(NaN)).toBe(0)
      expect(calculateBrokerageFee(Infinity)).toBe(0)
      expect(calculateBrokerageFee(-Infinity)).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(calculateBrokerageFee(1)).toBeCloseTo(0.68, 2)
      expect(calculateBrokerageFee(1000000)).toBe(680000)
    })
  })

  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(123.456)).toBe(123.46)
      expect(roundCurrency(123.454)).toBe(123.45)
    })

    it('should handle integers', () => {
      expect(roundCurrency(100)).toBe(100)
    })

    it('should handle zero', () => {
      expect(roundCurrency(0)).toBe(0)
    })
  })

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very small loan amounts', () => {
      const payment = calculatePaymentAmount({
        principalAmount: 1,
        interestRate: 29,
        paymentFrequency: 'monthly',
        numberOfPayments: 1,
      })
      expect(payment).toBeGreaterThan(0)
      expect(payment).toBeLessThanOrEqual(1.1)
    })

    it('should handle very large loan amounts', () => {
      const payment = calculatePaymentAmount({
        principalAmount: 100000,
        interestRate: 29,
        paymentFrequency: 'monthly',
        numberOfPayments: 3,
      })
      expect(payment).toBeGreaterThan(30000)
    })

    it('should handle very high interest rates', () => {
      const payment = calculatePaymentAmount({
        principalAmount: 500,
        interestRate: 100,
        paymentFrequency: 'monthly',
        numberOfPayments: 3,
      })
      expect(payment).toBeGreaterThan(175)
    })

    it('should handle single payment loan', () => {
      const loan = calculateLoan(
        {
          principalAmount: 500,
          interestRate: 29,
          paymentFrequency: 'monthly',
          numberOfPayments: 1,
        },
        '2024-02-01'
      )

      expect(loan?.paymentSchedule).toHaveLength(1)
      expect(loan?.paymentSchedule[0].remainingBalance).toBe(0)
    })
  })

  describe('Integration Tests', () => {
    it('should maintain consistency across all calculations', () => {
      const loan = calculateLoan(loanWithFees, '2024-02-01')

      if (!loan) {
        fail('Loan calculation failed')
        return
      }

      // Verify payment schedule sums match
      const scheduleTotal = loan.paymentSchedule.reduce(
        (sum, p) => sum + p.amount,
        0
      )
      expect(scheduleTotal).toBeCloseTo(
        loan.totalLoanAmount + loan.totalInterest,
        1
      )

      // Verify last payment brings balance to zero
      const lastPayment = loan.paymentSchedule[loan.paymentSchedule.length - 1]
      expect(lastPayment.remainingBalance).toBe(0)

      // Verify interest + principal = payment amount for each payment
      loan.paymentSchedule.forEach((payment) => {
        const sum = payment.interest + payment.principal
        expect(sum).toBeCloseTo(payment.amount, 1)
      })
    })

    it('should correctly calculate loan modification scenario', () => {
      // Initial loan
      const initialLoan = calculateLoan(baseLoanParams, '2024-02-01')
      if (!initialLoan) {
        fail('Initial loan calculation failed')
        return
      }

      // First payment made
      const afterFirstPayment = calculateNewBalance({
        currentBalance: initialLoan.totalLoanAmount,
        paymentAmount: initialLoan.paymentSchedule[0].amount,
      })

      // Second payment failed
      const failedFees = calculateFailedPaymentFees({
        failedPayments: [
          {
            amount: initialLoan.paymentSchedule[1].amount,
            interest: initialLoan.paymentSchedule[1].interest,
            paymentDate: initialLoan.paymentSchedule[1].dueDate,
          },
        ],
        originationFee: 55,
      })

      // Calculate modification balance
      const modificationBalance = calculateModificationBalance(
        afterFirstPayment.newBalance,
        50, // brokerage fee
        failedFees
      )

      // New loan with modification (use modificationBalance as principal)
      const modifiedLoan = calculateLoan(
        {
          principalAmount: modificationBalance,
          interestRate: 29,
          paymentFrequency: 'monthly',
          numberOfPayments: 2,
        },
        '2024-04-01'
      )

      expect(modificationBalance).toBeGreaterThan(afterFirstPayment.newBalance)
      expect(modifiedLoan).toBeDefined()
      expect(modifiedLoan?.totalLoanAmount).toBe(modificationBalance)
    })
  })
})

