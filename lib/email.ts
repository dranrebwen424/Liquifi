import nodemailer from "nodemailer";

// ponytail: single global transporter, verified lazily
let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!_transporter) {
    const port = Number(process.env.SMTP_PORT!);
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port,
      secure: port === 465,
      requireTLS: true,
      tls: {
        // ponytail: rejectUnauthorized: false — needed for self-signed certs in
        // some internal mail relays, add when connecting to production SMTP.
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });
    // Verify connection on creation — catches SMTP config errors early
    try {
      await _transporter.verify();
      console.log("[email] SMTP connected successfully");
    } catch (verifyErr) {
      console.error("[email] SMTP verify failed:", verifyErr);
    }
  }
  return _transporter;
}

export async function sendWelcomeEmail(to: string, firstName: string) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Your Liquifi account has been approved!",
    html: `<p>Hi ${firstName},</p>
<p>Your Liquifi account has been approved. You can now log in and start using the platform.</p>
<p><a href="${loginUrl}">Click here to log in</a></p>
<p>– Liquifi Team</p>`,
  });
}

export async function sendRejectionEmail(to: string, firstName: string) {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Your Liquifi account request",
    html: `<p>Hi ${firstName},</p>
<p>Your account registration request has been reviewed and was not approved at this time.</p>
<p>If you believe this is an error, please contact your department adviser or administrator.</p>
<p>– Liquifi Team</p>`,
  });
}
