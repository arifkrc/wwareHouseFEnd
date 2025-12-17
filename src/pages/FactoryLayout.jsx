import { useState, useEffect } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse, RefreshCw } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import api from '../services/api';
import api from '../services/api';
import ZoneModal from '../components/ZoneModal';
import './FactoryLayout.css';



export default function FactoryLayout() {
  const { zones, loading: zonesLoading, refresh: refreshZones } = useWarehouseZones();
  const { locations, updateLocation } = useLocations();
  const { items, refresh: refreshItems } = useItems();
  const { movements, createMovement, refresh: refreshMovements } = useMovements();
  const { toasts, removeToast, success, error, warning } = useToast();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const [zoneItems, setZoneItems] = useState([]);

  // FactoryLayout keeps MovementModal state because it's shared across zones
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

  /* ZoneModal Handlers (Delegated) */
  const onUpdateDescription = async (locationId, newDesc) => {
    setIsProcessing(true);
    try {
      await updateLocation(locationId, { description: newDesc });
      await refreshZones();
      success('Açıklama güncellendi');
    } catch (err) {
      console.error('Açıklama güncellenemedi:', err);
      error('Açıklama güncellenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const onAddStock = async (locationId, formData) => {
    setIsProcessing(true);
    try {
      const movementData = {
        item_id: parseInt(formData.itemId),
        quantity: parseInt(formData.quantity),
        to_location_id: locationId,
        customer_code: formData.customerCode || null,
        movement_note: `Panelden Hızlı Giriş: ${formData.notes || ''}`
      };

      await createMovement(MOVEMENT_TYPES.IN, movementData);

      // Refresh hierarchy
      await refreshMovements();
      await refreshItems();
      await refreshZones();

      success(`Stok girişi başarılı!`);
    } catch (err) {
      console.error('Stok eklenemedi:', err);
      error('Stok eklenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };





  // Calculate total stock from zones (more accurate and robust than summing partial movements)
  const totalStock = zones?.reduce((total, zone) => total + (zone.totalQuantity || 0), 0) || 0;

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

      {/* Refactored Zone Items Modal */}
      <ZoneModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        zone={currentZone}
        zoneItems={zoneItems}
        allItems={items} // Pass full items list for search
        onUpdateDescription={onUpdateDescription}
        onAddStock={onAddStock}
        onOpenMovementModal={openMovementModal} // Parent handles movement modal
        isProcessing={isProcessing}
      />

      {/* Movement Modal */}
      {
        showMovementModal && selectedItem && (
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
        )
      }

      {/* Toast Notifications */}
      {
        toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))
      }
    </div >
  );
}
