import { useState } from 'react';
import api from '../services/api';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';

export const useZoneOperations = ({
    onSuccess,
    onError,
    refreshAll,
    fetchZoneAllocations,
    createMovement
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBulkTransfer = async (targetZone, sourceZone, currentZoneItems) => {
        if (!targetZone || targetZone.id === sourceZone?.id) return;

        // Validation for capacity or rules could go here

        if (!window.confirm(`${sourceZone.locationCode} alanındaki TÜM ürünler ${targetZone.locationCode} alanına taşınacak. Onaylıyor musunuz?`)) {
            return;
        }

        setIsProcessing(true);
        try {
            await api.post('/movements/bulk-transfer', {
                from_location_id: sourceZone.id,
                to_location_id: targetZone.id
            });

            await refreshAll();

            // Should refetch zone items if we are still viewing source
            if (fetchZoneAllocations) await fetchZoneAllocations();

            onSuccess('Toplu transfer başarılı');
        } catch (err) {
            console.error('Bulk transfer failed:', err);
            const msg = err.response?.data?.error || err.message || 'Toplu transfer başarısız';
            onError(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearZone = async (locationId, note) => {
        setIsProcessing(true);
        try {
            await api.post('/movements/clear-zone', {
                location_id: locationId,
                note: note
            });

            await refreshAll();
            if (fetchZoneAllocations) await fetchZoneAllocations();

            onSuccess('Alan başarıyla temizlendi');
        } catch (err) {
            console.error('Clear zone failed:', err);
            const msg = err.response?.data?.error || err.message || 'Alan temizleme başarısız';
            onError(msg);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddStock = async (locationId, formData, currentZone) => {
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

            if (currentZone) {
                await fetchZoneAllocations();
            }

            // Fire and forget background refresh
            refreshAll().catch(e => console.warn('Background refresh error', e));

            onSuccess(`Stok girişi başarılı!`);
        } catch (err) {
            console.error('Stok eklenemedi:', err);
            onError('Stok eklenirken hata oluştu');
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        handleBulkTransfer,
        handleClearZone,
        handleAddStock
    };
};
