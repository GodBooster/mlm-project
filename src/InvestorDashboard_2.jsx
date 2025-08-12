import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Home, History, Package, Users, LogOut, Eye, EyeOff, Copy, UserPlus, Award, Menu, Camera, Lock, BarChart3, X, ArrowRight, ChevronDown } from 'lucide-react';
import LoginPage from './LoginPage';
import SimpleInvestmentPage from './SimpleInvestmentPage';
import ReferralSystemPage from './ReferralSystemPage';
import TeamPage from './TeamPage';
import RankRewardsPage from './RankRewardsPage';
import ReportPage from './ReportPage';
import WithdrawModal from './WithdrawModal';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import { useModal } from './hooks/useModal';
import Modal from './components/Modal';


const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const InvestorDashboard = () => {
  // --- Toast hook ---
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast();
  
  // --- Hooks (only at the beginning) ---
  // Восстанавливаем currentPage из localStorage, если есть
  const getInitialPage = () => {
    const saved = localStorage.getItem('currentPage');
    const token = localStorage.getItem('token');
    // Если есть токен, но нет сохраненной страницы - показываем дашборд
    if (token && !saved) {
      return 'dashboard';
    }
    return saved || 'login';
  };
  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userData, setUserData] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userAvatar, setUserAvatar] = useState(null); // Отдельное состояние для аватара
  const [sponsorAvatar, setSponsorAvatar] = useState(null); // Состояние для аватара спонсора

  // Используем новый хук для модальных окон
  const { isOpen: showDepositModal, open: openDepositModal, close: closeDepositModal } = useModal(false);
  const { isOpen: showWithdrawModal, open: openWithdrawModal, close: closeWithdrawModal } = useModal(false);
  const { isOpen: showAvatarModal, open: openAvatarModal, close: closeAvatarModal } = useModal(false);
  const { isOpen: showPasswordModal, open: openPasswordModal, close: closePasswordModal } = useModal(false);
  const { isOpen: withdrawOpen, open: openWithdrawModalUnified, close: closeWithdrawModalUnified } = useModal(false);

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
    if (!rankData) return null;
    // Если currentRank = 0 (No rank), nextRank = rankData.nextRank (Bronze)
    if (rankData.currentRank?.level === 0 && rankData.nextRank) {
      return rankData.nextRank;
    }
    // Обычная логика для пользователей с рангом
    if (rankData.ranks && rankData.currentRank?.level) {
      const nextRank = rankData.ranks.find(r => r.level === rankData.currentRank.level + 1);
      return nextRank || null;
    }
    return null;
  }, [rankData]);

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
        // НЕ устанавливаем userData здесь, пусть loadData загрузит полные данные
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
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
        localStorage.setItem('currentPage', 'dashboard');
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
    localStorage.removeItem('user'); // Очищаем данные пользователя
    setUserData(null);
    setTransactions([]);
    setUserAvatar(null); // Сбрасываем аватар при логауте
    setSponsorAvatar(null); // Сбрасываем аватар спонсора при логауте
    setCurrentPage('login');
    localStorage.removeItem('currentPage');
  }, []);

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
      // Загружаем все данные напрямую с сервера - просто и надежно
      const [profileRes, transactionsRes, packagesRes, referralLinkRes, statsRes] = await Promise.all([
        fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/packages`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/referral-link`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/referral-stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // Check if any response is not ok
      if (!profileRes.ok || !transactionsRes.ok || !packagesRes.ok || !referralLinkRes.ok || !statsRes.ok) {
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
      
      // Устанавливаем все данные сразу - как было изначально
      setUserData(profileData);
      // Сохраняем данные пользователя в localStorage для автологина
      localStorage.setItem('user', JSON.stringify(profileData));
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setPackages(Array.isArray(packagesData) ? packagesData : []);
      setReferralLink(referralLinkData.link || '');
      setReferralTree(referralsData);
      setSponsor(statsData.sponsor || null);
      setTableView(statsData.tableView || []);
      setCurrentRank(rankData.currentRank?.level ?? 1);
      setRankData(rankData);
      
      // Не останавливаем здесь - это делается в finally
    } catch (error) {
      console.error('Error loading data:', error);
      // On any error, redirect to login
      setToken('');
      localStorage.removeItem('token');
      setCurrentPage('login');
    }
  };

  // Load avatar separately when needed
  const loadUserAvatar = useCallback(async () => {
    if (!token) return; // Нет токена
    
    try {
      const res = await fetch(`${API}/api/profile/avatar`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setUserAvatar(data.avatar || '');
        console.log('Avatar loaded:', data.avatar ? 'Success' : 'No avatar');
      } else {
        console.log('Avatar API error:', data.error);
        setUserAvatar(''); // Пустая строка означает отсутствие аватара
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
      setUserAvatar(''); // Пустая строка означает отсутствие аватара
    }
  }, [token]);

  // Load sponsor avatar separately when needed
  const loadSponsorAvatar = useCallback(async (sponsorId) => {
    if (!token || !sponsorId) return;
    
    try {
      const res = await fetch(`${API}/api/user/${sponsorId}/avatar`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setSponsorAvatar(data.avatar || '');
        console.log('Sponsor avatar loaded:', data.avatar ? 'Success' : 'No avatar');
      } else {
        console.log('Sponsor avatar API error:', data.error);
        setSponsorAvatar('');
      }
    } catch (error) {
      console.error('Error loading sponsor avatar:', error);
      setSponsorAvatar('');
    }
  }, [token]);

  useEffect(() => {
    let timeoutId;
    if (token) {
      loadData()
        .catch((e) => {
          console.error('loadData error', e);
        })
        .finally(() => {
          console.log('setIsAuthLoading(false) after loadData');
          setIsAuthLoading(false);
        });
      // Фолбек: даже если loadData зависнет, через 3 сек снимаем загрузку
      timeoutId = setTimeout(() => {
        setIsAuthLoading(false);
        console.log('setIsAuthLoading(false) by timeout');
      }, 3000);
    } else {
      setIsAuthLoading(false);
      console.log('setIsAuthLoading(false) no token');
    }
    return () => clearTimeout(timeoutId);
  }, [token]);

  // Автоматическая загрузка аватара через 30 секунд после входа в кабинет
  useEffect(() => {
    let avatarTimeoutId;
    if (token && userData && !isAuthLoading) {
      console.log('Scheduling avatar load in 30 seconds...');
      avatarTimeoutId = setTimeout(() => {
        console.log('Auto-loading avatar after 30 seconds');
        loadUserAvatar();
      }, 30000); // 30 секунд
    }
    return () => clearTimeout(avatarTimeoutId);
  }, [token, userData, isAuthLoading, loadUserAvatar]);

  // Автоматическая загрузка аватара спонсора через 35 секунд (чуть позже пользовательского)
  useEffect(() => {
    let sponsorAvatarTimeoutId;
    if (token && userData && sponsor && !isAuthLoading) {
      console.log('Scheduling sponsor avatar load in 35 seconds...');
      sponsorAvatarTimeoutId = setTimeout(() => {
        console.log('Auto-loading sponsor avatar after 35 seconds');
        loadSponsorAvatar(sponsor.id);
      }, 35000); // 35 секунд
    }
    return () => clearTimeout(sponsorAvatarTimeoutId);
  }, [token, userData, sponsor, isAuthLoading, loadSponsorAvatar]);

  // Сохраняем currentPage в localStorage при изменении
  useEffect(() => {
    if (currentPage && currentPage !== 'login') {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage]);

  // Note: Referral handling is now done in LoginPage component

  // --- Оптимизированные модальные функции ---
  const openDepositModalHandler = useCallback(() => {
    openDepositModal();
    setModalAmount('');
  }, [openDepositModal]);

  const openWithdrawModalHandler = useCallback(() => {
    openWithdrawModalUnified();
  }, [openWithdrawModalUnified]);

  const openAvatarModalHandler = useCallback(() => {
    openAvatarModal();
  }, [openAvatarModal]);

  const openPasswordModalHandler = useCallback(() => {
    openPasswordModal();
  }, [openPasswordModal]);

  const handleWithdrawModal = useCallback(async (amount, wallet) => {
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
          wallet: wallet
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, balance: data.balance }));
        // Обновляем профиль пользователя после вывода
        const profileRes = await fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const profileData = await profileRes.json();
        setUserData(profileData);
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
      } else {
        alert(data.error || 'Withdrawal error');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleModalWithdraw = useCallback(async () => {
    if (!modalAmount || isNaN(modalAmount) || Number(modalAmount) <= 0) {
      showError('Enter a valid withdrawal amount!');
      return;
    }
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: Number(modalAmount),
          wallet: walletAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, balance: data.balance }));
        // Обновляем профиль пользователя после вывода
        const profileRes = await fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const profileData = await profileRes.json();
        setUserData(profileData);
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
    closeWithdrawModal(); 
    setModalAmount(''); 
    setWalletAddress('');
      } else {
        showError(data.error || 'Withdrawal error');
      }
    } finally {
      setModalLoading(false);
    }
  }, [modalAmount, walletAddress, token]);

  // Добавляем стейты для депозита
  const [depositAddress, setDepositAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);

  const closeModal = useCallback(() => {
    closeDepositModal();
    closeWithdrawModal();
    setModalAmount('');
    setWalletAddress('');
    setDepositAddress('');
  }, [closeDepositModal, closeWithdrawModal]);

  const generateDepositAddress = useCallback(async () => {
    setIsGeneratingAddress(true);
    try {
      const res = await fetch(`${API}/api/deposit/generate-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ network: selectedNetwork })
      });
      const data = await res.json();
      if (res.ok) {
        setDepositAddress(data.depositAddress);
        showSuccess(`Deposit address generated for ${selectedNetwork} network`);
      } else {
        showError(data.error || 'Failed to generate deposit address');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setIsGeneratingAddress(false);
    }
  }, [selectedNetwork, token, showSuccess, showError]);

  const handleModalDeposit = useCallback(async () => {
    if (!modalAmount || isNaN(modalAmount) || Number(modalAmount) <= 0) {
      showError('Enter a valid deposit amount!');
      return;
    }
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/api/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(modalAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setUserData(u => ({ ...u, balance: data.balance }));
        fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json()).then(setTransactions);
        closeModal();
      } else {
        showError(data.error || 'Deposit error');
      }
    } finally {
      setModalLoading(false);
    }
  }, [modalAmount, token, showError, closeModal]);

  // Image compression utility
  const compressImage = useCallback((file, maxWidth = 100, maxHeight = 100, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Profile management functions
  const handleAvatarUpload = useCallback(async () => {
    if (!avatarFile) return;
    
    setProfileLoading(true);
    try {
      // Проверяем формат файла
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowedTypes.includes(avatarFile.type)) {
        showError('Only PNG, JPG, JPEG, and SVG files are allowed');
        setProfileLoading(false);
        return;
      }

      // Проверяем размер файла
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (avatarFile.size > maxSize) {
        showError('Image size must be less than 2MB');
        setProfileLoading(false);
        return;
      }

      // Сжимаем изображение (только для растровых форматов)
      let fileToUpload = avatarFile;
      if (avatarFile.type !== 'image/svg+xml') {
        try {
          const compressedFile = await compressImage(avatarFile);
          fileToUpload = compressedFile;
          
          // Проверяем размер после сжатия
          if (compressedFile.size > 30 * 1024) { // 30KB
            // Если файл все еще слишком большой, попробуем сжать еще сильнее
            if (compressedFile.size > 50 * 1024) { // 50KB
              console.log('First compression resulted in', compressedFile.size, 'bytes, trying more aggressive compression');
              const secondCompression = await compressImage(avatarFile, 80, 80, 0.4);
              if (secondCompression.size < compressedFile.size) {
                fileToUpload = secondCompression;
              }
            }
            
            if (fileToUpload.size > 50 * 1024) { // 50KB
              showError('Image is too large even after compression. Please use a smaller image.');
              setProfileLoading(false);
              return;
            } else if (fileToUpload.size > 30 * 1024) { // 30KB
              showWarning('Image is large and may slow down login. Consider using a smaller image.');
            }
          }
        } catch (error) {
          console.error('Image compression error:', error);
          showError('Failed to compress image. Please try a different image.');
          setProfileLoading(false);
          return;
        }
      }
      
      const formData = new FormData();
      formData.append('avatar', fileToUpload, avatarFile.name);
      
      const res = await fetch(`${API}/api/profile/avatar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setUserAvatar(data.avatar); // Обновляем отдельное состояние аватара
        closeAvatarModal();
        setAvatarFile(null);
        showSuccess('Avatar updated successfully!');
      } else {
        showError(data.error || 'Failed to update avatar');
      }
    } catch (error) {
      console.error('Avatar update error:', error);
      showError('Failed to update avatar');
    }
    setProfileLoading(false);
  }, [avatarFile, token]);

  const handlePasswordChange = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
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
        closePasswordModal();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showSuccess('Password updated successfully');
      } else {
        showError(data.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      showError('Failed to update password');
    }
    setProfileLoading(false);
  }, [currentPassword, newPassword, confirmPassword, token]);

  // --- Invest logic ---
  const handleInvest = async (pkg, amount = purchaseAmount) => {
    if (!amount || isNaN(amount)) return showError('Enter amount');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/investments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ packageId: pkg.id, amount: Number(amount) })
      });
      const data = await res.json();
      if (res.ok) {
        // Инвестиция выполнена успешно - БЕЗ alert для скорости
        console.log(`Investment of $${amount} in ${data.name} completed successfully!`);
        
        setSelectedPackage(null);
        setPurchaseAmount('');
        
        // Обновляем баланс локально для скорости
        setUserData(prev => ({
          ...prev,
          balance: prev.balance - Number(amount)
        }));
        
        // Обновляем транзакции и профиль в фоне для обновления таблицы инвестиций
        Promise.all([
          fetch(`${API}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        .then(async ([transactionsRes, profileRes]) => {
          const [transactionsData, profileData] = await Promise.all([
            transactionsRes.json(),
            profileRes.json()
          ]);
          
          // Обновляем данные напрямую
          if (Array.isArray(transactionsData)) {
            setTransactions(transactionsData);
          }
          
          if (profileData && !profileData.error) {
            setUserData(profileData);
          }
        })
        .catch(error => console.error('Error updating data after investment:', error));
      } else {
        // Передаем ошибку в компонент через throw
        throw new Error(data.error || 'Investment error');
      }
    } catch (error) {
      console.error('Investment error:', error);
      // Передаем ошибку в компонент через throw
      throw error;
    } finally {
      setLoading(false);
    }
  };



  // --- Navigation ---
  const navigation = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'Finance' },
    { id: 'packages', icon: Package, label: 'Packages' },
    { id: 'referrals', icon: Users, label: 'Statistics' },
    { id: 'team', icon: UserPlus, label: 'Team' },
    { id: 'rankrewards', icon: Award, label: 'Bonuses' },
    { id: 'report', icon: BarChart3, label: 'Report' }
  ];

  // Logout button - positioned separately at the bottom
  const logoutButton = { id: 'logout', icon: LogOut, label: 'Logout' };

  // --- Main Render ---
  if (isAuthLoading) {
    return (
      <div className="glass-bg min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
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
      {/* Hamburger for mobile - positioned at top right */}
      <button
        className={`sm:hidden fixed top-4 right-4 z-50 bg-black/50 rounded-lg p-2 flex items-center justify-center transition-opacity ${
          mobileSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={28} className="text-orange-500" />
      </button>
      <div className="mt-2 sm:mt-0">
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
              <div className="fixed top-0 left-0 h-full w-full bg-black/90 glass-sidebar z-50 flex flex-col p-6 animate-slide-in-left shadow-2xl">
                {/* Header with close button */}
                <div className="flex items-center justify-between mb-8">
                  {/* Logo */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center logo-glow">
                      <div className="w-6 h-6 bg-black rounded-sm"></div>
                    </div>
                    <span className="text-white font-bold text-lg">MARGIN SPACE</span>
                  </div>
                  {/* Close button */}
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="w-8 h-8 bg-gray-800 border border-orange-500 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                {/* Navigation */}
                <div className="flex flex-col space-y-2 flex-1">
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
                        className={`flex items-center justify-center space-x-4 w-full p-4 rounded-xl transition-colors border border-white/10 text-center ${
                          isActive 
                            ? 'text-orange-400 border-orange-500/30' 
                            : 'text-white hover:text-orange-400 hover:border-orange-500/30'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Logout button at bottom */}
                <div className="mt-auto">
                  <button
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center justify-center space-x-4 w-full p-4 rounded-xl transition-colors border border-white/10 text-white hover:text-red-400 hover:border-red-500/30"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Log out</span>
                   
                  </button>
                  

                </div>
              </div>
            </>
          )}
          {/* Main Content */}
          <div className="flex-1 p-2 sm:p-6 sm:pl-32 pt-0 sm:pt-6 min-w-0">
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
                        <button onClick={openDepositModalHandler} className="flex-1 orange-button text-white py-2 px-4 rounded-lg">Deposit</button>
                        <button onClick={openWithdrawModalHandler} className="flex-1 inactive-button text-white py-2 px-4 rounded-lg">Withdraw</button>
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
                    <h3 className="text-xl font-semibold text-white mb-4">You profile</h3>
                    <div className="mb-4 flex items-center gap-3 sm:gap-4">
                      <div className="relative flex-shrink-0">
                        {userAvatar ? (
                          <img 
                            src={userAvatar} 
                            alt="Avatar" 
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gray-700 flex items-center justify-center text-xl sm:text-2xl text-white cursor-pointer hover:bg-gray-600 transition-colors"
                            onClick={() => {
                              console.log('Avatar clicked, loading...');
                              loadUserAvatar(); // Загружаем аватар при клике
                            }}
                            title="Click to load avatar"
                          >
                            {userAvatar === null ? (
                              <span>{userData.username?.[0] || 'U'}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">No Avatar</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-semibold text-white truncate">{userData.username}</div>
                        <div className="text-gray-400 text-xs sm:text-sm truncate">{userData.email}</div>
                        <div className="text-orange-400 text-xs sm:text-sm">
                          {currentRank === 0 ? 'No rank' : `Rank ${currentRank}`}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                        <button 
                          onClick={openPasswordModalHandler}
                          className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-1.5 sm:p-2 rounded-lg transition-all duration-200"
                          title="Change Password"
                        >
                          <Lock size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button 
                          onClick={openAvatarModalHandler}
                          className="bg-orange-500/60 hover:bg-orange-500 text-white p-1.5 sm:p-2 rounded-lg transition-all duration-200"
                          title="Change Avatar"
                        >
                          <Camera size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[rgb(249,115,22)] text-xs sm:text-sm mb-1">Referral link</div>
                        <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
                          <span className="text-gray-300 text-xs sm:text-sm flex-1 truncate">{referralLink}</span>
                          <button className="text-orange-400 hover:text-orange-300 glass-button px-2 py-1 rounded text-xs flex-shrink-0" onClick={() => {navigator.clipboard.writeText(referralLink);}}>Copy</button>
                        </div>
                      </div>
                      
                      {/* Compact Rank Progress Bar */}
                      {nextRankData && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="text-xs">Progress to next rank</span>
                            <span className="text-xs">{Math.round((turnover / nextRankData.turnover) * 100)}%</span>
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
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-white mb-1">Your Investments</h3>
                      <p className="text-gray-300 opacity-70 text-sm">View your active investment packages and earnings</p>
                    </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90">
                          <tr>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tl-lg">Package</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Amount</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Earned</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">Start Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase">End Date</th>
                          <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Status</th>
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
                    <button onClick={openDepositModalHandler} className="orange-button text-white py-1.5 px-3 rounded-lg text-sm w-full sm:w-auto">Deposit</button>
                    <button onClick={openWithdrawModalHandler} className="inactive-button text-white py-1.5 px-3 rounded-lg text-sm w-full sm:w-auto">Withdraw</button>
                  </div>
                </Card>
                {/* Transaction History Table */}
                <Card>
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-white mb-1">Transaction History</h3>
                    <p className="text-gray-300 opacity-70 text-sm">View your recent transaction activity</p>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="max-h-[400px] overflow-y-auto rounded-xl border border-white/10 bg-white/5">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90">
                          <tr>
                            <th className="py-3 px-4 text-left font-semibold text-white uppercase">Date</th>
                            <th className="py-3 px-4 text-left font-semibold text-white uppercase">Type</th>
                            <th className="py-3 px-4 text-left font-semibold text-white uppercase">Amount</th>
                            <th className="py-3 px-4 text-left font-semibold text-white uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.filter(tx => tx.type !== 'Deposit address').map((tx, i) => (
                            <tr
                              key={i}
                              className={`transition-all duration-200 ${i % 2 === 0 ? 'bg-white/10 hover:bg-cyan-400/10' : 'bg-white/5 hover:bg-cyan-400/15'}`}
                            >
                              <td className="py-3 px-4 text-gray-200">{new Date(tx.createdAt).toLocaleDateString()}</td>
                              <td className={`py-3 px-4 font-semibold ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-orange-400'}`}>{tx.type}
                                {tx.type === 'WITHDRAWAL' && tx.description && (
                                  <div
                                    className="wallet-address text-xs text-gray-300 font-mono opacity-70 max-w-[180px] truncate cursor-pointer"
                                    title="Click to copy"
                                    onClick={() => tx.description && navigator.clipboard.writeText(tx.description.replace('Withdrawal to ', ''))}
                                  >
                                    {tx.description.replace('Withdrawal to ', '')}
                                  </div>
                                )}
                          </td>
                              <td className={`py-3 px-4 font-mono font-bold ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-orange-400'}`}>${Number(tx.amount).toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-xs uppercase
                                    ${tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                      tx.status === 'PENDING' ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 animate-pulse' :
                                      tx.status === 'REJECTED' || tx.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}`}
                                >
                            {tx.status === 'PENDING' ? (
                                    <>
                                      Pending
                                      <span className="ml-1 loading-dot bg-yellow-400"></span>
                                      <span className="loading-dot bg-yellow-400"></span>
                                      <span className="loading-dot bg-yellow-400"></span>
                                    </>
                            ) : tx.status === 'COMPLETED' ? (
                                    'Completed'
                                  ) : tx.status === 'REJECTED' || tx.status === 'FAILED' ? (
                                    'Rejected'
                                  ) : (
                                    tx.status
                                  )}
                                </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                  </div>
                  <style>{`
                    .loading-dot {
                      display: inline-block;
                      width: 4px;
                      height: 4px;
                      border-radius: 50%;
                      margin: 0 1px;
                      animation: loading 1.4s infinite ease-in-out;
                    }
                    .loading-dot:nth-child(2) { animation-delay: -0.32s; }
                    .loading-dot:nth-child(3) { animation-delay: -0.16s; }
                    @keyframes loading {
                      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
                      40% { transform: scale(1); opacity: 1; }
                    }
                  `}</style>
                </Card>
              </div>
            )}
            {/* Deposit/Withdraw Modals */}
            <Modal
              isOpen={showDepositModal}
              onClose={closeDepositModal}
              title="Deposit Funds"
              size="md"
            >
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 text-sm">Generate a unique deposit address for secure cryptocurrency transfers</p>
                </div>
                
                <div>
                  <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select Network</label>
                  <select 
                    value={selectedNetwork} 
                    onChange={e => setSelectedNetwork(e.target.value)}
                    className="w-full glass-input px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="BSC">BSC (Binance Smart Chain)</option>
                    <option value="TRX">TRX (Tron Network)</option>
                  </select>
                </div>

                {!depositAddress ? (
                  <button 
                    onClick={generateDepositAddress} 
                    className="w-full orange-button text-white py-3 rounded-lg" 
                    disabled={isGeneratingAddress}
                  >
                    {isGeneratingAddress ? 'Generating Address...' : 'Generate Deposit Address'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[rgb(249,115,22)] text-sm mb-2">Your Deposit Address ({selectedNetwork})</label>
                      <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-white font-mono text-sm break-all">{depositAddress}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(depositAddress);
                            showSuccess('Address copied to clipboard!');
                          }}
                          className="ml-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <p className="text-green-400 text-sm">
                        <strong>Important:</strong> Send only {selectedNetwork} compatible tokens to this address. 
                        Funds will be automatically credited to your account after network confirmation.
                      </p>
                    </div>

                    <button 
                      onClick={generateDepositAddress} 
                      className="w-full glass-button text-white py-2 rounded-lg"
                      disabled={isGeneratingAddress}
                    >
                      {isGeneratingAddress ? 'Generating...' : 'Generate New Address'}
                    </button>
                  </div>
                )}
                
                <button onClick={closeDepositModal} className="w-full glass-button text-white py-2 rounded-lg">Close</button>
              </div>
            </Modal>

            <Modal
              isOpen={showWithdrawModal}
              onClose={closeWithdrawModal}
              title="Withdraw Funds"
              size="md"
            >
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
                <button onClick={closeWithdrawModal} className="w-full glass-button text-white py-2 rounded-lg">Cancel</button>
              </div>
            </Modal>
            {currentPage === 'packages' && <SimpleInvestmentPage userData={userData} packages={packages} onInvest={handleInvest} loading={loading} />}
            {currentPage === 'referrals' && <ReferralSystemPage userData={userData} referralTree={referralTree} referralLink={referralLink} packages={packages} transactions={transactions} sponsor={sponsor} currentRank={currentRank} sponsorAvatar={sponsorAvatar} loadSponsorAvatar={loadSponsorAvatar} userAvatar={userAvatar} loadUserAvatar={loadUserAvatar} />}
            {currentPage === 'team' && <TeamPage referralTree={referralTree} userData={userData} tableView={tableView} currentRank={currentRank} />}
            {currentPage === 'rankrewards' && <RankRewardsPage onRankUpdate={handleRankUpdate} userData={userData} />}
            {currentPage === 'report' && <ReportPage userData={userData} />}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={closeAvatarModal}
        title="Change Avatar"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select Image</label>
            <input 
              type="file" 
              accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
                  if (!allowedTypes.includes(file.type)) {
                    showError('Only PNG, JPG, JPEG, and SVG files are allowed');
                    e.target.value = '';
                    return;
                  }
                  setAvatarFile(file);
                }
              }}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
            />
            <div className="text-xs text-gray-400 mt-1">
              Supported formats: PNG, JPG, JPEG, SVG. Max size: 2MB. Images will be automatically compressed to 100x100px for optimal performance
            </div>
          </div>
          {avatarFile && (
            <div className="text-sm text-gray-300">
              Selected: {avatarFile.name} ({(avatarFile.size / 1024).toFixed(1)} KB)
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
                closeAvatarModal();
                setAvatarFile(null);
              }} 
              className="flex-1 glass-button text-white py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={closePasswordModal}
        title="Change Password"
        size="md"
      >
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
                closePasswordModal();
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
      </Modal>



      {/* Withdraw Modal (унифицированный) */}
      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={closeWithdrawModalUnified}
        onWithdraw={handleWithdrawModal}
        balance={userData.balance}
        savedWallet={userData.wallet}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default InvestorDashboard; 