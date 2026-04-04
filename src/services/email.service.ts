import nodemailer from "nodemailer"

/* =====================================================
   TRANSPORTER
===================================================== */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: true,
  tls: {
    rejectUnauthorized: false
  }
})

// 🔎 Verificação de conexão SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP CONNECTION ERROR:", error)
  } else {
    console.log("SMTP SERVER READY")
  }
})

/* =====================================================
   TEMPLATE BASE
===================================================== */

function buildEmailTemplate(options: {
  title: string
  content: string
  buttonText?: string
  buttonUrl?: string
}) {
  const { title, content, buttonText, buttonUrl } = options

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px 0;">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            
            <!-- HEADER -->
            <tr>
              <td style="background:#111827;padding:20px;text-align:center;">
                <img src="https://ematea.org/logo.png" width="140" alt="EMATEA" />
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="padding:30px;">
                <h2 style="margin-top:0;color:#111827;">${title}</h2>
                <div style="color:#374151;font-size:15px;line-height:1.6;">
                  ${content}
                </div>

                ${
                  buttonText && buttonUrl
                    ? `
                  <div style="margin-top:25px;text-align:center;">
                    <a href="${buttonUrl}" 
                      style="
                        background:#2563eb;
                        color:#ffffff;
                        padding:12px 24px;
                        text-decoration:none;
                        border-radius:6px;
                        font-weight:bold;
                        display:inline-block;
                      ">
                      ${buttonText}
                    </a>
                  </div>
                `
                    : ""
                }
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#f9fafb;padding:20px;text-align:center;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} EMATEA. Todos os direitos reservados.
                <br/>
                Este é um email automático. Não responda.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `
}

/* =====================================================
   SERVICE
===================================================== */

export const EmailService = {
  async sendEmail(options: {
    to: string
    subject: string
    title: string
    content: string
    buttonText?: string
    buttonUrl?: string
  }) {

    if (!options.to) throw new Error("EMAIL_REQUIRED")

    const html = buildEmailTemplate({
      title: options.title,
      content: options.content,
      buttonText: options.buttonText,
      buttonUrl: options.buttonUrl,
    })

    try {

      await transporter.sendMail({
        from: `"EMATEA" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html,
      })

    } catch (error) {

      console.error("EMAIL_ERROR:", error)
      throw new Error("EMAIL_SEND_FAILED")
    }
  },

  async sendOtp(to: string, code: string) {

    await this.sendEmail({
      to,
      subject: "Código de verificação EMATEA",
      title: "Seu código de verificação",
      content: `
        <p>Use o código abaixo para concluir sua autenticação:</p>
        <h1 style="letter-spacing:4px;font-size:28px;">${code}</h1>
        <p>Este código expira em 5 minutos.</p>
        <p>Se você não solicitou, ignore este email.</p>
      `,
    })
  },
}