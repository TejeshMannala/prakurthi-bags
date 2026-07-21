import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/axios';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password, 4: done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Debounce guard to prevent rapid double-clicks
  const submittingRef = useRef(false);

  // OTP timer — 5 minutes (300s) to match the backend OTP_TTL_MS
  const [timer, setTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef(null);

  // OTP input refs for 6-box layout
  const otpRefs = useRef([]);

  const startTimer = useCallback(() => {
    setTimer(300);
    setCanResend(false);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // Step 1: Send OTP (with debounce guard)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message || 'OTP has been sent to your email. It expires in 5 minutes.');
      setStep(2);
      startTimer();
      // Focus first OTP box
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 404) {
        setError(msg || 'No account found with this email.');
      } else if (err.response?.status === 429) {
        setError(msg || 'Too many requests. Please wait a few minutes before trying again.');
      } else if (msg) {
        setError(msg);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Request timed out. Please check your connection and try again.');
      } else if (!err.response) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    setMessage('');
    setOtp('');
    // Clear OTP boxes
    otpRefs.current.forEach((ref) => { if (ref) ref.value = ''; });
    otpRefs.current[0]?.focus();
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message || 'OTP has been resent. It expires in 5 minutes.');
      startTimer();
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) {
        setError(msg || 'Too many requests. Please wait before resending.');
      } else if (msg) {
        setError(msg);
      } else if (!err.response) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  // Handle OTP input change with auto-advance
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste — fill multiple boxes
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = otp.split('');
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
        if (otpRefs.current[index + i]) {
          otpRefs.current[index + i].value = digits[i];
        }
      }
      const filledOtp = newOtp.join('').slice(0, 6);
      setOtp(filledOtp);
      // Focus the next empty box or the last one
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = otp.split('');
    newOtp[index] = value;
    const filledOtp = newOtp.join('');
    setOtp(filledOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace to go to previous box
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste event
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = otp.split('');
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newOtp[i] = pasted[i];
      if (otpRefs.current[i]) {
        otpRefs.current[i].value = pasted[i];
      }
    }
    setOtp(newOtp.join(''));
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Step 2: Verify OTP on server then go to new password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      submittingRef.current = false;
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { email, otp });
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) {
        setError(msg || 'Too many failed attempts. Please request a new OTP.');
        setCanResend(true);
        setTimer(0);
      } else if (msg) {
        setError(msg);
      } else {
        setError('OTP verification failed. Please try again.');
      }
      if (err.response?.data?.errorCode === 'OTP_EXPIRED') {
        setCanResend(true);
        setTimer(0);
      }
      if (err.response?.data?.errorCode === 'OTP_LOCKED') {
        setCanResend(true);
        setTimer(0);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      submittingRef.current = false;
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      submittingRef.current = false;
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        email,
        newPassword,
      });
      setMessage(data.message);
      setStep(4);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg) {
        setError(msg);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          {step === 1 && 'Enter your registered email to receive an OTP.'}
          {step === 2 && 'Enter the 6-digit OTP sent to your email.'}
          {step === 3 && 'Choose a new password for your account.'}
          {step === 4 && 'Your password has been updated successfully.'}
        </p>

        {error && <div className="alert-banner error">{error}</div>}
        {message && <div className="alert-banner info">{message}</div>}

        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: 12, position: 'relative' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="otp-spinner" />
                  Sending…
                </span>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry + Timer */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <label>OTP Code</label>
              <div className="otp-boxes" onPaste={handleOtpPaste}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="otp-box"
                    value={otp[i] || ''}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    autoFocus={i === 0}
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="otp-timer">
              {timer > 0 ? (
                <>
                  <span>Resend in</span>
                  <span className="timer">{formatTime(timer)}</span>
                </>
              ) : (
                <span>OTP expired.</span>
              )}
              <button
                type="button"
                className="resend-btn"
                disabled={!canResend || resending}
                onClick={handleResend}
              >
                {resending ? 'Sending…' : 'Resend OTP'}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || otp.length !== 6}
              style={{ width: '100%', marginTop: 20, position: 'relative' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="otp-spinner" />
                  Verifying…
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="input-group">
              <label>New Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: 12, position: 'relative' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="otp-spinner" />
                  Resetting…
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ marginBottom: 24, color: '#2E5A44', fontWeight: 600 }}>
              Your password has been reset successfully.
            </p>
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          </div>
        )}

        <div className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>

      <style>{`
        @keyframes otpSpin { to { transform: rotate(360deg); } }
        .otp-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: otpSpin 0.6s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        .otp-boxes {
          display: flex;
          gap: 8px;
          justify-content: center;
        }
        .otp-box {
          width: 48px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: #fafafa;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'SF Mono', 'Fira Code', monospace;
          caret-color: #1B5E20;
        }
        .otp-box:focus {
          border-color: #1B5E20;
          box-shadow: 0 0 0 3px rgba(27, 94, 32, 0.1);
          background: #fff;
        }
        @media (max-width: 480px) {
          .otp-box { width: 42px; height: 50px; font-size: 20px; }
        }
        @media (max-width: 360px) {
          .otp-boxes { gap: 5px; }
          .otp-box { width: 38px; height: 46px; font-size: 18px; border-radius: 10px; }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
