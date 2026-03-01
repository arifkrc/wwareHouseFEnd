import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckSquare, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Bomb, Truck, RefreshCw, Trash2, AlertTriangle, ArrowRightCircle, Globe, Plane } from 'lucide-react';
import api from '../services/api';
import { useMovements } from '../hooks/useMovements';
import ZoneStockForm from './ZoneStockForm';
import ExpandableText from './ExpandableText';
import Modal from './common/Modal';
import Drawer from './common/Drawer';
import Table from './common/Table';
import Badge from './common/Badge';
import Button from './common/Button';
import EditableCell from './common/EditableCell';

export default function ZoneDrawer({
    isOpen,
    onClose,
    zone,
    zoneItems,
    allItems,
    onAddStock,
    onOpenMovementModal,
    isProcessing,
    onRefresh, // New prop to trigger parent refresh
    onUpdateItem, // New prop for updating item details
    showSuccess, // Parent toast handler
    showError, // Parent toast handler
    onBulkTransfer, // New prop
    onClearZone,    // New prop
    locations       // New prop (list of all locations for transfer target)
}) {
    if (!zone) return null;
    const { updateMovement } = useMovements();

    const handleCellNoteUpdate = async (row, newNote) => {
        if (!row.latest_movement_id) return;
        try {
            await updateMovement(row.latest_movement_id, newNote);
            if (showSuccess) showSuccess('Not güncellendi');
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Note update failed:', err);
            if (showError) showError('Not güncellenemedi');
        }
    };

    const handleCellDescriptionUpdate = async (row, newDesc) => {
        if (!onUpdateItem || !row.item_id) return;
        try {
            await onUpdateItem(row.item_id, { description: newDesc });
            if (showSuccess) showSuccess('Açıklama güncellendi');
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Item description update failed:', err);
            if (showError) showError('Açıklama güncellenemedi');
        }
    };

    const handleStockQuantityUpdate = async (row, newQty) => {
        if (!row.item_id || !zone.locationId) return;
        try {
            // newQty comes as string from input usually
            const qty = parseInt(newQty);
            if (isNaN(qty) || qty < 0) {
                if (showError) showError('Geçersiz miktar');
                return;
            }

            await api.post('/movements/adjust', {
                item_id: row.item_id,
                location_id: zone.locationId,
                new_quantity: qty,
                movement_note: row.movement_note, // Pass original note to target specific batch
                customer_code: row.customer_code
            });

            if (showSuccess) showSuccess('Stok güncellendi');
            if (onRefresh) await onRefresh();
        } catch (err) {
            console.error('Stock adjustment failed:', err);
            // Extract error message if available
            const msg = err.response?.data?.error || 'Stok güncellenemedi';
            if (showError) showError(msg);
        }
    };


    const [activeTab, setActiveTab] = useState('assigned');

    // Description editing state


    // Bulk Actions State

    // Bulk Actions State
    const [bulkForm, setBulkForm] = useState({
        targetLocationId: '',
        note: '',
        confirmClear: false
    });

    // Reset states when modal opens/closes or zone changes
    useEffect(() => {
        if (isOpen && zone) {
            setActiveTab('assigned');
            setBulkForm({ targetLocationId: '', note: '', confirmClear: false });
        }
    }, [isOpen, zone]);



    // Table Columns Definition
    const columns = [
        {
            header: 'Ürün Kodu',
            accessor: 'item_code',
            render: (row) => <strong>{row.item_code}</strong>
        },
        {
            header: 'Ürün Adı',
            accessor: 'item_name',
            render: (row) => <ExpandableText text={row.item_name} limit={20} />
        },
        {
            header: 'Firma / Müşteri',
            accessor: 'customer_code',
            render: (row) => row.customer_code ? (
                <Badge variant="warning">{row.customer_code}</Badge>
            ) : (
                <span className="text-muted text-small">Genel</span>
            )
        },
        {
            header: 'Not',
            accessor: 'movement_note',
            render: (row) => {
                const displayNote = row.movement_note
                    ? (row.movement_note.includes(':')
                        ? row.movement_note.split(':').slice(1).join(':').trim()
                        : row.movement_note)
                    : '';

                return (
                    <EditableCell
                        value={displayNote}
                        onSave={(val) => handleCellNoteUpdate(row, val)}
                        placeholder="Not ekle..."
                    />
                );
            }
        },
        {
            header: 'Stok',
            accessor: 'quantity',
            render: (row) => (
                <EditableCell
                    value={row.quantity}
                    onSave={(val) => handleStockQuantityUpdate(row, val)}
                    type="number"
                />
            )
        },
        {
            header: 'Açıklama',
            accessor: 'description',
            render: (row) => (
                <EditableCell
                    value={row.description}
                    onSave={(val) => handleCellDescriptionUpdate(row, val)}
                    placeholder="Açıklama..."
                    type="textarea"
                />
            )
        },

        {
            header: 'İşlemler',
            render: (row) => (
                <div className="action-buttons">
                    <Button variant="icon" className="btn-success" onClick={() => onOpenMovementModal(row, 'IN')} title="Stok Arttır">
                        <ArrowUpCircle size={20} strokeWidth={2.5} />
                    </Button>
                    <Button variant="icon" className="btn-danger" onClick={() => onOpenMovementModal(row, 'OUT')} title="Stok Çıkışı">
                        <ArrowDownCircle size={20} strokeWidth={2.5} />
                    </Button>
                    <Button variant="icon" className="btn-warning" onClick={() => onOpenMovementModal(row, 'PATLATMA')} title="Patlatma / İmha">
                        <Bomb size={20} strokeWidth={2.5} />
                    </Button>
                    <Button variant="icon" className="btn-primary" onClick={() => onOpenMovementModal(row, 'SEVK')} title="Sevk Et">
                        <Truck size={20} strokeWidth={2.5} />
                    </Button>
                    <Button variant="icon" className="btn-info" onClick={() => onOpenMovementModal(row, 'TRANSFER')} title="Transfer">
                        <ArrowRightLeft size={20} strokeWidth={2.5} />
                    </Button>
                </div>
            )
        }
    ];

    // Modal Title Component
    const ModalTitle = (
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={24} strokeWidth={2} fill="#e2e8f0" />
                <span>{zone.name}</span>
            </div>

            {/* Read-Only Description (if exists) */}
            {zone.description && (
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#94a3b8', fontWeight: 400 }}>
                    {zone.description}
                </div>
            )}
        </div>
    );


    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={ModalTitle} // We pass the JSX title
            size="lg"
        >
            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                <button
                    className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
                    onClick={() => setActiveTab('assigned')}
                    style={{ paddingBottom: '0.5rem', borderBottom: activeTab === 'assigned' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'assigned' ? 600 : 400 }}
                >
                    Bu Alandaki Ürünler ({zoneItems.length})
                </button>

                <button
                    className={`tab ${activeTab === 'add_stock' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add_stock')}
                    style={{ paddingBottom: '0.5rem', borderBottom: activeTab === 'add_stock' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'add_stock' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <Plus size={16} strokeWidth={3} /> Stok Ekle
                </button>

                <button
                    className={`tab ${activeTab === 'bulk_actions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bulk_actions')}
                    style={{ paddingBottom: '0.5rem', borderBottom: activeTab === 'bulk_actions' ? '2px solid #2563eb' : 'none', fontWeight: activeTab === 'bulk_actions' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}
                >
                    <RefreshCw size={16} strokeWidth={3} /> Toplu İşlemler
                </button>
            </div>

            {/* Content */}
            <div className="zone-items-container">
                {activeTab === 'assigned' && (
                    <Table
                        columns={columns}
                        data={zoneItems}
                        keyField="allocation_id"
                        emptyMessage="Bu bölgede henüz ürün yok"
                        rowDecoration={(row) => row.is_export ? (
                            <div className="corner-ribbon" title="Yurtdışı / Export">
                                <Plane />
                            </div>
                        ) : null}
                    />
                )}

                {activeTab === 'add_stock' && (
                    <ZoneStockForm
                        isActive={activeTab === 'add_stock'}
                        zone={zone}
                        allItems={allItems}
                        onAddStock={onAddStock}
                        isProcessing={isProcessing}
                        onSuccess={() => setActiveTab('assigned')}
                    />
                )}

                {activeTab === 'bulk_actions' && (
                    <div className="bulk-actions-panel" style={{ padding: '0.5rem' }}>

                        {/* Bulk Transfer Section */}
                        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#0f172a' }}>
                                <ArrowRightCircle size={20} strokeWidth={2} className="text-primary" />
                                Toplu Transfer
                            </h4>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
                                Bu alandaki <strong>tüm ürünleri ({zoneItems.length} kalem)</strong> başka bir alana taşıyın.
                            </p>

                            <div className="form-group">
                                <label className="form-label">Hedef Lokasyon</label>
                                <select
                                    className="form-input"
                                    value={bulkForm.targetLocationId}
                                    onChange={(e) => setBulkForm({ ...bulkForm, targetLocationId: e.target.value })}
                                >
                                    <option value="">Hedef Seç...</option>
                                    {locations && locations
                                        .filter(l => l.id !== zone.locationId && !l.passive) // Exclude current and passive
                                        .sort((a, b) => a.location_code.localeCompare(b.location_code))
                                        .map(loc => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.location_code} - {loc.description || ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Not</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Opsiyonel transfer notu..."
                                    value={bulkForm.note}
                                    onChange={(e) => setBulkForm({ ...bulkForm, note: e.target.value })}
                                />
                            </div>

                            <Button
                                variant="primary"
                                disabled={!bulkForm.targetLocationId || zoneItems.length === 0 || isProcessing}
                                onClick={() => onBulkTransfer(zone.locationId, bulkForm.targetLocationId, bulkForm.note)}
                                isLoading={isProcessing}
                            >
                                <RefreshCw size={16} style={{ marginRight: 6 }} />
                                Hepsini Taşı
                            </Button>
                        </div>

                        {/* Clear Zone Section */}
                        <div style={{ padding: '1rem', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff1f2' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#991b1b' }}>
                                <Trash2 size={20} strokeWidth={2} />
                                Alanı Boşalt
                            </h4>

                            <div className="alert alert-danger" style={{ display: 'flex', gap: '8px', padding: '0.75rem', background: '#fecaca', color: '#991b1b', borderRadius: '6px', fontSize: '14px', marginBottom: '1rem' }}>
                                <AlertTriangle size={20} />
                                <div>
                                    <strong>DİKKAT:</strong> Bu işlem alandaki <strong>tüm stokları ({zoneItems.length} kalem)</strong> silecektir.
                                    Bu işlem geri alınamaz ancak hareket geçmişinde "Alan Temizliği" olarak görünecektir.
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Not (Zorunlu)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Neden boşaltılıyor? (Örn: Sayım düzeltmesi)"
                                    value={bulkForm.note} // Use same note state or separate? Let's verify usage. separate might be safer but same for simplicity here.
                                    onChange={(e) => setBulkForm({ ...bulkForm, note: e.target.value })}
                                />
                            </div>

                            <div className="form-group checkbox-group" style={{ marginBottom: '1rem' }}>
                                <input
                                    type="checkbox"
                                    id="confirmClear"
                                    checked={bulkForm.confirmClear}
                                    onChange={(e) => setBulkForm({ ...bulkForm, confirmClear: e.target.checked })}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <label htmlFor="confirmClear" style={{ marginLeft: '8px', fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}>
                                    Evet, bu alanı tamamen boşaltmak istiyorum
                                </label>
                            </div>

                            <Button
                                className="btn-danger"
                                disabled={!bulkForm.confirmClear || !bulkForm.note || zoneItems.length === 0 || isProcessing}
                                onClick={() => onClearZone(zone.locationId, bulkForm.note)}
                                isLoading={isProcessing}
                            >
                                <Trash2 size={16} style={{ marginRight: 6 }} />
                                Alanı Boşalt
                            </Button>
                        </div>

                    </div>
                )}

            </div>
        </Drawer>
    );
}
