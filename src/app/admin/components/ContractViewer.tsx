'use client'

import { useState, useEffect } from 'react'
import type { LoanContract, ContractTerms } from '@/src/lib/supabase/types'
// import { getLogoDataURI } from '@/src/lib/contracts/html-to-pdf'

async function imageToBase64(path: string): Promise<string> {
  const res = await fetch(path)
  const blob = await res.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

interface ContractViewerProps {
  contract: LoanContract | null
  applicationId: string
  onClose: () => void
  onGenerate?: () => void
  onSend?: () => void
  onDelete?: () => void
  embedded?: boolean // When true, renders without modal wrapper
}

export default function ContractViewer({
  contract,
  applicationId,
  onClose,
  onGenerate,
  onSend,
  onDelete,
  embedded = false
}: ContractViewerProps) {
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(true)
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null)

  // Load PDF from storage or generate HTML
  useEffect(() => {
    if (!contract) {
      setPdfUrl(null)
      setIsLoadingPdf(false)
      setPdfLoadError(null)
      return
    }

    setPdfLoadError(null)
    loadContractPDF(contract)
  }, [contract])

  const loadContractPDF = async (contractData: LoanContract) => {
    setIsLoadingPdf(true)
    try {
      // Check if contract is signed - if so, prioritize loading the signed PDF
      const isSigned = contractData.client_signed_at || contractData.contract_status === 'signed'
      
      if (isSigned && contractData.contract_document_path) {
        // Contract is signed - try to load the signed PDF from storage
        try {
          const response = await fetch(
            `/api/admin/applications/${applicationId}/contract/view`
          )
          if (response.ok) {
            const data = await response.json()
            if (data.signed_url) {
              setPdfUrl(data.signed_url)
              setIsLoadingPdf(false)
              return
            }
          }
          // If API call failed but contract is signed, log error and set error message
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse response' }))
          console.warn(
            '[ContractViewer] Contract is signed but failed to get PDF URL from API:',
            errorData
          )
          setPdfLoadError('Failed to load signed contract PDF. The contract may have been signed but the PDF is not available.')
          setIsLoadingPdf(false)
          return
        } catch (apiError) {
          console.error(
            '[ContractViewer] Failed to get PDF URL from API for signed contract:',
            apiError
          )
          // Don't fallback to HTML for signed contracts - show error instead
          setPdfLoadError('Failed to load signed contract PDF. Please try again or contact support.')
          setIsLoadingPdf(false)
          return
        }
      }

      // Fallback: Generate HTML representation only if contract is NOT signed
      // or if signed contract PDF failed to load (will show error message)
      if (!isSigned) {
        const contractHTML = await createContractHTML(contractData)
        const blob = new Blob([contractHTML], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        setIsLoadingPdf(false)
      } else {
        // Contract is signed but PDF couldn't be loaded
        setIsLoadingPdf(false)
      }
    } catch (error) {
      console.error('Error loading contract PDF:', error)
      // Only generate HTML fallback if contract is not signed
      const isSigned = contractData.client_signed_at || contractData.contract_status === 'signed'
      if (!isSigned) {
        try {
          const contractHTML = await createContractHTML(contractData)
          const blob = new Blob([contractHTML], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          setPdfUrl(url)
          setIsLoadingPdf(false)
        } catch (htmlError) {
          console.error('Error generating HTML fallback:', htmlError)
          setIsLoadingPdf(false)
        }
      } else {
        setIsLoadingPdf(false)
      }
    }
  }

  const createContractHTML = async (contractData: LoanContract) => {
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

    const flashLoanLogo = await imageToBase64('/images/FlashLoanLogo.png')
    const signatureImage = await imageToBase64('/signature.jpeg')

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
      formatDate(contractData.created_at) ||
      formatDate(new Date().toISOString())
    const schedule = Array.isArray(terms.payment_schedule)
      ? terms.payment_schedule
      : []
    const numberOfPayments = terms.number_of_payments ?? schedule.length ?? 0
    const principalAmount =
      typeof terms.principal_amount === 'number'
        ? terms.principal_amount + (terms.fees?.brokerage_fee ?? 0)
        : 0
    const totalAmount =
      typeof terms.total_amount === 'number'
        ? terms.total_amount
        : principalAmount
    const interestRate =
      typeof terms.interest_rate === 'number' ? terms.interest_rate : 0
    const paymentAmount = contractData.contract_terms.payment_amount
    const firstPaymentDue =
      schedule[0]?.due_date ?? terms.effective_date ?? null
    const lastPaymentDue =
      schedule[schedule.length - 1]?.due_date ?? terms.maturity_date ?? null

    // Fees
    const returnedPaymentFee = terms.fees?.origination_fee ?? 55
    const debitFee = terms.fees?.processing_fee ?? 0
    const postponeFee = terms.fees?.other_fees ?? 35

    // Contract meta
    const loanNumber =
      contractData.loan.loan_number ??
      contractData.loan_application_id ??
      contractData.id
    const signatureDateClient = formatDate(contractData.client_signed_at)
    const signatureDateStaff = formatDate(contractData.staff_signed_at)
    const signatureMethod = contractData.client_signature_data?.signature_method
    const signatureIp = contractData.client_signature_data?.ip_address
    const personalService = true
    const businessService = false
    const payeeName = 'Accept Pay Global (Payee)'

    const borrowerFullName =
      [terms.first_name, terms.last_name].filter(Boolean).join(' ').trim() ||
      (typeof (terms as any).borrowerName === 'string'
        ? (terms as any).borrowerName
        : '') ||
      [(terms as any).borrowerFirstName, (terms as any).borrowerLastName]
        .filter(Boolean)
        .join(' ')
        .trim()

    // Banking information from contract terms
    const bankAccount = terms.bank_account
    const bankingInstitution = bankAccount?.bank_name ?? ''
    const bankingAddress = '' // Not stored in contract terms
    const bankingCity = '' // Not stored in contract terms
    const bankingProvince = '' // Not stored in contract terms
    const bankingPostal = '' // Not stored in contract terms
    const bankingInstitutionNumber = bankAccount?.institution_number ?? ''
    const bankingTransit = bankAccount?.transit_number ?? ''
    const bankingAccountNumber = bankAccount?.account_number ?? ''
    const withFallback = (
      value: string | number | null | undefined,
      fallback = '___________________________'
    ) => {
      if (value === null || value === undefined) {
        return fallback
      }

      const stringValue = String(value).trim()
      return stringValue.length > 0 ? stringValue : fallback
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loan Contract - ${contractData.id.slice(0, 8)}</title>
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
      margin: 48px 0 10px;
      border-top: 1px solid #000;
      height: 0;
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
          <span class="line"></span>
          <div>Client Signature</div>
          ${signatureDateClient ? `<div>Signed on ${signatureDateClient}</div>` : ''}
          ${signatureMethod ? `<div>Method: ${signatureMethod}</div>` : ''}
          ${signatureIp ? `<div>IP: ${signatureIp}</div>` : ''}
        </div>
    <div class="signature-line">
          <div>
              <img src="${signatureImage}" alt="" class="" />
          </div>
          <span class="line"></span>
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
      <p>Bank number: ${contractData.bank_account?.institution_number}</p>
      <p>Transit number: ${contractData.bank_account?.transit_number}</p>
      <p>account number: ${contractData.bank_account?.account_number}</p>

      <p class="emphasis">Details of the Preauthorize</p>
      <p>
        I, <strong>${withFallback(borrowerFullName)}</strong>, authorize Flash-Loan to debit the banking account mentioned above,
        for the payment of ${withFallback(formatCurrency(paymentAmount))} × (${withFallback(numberOfPayments || '', '___')} times).
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
        ${withFallback(numberOfPayments || '', '___')} equal and consecutive payment(s) of the amount of ${withFallback(formatCurrency(paymentAmount))} each for the total amount of
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
          <span class="line"></span>
          <div>Debtor signature</div>
          ${signatureDateClient ? `<div>Signed on ${signatureDateClient}</div>` : ''}
        </div>
        <div class="signature-line">
          <div>
            <img src="${signatureImage}" alt="" class="" />
          </div>
          <span class="line"></span>
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

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    }
  }

  const content = (
    <>
      {!embedded && (
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>Loan Contract</h2>
            {contract && (
              <p className='text-sm text-gray-500'>
                Version {contract.contract_version} • {contract.contract_status}
              </p>
            )}
          </div>
          <div className='flex items-center gap-3'>
            {onSend && contract && contract.contract_status === 'generated' && (
              <button
                onClick={onSend}
                disabled={loading}
                className='rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50'
              >
                Send Contract
              </button>
            )}
            {onDelete && contract && !contract.sent_at && (
              <button
                onClick={onDelete}
                disabled={loading}
                className='rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
              >
                Delete Contract
              </button>
            )}
            {contract && (
              <button
                onClick={handlePrint}
                className='rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Print
              </button>
            )}
            {!embedded && (
              <button
                onClick={onClose}
                className='text-gray-400 hover:text-gray-600'
              >
                <svg
                  className='h-6 w-6'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div
        className={
          embedded
            ? 'h-full overflow-auto'
            : 'h-[calc(90vh-80px)] overflow-auto p-4'
        }
      >
        {!contract ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <p className='mb-4 text-gray-600'>
                No contract has been generated for this application yet.
              </p>
              {onGenerate && (
                <button
                  onClick={onGenerate}
                  className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
                >
                  Generate Contract
                </button>
              )}
            </div>
          </div>
        ) : isLoadingPdf ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent'></div>
              <p className='text-gray-600'>Loading contract...</p>
            </div>
          </div>
        ) : pdfLoadError ? (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center max-w-md px-4'>
              <div className='mb-4 text-red-400'>
                <svg
                  className='mx-auto h-12 w-12'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <p className='text-red-600 font-medium mb-2'>Error Loading PDF</p>
              <p className='text-gray-600 text-sm'>{pdfLoadError}</p>
              {contract?.contract_document_path && (
                <p className='text-gray-500 text-xs mt-2'>
                  Document path: {contract.contract_document_path}
                </p>
              )}
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className='h-full w-full rounded border'
            title='Contract PDF'
          />
        ) : (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <div className='mb-4 text-gray-400'>
                <svg
                  className='mx-auto h-12 w-12'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
              <p className='text-gray-600'>Loading contract...</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className='h-full w-full'>{content}</div>
  }

  if (!contract) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
        <div className='relative w-full max-w-4xl rounded-lg bg-white shadow-xl'>
          <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
            <h2 className='text-xl font-bold text-gray-900'>
              Contract Not Found
            </h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600'
            >
              <svg
                className='h-6 w-6'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
          <div className='p-6 text-center'>
            <p className='mb-4 text-gray-600'>
              No contract has been generated for this application yet.
            </p>
            {onGenerate && (
              <button
                onClick={onGenerate}
                className='rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              >
                Generate Contract
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='relative h-[90vh] w-full max-w-6xl rounded-lg bg-white shadow-xl'>
        {content}
      </div>
    </div>
  )
}
