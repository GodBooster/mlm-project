import React, { useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AvatarChangeModal = ({ isOpen, onClose, token, showSuccess, showError, onAvatarUpdate }) => {
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Image compression utility
  const compressImage = useCallback((file, maxWidth = 100, maxHeight = 100, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Сброс состояния при закрытии
  const resetState = useCallback(() => {
    setAvatarFile(null);
    setLoading(false);
  }, []);

  // Обработчик закрытия модального окна
  const handleClose = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    resetState();
    onClose();
  }, [onClose, resetState]);

  // Обработчик выбора файла
  const handleFileChange = useCallback((e) => {
    e.stopPropagation();
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
  }, [showError]);

  // Обработчик загрузки аватара
  const handleAvatarUpload = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!avatarFile) return;
    
    setLoading(true);
    try {
      let fileToUpload = avatarFile;
      
      // Compress image if it's not SVG
      if (avatarFile.type !== 'image/svg+xml') {
        try {
          fileToUpload = await compressImage(avatarFile);
          console.log(`Original size: ${(avatarFile.size / 1024).toFixed(1)}KB, Compressed: ${(fileToUpload.size / 1024).toFixed(1)}KB`);
        } catch (compressionError) {
          console.error('Compression failed, using original:', compressionError);
          fileToUpload = avatarFile;
        }
      }
      
      const formData = new FormData();
      formData.append('avatar', fileToUpload);
      
      const res = await fetch(`${API}/api/profile/avatar`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        onAvatarUpdate(data.avatar); // Обновляем отдельное состояние аватара
        showSuccess('Avatar updated successfully!');
        handleClose();
      } else {
        showError(data.error || 'Failed to update avatar');
      }
    } catch (error) {
      console.error('Avatar update error:', error);
      showError('Failed to update avatar');
    } finally {
      setLoading(false);
    }
  }, [avatarFile, token, compressImage, onAvatarUpdate, showSuccess, showError, handleClose]);

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
        <h3 className="text-xl font-semibold text-white mb-4">Change Avatar</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select Image</label>
            <input 
              type="file" 
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleFileChange}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none" 
              disabled={loading}
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
              disabled={!avatarFile || loading}
              className="flex-1 orange-button text-white py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Uploading...' : 'Upload Avatar'}
            </button>
            <button 
              onClick={handleClose} 
              disabled={loading}
              className="flex-1 glass-button text-white py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarChangeModal;
