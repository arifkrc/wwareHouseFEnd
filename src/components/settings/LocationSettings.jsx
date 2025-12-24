import { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Save } from 'lucide-react';
import Button from '../common/Button';
import Table from '../common/Table';
import { useLocations } from '../../hooks/useLocations';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../ConfirmDialog';

export default function LocationSettings() {
    const { locations, loading, createLocation, updateLocation, deleteLocation } = useLocations();
    const { success, error } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [formData, setFormData] = useState({
        location_code: '',
        description: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'danger'
    });

    const openModal = (location = null) => {
        if (location) {
            setEditingLocation(location);
            setFormData({
                location_code: location.location_code,
                description: location.description || ''
            });
        } else {
            setEditingLocation(null);
            setFormData({
                location_code: '',
                description: ''
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingLocation) {
                await updateLocation(editingLocation.id, formData);
                success(`Lokasyon güncellendi: ${formData.location_code}`);
            } else {
                await createLocation(formData);
                success(`Lokasyon oluşturuldu: ${formData.location_code}`);
            }
            setShowModal(false);
        } catch (err) {
            error(err.response?.data?.error || 'İşlem sırasında hata oluştu');
        }
    };

    const handleDelete = async (location) => {
        const itemCount = location.item_count || 0;
        if (itemCount > 0) {
            error(`Bu lokasyonda ${itemCount} ürün var. Önce ürünleri başka lokasyona taşıyın.`);
            return;
        }

        setConfirmDialog({
            isOpen: true,
            title: 'Lokasyon Sil',
            message: `"${location.location_code}" lokasyonunu silmek istediğinizden emin misiniz?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await deleteLocation(location.id);
                    success(`Lokasyon silindi: ${location.location_code}`);
                } catch (err) {
                    error(err.response?.data?.error || 'Lokasyon silinemedi');
                }
            }
        });
    };

    return (
        <div className="settings-content">
            <div className="content-header">
                <h2>Lokasyon Yönetimi</h2>
                <Button onClick={() => openModal()} icon={Plus}>
                    Yeni Lokasyon
                </Button>
            </div>

            <div className="table-container">
                <Table
                    columns={[
                        {
                            header: 'Lokasyon Kodu',
                            accessor: 'location_code',
                            cell: (row) => <strong>{row.location_code}</strong>
                        },
                        {
                            header: 'Açıklama',
                            accessor: 'description',
                            cell: (row) => row.description || '-'
                        },
                        {
                            header: 'Ürün Sayısı',
                            accessor: 'item_count',
                            cell: (row) => (
                                <span className="badge badge-info">
                                    {row.item_count || 0} ürün
                                </span>
                            )
                        },
                        {
                            header: 'İşlemler',
                            cell: (row) => (
                                <div className="action-buttons">
                                    <Button
                                        variant="icon"
                                        className="btn-primary"
                                        onClick={() => openModal(row)}
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
                            )
                        }
                    ]}
                    data={locations}
                    isLoading={loading}
                    emptyMessage="Henüz lokasyon yok. Yeni lokasyon ekleyin."
                />
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <MapPin size={20} />
                                {editingLocation ? 'Lokasyon Düzenle' : 'Yeni Lokasyon'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Lokasyon Kodu *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.location_code}
                                    onChange={(e) => setFormData({ ...formData, location_code: e.target.value })}
                                    placeholder="Örn: SOL-1, SAG-2, KORIDOR-3"
                                    required
                                    disabled={!!editingLocation}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Açıklama</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Lokasyon açıklaması..."
                                    rows="3"
                                />
                            </div>

                            <div className="modal-footer">
                                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" icon={Save}>
                                    {editingLocation ? 'Güncelle' : 'Oluştur'}
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
