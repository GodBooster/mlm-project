import React from 'react';
import InvestorDashboard from './InvestorDashboard';
import AdminDashboard from './AdminDashboard';

function App() {
  // Check if user is accessing admin route
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    return <AdminDashboard />;
  }
  
  return <InvestorDashboard />;
}

export default App;