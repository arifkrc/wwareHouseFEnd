import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Zap, Search, Check, X } from 'lucide-react';
import Modal from './common/Modal';
import Button from './common/Button';
import './QuickStockModal.scss';

/* ─── tiny reusable inline search dropdown ─── */
function SearchDropdown({ options, value, onChange, labelKey, subKey, placeholder, disabled }) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    // Keep display text in sync with controlled value
    useEffect(() => {
        if (value) {
            const found = options.find(o => String(o.id) === String(value));
            if (found) setTerm(found[labelKey]);
        } else {
            setTerm('');
        }
    }, [value, options, labelKey]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = term
        ? options.filter(o =>
            o[labelKey]?.toLowerCase().includes(term.toLowerCase()) ||
            (subKey && o[subKey]?.toLowerCase().includes(term.toLowerCase()))
        )
        : options;

    const handleSelect = (opt) => {
        onChange(opt.id);
        setTerm(opt[labelKey]);
        setOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setTerm('');
        setOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className="qsm-dropdown" ref={wrapRef}>
            <div className="qsm-input-wrap">
                <Search size={13} className="qsm-search-icon" />
                <input
                    ref={inputRef}
                    type="text"
                    className="qsm-input"
                    placeholder={placeholder}
                    value={term}
                    disabled={disabled}
                    onChange={(e) => { setTerm(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
                    onFocus={() => setOpen(true)}
                />
                {value && (
                    <button type="button" className="qsm-clear-btn" onClick={handleClear}>
                        <X size={12} />
                    </button>
                )}
            </div>
            {open && filtered.length > 0 && (
                <ul className="qsm-list">
                    {filtered.slice(0, 60).map(opt => (
                        <li
                            key={opt.id}
                            className={`qsm-list-item ${String(opt.id) === String(value) ? 'selected' : ''}`}
                            onMouseDown={() => handleSelect(opt)}
                        >
                            <span className="qsm-list-main">{opt[labelKey]}</span>
                            {subKey && opt[subKey] && <span className="qsm-list-sub">{opt[subKey]}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/* ─── row factory ─── */
let _uid = 0;
const emptyRow = () => ({ uid: ++_uid, itemId: '', locationId: '', quantity: '', isExport: false, notes: '' });

/* ─── main modal ─── */
export default function QuickStockModal({ isOpen, onClose, items = [], zones = [], onSubmit, isProcessing }) {
    const [rows, setRows] = useState([emptyRow()]);

    // Reset rows every time the modal opens
    useEffect(() => {
        if (isOpen) setRows([emptyRow()]);
    }, [isOpen]);

    const addRow = () => setRows(prev => [...prev, emptyRow()]);
    const removeRow = (uid) => setRows(prev => prev.length > 1 ? prev.filter(r => r.uid !== uid) : prev);

    const updateRow = useCallback((uid, field, val) => {
        setRows(prev => prev.map(r => r.uid === uid ? { ...r, [field]: val } : r));
    }, []);

    // Prepare dropdown options
    const itemOptions = items.map(i => ({ id: i.id, label: i.item_code, sub: i.item_name }));
    const zoneOptions = zones
        .filter(z => !z.passive && z.locationId)
        .map(z => ({ id: z.locationId, label: z.name, sub: z.originalName !== z.name ? z.originalName : undefined }));

    const validRows = rows.filter(r => r.itemId && r.locationId && r.quantity && parseInt(r.quantity) > 0);
    const canSubmit = validRows.length > 0 && !isProcessing;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(validRows);
    };

    // Add row on Enter in the last notes field (keyboard ergonomics)
    const handleNotesKeyDown = (e, uid, isLast) => {
        if (e.key === 'Enter' && isLast) { e.preventDefault(); addRow(); }
    };

    const footer = (
        <>
            <div className="qsm-footer-left">
                <button type="button" className="qsm-add-row-btn" onClick={addRow}>
                    <Plus size={14} /> Satır Ekle
                </button>
                <span className="qsm-row-count">
                    {validRows.length}/{rows.length} satır hazır
                </span>
            </div>
            <div className="qsm-footer-right">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>İptal</Button>
                <Button
                    variant="success"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    isLoading={isProcessing}
                >
                    <Zap size={15} style={{ marginRight: 5 }} />
                    {validRows.length > 1 ? `${validRows.length} Satır Kaydet` : 'Kaydet'}
                </Button>
            </div>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className="qsm-title"><Zap size={18} /> Hızlı Stok Girişi</span>}
            footer={footer}
            size="xl"
        >
            <div className="qsm-body">
                {/* Header row */}
                <div className="qsm-header-row">
                    <div className="qsm-col qsm-col-item">Ürün Kodu / Adı</div>
                    <div className="qsm-col qsm-col-zone">Alan</div>
                    <div className="qsm-col qsm-col-qty">Adet</div>
                    <div className="qsm-col qsm-col-yd">YD</div>
                    <div className="qsm-col qsm-col-notes">Not</div>
                    <div className="qsm-col qsm-col-del" />
                </div>

                {/* Data rows */}
                <div className="qsm-rows">
                    {rows.map((row, idx) => {
                        const isLast = idx === rows.length - 1;
                        return (
                            <div key={row.uid} className="qsm-row">
                                {/* Item */}
                                <div className="qsm-col qsm-col-item">
                                    <SearchDropdown
                                        options={itemOptions}
                                        value={row.itemId}
                                        onChange={(v) => updateRow(row.uid, 'itemId', v)}
                                        labelKey="label"
                                        subKey="sub"
                                        placeholder="Ürün kodu..."
                                    />
                                </div>

                                {/* Zone / Location */}
                                <div className="qsm-col qsm-col-zone">
                                    <SearchDropdown
                                        options={zoneOptions}
                                        value={row.locationId}
                                        onChange={(v) => updateRow(row.uid, 'locationId', v)}
                                        labelKey="label"
                                        subKey="sub"
                                        placeholder="Alan ara..."
                                    />
                                </div>

                                {/* Quantity */}
                                <div className="qsm-col qsm-col-qty">
                                    <input
                                        type="number"
                                        className="qsm-input qsm-qty-input"
                                        min="1"
                                        placeholder="0"
                                        value={row.quantity}
                                        onChange={(e) => updateRow(row.uid, 'quantity', e.target.value)}
                                    />
                                </div>

                                {/* YD checkbox */}
                                <div className="qsm-col qsm-col-yd">
                                    <label className="qsm-yd-label" title="Yurt Dışı (İhracat)">
                                        <span className="qsm-yd-text">Yurtdışı</span>
                                        <input
                                            type="checkbox"
                                            checked={row.isExport}
                                            onChange={(e) => updateRow(row.uid, 'isExport', e.target.checked)}
                                        />
                                        <span className="qsm-yd-box">{row.isExport && <Check size={11} />}</span>
                                    </label>
                                </div>

                                {/* Notes */}
                                <div className="qsm-col qsm-col-notes">
                                    <input
                                        type="text"
                                        className="qsm-input"
                                        placeholder="Not..."
                                        value={row.notes}
                                        onChange={(e) => updateRow(row.uid, 'notes', e.target.value)}
                                        onKeyDown={(e) => handleNotesKeyDown(e, row.uid, isLast)}
                                    />
                                </div>

                                {/* Delete */}
                                <div className="qsm-col qsm-col-del">
                                    <button
                                        type="button"
                                        className="qsm-del-btn"
                                        onClick={() => removeRow(row.uid)}
                                        disabled={rows.length === 1}
                                        title="Satırı sil"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
}
