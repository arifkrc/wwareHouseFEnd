import { useState, useCallback, useEffect } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Warehouse } from 'lucide-react';
import { useWarehouseZones } from '../hooks/useWarehouseZones';
import { useLocations } from '../hooks/useLocations';
import { useItems } from '../hooks/useItems';
import { useMovements } from '../hooks/useMovements';
import { useMovementHandler } from '../hooks/useMovementHandler';
import { useToast } from '../hooks/useToast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useZoneOperations } from '../hooks/useZoneOperations';
import Toast from '../components/Toast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import api from '../services/api';
import ZoneDrawer from '../components/ZoneDrawer';
import MovementDrawer from '../components/MovementDrawer';
import ZoneSection from '../components/ZoneSection';
import { REFRESH_INTERVALS } from '../config/constants';
import './FactoryLayout.scss';



export default function FactoryLayout() {
  const { zones, loading: zonesLoading, refresh: refreshZones, renameZone } = useWarehouseZones();
  const { locations } = useLocations();
  const { items, refresh: refreshItems, updateItem } = useItems();
  const { refresh: refreshMovements, createMovement } = useMovements();
  const { toasts, removeToast, success, error, warning } = useToast();

  const [showZoneModal, setShowZoneModal] = useState(false);
  const [currentZone, setCurrentZone] = useState(null);
  const [zoneItems, setZoneItems] = useState([]);
  const [zoneItemsLoading, setZoneItemsLoading] = useState(false);

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
    if (!currentZone?.locationId) {
      setZoneItems([]);
      return;
    }

    setZoneItemsLoading(true);
    try {
      const response = await api.get(`/locations/${currentZone.locationId}/items`);
      setZoneItems(response.data);
    } catch (err) {
      console.error('Bölge ürünleri yüklenemedi:', err);
    } finally {
      setZoneItemsLoading(false);
    }
  }, [currentZone]);

  // Fetch items when a zone is selected and modal is opened
  useEffect(() => {
    if (currentZone && showZoneModal) {
      fetchZoneAllocations();
    }
  }, [currentZone, showZoneModal, fetchZoneAllocations]);

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

  // Helper to refresh everything
  const refreshAll = async () => {
    await Promise.all([
      refreshMovements(),
      refreshItems(),
      refreshZones(),
      fetchTotalStock() // Also refresh total stock
    ]);
  };

  // VERCEL OPTIMIZATION: Visibility-aware auto-refresh
  // Only refresh when tab is active to save function invocations
  useAutoRefresh(refreshAll, REFRESH_INTERVALS.FACTORY_LAYOUT);

  // 2. USE ZONE OPERATIONS HOOK
  const { isProcessing, handleBulkTransfer, handleClearZone, handleAddStock } = useZoneOperations({
    onSuccess: success,
    onError: error,
    refreshAll,
    fetchZoneAllocations,
    createMovement
  });

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
      stock_at_zone: item.quantity,
      customer_code: item.customer_code,
      is_export: item.is_export
    };

    setSelectedItem(itemWithLocation);

    // Auto-fill logic
    let initialQuantity = '';
    let initialNote = '';
    let initialToLocationId = '';
    let initialCustomerCode = item.customer_code || '';

    // For IN movements in ZoneModal, pre-fill the current zone as destination
    if (type === MOVEMENT_TYPES.IN) {
      initialToLocationId = currentZone?.locationId || '';
    }

    if (type === MOVEMENT_TYPES.OUT || type === MOVEMENT_TYPES.PATLATMA || type === MOVEMENT_TYPES.SEVK) {
      initialQuantity = item.quantity;
    }

    if (type === MOVEMENT_TYPES.PATLATMA) {
      initialNote = 'Patlatma';
    }

    setMovementForm({
      type: type,
      quantity: initialQuantity,
      toLocationId: initialToLocationId,
      customer_code: initialCustomerCode,
      notes: initialNote
    });
    setShowMovementModal(true);
  };

  const handleMovement = async () => {
    // Snapshot before clearing state
    const itemSnapshot = selectedItem;
    const formSnapshot = movementForm;
    // Close drawer immediately for instant UX
    setShowMovementModal(false);
    setSelectedItem(null);
    // Show loading in ZoneDrawer right away
    setZoneItemsLoading(true);
    // Process API in background
    const succeeded = await executeMovement(itemSnapshot, formSnapshot);
    if (succeeded) {
      handleModalRefresh();
    } else {
      // On failure stop loading spinner (error toast already shown by executeMovement)
      setZoneItemsLoading(false);
    }
  };

  /* ZoneModal Handlers (Delegated to Hook) */
  const onAddStock = (locationId, formData) => {
    setZoneItemsLoading(true); // Show loading skeleton immediately when tab switches back
    return handleAddStock(locationId, formData, currentZone);
  };
  const onBulkTransfer = (fromLocationId, toLocationId, note) => handleBulkTransfer(fromLocationId, toLocationId, note);
  const onClearZone = (locationId, note) => handleClearZone(locationId, note);


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
    refreshAll().catch(err => console.warn('Background refresh failed', err));
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
          onRenameZone={renameZone}
        />

        {/* KORİDOR */}
        <ZoneSection
          title="KORIDOR"
          zones={zones.filter(z => z.section === 'corridor')}
          className="corridor-section"
          type="corridor"
          onZoneClick={editZone}
          onRenameZone={renameZone}
        />

        {/* KARŞI DUVAR */}
        <ZoneSection
          title="KARSI DUVAR"
          zones={zones.filter(z => z.section === 'right')}
          className="warehouse-section right-section"
          onZoneClick={editZone}
          onRenameZone={renameZone}
        />
      </div>

      <div className="layout-info">
        <p>Bölge adını değiştirmek için üzerine gelin ve <strong>✏️ kalem simgesine</strong> tıklayın · Enter ile kaydet, Esc ile iptal</p>
      </div>

      {/* Refactored Zone Items Drawer */}
      <ZoneDrawer
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        zone={currentZone}
        zoneItems={zoneItems}
        zoneItemsLoading={zoneItemsLoading}
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

      {/* Reused Movement Drawer - elevated above ZoneDrawer */}
      <MovementDrawer
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        selectedItem={selectedItem}
        movementForm={movementForm}
        setMovementForm={setMovementForm}
        handleMovement={handleMovement}
        isProcessing={isProcessing}
        locations={locations}
        elevated={true}
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
