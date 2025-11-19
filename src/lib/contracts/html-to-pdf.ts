/**
 * HTML to PDF Conversion Utility
 * 
 * Converts HTML contract (from createContractHTML) to PDF using Puppeteer
 * This matches the same HTML structure used in ContractViewer component
 */

import puppeteer from 'puppeteer'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import type { LoanContract } from '@/src/lib/supabase/types'

export interface SignedPDFResult {
  pdfBytes: Uint8Array
  hash: string
  filePath: string
}

/**
 * Load logo and convert to base64 data URI
 */
function getLogoDataURI(): string {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'FlashLoanLogo.png')
    const logoBuffer = readFileSync(logoPath)
    const logoBase64 = logoBuffer.toString('base64')
    return `data:image/png;base64,${logoBase64}`
  } catch (error) {
    console.error('Error loading logo:', error)
    // Return empty data URI if logo can't be loaded
    return 'data:image/png;base64,'
  }
}

/**
 * Convert HTML contract to PDF bytes
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {
  let browser
  
  try {
  
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set content with logo replaced
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF with A4 format matching the HTML styles
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '17mm',
        bottom: '18mm',
        left: '17mm'
      }
    })

    // Return Buffer directly (Puppeteer returns Buffer)
    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error('Error converting HTML to PDF:', error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Generate PDF from contract using HTML (same as ContractViewer)
 */
export async function generateContractPDFFromHTML(
  contract: LoanContract
): Promise<Buffer> {
  // Import the HTML generator (same one used in ContractViewer)
  const { createContractHTML } = await import('./contract-html')
  
  // Generate HTML
  const html = await createContractHTML(contract)
  
  // Convert HTML to PDF
  return await convertHTMLToPDF(html)
}

/**
 * Generate signed PDF from contract using HTML (replaces pdf-lib version)
 * This function matches the signature of generateSignedContractPDF from pdf-generator.ts
 * 
 * Note: IP address and user agent are not included in the contract HTML display,
 * but are stored in the database separately. The HTML will show the signature name and date.
 */
export async function generateSignedContractPDF(
  contract: LoanContract,
  signatureName: string,
  signedAt: string
): Promise<SignedPDFResult> {
  // Create a modified contract with signature data
  // The HTML generator reads from client_signed_at and client_signature_data
  const signedContract: LoanContract = {
    ...contract,
    client_signed_at: signedAt,
    client_signature_data: {
      signature_method: 'click_to_sign',
      signature_name: signatureName,
      ip_address: contract.client_signature_data?.ip_address || 'Unknown',
      user_agent: contract.client_signature_data?.user_agent || 'Unknown',
      signature_timestamp: signedAt
    }
  }

  // Generate PDF from HTML
  const pdfBuffer = await generateContractPDFFromHTML(signedContract)
  
  // Convert Buffer to Uint8Array
  const pdfBytes = new Uint8Array(pdfBuffer)
  
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
 * (Same as pdf-generator.ts for consistency)
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

