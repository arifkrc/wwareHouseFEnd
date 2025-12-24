import { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import Button from '../common/Button';
import Table from '../common/Table';
import { useItems } from '../../hooks/useItems';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../ConfirmDialog';

export default function ItemSettings() {
    const { items, loading, createItem, updateItem, deleteItem } = useItems();
    const { success, error } = useToast();

    const [showModal, setShowModal] = useState(false);

    // Inline editing state
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        item_code: '',
        item_name: '',
        description: ''
    });

    // Confirm Dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'danger'
    });

    // Modal (Create) Operations
    const openCreateModal = () => {
        setFormData({
            item_code: '',
            item_name: '',
            description: ''
        });
        setEditingItem(null); // Ensure we are not in inline edit mode effectively
        setShowModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            await createItem(formData);
            success(`Ürün oluşturuldu: ${formData.item_name}`);
            setShowModal(false);
        } catch (err) {
            error(err.response?.data?.error || 'İşlem sırasında hata oluştu');
        }
    };

    // Inline Edit Operations
    const startEditing = (item) => {
        setEditingItem(item);
        setFormData({
            item_code: item.item_code,
            item_name: item.item_name,
            description: item.description || ''
        });
        // Ensure modal is closed
        setShowModal(false);
    };

    const cancelEditing = () => {
        setEditingItem(null);
        setFormData({ item_code: '', item_name: '', description: '' });
    };

    const handleUpdateSubmit = async () => {
        if (!editingItem) return;
        try {
            await updateItem(editingItem.id, formData);
            success(`Ürün güncellendi: ${formData.item_name}`);
            setEditingItem(null);
        } catch (err) {
            error(err.response?.data?.error || 'Ürün güncellenemedi');
        }
    };

    // Delete Operation
    const handleDelete = async (item) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Ürün Sil',
            message: `"${item.item_name}" (${item.item_code}) ürününü silmek istediğinizden emin misiniz?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await deleteItem(item.id);
                    success(`Ürün silindi: ${item.item_name}`);
                } catch (err) {
                    error(err.response?.data?.error || 'Ürün silinemedi');
                }
            }
        });
    };



    return (
        <div className="settings-content">
            <div className="content-header">
                <h2>Ürün Kataloğu</h2>
                <Button onClick={openCreateModal} icon={Plus}>
                    Yeni Ürün Ekle
                </Button>
            </div>

            <div className="table-container">
                <Table
                    columns={[
                        {
                            header: 'Ürün Kodu',
                            accessor: 'item_code',
                            cell: (row) => {
                                if (editingItem?.id === row.id) {
                                    return (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.item_code}
                                            onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                            disabled
                                        />
                                    );
                                }
                                return <strong>{row.item_code}</strong>;
                            }
                        },
                        {
                            header: 'Ürün Adı',
                            accessor: 'item_name',
                            cell: (row) => {
                                if (editingItem?.id === row.id) {
                                    return (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.item_name}
                                            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                        />
                                    );
                                }
                                return row.item_name;
                            }
                        },
                        {
                            header: 'Açıklama',
                            accessor: 'description',
                            cell: (row) => {
                                if (editingItem?.id === row.id) {
                                    return (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Açıklama..."
                                        />
                                    );
                                }
                                return row.description || '-';
                            }
                        },
                        {
                            header: 'İşlemler',
                            cell: (row) => {
                                if (editingItem?.id === row.id) {
                                    return (
                                        <div className="action-buttons">
                                            <Button
                                                variant="icon"
                                                className="btn-success"
                                                onClick={handleUpdateSubmit}
                                                title="Kaydet"
                                                icon={Save}
                                            />
                                            <Button
                                                variant="icon"
                                                className="btn-outline"
                                                onClick={cancelEditing}
                                                title="İptal"
                                                icon={X}
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <div className="action-buttons">
                                        <Button
                                            variant="icon"
                                            className="btn-primary"
                                            onClick={() => startEditing(row)}
                                            title="Düzenle"
                                            icon={Edit2}
                                        />
                                        <Button
                                            variant="icon"
                                            className="btn-danger"
                                            onClick={() => handleDelete(row)}
                                            title="Sil"
                                            icon={Trash2}
                                        />
                                    </div>
                                );
                            }
                        }
                    ]}
                    data={items}
                    isLoading={loading}
                    emptyMessage="Henüz ürün yok. Toplu Ürün Girişi sayfasından ürün ekleyin."
                />
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <Package size={20} />
                                Yeni Ürün Ekle
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleCreateSubmit}>
                            <div className="form-group">
                                <label className="form-label">Ürün Kodu *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                    placeholder="Örn: PROD-001"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ürün Adı *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    placeholder="Ürün adı girin..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Açıklama</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ürün açıklaması..."
                                    rows="3"
                                />
                            </div>

                            <div className="modal-footer">
                                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
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
