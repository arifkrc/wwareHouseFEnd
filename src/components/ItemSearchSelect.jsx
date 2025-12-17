import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';

export default function ItemSearchSelect({ items, value, onChange, placeholder = "Ürün kodu ara..." }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Update search term when value changes (external update)
    useEffect(() => {
        if (value) {
            const selectedItem = items.find(i => i.id == value);
            if (selectedItem) {
                setSearchTerm(selectedItem.item_code);
            }
        } else {
            setSearchTerm('');
        }
    }, [value, items]);

    // Filter items based on search term
    const filteredItems = items.filter(item =>
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (item) => {
        onChange(item.id);
        setSearchTerm(item.item_code);
        setIsOpen(false);
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
        setIsOpen(false);
        if (inputRef.current) inputRef.current.focus();
    };

    return (
        <div className="item-search-select" ref={wrapperRef} style={{ position: 'relative' }}>
            <div className="input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />

                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric" // Triggers numpad on mobile
                    className="form-input"
                    style={{ paddingLeft: '32px', paddingRight: value ? '30px' : '10px' }}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (!e.target.value) onChange(''); // Clear value if input cleared
                    }}
                    onFocus={() => setIsOpen(true)}
                />

                {value && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Selected Item Info Badge */}
            {value && (() => {
                const item = items.find(i => i.id == value);
                return item ? (
                    <div style={{
                        marginTop: '4px',
                        padding: '6px 10px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '0.85em',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Check size={14} />
                        <span style={{ fontWeight: 600 }}>{item.item_code}</span>
                        <span>-</span>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.item_name}
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Dropdown List */}
            {isOpen && filteredItems.length > 0 && (
                <div className="dropdown-list" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0 0 6px 6px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    marginTop: '4px'
                }}>
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: item.id == value ? '#f8fafc' : 'white',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = item.id == value ? '#f8fafc' : 'white'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: '#334155' }}>{item.item_code}</span>
                                {item.id == value && <Check size={14} color="#2563eb" />}
                            </div>
                            <span style={{ fontSize: '0.85em', color: '#64748b' }}>{item.item_name}</span>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && filteredItems.length === 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    color: '#94a3b8',
                    textAlign: 'center',
                    fontSize: '0.9em',
                    zIndex: 1000
                }}>
                    Sonuç bulunamadı
                </div>
            )}
        </div>
    );
}
