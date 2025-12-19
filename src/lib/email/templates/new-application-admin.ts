import { getAppUrl } from '@/src/lib/config'

interface NewApplicationAdminEmailData {
  applicationId: string
  clientName: string
  clientEmail: string
  loanAmount: number
  applicationUrl: string
  preferredLanguage?: 'en' | 'fr'
}

/**
 * Generate new application notification email for admin users
 * 
 * Sends an email to admin users when a new loan application is submitted
 */
export function generateNewApplicationAdminEmail(
  data: NewApplicationAdminEmailData
): { subject: string; html: string; text: string } {
  const isFrench = data.preferredLanguage === 'fr'
  const appUrl = getAppUrl()
  const applicationUrl = data.applicationUrl || `${appUrl}/admin/applications/${data.applicationId}`
  
  const subject = isFrench
    ? 'Nouvelle demande de prêt soumise - Flash-Loan'
    : 'New Loan Application Submitted - Flash-Loan'

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
      .info-label { font-weight:600; color:#374151; display:inline-block; min-width:120px; }
      .button-wrap { margin: 20px 0 4px; text-align:center; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:14px 24px; border-radius:8px; font-weight:600; font-size:16px; }
      .button:hover { background:#252551; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:12px; }
      .alert-box { background:#dbeafe; border-left:4px solid #3b82f6; padding:12px; margin:16px 0; border-radius:4px; }
      .alert-text { margin:0; font-size:13px; color:#1e40af; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="brand">Flash-Loan Admin</div>
        </div>
        <div class="content">
          <p class="h1">${isFrench ? 'Nouvelle demande de prêt' : 'New Loan Application'}</p>
          <p class="p">${isFrench
            ? 'Une nouvelle demande de prêt a été soumise et nécessite votre attention.'
            : 'A new loan application has been submitted and requires your attention.'}</p>
          
          <div class="info-box">
            <div class="info-item">
              <span class="info-label">${isFrench ? 'Client:' : 'Client:'}</span>
              <strong>${data.clientName}</strong>
            </div>
            <div class="info-item">
              <span class="info-label">${isFrench ? 'Email:' : 'Email:'}</span>
              ${data.clientEmail}
            </div>
            <div class="info-item">
              <span class="info-label">${isFrench ? 'Montant:' : 'Loan Amount:'}</span>
              <strong>${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(data.loanAmount)}</strong>
            </div>
            <div class="info-item">
              <span class="info-label">${isFrench ? 'ID Application:' : 'Application ID:'}</span>
              <span class="code">${data.applicationId}</span>
            </div>
          </div>

          <div class="alert-box">
            <p class="alert-text">${isFrench
              ? '📋 Veuillez examiner cette demande dans le tableau de bord administrateur.'
              : '📋 Please review this application in the admin dashboard.'}</p>
          </div>

          <div class="button-wrap">
            <a class="button" href="${applicationUrl}">${isFrench ? 'Voir la demande' : 'View Application'}</a>
          </div>
          <p class="muted" style="text-align:center; margin-top:8px;">${isFrench
            ? 'Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur :'
            : 'If the button doesn\'t work, copy and paste this URL into your browser:'}</p>
          <p class="p" style="text-align:center; margin-top:4px;"><span class="code">${applicationUrl}</span></p>

          <p class="p" style="margin-top:24px;">${isFrench
            ? 'Cette notification a été envoyée automatiquement lorsque la demande a été soumise.'
            : 'This notification was automatically sent when the application was submitted.'}</p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. ${isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}</div>
          <div class="muted" style="margin-top:8px;">${isFrench
            ? 'Vous avez reçu cet e-mail car vous êtes un administrateur du système Flash-Loan.'
            : 'You received this email because you are an administrator of the Flash-Loan system.'}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  // Plain text version
  const text = isFrench
    ? `Nouvelle demande de prêt

Une nouvelle demande de prêt a été soumise et nécessite votre attention.

Client: ${data.clientName}
Email: ${data.clientEmail}
Montant: ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(data.loanAmount)}
ID Application: ${data.applicationId}

📋 Veuillez examiner cette demande dans le tableau de bord administrateur.

Voir la demande: ${applicationUrl}

Cette notification a été envoyée automatiquement lorsque la demande a été soumise.

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
    : `New Loan Application

A new loan application has been submitted and requires your attention.

Client: ${data.clientName}
Email: ${data.clientEmail}
Loan Amount: ${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(data.loanAmount)}
Application ID: ${data.applicationId}

📋 Please review this application in the admin dashboard.

View Application: ${applicationUrl}

This notification was automatically sent when the application was submitted.

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`

  return { subject, html, text }
}

