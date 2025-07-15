import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Home, History, Package, Users, LogOut, Eye, EyeOff, Copy, UserPlus, Award, Menu, Camera, Lock } from 'lucide-react';
import LoginPage from './LoginPage';
import InvestmentPackagesPage from './InvestmentPackagesPage';
import ReferralSystemPage from './ReferralSystemPage';
import TeamPage from './TeamPage';
import RankRewardsPage from './RankRewardsPage';



const API = import.meta.env.VITE_API_BASE_URL;

const InvestorDashboard = () => {
  // --- Hooks (only at the beginning) ---
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [modalAmount, setModalAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [referralLink, setReferralLink] = useState('');
  const [referralTree, setReferralTree] = useState(null);
  const [bonus, setBonus] = useState(null);
  const [sponsor, setSponsor] = useState(null);
  const [tableView, setTableView] = useState([]);
  const [currentRank, setCurrentRank] = useState(1);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rankData, setRankData] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // --- Optimized computed values ---
  const pendingWithdraw = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.filter(t => t.type === 'WITHDRAWAL' && t.status === 'PENDING')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  // Get turnover from rank data (same as Rank Rewards System)
  const turnover = useMemo(() => {
    return rankData?.turnover || 0;
  }, [rankData]);

  // Get next rank data
  const nextRankData = useMemo(() => {
    if (!rankData?.ranks) return null;
    const nextRank = rankData.ranks.find(r => r.level === currentRank + 1);
    return nextRank || null;
  }, [rankData, currentRank]);

  const onHold = useMemo(() => {
    if (!Array.isArray(transactions) || !Array.isArray(packages)) return 0;
    const active = transactions.filter(t => t.type === 'Investment' && t.status === 'Active');
    let sum = 0;
    active.forEach(inv => {
      const pkg = packages.find(p => Number(p.id) === Number(inv.PackageId || inv.packageId));
      if (pkg) {
        sum += (Number(inv.amount) * pkg.percent / 100) / 30;
      }
    });
    return sum;
  }, [transactions, packages]);

  // Rank update handler
  const handleRankUpdate = useCallback((rank) => {
    setCurrentRank(rank);
  }, []);

  const rank = useMemo(() => {
    if (!referralTree) return 1;
    return 1 + (referralTree.children ? referralTree.children.length : 0);
  }, [referralTree]);

  const activeInvestmentsTx = useMemo(() => {
    if (!userData?.investments) return [];
    
    // Group investments by packageId
    const map = {};
    userData.investments.forEach(inv => {
      if (inv.isActive && new Date() < new Date(inv.endDate)) {
        const pkgId = inv.packageId;
        if (!map[pkgId]) {
          map[pkgId] = {
            id: inv.id,
            packageId: pkgId,
            amount: inv.amount,
            totalEarned: inv.totalEarned,
            startDate: inv.startDate,
            endDate: inv.endDate,
            lastProfitDate: inv.lastProfitDate,
            package: inv.package,
            dates: [inv.startDate]
          };
        } else {
          // Если уже есть инвестиция в этот пакет, добавляем сумму
          map[pkgId].amount += inv.amount;
          map[pkgId].totalEarned += inv.totalEarned;
          map[pkgId].dates.push(inv.startDate);
          // Берем самую позднюю дату
          if (new Date(inv.startDate) > new Date(map[pkgId].startDate)) {
            map[pkgId].startDate = inv.startDate;
          }
        }
      }
    });
    
    return Object.values(map).map(inv => ({
      id: inv.id,
      name: inv.package.name,
      amount: inv.amount,
      totalEarned: inv.totalEarned,
      startDate: inv.startDate,
      endDate: inv.endDate,
      lastProfitDate: inv.lastProfitDate,
      package: inv.package,
      date: new Date(inv.startDate).toLocaleDateString(),
      endDateFormatted: new Date(inv.endDate).toLocaleDateString()
    }));
  }, [userData?.investments]);

  const incomeFromPackages = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.filter(t => t.type === 'BONUS' || t.type === 'DAILY_PROFIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const incomeFromPartnership = useMemo(() => {
    if (!Array.isArray(transactions)) return 0;
    return transactions.filter(t => t.type === 'RANK_REWARD' || t.type === 'REFERRAL_BONUS')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  // --- Оптимизированные функции ---
  const handleLogin = useCallback(async (form) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUserData(data.user);
        setCurrentPage('dashboard');
      } else {
        setAuthError(data.error || 'Login error');
      }
    } catch {
      setAuthError('Ошибка сети');
    }
    setLoading(false);
  }, []);

  const handleRegister = useCallback(async (form) => {
    setLoading(true);
    setAuthError('');
    try {
      const refId = localStorage.getItem('referrerId');
      const body = { ...form };
      if (refId) body.referrerId = refId;
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUserData(data.user);
        setCurrentPage('dashboard');
        if (refId) localStorage.removeItem('referrerId');
      } else {
        setAuthError(data.error || 'Registration error');
      }
    } catch {
      setAuthError('Network error');
    }
    setLoading(false);
  }, []);

  const handleLogout = useCallback(() => {
    setToken('');
    localStorage.removeItem('token');
    setUserData(null);
    setCurrentPage('login');
  }, []);

  // --- LOAD DATA ---
  useEffect(() => {
    if (!token) return;
    
    const loadData = async () => {
      try {
        const [profileRes, transactionsRes, packagesRes, referralLinkRes, statsRes] = await Promise.all([
          fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/packages`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/referral-link`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/referral-stats`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        // Check if any response is not ok
        if (!profileRes.ok || !transactionsRes.ok || !packagesRes.ok || !referralLinkRes.ok || !statsRes.ok) {
          // If any request failed, clear token and redirect to login
          console.log('One or more API requests failed, redirecting to login');
          setToken('');
          localStorage.removeItem('token');
          setCurrentPage('login');
          return;
        }

        const [profileData, transactionsData, packagesData, referralLinkData, statsData] = await Promise.all([
          profileRes.json(),
          transactionsRes.json(),
          packagesRes.json(),
          referralLinkRes.json(),
          statsRes.json()
        ]);

        // Check if any data contains error
        if (profileData.error || transactionsData.error || packagesData.error || referralLinkData.error || statsData.error) {
          console.log('API returned error, redirecting to login');
          setToken('');
          localStorage.removeItem('token');
          setCurrentPage('login');
          return;
        }

        // Load referral tree after we have profile data
        let referralsData = null;
        try {
          const referralsRes = await fetch(`${API}/api/referrals/tree/${profileData.id}`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          if (referralsRes.ok) {
            referralsData = await referralsRes.json();
          }
        } catch (error) {
          console.error('Error loading referral tree:', error);
        }

        // Load rank data
        let rankData = { currentRank: { level: 1 } };
        try {
          const rankRes = await fetch(`${API}/api/rank-rewards`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          if (rankRes.ok) {
            rankData = await rankRes.json();
          }
        } catch (error) {
          console.error('Error loading rank data:', error);
        }

        console.log('Setting data:', {
          profileData,
          referralsData,
          statsData,
          transactionsData,
          rankData
        });
        
        setUserData(profileData);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
        setPackages(Array.isArray(packagesData) ? packagesData : []);
        setReferralLink(referralLinkData.link || '');
        setReferralTree(referralsData);
        setSponsor(statsData.sponsor || null);
        setTableView(statsData.tableView || []);
        setCurrentRank(rankData.currentRank?.level || 1);
        setRankData(rankData); // Set rankData for progress bar
      } catch (error) {
        console.error('Error loading data:', error);
        // On any error, redirect to login
        setToken('');
        localStorage.removeItem('token');
        setCurrentPage('login');
      }
    };

    loadData();
  }, [token]);

  // Note: Referral handling is now done in LoginPage component

  // --- Оптимизированные модальные функции ---
  const openDepositModal = useCallback(() => { 
    setShowDepositModal(true); 
    setModalAmount(''); 
  }, []);

  const openWithdrawModal = useCallback(() => { 
    setShowWithdrawModal(true); 
    setModalAmount(''); 
    setWalletAddress('');
  }, []);

  const closeModal = useCallback(() => { 
    setShowDepositModal(false); 
    setShowWithdrawModal(false); 
    setModalAmount(''); 
    setWalletAddress('');
  }, []);

  const handleModalDeposit = useCallback(async () => {
    setModalLoading(true);
    await handleDeposit(modalAmount);
    setModalLoading(false);
    closeModal();
  }, [modalAmount, closeModal]);

  const handleModalWithdraw = useCallback(async () => {
    setModalLoading(true);
    await handleWithdraw(modalAmount);
    setModalLoading(false);
    closeModal();
  }, [modalAmount, closeModal]);

  // Profile management functions
  const handleAvatarUpload = useCallback(async () => {
    if (!avatarFile) return;
    
    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const res = await fetch(`${API}/api/profile/avatar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, avatar: data.avatar }));
        setShowAvatarModal(false);
        setAvatarFile(null);
      } else {
        alert(data.error || 'Failed to update avatar');
      }
    } catch (error) {
      console.error('Avatar update error:', error);
      alert('Failed to update avatar');
    }
    setProfileLoading(false);
  }, [avatarFile, token]);

  const handlePasswordChange = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    setProfileLoading(true);
    try {
      const res = await fetch(`${API}/api/profile/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      if (res.ok) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Password updated successfully');
      } else {
        alert(data.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      alert('Failed to update password');
    }
    setProfileLoading(false);
  }, [currentPassword, newPassword, confirmPassword, token]);

  // --- Deposit/Withdraw logic ---
  const handleDeposit = async (amount) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, balance: data.balance }));
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
      } else {
        alert(data.error || 'Deposit error');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleWithdraw = async (amount) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(amount),
          wallet: walletAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, balance: data.balance }));
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
      } else {
        alert(data.error || 'Withdrawal error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Invest logic ---
  const handleInvest = async (pkg) => {
    if (!purchaseAmount || isNaN(purchaseAmount)) return alert('Enter amount');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/investments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ packageId: pkg.id, amount: Number(purchaseAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setBonus(data.bonus);
        setUserData(u => ({ ...u, balance: data.balance }));
        setSelectedPackage(null);
        setPurchaseAmount('');
        
        // Refresh user data to get updated investments
        const profileRes = await fetch(`${API}/api/profile`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const profileData = await profileRes.json();
        setUserData(profileData);
        
        // Refresh transactions
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
      } else {
        alert(data.error || 'Investment error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Navigation ---
  const navigation = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'Transaction History' },
    { id: 'packages', icon: Package, label: 'Investment Packages' },
    { id: 'referrals', icon: Users, label: 'Referral System' },
    { id: 'team', icon: UserPlus, label: 'Your team' },
    { id: 'rankrewards', icon: Award, label: 'Rank Rewards' }
  ];

  // Logout button - positioned separately at the bottom
  const logoutButton = { id: 'logout', icon: LogOut, label: 'Logout' };

  // --- Main Render ---
  if (!token || !userData) {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} loading={loading} authError={authError} />;
  }

  // Card component update for mobile padding
  const Card = ({ children, className = "", hover = true }) => (
    <div className={`glass-card ${hover ? 'glass-card-hover' : ''} p-2 sm:p-6 animate-fade-in-up w-full overflow-x-auto ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="glass-bg min-h-screen">
      {/* Hamburger for mobile - absolutely topmost, outside all content */}
      <button
        className="sm:hidden fixed top-1 left-1 z-50 bg-black/50 rounded-lg p-2 flex items-center justify-center"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={28} className="text-orange-500" />
      </button>
      <div className="mt-10 sm:mt-0">
        {/* Decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl"></div>
        </div>
        {/* Sidebar for desktop */}
        <div className="flex relative z-10">
          {/* Sidebar - desktop */}
          <div className="fixed left-6 top-6 w-20 glass-sidebar h-auto rounded-2xl p-4 flex-col items-center justify-between z-20 hidden sm:flex" style={{ height: 'calc(100vh - 48px)' }}>
            <div className="flex flex-col items-center space-y-4">
              {/* Logo */}
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 logo-glow">
                <div className="w-6 h-6 bg-black rounded-sm"></div>
              </div>
              {/* Navigation */}
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors glass-button ${isActive ? 'text-white active' : 'text-gray-400 hover:text-white'}`}
                    title={item.label}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
            {/* Logout button at bottom */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleLogout}
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors glass-button text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30"
                title={logoutButton.label}
              >
                <logoutButton.icon size={20} />
              </button>
            </div>
          </div>
          {/* Sidebar - mobile drawer */}
          {mobileSidebarOpen && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
                onClick={() => setMobileSidebarOpen(false)}
              />
              {/* Drawer */}
              <div className="fixed top-0 left-0 h-full w-24 bg-black/90 glass-sidebar z-50 flex flex-col items-center justify-between p-4 pt-14 animate-slide-in-left shadow-2xl">
                <div className="flex flex-col items-center space-y-4">
                  {/* Logo */}
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 logo-glow">
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
                          setMobileSidebarOpen(false);
                          setCurrentPage(item.id);
                        }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors glass-button ${isActive ? 'text-white active' : 'text-gray-400 hover:text-white'}`}
                        title={item.label}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
                {/* Logout button at bottom */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      handleLogout();
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors glass-button text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30"
                    title={logoutButton.label}
                  >
                    <logoutButton.icon size={20} />
                  </button>
                </div>
              </div>
            </>
          )}
          {/* Main Content */}
          <div className="flex-1 p-2 sm:p-6 sm:pl-32 pt-4 sm:pt-6 min-w-0">
            {/* Dashboard */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6">
                {/* Top row with Balance, Income, and Profile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Balance Card */}
                  <Card>
                    <h3 className="text-xl font-semibold text-white mb-4">Balance</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[rgb(249,115,22)] text-sm">Total Balance</div>
                        <div className="text-3xl font-bold text-white">${userData.balance?.toFixed(2)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-orange-400">Pending withdraw</div>
                          <div className="text-white font-semibold">${pendingWithdraw.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-orange-400">On hold</div>
                          <div className="text-white font-semibold">${onHold.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button onClick={openDepositModal} className="flex-1 orange-button text-white py-2 px-4 rounded-lg">Deposit</button>
                        <button onClick={openWithdrawModal} className="flex-1 inactive-button text-white py-2 px-4 rounded-lg">Withdraw</button>
                      </div>
                    </div>
                  </Card>
                  {/* My Income Card */}
                  <Card>
                    <h3 className="text-xl font-semibold text-white mb-4">My Income</h3>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold text-white">${(incomeFromPackages + incomeFromPartnership).toFixed(2)}</div>
                      <div className="text-[rgb(249,115,22)] text-sm">From Packages</div>
                      <div className="text-white font-semibold">${incomeFromPackages.toFixed(2)}</div>
                      <div className="text-[rgb(249,115,22)] text-sm">From Partnership program</div>
                      <div className="text-white font-semibold">${incomeFromPartnership.toFixed(2)}</div>
                    </div>
                  </Card>
                  {/* User Profile Card */}
                  <Card>
                    <h3 className="text-xl font-semibold text-white mb-4">You</h3>
                    <div className="mb-4 flex items-center gap-4">
                      <div className="relative">
                        {userData.avatar ? (
                          <img 
                            src={userData.avatar} 
                            alt="Avatar" 
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-700 flex items-center justify-center text-2xl text-white">
                            {userData.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-white">{userData.username}</div>
                        <div className="text-gray-400 text-sm">{userData.email}</div>
                        <div className="text-orange-400 text-sm">Rank {currentRank}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setShowPasswordModal(true)}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 rounded-lg transition-all duration-200"
                          title="Change Password"
                        >
                          <Lock size={16} />
                        </button>
                        <button 
                          onClick={() => setShowAvatarModal(true)}
                          className="bg-orange-500/60 hover:bg-orange-500 text-white p-2 rounded-lg transition-all duration-200"
                          title="Change Avatar"
                        >
                          <Camera size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[rgb(249,115,22)] text-sm mb-1">Referral link</div>
                        <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
                          <span className="text-gray-300 text-sm flex-1 truncate">{referralLink}</span>
                          <button className="text-orange-400 hover:text-orange-300 glass-button px-2 py-1 rounded text-xs" onClick={() => {navigator.clipboard.writeText(referralLink);}}>Copy</button>
                        </div>
                      </div>
                      
                      {/* Compact Rank Progress Bar */}
                      {nextRankData && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress to next rank</span>
                            <span>{Math.round((turnover / nextRankData.turnover) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((turnover / nextRankData.turnover) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ${turnover.toLocaleString()} / ${nextRankData.turnover.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
                
                {/* Your Investments Card - Full Width */}
                  <Card>
                    <h3 className="text-xl font-semibold text-white mb-4">Your Investments</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-3 px-3">Package</th>
                          <th className="text-left py-3 px-3">Amount</th>
                          <th className="text-left py-3 px-3">Earned</th>
                          <th className="text-left py-3 px-3">Start Date</th>
                          <th className="text-left py-3 px-3">End Date</th>
                          <th className="text-left py-3 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInvestmentsTx.length > 0 ? activeInvestmentsTx.map((inv, i) => (
                          <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/20">
                            <td className="py-3 px-3 text-white font-medium">{inv.name}</td>
                            <td className="py-3 px-3 text-orange-400 font-semibold">${Number(inv.amount).toFixed(2)}</td>
                            <td className="py-3 px-3 text-green-400 font-semibold">${Number(inv.totalEarned || 0).toFixed(2)}</td>
                            <td className="py-3 px-3 text-gray-300">{inv.date}</td>
                            <td className="py-3 px-3 text-gray-300">{inv.endDateFormatted}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                                Active
                              </span>
                            </td>
                            </tr>
                          )) : (
                          <tr>
                            <td colSpan={6} className="text-gray-400 py-8 text-center">
                              <div className="text-lg mb-2">No active investments</div>
                              <div className="text-sm">Start investing to see your portfolio here</div>
                            </td>
                          </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}
            {/* Transaction History */}
            {currentPage === 'history' && (
              <div className="space-y-3 px-2">
                {/* Balance Card */}
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-3">Balance</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mb-3">
                    <div>
                      <div className="text-[rgb(249,115,22)] text-xs">Total balance</div>
                      <div className="text-base sm:text-xl font-bold text-white">${userData.balance?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-orange-400 text-xs">Pending withdraw</div>
                      <div className="text-base sm:text-lg font-semibold text-white">${pendingWithdraw.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-orange-400 text-xs">On hold</div>
                      <div className="text-base sm:text-lg font-semibold text-white">${onHold.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={openDepositModal} className="orange-button text-white py-1.5 px-3 rounded-lg text-sm w-full sm:w-auto">Deposit</button>
                    <button onClick={openWithdrawModal} className="inactive-button text-white py-1.5 px-3 rounded-lg text-sm w-full sm:w-auto">Withdraw</button>
                  </div>
                </Card>
                {/* Transaction History Table */}
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-3">Transaction History</h3>
                  <div className="overflow-x-auto max-h-[460px] sm:max-h-[calc(100vh-300px)] overflow-y-auto -mx-6 px-6">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-gray-900/80">
                      <tr className="text-gray-400 border-b border-gray-700">
                          <th className="text-left py-3 px-3 whitespace-nowrap">Date</th>
                          <th className="text-left py-3 px-3 whitespace-nowrap">Type</th>
                          <th className="text-left py-3 px-3 whitespace-nowrap">Amount</th>
                          <th className="text-left py-3 px-3 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.filter(tx => tx.type !== 'Deposit address').map((tx, i) => (
                        <tr key={i} className="border-b border-gray-800">
                          <td className="py-2 pr-2 text-gray-300 whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-2 text-orange-400 whitespace-normal break-words max-w-[130px]">
                            {tx.type === 'DAILY_PROFIT' && tx.investmentId ? `${tx.type} (${packages.find(p => p.id === tx.investment?.packageId)?.name || 'Unknown'})` :
                             tx.type === 'BONUS' && tx.investmentId ? `${tx.type} (${packages.find(p => p.id === tx.investment?.packageId)?.name || 'Unknown'} package)` :
                             tx.type === 'INVESTMENT' && tx.investmentId ? `${tx.type} (${packages.find(p => p.id === tx.investment?.packageId)?.name || 'Unknown'})` :
                             tx.type === 'RANK_REWARD' && tx.description ? `${tx.type} (${tx.description})` :
                             tx.type === 'WITHDRAWAL' && tx.description ? `${tx.type} (${tx.description.replace('Withdrawal to ', '')})` :
                             tx.type}
                          </td>
                          <td className="py-2 pr-2 text-white whitespace-nowrap">
                            ${Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            {tx.status === 'PENDING' ? (
                              <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs">
                                {tx.status}
                              </span>
                            ) : tx.status === 'COMPLETED' ? (
                              <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">
                                {tx.status}
                              </span>
                            ) : (
                              <span className="text-green-400">{tx.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}
            {/* Deposit/Withdraw Modals */}
            {(showDepositModal || showWithdrawModal) && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="glass-modal p-6 w-full max-w-md rounded-2xl">
                  <h3 className="text-xl font-semibold text-white mb-4">{showDepositModal ? 'Deposit Funds' : 'Withdraw Funds'}</h3>
                  {showWithdrawModal ? (
                    <div className="space-y-4">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <p className="text-orange-400 text-sm">You are about to start withdraw process. The process should be completed within a 72 hours.</p>
                      </div>
                      <div>
                        <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select withdrawal amount</label>
                        <input 
                          type="number" 
                          value={modalAmount} 
                          onChange={e => setModalAmount(e.target.value)} 
                          className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                          placeholder="Enter amount" 
                        />
                      </div>
                      <div>
                        <label className="block text-[rgb(249,115,22)] text-sm mb-2">Wallet's address</label>
                        <input 
                          type="text" 
                          value={walletAddress}
                          onChange={e => setWalletAddress(e.target.value)}
                          className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                          placeholder="Enter your crypto wallet address" 
                        />
                      </div>
                      <button 
                        onClick={handleModalWithdraw} 
                        className="w-full orange-button text-white py-3 rounded-lg" 
                        disabled={modalLoading}
                      >
                        {modalLoading ? 'Processing...' : 'Withdraw'}
                      </button>
                      <button onClick={closeModal} className="w-full glass-button text-white py-2 rounded-lg">Cancel</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select deposit amount</label>
                        <input type="number" value={modalAmount} onChange={e => setModalAmount(e.target.value)} className="w-full glass-input px-4 py-3 text-white focus:outline-none" placeholder="Enter amount" />
                      </div>
                      <button onClick={handleModalDeposit} className="w-full orange-button text-white py-3 rounded-lg" disabled={modalLoading}>{modalLoading ? 'Processing...' : 'Deposit'}</button>
                      <button onClick={closeModal} className="w-full glass-button text-white py-2 rounded-lg">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {currentPage === 'packages' && <InvestmentPackagesPage userData={userData} packages={packages} onInvest={handleInvest} loading={loading} selectedPackage={selectedPackage} setSelectedPackage={setSelectedPackage} purchaseAmount={purchaseAmount} setPurchaseAmount={setPurchaseAmount} bonus={bonus} setBonus={setBonus} />}
            {currentPage === 'referrals' && <ReferralSystemPage userData={userData} referralTree={referralTree} referralLink={referralLink} packages={packages} transactions={transactions} sponsor={sponsor} currentRank={currentRank} />}
            {currentPage === 'team' && <TeamPage referralTree={referralTree} userData={userData} tableView={tableView} currentRank={currentRank} />}
            {currentPage === 'rankrewards' && <RankRewardsPage onRankUpdate={handleRankUpdate} userData={userData} />}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-modal p-6 w-full max-w-md rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Change Avatar</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                />
              </div>
              {avatarFile && (
                <div className="text-sm text-gray-300">
                  Selected: {avatarFile.name}
                </div>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={handleAvatarUpload} 
                  disabled={!avatarFile || profileLoading}
                  className="flex-1 orange-button text-white py-3 rounded-lg disabled:opacity-50"
                >
                  {profileLoading ? 'Uploading...' : 'Upload Avatar'}
                </button>
                <button 
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarFile(null);
                  }} 
                  className="flex-1 glass-button text-white py-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-modal p-6 w-full max-w-md rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[rgb(249,115,22)] text-sm mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-[rgb(249,115,22)] text-sm mb-2">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-[rgb(249,115,22)] text-sm mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handlePasswordChange} 
                  disabled={!currentPassword || !newPassword || !confirmPassword || profileLoading}
                  className="flex-1 orange-button text-white py-3 rounded-lg disabled:opacity-50"
                >
                  {profileLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }} 
                  className="flex-1 glass-button text-white py-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorDashboard; 