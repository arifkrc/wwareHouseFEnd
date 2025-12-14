import { useState } from 'react';
import { Plus, Package, Archive } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import './Add.css';

export default function Add() {
  const { items, refresh: refreshItems, createItem, loading: itemsLoading } = useItems();
  const { locations, loading: locationsLoading } = useLocations();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('product');
  
  // Ürün ekleme formu
  const [productForm, setProductForm] = useState({
    item_code: '',
    item_name: '',
    description: ''
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Stok ekleme formu
  const [stockForm, setStockForm] = useState({
    item_id: '',
    quantity: '',
    to_location_id: '',
    movement_note: ''
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Ürün ekleme
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductSubmitting(true);

    try {
      await createItem(productForm);
      showToast('Ürün başarıyla eklendi', 'success');
      setProductForm({
        item_code: '',
        item_name: '',
        description: ''
      });
    } catch (error) {
      showToast(error.response?.data?.error || 'Ürün eklenirken hata oluştu', 'error');
    } finally {
      setProductSubmitting(false);
    }
  };

  // Stok ekleme
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    
    if (!stockForm.item_id || !stockForm.quantity || !stockForm.to_location_id) {
      showToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    setStockSubmitting(true);
    try {
      await api.post('/movements/in', {
        item_id: parseInt(stockForm.item_id),
        quantity: parseInt(stockForm.quantity),
        to_location_id: parseInt(stockForm.to_location_id),
        movement_note: stockForm.movement_note || 'Stok girişi'
      });

      showToast('Stok başarıyla eklendi', 'success');
      setStockForm({
        item_id: '',
        quantity: '',
        to_location_id: '',
        movement_note: ''
      });
      
      await refreshItems();
    } catch (error) {
      showToast(error.response?.data?.error || 'Stok eklenirken hata oluştu', 'error');
    } finally {
      setStockSubmitting(false);
    }
  };

  // Loading state
  if (itemsLoading || locationsLoading) {
    return (
      <div className="add-page">
        <div className="loading">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-page">
      <div className="page-header">
        <h1><Plus size={28} /> Ekle</h1>
        <p>Yeni ürün ve stok ekleyin</p>
      </div>

      <div className="add-tabs">
        <button 
          className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
          onClick={() => setActiveTab('product')}
        >
          <Package size={18} />
          Ürün Ekle
        </button>
        <button 
          className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Archive size={18} />
          Stok Ekle
        </button>
      </div>

      <div className="add-content">
        {activeTab === 'product' && (
          <div className="card">
            <h3><Package size={20} /> Yeni Ürün Ekle</h3>
            <p className="help-text">Sisteme yeni bir ürün ekleyin. Daha sonra bu ürüne stok atayabilirsiniz.</p>
            
            <form onSubmit={handleProductSubmit} className="add-form">
              <div className="form-group">
                <label htmlFor="item_code">Ürün Kodu *</label>
                <input
                  type="text"
                  id="item_code"
                  value={productForm.item_code}
                  onChange={(e) => setProductForm({ ...productForm, item_code: e.target.value })}
                  placeholder="Örn: 4210010"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="item_name">Ürün Adı *</label>
                <input
                  type="text"
                  id="item_name"
                  value={productForm.item_name}
                  onChange={(e) => setProductForm({ ...productForm, item_name: e.target.value })}
                  placeholder="Örn: Paletli Kutu"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Açıklama</label>
                <textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Ürün açıklaması (opsiyonel)"
                  rows="3"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={productSubmitting}
              >
                {productSubmitting ? 'Ekleniyor...' : 'Ürün Ekle'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="card">
            <h3><Archive size={20} /> Stok Ekle</h3>
            <p className="help-text">Mevcut bir ürüne lokasyona stok ekleyin.</p>
            
            <form onSubmit={handleStockSubmit} className="add-form">
              <div className="form-group">
                <label htmlFor="item_id">Ürün Seç *</label>
                <select
                  id="item_id"
                  value={stockForm.item_id}
                  onChange={(e) => setStockForm({ ...stockForm, item_id: e.target.value })}
                  required
                  disabled={items.length === 0}
                >
                  <option value="">
                    {items.length === 0 ? 'Önce ürün ekleyin...' : 'Ürün seçin...'}
                  </option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.item_code} - {item.item_name}
                    </option>
                  ))}
                </select>
                {items.length === 0 && (
                  <small style={{ color: '#ef4444', marginTop: '0.25rem' }}>
                    Ürün listesi boş. "Ürün Ekle" sekmesinden ürün ekleyin.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Miktar *</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max="1000000"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                  placeholder="Adet"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="to_location_id">Lokasyon *</label>
                <select
                  id="to_location_id"
                  value={stockForm.to_location_id}
                  onChange={(e) => setStockForm({ ...stockForm, to_location_id: e.target.value })}
                  required
                  disabled={locations.length === 0}
                >
                  <option value="">
                    {locations.length === 0 ? 'Lokasyon bulunamadı...' : 'Lokasyon seçin...'}
                  </option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.location_code} {location.description && `- ${location.description}`}
                    </option>
                  ))}
                </select>
                {locations.length === 0 && (
                  <small style={{ color: '#ef4444', marginTop: '0.25rem' }}>
                    Lokasyon listesi boş. Ayarlar'dan lokasyon ekleyin.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="movement_note">Not (Opsiyonel)</label>
                <input
                  type="text"
                  id="movement_note"
                  value={stockForm.movement_note}
                  onChange={(e) => setStockForm({ ...stockForm, movement_note: e.target.value })}
                  placeholder="Açıklama ekleyin..."
                  maxLength="500"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-large"
                disabled={stockSubmitting || items.length === 0 || locations.length === 0}
              >
                {stockSubmitting ? 'Ekleniyor...' : 'Stok Ekle'}
              </button>
              
              {(items.length === 0 || locations.length === 0) && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {items.length === 0 && 'Önce ürün ekleyin. '}
                  {locations.length === 0 && 'Lokasyon gerekli.'}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
