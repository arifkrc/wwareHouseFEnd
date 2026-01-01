import { useState, useEffect, useCallback } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse, RefreshCw } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import api from '../services/api';
import ZoneModal from '../components/ZoneModal';
import MovementModal from '../components/MovementModal';
import ZoneSection from '../components/ZoneSection';
import './FactoryLayout.scss';



export default function FactoryLayout() {
  const { zones, loading: zonesLoading, refresh: refreshZones } = useWarehouseZones();
  const { locations, updateLocation } = useLocations();
  const { items, refresh: refreshItems, updateItem } = useItems(); // Added updateItem
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



  // Define fetchZoneAllocations with useCallback so it can be called manually
  const fetchZoneAllocations = useCallback(async () => {
    if (!currentZone?.locationId) return;

    try {
      const response = await api.get(`/locations/${currentZone.locationId}/items`);
      setZoneItems(response.data);
    } catch (err) {
      console.error('Bölge ürünleri yüklenemedi:', err);
      // Don't spam error toast on auto-refresh
    }
  }, [currentZone]);

  // Update zone items when items or currentZone changes
  useEffect(() => {
    fetchZoneAllocations();
  }, [fetchZoneAllocations, movements]); // Refresh when movements change

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
    if (currentZone) {
      await fetchZoneAllocations();
    }
    success('Yerleşim güncellendi!');
  };

  const editZone = async (zone) => {
    // Prevent opening modal for passive zones
    if (zone.passive) {
      warning('Bu alan pasif bölge - stok tutulamaz');
      return;
    }

    setCurrentZone(zone);
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
    <div className="container factory-layout">
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
        <ZoneSection
          title="STREÇ"
          zones={zones.filter(z => z.section === 'left')}
          className="warehouse-section left-section"
          onZoneClick={editZone}
        />

        {/* KORİDOR */}
        <ZoneSection
          title="KORİDOR"
          zones={zones.filter(z => z.section === 'corridor')}
          className="corridor-section"
          type="corridor"
          onZoneClick={editZone}
        />

        {/* KARŞI DUVAR */}
        <ZoneSection
          title="KARŞI DUVAR"
          zones={zones.filter(z => z.section === 'right')}
          className="warehouse-section right-section"
          onZoneClick={editZone}
        />
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
        onRefresh={handleRefresh} // Refresh everything when note is edited in modal
        onUpdateItem={updateItem} // Added prop
        showSuccess={success} // Pass global toast handler
        showError={error} // Pass global toast handler
      />

      {/* Reused Movement Modal */}
      <MovementModal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        selectedItem={selectedItem}
        movementForm={movementForm}
        setMovementForm={setMovementForm}
        handleMovement={handleMovement}
        isProcessing={isProcessing}
        locations={locations}
      />

      {/* Toast Notifications - Rendered at root level to avoid z-index/transform issues */}
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
