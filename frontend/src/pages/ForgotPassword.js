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

  // OTP timer — 10 minutes (600s)
  const [timer, setTimer] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = useCallback(() => {
    setTimer(600);
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

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
      setStep(2);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!canResend) return;
    setError('');
    setMessage('');
    setOtp('');
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email });
      setMessage(data.message);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    }
  };

  // Step 2: Verify OTP on server then go to new password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { email, otp });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed.');
      if (err.response?.data?.message?.toLowerCase().includes('expired')) {
        setCanResend(true);
        setTimer(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password (Step 5: Expiration Check & Reset Finalization)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      setMessage(data.message);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Entry + Timer */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <label>OTP Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
              />
            </div>

            {/* Step 4: Client Control Timer Logic */}
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
                disabled={!canResend}
                onClick={handleResend}
              >
                Resend OTP
              </button>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
              {loading ? 'Verifying…' : 'Verify OTP'}
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
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Resetting…' : 'Reset Password'}
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
    </div>
  );
};

export default ForgotPassword;
