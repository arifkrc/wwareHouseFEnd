import { useState } from 'react';
import { Upload, Plus, Trash2, Save } from 'lucide-react';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { parseCSV } from '../utils/csvParser';
import './BulkImport.scss';

export default function BulkImport() {
  const { locations } = useLocations();
  const { bulkCreateItems } = useItems();

  const [items, setItems] = useState([
    { item_code: '', item_name: '', quantity: 0, location_id: '', description: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addRow = () => {
    setItems([...items, { item_code: '', item_name: '', quantity: 0, location_id: '', description: '' }]);
  };

  const removeRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];

    // Validate quantity field
    if (field === 'quantity') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) {
        newItems[index][field] = 0;
        return;
      }
      if (numValue > 1000000) {
        newItems[index][field] = 1000000;
        return;
      }
      newItems[index][field] = numValue;
    } else if (field === 'item_code') {
      // Validate item_code length
      newItems[index][field] = value.slice(0, 100);
    } else if (field === 'item_name') {
      // Validate item_name length
      newItems[index][field] = value.slice(0, 255);
    } else if (field === 'description') {
      // Validate description length
      newItems[index][field] = value.slice(0, 1000);
    } else {
      newItems[index][field] = value;
    }

    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate and filter items - prepare for backend
      const validItems = items.filter(item => {
        if (!item.item_code || !item.item_name) return false;
        if (item.item_code.length > 100 || item.item_name.length > 255) return false;
        if (item.quantity < 0 || item.quantity > 1000000) return false;
        return true;
      }).map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        location_id: item.location_id && item.location_id !== '' ? item.location_id : null
      }));

      if (validItems.length === 0) {
        setError('En az bir geçerli ürün girmelisiniz (Ürün kodu ve adı zorunludur)');
        setLoading(false);
        return;
      }

      // Check for duplicate item codes in the batch
      const itemCodes = validItems.map(item => item.item_code);
      const duplicates = itemCodes.filter((code, index) => itemCodes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        setError(`Duplicate ürün kodları tespit edildi: ${duplicates.join(', ')}`);
        setLoading(false);
        return;
      }

      await bulkCreateItems(validItems);
      setSuccess(`${validItems.length} ürün başarıyla eklendi`);
      setItems([{ item_code: '', item_name: '', quantity: 0, location_id: '', description: '' }]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Toplu ekleme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const { parsedItems, errors } = parseCSV(event.target.result);

      if (parsedItems.length > 0) {
        // Map parsed items: Try to find location_id from location_code
        const mappedItems = parsedItems.map(p => {
          const locCode = p.location_code ? p.location_code.trim().toUpperCase() : '';
          const foundLoc = locations.find(l => l.location_code === locCode);
          return {
            ...p,
            location_id: foundLoc ? foundLoc.id : ''
          };
        });

        setItems(mappedItems);
        setSuccess(`${mappedItems.length} satır CSV'den yüklendi${errors.length > 0 ? ` (${errors.length} hata atlandı)` : ''}`);
      }

      if (errors.length > 0) {
        setError(errors.join(', '));
      } else if (parsedItems.length === 0) {
        setError('CSV dosyası geçerli ürün içermiyor');
      }
    };
    reader.readAsText(file);
  };

  const exportTemplate = () => {
    const csv = 'item_code,item_name,quantity,location_code,description\nPRD-001,Örnek Ürün,10,A-1,Açıklama';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toplu-urun-sablonu.csv';
    a.click();
  };

  return (
    <div className="bulk-import-page">
      <div className="page-header">
        <h1><Upload size={28} strokeWidth={2} /> Toplu Ürün Girişi</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={exportTemplate}>
            CSV Şablon İndir
          </button>
          <label className="btn btn-secondary">
            <Upload size={18} /> CSV Yükle
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="table-header">
            <h3>Ürünler ({items.length})</h3>
            <button type="button" className="btn btn-primary" onClick={addRow}>
              <Plus size={18} strokeWidth={2.5} /> Satır Ekle
            </button>
          </div>

          <div className="table-container">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Ürün Kodu *</th>
                  <th>Ürün Adı *</th>
                  <th style={{ width: '100px' }}>Miktar</th>
                  <th style={{ width: '200px' }}>Depo Yeri</th>
                  <th>Açıklama</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        value={item.item_code}
                        onChange={(e) => updateItem(index, 'item_code', e.target.value)}
                        placeholder="PRD-001"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        value={item.item_name}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        placeholder="Ürün adı"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <select
                        className="form-input"
                        value={item.location_id}
                        onChange={(e) => updateItem(index, 'location_id', e.target.value)}
                        disabled={!item.quantity || item.quantity === 0}
                      >
                        <option value="">Depo Yeri Seçin</option>
                        {locations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.location_code} - {loc.description}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Opsiyonel açıklama"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon btn-danger-icon"
                        onClick={() => removeRow(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-footer">
            <button type="submit" className="btn btn-success" disabled={loading}>
              <Save size={18} strokeWidth={2.5} /> {loading ? 'Kaydediliyor...' : `${items.length} Ürün Kaydet`}
            </button>
          </div>
        </div>
      </form>

      <div className="info-card">
        <h4>CSV Formatı</h4>
        <p>CSV dosyanız şu formatta olmalıdır:</p>
        <pre>
          item_code,item_name,quantity,location_code,description
          PRD-001,Laptop Dell XPS,10,A-1,15 inch
          PRD-002,Mouse Logitech,50,B-2,Kablosuz
        </pre>
      </div>
    </div>
  );
}
