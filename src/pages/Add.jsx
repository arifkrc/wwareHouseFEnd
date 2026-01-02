import { useState } from 'react';
import { Plus, Package, Archive } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useToast } from '../hooks/useToast';
import api from '../services/api';
import { parseCSV } from '../utils/csvParser';
import './Add.scss';


export default function Add() {
  const { isAdmin } = useAuth();
  const { items, refresh: refreshItems, createItem, bulkCreateItems, loading: itemsLoading } = useItems();
  const { locations, loading: locationsLoading } = useLocations();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('stock');

  // Ürün ekleme formu
  const [productForm, setProductForm] = useState({
    item_code: '',
    item_name: '',
    description: ''
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // Bulk CSV import state (admin only)
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

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
    <div className="container add-page" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1><Plus size={28} strokeWidth={2} /> Ekle</h1>
        <p>Yeni ürün ve stok ekleyin</p>
      </div>

      <div className="add-tabs">
        {isAdmin && (
          <button
            className={`tab-button ${activeTab === 'product' ? 'active' : ''}`}
            onClick={() => setActiveTab('product')}
          >
            <Package size={18} />
            Ürün Ekle
          </button>
        )}
        <button
          className={`tab-button ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Archive size={18} />
          Stok Ekle
        </button>
      </div>

      <div className="add-content">
        {isAdmin && activeTab === 'product' && (
          <div className="card">
            <h3><Package size={20} strokeWidth={2} /> Yeni Ürün Ekle</h3>
            <p className="help-text">Sisteme yeni bir ürün ekleyin. Daha sonra bu ürüne stok atayabilirsiniz.</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
                CSV Yükle
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target.result;
                      const { parsedItems, errors } = parseCSV(text);

                      if (errors.length) setBulkError(errors.join('; ')); else setBulkError('');
                      setBulkItems(parsedItems);
                      setBulkSuccess(parsedItems.length > 0 ? `${parsedItems.length} satır yüklendi` : '');
                    };
                    reader.readAsText(file);
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <button type="button" className="btn btn-outline" onClick={() => {
                const csv = 'item_code,item_name,description,initial_quantity,location_code\nPRD-001,Örnek Ürün,Açıklama,10,SOL-1';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'toplu-urun-sablonu.csv'; a.click();
              }}>CSV Şablon İndir</button>
            </div>

            {bulkError && <div className="alert alert-error">{bulkError}</div>}
            {bulkSuccess && <div className="alert alert-success">{bulkSuccess}</div>}
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

              {/* Bulk import action */}
              {bulkItems.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={bulkLoading}
                    onClick={async () => {
                      setBulkLoading(true);
                      setBulkError('');
                      setBulkSuccess('');
                      try {
                        // Map parsed CSV rows to bulkCreateItems shape
                        const toSend = bulkItems.map(b => ({
                          item_code: b.item_code,
                          item_name: b.item_name,
                          description: b.description || '',
                          quantity: b.quantity || 0,
                          // backend bulk endpoint accepts location_id; we allow location_code -> null
                          location_code: b.location_code || null
                        }));
                        // useItems.bulkCreateItems expects items with location_id; the backend supports location_code as well
                        await bulkCreateItems(toSend);
                        setBulkSuccess(`${toSend.length} ürün başarıyla yüklendi`);
                        setBulkItems([]);
                        await refreshItems();
                      } catch (err) {
                        setBulkError(err.response?.data?.error || err.message || 'Toplu ekleme başarısız');
                      } finally { setBulkLoading(false); }
                    }}
                  >{bulkLoading ? 'Yükleniyor...' : 'CSV ile Toplu Ekle'}</button>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="card">
            <h3><Archive size={20} strokeWidth={2} /> Stok Ekle</h3>
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
