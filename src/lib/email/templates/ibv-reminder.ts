import { getAppUrl } from '@/src/lib/config'

interface IbvReminderEmailData {
  applicantName: string
  verificationLink: string
  preferredLanguage: 'en' | 'fr'
  redirectUrl?: string | null
}

export function generateIbvReminderEmail(
  data: IbvReminderEmailData
): { subject: string; html: string } {
  const isFrench = data.preferredLanguage === 'fr'
  const fallbackAppUrl = getAppUrl()

  const subject = isFrench
    ? 'Complétez votre vérification bancaire'
    : 'Complete Your Bank Verification'

  const redirectNotice = data.redirectUrl
    ? `<p class="muted">${isFrench
        ? `Une fois la vérification terminée, vous serez redirigé automatiquement vers :`
        : `Once the verification is completed you will be redirected to:`}</p>
       <p class="p"><span class="code">${data.redirectUrl}</span></p>`
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
      .button-wrap { margin: 20px 0 4px; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; }
      .warning { background:#e0f2fe; border-left:4px solid #3b82f6; padding:12px; margin:16px 0; border-radius:4px; }
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
            ? 'Il est temps de finaliser la vérification bancaire afin que nous puissions poursuivre le traitement de votre demande.'
            : 'It’s time to complete your bank verification so we can keep processing your application.'}</p>
          <div class="warning">
            <p class="p" style="margin:0;">${isFrench
              ? 'Cliquez sur le bouton ci-dessous pour vous connecter de façon sécurisée à votre institution financière.'
              : 'Select the button below to securely connect to your financial institution.'}</p>
          </div>
          <div class="button-wrap">
            <a class="button" href="${data.verificationLink}">${isFrench ? 'Compléter la vérification' : 'Complete Verification'}</a>
          </div>
          <p class="muted">${isFrench
            ? 'Ce lien sécurisé expire après un certain temps. Si vous ne pouvez pas l\'ouvrir, copiez et collez l\'adresse complète ci-dessous dans votre navigateur.'
            : 'This secure link expires after some time. If you can’t open it, copy and paste the full address below into your browser.'}</p>
          <p class="p"><span class="code">${data.verificationLink}</span></p>
          ${redirectNotice}
          <p class="p" style="margin-top:20px;">${isFrench
            ? 'Besoin d’aide? Répondez à ce courriel ou contactez-nous au +1 (450) 235-8461.'
            : 'Need help? Reply to this email or call us at +1 (450) 235-8461.'}</p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés. | All rights reserved.</div>
          <div class="muted">${isFrench
            ? 'Vous avez reçu cet e-mail car une vérification bancaire est requise pour votre demande.'
            : 'You received this message because a bank verification is required for your application.'}</div>
          <div class="muted">${fallbackAppUrl}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  return { subject, html }
}


