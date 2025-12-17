/**
 * Contract HTML Generation Utility
 *
 * Extracted from ContractViewer to be used for PDF generation
 */

import type { LoanContract } from '@/src/lib/supabase/types'
import type { ContractTerms } from '@/src/lib/supabase/types'
import path from 'path'
import fs from 'fs/promises'

/**
 * Load signature image from multiple sources (in order of priority):
 * 1. Environment variable SIGNATURE_IMAGE_BASE64 (best for serverless)
 * 2. Supabase Storage bucket 'assets' with path 'signature.png'
 * 3. Local file system 'private/signature.png' (for development)
 */
async function loadSignatureImage(): Promise<string> {
  // 1. Try environment variable first (best for serverless)
  const envSignature = process.env.SIGNATURE_IMAGE_BASE64
  if (envSignature) {
    // If it's already a data URI, return as-is
    if (envSignature.startsWith('data:')) {
      return envSignature
    }
    console.log('Used environment variable signature');
    
    // Otherwise, assume it's base64 and wrap it
    return `data:image/png;base64,${envSignature}`
  }

  // 2. Try Supabase Storage (if configured)
  const storagePath = process.env.SIGNATURE_STORAGE_PATH || 'signature.png'
  const storageBucket = process.env.SIGNATURE_STORAGE_BUCKET || 'assets'
  
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(storagePath)
      
      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        return `data:image/png;base64,${base64}`
      }
    } catch (error) {
      console.warn('Failed to load signature from Supabase Storage:', error)
    }
  }

  // 3. Try local file system (for development)
  try {
    const file = path.join(process.cwd(), 'private', 'signature.png')
    const fileData = await fs.readFile(file)
    return `data:image/png;base64,${fileData.toString('base64')}`
  } catch (error) {
    console.warn('Failed to load signature from local file system:', error)
  }

  // Return empty if all sources fail
  console.error('Signature image could not be loaded from any source')
  return 'data:image/png;base64,'
}

async function imageFileToBase64(filePath: string): Promise<string> {
  try {
    const file = path.join(process.cwd(), filePath)
    const fileData = await fs.readFile(file)
    return `data:image/png;base64,${fileData.toString('base64')}`
  } catch (error) {
    console.error(`Error loading image file ${filePath}:`, error)
    // Return empty data URI as fallback
    return 'data:image/png;base64,'
  }
}

