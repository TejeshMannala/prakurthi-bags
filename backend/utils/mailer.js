// Shared email helper. Never throws — email failures must not break the
// calling flow (e.g. an order must still succeed if receipt mail fails).
const nodemailer = require('nodemailer');

let cachedTransporter = null;

const createTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (!user || !pass || /YOUR_|your_/.test(pass)) return null;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return cachedTransporter;
};

// Verifies the SMTP connection once. Returns { ok, reason, error }.
const verifyTransporter = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    if (!user || !pass) {
      return { ok: false, reason: 'MISSING_ENV', error: new Error('SMTP credentials are not set (SMTP_USER / SMTP_PASS).') };
    }
    return { ok: false, reason: 'AUTH_ERROR', error: new Error('SMTP credentials contain placeholder values.') };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    const msg = err.message || '';
    let reason = 'SMTP_ERROR';
    if (/ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNRESET|getaddrinfo|network/i.test(msg) || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      reason = 'NETWORK_ERROR';
    } else if (/timeout/i.test(msg)) {
      reason = 'TIMEOUT';
    } else if (/auth|535|incorrect authentication|username and password not accepted|bad sequence/i.test(msg)) {
      reason = 'AUTH_ERROR';
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[mailer] SMTP verify failed (${reason}):`, msg);
    }
    return { ok: false, reason, error: err };
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  const verification = await verifyTransporter();
  if (!verification.ok) {
    const reason = verification.reason;
    if (reason === 'MISSING_ENV') {
      console.error('[mailer] EMAIL NOT CONFIGURED — set SMTP_USER and SMTP_PASS in environment.');
    } else if (reason === 'AUTH_ERROR') {
      console.error('[mailer] SMTP AUTHENTICATION ERROR — check SMTP_USER / SMTP_PASS (use a Gmail App Password).');
    } else if (reason === 'NETWORK_ERROR') {
      console.error('[mailer] SMTP NETWORK ERROR — cannot reach mail server (DNS/connection blocked).');
    } else if (reason === 'TIMEOUT') {
      console.error('[mailer] SMTP TIMEOUT — mail server responded too slowly.');
    } else {
      console.error('[mailer] SMTP ERROR —', verification.error?.message || 'unknown');
    }
    return false;
  }
  if (!to) return false;
  try {
    await transporter.sendMail({
      from: `"Prakruthi Bags" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    const msg = err.message || '';
    if (/ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNRESET|getaddrinfo|network/i.test(msg) || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      console.error('[mailer] NETWORK ERROR while sending:', msg);
    } else if (/timeout/i.test(msg)) {
      console.error('[mailer] TIMEOUT while sending:', msg);
    } else if (/auth|535|incorrect authentication|username and password not accepted/i.test(msg)) {
      console.error('[mailer] AUTHENTICATION ERROR while sending:', msg);
    } else {
      console.error('[mailer] send failed:', msg);
    }
    return false;
  }
};

const sendOrderReceipt = async (order, payment) => {
  try {
    const email = order.shippingAddress?.email || order.user?.email;
    if (!email) return false;

    const items = (order.products || []).map((it) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${it.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${Number(it.price).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" style="width:100%;max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr><td style="background:#2E5A44;padding:24px 32px"><h1 style="margin:0;color:#fff;font-size:22px">Prakruthi Bags</h1>
        <p style="margin:4px 0 0;color:#A3C9A8;font-size:13px">Payment Successful</p></td></tr>
        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a">Hi ${order.shippingAddress?.fullName || order.user?.name || 'Customer'},</p>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6">Thank you for your order. Your payment was received successfully.</p>
          <div style="background:#f0f7f1;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#1a3a2a">
            <div><strong>Order:</strong> ${order.orderId || order._id}</div>
            <div><strong>Payment ID:</strong> ${payment?.paymentId || '-'}</div>
            <div><strong>Transaction ID:</strong> ${payment?.transactionId || '-'}</div>
            <div><strong>Method:</strong> ${payment?.paymentMethod || order.paymentMethod}</div>
            <div><strong>Amount:</strong> ₹${Number(order.totalPrice).toLocaleString('en-IN')}</div>
          </div>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;color:#333">
            <thead><tr style="background:#fafafa"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:center">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
            <tbody>${items}</tbody>
          </table>
          <div style="margin-top:16px;border-top:1px solid #eee;padding-top:12px;font-size:14px;color:#1a1a1a;text-align:right"><strong>Total: ₹${Number(order.totalPrice).toLocaleString('en-IN')}</strong></div>
          <p style="margin:20px 0 0;color:#888;font-size:12px">Estimated delivery: ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString('en-IN') : '7-10 business days'}</p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e8e8e8"><p style="margin:0;color:#999;font-size:11px;text-align:center">© ${new Date().getFullYear()} Prakruthi Bags. All rights reserved.</p></td></tr>
      </table></body></html>`;

    return await sendEmail({ to: email, subject: `Order Confirmed - ${order.orderId || order._id}`, html });
  } catch {
    return false;
  }
};

module.exports = { sendEmail, sendOrderReceipt };
