import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const baseUrl = new URL(resetLink).origin;
  
  const plainText = `Hi there,\n\nWe received a request to reset your password for your Tshastho account.\n\nClick the link below to set a new password. This link is valid for 1 hour.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`;

  const mailOptions = {
    from: `"Tshastho Support" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Action Required: Reset Your Tshastho Password',
    text: plainText,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <title>Reset Your Password</title>
        <style>
          /* Force Light Mode / Prevent Dark Mode overrides */
          :root { color-scheme: light; supported-color-schemes: light; }
          body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, Helvetica, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                
                <!-- Header with Gradient and White Logo Container -->
                <tr>
                  <td align="center" style="padding: 35px 20px; background: linear-gradient(135deg, #2563eb, #059669);">
                    <table border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;" bgcolor="#ffffff">
                      <tr>
                        <!-- Solid White Background Box for the Logo -->
                        <td align="center" bgcolor="#ffffff" style="background-color: #ffffff !important; border-radius: 12px; padding: 12px 24px;">
                          <img src="${baseUrl}/logo-email.png" alt="Tshastho" width="160" style="display: block; max-width: 100%; background-color: #ffffff;" />
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 15px 0 0 0; color: #ffffff; font-size: 13px; font-family: Arial, sans-serif; font-weight: bold; letter-spacing: 0.5px;">Connected Healthcare. Trusted Care.</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; font-family: Arial, Helvetica, sans-serif;">
                    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: bold;">Password Reset Request</h2>
                    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.5;">Hi there,</p>
                    <p style="margin: 0 0 25px 0; color: #475569; font-size: 16px; line-height: 1.5;">We received a request to reset the password for your Tshastho account. If you made this request, please click the button below to choose a new password.</p>
                    
                    <!-- Button -->
                    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 30px 0;">
                      <tr>
                        <td align="center" style="background-color: #2563eb; border-radius: 8px;">
                          <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 30px; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; font-family: Arial, sans-serif;">Reset My Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px; line-height: 1.5;">This link is valid for <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-family: Arial, sans-serif;">
                    <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 12px;">For security reasons, do not forward this email to anyone.</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Tshastho. All rights reserved.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  return transporter.sendMail(mailOptions);
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Tshastho Support" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Tshastho Verification Code',
    text: `Your Tshastho verification code is: ${otp}. This code is valid for 10 minutes.`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <tr>
                  <td align="center" style="padding: 30px 20px; background: linear-gradient(135deg, #2563eb, #059669);">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px;">Tshastho</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px;">Verify Your Email</h2>
                    <p style="margin: 0 0 25px 0; color: #475569; font-size: 15px; line-height: 1.6;">Please use the following 6-digit code to verify your email address.</p>
                    
                    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 30px 0;">
                      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">${otp}</span>
                    </div>

                    <p style="margin: 0; color: #64748b; font-size: 13px;">This code is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
  return transporter.sendMail(mailOptions);
};
