import { getAppUrl } from '@/src/lib/config'

interface DocumentRequestEmailData {
  applicantName: string
  documentNames: string[]
  uploadLink: string
  preferredLanguage: 'en' | 'fr'
  expiresAt?: string | null
}

export function generateDocumentRequestEmail(data: DocumentRequestEmailData): { subject: string; html: string } {
  const isFrench = data.preferredLanguage === 'fr'
  
  const subject = isFrench
    ? 'Documents requis pour votre demande de prêt'
    : 'Documents Required for Your Loan Application'

  const expiresText = data.expiresAt
    ? isFrench
      ? `Les documents doivent être téléversés avant le ${new Date(data.expiresAt).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}.`
      : `Documents must be uploaded by ${new Date(data.expiresAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}.`
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
      .list { margin:12px 0 16px; padding-left:20px; color:#111827; }
      .list li { margin:4px 0; }
      .button-wrap { margin: 20px 0 4px; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; }
      .expiry { background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:16px 0; border-radius:4px; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="brand">Flash-Loan</div>
        </div>
        <div class="content">
          <p class="h1">${isFrench ? `Bonjour ${data.applicantName},` : `Hi ${data.applicantName},`}</p>
          <p class="p">${isFrench 
            ? 'Nous avons besoin de quelques documents pour continuer le traitement de votre demande. Veuillez téléverser les éléments suivants :'
            : 'We need a few documents to continue processing your application. Please upload the following items:'}</p>
          <ul class="list">
            ${data.documentNames.map(name => `<li>${name}</li>`).join('')}
          </ul>
          ${expiresText ? `<div class="expiry"><p class="p" style="margin:0; font-size:13px;">${expiresText}</p></div>` : ''}
          <div class="button-wrap">
            <a class="button" href="${data.uploadLink}">${isFrench ? 'Téléverser les documents' : 'Upload Documents'}</a>
          </div>
          <p class="muted">${isFrench 
            ? 'Ce lien sécurisé vous permettra de téléverser vos documents directement.'
            : 'This secure link will allow you to upload your documents directly.'}</p>
          <p class="p" style="margin-top:16px;">${isFrench 
            ? 'Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur :'
            : 'If the button doesn\'t work, copy and paste this URL into your browser:'}</p>
          <p class="p"><span class="code">${data.uploadLink}</span></p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés. | All rights reserved.</div>
          <div class="muted">${isFrench 
            ? 'Vous avez reçu cet e-mail car une demande de documents vous a été envoyée pour votre demande de prêt.'
            : 'You received this email because a document request was sent to you for your loan application.'}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  return { subject, html }
}

