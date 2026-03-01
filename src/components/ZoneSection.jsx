import React from 'react';
import { Package } from 'lucide-react'; // Import Package icon
import './ZoneSection.scss';

export default function ZoneSection({
    title,
    zones,
    className = '',
    type = 'standard',
    onZoneClick
}) {
    return (
        <div className={className}>
            <div className="section-header">{title}</div>
            {zones.map(zone => (
                <div
                    key={zone.id}
                    className={`warehouse-zone ${type === 'corridor' ? 'corridor-zone' : ''} ${zone.passive ? 'zone-passive' : ''}`}
                    style={{ backgroundColor: zone.color, position: 'relative' }}
                    onClick={() => onZoneClick(zone)}
                >
                    {type === 'corridor' ? (
                        // Corridor Content
                        <div className="zone-content-wrapper corridor-wrapper">
                            <div className="zone-header-row" style={{ justifyContent: 'center' }}>
                                <span className="zone-structural-name">{zone.originalName}</span>
                            </div>

                            {zone.name !== zone.originalName && (
                                <div className="zone-custom-name" style={{ margin: '2px auto' }}>
                                    <Package size={12} strokeWidth={2.5} style={{ marginRight: 4 }} />
                                    <span className="truncate-text">{zone.name}</span>
                                </div>
                            )}

                            <div className="zone-body-row" style={{ justifyContent: 'center', marginTop: 'auto' }}>
                                {!zone.passive && (
                                    zone.itemCount > 0 ? (
                                        <div className="zone-stats-row text-center">
                                            <span className="stat-compact">{zone.itemCount} Ürün</span>
                                            <span className="stat-compact" style={{ marginLeft: 4 }}>{zone.totalQuantity} Adet</span>
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
                                <span className="zone-structural-name">{zone.originalName}</span>
                                {zone.name !== zone.originalName && (
                                    <div className="zone-custom-name">
                                        <Package size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                                        <span className="truncate-text">{zone.name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="zone-body-row">
                                {!zone.passive && (
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
            ))}
        </div>
    );
}
