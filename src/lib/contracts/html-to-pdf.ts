/**
 * HTML to PDF Conversion Utility
 *
 * Converts HTML contract (from createContractHTML) to PDF using Puppeteer
 * This matches the same HTML structure used in ContractViewer component
 *
 * Uses @sparticuz/chromium for serverless environments (Vercel, AWS Lambda)
 * Uses full puppeteer package for local development
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { execSync } from 'child_process'
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
    const logoPath = join(
      process.cwd(),
      'public',
      'images',
      'FlashLoanLogo.png'
    )
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
 * Get Puppeteer configuration based on environment
 * - Local development: Uses full puppeteer package (includes Chromium)
 * - Serverless (Vercel/AWS Lambda): Uses puppeteer-core + @sparticuz/chromium
 */
async function getPuppeteerLaunchOptions() {
  const puppeteer = await import('puppeteer-core')

  // Detect serverless environment
  const isServerless =
    !!process.env.VERCEL ||
    process.env.NODE_ENV === 'production'

  let executablePath: string | undefined
  let args: string[] = []
  let defaultViewport = { width: 1920, height: 1080 }

  if (isServerless) {
    // Use @sparticuz/chromium for serverless environments
    try {
      const chromiumModule = await import('@sparticuz/chromium')
      // Handle both CommonJS and ES module imports
      const chromium = chromiumModule.default || chromiumModule
      executablePath = await chromium.executablePath()
      args = chromium.args || []
      defaultViewport = chromium.defaultViewport || { width: 1920, height: 1080 }
    } catch (error) {
      console.error('Error loading @sparticuz/chromium:', error)
      throw new Error(
        'Failed to load Chromium for serverless environment. Make sure @sparticuz/chromium is installed.'
      )
    }
  } else {
    // Local development - try to find Chrome/Chromium
    // First, check if CHROME_PATH environment variable is set
    if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
      executablePath = process.env.CHROME_PATH
    } else {
      executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    }

    if (!executablePath || !existsSync(executablePath)) {
      throw new Error(
        'Chrome/Chromium not found. Please install Chrome or set CHROME_PATH environment variable.'
      )
    }

    // For local development, use more stable arguments
    // Don't use --single-process or --no-zygote as they can cause crashes
    args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ]
  }

  console.log('Environment:', isServerless ? 'serverless' : 'local')
  console.log('ExecutablePath:', executablePath)

  return {
    puppeteer: puppeteer.default || puppeteer,
    launchOptions: {
      args,
      defaultViewport,
      executablePath,
      headless: true,
      ignoreHTTPSErrors: true
    }
  }
}

/**
 * Convert HTML contract to PDF bytes
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {
  let browser
  let page

  try {
    const { puppeteer, launchOptions } = await getPuppeteerLaunchOptions()

    console.log('Launching browser with options:', {
      executablePath: launchOptions.executablePath,
      headless: launchOptions.headless,
      argsCount: launchOptions.args?.length
    })

    browser = await puppeteer.launch(launchOptions)

    if (!browser) {
      throw new Error('Failed to launch browser')
    }

    page = await browser.newPage()

    if (!page) {
      throw new Error('Failed to create new page')
    }

    // Set a reasonable timeout for page operations
    page.setDefaultTimeout(30000) // 30 seconds

    // Set content with logo replaced
    // Use 'load' instead of 'networkidle0' for more reliable behavior
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000
    })

    // Wait a bit for any dynamic content to render
    // Use Promise-based delay instead of deprecated waitForTimeout
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate PDF with A4 format matching the HTML styles
    const pdfBuffer = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '17mm',
        bottom: '18mm',
        left: '17mm'
      },
      timeout: 30000
    })

    // Return Buffer directly (Puppeteer returns Buffer)
    return pdfBuffer as Buffer
  } catch (error) {
    console.error('Error converting HTML to PDF:', error)
       
    throw error
  } finally {
    // Close page first, then browser
    try {
      if (page) {
        await page.close().catch(() => {
          // Ignore errors when closing page
        })
      }
    } catch (error) {
      console.error('Error closing page:', error)
    }
    
    try {
      if (browser) {
        await browser.close().catch(() => {
          // Ignore errors when closing browser
        })
      }
    } catch (error) {
      console.error('Error closing browser:', error)
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
