import React from 'react';
import InvestorDashboard from './InvestorDashboard';
import AdminDashboard from './AdminDashboard';
import EmailVerified from './EmailVerified';
import ResetPasswordPage from './ResetPasswordPage';
import EmailVerificationPage from './EmailVerificationPage';
import TermsOfServicePage from './TermsOfServicePage';

function App() {
  // Check if user is accessing admin route
  const pathname = window.location.pathname;
  
  // Check for reset password route
  if (pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }
  
  // Check for email verification route
  if (pathname === '/verify') {
    return <EmailVerificationPage onLogin={(authData) => {
      // Store login data and redirect to dashboard
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
      localStorage.setItem('currentPage', 'dashboard'); // Ensure we go to dashboard
      // Force page reload to ensure InvestorDashboard loads with new auth data
      setTimeout(() => {
        window.location.href = '/';
      }, 100); // Small delay to ensure localStorage is written
    }} />;
  }
  
  // Check for terms of service route
  if (pathname === '/terms-of-service') {
    return <TermsOfServicePage />;
  }
  
  if (pathname.startsWith('/admin')) {
    return <AdminDashboard />;
  }
  if (pathname === '/email-verified') {
    return <EmailVerified />;
  }
  return <InvestorDashboard />;
}

export default App; 