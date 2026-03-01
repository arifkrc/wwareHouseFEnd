import React, { useState, useEffect, useRef } from 'react';
import { Package, CheckSquare, Globe } from 'lucide-react';
import Button from './common/Button';
import ItemSearchSelect from './ItemSearchSelect';

export default function ZoneStockForm({
    isActive,
    zone,
    allItems,
    onAddStock,
    isProcessing,
    onSuccess // Callback to switch tab or reset
}) {
    // Add Stock Form state
    const [form, setForm] = useState({
        itemId: '',
        quantity: '',
        customerId: '',
        customerCode: '',
        notes: '',
        isExport: false
    });

    const emptyForm = { itemId: '', quantity: '', customerCode: '', notes: '', isExport: false };

    // Reset form ONLY when the tab transitions false→true (user opens the tab),
    // NOT on every re-render that passes a new zone object reference.
    const prevIsActiveRef = useRef(false);
    useEffect(() => {
        const becameActive = isActive && !prevIsActiveRef.current;
        prevIsActiveRef.current = isActive;
        if (becameActive) {
            setForm(emptyForm);
        }
    }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

    // Also reset when the actual zone changes (different locationId)
    const prevZoneIdRef = useRef(zone?.locationId);
    useEffect(() => {
        if (zone?.locationId !== prevZoneIdRef.current) {
            prevZoneIdRef.current = zone?.locationId;
            setForm(emptyForm);
        }
    }, [zone?.locationId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = () => {
        // PERFORMANCE OPTIMIZATION: Optimistic UI
        // Fire the API call but do not block the UI
        onAddStock(zone.locationId, form).catch(err => console.error('Background Add Stock failed:', err));

        // Reset and instantly switch tab to assigned items
        setForm({ itemId: '', quantity: '', customerCode: '', notes: '', isExport: false });
        if (onSuccess) onSuccess();
    };

    if (!isActive) return null;

    return (
        <div className="add-stock-panel" style={{ padding: '0.5rem' }}>
            <div className="alert alert-info" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '1rem', background: '#eff6ff', borderRadius: '8px', color: '#1e40af' }}>
                <Package size={20} strokeWidth={2} fill="#bae6fd" />
                <span><strong>{zone.name}</strong> alanına yeni stok girişi yapıyorsunuz.</span>
            </div>

            <div className="form-group">
                <label className="form-label">Ürün Seç *</label>
                <ItemSearchSelect
                    items={allItems}
                    value={form.itemId}
                    onChange={(newId) => setForm({ ...form, itemId: newId })}
                    placeholder="Ürün kodu ara..."
                />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="form-label">Miktar *</label>
                    <input
                        type="number"
                        className="form-input"
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        placeholder="Adet girin"
                        min="1"
                    />
                </div>

                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <label className="form-label">Sevkiyat Türü</label>
                    <div
                        style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '0 12px', background: form.isExport ? '#eff6ff' : '#f8fafc', border: form.isExport ? '1px solid #bfdbfe' : '1px solid #e2e8f0', borderRadius: '6px', transition: 'all 0.2s' }}
                        onClick={() => setForm({ ...form, isExport: !form.isExport })}
                    >
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #cbd5e1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: form.isExport ? '#2563eb' : 'white',
                            borderColor: form.isExport ? '#2563eb' : '#cbd5e1',
                            transition: 'all 0.2s'
                        }}>
                            {form.isExport && <CheckSquare size={14} color="white" />}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: form.isExport ? '#1e40af' : '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Yurtdışı <Globe size={16} strokeWidth={2} className="text-blue-600" />
                        </span>
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Firma / Müşteri (Opsiyonel)</label>
                <input
                    type="text"
                    className="form-input"
                    value={form.customerCode}
                    onChange={(e) => setForm({ ...form, customerCode: e.target.value })}
                    placeholder="Örn: Firma A (Sevkiyat yapılacak yer)"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Not</label>
                <input
                    type="text"
                    className="form-input"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Opsiyonel açıklama"
                />
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: 'env(safe-area-inset-bottom, 20px)' }}>
                <Button
                    variant="primary"
                    size="lg"
                    style={{ width: '100%', padding: '0.8rem', fontSize: '1.05rem', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                    onClick={handleSubmit}
                    isLoading={isProcessing}
                >
                    Stoğa Ekle
                </Button>
            </div>
        </div>
    );
}
