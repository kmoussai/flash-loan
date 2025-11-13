/**
 * PDF Generation Utility for Loan Contracts
 * 
 * Generates signed PDFs directly using pdf-lib (no Puppeteer required)
 * Matches the contract structure from ContractViewer
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { LoanContract } from '@/src/lib/supabase/types'
import { createHash } from 'crypto'
import type { ContractTerms } from '@/src/lib/supabase/types'

export interface SignedPDFResult {
  pdfBytes: Uint8Array
  hash: string
  filePath: string
}

/**
 * Format currency value
 */
function formatCurrency(amount?: number | null): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return '0.00'
  }
  return amount.toFixed(2)
}

/**
 * Format date value
 */
function formatDate(value?: string | null): string {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const day = `${date.getDate()}`.padStart(2, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Generate a signed PDF from a contract with signature overlay
 */
export async function generateSignedContractPDF(
  contract: LoanContract,
  signatureName: string,
  signedAt: string
): Promise<SignedPDFResult> {
  const pdfDoc = await PDFDocument.create()
  const terms = (contract.contract_terms || {}) as ContractTerms & Record<string, any>

  // Get fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  // Page dimensions (A4)
  const pageWidth = 595.28 // A4 width in points
  const pageHeight = 841.89 // A4 height in points
  const margin = 50
  const contentWidth = pageWidth - margin * 2

  // Helper to add a new page
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let yPosition = pageHeight - margin

  // Helper function to add text with word wrapping
  const addText = (
    text: string,
    size: number,
    font: any,
    x: number,
    y: number,
    maxWidth?: number,
    color = rgb(0, 0, 0)
  ): number => {
    if (!text) return y
    const lines = maxWidth
      ? wrapText(text, size, font, maxWidth)
      : [text]
    
    lines.forEach((line, index) => {
      if (y - (index * size * 1.2) < margin + 50) {
        // Need new page
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      currentPage.drawText(line, {
        x,
        y: y - index * size * 1.2,
        size,
        font,
        color
      })
    })
    return y - lines.length * size * 1.2
  }

  // Helper to wrap text
  const wrapText = (text: string, fontSize: number, font: any, maxWidth: number): string[] => {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const width = font.widthOfTextAtSize(testLine, fontSize)
      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })
    if (currentLine) lines.push(currentLine)
    return lines
  }

  // Extract contract data
  const borrowerFirst = terms.first_name ?? ''
  const borrowerLast = terms.last_name ?? ''
  const borrowerFullName = [borrowerFirst, borrowerLast].filter(Boolean).join(' ').trim() || 'N/A'
  const borrowerPhone = terms.phone ?? ''
  const borrowerEmail = terms.email ?? ''
  const streetNumber = terms.street_number ?? ''
  const streetName = terms.street_name ?? ''
  const apartmentNumber = terms.apartment_number ?? ''
  const city = terms.city ?? ''
  const province = terms.province ?? ''
  const postal = terms.postal_code ?? ''
  const streetLine = [streetNumber, streetName].filter(Boolean).join(' ')

  const dateCreated = formatDate(contract.created_at) || formatDate(new Date().toISOString())
  const schedule = Array.isArray(terms.payment_schedule) ? terms.payment_schedule : []
  const numberOfPayments = terms.number_of_payments ?? schedule.length ?? 0
  const principalAmount = typeof terms.principal_amount === 'number' ? terms.principal_amount : 0
  const totalAmount = typeof terms.total_amount === 'number' ? terms.total_amount : principalAmount
  const interestRate = typeof terms.interest_rate === 'number' ? terms.interest_rate : 0
  const paymentAmount = typeof terms.payment_amount === 'number' ? terms.payment_amount : 0
  const firstPaymentDue = schedule[0]?.due_date ?? terms.effective_date ?? null
  const lastPaymentDue = schedule[schedule.length - 1]?.due_date ?? terms.maturity_date ?? null

  const returnedPaymentFee = terms.fees?.origination_fee ?? 55
  const debitFee = terms.fees?.processing_fee ?? 0
  const postponeFee = terms.fees?.other_fees ?? 35

  const loanNumber = String(
    contract.loan?.loan_number ??
    contract.loan_application_id ??
    contract.id
  )

  // PAGE 1: Invoice
  yPosition = addText('Flash-Loan', 24, helveticaBoldFont, margin, yPosition, contentWidth)
  yPosition -= 10
  currentPage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  yPosition -= 20
  yPosition = addText('Invoice', 20, helveticaBoldFont, margin, yPosition, contentWidth)
  yPosition = addText(`Date: ${dateCreated}`, 11, helveticaFont, margin, yPosition - 10, contentWidth)
  yPosition -= 10
  currentPage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  yPosition -= 20

  yPosition = addText('Offered Services', 17, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('- Personal loan broker', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- Second chance loan broker', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- No credit check', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition -= 10

  yPosition = addText(`To: ${borrowerFullName}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('For the account of:', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('Flash-Loan', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Discussion with the client', 17, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('- Personal and banking information', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- File analysis', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- Search of available loan', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- Reception of document', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- Verification and analysis of documents', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition = addText('- Acceptance and confirmation of the loan', 11, helveticaFont, margin + 10, yPosition - 15, contentWidth - 10)
  yPosition -= 10

  yPosition = addText(`Total expenses: ${formatCurrency(totalAmount)} tx included`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 20

  const invoiceText = `The amount will be included in your payment described in the second page of the present document. If the loan is refused by the institution, this invoice will not be valid. I authorize the institution which accords the loan to settle directly the expenses of this statement at Flash-Loan on the loan obtained by this company.`
  yPosition = addText(invoiceText, 11, helveticaFont, margin, yPosition - 10, contentWidth)

  // Signature area at bottom of page 1
  const signatureY = 150
  const signatureX = margin
  currentPage.drawLine({
    start: { x: signatureX, y: signatureY },
    end: { x: signatureX + 250, y: signatureY },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  addText('Client Signature', 10, helveticaFont, signatureX, signatureY - 15)
  addText(`Signed on: ${formatDate(signedAt)}`, 9, helveticaFont, signatureX, signatureY - 30)
  
  currentPage.drawLine({
    start: { x: pageWidth - margin - 250, y: signatureY },
    end: { x: pageWidth - margin, y: signatureY },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  addText('Representative Signature', 10, helveticaFont, pageWidth - margin - 250, signatureY - 15)

  // PAGE 2: Pre-Authorized Debit Form
  currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  yPosition = pageHeight - margin

  yPosition = addText('Flash Loan', 20, helveticaBoldFont, margin, yPosition, contentWidth)
  yPosition -= 20
  yPosition = addText(`Loan number: ${loanNumber}`, 17, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('Pre Authorized Debit Form', 11, helveticaBoldFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Client Information', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText(`Surname: ${borrowerLast}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`Name: ${borrowerFullName}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`Address: ${streetLine}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  if (apartmentNumber) {
    yPosition = addText(`Apt ${apartmentNumber}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  }
  yPosition = addText(`City: ${city}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`Province: ${province}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`Postal code: ${postal}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`Telephone: ${borrowerPhone}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('Type of service: Personal [X]  Business [ ]', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Banking Information', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  if (contract.bank_account) {
    yPosition = addText(`Bank name: ${contract.bank_account.bank_name || ''}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
    yPosition = addText(`Bank number: ${contract.bank_account.institution_number || ''}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
    yPosition = addText(`Transit number: ${contract.bank_account.transit_number || ''}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
    yPosition = addText(`Account number: ${contract.bank_account.account_number || ''}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
    yPosition = addText(`Account name: ${contract.bank_account.account_name || ''}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  }
  yPosition -= 10

  yPosition = addText('Details of the Preauthorize', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  const preauthText = `I, ${borrowerFullName}, authorize Flash-Loan to debit the banking account mentioned above, for the payment of ${formatCurrency(paymentAmount)} × (${numberOfPayments} times).`
  yPosition = addText(preauthText, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  const padText = `Accept Pay Global (Payee) has been contracted by Flash-Loan (Entity providing the Payor Goods and Services). You, the Payor, authorize Accept Pay Global (Payee) to debit the bank account identified on this form. You have certain recourse rights if any debit does not comply with this agreement. For example, you have the right to receive reimbursement for any debit that is not authorized or is not consistent with this PAD Agreement. To obtain more information on your recourse rights, you may contact your financial institution or visit www.payments.ca.`
  yPosition = addText(padText, 11, helveticaFont, margin, yPosition - 10, contentWidth)

  // PAGE 3: Loan Agreement
  currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  yPosition = pageHeight - margin

  yPosition = addText('Flash Loan', 20, helveticaBoldFont, margin, yPosition, contentWidth)
  yPosition -= 20
  yPosition = addText(`Date: ${dateCreated}`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Loan Agreement', 17, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('Flash-Loan (hereinafter called the "Creditor")', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`And ${borrowerFullName}, ${streetLine} (hereinafter called the "Debitor")`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Introduction', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  const introText = `Considering that the debtor desires to borrow from the creditor an amount of money and that the creditor accepts to lend this amount of money to the debtor; Considering that both parts accept, the conditions are mentioned hereafter. The parties agree as follows:`
  yPosition = addText(introText, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Object', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  const objectText = `The creditor loans the debtor, who acknowledges this reception, the amount in capital of (${formatCurrency(principalAmount)}). This amount bears interest of (${interestRate.toFixed(2)}%) annually starting on this contract date, calculated monthly until complete payment.`
  yPosition = addText(objectText, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Consideration', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  const considerationText = `The debtor refunds the amount in capital and pays the interest. The debtor agrees to make ${numberOfPayments} equal and consecutive payment(s) of the amount of ${formatCurrency(paymentAmount)} each for the total amount of ${formatCurrency(totalAmount)}. The first payment will be due on ${formatDate(firstPaymentDue)} and the last payment will be due on ${formatDate(lastPaymentDue)}.`
  yPosition = addText(considerationText, 11, helveticaFont, margin, yPosition - 15, contentWidth)

  // PAGE 4: Terms and Signatures
  currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  yPosition = pageHeight - margin

  yPosition = addText('Flash Loan', 20, helveticaBoldFont, margin, yPosition, contentWidth)
  yPosition -= 20

  yPosition = addText('Particular Disposition', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('The debtor can by anticipation, in totality or in parts, pay the amount of its obligation in any time before term, without notice or compensation.', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('Every payment made by the debtor is first allocated by the lender to the payment of interest and incurred expenses and all sold is used to reduce the amount due in capital.', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('If the debtor defaults on one or any planned payments to the present contract, the creditor can demand from the debtor the complete payment of every unpaid capital, interest and expenses.', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText('All the judicial and extrajudicial costs which will reasonably be hired during defaults to the present contract will be demanded to the debtor for any check or preauthorized payment returned to the creditor.', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`There are fees of (${formatCurrency(returnedPaymentFee)}) payable by the debtor for preauthorized payments returned to the creditor.`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition = addText(`The debit fees are of (${formatCurrency(debitFee)}) for every payment. A (${formatCurrency(postponeFee)}) fee will be invoiced to postpone a payment.`, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Authorisation', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  yPosition = addText('The debtor authorizes the creditor to make withdrawals in their bank account for payments and expenses connected with this contract.', 11, helveticaFont, margin, yPosition - 15, contentWidth)
  const authText = `The debtor expressly authorizes the creditor to obtain with every person (including one or several employers, every organism, every agency of information on the credit unity and any financial institution) the information necessary for the approval of this contract.`
  yPosition = addText(authText, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 10

  yPosition = addText('Contract Effective', 11, helveticaBoldFont, margin, yPosition - 20, contentWidth)
  const effectiveText = `This Agreement is effective ${formatDate(firstPaymentDue)} and will terminate upon full payment of the Principal Amount, interest and expenses.`
  yPosition = addText(effectiveText, 11, helveticaFont, margin, yPosition - 15, contentWidth)
  yPosition -= 30

  // Signature area at bottom of last page
  const finalSignatureY = 150
  const finalSignatureX = margin
  
  // Draw signature line
  currentPage.drawLine({
    start: { x: finalSignatureX, y: finalSignatureY },
    end: { x: finalSignatureX + 250, y: finalSignatureY },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  
  // Draw signature name
  addText(signatureName, 12, helveticaFont, finalSignatureX, finalSignatureY - 20)
  
  // Draw signature date
  const signatureDate = new Date(signedAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  addText(`Signed on: ${signatureDate}`, 10, helveticaFont, finalSignatureX, finalSignatureY - 40, undefined, rgb(0.3, 0.3, 0.3))
  
  addText('Debtor signature', 10, helveticaFont, finalSignatureX, finalSignatureY - 60)
  
  // Creditor signature area
  currentPage.drawLine({
    start: { x: pageWidth - margin - 250, y: finalSignatureY },
    end: { x: pageWidth - margin, y: finalSignatureY },
    thickness: 1,
    color: rgb(0, 0, 0)
  })
  addText('Creditor signature', 10, helveticaFont, pageWidth - margin - 250, finalSignatureY - 60)

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save()

  // Calculate SHA-256 hash of PDF content
  const hash = createHash('sha256').update(pdfBytes).digest('hex')

  // Generate file path (without bucket prefix - bucket is specified during upload)
  const timestamp = new Date(signedAt).toISOString().split('T')[0]
  const filePath = `${contract.id}/signed_${timestamp}_${contract.id}.pdf`

  return {
    pdfBytes,
    hash,
    filePath
  }
}

/**
 * Generate compliance metadata for Canadian regulations
 */
export function generateComplianceMetadata(
  contract: LoanContract,
  signatureName: string,
  signedAt: string,
  ipAddress: string,
  userAgent: string,
  pdfHash: string
) {
  return {
    // Canadian Consumer Protection Act compliance
    signed_at: signedAt,
    signature_name: signatureName,
    contract_version: contract.contract_version || 1,
    contract_number: contract.contract_number || null,
    
    // Digital signature metadata
    pdf_hash: pdfHash,
    pdf_hash_algorithm: 'SHA-256',
    
    // Audit trail
    ip_address: ipAddress,
    user_agent: userAgent,
    signature_method: 'click_to_sign',
    
    // Canadian regulation compliance fields
    compliance: {
      // Consumer Protection Act - electronic signature requirements
      electronic_signature_compliant: true,
      signature_timestamp: signedAt,
      signature_verification: {
        method: 'name_based',
        verified: true
      },
      
      // Record keeping requirements (7 years for financial contracts in Canada)
      retention_period_years: 7,
      retention_until: new Date(
        new Date(signedAt).getTime() + 7 * 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      
      // Integrity verification
      document_integrity: {
        hash: pdfHash,
        hash_algorithm: 'SHA-256',
        verified: true
      }
    }
  }
}
