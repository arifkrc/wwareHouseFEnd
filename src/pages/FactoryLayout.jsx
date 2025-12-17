import { useState, useEffect } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse, RefreshCw, Plus, Edit, CheckSquare } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import api from '../services/api';
import ItemSearchSelect from '../components/ItemSearchSelect';
import './FactoryLayout.css';

const ExpandableText = ({ text, limit = 50 }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.length <= limit) return <span>{text}</span>;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
      title={expanded ? "Daralt" : "Genişlet"}
    >
      <span>
        {expanded ? text : `${text.substring(0, limit)}...`}
      </span>
      <small style={{ color: '#2563eb', marginLeft: '4px', fontSize: '0.7em', whiteSpace: 'nowrap' }}>
        {expanded ? '(daha az)' : '(daha fazla)'}
      </small>
    </div>
  );
};

export default function FactoryLayout() {
  const { zones, loading: zonesLoading, refresh: refreshZones } = useWarehouseZones();
  const { locations, updateLocation } = useLocations();
  const { items, refresh: refreshItems } = useItems();
  const { movements, createMovement, refresh: refreshMovements } = useMovements();
  const { toasts, removeToast, success, error, warning } = useToast();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const [zoneItems, setZoneItems] = useState([]);

  const [activeTab, setActiveTab] = useState('assigned');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementForm, setMovementForm] = useState({
    type: MOVEMENT_TYPES.IN,
    quantity: '',
    toLocationId: '',
    notes: ''
  });

  // New state for direct stock add in modal
  const [addStockForm, setAddStockForm] = useState({
    itemId: '',
    quantity: '',
    customerId: '',
    customerCode: '',
    notes: '',
    showCustomerInput: false // Toggle for UI
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Description editing state
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState('');

  // Update zone items when items or currentZone changes
  // Fetch detailed zone items (with customer allocations) whenever zone or refresh trigger changes
  useEffect(() => {
    const fetchZoneAllocations = async () => {
      if (!currentZone?.locationId) return;

      try {
        const response = await api.get(`/locations/${currentZone.locationId}/items`);
        setZoneItems(response.data);
      } catch (err) {
        console.error('Bölge ürünleri yüklenemedi:', err);
        error('Bölge verileri alınamadı');
      }
    };

    fetchZoneAllocations();
  }, [currentZone, movements]); // Refresh when movements change (which includes add stock)

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshMovements();
      await refreshItems();
      await refreshZones();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshMovements, refreshItems, refreshZones]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showZoneModal || showMovementModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showZoneModal, showMovementModal]);

  const handleRefresh = async () => {
    await refreshMovements();
    await refreshItems();
    await refreshZones();
    success('Yerleşim güncellendi!');
  };

  const editZone = async (zone) => {
    // Prevent opening modal for passive zones
    if (zone.passive) {
      warning('Bu alan pasif bölge - stok tutulamaz');
      return;
    }

    setCurrentZone(zone);
    setActiveTab('assigned');
    setAddStockForm({ itemId: '', quantity: '', customerCode: '', notes: '' }); // Reset form
    setShowZoneModal(true);
  };

  const openMovementModal = (item, type = MOVEMENT_TYPES.IN) => {
    // Add current zone location info to the item
    const itemWithLocation = {
      ...item,
      current_zone_location_id: currentZone?.locationId,
      current_zone_name: currentZone?.name,
      stock_at_zone: item.quantity, // Now coming directly from backend allocation
      customer_code: item.customer_code // Pass allocation customer code
    };

    setSelectedItem(itemWithLocation);
    setMovementForm({
      type: type,
      quantity: '',
      toLocationId: '',
      notes: ''
    });
    setShowMovementModal(true);
  };

  const handleMovement = async () => {
    if (!selectedItem || !movementForm.quantity) {
      warning('Lütfen tüm alanları doldurun');
      return;
    }

    setIsProcessing(true);
    try {
      const movementData = {
        item_id: selectedItem.id,
        quantity: parseInt(movementForm.quantity),
        movement_note: movementForm.notes,
        customer_code: selectedItem.customer_code // Maintain customer allocation
      };

      if (movementForm.type === MOVEMENT_TYPES.TRANSFER) {
        if (!movementForm.toLocationId) {
          warning('Transfer için hedef lokasyon seçin');
          return;
        }
        // TRANSFER: from current zone to selected zone
        movementData.from_location_id = selectedItem.current_zone_location_id;
        movementData.to_location_id = parseInt(movementForm.toLocationId);

        // Add location names to notes
        const toLocation = locations.find(l => l.id === parseInt(movementForm.toLocationId));
        movementData.movement_note = `${selectedItem.current_zone_name} → ${toLocation?.location_code || 'Bilinmeyen'}: ${movementForm.notes}`;
      } else if (movementForm.type === MOVEMENT_TYPES.IN) {
        // IN: to current zone (ürün bu alana giriyor)
        movementData.to_location_id = selectedItem.current_zone_location_id;
        movementData.movement_note = `${selectedItem.current_zone_name} alanına eklendi: ${movementForm.notes}`;
      } else if (movementForm.type === MOVEMENT_TYPES.OUT) {
        // OUT: from current zone (ürün bu alandan çıkıyor)
        movementData.from_location_id = selectedItem.current_zone_location_id;
        movementData.movement_note = `${selectedItem.current_zone_name} alanından çıkarıldı: ${movementForm.notes}`;
      }

      await createMovement(movementForm.type, movementData);

      // Store item info before clearing state
      const itemName = selectedItem.item_name;
      const quantity = movementForm.quantity;
      const type = movementForm.type;

      // Close modal immediately for better UX
      setShowMovementModal(false);
      setSelectedItem(null);

      // Refresh data in correct order: movements -> items -> zones
      await refreshMovements();
      await refreshItems();
      await refreshZones();

      const typeLabel = type === MOVEMENT_TYPES.IN ? 'Giriş' :
        type === MOVEMENT_TYPES.OUT ? 'Çıkış' : 'Transfer';
      success(`${typeLabel}: ${quantity} adet ${itemName}`);
    } catch (err) {
      console.error('Hareket kaydedilemedi:', err);
      error('Hareket kaydedilirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!currentZone?.locationId) return;

    setIsProcessing(true);
    try {
      await updateLocation(currentZone.locationId, {
        description: tempDesc
      });

      // Update local state
      setIsEditingDesc(false);

      // Refresh zones to show new description
      await refreshZones();

      success('Açıklama güncellendi');
    } catch (err) {
      console.error('Açıklama güncellenemedi:', err);
      error('Açıklama güncellenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };



  const handleAddStockToZone = async () => {
    if (!currentZone?.locationId || !addStockForm.itemId || !addStockForm.quantity) {
      warning('Lütfen ürün ve miktar girin');
      return;
    }

    setIsProcessing(true);
    try {
      const movementData = {
        item_id: parseInt(addStockForm.itemId),
        quantity: parseInt(addStockForm.quantity),
        to_location_id: currentZone.locationId,
        customer_code: addStockForm.customerCode || null,
        movement_note: `Panelden Hızlı Giriş: ${addStockForm.notes || ''}`
      };

      await createMovement(MOVEMENT_TYPES.IN, movementData);

      // Refresh data
      await refreshMovements();
      await refreshItems();
      await refreshZones();

      success(`Stok girişi başarılı!`);

      // Reset form and switch to assigned tab to show the new item
      setAddStockForm({ itemId: '', quantity: '', customerCode: '', notes: '' });
      setActiveTab('assigned');

    } catch (err) {
      console.error('Stok eklenemedi:', err);
      error('Stok eklenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate total stock from movements (not from items.quantity)
  const totalStock = movements?.reduce((total, m) => {
    if (m.movement_type === 'IN') {
      return total + m.quantity;
    } else if (m.movement_type === 'OUT') {
      return total - m.quantity;
    }
    return total; // TRANSFER doesn't change total stock
  }, 0) || 0;

  return (
    <div className="factory-layout">
      <div className="layout-toolbar">
        <div className="toolbar-left">
          <h2><Warehouse size={24} /> Depo Yerleşimi</h2>
          <div className="total-stock-badge">
            <Package size={16} />
            Toplam Stok: <strong>{totalStock}</strong>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={handleRefresh} disabled={zonesLoading}>
            <RefreshCw size={18} /> {zonesLoading ? 'Yükleniyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      <div className="warehouse-container">
        {/* STREÇ */}
        <div className="warehouse-section left-section">
          <div className="section-header">STREÇ</div>
          {zones.filter(z => z.section === 'left').map(zone => (
            <div
              key={zone.id}
              className={`warehouse-zone ${zone.passive ? 'zone-passive' : ''}`}
              style={{ backgroundColor: zone.color }}
              onClick={() => editZone(zone)}
            >
              <div className="zone-content-wrapper">
                <div className="zone-label-center">{zone.name}</div>
                {!zone.passive && (
                  zone.itemCount > 0 ? (
                    <div className="zone-stats-left">
                      <div className="zone-stat-item">
                        <span className="stat-value">{zone.itemCount}</span>
                        <span className="stat-label">ürün</span>
                      </div>
                      <div className="zone-stat-item">
                        <span className="stat-value">{zone.totalQuantity}</span>
                        <span className="stat-label">adet</span>
                      </div>
                    </div>
                  ) : (
                    <div className="zone-empty">Boş</div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        {/* KORİDOR */}
        <div className="corridor-section">
          <div className="section-header">KORİDOR</div>
          {zones.filter(z => z.section === 'corridor').map(zone => (
            <div
              key={zone.id}
              className={`warehouse-zone corridor-zone ${zone.passive ? 'zone-passive' : ''}`}
              style={{ backgroundColor: zone.color }}
              onClick={() => editZone(zone)}
            >
              <div className="zone-name-badge">{zone.name}</div>
              {!zone.passive && (
                zone.itemCount > 0 ? (
                  <div className="corridor-stats-bottom">
                    <span className="stat-compact">{zone.itemCount} Ürün</span>
                    <span className="stat-compact">{zone.totalQuantity} Adet</span>
                  </div>
                ) : (
                  <div className="zone-empty-corridor">Boş</div>
                )
              )}
            </div>
          ))}
        </div>

        {/* KARŞI DUVAR */}
        <div className="warehouse-section right-section">
          <div className="section-header">KARŞI DUVAR</div>
          {zones.filter(z => z.section === 'right').map(zone => (
            <div
              key={zone.id}
              className={`warehouse-zone ${zone.passive ? 'zone-passive' : ''}`}
              style={{ backgroundColor: zone.color }}
              onClick={() => editZone(zone)}
            >
              <div className="zone-content-wrapper">
                <div className="zone-label-center">{zone.name}</div>
                {!zone.passive && (
                  zone.itemCount > 0 ? (
                    <div className="zone-stats-left">
                      <div className="zone-stat-item">
                        <span className="stat-value">{zone.itemCount}</span>
                        <span className="stat-label">ürün</span>
                      </div>
                      <div className="zone-stat-item">
                        <span className="stat-value">{zone.totalQuantity}</span>
                        <span className="stat-label">adet</span>
                      </div>
                    </div>
                  ) : (
                    <div className="zone-empty">Boş</div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="layout-info">
        <p>Bölge isimlerini özelleştirmek için <strong>Ayarlar &gt; Lokasyonlar</strong> bölümünden düzenleyebilirsiniz</p>
      </div>

      {/* Zone Items Modal */}
      {showZoneModal && (
        <div className="modal-overlay" onClick={() => setShowZoneModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ flex: 1 }}>
                <h3 className="modal-title">
                  <Package size={20} />
                  {currentZone?.name}
                </h3>

                {/* Editable Description Section */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isEditingDesc ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '14px', width: '200px' }}
                        value={tempDesc}
                        onChange={(e) => setTempDesc(e.target.value)}
                        placeholder="Açıklama girin..."
                        autoFocus
                      />
                      <button
                        className="btn-icon btn-success"
                        onClick={handleUpdateDescription}
                        disabled={isProcessing}
                        title="Kaydet"
                      >
                        <CheckSquare size={16} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => setIsEditingDesc(false)}
                        disabled={isProcessing}
                        title="İptal"
                      >
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>×</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                        {currentZone?.description || 'Stok'}
                      </span>
                      {!currentZone?.passive && currentZone?.locationId && (
                        <button
                          className="btn-icon"
                          style={{ color: '#94a3b8', padding: '2px' }}
                          onClick={() => {
                            setTempDesc(currentZone.description || '');
                            setIsEditingDesc(true);
                          }}
                          title="Açıklamayı Düzenle"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowZoneModal(false)}>×</button>
            </div>

            <div className="tabs">
              <button
                className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('assigned')}
              >
                Bu Alandaki Ürünler ({zoneItems.length})
              </button>

              <button
                className={`tab ${activeTab === 'add_stock' ? 'active' : ''}`}
                onClick={() => setActiveTab('add_stock')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> Stok Ekle
              </button>
            </div>

            <div className="zone-items-container">
              {activeTab === 'assigned' && (
                zoneItems.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ürün Kodu</th>
                          <th>Ürün Adı</th>
                          <th>Not</th>
                          <th>Stok</th>
                          <th>Açıklama</th>
                          <th>İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneItems.map((item, index) => {
                          // item now contains specific allocation info (quantity, customer_code) from backend

                          // Parse note: "Prefix: Actual Note" -> "Actual Note"
                          const displayNote = item.movement_note
                            ? (item.movement_note.includes(':')
                              ? item.movement_note.split(':').slice(1).join(':').trim()
                              : item.movement_note)
                            : '-';

                          return (
                            <tr key={item.allocation_id || index}>
                              <td><strong>{item.item_code}</strong></td>
                              <td><ExpandableText text={item.item_name} limit={20} /></td>
                              <td>
                                {/* Customer Code Hidden as requested */}
                                <span style={{ fontSize: '0.9em', color: '#475569' }}>
                                  {displayNote}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-success">
                                  {item.quantity}
                                </span>
                              </td>
                              <td>
                                <span className="item-description">
                                  {item.description ?
                                    (item.description.length > 50 ?
                                      item.description.substring(0, 50) + '...' :
                                      item.description
                                    ) :
                                    '-'
                                  }
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn-icon btn-success"
                                    onClick={() => openMovementModal(item, MOVEMENT_TYPES.IN)}
                                    title="Stok Arttır"
                                  >
                                    <ArrowUpCircle size={16} />
                                  </button>
                                  <button
                                    className="btn-icon btn-danger"
                                    onClick={() => openMovementModal(item, MOVEMENT_TYPES.OUT)}
                                    title="Stok Çıkışı"
                                  >
                                    <ArrowDownCircle size={16} />
                                  </button>
                                  <button
                                    className="btn-icon btn-warning"
                                    onClick={() => openMovementModal(item, MOVEMENT_TYPES.TRANSFER)}
                                    title="Transfer"
                                  >
                                    <ArrowRightLeft size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Package size={48} />
                    <p>Bu bölgede henüz ürün yok</p>
                    <small>Atanmamış Ürünler sekmesinden ürün atayabilirsiniz</small>
                  </div>
                )
              )}




              {activeTab === 'add_stock' && (
                <div className="add-stock-panel" style={{ padding: '1rem' }}>
                  <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} />
                    <span><strong>{currentZone.name}</strong> alanına yeni stok girişi yapıyorsunuz.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ürün Seç *</label>
                    <ItemSearchSelect
                      items={items}
                      value={addStockForm.itemId}
                      onChange={(newId) => setAddStockForm({ ...addStockForm, itemId: newId })}
                      placeholder="Ürün kodu ara..."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Miktar *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={addStockForm.quantity}
                      onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                      placeholder="Adet girin"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <div
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px', color: '#64748b' }}
                      onClick={() => setAddStockForm(prev => ({ ...prev, showCustomerInput: !prev.showCustomerInput }))}
                    >
                      {addStockForm.showCustomerInput ? <CheckSquare size={16} style={{ marginRight: 6, color: '#2563eb' }} /> : <Plus size={16} style={{ marginRight: 6 }} />}
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Firma / Müşteri Ata</span>
                    </div>

                    {addStockForm.showCustomerInput && (
                      <input
                        type="text"
                        className="form-input"
                        value={addStockForm.customerCode}
                        onChange={(e) => setAddStockForm({ ...addStockForm, customerCode: e.target.value })}
                        placeholder="Örn: Firma A (Sevkiyat yapılacak yer)"
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Not</label>
                    <input
                      type="text"
                      className="form-input"
                      value={addStockForm.notes}
                      onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
                      placeholder="Opsiyonel açıklama"
                    />
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn btn-primary btn-large"
                      style={{ width: '100%' }}
                      onClick={handleAddStockToZone}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Ekleniyor...' : 'Stoğa Ekle'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {movementForm.type === MOVEMENT_TYPES.IN && <><ArrowUpCircle size={20} /> Stok Girişi</>}
                {movementForm.type === MOVEMENT_TYPES.OUT && <><ArrowDownCircle size={20} /> Stok Çıkışı</>}
                {movementForm.type === MOVEMENT_TYPES.TRANSFER && <><ArrowRightLeft size={20} /> Transfer</>}
              </h3>
              <button className="modal-close" onClick={() => setShowMovementModal(false)}>×</button>
            </div>

            <div className="movement-item-info">
              <strong>{selectedItem.item_name}</strong>
              <span className="text-muted">{selectedItem.item_code}</span>
              <span>Alan: <strong>{selectedItem.current_zone_name}</strong></span>
              {selectedItem.customer_code && (
                <span className="badge badge-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', display: 'inline-block', marginTop: '4px' }}>
                  Firma: {selectedItem.customer_code}
                </span>
              )}
              <span>Bu Alandaki Stok: <strong>{selectedItem.stock_at_zone}</strong></span>
            </div>

            <div className="form-group">
              <label className="form-label">Adet</label>
              <input
                type="number"
                className="form-input"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="Miktar girin"
                min="1"
              />
            </div>

            {movementForm.type === MOVEMENT_TYPES.TRANSFER && (
              <div className="form-group">
                <label className="form-label">Hedef Lokasyon</label>
                <select
                  className="form-select"
                  value={movementForm.toLocationId}
                  onChange={(e) => setMovementForm({ ...movementForm, toLocationId: e.target.value })}
                >
                  <option value="">Lokasyon seçin</option>
                  {locations
                    .filter(loc => loc.id !== selectedItem.location_id)
                    .sort((a, b) => {
                      // Custom sort: A -> K -> B
                      // Extract headers and numbers
                      const codeA = a.location_code;
                      const codeB = b.location_code;
                      const typeA = codeA.charAt(0); // A, K, B
                      const typeB = codeB.charAt(0);
                      const numA = parseInt(codeA.match(/\d+/)?.[0] || 0);
                      const numB = parseInt(codeB.match(/\d+/)?.[0] || 0);

                      // Define order for types
                      const order = { 'A': 1, 'K': 2, 'B': 3 };
                      const scoreA = order[typeA] || 99;
                      const scoreB = order[typeB] || 99;

                      if (scoreA !== scoreB) return scoreA - scoreB;
                      return numA - numB;
                    })
                    .map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.location_code} - {loc.description || 'Açıklama yok'}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Not (İsteğe Bağlı)</label>
              <textarea
                className="form-textarea"
                value={movementForm.notes}
                onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                placeholder="Hareket notu"
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowMovementModal(false)} disabled={isProcessing}>
                İptal
              </button>
              <button className="btn btn-primary" onClick={handleMovement} disabled={isProcessing}>
                {isProcessing ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
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
    </div>
  );
}
