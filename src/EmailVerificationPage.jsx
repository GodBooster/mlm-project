import React, { useState, useEffect, useRef } from 'react';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

export default function EmailVerificationPage({ onLogin }) {
  const { toasts, removeToast, showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [willAutoLogin, setWillAutoLogin] = useState(false);
  const isExecutedRef = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent double execution in React StrictMode
      if (isExecutedRef.current) {
        console.log('[EmailVerification] Skipping duplicate execution (React StrictMode)');
        return;
      }
      isExecutedRef.current = true;
      
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('No verification token found in URL');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/verify-email-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (res.ok) {
          setVerified(true);
          
          // Check if this was already processed by another request
          if (data.alreadyProcessed) {
            showSuccess('Email verification already completed! Please log in manually.');
            setWillAutoLogin(false);
            // Don't auto-login since we don't have user data
          } else {
            showSuccess('Email verified successfully! You are now logged in.');
            setWillAutoLogin(true);
            
            // Auto-login user
            if (data.token && data.user && onLogin) {
              setTimeout(() => {
                onLogin({ 
                  token: data.token, 
                  user: data.user 
                });
              }, 2000);
            }
          }
        } else {
          setError(data.error || 'Verification failed');
          showError(data.error || 'Verification failed');
        }
      } catch (error) {
        setError('Network error occurred');
        showError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
    
    // Cleanup function
    return () => {
      // Reset the ref if component unmounts (though unlikely in this case)
      // isExecutedRef.current = false;
    };
  }, [onLogin, showError, showSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 flex items-center justify-center p-4">
        <div className="glass-modal p-8 w-full max-w-md rounded-2xl text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-white mb-4">Verifying Email...</h1>
          <p className="text-gray-400">
            Please wait while we verify your email address.
          </p>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 flex items-center justify-center p-4">
        <div className="glass-modal p-8 w-full max-w-md rounded-2xl text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Email Verified!</h1>
          <p className="text-gray-400 mb-6">
            Your email has been successfully verified.
          </p>
          <div className="text-sm text-green-400">
            {willAutoLogin ? 'Redirecting to dashboard...' : 'Please go to login page to continue.'}
          </div>
          {!willAutoLogin && (
            <button 
              onClick={() => window.location.href = '/'}
              className="glass-button text-white px-6 py-3 rounded-lg mt-4"
            >
              Go to Login
            </button>
          )}
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 flex items-center justify-center p-4">
      <div className="glass-modal p-8 w-full max-w-md rounded-2xl text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl">✕</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Verification Failed</h1>
        <p className="text-gray-400 mb-6">
          {error || 'Unable to verify your email address. The link may be invalid or expired.'}
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="glass-button text-white px-6 py-3 rounded-lg"
        >
          Go to Login
        </button>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
