import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Package, Settings, LogOut, Eye, EyeOff, Search, Filter, Download, Plus } from 'lucide-react';
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
  
  // 2FA states
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  
  // 2FA setup states
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrCode, setTwoFactorQrCode] = useState('');
  const [setupVerificationCode, setSetupVerificationCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [settingUpTwoFactor, setSettingUpTwoFactor] = useState(false);
  
  // 2FA status states
  const [currentUser, setCurrentUser] = useState(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disableError, setDisableError] = useState('');
  
  // State for editing packages
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    minAmount: '',
    maxAmount: '',
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

  // State for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyTransactions, setHistoryTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Найти место, где блок Recent Transactions:
  // <Card>
  //   <h3 className="text-xl font-semibold text-white mb-6">Recent Transactions</h3>
  //   ...
  // </Card>
  // --- заменяем на:
  const [selectedWithdrawals, setSelectedWithdrawals] = useState([]);
  const [batchApproving, setBatchApproving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Investment management states
  const [investmentActionLoading, setInvestmentActionLoading] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [investmentAction, setInvestmentAction] = useState(''); // 'disable' or 'enable'
  const [investmentReason, setInvestmentReason] = useState('');

  // Фильтруем заявки на вывод:
  // Было:
  // const withdrawals = transactions.filter(tx => tx.type === 'WITHDRAWAL' && tx.status === 'PENDING');
  // Стало:
  const withdrawals = transactions.filter(
    tx => tx.type === 'WITHDRAWAL' && (tx.status === 'PENDING' || tx.status === 'CHECK')
  );
  const allSelected = withdrawals.length > 0 && selectedWithdrawals.length === withdrawals.length;

  function extractWallet(description) {
    // Ожидается формат 'Withdrawal to {wallet}'
    if (!description) return '';
    const match = description.match(/Withdrawal to (.+)/);
    return match ? match[1] : '';
  }
  function toggleSelect(id) {
    setSelectedWithdrawals(selectedWithdrawals =>
      selectedWithdrawals.includes(id)
        ? selectedWithdrawals.filter(x => x !== id)
        : [...selectedWithdrawals, id]
    );
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedWithdrawals([]);
    else setSelectedWithdrawals(withdrawals.map(tx => tx.id));
  }
  async function handleApprove(id) {
    setActionLoadingId(id);
    await fetch(`${API}/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    setActionLoadingId(null);
    await loadData();
    console.log('withdrawals:', withdrawals);
    console.log('transactionsData:', transactions);
  }
  async function handleReject(id) {
    setActionLoadingId(id);
    await fetch(`${API}/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    setActionLoadingId(null);
    await loadData();
    console.log('withdrawals:', withdrawals);
    console.log('transactionsData:', transactions);
  }
  async function handleHold(id) {
    // Просто меняем статус на HOLD (если потребуется, реализовать на backend)
    console.log('Hold action not implemented yet'); // TODO: Add toast notification
  }
  async function handleCheck(id) {
    setActionLoadingId(id);
    await fetch(`${API}/api/admin/withdrawals/${id}/check`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    setActionLoadingId(null);
    await loadData();
    console.log('withdrawals:', withdrawals);
    console.log('transactionsData:', transactions);
  }
  async function handleBatchApprove() {
    setBatchApproving(true);
    // TODO: реализовать batch approve на backend, пока по одному
    for (const id of selectedWithdrawals) {
      await fetch(`${API}/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    setBatchApproving(false);
    setSelectedWithdrawals([]);
    await loadData();
    console.log('withdrawals:', withdrawals);
    console.log('transactionsData:', transactions);
  }

  // Добавить функцию handleBatchReject
  async function handleBatchReject() {
    setBatchApproving(true);
    for (const id of selectedWithdrawals) {
      await fetch(`${API}/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
    setBatchApproving(false);
    setSelectedWithdrawals([]);
    await loadData();
  }

  useEffect(() => {
    if (!token) return;
    loadData();
    fetchCurrentUser();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Очищаем кэш fetch (если есть)
      // await new Promise(r => setTimeout(r, 100)); // можно раскомментировать для форса
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
      console.log('transactionsData:', transactionsData);

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

  // Investment management functions
  const handleInvestmentAction = async (action, userId) => {
    setInvestmentAction(action);
    setShowInvestmentModal(true);
  };

  const confirmInvestmentAction = async () => {
    if (!investmentReason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    setInvestmentActionLoading(true);
    try {
      const endpoint = investmentAction === 'disable' 
        ? '/api/admin/investments/disable-user'
        : '/api/admin/investments/enable-user';

      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          reason: investmentReason
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${investmentAction === 'disable' ? 'Disabled' : 'Enabled'} ${result.disabledCount || result.enabledCount} investments: ${result.message}`);
        setShowInvestmentModal(false);
        setInvestmentReason('');
        await loadData(); // Reload data
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${investmentAction} investments`);
      }
    } catch (error) {
      console.error(`Error ${investmentAction}ing investments:`, error);
      alert(`Failed to ${investmentAction} investments`);
    }
    setInvestmentActionLoading(false);
  };

  const handleEditPackage = (pkg) => {
    setEditingPackage(pkg);
    setEditForm({
      name: pkg.name,
      minAmount: pkg.minAmount.toString(),
      maxAmount: pkg.maxAmount ? pkg.maxAmount.toString() : '',
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
        await loadData(); // Reload data
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
        await loadData(); // Reload data
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
    setTwoFactorError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.requiresTwoFactor) {
          // Нужен 2FA код
          setRequiresTwoFactor(true);
          setTempToken(data.tempToken);
        } else {
          // 2FA не требуется, сразу логиним
          setToken(data.token);
          localStorage.setItem('adminToken', data.token);
        }
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

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault();
    setVerifyingTwoFactor(true);
    setTwoFactorError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: twoFactorToken,
          tempToken: tempToken
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setRequiresTwoFactor(false);
        setTwoFactorToken('');
        setTempToken('');
      } else {
        setTwoFactorError(data.error || 'Invalid verification code');
      }
    } catch {
      setTwoFactorError('Network error');
    }
    
    setVerifyingTwoFactor(false);
  };

  const handleSetupTwoFactor = async () => {
    setSettingUpTwoFactor(true);
    setSetupError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/setup-2fa`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setTwoFactorSecret(data.secret);
        setTwoFactorQrCode(data.qrCode);
        setShowTwoFactorSetup(true);
      } else {
        setSetupError(data.error || 'Failed to setup 2FA');
      }
    } catch {
      setSetupError('Network error');
    }
    
    setSettingUpTwoFactor(false);
  };

  const handleVerifyTwoFactorSetup = async (e) => {
    e.preventDefault();
    setSettingUpTwoFactor(true);
    setSetupError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/verify-2fa-setup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: setupVerificationCode })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowTwoFactorSetup(false);
        setTwoFactorSecret('');
        setTwoFactorQrCode('');
        setSetupVerificationCode('');
        setTwoFactorEnabled(true);
        alert('2FA successfully enabled!');
      } else {
        setSetupError(data.error || 'Invalid verification code');
      }
    } catch {
      setSetupError('Network error');
    }
    
    setSettingUpTwoFactor(false);
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setDisabling2FA(true);
    setDisableError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/disable-2fa`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: disablePassword })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowDisable2FA(false);
        setDisablePassword('');
        setTwoFactorEnabled(false);
        alert('2FA successfully disabled!');
      } else {
        setDisableError(data.error || 'Failed to disable 2FA');
      }
    } catch {
      setDisableError('Network error');
    }
    
    setDisabling2FA(false);
  };

  const fetchCurrentUser = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setTwoFactorEnabled(user.twoFactorEnabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const handleShowHistory = async (user) => {
    setHistoryUser(user);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const txRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user/${user.id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let transactions = [];
      if (txRes.ok) {
        transactions = await txRes.json();
      }
      setHistoryTransactions(Array.isArray(transactions) ? transactions : []);
    } catch {
      setHistoryTransactions([]);
    }
    setLoadingHistory(false);
  };

  const navigation = [
    { id: 'overview', icon: DollarSign, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'transactions', icon: Package, label: 'Transactions' },
    { id: 'packages', icon: Settings, label: 'Packages' },
    { id: '2fa', icon: Settings, label: '2FA Setup' },
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

  const [editedWallets, setEditedWallets] = useState({});
  const [savingWalletId, setSavingWalletId] = useState(null);
  function handleWalletChange(userId, value) {
    setEditedWallets(prev => ({ ...prev, [userId]: value }));
  }
  async function saveWallet(userId) {
    if (editedWallets[userId] === undefined) return;
    setSavingWalletId(userId);
    await fetch(`${API}/api/admin/user/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ wallet: editedWallets[userId] })
    });
    setSavingWalletId(null);
    setEditedWallets(prev => { const copy = { ...prev }; delete copy[userId]; return copy; });
    await loadData(); // обязательно ждем обновления данных
  }

  const [walletModalUser, setWalletModalUser] = useState(null);
  const [walletModalValue, setWalletModalValue] = useState('');
  const [walletModalSaving, setWalletModalSaving] = useState(false);
  function openWalletModal(user) {
    setWalletModalUser(user);
    setWalletModalValue(user.wallet || '');
  }
  function closeWalletModal() {
    setWalletModalUser(null);
    setWalletModalValue('');
  }
  async function saveWalletModal() {
    if (!walletModalUser) return;
    setWalletModalSaving(true);
    await fetch(`${API}/api/admin/user/${walletModalUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ wallet: walletModalValue })
    });
    setWalletModalSaving(false);
    closeWalletModal();
    await loadData();
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900/20 via-gray-900 to-black flex items-center justify-center">
        <Card className="w-full max-w-md">
          {!requiresTwoFactor ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-6 text-center">Two-Factor Authentication</h2>
              <p className="text-gray-300 mb-4 text-center">Enter the 6-digit code from your Google Authenticator app</p>
              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-1">Verification Code</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none text-center text-lg tracking-widest"
                    value={twoFactorToken}
                    onChange={e => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                {twoFactorError && <div className="text-red-400 text-sm">{twoFactorError}</div>}
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
                  disabled={verifyingTwoFactor}
                >
                  {verifyingTwoFactor ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorToken('');
                    setTwoFactorError('');
                    setTempToken('');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </form>
            </>
          )}
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
        <div className="fixed left-6 top-6 w-64 bg-gray-900 shadow-lg rounded-2xl p-4 flex-col items-center space-y-4 z-20">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-2 sm:p-6 sm:pl-80 pt-4 sm:pt-6 min-w-0">
          {/* Overview */}
          {currentPage === 'overview' && (
            <div className="space-y-6">
              <Card>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-1">System Overview</h3>
                  <p className="text-gray-300 opacity-70 text-sm">View system statistics and performance metrics</p>
                </div>
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

              {/* Новый Withdrawal Panel: */}
              <Card>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-1">Withdrawal Panel</h3>
                  <p className="text-gray-300 opacity-70 text-sm">Manage user withdrawal requests and approvals</p>
                </div>
                {withdrawals.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">No pending withdrawals</div>
                ) : (
                  <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                    {/* Массовые кнопки */}
                    <div className="flex gap-2 mb-4">
                      <button
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                        onClick={handleBatchApprove}
                        disabled={selectedWithdrawals.length === 0 || batchApproving}
                      >
                        {batchApproving ? 'Processing...' : 'Approve Selected'}
                      </button>
                      <button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                        onClick={handleBatchReject}
                        disabled={selectedWithdrawals.length === 0 || batchApproving}
                      >
                        {batchApproving ? 'Processing...' : 'Reject Selected'}
                      </button>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90 backdrop-blur-sm">
                        <tr>
                          <th className="py-3 px-3 rounded-tl-lg"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">User</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Amount</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Wallet</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Status</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                            <td className="py-2 px-3">
                              <input type="checkbox" checked={selectedWithdrawals.includes(tx.id)} onChange={() => toggleSelect(tx.id)} />
                            </td>
                            <td className="py-2 px-3 text-gray-300">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-white">{tx.user?.email || 'Unknown'}</td>
                            <td className="py-2 px-3 text-orange-400">${Number(tx.amount).toFixed(2)}</td>
                            {/* Откат: только tx.wallet */}
                            <td className="py-2 px-3 text-white flex items-center gap-2">
                              <span>{tx.wallet || tx.user?.wallet || '-'}</span>
                              <button className="text-blue-400 hover:text-blue-300 text-xs underline" onClick={() => openWalletModal(tx.user)}>Edit Wallet</button>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                                tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' :
                                tx.status === 'CHECK' ? 'bg-orange-900/20 text-orange-400' :
                                tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'bg-red-900/20 text-red-400' :
                                'bg-gray-700/20 text-gray-400'
                              }`}>
                                {tx.status === 'CHECK' ? 'Check' :
                                tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'REJECTED' :
                                tx.status === 'COMPLETED' ? 'Completed' :
                                tx.status === 'PENDING' ? 'Pending' :
                                tx.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 flex gap-2">
                              {tx.status === 'PENDING' && (
                                <>
                                  <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none" onClick={() => handleApprove(tx.id)} disabled={actionLoadingId === tx.id}>{actionLoadingId === tx.id ? 'Processing...' : 'Approve'}</button>
                                  <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none" onClick={() => handleCheck(tx.id)} disabled={actionLoadingId === tx.id}>{actionLoadingId === tx.id ? 'Processing...' : 'Check'}</button>
                                  <button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none" onClick={() => handleReject(tx.id)} disabled={actionLoadingId === tx.id}>{actionLoadingId === tx.id ? 'Processing...' : 'Reject'}</button>
                                </>
                              )}
                              {tx.status === 'CHECK' && (
                                <>
                                  <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none" onClick={() => handleApprove(tx.id)} disabled={actionLoadingId === tx.id}>{actionLoadingId === tx.id ? 'Processing...' : 'Approve'}</button>
                                  <button className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none" onClick={() => handleReject(tx.id)} disabled={actionLoadingId === tx.id}>{actionLoadingId === tx.id ? 'Processing...' : 'Reject'}</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Users */}
          {currentPage === 'users' && (
            <Card>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-2xl font-bold text-white">Users Management</h3>
                  <p className="text-gray-300 opacity-70 text-sm">Manage system users and their accounts</p>
                </div>
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
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tl-lg">ID</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Username</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Balance</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Rank</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Joined</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 px-3 text-gray-300">{user.id}</td>
                        <td className="py-2 px-3 text-white">{user.username}</td>
                        <td className="py-2 px-3 text-white">{user.email}</td>
                        <td className="py-2 px-3 text-green-400">${user.balance?.toFixed(2)}</td>
                        <td className="py-2 px-3 text-orange-400">{user.rank}</td>
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 mr-2" onClick={() => handleViewUser(user)}>View</button>
                          <button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105" onClick={() => handleShowHistory(user)}>History</button>
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
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Transactions</h3>
                    <p className="text-gray-300 opacity-70 text-sm">View and manage all system transactions</p>
                  </div>
                  <button 
                    onClick={() => setShowAddTransactionModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Transaction
                  </button>
                </div>
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
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tl-lg">Date</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">User</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Type</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Amount</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Status</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, i) => (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
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
                            tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'bg-red-900/20 text-red-400' :
                            'bg-gray-700/20 text-gray-400'
                          }`}>
                            {tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'REJECTED' : tx.status}
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
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Investment Packages</h3>
                    <p className="text-gray-300 opacity-70 text-sm">Manage investment packages and their settings</p>
                  </div>
                  <button 
                    onClick={handleAddPackage}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Add Package
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90 backdrop-blur-sm">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tl-lg">ID</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Min Amount</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Monthly Yield</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Duration</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase">Status</th>
                      <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
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
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 mr-2"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
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

          {/* 2FA Setup */}
          {currentPage === '2fa' && (
            <Card>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white">Two-Factor Authentication Setup</h3>
                <p className="text-gray-300 opacity-70 text-sm">Secure your admin account with Google Authenticator</p>
              </div>
              
              {!showTwoFactorSetup && !showDisable2FA ? (
                <div className="text-center py-8">
                  <div className="mb-8">
                    <div className={`w-16 h-16 ${twoFactorEnabled ? 'bg-green-500/20' : 'bg-orange-500/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Settings size={32} className={twoFactorEnabled ? 'text-green-400' : 'text-orange-400'} />
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-2">
                      {twoFactorEnabled ? '2FA Protection Active' : 'Enable 2FA Protection'}
                    </h4>
                    <p className="text-gray-300 mb-6">
                      {twoFactorEnabled 
                        ? 'Your account is protected with two-factor authentication'
                        : 'Add an extra layer of security to your admin account'
                      }
                    </p>
                    
                    {twoFactorEnabled && (
                      <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm font-medium">Security Status: Active</span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Two-factor authentication is protecting your account. You can disable it if needed.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {twoFactorEnabled ? (
                    <button
                      onClick={() => {
                        setShowDisable2FA(true);
                        setShowTwoFactorSetup(false);
                        setTwoFactorSecret('');
                        setTwoFactorQrCode('');
                        setSetupVerificationCode('');
                        setSetupError('');
                      }}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleSetupTwoFactor();
                        setShowDisable2FA(false);
                        setDisablePassword('');
                        setDisableError('');
                      }}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      disabled={settingUpTwoFactor}
                    >
                      {settingUpTwoFactor ? 'Setting up...' : 'Setup 2FA'}
                    </button>
                  )}
                  
                  {setupError && (
                    <div className="mt-4 text-red-400 text-sm">{setupError}</div>
                  )}
                </div>
              ) : showTwoFactorSetup ? (
                <div className="max-w-md mx-auto">
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Step 1: Scan QR Code</h4>
                    <p className="text-gray-300 mb-4">Open Google Authenticator and scan this QR code:</p>
                    
                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                      <img src={twoFactorQrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-300 text-sm mb-2">Or enter this code manually:</p>
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <code className="text-orange-400 font-mono text-sm break-all">{twoFactorSecret}</code>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Step 2: Verify Setup</h4>
                    <p className="text-gray-300 mb-4">Enter the 6-digit code from your Google Authenticator app:</p>
                    
                    <form onSubmit={handleVerifyTwoFactorSetup} className="space-y-4">
                      <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-center text-lg tracking-widest"
                        value={setupVerificationCode}
                        onChange={e => setSetupVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        required
                      />
                      
                      {setupError && (
                        <div className="text-red-400 text-sm">{setupError}</div>
                      )}
                      
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
                          disabled={settingUpTwoFactor}
                        >
                          {settingUpTwoFactor ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setShowTwoFactorSetup(false);
                            setTwoFactorSecret('');
                            setTwoFactorQrCode('');
                            setSetupVerificationCode('');
                            setSetupError('');
                          }}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {/* Disable 2FA Form */}
              {showDisable2FA && (
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings size={32} className="text-red-400" />
                    </div>
                    <h4 className="text-xl font-semibold text-white mb-2">Disable 2FA Protection</h4>
                    <p className="text-gray-300 mb-6">This will remove the extra security layer from your account</p>
                    
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-sm font-medium">Security Warning</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Disabling 2FA will make your account less secure. Make sure this is what you want to do.
                      </p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleDisable2FA} className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm font-medium">Confirm Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none"
                        value={disablePassword}
                        onChange={e => setDisablePassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                      />
                      <p className="text-gray-400 text-xs mt-1">Enter your password to confirm this action</p>
                    </div>
                    
                    {disableError && (
                      <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <div className="text-red-400 text-sm">{disableError}</div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
                        disabled={disabling2FA}
                      >
                        {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowDisable2FA(false);
                          setDisablePassword('');
                          setDisableError('');
                        }}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Edit Package Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
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
                <label className="block text-gray-300 mb-1">Max Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.maxAmount}
                  onChange={(e) => setEditForm(f => ({ ...f, maxAmount: e.target.value }))}
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
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {saving ? 'Saving...' : (editingPackage ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={() => setEditMode(true)}
              >
                Edit
              </button>
              <button
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
              {selectedUser.isBlocked ? (
                <button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
              <button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={() => handleInvestmentAction('disable', selectedUser.id)}
              >
                Disable Investments
              </button>
              <button
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={() => handleInvestmentAction('enable', selectedUser.id)}
              >
                Enable Investments
              </button>
            </div>
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
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-2xl relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setShowHistoryModal(false)}>&times;</button>
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white mb-1">Transaction History for {historyUser?.username || historyUser?.email}</h3>
              <p className="text-gray-300 opacity-70 text-sm">View user's transaction activity and history</p>
            </div>
            {loadingHistory ? (
              <div className="text-white">Loading...</div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900/80">
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-left py-2 px-3">Amount</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTransactions.length === 0 ? (
                      <tr><td colSpan={5} className="text-gray-400 text-center py-4">No transactions found</td></tr>
                    ) : (
                      historyTransactions.map((tx, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 px-3 text-gray-300">{new Date(tx.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-orange-400">{tx.type}</td>
                          <td className="py-2 px-3 text-white">${Number(tx.amount).toFixed(2)}</td>
                          <td className="py-2 px-3 text-gray-300 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.status === 'COMPLETED' ? 'bg-green-900/20 text-green-400' :
                              tx.status === 'PENDING' ? 'bg-yellow-900/20 text-yellow-400' :
                              tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'bg-red-900/20 text-red-400' :
                              'bg-gray-700/20 text-gray-400'
                            }`}>
                              {tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'REJECTED' : tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {walletModalUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full relative">
            <button
              type="button"
              onClick={closeWalletModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >×</button>
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Edit Wallet</h3>
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Wallet</label>
              <input
                type="text"
                value={walletModalValue}
                onChange={e => setWalletModalValue(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={saveWalletModal}
                disabled={walletModalSaving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
              >{walletModalSaving ? 'Saving...' : 'Save'}</button>
              <button
                onClick={closeWalletModal}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Investment Management Modal */}
      {showInvestmentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setShowInvestmentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              {investmentAction === 'disable' ? 'Disable' : 'Enable'} User Investments
            </h3>
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                {investmentAction === 'disable' 
                  ? 'This will disable all active investments for this user. They will stop earning profits.'
                  : 'This will re-enable all disabled investments for this user. They will start earning profits again.'
                }
              </p>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Reason (required)</label>
                <textarea
                  value={investmentReason}
                  onChange={(e) => setInvestmentReason(e.target.value)}
                  placeholder={`Reason for ${investmentAction === 'disable' ? 'disabling' : 'enabling'} investments...`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmInvestmentAction}
                disabled={investmentActionLoading || !investmentReason.trim()}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${
                  investmentAction === 'disable'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                }`}
              >
                {investmentActionLoading 
                  ? 'Processing...' 
                  : investmentAction === 'disable' 
                    ? 'Disable Investments' 
                    : 'Enable Investments'
                }
              </button>
              <button
                onClick={() => setShowInvestmentModal(false)}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 