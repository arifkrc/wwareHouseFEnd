import React, { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';

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
    if (!isOpen || !selectedItem) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {movementForm.type === MOVEMENT_TYPES.IN && <><ArrowUpCircle size={20} /> {titlePrefix} Stok Girişi</>}
                        {movementForm.type === MOVEMENT_TYPES.OUT && <><ArrowDownCircle size={20} /> {titlePrefix} Stok Çıkışı</>}
                        {movementForm.type === MOVEMENT_TYPES.TRANSFER && <><ArrowRightLeft size={20} /> {titlePrefix} Transfer</>}
                    </h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="movement-item-info">
                    <strong>{selectedItem.item_name}</strong>
                    <span className="text-muted">{selectedItem.item_code}</span>

                    {selectedItem.current_zone_name && (
                        <span>Alan: <strong>{selectedItem.current_zone_name}</strong></span>
                    )}

                    {selectedItem.customer_code && (
                        <span className="badge badge-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', display: 'inline-block', marginTop: '4px' }}>
                            Firma: {selectedItem.customer_code}
                        </span>
                    )}

                    {/* Show different labels depending on context */}
                    {selectedItem.stock_at_zone !== undefined ? (
                        <span>Bu Alandaki Stok: <strong>{selectedItem.stock_at_zone}</strong></span>
                    ) : (
                        selectedItem.quantity !== undefined && (
                            <span>Toplam Stok: <strong>{selectedItem.quantity}</strong></span>
                        )
                    )}
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
                    <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>
                        İptal
                    </button>
                    <button className="btn btn-primary" onClick={handleMovement} disabled={isProcessing}>
                        {isProcessing ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
}
