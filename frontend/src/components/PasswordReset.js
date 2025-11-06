import React, { useState } from 'react';
import { sendPasswordReset, confirmPasswordReset, verifyResetCode } from '../services/api';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordReset(email);
      setMessage('Password reset email sent! Check your inbox.');
      setStep(2);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await verifyResetCode(resetCode);
      setMessage('Code verified! Enter your new password.');
      setStep(3);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await confirmPasswordReset(resetCode, newPassword);
      setMessage('Password reset successfully! You can now login with your new password.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">Reset Your Password</h4>
            </div>
            <div className="card-body">
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              {step === 1 && (
                <form onSubmit={handleSendResetEmail}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Enter your email address
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyCode}>
                  <div className="mb-3">
                    <label htmlFor="resetCode" className="form-label">
                      Enter the reset code from your email
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="resetCode"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      placeholder="Enter 6-digit code"
                    />
                    <div className="form-text">
                      Check your email for the password reset code
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-link w-100 mt-2"
                    onClick={() => setStep(1)}
                  >
                    Back to email entry
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">
                      Enter your new password
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength="6"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-link w-100 mt-2"
                    onClick={() => setStep(2)}
                  >
                    Back to code entry
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="text-center mt-3">
            <p>
              Remember your password?{' '}
              <a href="/login" className="text-decoration-none">
                Back to Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;