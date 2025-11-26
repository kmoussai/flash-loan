import { getAppUrl } from '@/src/lib/config'

interface ContractSentEmailData {
  firstName: string
  lastName: string
  email: string
  contractNumber: string | null
  loanAmount: number | null
  dashboardUrl: string
  preferredLanguage: 'en' | 'fr'
  expiresAt?: string | null
}

/**
 * Generate contract sent notification email
 * 
 * Sends an email to the client notifying them that their contract is ready to sign
 */
export function generateContractSentEmail(data: ContractSentEmailData): { subject: string; html: string; text: string } {
  const isFrench = data.preferredLanguage === 'fr'
  const fullName = `${data.firstName} ${data.lastName}`
  
  const subject = isFrench
    ? 'Votre contrat de prêt est prêt à être signé - Flash-Loan'
    : 'Your Loan Contract is Ready to Sign - Flash-Loan'

  const contractNumberText = data.contractNumber
    ? isFrench
      ? `Numéro de contrat : ${data.contractNumber}`
      : `Contract Number: ${data.contractNumber}`
    : ''

  const loanAmountText = data.loanAmount
    ? isFrench
      ? `Montant du prêt : ${new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(data.loanAmount)}`
      : `Loan Amount: ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(data.loanAmount)}`
    : ''

  const expiresText = data.expiresAt
    ? isFrench
      ? `<div style="background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:16px 0; border-radius:4px;"><p style="margin:0; font-size:13px; color:#856404;">⚠️ <strong>Important:</strong> Ce contrat expire le ${new Date(data.expiresAt).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}. Veuillez le signer avant cette date.</p></div>`
      : `<div style="background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:16px 0; border-radius:4px;"><p style="margin:0; font-size:13px; color:#856404;">⚠️ <strong>Important:</strong> This contract expires on ${new Date(data.expiresAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}. Please sign it before this date.</p></div>`
    : ''

  const html = `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
    <style>
      body { margin:0; padding:0; background:#f6f7fb; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol',sans-serif; color:#111827; }
      .wrapper { width:100%; background:#f6f7fb; padding:24px 0; }
      .container { max-width: 560px; margin: 0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius: 10px; overflow:hidden; }
      .header { background: linear-gradient(90deg, #333366, #097fa5); padding:20px; color:#ffffff; }
      .brand { font-size:18px; font-weight:700; letter-spacing:0.2px; }
      .content { padding:24px; }
      .h1 { font-size:20px; font-weight:700; margin:0 0 8px; }
      .p { font-size:14px; line-height:1.6; margin:0 0 12px; color:#374151; }
      .info-box { background:#f3f4f6; border:2px solid #d1d5db; border-radius:8px; padding:16px; margin:16px 0; }
      .info-item { margin:8px 0; font-size:14px; color:#111827; }
      .info-label { font-weight:600; color:#374151; }
      .button-wrap { margin: 20px 0 4px; text-align:center; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:14px 24px; border-radius:8px; font-weight:600; font-size:16px; }
      .button:hover { background:#252551; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:12px; }
      .success-box { background:#d1fae5; border-left:4px solid #10b981; padding:12px; margin:16px 0; border-radius:4px; }
      .success-text { margin:0; font-size:13px; color:#065f46; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="brand">Flash-Loan</div>
        </div>
        <div class="content">
          <p class="h1">${isFrench ? `Bonjour ${data.firstName},` : `Hi ${data.firstName},`}</p>
          <p class="p">${isFrench 
            ? 'Votre contrat de prêt est prêt et a été signé par notre équipe. Il ne reste plus qu\'une étape : votre signature pour finaliser votre demande de prêt.'
            : 'Your loan contract is ready and has been signed by our team. There\'s just one step remaining: your signature to finalize your loan application.'}</p>
          
          ${contractNumberText || loanAmountText ? `
          <div class="info-box">
            ${contractNumberText ? `<div class="info-item"><span class="info-label">${contractNumberText.split(':')[0]}:</span> ${contractNumberText.split(':')[1]?.trim() || ''}</div>` : ''}
            ${loanAmountText ? `<div class="info-item"><span class="info-label">${loanAmountText.split(':')[0]}:</span> ${loanAmountText.split(':')[1]?.trim() || ''}</div>` : ''}
          </div>
          ` : ''}

          ${expiresText}

          <div class="success-box">
            <p class="success-text">${isFrench 
              ? '✅ Votre contrat a été signé par notre équipe et vous attend dans votre tableau de bord.'
              : '✅ Your contract has been signed by our team and is waiting for you in your dashboard.'}</p>
          </div>

          <p class="p">${isFrench 
            ? 'Pour signer votre contrat, connectez-vous à votre tableau de bord client. Vous pourrez consulter tous les détails du contrat et le signer en toute sécurité.'
            : 'To sign your contract, please log in to your client dashboard. You\'ll be able to review all contract details and sign it securely.'}</p>

          <div class="button-wrap">
            <a class="button" href="${data.dashboardUrl}">${isFrench ? 'Se connecter et signer le contrat' : 'Log In and Sign Contract'}</a>
          </div>
          <p class="muted" style="text-align:center; margin-top:8px;">${isFrench 
            ? 'Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur :'
            : 'If the button doesn\'t work, copy and paste this URL into your browser:'}</p>
          <p class="p" style="text-align:center; margin-top:4px;"><span class="code">${data.dashboardUrl}</span></p>

          <p class="p" style="margin-top:24px;">${isFrench 
            ? 'Si vous avez des questions ou besoin d\'aide concernant votre contrat, n\'hésitez pas à nous contacter. Notre équipe est là pour vous aider.'
            : 'If you have any questions or need assistance regarding your contract, please don\'t hesitate to contact us. Our team is here to help.'}</p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. ${isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}</div>
          <div class="muted" style="margin-top:8px;">${isFrench 
            ? 'Vous avez reçu cet e-mail car un contrat de prêt vous a été envoyé pour signature.'
            : 'You received this email because a loan contract has been sent to you for signature.'}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  // Plain text version
  const text = isFrench
    ? `Bonjour ${data.firstName},

Votre contrat de prêt est prêt et a été signé par notre équipe. Il ne reste plus qu'une étape : votre signature pour finaliser votre demande de prêt.

${contractNumberText}
${loanAmountText}

${data.expiresAt ? `⚠️ Important: Ce contrat expire le ${new Date(data.expiresAt).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}. Veuillez le signer avant cette date.` : ''}

✅ Votre contrat a été signé par notre équipe et vous attend dans votre tableau de bord.

Pour signer votre contrat, connectez-vous à votre tableau de bord client. Vous pourrez consulter tous les détails du contrat et le signer en toute sécurité.

Connectez-vous ici: ${data.dashboardUrl}

Si vous avez des questions ou besoin d'aide concernant votre contrat, n'hésitez pas à nous contacter. Notre équipe est là pour vous aider.

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
    : `Hi ${data.firstName},

Your loan contract is ready and has been signed by our team. There's just one step remaining: your signature to finalize your loan application.

${contractNumberText}
${loanAmountText}

${data.expiresAt ? `⚠️ Important: This contract expires on ${new Date(data.expiresAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}. Please sign it before this date.` : ''}

✅ Your contract has been signed by our team and is waiting for you in your dashboard.

To sign your contract, please log in to your client dashboard. You'll be able to review all contract details and sign it securely.

Log in here: ${data.dashboardUrl}

If you have any questions or need assistance regarding your contract, please don't hesitate to contact us. Our team is here to help.

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`

  return { subject, html, text }
}

