import { useState, useEffect } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse, Save } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import './FactoryLayout.css';

export default function FactoryLayout() {
  const { zones, loading: zonesLoading, refresh: refreshZones } = useWarehouseZones();
  const { locations } = useLocations();
  const { items, refresh: refreshItems } = useItems();
  const { movements, createMovement, refresh: refreshMovements } = useMovements();
  const { toasts, removeToast, success, error, warning } = useToast();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const [zoneItems, setZoneItems] = useState([]);
  const [unassignedItems, setUnassignedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('assigned');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementForm, setMovementForm] = useState({
    type: MOVEMENT_TYPES.IN,
    quantity: '',
    toLocationId: '',
    notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Update zone items when items or currentZone changes
  useEffect(() => {
    if (currentZone?.locationId) {
      // Filter items that have stock at this specific location
      const filteredItems = items.filter(item => 
        item.stock_distribution && 
        item.stock_distribution[currentZone.locationId] > 0
      );
      setZoneItems(filteredItems);
    }
    
    // Unassigned items are those with no stock anywhere or only negative stock
    const unassigned = items.filter(item => {
      if (!item.stock_distribution) return true;
      const hasPositiveStock = Object.values(item.stock_distribution).some(qty => qty > 0);
      return !hasPositiveStock;
    });
    setUnassignedItems(unassigned);
  }, [items, currentZone]);

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshMovements();
      await refreshItems();
      await refreshZones();
    }, 5000);

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
    setShowZoneModal(true);
  };

  const openMovementModal = (item, type = MOVEMENT_TYPES.IN) => {
    // Add current zone location info to the item
    const itemWithLocation = {
      ...item,
      current_zone_location_id: currentZone?.locationId,
      current_zone_name: currentZone?.name,
      stock_at_zone: item.stock_distribution?.[currentZone?.locationId] || 0
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
        movement_note: movementForm.notes
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

  const assignItemToLocation = async (itemId) => {
    if (!currentZone?.locationId) return;
    
    const item = unassignedItems.find(i => i.id === itemId);
    if (!item) return;
    
    // If item has no stock anywhere, we need to prompt for quantity
    if (!item.quantity || item.quantity === 0) {
      warning('Bu ürünün stoğu yok. Önce stok girişi yapın.');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Create an IN movement to this location with all available stock
      const movementData = {
        item_id: itemId,
        quantity: item.quantity,
        to_location_id: currentZone.locationId,
        movement_note: `${currentZone.name} alanına atama`
      };
      
      await createMovement(MOVEMENT_TYPES.IN, movementData);
      
      // Refresh data in correct order: movements -> items -> zones
      await refreshMovements();
      await refreshItems();
      await refreshZones();
      
      success(`${item.quantity} adet ${item.item_name} bu alana atandı`);
    } catch (err) {
      console.error('Ürün atanamadı:', err);
      error('Ürün atanırken hata oluştu');
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
            <Save size={18} /> {zonesLoading ? 'Yükleniyor...' : 'Yenile'}
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
              <h3 className="modal-title">
                <Package size={20} />
                {currentZone?.name}
              </h3>
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
                className={`tab ${activeTab === 'unassigned' ? 'active' : ''}`}
                onClick={() => setActiveTab('unassigned')}
              >
                Atanmamış Ürünler ({unassignedItems.length})
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
                          <th>Stok</th>
                          <th>Açıklama</th>
                          <th>İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {zoneItems.map(item => {
                          // Get stock at this specific location from stock_distribution
                          const stockAtLocation = item.stock_distribution?.[currentZone.locationId] || 0;
                          
                          return (
                          <tr key={item.id}>
                            <td><strong>{item.item_code}</strong></td>
                            <td>{item.item_name}</td>
                            <td>
                              <span className="badge badge-success">
                                {stockAtLocation}
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
                                  title="Stok Girişi"
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

              {activeTab === 'unassigned' && (
                unassignedItems.length > 0 ? (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ürün Kodu</th>
                          <th>Ürün Adı</th>
                          <th>Stok</th>
                          <th>Açıklama</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedItems.map(item => (
                          <tr key={item.id}>
                            <td><strong>{item.item_code}</strong></td>
                            <td>{item.item_name}</td>
                            <td>
                              <span className="badge badge-warning">
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
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => assignItemToLocation(item.id)}
                                disabled={isProcessing}
                              >
                                Bu Alana Ata
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Package size={48} />
                    <p>Tüm ürünler bir alana atanmış</p>
                  </div>
                )
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
