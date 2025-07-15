import React from 'react';
import InvestorDashboard from './InvestorDashboard';
import AdminDashboard from './AdminDashboard';
import EmailVerified from './EmailVerified';

function App() {
  // Check if user is accessing admin route
  const pathname = window.location.pathname;
  if (pathname.startsWith('/admin')) {
    return <AdminDashboard />;
  }
  if (pathname === '/email-verified') {
    return <EmailVerified />;
  }
  return <InvestorDashboard />;
}

export default App; 