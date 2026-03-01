import React, { useState, useRef } from 'react';
import { Package, Pencil, Check, X } from 'lucide-react';
import './ZoneSection.scss';

export default function ZoneSection({
    title,
    zones,
    className = '',
    type = 'standard',
    onZoneClick,
    onRenameZone
}) {
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef(null);

    const startEdit = (e, zone) => {
        e.stopPropagation();
        setEditingId(zone.id);
        setEditValue(zone.description || '');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const saveEdit = async (e, zone) => {
        e.stopPropagation();
        if (onRenameZone) {
            await onRenameZone(zone, editValue);
        }
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = (e) => {
        e?.stopPropagation();
        setEditingId(null);
        setEditValue('');
    };

    const handleKeyDown = (e, zone) => {
        if (e.key === 'Enter') saveEdit(e, zone);
        if (e.key === 'Escape') cancelEdit(e);
    };

    return (
        <div className={className}>
            <div className="section-header">{title}</div>
            {zones.map(zone => {
                const isEditing = editingId === zone.id;

                return (
                    <div
                        key={zone.id}
                        className={`warehouse-zone ${type === 'corridor' ? 'corridor-zone' : ''} ${zone.passive ? 'zone-passive' : ''} ${isEditing ? 'zone-editing' : ''}`}
                        style={{ backgroundColor: zone.color, position: 'relative' }}
                        onClick={() => !isEditing && onZoneClick(zone)}
                    >
                        {/* Pencil rename button – visible on hover, not in passive/editing zones */}
                        {!zone.passive && !isEditing && (
                            <button
                                className="zone-rename-btn"
                                onClick={(e) => startEdit(e, zone)}
                                title="İsim değiştir"
                            >
                                <Pencil size={11} />
                            </button>
                        )}

                        {type === 'corridor' ? (
                            <div className="zone-content-wrapper corridor-wrapper">
                                <div className="zone-header-row" style={{ justifyContent: 'flex-start' }}>
                                    {isEditing ? (
                                        <div className="zone-rename-row" onClick={e => e.stopPropagation()}>
                                            <input
                                                ref={inputRef}
                                                className="zone-rename-input"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => handleKeyDown(e, zone)}
                                                placeholder={zone.originalName}
                                                maxLength={50}
                                            />
                                            <button className="zone-rename-confirm" onClick={e => saveEdit(e, zone)} title="Kaydet"><Check size={12} /></button>
                                            <button className="zone-rename-cancel" onClick={cancelEdit} title="İptal"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <span className="zone-structural-name">{zone.originalName}</span>
                                    )}
                                </div>

                                {!isEditing && zone.name !== zone.originalName && (
                                    <div className="zone-custom-name" style={{ margin: '2px auto' }}>
                                        <Package size={12} strokeWidth={2.5} style={{ marginRight: 4 }} />
                                        <span className="truncate-text">{zone.name}</span>
                                    </div>
                                )}

                                <div className="zone-body-row" style={{ justifyContent: 'flex-start', marginTop: 'auto' }}>
                                    {!zone.passive && !isEditing && (
                                        zone.itemCount > 0 ? (
                                            <div className="corridor-stats">
                                                <span className="stat-compact">{zone.itemCount} Ürün</span>
                                                <span className="stat-compact">{zone.totalQuantity} Ad</span>
                                            </div>
                                        ) : (
                                            <div className="zone-empty">Boş</div>
                                        )
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Standard Content (Left/Right)
                            <div className="zone-content-wrapper">
                                <div className="zone-header-row">
                                    {isEditing ? (
                                        <div className="zone-rename-row" onClick={e => e.stopPropagation()}>
                                            <input
                                                ref={inputRef}
                                                className="zone-rename-input"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyDown={e => handleKeyDown(e, zone)}
                                                placeholder={zone.originalName}
                                                maxLength={50}
                                            />
                                            <button className="zone-rename-confirm" onClick={e => saveEdit(e, zone)} title="Kaydet"><Check size={12} /></button>
                                            <button className="zone-rename-cancel" onClick={cancelEdit} title="İptal"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="zone-structural-name">{zone.originalName}</span>
                                            {zone.name !== zone.originalName && (
                                                <div className="zone-custom-name">
                                                    <Package size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                                                    <span className="truncate-text">{zone.name}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="zone-body-row">
                                    {!zone.passive && !isEditing && (
                                        zone.itemCount > 0 ? (
                                            <div className="zone-stats-row">
                                                <span className="stat-value">{zone.itemCount}</span>
                                                <span className="stat-label">ürün</span>
                                                <span className="stat-value" style={{ marginLeft: 6 }}>{zone.totalQuantity}</span>
                                                <span className="stat-label">adet</span>
                                            </div>
                                        ) : (
                                            <div className="zone-empty">Boş</div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
