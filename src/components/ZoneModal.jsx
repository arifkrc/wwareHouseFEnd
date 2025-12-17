import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckSquare, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import ItemSearchSelect from './ItemSearchSelect';
import ExpandableText from './ExpandableText';

export default function ZoneModal({
    isOpen,
    onClose,
    zone,
    zoneItems,
    allItems, // full item list for search
    onUpdateDescription,
    onAddStock,
    onOpenMovementModal,
    isProcessing
}) {
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

    if (!isOpen || !zone) return null;

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ flex: 1 }}>
                        <h3 className="modal-title">
                            <Package size={20} />
                            {zone.name}
                        </h3>

                        {/* Editable Description */}
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isEditingDesc ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ padding: '4px 8px', fontSize: '14px', width: '200px' }}
                                        value={tempDesc}
                                        onChange={(e) => setTempDesc(e.target.value)}
                                        placeholder="Açıklama girin..."
                                        autoFocus
                                    />
                                    <button
                                        className="btn-icon btn-success"
                                        onClick={handleDescSave}
                                        disabled={isProcessing}
                                        title="Kaydet"
                                    >
                                        <CheckSquare size={16} />
                                    </button>
                                    <button
                                        className="btn-icon btn-danger"
                                        onClick={() => setIsEditingDesc(false)}
                                        disabled={isProcessing}
                                        title="İptal"
                                    >
                                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>×</span>
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                                        {zone.description || 'Stok'}
                                    </span>
                                    <button
                                        className="btn-icon"
                                        onClick={() => { setTempDesc(zone.description || ''); setIsEditingDesc(true); }}
                                        title="Açıklamayı Düzenle"
                                        style={{ opacity: 0.5 }}
                                    >
                                        <EditIcon size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assigned')}
                    >
                        Bu Alandaki Ürünler ({zoneItems.length})
                    </button>

                    <button
                        className={`tab ${activeTab === 'add_stock' ? 'active' : ''}`}
                        onClick={() => setActiveTab('add_stock')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Plus size={16} /> Stok Ekle
                    </button>
                </div>

                {/* Content */}
                <div className="zone-items-container">
                    {activeTab === 'assigned' && (
                        zoneItems.length > 0 ? (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Ürün Kodu</th>
                                            <th>Ürün Adı</th>
                                            <th>Not</th>
                                            <th>Stok</th>
                                            <th>Açıklama</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {zoneItems.map((item, index) => {
                                            const displayNote = item.movement_note
                                                ? (item.movement_note.includes(':')
                                                    ? item.movement_note.split(':').slice(1).join(':').trim()
                                                    : item.movement_note)
                                                : '-';

                                            return (
                                                <tr key={item.allocation_id || index}>
                                                    <td><strong>{item.item_code}</strong></td>
                                                    <td><ExpandableText text={item.item_name} limit={20} /></td>
                                                    <td>
                                                        <span style={{ fontSize: '0.9em', color: '#475569' }}>
                                                            {displayNote}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success">
                                                            {item.quantity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="item-description">
                                                            <ExpandableText text={item.description || '-'} limit={50} />
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="btn-icon btn-success"
                                                                onClick={() => onOpenMovementModal(item, 'IN')}
                                                                title="Stok Arttır"
                                                            >
                                                                <ArrowUpCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="btn-icon btn-danger"
                                                                onClick={() => onOpenMovementModal(item, 'OUT')}
                                                                title="Stok Çıkışı"
                                                            >
                                                                <ArrowDownCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="btn-icon btn-warning"
                                                                onClick={() => onOpenMovementModal(item, 'TRANSFER')}
                                                                title="Transfer"
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Package size={48} />
                                <p>Bu bölgede henüz ürün yok</p>
                                <small>Atanmamış Ürünler sekmesinden ürün atayabilirsiniz</small>
                            </div>
                        )
                    )}

                    {activeTab === 'add_stock' && (
                        <div className="add-stock-panel" style={{ padding: '1rem' }}>
                            <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                <button
                                    className="btn btn-primary btn-large"
                                    style={{ width: '100%' }}
                                    onClick={handleStockSubmit}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Ekleniyor...' : 'Stoğa Ekle'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper icon component since I used it above
const EditIcon = ({ size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);
