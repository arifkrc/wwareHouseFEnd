import { useState } from 'react';
import { useMovements } from './useMovements';

const MOVEMENT_TYPES = {
    IN: 'IN',
    OUT: 'OUT',
    TRANSFER: 'TRANSFER',
    PATLATMA: 'PATLATMA',
    SEVK: 'SEVK'
};

/**
 * Custom hook for handling stock movements across different pages
 * Eliminates code duplication between Items.jsx and FactoryLayout.jsx
 * 
 * @param {Object} config - Configuration object
 * @param {Function} config.onSuccess - Success callback with message
 * @param {Function} config.onError - Error callback with message
 * @param {Function} config.onWarning - Warning callback with message
 * @param {Function} config.refreshItems - Function to refresh items list
 * @param {Function} config.refreshMovements - Function to refresh movements
 * @param {Function} [config.refreshZones] - Optional function to refresh zones (FactoryLayout only)
 * @param {Function} [config.fetchZoneAllocations] - Optional function to refresh current zone (FactoryLayout only)
 * @param {Object} [config.currentZone] - Current zone context (FactoryLayout only)
 * @param {Array} config.locations - Available locations list
 * @returns {Object} Movement handler utilities
 */
export function useMovementHandler({
    onSuccess,
    onError,
    onWarning,
    refreshItems,
    refreshMovements,
    refreshZones,
    fetchZoneAllocations,
    currentZone,
    locations
}) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { createMovement } = useMovements();

    /**
     * Validates movement form data
     * @private
     */
    const validateMovement = (selectedItem, movementForm) => {
        if (!selectedItem || !movementForm.quantity) {
            onWarning('Lütfen tüm alanları doldurun');
            return false;
        }

        // Type-specific validation
        if (movementForm.type === MOVEMENT_TYPES.TRANSFER && !movementForm.toLocationId) {
            onWarning('Transfer için hedef lokasyon seçin');
            return false;
        }

        if (movementForm.type === MOVEMENT_TYPES.IN && !movementForm.toLocationId) {
            onWarning('Hangi lokasyona giriş yapılacak? Lütfen seçin.');
            return false;
        }

        if ([MOVEMENT_TYPES.OUT, MOVEMENT_TYPES.TRANSFER].includes(movementForm.type) && !selectedItem.current_zone_location_id) {
            onWarning('Kaynak lokasyon belirlenemedi. Lütfen detay görünümünden işlem yapın.');
            return false;
        }

        return true;
    };

    /**
     * Constructs movement data object based on type
     * @private
     */
    const buildMovementData = (selectedItem, movementForm) => {
        const finalCustomerCode = selectedItem.customer_code || movementForm.customer_code || null;

        const movementData = {
            item_id: selectedItem.id,
            quantity: parseInt(movementForm.quantity),
            movement_note: movementForm.notes,
            customer_code: finalCustomerCode,
            is_export: selectedItem.is_export || false
        };

        const type = movementForm.type;
        const currentZoneName = selectedItem.current_zone_name || 'Bilinmeyen';

        // IN Movement
        if (type === MOVEMENT_TYPES.IN) {
            movementData.to_location_id = parseInt(movementForm.toLocationId || selectedItem.current_zone_location_id);
            const locName = locations.find(l => l.id === movementData.to_location_id)?.location_code || currentZoneName;
            movementData.movement_note = `Stok Girişi (${locName}): ${movementForm.notes}`;
        }

        // TRANSFER Movement
        else if (type === MOVEMENT_TYPES.TRANSFER) {
            movementData.from_location_id = selectedItem.current_zone_location_id;
            movementData.to_location_id = parseInt(movementForm.toLocationId);
            const toLocation = locations.find(l => l.id === movementData.to_location_id);
            movementData.movement_note = `${currentZoneName} → ${toLocation?.location_code || 'Bilinmeyen'}: ${movementForm.notes}`;
        }

        // OUT Movement
        else if (type === MOVEMENT_TYPES.OUT) {
            movementData.from_location_id = selectedItem.current_zone_location_id;
            movementData.movement_note = `${currentZoneName} alanından çıkarıldı: ${movementForm.notes}`;
        }

        // PATLATMA (Special OUT)
        else if (type === MOVEMENT_TYPES.PATLATMA) {
            movementData.from_location_id = selectedItem.current_zone_location_id;
            movementData.movement_note = `Patlatma/İmha: ${movementForm.notes}`;
            movementData.movement_type = 'PATLATMA';
        }

        // SEVK (Special OUT)
        else if (type === MOVEMENT_TYPES.SEVK) {
            movementData.from_location_id = selectedItem.current_zone_location_id;
            movementData.movement_note = `Sevk Edildi: ${movementForm.notes}`;
            movementData.movement_type = 'SEVK';
        }

        return movementData;
    };

    /**
     * Gets the API endpoint type for the movement
     * @private
     */
    const getEndpointType = (movementType) => {
        if (movementType === MOVEMENT_TYPES.PATLATMA || movementType === MOVEMENT_TYPES.SEVK) {
            return MOVEMENT_TYPES.OUT; // Use OUT endpoint with movement_type parameter
        }
        return movementType;
    };

    /**
     * Gets human-readable label for movement type
     * @private
     */
    const getTypeLabel = (type) => {
        const labels = {
            [MOVEMENT_TYPES.IN]: 'Giriş',
            [MOVEMENT_TYPES.OUT]: 'Çıkış',
            [MOVEMENT_TYPES.TRANSFER]: 'Transfer',
            [MOVEMENT_TYPES.PATLATMA]: 'Patlatma',
            [MOVEMENT_TYPES.SEVK]: 'Sevk'
        };
        return labels[type] || 'İşlem';
    };

    /**
     * Executes the movement with proper validation, API call, and refresh
     * @param {Object} selectedItem - The item being moved
     * @param {Object} movementForm - Movement form data (type, quantity, notes, toLocationId, etc.)
     * @returns {Promise<boolean>} Success status
     */
    const executeMovement = async (selectedItem, movementForm) => {
        // Validate
        if (!validateMovement(selectedItem, movementForm)) {
            return false;
        }

        setIsProcessing(true);
        try {
            // Build movement data
            const movementData = buildMovementData(selectedItem, movementForm);
            const endpointType = getEndpointType(movementForm.type);

            // Await the API call so the DB transaction is fully committed before refresh
            await createMovement(endpointType, movementData);

            // Fire background refreshes (non-blocking)
            // fetchZoneAllocations is handled by FactoryLayout after this resolves
            const refreshPromises = [refreshItems(), refreshMovements()];
            if (refreshZones) refreshPromises.push(refreshZones());
            Promise.all(refreshPromises).catch(err => console.warn('Background refresh error:', err));

            // Success feedback
            const typeLabel = getTypeLabel(movementForm.type);
            const itemName = selectedItem.item_name || selectedItem.item_code;
            onSuccess(`${typeLabel}: ${movementForm.quantity} adet ${itemName}`);

            return true;
        } catch (err) {
            console.error('Movement execution failed:', err);
            const serverMsg = err?.response?.data?.error;
            onError(serverMsg || 'İşlem başarısız oldu');
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        executeMovement,
        isProcessing,
        setIsProcessing
    };
}
