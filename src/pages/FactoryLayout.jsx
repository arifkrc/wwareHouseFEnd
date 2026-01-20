import { useState, useEffect, useCallback } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useMovementHandler } from '../hooks/useMovementHandler';
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
  const { items, refresh: refreshItems, updateItem } = useItems();
  const { refresh: refreshMovements, createMovement } = useMovements();
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

  // Define fetchZoneAllocations FIRST (needed by hook)
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

  // Use shared movement handler hook (uses fetchZoneAllocations)
  const { executeMovement, isProcessing: isMovementProcessing } = useMovementHandler({
    onSuccess: success,
    onError: error,
    onWarning: warning,
    refreshItems,
    refreshMovements,
    refreshZones,
    fetchZoneAllocations,
    currentZone,
    locations
  });

  // Separate processing state for bulk operations (add stock, bulk transfer, clear zone)
  const [isProcessing, setIsProcessing] = useState(false);

  // Update zone items when items or currentZone changes
  useEffect(() => {
    fetchZoneAllocations();
  }, [fetchZoneAllocations]);

  // VERCEL OPTIMIZATION: Visibility-aware auto-refresh
  // Only refresh when tab is active to save function invocations
  useEffect(() => {
    let interval;

    const handleVisibility = () => {
      clearInterval(interval);

      if (document.visibilityState === 'visible') {
        // Tab is active - start auto-refresh
        interval = setInterval(async () => {
          await refreshMovements();
          await refreshItems();
          await refreshZones();
        }, 30000);
      }
      // Tab is inactive - stop refreshing to save Vercel invocations
    };

    // Setup listener
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility(); // Initialize

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
      warning('Bu alan pasif bolge - stok tutulamaz');
      return;
    }

    // Clear stale data immediately to prevent showing wrong zone's data
    setZoneItems([]);
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

    // Auto-fill logic
    let initialQuantity = '';
    let initialNote = '';

    if (type === MOVEMENT_TYPES.OUT || type === MOVEMENT_TYPES.PATLATMA || type === MOVEMENT_TYPES.SEVK) {
      initialQuantity = item.quantity; // Default to full stock for out/patlatma/sevk
    }

    if (type === MOVEMENT_TYPES.PATLATMA) {
      initialNote = 'Patlatma';
    }

    setMovementForm({
      type: type,
      quantity: initialQuantity,
      toLocationId: '',
      notes: initialNote
    });
    setShowMovementModal(true);
  };

  const handleMovement = async () => {
    const success = await executeMovement(selectedItem, movementForm);
    if (success) {
      setShowMovementModal(false);
      setSelectedItem(null);
    }
  };

  const onBulkTransfer = async (fromLocationId, toLocationId, note) => {
    setIsProcessing(true);
    try {
      await api.post('/movements/bulk-transfer', {
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        note: note
      });

      // Refresh everything
      await handleModalRefresh();
      success('Toplu transfer başarılı');
    } catch (err) {
      console.error('Bulk transfer failed:', err);
      // Extra safety check for error message
      const msg = err.response?.data?.error || err.message || 'Toplu transfer başarısız';
      error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const onClearZone = async (locationId, note) => {
    setIsProcessing(true);
    try {
      await api.post('/movements/clear-zone', {
        location_id: locationId,
        note: note
      });

      // Refresh everything
      await handleModalRefresh();
      success('Alan başarıyla temizlendi');
    } catch (err) {
      console.error('Clear zone failed:', err);
      const msg = err.response?.data?.error || err.message || 'Alan temizleme başarısız';
      error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  /* ZoneModal Handlers (Delegated) */

  const onAddStock = async (locationId, formData) => {
    setIsProcessing(true);
    try {
      const movementData = {
        item_id: parseInt(formData.itemId),
        quantity: parseInt(formData.quantity),
        to_location_id: locationId,
        customer_code: formData.customerCode || null,
        movement_note: `Panelden Hızlı Giriş: ${formData.notes || ''}`,
        is_export: formData.isExport
      };

      await createMovement(MOVEMENT_TYPES.IN, movementData);

      // 1. FAST UPDATE: Refresh hierarchy
      if (currentZone) {
        await fetchZoneAllocations();
      }

      // 2. BACKGROUND UPDATE
      Promise.all([
        refreshMovements(),
        refreshItems(),
        refreshZones()
      ]).catch(err => console.warn('Background refresh failed', err));

      success(`Stok girişi başarılı!`);
    } catch (err) {
      console.error('Stok eklenemedi:', err);
      error('Stok eklenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };





  // Fetch authoritative total stock from backend (matches Telegram)
  const [totalStock, setTotalStock] = useState(0);

  const fetchTotalStock = useCallback(async () => {
    try {
      const res = await api.get('/items/total-stock');
      setTotalStock(res.data.total);
    } catch (err) {
      console.error('Total stock fetch failed', err);
    }
  }, []);

  // Initial fetch only (movements refresh handled by handleModalRefresh)
  useEffect(() => {
    fetchTotalStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - manual refresh via handleModalRefresh

  // Granular refresh for ZoneModal - Fast UX
  const handleModalRefresh = async () => {
    // 1. Await critical data for the modal immediate view
    if (currentZone) {
      await fetchZoneAllocations();
    }

    // 2. Refresh global data in background (Fire & Forget)
    // This ensures the "Total Stock" badge eventually updates without blocking the user
    Promise.all([
      refreshMovements(),
      refreshItems(),
      refreshZones(),
      fetchTotalStock()
    ]).catch(err => console.warn('Background refresh failed', err));
  };

  return (
    <div className="container factory-layout">
      <div className="layout-toolbar">
        <div className="toolbar-left">
          <h2><Warehouse size={28} strokeWidth={2} fill="#e2e8f0" style={{ color: '#1e293b' }} /> Depo Yerleşimi</h2>
          <div className="total-stock-badge">
            <Package size={20} strokeWidth={2} fill="#bae6fd" style={{ color: '#0369a1' }} />
            Toplam Stok: <strong>{totalStock}</strong>
          </div>
        </div>
        <div className="toolbar-right">

        </div>
      </div>

      <div className="warehouse-container">
        {/* STREÇ */}
        <ZoneSection
          title="STREC"
          zones={zones.filter(z => z.section === 'left')}
          className="warehouse-section left-section"
          onZoneClick={editZone}
        />

        {/* KORİDOR */}
        <ZoneSection
          title="KORIDOR"
          zones={zones.filter(z => z.section === 'corridor')}
          className="corridor-section"
          type="corridor"
          onZoneClick={editZone}
        />

        {/* KARŞI DUVAR */}
        <ZoneSection
          title="KARSI DUVAR"
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
        allItems={items}
        onAddStock={onAddStock}
        onBulkTransfer={onBulkTransfer}
        onClearZone={onClearZone}
        locations={locations} // Pass locations for transfer selection
        onOpenMovementModal={openMovementModal} // Parent handles movement modal
        isProcessing={isProcessing}
        onRefresh={handleModalRefresh} // Use FAST refresh
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
