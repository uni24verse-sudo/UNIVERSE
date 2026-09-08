const nodemailer = require('nodemailer');
const ChannelAccount = require('../models/ChannelAccount');

class EmailMultiAccountService {
  constructor() {
    this.transports = new Map(); // Map<accountId, Transporter>
  }

  getTransporter(emailConfig) {
    const user = emailConfig.smtpUser || emailConfig.fromEmail;
    const pass = emailConfig.smtpPass;

    return nodemailer.createTransport({
      host: emailConfig.smtpHost || 'smtp.gmail.com',
      port: emailConfig.smtpPort || 587,
      secure: emailConfig.smtpPort === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  /**
   * Verify SMTP credentials
   */
  async verifySmtp(emailConfig) {
    try {
      const transporter = this.getTransporter(emailConfig);
      await transporter.verify();
      return { success: true };
    } catch (err) {
      console.error('SMTP Verification Error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send Email using a specific ChannelAccount
   */
  async sendEmail(accountId, { to, subject, html, text, fromLabel }) {
    const account = await ChannelAccount.findById(accountId);
    if (!account || account.type !== 'email') {
      throw new Error('Email Channel Account not found.');
    }

    const emailConfig = account.emailConfig;
    const transporter = this.getTransporter(emailConfig);

    const fromAddress = `"${fromLabel || emailConfig.senderLabel || 'UniVerse'}" <${emailConfig.fromEmail || emailConfig.smtpUser}>`;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text: text || '',
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, recipient: to };
  }

  /**
   * Send Test Email
   */
  async sendTestEmail(accountId, targetEmail) {
    const account = await ChannelAccount.findById(accountId);
    if (!account || account.type !== 'email') {
      throw new Error('Email Channel Account not found.');
    }

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="color: #ef4123; margin-top: 0;">🚀 UniVerse SMTP Connection Verified</h2>
        <p>This is a live test email sent from <strong>${account.nickname}</strong> (&lt;${account.emailConfig.fromEmail}&gt;).</p>
        <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border-left: 4px solid #10b981; margin: 1.5rem 0;">
          <p style="margin: 0; font-size: 0.9rem;"><strong>Status:</strong> 🟢 Operational & Ready for Broadcasts</p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 0;">UniVerse Campus Operations Engine • SuperAdmin Delivery Suite</p>
      </div>
    `;

    return this.sendEmail(accountId, {
      to: targetEmail,
      subject: `[Test] UniVerse SMTP Verified (${account.nickname})`,
      html: testHtml
    });
  }
}

const emailMultiAccountService = new EmailMultiAccountService();
module.exports = emailMultiAccountService;
