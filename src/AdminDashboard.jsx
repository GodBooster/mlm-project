import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Package, Settings, LogOut, Eye, EyeOff, Search, Filter, Download } from 'lucide-react';
import AdminAddTransaction from './AdminAddTransaction';

// Card without transparency
const Card = ({ children, className = "" }) => (
  <div className={`bg-gray-900 shadow-lg rounded-2xl p-6 mb-6 ${className}`}>{children}</div>
);

const API = import.meta.env.VITE_API_URL;

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState('overview');
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  
  // State for editing packages
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    minAmount: '',
    monthlyYield: '',
    duration: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);

  // 1. Добавить состояния для модального окна профиля пользователя
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userInvestments, setUserInvestments] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editUserForm, setEditUserForm] = useState({
    username: '',
    email: '',
    avatar: '',
    wallet: '',
    emailVerified: false
  });

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, transactionsRes, packagesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${import.meta.env.VITE_API_URL}/api/admin/packages`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // Check response statuses
      if (!usersRes.ok) {
        console.error('Users response not ok:', usersRes.status, usersRes.statusText);
        throw new Error(`Failed to load users: ${usersRes.status}`);
      }
      if (!transactionsRes.ok) {
        console.error('Transactions response not ok:', transactionsRes.status, transactionsRes.statusText);
        throw new Error(`Failed to load transactions: ${transactionsRes.status}`);
      }
      if (!packagesRes.ok) {
        console.error('Packages response not ok:', packagesRes.status, packagesRes.statusText);
        throw new Error(`Failed to load packages: ${packagesRes.status}`);
      }

      const [usersData, transactionsData, packagesData] = await Promise.all([
        usersRes.json(),
        transactionsRes.json(),
        packagesRes.json()
      ]);

      console.log('Admin data loaded:', { usersData, transactionsData, packagesData });

      setUsers(Array.isArray(usersData) ? usersData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setUsers([]);
      setTransactions([]);
      setPackages([]);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setEditForm({
      name: pkg.name,
      minAmount: pkg.minAmount.toString(),
      monthlyYield: pkg.monthlyYield.toString(),
      duration: pkg.duration.toString(),
      isActive: pkg.isActive
    });
    setShowEditModal(true);
  };

  const handleSavePackage = async () => {
    setSaving(true);
    try {
      const url = editingPackage 
        ? `${import.meta.env.VITE_API_URL}/api/admin/packages/${editingPackage.id}`
        : `${import.meta.env.VITE_API_URL}/api/admin/packages`;
      
      const method = editingPackage ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (res.ok) {
        setShowEditModal(false);
        setEditingPackage(null);
        loadData(); // Reload data
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save package');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Failed to save package');
    }
    setSaving(false);
  };

  const handleDeletePackage = async (pkgId) => {
    if (!confirm('Are you sure you want to delete this package?')) {
      return;
    }
    
    setDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/packages/${pkgId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        loadData(); // Reload data
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    }
    setDeleting(false);
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    setEditForm({
      name: '',
      minAmount: '',
      monthlyYield: '',
      duration: '',
      isActive: true
    });
    setShowEditModal(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok && data.user?.isAdmin) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
      } else if (res.ok) {
        setLoginError('Not an admin account');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('Network error');
    }
    setLoggingIn(false);
  };

  // 2. Функция для открытия профиля пользователя
  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
    setLoadingProfile(true);
    try {
      // Получить инвестиции
      const invRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${user.id}/investments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let investments = [];
      if (invRes.ok) {
        investments = await invRes.json();
      }
      setUserInvestments(Array.isArray(investments) ? investments : []);
      // Получить транзакции
      const txRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${user.id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let transactions = [];
      if (txRes.ok) {
        transactions = await txRes.json();
      }
      setUserTransactions(Array.isArray(transactions) ? transactions : []);
    } catch {
      setUserInvestments([]);
      setUserTransactions([]);
    }
    setLoadingProfile(false);
  };

  const navigation = [
    { id: 'overview', icon: DollarSign, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'transactions', icon: Package, label: 'Transactions' },
    { id: 'packages', icon: Settings, label: 'Packages' },
    { id: 'logout', icon: LogOut, label: 'Logout' }
  ];

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalUsers: users.length,
    totalTransactions: transactions.length,
    totalVolume: transactions
      .filter(tx => tx.type === 'INVESTMENT')
      .reduce((sum, tx) => sum + Number(tx.amount), 0),
    pendingWithdrawals: transactions
      .filter(tx => tx.type === 'WITHDRAWAL' && tx.status === 'PENDING')
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900/20 via-gray-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
              disabled={loggingIn}
            >
              {loggingIn ? 'Logging in...' : 'Login as Admin'}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900/20 via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900/20 via-gray-900 to-black">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="flex relative z-10">
        {/* Sidebar */}
        <div className="fixed left-6 top-6 w-20 bg-gray-900 shadow-lg rounded-2xl p-4 flex-col items-center space-y-4 z-20">
          {/* Logo */}
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4 logo-glow">
            <div className="w-6 h-6 bg-black rounded-sm"></div>
          </div>
          {/* Navigation */}
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'logout') handleLogout();
                  else setCurrentPage(item.id);
                }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'text-white active' : 'text-gray-400 hover:text-white'}`}
                title={item.label}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-2 sm:p-6 sm:pl-32 pt-4 sm:pt-6 min-w-0">
          {/* Overview */}
          {currentPage === 'overview' && (
            <div className="space-y-6">
              <Card>
                <h3 className="text-xl font-semibold text-white mb-6">System Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900 shadow-lg rounded-2xl p-4 text-center">
                    <div className="text-gray-400 text-sm">Total Users</div>
                    <div className="text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
                  </div>
                  <div className="bg-gray-900 shadow-lg rounded-2xl p-4 text-center">
                    <div className="text-gray-400 text-sm">Total Transactions</div>
                    <div className="text-2xl font-bold text-green-400">{stats.totalTransactions}</div>
                  </div>
                  <div className="bg-gray-900 shadow-lg rounded-2xl p-4 text-center">
                    <div className="text-gray-400 text-sm">Total Volume</div>
                    <div className="text-2xl font-bold text-orange-400">${stats.totalVolume.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-900 shadow-lg rounded-2xl p-4 text-center">
                    <div className="text-gray-400 text-sm">Pending Withdrawals</div>
                    <div className="text-2xl font-bold text-yellow-400">${stats.pendingWithdrawals.toLocaleString()}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="text-xl font-semibold text-white mb-6">Recent Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-900/80">
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-3 px-3">Date</th>
                        <th className="text-left py-3 px-3">User</th>
                        <th className="text-left py-3 px-3">Type</th>
                        <th className="text-left py-3 px-3">Amount</th>
                        <th className="text-left py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 10).map((tx, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 px-3 text-gray-300">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-white">{tx.user?.email || 'Unknown'}</td>
                          <td className="py-2 px-3 text-orange-400">{tx.type}</td>
                          <td className="py-2 px-3 text-white">${Number(tx.amount).toFixed(2)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                              tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' :
                              'bg-red-900/20 text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Users */}
          {currentPage === 'users' && (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Users Management</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900/80">
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-3 px-3">ID</th>
                      <th className="text-left py-3 px-3">Username</th>
                      <th className="text-left py-3 px-3">Email</th>
                      <th className="text-left py-3 px-3">Balance</th>
                      <th className="text-left py-3 px-3">Rank</th>
                      <th className="text-left py-3 px-3">Joined</th>
                      <th className="text-left py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-300">{user.id}</td>
                        <td className="py-2 px-3 text-white">{user.username}</td>
                        <td className="py-2 px-3 text-white">{user.email}</td>
                        <td className="py-2 px-3 text-green-400">${user.balance?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-orange-400">{user.rank}</td>
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <button className="text-blue-400 hover:text-blue-300 text-sm" onClick={() => handleViewUser(user)}>View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Transactions */}
          {currentPage === 'transactions' && (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Transactions</h3>
                <button 
                  onClick={() => setShowAddTransactionModal(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Transaction
                </button>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900/80">
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-3 px-3">Date</th>
                      <th className="text-left py-3 px-3">User</th>
                      <th className="text-left py-3 px-3">Type</th>
                      <th className="text-left py-3 px-3">Amount</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-white">{tx.user?.email || 'Unknown'}</td>
                        <td className="py-2 px-3 text-orange-400">{tx.type}</td>
                        <td className="py-2 px-3 text-white">${Number(tx.amount).toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                            tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' :
                            'bg-red-900/20 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-300 max-w-[200px] truncate" title={tx.description}>
                          {tx.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Packages */}
          {currentPage === 'packages' && (
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Investment Packages</h3>
                <button 
                  onClick={handleAddPackage}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Package
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900/80">
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-3 px-3">ID</th>
                      <th className="text-left py-3 px-3">Name</th>
                      <th className="text-left py-3 px-3">Min Amount</th>
                      <th className="text-left py-3 px-3">Monthly Yield</th>
                      <th className="text-left py-3 px-3">Duration</th>
                      <th className="text-left py-3 px-3">Status</th>
                      <th className="text-left py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-300">{pkg.id}</td>
                        <td className="py-2 px-3 text-white">{pkg.name}</td>
                        <td className="py-2 px-3 text-green-400">${pkg.minAmount?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-orange-400">{pkg.monthlyYield}%</td>
                        <td className="py-2 px-3 text-gray-300">{pkg.duration} days</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            pkg.isActive ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                          }`}>
                            {pkg.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <button 
                            onClick={() => handleEditPackage(pkg)}
                            className="text-blue-400 hover:text-blue-300 text-sm mr-2"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Package Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingPackage ? 'Edit Package' : 'Add Package'}
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSavePackage(); }} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Min Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.minAmount}
                  onChange={(e) => setEditForm(f => ({ ...f, minAmount: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Monthly Yield (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.monthlyYield}
                  onChange={(e) => setEditForm(f => ({ ...f, monthlyYield: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-1">Duration (days)</label>
                <input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-gray-300">Active</label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPackage ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setShowAddTransactionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Add Transaction
            </h3>
            <AdminAddTransaction token={token} users={users} />
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-lg w-full relative">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">User Profile</h3>
            <div className="mb-4 flex items-center gap-4">
              {selectedUser.avatar && (
                <img src={selectedUser.avatar} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-orange-500" />
              )}
              <div>
                <div className="text-gray-300 mb-1"><b>ID:</b> {selectedUser.id}</div>
                <div className="text-gray-300 mb-1"><b>Username:</b> {selectedUser.username}</div>
                <div className="text-gray-300 mb-1"><b>Email:</b> {selectedUser.email}</div>
                <div className="text-gray-300 mb-1"><b>Wallet Withdraw:</b> {selectedUser.wallet || '-'}</div>
                <div className="text-gray-300 mb-1"><b>Balance:</b> ${selectedUser.balance?.toFixed(2)}</div>
                <div className="text-gray-300 mb-1"><b>Rank:</b> {selectedUser.rankNumber || selectedUser.rank || '-'}</div>
                <div className="text-gray-300 mb-1"><b>Joined:</b> {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : '-'}</div>
                <div className="text-gray-300 mb-1"><b>Registered:</b> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}</div>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                onClick={() => setEditMode(true)}
              >
                Edit
              </button>
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
              {selectedUser.isBlocked ? (
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  onClick={async () => {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${selectedUser.id}/unblock`, {
                      method: 'PUT',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    await loadData();
                    setSelectedUser({ ...selectedUser, isBlocked: false });
                  }}
                >
                  Unblock
                </button>
              ) : (
                <button
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
                  onClick={async () => {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${selectedUser.id}/block`, {
                      method: 'PUT',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    await loadData();
                    setSelectedUser({ ...selectedUser, isBlocked: true });
                  }}
                >
                  Block
                </button>
              )}
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this user?')) {
                    await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${selectedUser.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    await loadData();
                    setShowProfileModal(false);
                  }
                }}
              >
                Delete
              </button>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Transaction History</h4>
            {loadingProfile ? (
              <div className="text-gray-400">Loading transactions...</div>
            ) : userInvestments.length === 0 && userTransactions.length === 0 ? (
              <div className="text-gray-400">No transactions.</div>
            ) : (
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Amount</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userInvestments.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-800">
                        <td className="py-1 px-2 text-gray-300">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="py-1 px-2 text-orange-400">{tx.type}</td>
                        <td className="py-1 px-2 text-green-400">${tx.amount?.toFixed(2)}</td>
                        <td className="py-1 px-2">
                          <span className={`px-2 py-1 rounded text-xs ${tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' : tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-red-900/20 text-red-400'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-gray-300">{tx.description}</td>
                      </tr>
                    ))}
                    {userTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-800">
                        <td className="py-1 px-2 text-gray-300">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="py-1 px-2 text-orange-400">{tx.type}</td>
                        <td className="py-1 px-2 text-green-400">${tx.amount?.toFixed(2)}</td>
                        <td className="py-1 px-2">
                          <span className={`px-2 py-1 rounded text-xs ${tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' : tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-red-900/20 text-red-400'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-gray-300">{tx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editMode && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-lg w-full relative">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-white mb-4">Edit User</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Отправить PUT запрос на backend
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${selectedUser.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify(editUserForm)
                });
                if (res.ok) {
                  const updated = await res.json();
                  setSelectedUser(updated);
                  setEditMode(false);
                  loadData();
                } else {
                  alert('Failed to update user');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={e => setEditUserForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Username</label>
                <input
                  type="text"
                  value={editUserForm.username}
                  onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Wallet</label>
                <input
                  type="text"
                  value={editUserForm.wallet}
                  onChange={e => setEditUserForm(f => ({ ...f, wallet: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={editUserForm.password || ''}
                  onChange={e => setEditUserForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="flex gap-4 items-center">
                <label className="text-gray-300">Email Verified</label>
                <input
                  type="checkbox"
                  checked={editUserForm.emailVerified}
                  onChange={e => setEditUserForm(f => ({ ...f, emailVerified: e.target.checked }))}
                />
                <label className="text-gray-300">Is Admin</label>
                <input
                  type="checkbox"
                  checked={editUserForm.isAdmin}
                  onChange={e => setEditUserForm(f => ({ ...f, isAdmin: e.target.checked }))}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 