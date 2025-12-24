import React from 'react';
import './ZoneSection.scss'; // We will create this or rely on FactoryLayout.css if we move styles

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
                    style={{ backgroundColor: zone.color }}
                    onClick={() => onZoneClick(zone)}
                >
                    {type === 'corridor' ? (
                        // Corridor Content
                        <>
                            <div className="zone-name-badge">{zone.name}</div>
                            {!zone.passive && (
                                zone.itemCount > 0 ? (
                                    <div className="corridor-stats-bottom">
                                        <span className="stat-compact">{zone.itemCount} Ürün</span>
                                        <span className="stat-compact">{zone.totalQuantity} Adet</span>
                                    </div>
                                ) : (
                                    <div className="zone-empty-corridor">Boş</div>
                                )
                            )}
                        </>
                    ) : (
                        // Standard Content (Left/Right)
                        <div className="zone-content-wrapper">
                            <div className="zone-label-center">{zone.name}</div>
                            {!zone.passive && (
                                zone.itemCount > 0 ? (
                                    <div className="zone-stats-left">
                                        <div className="zone-stat-item">
                                            <span className="stat-value">{zone.itemCount}</span>
                                            <span className="stat-label">ürün</span>
                                        </div>
                                        <div className="zone-stat-item">
                                            <span className="stat-value">{zone.totalQuantity}</span>
                                            <span className="stat-label">adet</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="zone-empty">Boş</div>
                                )
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
