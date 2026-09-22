const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const whatsappMultiDeviceService = require('./whatsappMultiDeviceService');

const AUTHORIZED_EQUITY_EMAIL = 'parthsharma240404@gmail.com';
const AUTHORIZED_EQUITY_PHONE = '917985397373';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory OTP storage: { code, expiresAt, attempts }
let activeOtpRecord = null;

/**
 * Generate a secure 6-digit verification code and send to parthsharma240404@gmail.com & WhatsApp
 */
async function sendEquityVerificationOtp() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtpRecord = {
    code,
    email: AUTHORIZED_EQUITY_EMAIL,
    phone: AUTHORIZED_EQUITY_PHONE,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0
  };

  const subject = `🔒 [UniVerse Security] ${code} is your Cap Table & Equity Authorization Code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 2rem 1.5rem; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;">UniVerse Security Protocol</h1>
        <p style="margin: 0.5rem 0 0 0; color: #94a3b8; font-size: 0.85rem;">Cap Table & Partner Equity Authorization</p>
      </div>
      <div style="padding: 2rem 1.75rem;">
        <p style="margin: 0 0 1rem 0; font-size: 0.95rem; color: #334155; line-height: 1.5;">
          A request has been initiated to <strong>modify partner equity shares, cap table allocations, or execute profit distributions</strong> in the Super Admin panel.
        </p>
        <p style="margin: 0 0 1.5rem 0; font-size: 0.95rem; color: #334155; line-height: 1.5;">
          Use the 6-digit authorization code below to verify your identity and unlock equity management:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 1.25rem; text-align: center; margin-bottom: 1.5rem;">
          <span style="font-size: 2.2rem; font-weight: 900; letter-spacing: 0.25em; color: #ef4123; font-family: monospace;">${code}</span>
        </div>
        <p style="margin: 0; font-size: 0.8rem; color: #64748b; text-align: center;">
          ⏱️ This code expires in <strong>10 minutes</strong>. If you did not initiate this change, no modifications can be saved without this code.
        </p>
      </div>
      <div style="background: #f1f5f9; padding: 1rem 1.5rem; text-align: center; font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0;">
        UniVerse Campus Dining • Authorized for ${AUTHORIZED_EQUITY_EMAIL}
      </div>
    </div>
  `;

  console.log('\n======================================================');
  console.log(`🔐 [EQUITY 2FA SECURITY GATE]`);
  console.log(`📧 Recipient Email: ${AUTHORIZED_EQUITY_EMAIL}`);
  console.log(`📱 Recipient WhatsApp: +${AUTHORIZED_EQUITY_PHONE}`);
  console.log(`🔑 Verification Code: ${code}`);
  console.log(`⏱️ Expires in 10 minutes`);
  console.log('======================================================\n');

  // 1. Dispatch directly via WhatsApp to Parth Sharma (+91 7985397373)
  try {
    const waText = 
      `🔐 *UniVerse Security Verification*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `A request was initiated to modify *Partner Equity Shares or Profit Distributions*.\n\n` +
      `🔑 *Authorization Code:* *${code}*\n\n` +
      `⏱️ *Expires:* in 10 minutes.\n` +
      `🛡️ *Authorized Admin:* Parth Sharma\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_If you did not initiate this, no changes can be made without this code._`;

    whatsappMultiDeviceService.sendDirectMessage(AUTHORIZED_EQUITY_PHONE, waText).then(success => {
      if (success) console.log(`✅ Real WhatsApp 2FA code delivered to +${AUTHORIZED_EQUITY_PHONE}`);
    }).catch(waErr => {
      console.warn(`[WhatsApp 2FA Alert] Could not send via WhatsApp:`, waErr.message);
    });
  } catch (waErr) {
    console.warn(`[WhatsApp 2FA Dispatch Warning]:`, waErr.message);
  }

  // Attempt real email dispatch via ChannelAccount or SMTP config
  try {
    let transporter = null;
    let fromEmail = 'noreply@universeorder.co.in';

    // 1. Check if DB has an email ChannelAccount
    const emailAccount = await prisma.channelAccount.findFirst({
      where: { type: 'email', status: 'connected' }
    });

    if (emailAccount && emailAccount.emailConfig?.smtpPass) {
      const ec = emailAccount.emailConfig;
      fromEmail = ec.fromEmail || ec.smtpUser;
      transporter = nodemailer.createTransport({
        host: ec.smtpHost || 'smtp.gmail.com',
        port: ec.smtpPort || 587,
        secure: ec.smtpPort === 465,
        auth: { user: ec.smtpUser || ec.fromEmail, pass: ec.smtpPass },
        tls: { rejectUnauthorized: false }
      });
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // 2. Check process.env SMTP
      fromEmail = process.env.SMTP_USER;
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      });
    }

    if (transporter) {
      await transporter.sendMail({
        from: `"UniVerse Security" <${fromEmail}>`,
        to: AUTHORIZED_EQUITY_EMAIL,
        subject,
        html
      });
      console.log(`✅ Real email dispatched successfully to ${AUTHORIZED_EQUITY_EMAIL}`);
    } else {
      console.log(`ℹ️ [Email Dispatch] SMTP credentials not yet in .env; code is logged above and available for verification.`);
    }
  } catch (err) {
    console.error(`⚠️ [Email Dispatch Error]:`, err.message);
  }

  return {
    success: true,
    message: `Verification code sent to ${AUTHORIZED_EQUITY_EMAIL}`,
    targetEmail: AUTHORIZED_EQUITY_EMAIL
  };
}

/**
 * Verify 6-digit OTP and return a 30-minute scoped equity JWT session token
 */
function verifyEquityOtp(inputCode) {
  if (!activeOtpRecord) {
    return { success: false, error: 'No verification code was requested or code expired. Please request a new code.' };
  }

  if (Date.now() > activeOtpRecord.expiresAt) {
    activeOtpRecord = null;
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  activeOtpRecord.attempts += 1;
  if (activeOtpRecord.attempts > 5) {
    activeOtpRecord = null;
    return { success: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  const cleanInput = String(inputCode || '').trim();
  if (cleanInput !== activeOtpRecord.code) {
    return { success: false, error: 'Invalid verification code. Please check and try again.' };
  }

  // OTP is correct! Clear active OTP to prevent reuse
  activeOtpRecord = null;

  // Issue signed equity authorization token valid for 30 minutes
  const equityToken = jwt.sign(
    {
      scope: 'equity_management',
      authorizedEmail: AUTHORIZED_EQUITY_EMAIL,
      issuedAt: Date.now()
    },
    process.env.JWT_SECRET || 'universe-secret-key-123',
    { expiresIn: '30m' }
  );

  return {
    success: true,
    verified: true,
    token: equityToken,
    expiresIn: 1800,
    authorizedEmail: AUTHORIZED_EQUITY_EMAIL
  };
}

/**
 * Express middleware to verify equity authorization token
 */
function requireEquityAuth(req, res, next) {
  const token = req.headers['x-equity-auth'] || req.headers['x-equity-token'] || req.body?.equityToken;

  if (!token) {
    return res.status(403).json({
      success: false,
      require2FA: true,
      message: `Modifying equity shares or distributions requires 2FA email authorization. A verification code must be sent to ${AUTHORIZED_EQUITY_EMAIL}.`
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'universe-secret-key-123');
    if (decoded.scope !== 'equity_management') {
      return res.status(403).json({
        success: false,
        require2FA: true,
        message: 'Invalid equity authorization scope.'
      });
    }
    req.equityAuth = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      require2FA: true,
      message: 'Equity authorization session expired or invalid. Please re-verify via email code.'
    });
  }
}

module.exports = {
  AUTHORIZED_EQUITY_EMAIL,
  sendEquityVerificationOtp,
  verifyEquityOtp,
  requireEquityAuth
};
