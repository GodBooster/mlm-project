import React, { useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PasswordChangeModal = ({ isOpen, onClose, token, showSuccess, showError }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Сброс полей при закрытии
  const resetFields = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  // Обработчик закрытия модального окна
  const handleClose = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    resetFields();
    onClose();
  }, [onClose, resetFields]);

  // Обработчики изменения полей
  const handleCurrentPasswordChange = useCallback((e) => {
    e.stopPropagation();
    setCurrentPassword(e.target.value);
  }, []);

  const handleNewPasswordChange = useCallback((e) => {
    e.stopPropagation();
    setNewPassword(e.target.value);
  }, []);

  const handleConfirmPasswordChange = useCallback((e) => {
    e.stopPropagation();
    setConfirmPassword(e.target.value);
  }, []);

  // Обработчик отправки формы
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (newPassword !== confirmPassword) {
      showError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
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
        showSuccess('Password updated successfully');
        handleClose();
      } else {
        showError(data.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      showError('Failed to update password');
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, token, showError, showSuccess, handleClose]);

  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
      onClick={handleClose}
      style={{ 
        isolation: 'isolate',
        contain: 'layout style paint',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="glass-modal p-6 w-full max-w-md rounded-2xl relative"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1
        }}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">Current Password</label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={handleCurrentPasswordChange}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
              placeholder="Enter current password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={handleNewPasswordChange}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword || loading}
              className="flex-1 orange-button text-white py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <button 
              type="button"
              onClick={handleClose} 
              disabled={loading}
              className="flex-1 glass-button text-white py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
