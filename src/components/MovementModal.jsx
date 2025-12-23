import React, { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import Modal from './common/Modal';
import Button from './common/Button';

export default function MovementModal({
    isOpen,
    onClose,
    selectedItem,
    movementForm,
    setMovementForm,
    handleMovement,
    isProcessing,
    locations, // Needed for Transfer destination
    titlePrefix = '' // Optional prefix for title
}) {
    if (!selectedItem) return null;

    const getVariant = () => {
        if (movementForm.type === MOVEMENT_TYPES.IN) return 'success';
        if (movementForm.type === MOVEMENT_TYPES.OUT) return 'danger';
        return 'primary'; // Transfer
    };

    const getTitle = () => {
        if (movementForm.type === MOVEMENT_TYPES.IN) return <span className="flex items-center text-emerald-600"><ArrowUpCircle size={20} className="mr-2" /> {titlePrefix} Stok Girişi</span>;
        if (movementForm.type === MOVEMENT_TYPES.OUT) return <span className="flex items-center text-red-600"><ArrowDownCircle size={20} className="mr-2" /> {titlePrefix} Stok Çıkışı</span>;
        if (movementForm.type === MOVEMENT_TYPES.TRANSFER) return <span className="flex items-center text-blue-600"><ArrowRightLeft size={20} className="mr-2" /> {titlePrefix} Transfer</span>;
        return 'Hareket İşlemi';
    };

    const footer = (
        <>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                İptal
            </Button>
            <Button variant={getVariant()} onClick={handleMovement} isLoading={isProcessing}>
                {movementForm.type === MOVEMENT_TYPES.IN ? 'Stok Ekle' : movementForm.type === MOVEMENT_TYPES.OUT ? 'Çıkış Yap' : 'Transfer Et'}
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={getTitle()}
            footer={footer}
            size="md"
        >
            <div className="movement-item-info" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.1em', marginBottom: '4px' }}><strong>{selectedItem.item_name}</strong></div>
                <div className="text-muted" style={{ fontSize: '0.9em' }}>{selectedItem.item_code}</div>

                {selectedItem.current_zone_name && (
                    <div style={{ marginTop: '4px' }}>Alan: <strong>{selectedItem.current_zone_name}</strong></div>
                )}

                {selectedItem.customer_code && (
                    <span className="badge badge-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', display: 'inline-block', marginTop: '8px' }}>
                        Firma: {selectedItem.customer_code}
                    </span>
                )}

                <div style={{ marginTop: '8px' }}>
                    {selectedItem.stock_at_zone !== undefined ? (
                        <span>Bu Alandaki Stok: <strong>{selectedItem.stock_at_zone}</strong></span>
                    ) : (
                        selectedItem.quantity !== undefined && (
                            <span>Toplam Stok: <strong>{selectedItem.quantity}</strong></span>
                        )
                    )}
                </div>
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
                    autoFocus
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
                            .filter(loc => loc.id !== selectedItem.location_id && loc.id !== selectedItem.current_zone_location_id)
                            .sort((a, b) => {
                                // Custom sort: A -> K -> B
                                const codeA = a.location_code;
                                const codeB = b.location_code;
                                const typeA = codeA.charAt(0);
                                const typeB = codeB.charAt(0);
                                const numA = parseInt(codeA.match(/\d+/)?.[0] || 0);
                                const numB = parseInt(codeB.match(/\d+/)?.[0] || 0);

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

            {movementForm.type === MOVEMENT_TYPES.IN && !selectedItem.customer_code && (
                <div className="form-group">
                    <label className="form-label">Firma / Müşteri (Opsiyonel)</label>
                    <input
                        type="text"
                        className="form-input"
                        value={movementForm.customer_code || ''}
                        onChange={(e) => setMovementForm({ ...movementForm, customer_code: e.target.value })}
                        placeholder="Örn: Firma A"
                    />
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
        </Modal>
    );
}
