'use client'

import { useState, useEffect } from 'react'
import type { LoanContract, ContractTerms } from '@/src/lib/supabase/types'

interface ContractViewerProps {
  contract: LoanContract | null
  applicationId: string
  onClose: () => void
  onGenerate?: () => void
  onSend?: () => void
}

export default function ContractViewer({
  contract,
  applicationId,
  onClose,
  onGenerate,
  onSend
}: ContractViewerProps) {
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // Generate PDF from contract data
  useEffect(() => {
    if (!contract) {
      setPdfUrl(null)
      return
    }

    // Generate PDF using browser's built-in capabilities
    // In production, you might want to use a service like PDFKit or generate on server
    generatePDF(contract)
  }, [contract])

  const generatePDF = async (contractData: LoanContract) => {
    try {
      // Create a simple HTML representation of the contract
      const contractHTML = createContractHTML(contractData)
      
      // Create a blob and URL for viewing
      // Note: This is a simplified approach. For production, use a proper PDF library
      const blob = new Blob([contractHTML], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)

      // Alternatively, if you have a PDF file stored, use:
      // setPdfUrl(contractData.contract_document_path)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const createContractHTML = (contractData: LoanContract): string => {
    const terms = contractData.contract_terms
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loan Contract - ${contractData.id.slice(0, 8)}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 {
      text-align: center;
      border-bottom: 3px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h2 {
      margin-top: 30px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    .contract-info {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .signature-section {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #333;
    }
    .signature-line {
      margin-top: 80px;
      border-top: 1px solid #333;
      padding-top: 10px;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <h1>LOAN AGREEMENT</h1>
  
  <div class="contract-info">
    <p><strong>Contract ID:</strong> ${contractData.id}</p>
    <p><strong>Version:</strong> ${contractData.contract_version}</p>
    <p><strong>Date:</strong> ${new Date(contractData.created_at).toLocaleDateString('en-CA')}</p>
    ${contractData.expires_at ? `<p><strong>Expires:</strong> ${new Date(contractData.expires_at).toLocaleDateString('en-CA')}</p>` : ''}
  </div>

  <h2>1. Loan Terms</h2>
  <table>
    <tr>
      <th>Principal Amount</th>
      <td>${formatCurrency(terms.principal_amount)}</td>
    </tr>
    <tr>
      <th>Interest Rate (Annual)</th>
      <td>${terms.interest_rate}%</td>
    </tr>
    <tr>
      <th>Term</th>
      <td>${terms.term_months} months</td>
    </tr>
    <tr>
      <th>Total Amount</th>
      <td>${formatCurrency(terms.total_amount)}</td>
    </tr>
    ${terms.fees && (terms.fees.origination_fee || terms.fees.processing_fee || terms.fees.other_fees) ? `
    <tr>
      <th>Fees</th>
      <td>
        ${terms.fees.origination_fee ? `Origination: ${formatCurrency(terms.fees.origination_fee)}<br>` : ''}
        ${terms.fees.processing_fee ? `Processing: ${formatCurrency(terms.fees.processing_fee)}<br>` : ''}
        ${terms.fees.other_fees ? `Other: ${formatCurrency(terms.fees.other_fees)}` : ''}
      </td>
    </tr>
    ` : ''}
  </table>

  ${terms.payment_schedule && terms.payment_schedule.length > 0 ? `
  <h2>2. Payment Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Due Date</th>
        <th>Payment Amount</th>
        <th>Principal</th>
        <th>Interest</th>
      </tr>
    </thead>
    <tbody>
      ${terms.payment_schedule.map(payment => `
        <tr>
          <td>${new Date(payment.due_date).toLocaleDateString('en-CA')}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${formatCurrency(payment.principal)}</td>
          <td>${formatCurrency(payment.interest)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <h2>3. Terms and Conditions</h2>
  <div>
    ${terms.terms_and_conditions || `
    <p>By signing this agreement, the borrower agrees to:</p>
    <ul>
      <li>Repay the loan amount plus interest according to the payment schedule</li>
      <li>Make payments on or before the due dates specified</li>
      <li>Notify the lender immediately of any changes in contact information</li>
      <li>Comply with all applicable laws and regulations</li>
    </ul>
    `}
  </div>

  ${terms.effective_date ? `<p><strong>Effective Date:</strong> ${new Date(terms.effective_date).toLocaleDateString('en-CA')}</p>` : ''}
  ${terms.maturity_date ? `<p><strong>Maturity Date:</strong> ${new Date(terms.maturity_date).toLocaleDateString('en-CA')}</p>` : ''}

  <div class="signature-section">
    <h2>4. Signatures</h2>
    
    ${contractData.client_signed_at ? `
    <div class="signature-line">
      <p><strong>Borrower Signature</strong></p>
      <p>Signed: ${new Date(contractData.client_signed_at).toLocaleString('en-CA')}</p>
      ${contractData.client_signature_data ? `
        <p>Method: ${contractData.client_signature_data.signature_method}</p>
        <p>IP Address: ${contractData.client_signature_data.ip_address}</p>
      ` : ''}
    </div>
    ` : `
    <div class="signature-line">
      <p><strong>Borrower Signature</strong></p>
      <p style="margin-top: 60px;">___________________________</p>
      <p>Date: _______________</p>
    </div>
    `}

    ${contractData.staff_signed_at ? `
    <div class="signature-line" style="margin-top: 40px;">
      <p><strong>Lender Representative</strong></p>
      <p>Signed: ${new Date(contractData.staff_signed_at).toLocaleString('en-CA')}</p>
    </div>
    ` : `
    <div class="signature-line" style="margin-top: 40px;">
      <p><strong>Lender Representative</strong></p>
      <p style="margin-top: 60px;">___________________________</p>
      <p>Date: _______________</p>
    </div>
    `}
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

  if (!contract) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
        <div className='relative w-full max-w-4xl rounded-lg bg-white shadow-xl'>
          <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
            <h2 className='text-xl font-bold text-gray-900'>Contract Not Found</h2>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600'
            >
              <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
          <div className='p-6 text-center'>
            <p className='mb-4 text-gray-600'>No contract has been generated for this application yet.</p>
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
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>Loan Contract</h2>
            <p className='text-sm text-gray-500'>
              Version {contract.contract_version} • {contract.contract_status}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            {onSend && contract.contract_status === 'generated' && (
              <button
                onClick={onSend}
                disabled={loading}
                className='rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50'
              >
                Send Contract
              </button>
            )}
            <button
              onClick={handlePrint}
              className='rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
            >
              Print
            </button>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600'
            >
              <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className='h-[calc(90vh-80px)] overflow-auto p-4'>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className='h-full w-full rounded border'
              title='Contract PDF'
            />
          ) : (
            <div className='flex h-full items-center justify-center'>
              <div className='text-center'>
                <div className='mb-4 text-gray-400'>
                  <svg className='mx-auto h-12 w-12' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' />
                  </svg>
                </div>
                <p className='text-gray-600'>Loading contract...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

