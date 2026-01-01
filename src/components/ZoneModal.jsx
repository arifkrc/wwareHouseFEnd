import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckSquare, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Edit2 } from 'lucide-react';
import { useMovements } from '../hooks/useMovements';
import ItemSearchSelect from './ItemSearchSelect';
import ExpandableText from './ExpandableText';
import Modal from './common/Modal';
import Table from './common/Table';
import Badge from './common/Badge';
import Button from './common/Button';
import EditableCell from './common/EditableCell';

export default function ZoneModal({
    isOpen,
    onClose,
    zone,
    zoneItems,
    allItems, // full item list for search
    onUpdateDescription,
    onAddStock,
    onOpenMovementModal,
    isProcessing,
    onRefresh, // New prop to trigger parent refresh
    onUpdateItem, // New prop for updating item details
    showSuccess, // Parent toast handler
    showError // Parent toast handler
}) {
    if (!zone) return null;
    const { updateMovement } = useMovements();
    // ... existing state ...

    // ... (keep generic handlers) ...

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
    // ... existing effects ...

    const [activeTab, setActiveTab] = useState('assigned');

    // Description editing state
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState('');

    // Add Stock Form state
    const [addStockForm, setAddStockForm] = useState({
        itemId: '',
        quantity: '',
        customerId: '',
        customerCode: '',
        notes: '',
        showCustomerInput: false
    });

    // Reset states when modal opens/closes or zone changes
    useEffect(() => {
        if (isOpen && zone) {
            setActiveTab('assigned');
            setTempDesc(zone.description || '');
            setIsEditingDesc(false);
            setAddStockForm({ itemId: '', quantity: '', customerCode: '', notes: '', showCustomerInput: false });
        }
    }, [isOpen, zone]);

    const handleDescSave = async () => {
        await onUpdateDescription(zone.locationId, tempDesc);
        setIsEditingDesc(false);
    };

    const handleStockSubmit = async () => {
        await onAddStock(zone.locationId, addStockForm);
        // Reset form on success (parent handles the actual API call and success notification)
        setAddStockForm({ itemId: '', quantity: '', customerCode: '', notes: '', showCustomerInput: false });
        setActiveTab('assigned');
    };
    // ... existing effects ...

    // Table Columns Definition
    const columns = [
        // ... (keep first 3 columns) ...
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
            render: (row) => <Badge variant="success">{row.quantity}</Badge>
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
                        <ArrowUpCircle size={16} />
                    </Button>
                    <Button variant="icon" className="btn-danger" onClick={() => onOpenMovementModal(row, 'OUT')} title="Stok Çıkışı">
                        <ArrowDownCircle size={16} />
                    </Button>
                    <Button variant="icon" className="btn-warning" onClick={() => onOpenMovementModal(row, 'TRANSFER')} title="Transfer">
                        <ArrowRightLeft size={16} />
                    </Button>
                </div>
            )
        }
    ];

    // Modal Title Component
    const ModalTitle = (
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} />
                <span>{zone.name}</span>
            </div>

            {/* Editable Description */}
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
                {isEditingDesc ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ padding: '4px 8px', fontSize: '14px', width: '200px' }}
                            value={tempDesc}
                            onChange={(e) => setTempDesc(e.target.value)}
                            placeholder="Açıklama girin..."
                            autoFocus
                        />
                        <Button variant="success" size="sm" onClick={handleDescSave} disabled={isProcessing} className="p-1">
                            <CheckSquare size={14} />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setIsEditingDesc(false)} disabled={isProcessing} className="p-1">
                            <span style={{ fontWeight: 'bold' }}>×</span>
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                            {zone.description || 'Stok'}
                        </span>
                        <button
                            className="btn-icon"
                            onClick={() => { setTempDesc(zone.description || ''); setIsEditingDesc(true); }}
                            title="Açıklamayı Düzenle"
                            style={{ opacity: 0.5 }}
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={ModalTitle} // We pass the JSX title
            size="lg"
        >
            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
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
                    <Plus size={16} /> Stok Ekle
                </button>
            </div>

            {/* Content */}
            <div className="zone-items-container">
                {activeTab === 'assigned' && (
                    <Table
                        columns={columns}
                        data={zoneItems}
                        emptyMessage="Bu bölgede henüz ürün yok"
                    />
                )}

                {activeTab === 'add_stock' && (
                    <div className="add-stock-panel" style={{ padding: '0.5rem' }}>
                        <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af' }}>
                            <Package size={18} />
                            <span><strong>{zone.name}</strong> alanına yeni stok girişi yapıyorsunuz.</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Ürün Seç *</label>
                            <ItemSearchSelect
                                items={allItems}
                                value={addStockForm.itemId}
                                onChange={(newId) => setAddStockForm({ ...addStockForm, itemId: newId })}
                                placeholder="Ürün kodu ara..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Miktar *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={addStockForm.quantity}
                                onChange={(e) => setAddStockForm({ ...addStockForm, quantity: e.target.value })}
                                placeholder="Adet girin"
                                min="1"
                            />
                        </div>

                        <div className="form-group">
                            <div
                                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px', color: '#64748b' }}
                                onClick={() => setAddStockForm(prev => ({ ...prev, showCustomerInput: !prev.showCustomerInput }))}
                            >
                                {addStockForm.showCustomerInput ? <CheckSquare size={16} style={{ marginRight: 6, color: '#2563eb' }} /> : <Plus size={16} style={{ marginRight: 6 }} />}
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Firma / Müşteri Ata</span>
                            </div>

                            {addStockForm.showCustomerInput && (
                                <input
                                    type="text"
                                    className="form-input"
                                    value={addStockForm.customerCode}
                                    onChange={(e) => setAddStockForm({ ...addStockForm, customerCode: e.target.value })}
                                    placeholder="Örn: Firma A (Sevkiyat yapılacak yer)"
                                    autoFocus
                                />
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Not</label>
                            <input
                                type="text"
                                className="form-input"
                                value={addStockForm.notes}
                                onChange={(e) => setAddStockForm({ ...addStockForm, notes: e.target.value })}
                                placeholder="Opsiyonel açıklama"
                            />
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <Button
                                variant="primary"
                                size="lg"
                                style={{ width: '100%' }}
                                onClick={handleStockSubmit}
                                isLoading={isProcessing}
                            >
                                Stoğa Ekle
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
}
