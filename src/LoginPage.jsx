import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Mail, Key, Users, Check } from 'lucide-react';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';

export default function LoginPage({ onLogin, onRegister, authError }) {
  const { toasts, removeToast, showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', referralId: '' });
  const [resetForm, setResetForm] = useState({ email: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Get referral ID from URL on component mount
  useEffect(() => {
    const match = window.location.pathname.match(/\/invite\/([A-Z0-9]+)/);
    if (match) {
      const code = match[1];
      setReferralCode(code);
      setRegisterForm(prev => ({ ...prev, referralId: code }));
      // ✅ Переключаем на форму регистрации при наличии реферального кода
      setIsLogin(false);
    }
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage('Password reset instructions have been sent to your email');
      } else {
        setResetMessage(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setResetMessage('Network error. Please try again.');
    }
    setResetLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      showError('Please agree to the Terms of Service');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowVerificationModal(true);
      } else {
        showError(data.error || 'Registration failed');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: registerForm.email, 
          code: verificationCode 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowVerificationModal(false);
        
        // Check if token is returned (auto-login)
        if (data.token && data.user) {
          console.log('Auto-login after email verification');
          // Set token and user data directly to localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('currentPage', 'dashboard');
          showSuccess('Email verified successfully! Welcome to your dashboard!');
          // Reload page to trigger InvestorDashboard to pick up new auth data
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          // Fallback to manual login
          setIsLogin(true);
          // Заполняем email в форме логина
          setLoginForm({ email: registerForm.email, password: '' });
          showSuccess('Registration successful! Please login with your credentials.');
        }
        
        // Очищаем форму регистрации
        setRegisterForm({ name: '', email: '', password: '', referralId: '' });
        setVerificationCode('');
      } else {
        setVerificationError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setVerificationError('Network error. Please try again.');
    }
    setVerificationLoading(false);
  };

  return (
    <div className="min-h-screen glass-bg flex items-center justify-center p-4">
      <div className="glass-modal p-8 w-full max-w-md rounded-2xl">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center logo-glow">
            <div className="w-6 h-6 bg-black rounded-sm"></div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-8">Investor Cabinet</h1>
        {referralCode && (
          <div className="text-center mb-6">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-orange-400 text-sm">
                You were invited by referral code: <strong>{referralCode}</strong>
              </p>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {isLogin ? (
            <form onSubmit={e => { e.preventDefault(); onLogin(loginForm); }} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input type="email" className="w-full glass-input px-4 py-3 text-white focus:outline-none" placeholder="Enter your email" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} className="w-full glass-input px-4 py-3 pr-12 text-white focus:outline-none" placeholder="Enter your password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {authError && <div className="text-red-400 text-sm">{authError}</div>}
              <button type="submit" className="w-full glass-button text-white font-semibold py-3 rounded-lg" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
              <div className="text-center">
                <button type="button" className="text-orange-400 hover:text-orange-300 text-sm" onClick={() => setShowResetPassword(true)}>
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full glass-input pl-10 pr-4 py-3 text-white focus:outline-none" 
                    placeholder="Enter your name" 
                    value={registerForm.name} 
                    onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="email" 
                    className="w-full glass-input pl-10 pr-4 py-3 text-white focus:outline-none" 
                    placeholder="Enter your email" 
                    value={registerForm.email} 
                    onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full glass-input pl-10 pr-12 py-3 text-white focus:outline-none" 
                    placeholder="Enter your password" 
                    value={registerForm.password} 
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} 
                    required 
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Referral ID (Optional)
                  {referralCode && (
                    <span className="text-green-400 text-xs ml-2">✓ Auto-filled from invite link</span>
                  )}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    className={`w-full glass-input pl-10 pr-4 py-3 text-white focus:outline-none ${referralCode ? 'border-green-500/50 bg-green-500/10' : ''}`}
                    placeholder="Enter referral code or leave empty" 
                    value={registerForm.referralId} 
                    onChange={e => setRegisterForm(f => ({ ...f, referralId: e.target.value }))} 
                  />
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    agreedToTerms 
                      ? 'bg-orange-500 border-orange-500' 
                      : 'border-gray-400 hover:border-orange-400'
                  }`}
                >
                  {agreedToTerms && <Check className="w-3 h-3 text-white" />}
                </button>
                <label className="text-gray-400 text-sm leading-relaxed">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={() => window.open('/terms-of-service', '_blank')}
                    className="text-orange-400 hover:text-orange-300 underline"
                  >
                    Terms of Service
                  </button>
                </label>
              </div>
              {authError && <div className="text-red-400 text-sm">{authError}</div>}
              <button type="submit" className="w-full glass-button text-white font-semibold py-3 rounded-lg" disabled={loading || !agreedToTerms}>
                {loading ? 'Registering...' : 'Register'}
              </button>
            </form>
          )}
          <div className="text-center space-y-2">
            <button type="button" className="text-orange-400 hover:text-orange-300 text-sm" onClick={() => setIsLogin(l => !l)}>
              {isLogin ? 'No account? Register' : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass-modal p-8 w-full max-w-md rounded-2xl">
            <div className="flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center logo-glow">
                <div className="w-6 h-6 bg-black rounded-sm"></div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">Reset password</h1>
            <div className="text-gray-400 text-sm text-center mb-6">
              For security purposes, no withdrawals are permitted for 24 hours after modification of security methods.
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                  placeholder="Enter your email for recovery" 
                  value={resetForm.email} 
                  onChange={e => setResetForm(f => ({ ...f, email: e.target.value }))} 
                  required 
                />
              </div>
              {resetMessage && (
                <div className={`text-sm ${resetMessage.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>
                  {resetMessage}
                </div>
              )}
              <button 
                type="submit" 
                className="w-full glass-button text-white font-semibold py-3 rounded-lg" 
                disabled={resetLoading}
              >
                {resetLoading ? 'Sending...' : 'Reset password'}
              </button>
              <button 
                type="button" 
                className="w-full text-orange-400 hover:text-orange-300 text-sm py-2" 
                onClick={() => setShowResetPassword(false)}
              >
                Go back to login
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Email Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="glass-modal p-8 w-full max-w-md rounded-2xl">
            <div className="flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center logo-glow">
                <div className="w-6 h-6 bg-black rounded-sm"></div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-4">Verify Your Email</h1>
            <div className="text-gray-400 text-sm text-center mb-6">
              We've sent a verification code to <span className="text-orange-400">{registerForm.email}</span>
            </div>
            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Verification Code</label>
                <input 
                  type="text" 
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none text-center text-lg tracking-widest" 
                  placeholder="Enter 6-digit code" 
                  value={verificationCode} 
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  maxLength={6}
                  required 
                />
              </div>
              {verificationError && (
                <div className="text-red-400 text-sm text-center">
                  {verificationError}
                </div>
              )}
              <button 
                type="submit" 
                className="w-full glass-button text-white font-semibold py-3 rounded-lg" 
                disabled={verificationLoading || verificationCode.length !== 6}
              >
                {verificationLoading ? 'Verifying...' : 'Verify Email'}
              </button>
              <button 
                type="button" 
                className="w-full text-orange-400 hover:text-orange-300 text-sm py-2" 
                onClick={() => setShowVerificationModal(false)}
              >
                Go back to registration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
} 