export async function createContractHTML(
  contractData: LoanContract
): Promise<string> {
  const terms = (contractData.contract_terms || {}) as ContractTerms &
    Record<string, any>

  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return ''
    }
    return `${amount.toFixed(2)}$`
  }

  const formatDate = (value?: string | null) => {
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

  const parseJson = (value?: string | null) => {
    if (!value) {
      return {}
    }

    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const flashLoanLogo = await imageFileToBase64(
    'public/images/FlashLoanLogo.png'
  )
  let signatureImage = await loadSignatureImage()
  // If signature image failed to load, use empty string to hide the image
  if (!signatureImage || signatureImage === 'data:image/png;base64,') {
    signatureImage = ''
  }
  // Borrower basics from terms only
  const borrowerFirst = terms.first_name ?? ''
  const borrowerLast = terms.last_name ?? ''
  const borrowerPhone = terms.phone ?? ''
  const borrowerEmail = terms.email ?? ''
  const streetNumber = terms.street_number ?? ''
  const streetName = terms.street_name ?? ''
  const apartmentNumber = terms.apartment_number ?? ''
  const city = terms.city ?? ''
  const province = terms.province ?? ''
  const postal = terms.postal_code ?? ''

  const streetLineComputed = [streetNumber, streetName]
    .filter(Boolean)
    .join(' ')

  // Basic dates and schedule
  const dateCreated =
    formatDate(contractData.created_at) || formatDate(new Date().toISOString())
  const schedule = Array.isArray(terms.payment_schedule)
    ? terms.payment_schedule
    : []
  const numberOfPayments = terms.number_of_payments ?? schedule.length ?? 0
  const principalAmount =
    typeof terms.principal_amount === 'number' ? terms.principal_amount : 0
  const totalAmount =
    typeof terms.total_amount === 'number'
      ? terms.total_amount
      : principalAmount
  const interestRate =
    typeof terms.interest_rate === 'number' ? terms.interest_rate : 0
  const paymentAmount = contractData.contract_terms.payment_amount
  const firstPaymentDue = schedule[0]?.due_date ?? terms.effective_date ?? null
  const lastPaymentDue =
    schedule[schedule.length - 1]?.due_date ?? terms.maturity_date ?? null

  // Fees
  const returnedPaymentFee = terms.fees?.origination_fee ?? 55
  const debitFee = terms.fees?.processing_fee ?? 0
  const postponeFee = terms.fees?.other_fees ?? 35

  // Contract meta
  const loanNumber = String(
    contractData.loan?.loan_number ??
      contractData.loan_application_id ??
      contractData.id
  )
  const signatureDateClient = formatDate(contractData.client_signed_at)
  const signatureDateStaff = formatDate(contractData.staff_signed_at)
  const signatureName = contractData.client_signature_data?.signature_name || ''
  const personalService = true
  const businessService = false
  const payeeName = 'Zūm Rails Inc'

  const borrowerFullName =
    [borrowerFirst, borrowerLast].filter(Boolean).join(' ').trim() || 'N/A'

  // Banking info (BankAccount doesn't have address fields)
  const bankingAddress = ''
  const bankingCity = ''
  const bankingProvince = ''
  const bankingPostal = ''

  const withFallback = (value: string | null | undefined, fallback = 'N/A') => {
    if (value === null || value === undefined) {
      return fallback
    }
    const stringValue = String(value).trim()
    return stringValue.length > 0 ? stringValue : fallback
  }

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
  }

  return `
<!DOCTYPE html>
<html>
  <head>
  <meta charset="UTF-8">
  <title>Loan Contract - ${contractData.id.slice(0, 8)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', serif;
      color: #222;
      margin: 0;
      background: #fff;
    }
    .document {
      max-width: 820px;
      margin: 0 auto;
      padding: 20px 30px;
    }
    .page {
      padding: 28px 26px 60px;
      position: relative;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-image {
      width: 72px;
      height: auto;
      object-fit: contain;
    }
    .header-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .company-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.12em;
      margin: 0;
      text-transform: uppercase;
    }
    .title-block {
      text-align: center;
    }
    .title-block h1 {
      font-size: 24px;
      margin: 0 0 18px;
      text-transform: uppercase;
    }
    .title-block h2 {
      font-size: 20px;
      text-transform: uppercase;
    }
    .divider {
      border: none;
      border-top: 1px solid #444;
    }
    h3 {
      font-size: 17px;
      margin: 24px 0 12px;
      text-transform: uppercase;
    }
    p {
      margin: 5px 0;
      font-size: 11px;
      line-height: 1.5;
      text-align: left;

    }
    ul {
      margin: 8px 0 16px 18px;
      padding: 0;
    }
    ul li {
      margin: 4px 0;
      line-height: 1.5;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
    }
    .info-table td {
      padding: 5px 4px;
      vertical-align: top;
      font-size: 14px;
    }
    .section-label {
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 26px;
    }
    .signature-block {
      margin-top: 45px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    .signature-line {
      flex: 1;
      text-align: center;
    }
    .signature-line .line {
      display: block;
      margin: 10px 0 10px;
      border-top: 1px solid #000;
      height: 0;
    }
    .signature-name {
      font-family: 'Dancing Script', cursive;
      font-size: 24px;
      font-weight: 600;
      color: #000;
      margin: 8px 0;
      min-height: 30px;
    }
    .footer-note {
      position: absolute;
      bottom: 30px;
      left: 26px;
      right: 26px;
      font-size: 11px;
      color: #555;
    }
    .emphasis {
      font-weight: bold;
      text-transform: uppercase;
    }
    .checkbox-line {
      margin: 6px 0;
    }
    @media print {
      body {
        margin: 0;
      }
      @page {
        size: A4;
        margin: 15mm 17mm 18mm;
      }
      .document {
        padding: 0;
      }
      .page {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="page">
      <div class="header">
        <img src="${flashLoanLogo}" alt="Flash-Loan Logo" class="logo-image" />
      </div>
      <div class="title-block">
        <h1>Flash-Loan</h1>
        <hr class="divider" />
        <h2>Invoice</h2>
        <p><strong>Date :</strong> ${withFallback(dateCreated, '')}</p>
        <hr class="divider" />
  </div>

      <h3>Offered Services</h3>
      <ul>
        <li>&#9670; Personal loan broker</li>
        <li>&#9670; Second chance loan broker</li>
        <li>&#9670; No credit check</li>
      </ul>

      <p><strong>To:</strong> ${withFallback(borrowerFullName)}</p>
      <p><strong>For the account of:</strong></p>
      <p>Flash-Loan</p>

      <h3>Discussion with the client</h3>
      <ul>
        <li>Personal and banking information</li>
        <li>File analysis</li>
        <li>Search of available loan</li>
        <li>Reception of document</li>
        <li>Verification and analysis of documents</li>
        <li>Acceptance and confirmation of the loan</li>
    </ul>

      <p><strong>Total expenses:</strong> ${withFallback(formatCurrency(totalAmount), '_____')} tx included</p>

      <p>
        The amount will be included in your payment described in the second page of the present document.
        If the loan is refused by the institution, this invoice will not be valid. I authorize the institution which accords
        the loan to settle directly the expenses of this statement at Flash-Loan on the loan obtained by this company.
      </p>

      <div class="signature-block">
        <div class="signature-line">
          ${signatureName ? `<div class="signature-name">${escapeHtml(signatureName)}</div>` : '<span class="line"></span>'}
          <div>Client Signature</div>
          ${signatureDateClient ? `<div>Signed on ${signatureDateClient}</div>` : ''}
        </div>
    <div class="signature-line">
          ${signatureImage ? `<img src="${signatureImage}" alt="Signature" class="signature-image" />` : '<span class="line"></span>'}
          <div>Representative Signature</div>
          ${signatureDateStaff ? `<div>Signed on ${signatureDateStaff}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="page">
      <div class="header">
        <img src="${flashLoanLogo}" alt="Flash-Loan Logo" class="logo-image" />
        <div class="header-text">
          <p class="company-name">Flash Loan</p>
        </div>
      </div>

      <h3>Loan number : ${withFallback(loanNumber)}</h3>
      <p class="emphasis">Pre Authorized Debit Form</p>

      <p class="emphasis">Client Information</p>
      <p>Surname: ${withFallback(borrowerLast)}</p>
      <p>Name: ${withFallback(borrowerFullName)}</p>
      <p>Address: ${withFallback([terms.street_number, terms.street_name].filter(Boolean).join(' '))}</p>
      ${terms.apartment_number ? `<p>Apt ${terms.apartment_number}</p>` : ''}
      <p>City: ${withFallback(terms.city ?? '')}</p>
      <p>Province: ${withFallback(terms.province ?? '')}</p>
      <p>Postal code: ${withFallback(terms.postal_code ?? '')}</p>
      <p>Telephone: ${withFallback(borrowerPhone)}</p>
      <p>Cellular: ${withFallback(terms.phone ?? borrowerPhone)}</p>
      <p class="checkbox-line">Type of service: Personal ${personalService ? '☑' : '☐'} &nbsp;&nbsp;&nbsp; Business ${businessService ? '☑' : '☐'}</p>

      <p class="emphasis">Banking Information</p>
     
      <p>Address: ${withFallback(bankingAddress)}</p>
      <p>City: ${withFallback(bankingCity)}</p>
      <p>Province: ${withFallback(bankingProvince)}</p>
      <p>Postal code: ${withFallback(bankingPostal)}</p>
      <p>Bank name: ${contractData.bank_account?.bank_name || ''}</p>
      <p>Bank number: ${contractData.bank_account?.institution_number || ''}</p>
      <p>Transit number: ${contractData.bank_account?.transit_number || ''}</p>
      <p>Account number: ${contractData.bank_account?.account_number || ''}</p>
      <p>Account name: ${contractData.bank_account?.account_name || ''}</p>

      <p class="emphasis">Details of the Preauthorize</p>
      <p>
        I, <strong>${withFallback(borrowerFullName)}</strong>, authorize Flash-Loan to debit the banking account mentioned above,
        for the payment of ${withFallback(formatCurrency(paymentAmount))} × (${withFallback(String(numberOfPayments || ''), '___')} times).
      </p>

      <p>Name in molded letters&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Signature</p>

      <p>
        ${payeeName} has been contracted by Flash-Loan (Entity providing the Payor Goods and Services). You, the Payor, authorize
        ${payeeName} to debit the bank account identified on this form.
      </p>

      <p>
        You have certain recourse rights if any debit does not comply with this agreement. For example, you have the right to receive
        reimbursement for any debit that is not authorized or is not consistent with this PAD Agreement. To obtain more information on
        your recourse rights, you may contact your financial institution or visit www.payments.ca.
      </p>
    </div>

    <div class="page">
      <div class="header">
        <img src="${flashLoanLogo}" alt="Flash-Loan Logo" class="logo-image" />
        <div class="header-text">
          <p class="company-name">Flash Loan</p>
        </div>
      </div>

      <p><strong>Date :</strong> ${withFallback(dateCreated, '')}</p>

      <h3>Loan Agreement</h3>
      <p>Flash-Loan (hereinafter called the "Creditor")</p>
      <p>And ${withFallback(borrowerFullName)}, ${withFallback(streetLineComputed)} (hereinafter called the "Debitor")</p>

      <p class="emphasis">Introduction</p>
      <p>
        Considering that the debtor desires to borrow from the creditor an amount of money and that the creditor accepts to lend this
        amount of money to the debtor; Considering that both parts accept, the conditions are mentioned hereafter.
        The parties agree as follows:
      </p>

      <p class="emphasis">Object</p>
      <p>
        The creditor loans the debtor, who acknowledges this reception, the amount in capital of (${withFallback(formatCurrency(principalAmount))}).
        This amount bears interest of (${withFallback(interestRate ? `${interestRate.toFixed(2)}%` : '', '_____%')}) annually starting on this contract date,
        calculated monthly until complete payment.
      </p>

      <p class="emphasis">Consideration</p>
      <p>
        The debtor refunds the amount in capital and pays the interest. The debtor agrees to make
        ${withFallback(String(numberOfPayments || ''), '___')} equal and consecutive payment(s) of the amount of ${withFallback(formatCurrency(paymentAmount))} each for the total amount of
        ${withFallback(formatCurrency(totalAmount))}. The first payment will be due on ${withFallback(formatDate(firstPaymentDue), '_____/_____/_____')} and the last payment will be due on
        ${withFallback(formatDate(lastPaymentDue), '_____/_____/_____')}.
      </p>
    </div>

    <div class="page">
      <div class="header">
        <img src="${flashLoanLogo}" alt="Flash-Loan Logo" class="logo-image" />
        <div class="header-text">
          <p class="company-name">Flash Loan</p>
        </div>
      </div>

      <p class="emphasis">Particular Disposition</p>
      <p>The debtor can by anticipation, in totality or in parts, pay the amount of its obligation in any time before term, without notice or compensation.</p>
      <p>Every payment made by the debtor is first allocated by the lender to the payment of interest and incurred expenses and all sold is used to reduce the amount due in capital.</p>
      <p>If the debtor defaults on one or any planned payments to the present contract, the creditor can demand from the debtor the complete payment of every unpaid capital, interest and expenses.</p>
      <p>All the judicial and extrajudicial costs which will reasonably be hired during defaults to the present contract will be demanded to the debtor for any check or preauthorized payment returned to the creditor.</p>
      <p>There are fees of (${withFallback(formatCurrency(returnedPaymentFee))}) payable by the debtor for preauthorized payments returned to the creditor.</p>
      <p>The debit fees are of (${withFallback(formatCurrency(debitFee))}) for every payment. A (${withFallback(formatCurrency(postponeFee))}) fee will be invoiced to postpone a payment.</p>

      <p class="emphasis">Authorisation</p>
      <p>The debtor authorizes the creditor to make withdrawals in their bank account for payments and expenses connected with this contract.</p>
      <p>
        The debtor expressly authorizes the creditor to obtain with every person (including one or several employers, every organism, every agency of information on the credit unity and any financial institution)
        the information necessary for the approval of this contract.
      </p>

      <p class="emphasis">Contract Effective</p>
      <p>
        This Agreement is effective ${withFallback(formatDate(firstPaymentDue), '_____/_____/_____')} and will terminate upon full payment of the Principal Amount,
        interest and expenses.
      </p>

      <div class="signature-block">
        <div class="signature-line">
          ${signatureName ? `<div class="signature-name">${escapeHtml(signatureName)}</div>` : '<span class="line"></span>'}
          <div>Debtor signature</div>
          ${signatureDateClient ? `<div>Signed on ${signatureDateClient}</div>` : ''}
        </div>
        <div class="signature-line">
          ${signatureImage ? `<img src="${signatureImage}" alt="Signature" class="signature-image" />` : '<span class="line"></span>'}
          <div>Creditor signature</div>
          ${signatureDateStaff ? `<div>Signed on ${signatureDateStaff}</div>` : ''}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `
}
