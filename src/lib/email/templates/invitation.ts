import { getAppUrl } from '@/src/lib/config'

interface InvitationEmailData {
  firstName: string
  lastName: string
  email: string
  temporaryPassword: string
  preferredLanguage: 'en' | 'fr'
  loginUrl?: string
}

/**
 * Generate invitation email for new client account
 * 
 * Sends a welcome email with temporary password when a client
 * account is created during loan application submission.
 */
export function generateInvitationEmail(data: InvitationEmailData): { subject: string; html: string; text: string } {
  const isFrench = data.preferredLanguage === 'fr'
  // Use dashboard URL - Supabase auth will handle login redirect if needed
  const loginUrl = data.loginUrl || `${getAppUrl()}/${data.preferredLanguage}/client/dashboard`
  const fullName = `${data.firstName} ${data.lastName}`
  
  const subject = isFrench
    ? 'Bienvenue chez Flash-Loan - Votre compte a été créé'
    : 'Welcome to Flash-Loan - Your Account Has Been Created'

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
      .password-box { background:#f3f4f6; border:2px solid #d1d5db; border-radius:8px; padding:16px; margin:16px 0; text-align:center; }
      .password { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:18px; font-weight:700; color:#111827; letter-spacing:2px; }
      .warning { background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:16px 0; border-radius:4px; }
      .warning-text { margin:0; font-size:13px; color:#856404; }
      .button-wrap { margin: 20px 0 4px; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; }
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
            ? `Nous avons créé votre compte Flash-Loan suite à votre demande de prêt. Vous pouvez maintenant accéder à votre tableau de bord pour suivre l'état de votre demande et gérer vos informations.`
            : `We've created your Flash-Loan account following your loan application. You can now access your dashboard to track your application status and manage your information.`}</p>
          
          <div class="password-box">
            <p class="p" style="margin:0 0 8px; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">${isFrench ? 'Mot de passe temporaire' : 'Temporary Password'}</p>
            <p class="password">${data.temporaryPassword}</p>
          </div>

          <div class="warning">
            <p class="warning-text">${isFrench 
              ? '⚠️ <strong>Important:</strong> Veuillez changer ce mot de passe lors de votre première connexion pour des raisons de sécurité.'
              : '⚠️ <strong>Important:</strong> Please change this password on your first login for security reasons.'}</p>
          </div>

          <p class="p">${isFrench 
            ? 'Utilisez les informations suivantes pour vous connecter :'
            : 'Use the following information to log in:'}</p>
          <ul style="margin:12px 0 16px; padding-left:20px; color:#111827; font-size:14px;">
            <li><strong>${isFrench ? 'Email:' : 'Email:'}</strong> <span class="code">${data.email}</span></li>
            <li><strong>${isFrench ? 'Mot de passe temporaire:' : 'Temporary Password:'}</strong> <span class="code">${data.temporaryPassword}</span></li>
          </ul>

          <div class="button-wrap">
            <a class="button" href="${loginUrl}">${isFrench ? 'Se connecter' : 'Log In'}</a>
          </div>
          <p class="muted">${isFrench 
            ? 'Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur :'
            : 'If the button doesn\'t work, copy and paste this URL into your browser:'}</p>
          <p class="p"><span class="code">${loginUrl}</span></p>

          <p class="p" style="margin-top:24px;">${isFrench 
            ? 'Si vous avez des questions ou besoin d\'aide, n\'hésitez pas à nous contacter.'
            : 'If you have any questions or need assistance, please don\'t hesitate to contact us.'}</p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. ${isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}</div>
          <div class="muted">${isFrench 
            ? 'Vous avez reçu cet e-mail car un compte a été créé pour vous suite à votre demande de prêt.'
            : 'You received this email because an account was created for you following your loan application.'}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  // Plain text version
  const text = isFrench
    ? `Bonjour ${data.firstName},

Nous avons créé votre compte Flash-Loan suite à votre demande de prêt. Vous pouvez maintenant accéder à votre tableau de bord pour suivre l'état de votre demande et gérer vos informations.

MOT DE PASSE TEMPORAIRE: ${data.temporaryPassword}

⚠️ Important: Veuillez changer ce mot de passe lors de votre première connexion pour des raisons de sécurité.

Informations de connexion:
- Email: ${data.email}
- Mot de passe temporaire: ${data.temporaryPassword}

Connectez-vous ici: ${loginUrl}

Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
    : `Hi ${data.firstName},

We've created your Flash-Loan account following your loan application. You can now access your dashboard to track your application status and manage your information.

TEMPORARY PASSWORD: ${data.temporaryPassword}

⚠️ Important: Please change this password on your first login for security reasons.

Login Information:
- Email: ${data.email}
- Temporary Password: ${data.temporaryPassword}

Log in here: ${loginUrl}

If you have any questions or need assistance, please don't hesitate to contact us.

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`

  return { subject, html, text }
}

