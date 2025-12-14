import { useState } from 'react';
import { Settings as SettingsIcon, MapPin, Package, Trash2, Edit2, Plus, Save, X } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import './Settings.css';

export default function Settings() {
  const { locations, loading: locationsLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  const { items, loading: itemsLoading, createItem, updateItem, deleteItem } = useItems();
  const { toasts, removeToast, success, error } = useToast();
  
  const [activeTab, setActiveTab] = useState('locations');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState({
    location_code: '',
    description: ''
  });
  
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    item_code: '',
    item_name: '',
    description: ''
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  // Location operations
  const openLocationModal = (location = null) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm({
        location_code: location.location_code,
        description: location.description || ''
      });
    } else {
      setEditingLocation(null);
      setLocationForm({
        location_code: '',
        description: ''
      });
    }
    setShowLocationModal(true);
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, locationForm);
        success(`Lokasyon güncellendi: ${locationForm.location_code}`);
      } else {
        await createLocation(locationForm);
        success(`Lokasyon oluşturuldu: ${locationForm.location_code}`);
      }
      setShowLocationModal(false);
    } catch (err) {
      error(err.response?.data?.error || 'İşlem sırasında hata oluştu');
    }
  };

  const handleDeleteLocation = async (location) => {
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

  // Item operations
  const openItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({
        item_code: '',
        item_name: '',
        description: ''
      });
    }
    setShowItemModal(true);
  };

  const handleItemModalSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemForm);
        success(`Ürün güncellendi: ${itemForm.item_name}`);
      } else {
        await createItem(itemForm);
        success(`Ürün oluşturuldu: ${itemForm.item_name}`);
      }
      setShowItemModal(false);
    } catch (err) {
      error(err.response?.data?.error || 'İşlem sırasında hata oluştu');
    }
  };

  const openItemEdit = (item) => {
    setEditingItem(item);
    setItemForm({
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description || ''
    });
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateItem(editingItem.id, itemForm);
      success(`Ürün güncellendi: ${itemForm.item_name}`);
      setEditingItem(null);
    } catch (err) {
      error(err.response?.data?.error || 'Ürün güncellenemedi');
    }
  };

  const handleDeleteItem = async (item) => {
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

  const cancelItemEdit = () => {
    setEditingItem(null);
    setItemForm({
      item_code: '',
      item_name: '',
      description: ''
    });
  };

  if (locationsLoading || itemsLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1><SettingsIcon size={28} /> Sistem Ayarları</h1>
        <p>Lokasyonları ve ürünleri yönetin</p>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-button ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          <MapPin size={18} />
          Lokasyonlar ({locations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Package size={18} />
          Ürünler ({items.length})
        </button>
      </div>

      {activeTab === 'locations' && (
        <div className="settings-content">
          <div className="content-header">
            <h2>Lokasyon Yönetimi</h2>
            <button className="btn btn-primary" onClick={() => openLocationModal()}>
              <Plus size={18} />
              Yeni Lokasyon
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Lokasyon Kodu</th>
                  <th>Açıklama</th>
                  <th>Ürün Sayısı</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(location => (
                  <tr key={location.id}>
                    <td><strong>{location.location_code}</strong></td>
                    <td>{location.description || '-'}</td>
                    <td>
                      <span className="badge badge-info">
                        {location.item_count || 0} ürün
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon btn-primary"
                          onClick={() => openLocationModal(location)}
                          title="Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-danger"
                          onClick={() => handleDeleteLocation(location)}
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      Henüz lokasyon yok. Yeni lokasyon ekleyin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="settings-content">
          <div className="content-header">
            <h2>Ürün Kataloğu</h2>
            <button className="btn btn-primary" onClick={() => openItemModal()}>
              <Plus size={18} />
              Yeni Ürün Ekle
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün Kodu</th>
                  <th>Ürün Adı</th>
                  <th>Açıklama</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    {editingItem?.id === item.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={itemForm.item_code}
                            onChange={(e) => setItemForm({...itemForm, item_code: e.target.value})}
                            disabled
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={itemForm.item_name}
                            onChange={(e) => setItemForm({...itemForm, item_name: e.target.value})}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={itemForm.description}
                            onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                            placeholder="Açıklama..."
                          />
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-icon btn-success"
                              onClick={handleItemSubmit}
                              title="Kaydet"
                            >
                              <Save size={16} />
                            </button>
                            <button 
                              className="btn-icon btn-outline"
                              onClick={cancelItemEdit}
                              title="İptal"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><strong>{item.item_code}</strong></td>
                        <td>{item.item_name}</td>
                        <td>{item.description || '-'}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn-icon btn-primary"
                              onClick={() => openItemEdit(item)}
                              title="Düzenle"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              className="btn-icon btn-danger"
                              onClick={() => handleDeleteItem(item)}
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      Henüz ürün yok. Toplu Ürün Girişi sayfasından ürün ekleyin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <MapPin size={20} />
                {editingLocation ? 'Lokasyon Düzenle' : 'Yeni Lokasyon'}
              </h3>
              <button className="modal-close" onClick={() => setShowLocationModal(false)}>×</button>
            </div>

            <form onSubmit={handleLocationSubmit}>
              <div className="form-group">
                <label className="form-label">Lokasyon Kodu *</label>
                <input
                  type="text"
                  className="form-input"
                  value={locationForm.location_code}
                  onChange={(e) => setLocationForm({...locationForm, location_code: e.target.value})}
                  placeholder="Örn: SOL-1, SAG-2, KORIDOR-3"
                  required
                  disabled={!!editingLocation}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  className="form-textarea"
                  value={locationForm.description}
                  onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                  placeholder="Lokasyon açıklaması..."
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowLocationModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingLocation ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Package size={20} />
                {editingItem ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
              </h3>
              <button className="modal-close" onClick={() => setShowItemModal(false)}>×</button>
            </div>

            <form onSubmit={handleItemModalSubmit}>
              <div className="form-group">
                <label className="form-label">Ürün Kodu *</label>
                <input
                  type="text"
                  className="form-input"
                  value={itemForm.item_code}
                  onChange={(e) => setItemForm({...itemForm, item_code: e.target.value})}
                  placeholder="Örn: PROD-001"
                  required
                  disabled={!!editingItem}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ürün Adı *</label>
                <input
                  type="text"
                  className="form-input"
                  value={itemForm.item_name}
                  onChange={(e) => setItemForm({...itemForm, item_name: e.target.value})}
                  placeholder="Ürün adı girin..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Açıklama</label>
                <textarea
                  className="form-textarea"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  placeholder="Ürün açıklaması..."
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowItemModal(false)}>
                  İptal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  {editingItem ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />
    </div>
  );
}
