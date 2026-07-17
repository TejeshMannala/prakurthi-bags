// Production-grade email helper.
// Features: NO pooling (direct connections — reliable on Render cold starts),
// 3x retry with backoff, port fallback (587→465), in-memory queue with retry,
// classified failures (SMTP / AUTH / NETWORK / TIMEOUT / MISSING_ENV),
// and structured logging. Never throws to the caller — email must not break
// the surrounding flow (e.g. an order still succeeds if the receipt fails).

const nodemailer = require('nodemailer');

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000; // ms, exponential backoff base

let cachedTransporter = null;
let verificationState = { ok: null, reason: null, at: 0 };
const VERIFY_TTL = 5 * 60 * 1000; // re-verify at most once per 5 minutes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getCredentials = () => ({
  user: process.env.SMTP_USER || process.env.EMAIL_USER,
  pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
});

const createTransporter = (portOverride) => {
  if (cachedTransporter && !portOverride) return cachedTransporter;
  const { user, pass, host } = getCredentials();
  const port = portOverride || getCredentials().port;
  if (!user || !pass || /YOUR_|your_/.test(pass)) return null;

  // No pooling — direct connections are more reliable for transactional
  // email on Render free tier cold starts. Pooled connections go stale
  // during the 15-min idle window and fail with NETWORK_ERROR.
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    // Significantly longer timeouts for Render free tier cold starts
    // (backend wakes from sleep → DNS resolution → TCP → SMTP handshake)
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
  console.log(`[mailer] Transporter created: ${host}:${port} (secure=${port === 465})`);
  return cachedTransporter;
};

// Destroy cached transporter so next send creates a fresh connection.
// Called on NETWORK_ERROR to avoid reusing a dead socket.
const destroyTransporter = () => {
  if (cachedTransporter) {
    try { cachedTransporter.close(); } catch {}
    cachedTransporter = null;
    verificationState = { ok: null, reason: null, at: 0 };
  }
};

// Classify a low-level SMTP/network error into a stable reason code.
const classify = (err) => {
  const msg = (err && err.message) || '';
  const code = err?.code || '';
  if (/ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNRESET|getaddrinfo|network|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH/i.test(msg) ||
      code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'NETWORK_ERROR';
  }
  if (/timeout|TIMED_OUT/i.test(msg)) return 'TIMEOUT';
  if (/auth|535|incorrect authentication|username and password not accepted|bad sequence|534|5\.7\.9|Invalid login/i.test(msg)) {
    return 'AUTH_ERROR';
  }
  return 'SMTP_ERROR';
};

const verifyTransporter = async (portOverride) => {
  const now = Date.now();
  if (!portOverride && verificationState.ok !== null && now - verificationState.at < VERIFY_TTL) {
    return { ok: verificationState.ok, reason: verificationState.reason };
  }
  const { user, pass } = getCredentials();
  const transporter = createTransporter(portOverride);
  if (!transporter) {
    const reason = !user || !pass ? 'MISSING_ENV' : 'AUTH_ERROR';
    verificationState = { ok: false, reason, at: now };
    return { ok: false, reason };
  }
  try {
    await transporter.verify();
    verificationState = { ok: true, reason: null, at: now };
    return { ok: true, reason: null };
  } catch (err) {
    const reason = classify(err);
    if (!portOverride) {
      verificationState = { ok: false, reason, at: now };
    }
    console.error(`[mailer] SMTP verify failed (${reason}) on port ${getCredentials().port}${portOverride ? '→' + portOverride : ''}:`, err.code || '', err.message || err);
    return { ok: false, reason };
  }
};

const logReason = (reason) => {
  const { host, port, user } = getCredentials();
  switch (reason) {
    case 'MISSING_ENV':
      console.error('[mailer] EMAIL NOT CONFIGURED — set SMTP_USER and SMTP_PASS (or EMAIL_USER and EMAIL_PASS) in Render dashboard env vars.');
      console.error('[mailer] For Gmail: use a 16-char App Password from https://myaccount.google.com/apppasswords');
      console.error('[mailer] Required env vars: SMTP_HOST (default: smtp.gmail.com), SMTP_PORT (default: 587), SMTP_USER (your email), SMTP_PASS (app password)');
      break;
    case 'AUTH_ERROR':
      console.error('[mailer] SMTP AUTHENTICATION ERROR — verify SMTP_USER/SMTP_PASS. For Gmail use a 16-char App Password, not the account password.');
      break;
    case 'NETWORK_ERROR':
      console.error(`[mailer] SMTP NETWORK ERROR — cannot reach ${host}:${port}. Possible causes: Render cold start, DNS blocked, firewall, or SMTP port blocked.`);
      console.error('[mailer] If using Gmail, try port 465 (SSL) instead of 587 (STARTTLS). Set SMTP_PORT=465 in Render env vars.');
      break;
    case 'TIMEOUT':
      console.error(`[mailer] SMTP TIMEOUT — ${host}:${port} responded too slowly.`);
      break;
    default:
      console.error('[mailer] SMTP ERROR — generic failure while sending.');
  }
};

// Send a single email with retry + backoff + port fallback. Returns { ok, reason }.
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) return { ok: false, reason: 'INVALID_RECIPIENT' };

  const verification = await verifyTransporter();
  if (!verification.ok) {
    logReason(verification.reason);

    // Port fallback: if NETWORK_ERROR on port 587, try port 465 (SSL)
    if (verification.reason === 'NETWORK_ERROR' && getCredentials().port === 587) {
      console.log('[mailer] Attempting port fallback: 587 (STARTTLS) → 465 (SSL)');
      destroyTransporter();
      const fallback = await verifyTransporter(465);
      if (fallback.ok) {
        verificationState = { ok: true, reason: null, at: Date.now() };
        // Proceed with port 465 transporter
      } else {
        return { ok: false, reason: verification.reason };
      }
    } else {
      return { ok: false, reason: verification.reason };
    }
  }

  const transporter = cachedTransporter;
  const { user } = getCredentials();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: `"Prakruthi Bags" <${user}>`,
        to,
        subject,
        html,
        text,
      });
      return { ok: true, reason: null };
    } catch (err) {
      const reason = classify(err);
      console.error(`[mailer] send attempt ${attempt}/${MAX_RETRIES} failed (${reason}):`, err.code || '', err.message || err);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * 2 ** (attempt - 1); // 1s, 2s, 4s
        console.log(`[mailer] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        logReason(reason);
        // Force re-verify next time (SMTP session may be dead after cold start).
        destroyTransporter();
        return { ok: false, reason };
      }
    }
  }
  return { ok: false, reason: 'SMTP_ERROR' };
};

// Fire-and-forget wrapper used by non-critical mail (order receipts, etc.).
// Returns true/false without throwing.
const sendEmailSafe = async (opts) => {
  const result = await sendEmail(opts);
  return result.ok;
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

    return await sendEmailSafe({ to: email, subject: `Order Confirmed - ${order.orderId || order._id}`, html });
  } catch {
    return false;
  }
};

module.exports = { sendEmail, sendEmailSafe, sendOrderReceipt, verifyTransporter };
