import { getAppUrl } from '@/src/lib/config'

interface PaymentFailedEmailData {
  firstName: string
  lastName: string
  paymentAmount: number
  failureCount: number // 1 for first notice, 2 for second, 3+ for third+
  preferredLanguage: 'en' | 'fr'
  paymentEmail?: string // Default: contact@flash-loan.ca
}

/**
 * Generate payment failed notification email
 * 
 * Sends an email to the client when a payment has been returned/failed.
 * The message tone and content varies based on the number of failures.
 */
export function generatePaymentFailedEmail(
  data: PaymentFailedEmailData
): { subject: string; html: string; text: string } {
  const isFrench = data.preferredLanguage === 'fr'
  const fullName = `${data.firstName} ${data.lastName}`
  const paymentEmail = data.paymentEmail || 'contact@flash-loan.ca'
  const formattedAmount = new Intl.NumberFormat(
    isFrench ? 'fr-CA' : 'en-CA',
    { style: 'currency', currency: 'CAD' }
  ).format(data.paymentAmount)

  // Determine message based on failure count
  const isFirstNotice = data.failureCount === 1
  const isSecondNotice = data.failureCount === 2
  const isThirdOrMore = data.failureCount >= 3

  let subject: string
  let introText: string
  let mainMessage: string
  let warningText: string | null = null
  let closingText: string

  if (isFirstNotice) {
    // First notice - simple and friendly
    subject = isFrench
      ? 'Avis de paiement retourné - Flash-Loan'
      : 'Returned Payment Notice - Flash-Loan'

    introText = isFrench
      ? `Bonjour ${data.firstName},`
      : `Hello ${data.firstName},`

    mainMessage = isFrench
      ? `Nous vous contactons pour vous informer que votre paiement de ${formattedAmount} a été retourné.<br><br>Pour résoudre cette situation rapidement, vous pouvez effectuer le paiement immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Alternativement, si vous préférez, veuillez nous contacter pour organiser un plan de paiement avec des montants plus petits.<br><br>Merci de respecter votre contrat avec nous.`
      : `We are reaching out to inform you that your payment of ${formattedAmount} has been returned.<br><br>To resolve this matter quickly, you can make the payment immediately by sending the funds via EMT to ${paymentEmail}. Alternatively, if you prefer, please contact us to arrange a payment plan with smaller amounts.<br><br>Thank you for honoring your contract with us.`

    closingText = isFrench
      ? 'Cordialement,<br>L\'équipe Flash-Loan'
      : 'Sincerely,<br>The Flash-Loan Team'
  } else if (isSecondNotice) {
    // Second notice - more urgent
    subject = isFrench
      ? 'Deuxième avis - Paiement retourné - Flash-Loan'
      : 'Second Notice - Returned Payment - Flash-Loan'

    introText = isFrench
      ? `Bonjour ${data.firstName},`
      : `Hello ${data.firstName},`

    mainMessage = isFrench
      ? `Ceci est votre deuxième avis concernant un paiement retourné.<br><br>Pour résoudre cette situation rapidement, veuillez effectuer le paiement de ${formattedAmount} immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Si nous ne recevons pas le paiement, nous devrons prendre des mesures supplémentaires.<br><br>Si vous éprouvez des difficultés avec vos paiements et avez besoin d'organiser des montants de paiement plus petits, veuillez nous contacter immédiatement afin que nous puissions trouver une solution ensemble.`
      : `This is your second notice regarding a returned payment.<br><br>To resolve this matter swiftly, please make the payment of ${formattedAmount} immediately by sending the funds via EMT to ${paymentEmail}. If we do not receive payment, we will have to take further action.<br><br>If you are experiencing difficulties with your payments and need to arrange smaller payment amounts, please contact us immediately so we can work out a solution together.`

    closingText = isFrench
      ? 'Cordialement,<br>L\'équipe Flash-Loan'
      : 'Sincerely,<br>The Flash-Loan Team'
  } else {
    // Third or more notice - serious warning
    const noticeNumber = isFrench
      ? `Ceci est votre ${data.failureCount === 3 ? 'troisième' : `${data.failureCount}ème`} avis`
      : `This is your ${data.failureCount === 3 ? 'third' : `${data.failureCount}th`} notice`

    subject = isFrench
      ? 'Avis urgent - Paiement retourné - Flash-Loan'
      : 'Urgent Notice - Returned Payment - Flash-Loan'

    introText = isFrench
      ? `Bonjour ${data.firstName},`
      : `Hello ${data.firstName},`

    mainMessage = isFrench
      ? `${noticeNumber} concernant un paiement retourné.<br><br>Pour résoudre cette situation rapidement, veuillez effectuer le paiement de ${formattedAmount} immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Si nous ne recevons pas le paiement, nous devrons transférer votre dossier à notre agence de recouvrement et à notre avocat, ce qui pourrait avoir un impact négatif sur votre cote de crédit.<br><br>Veuillez noter que selon la loi, après un seul paiement manqué, nous avons le droit d'annuler le contrat et d'exiger le montant total dû. Cependant, nous souhaitons aider nos clients et n'exigerons pas le montant total si vous réglez cette situation rapidement.<br><br>Si vous éprouvez des difficultés avec vos paiements et avez besoin d'organiser des montants de paiement plus petits, veuillez nous contacter immédiatement afin que nous puissions trouver une solution ensemble.`
      : `${noticeNumber} regarding a returned payment.<br><br>To resolve this matter swiftly, please make the payment of ${formattedAmount} immediately by sending the funds via EMT to ${paymentEmail}. If we do not receive payment, we will have to escalate your account to our collection agency and lawyer, which could negatively impact your credit score.<br><br>Please be aware that according to the law, after a single missed payment, we have the right to void the contract and demand the total amount due. However, we want to assist our customers and will not pursue the total amount if you address this situation promptly.<br><br>If you are experiencing difficulties with your payments and need to arrange smaller payment amounts, please contact us immediately so we can work out a solution together.`

    warningText = isFrench
      ? '⚠️ <strong>Action requise:</strong> Veuillez agir et respecter vos engagements.'
      : '⚠️ <strong>Action Required:</strong> Please take action and uphold your commitments.'

    closingText = isFrench
      ? 'Cordialement,<br>L\'équipe Flash-Loan'
      : 'Sincerely,<br>The Flash-Loan Team'
  }

  // Store noticeNumber for text version if it's third or more
  const noticeNumberText = isThirdOrMore
    ? (isFrench
        ? `Ceci est votre ${data.failureCount === 3 ? 'troisième' : `${data.failureCount}ème`} avis`
        : `This is your ${data.failureCount === 3 ? 'third' : `${data.failureCount}th`} notice`)
    : null

  const appUrl = getAppUrl()
  const logoUrl = `${appUrl}/images/FlashLoanLogo.png`

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
      .header { background: linear-gradient(90deg, #333366, #097fa5); padding:20px; color:#ffffff; text-align:center; }
      .logo-container { display:flex; align-items:center; justify-content:end; }
      .logo { max-width: 90px; height: auto; display:block; }
      .content { padding:24px; }
      .h1 { font-size:20px; font-weight:700; margin:0 0 8px; }
      .p { font-size:14px; line-height:1.6; margin:0 0 12px; color:#374151; }
      .info-box { background:#f3f4f6; border:2px solid #d1d5db; border-radius:8px; padding:16px; margin:16px 0; }
      .info-item { margin:8px 0; font-size:14px; color:#111827; }
      .info-label { font-weight:600; color:#374151; }
      .warning-box { background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:16px 0; border-radius:4px; }
      .warning-text { margin:0; font-size:13px; color:#856404; }
      .urgent-box { background:#fee2e2; border-left:4px solid #dc2626; padding:12px; margin:16px 0; border-radius:4px; }
      .urgent-text { margin:0; font-size:13px; color:#991b1b; font-weight:600; }
      .button-wrap { margin: 20px 0 4px; text-align:center; }
      .button { display:inline-block; background:#333366; color:#ffffff !important; text-decoration:none; padding:14px 24px; border-radius:8px; font-weight:600; font-size:16px; }
      .button:hover { background:#252551; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { padding:16px 24px 22px; border-top:1px solid #f3f4f6; background:#fafafa; color:#6b7280; font-size:12px; }
      .code { font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:12px; }
      .payment-info { background:#e0f2fe; border-left:4px solid #3b82f6; padding:12px; margin:16px 0; border-radius:4px; }
      .payment-info-text { margin:0; font-size:13px; color:#1e40af; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="logo-container">
            <img src="${logoUrl}" alt="Flash-Loan" class="logo" />
          </div>
        </div>
        <div class="content">
          <p class="h1">${introText}</p>
          <p class="p">${mainMessage}</p>
          
          <div class="payment-info">
            <p class="payment-info-text"><strong>${isFrench ? 'Montant du paiement:' : 'Payment Amount:'}</strong> ${formattedAmount}</p>
            <p class="payment-info-text"><strong>${isFrench ? 'Envoyer par EMT à:' : 'Send via EMT to:'}</strong> <span class="code">${paymentEmail}</span></p>
          </div>

          ${warningText ? `<div class="${isThirdOrMore ? 'urgent-box' : 'warning-box'}"><p class="${isThirdOrMore ? 'urgent-text' : 'warning-text'}">${warningText}</p></div>` : ''}

          <p class="p" style="margin-top:24px;">${closingText}</p>
        </div>
        <div class="footer">
          <div>© ${new Date().getFullYear()} Flash-Loan. ${isFrench ? 'Tous droits réservés.' : 'All rights reserved.'}</div>
          <div class="muted" style="margin-top:8px;">${isFrench
            ? 'Vous avez reçu cet e-mail car un paiement a été retourné sur votre compte.'
            : 'You received this email because a payment has been returned on your account.'}</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()

  // Plain text version
  const text = isFirstNotice
    ? (isFrench
        ? `Bonjour ${data.firstName},

Nous vous contactons pour vous informer que votre paiement de ${formattedAmount} a été retourné.

Pour résoudre cette situation rapidement, vous pouvez effectuer le paiement immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Alternativement, si vous préférez, veuillez nous contacter pour organiser un plan de paiement avec des montants plus petits.

Merci de respecter votre contrat avec nous.

Cordialement,
L'équipe Flash-Loan

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
        : `Hello ${data.firstName},

We are reaching out to inform you that your payment of ${formattedAmount} has been returned.

To resolve this matter quickly, you can make the payment immediately by sending the funds via EMT to ${paymentEmail}. Alternatively, if you prefer, please contact us to arrange a payment plan with smaller amounts.

Thank you for honoring your contract with us.

Sincerely,
The Flash-Loan Team

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`)
    : isSecondNotice
      ? (isFrench
          ? `Bonjour ${data.firstName},

Ceci est votre deuxième avis concernant un paiement retourné.

Pour résoudre cette situation rapidement, veuillez effectuer le paiement de ${formattedAmount} immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Si nous ne recevons pas le paiement, nous devrons prendre des mesures supplémentaires.

Si vous éprouvez des difficultés avec vos paiements et avez besoin d'organiser des montants de paiement plus petits, veuillez nous contacter immédiatement afin que nous puissions trouver une solution ensemble.

Cordialement,
L'équipe Flash-Loan

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
          : `Hello ${data.firstName},

This is your second notice regarding a returned payment.

To resolve this matter swiftly, please make the payment of ${formattedAmount} immediately by sending the funds via EMT to ${paymentEmail}. If we do not receive payment, we will have to take further action.

If you are experiencing difficulties with your payments and need to arrange smaller payment amounts, please contact us immediately so we can work out a solution together.

Sincerely,
The Flash-Loan Team

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`)
      : (isFrench
          ? `Bonjour ${data.firstName},

${noticeNumberText!} concernant un paiement retourné.

Pour résoudre cette situation rapidement, veuillez effectuer le paiement de ${formattedAmount} immédiatement en envoyant les fonds par virement électronique (EMT) à ${paymentEmail}. Si nous ne recevons pas le paiement, nous devrons transférer votre dossier à notre agence de recouvrement et à notre avocat, ce qui pourrait avoir un impact négatif sur votre cote de crédit.

Veuillez noter que selon la loi, après un seul paiement manqué, nous avons le droit d'annuler le contrat et d'exiger le montant total dû. Cependant, nous souhaitons aider nos clients et n'exigerons pas le montant total si vous réglez cette situation rapidement.

Si vous éprouvez des difficultés avec vos paiements et avez besoin d'organiser des montants de paiement plus petits, veuillez nous contacter immédiatement afin que nous puissions trouver une solution ensemble.

⚠️ Action requise: Veuillez agir et respecter vos engagements.

Cordialement,
L'équipe Flash-Loan

© ${new Date().getFullYear()} Flash-Loan. Tous droits réservés.`
          : `Hello ${data.firstName},

${noticeNumberText!} regarding a returned payment.

To resolve this matter swiftly, please make the payment of ${formattedAmount} immediately by sending the funds via EMT to ${paymentEmail}. If we do not receive payment, we will have to escalate your account to our collection agency and lawyer, which could negatively impact your credit score.

Please be aware that according to the law, after a single missed payment, we have the right to void the contract and demand the total amount due. However, we want to assist our customers and will not pursue the total amount if you address this situation promptly.

If you are experiencing difficulties with your payments and need to arrange smaller payment amounts, please contact us immediately so we can work out a solution together.

⚠️ Action Required: Please take action and uphold your commitments.

Sincerely,
The Flash-Loan Team

© ${new Date().getFullYear()} Flash-Loan. All rights reserved.`)

  return { subject, html, text }
}

