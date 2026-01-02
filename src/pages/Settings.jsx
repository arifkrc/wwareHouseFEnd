import { useState } from 'react';
import { Settings as SettingsIcon, MapPin, Package, Users, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import Button from '../components/common/Button';
import LocationSettings from '../components/settings/LocationSettings';
import ItemSettings from '../components/settings/ItemSettings';
import UserSettings from '../components/settings/UserSettings';
import './Settings.scss';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('locations');

  // Password reset state (kept here as it's personal to the logged-in user)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      error('Şifre en az 6 karakter olmalı');
      return;
    }

    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      success('Şifreniz başarıyla değiştirildi');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      error(err.response?.data?.error || 'Şifre değiştirilemedi');
    }
  };

  return (
    <div className="container settings-page" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1><SettingsIcon size={28} strokeWidth={2} /> Sistem Ayarları</h1>
        <p>Lokasyonları ve ürünleri yönetin</p>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          <MapPin size={18} strokeWidth={2} />
          Lokasyonlar
        </button>
        <button
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Package size={18} strokeWidth={2} />
          Ürünler
        </button>
        <button
          className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <Lock size={18} strokeWidth={2} />
          Şifre Değiştir
        </button>
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} strokeWidth={2} />
            Kullanıcılar
          </button>
        )}
      </div>

      {activeTab === 'locations' && <LocationSettings />}

      {activeTab === 'items' && <ItemSettings />}

      {activeTab === 'users' && isAdmin && <UserSettings />}

      {activeTab === 'password' && (
        <div className="settings-content">
          <div className="content-header">
            <h2>Şifre Değiştir</h2>
            <p>Kendi şifrenizi buradan değiştirebilirsiniz</p>
          </div>

          <div style={{ maxWidth: '500px', margin: '2rem auto' }}>
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="form-group">
                <label className="form-label">Mevcut Şifre *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Yeni Şifre *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  minLength="6"
                  required
                />
                <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>En az 6 karakter</small>
              </div>

              <div className="form-group">
                <label className="form-label">Yeni Şifre Tekrar *</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  minLength="6"
                  required
                />
              </div>

              <Button type="submit" style={{ width: '100%', marginTop: '1rem' }} icon={Lock}>
                Şifreyi Değiştir
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
