import { useState, useEffect } from 'react';
import { Users, Plus, Key, Trash2, Save, Shield } from 'lucide-react';
import Button from '../common/Button';
import Table from '../common/Table';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../ConfirmDialog';

export default function UserSettings() {
    const { success, error } = useToast();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create User State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'user'
    });

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [passwordForm, setPasswordForm] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'danger'
    });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/auth/users');
            setUsers(response.data);
        } catch (err) {
            error('Kullanıcılar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openCreateModal = () => {
        setFormData({
            username: '',
            password: '',
            full_name: '',
            role: 'user'
        });
        setShowCreateModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            success(`Kullanıcı oluşturuldu: ${formData.username}`);
            setShowCreateModal(false);
            fetchUsers();
        } catch (err) {
            error(err.response?.data?.error || 'Kullanıcı oluşturulamadı');
        }
    };

    const handleDelete = async (user) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Kullanıcı Sil',
            message: `"${user.full_name}" (${user.username}) kullanıcısını silmek istediğinizden emin misiniz?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/auth/users/${user.id}`);
                    success(`Kullanıcı silindi: ${user.username}`);
                    fetchUsers();
                } catch (err) {
                    error(err.response?.data?.error || 'Kullanıcı silinemedi');
                }
            }
        });
    };

    // Admin Change Password Logic
    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            error('Şifreler eşleşmiyor');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            error('Şifre en az 6 karakter olmalı');
            return;
        }

        try {
            await api.put(`/auth/users/${selectedUser.id}/password`, {
                newPassword: passwordForm.newPassword
            });
            success(`${selectedUser.username} kullanıcısının şifresi değiştirildi`);
            setShowPasswordModal(false);
            setSelectedUser(null);
        } catch (err) {
            error(err.response?.data?.error || 'Şifre değiştirilemedi');
        }
    };

    // Derived Logic for Permissions
    const canManageRole = (targetRole) => {
        if (currentUser.role === 'superadmin') return true;
        if (currentUser.role === 'admin' && targetRole === 'user') return true;
        return false;
    };

    return (
        <div className="settings-content">
            <div className="content-header">
                <h2>Kullanıcı Yönetimi</h2>
                <Button onClick={openCreateModal} icon={Plus}>
                    Yeni Kullanıcı Ekle
                </Button>
            </div>

            <div className="table-container">
                <Table
                    columns={[
                        {
                            header: 'Kullanıcı Adı',
                            accessor: 'username'
                        },
                        {
                            header: 'Ad Soyad',
                            accessor: 'full_name'
                        },
                        {
                            header: 'Rol',
                            accessor: 'role',
                            cell: (row) => (
                                <span className={`badge ${row.role === 'superadmin' ? 'badge-primary' : row.role === 'admin' ? 'badge-info' : 'badge-secondary'}`}>
                                    {row.role === 'superadmin' ? <><Shield size={12} style={{ marginRight: 4 }} /> Süper Admin</> :
                                        row.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                                </span>
                            )
                        },
                        {
                            header: 'İşlemler',
                            cell: (row) => {
                                // Prevent actions on self or higher roles
                                const isSelf = row.id === currentUser.id;
                                const canDelete = !isSelf && canManageRole(row.role);
                                const canEdit = !isSelf && canManageRole(row.role); // Same logic for password

                                return (
                                    <div className="action-buttons">
                                        {canEdit && (
                                            <Button
                                                variant="icon"
                                                className="btn-warning"
                                                onClick={() => openPasswordModal(row)}
                                                title="Şifre Değiştir"
                                                icon={Key}
                                            />
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="icon"
                                                className="btn-danger"
                                                onClick={() => handleDelete(row)}
                                                title="Sil"
                                                icon={Trash2}
                                            />
                                        )}
                                    </div>
                                );
                            }
                        }
                    ]}
                    data={users}
                    isLoading={loading}
                    emptyMessage="Henüz kullanıcı yok."
                />
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Users size={20} />
                                Yeni Kullanıcı Ekle
                            </h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleCreateSubmit}>
                            <div className="form-group">
                                <label className="form-label">Kullanıcı Adı *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Kullanıcı adı..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Şifre *</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Şifre..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ad Soyad</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Ad Soyad..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Rol</label>
                                <select
                                    className="form-select"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">Kullanıcı</option>
                                    {/* Only Superadmin can create Admin */}
                                    {currentUser?.role === 'superadmin' && (
                                        <>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Süper Admin</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="modal-footer">
                                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" icon={Save}>
                                    Oluştur
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Change Password Modal */}
            {showPasswordModal && selectedUser && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Key size={20} />
                                Şifre Değiştir ({selectedUser.username})
                            </h3>
                            <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
                        </div>

                        <form onSubmit={handlePasswordSubmit}>
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

                            <div className="modal-footer">
                                <Button variant="outline" type="button" onClick={() => setShowPasswordModal(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" icon={Save}>
                                    Değiştir
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
            />
        </div>
    );
}
