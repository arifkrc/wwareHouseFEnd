import { useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import Modal from './common/Modal';
import Table from './common/Table';
import Badge from './common/Badge';
import Button from './common/Button';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';

export default function ItemDetailModal({ isOpen, onClose, item, locations, onMovementRequest }) {

    // Prepare Detail Modal Data
    const detailData = useMemo(() => {
        if (!item || !item.stock_distribution) return [];

        const rows = [];
        Object.entries(item.stock_distribution).forEach(([locId, data]) => {
            const location = locations.find(l => l.id === parseInt(locId));
            let allocations = data.allocations || [];

            // Normalize if no allocations array
            if (allocations.length === 0 && data.quantity > 0) {
                allocations = [{
                    quantity: data.quantity,
                    customer_code: null,
                    latest_note: data.latest_note
                }];
            }

            allocations.forEach((alloc, idx) => {
                rows.push({
                    id: `${locId}-${idx}`,
                    locId,
                    locationName: location?.location_code || 'Bilinmiyor',
                    isFirstInGroup: idx === 0,
                    alloc, // { quantity, customer_code, latest_note }
                    originalItem: item
                });
            });
        });
        return rows;
    }, [item, locations]);

    const detailColumns = [
        {
            header: 'Lokasyon',
            cell: (row) => row.isFirstInGroup ? (
                <Badge variant="info">{row.locationName}</Badge>
            ) : (
                <span className="text-muted" style={{ opacity: 0.3, paddingLeft: '10px' }}>↳</span>
            )
        },
        {
            header: 'Firma / Müşteri',
            accessor: 'alloc.customer_code',
            cell: (row) => row.alloc.customer_code ? (
                <Badge variant="warning">{row.alloc.customer_code}</Badge>
            ) : (
                <span className="text-muted text-small">Genel</span>
            )
        },
        {
            header: 'Miktar',
            accessor: 'alloc.quantity',
            cell: (row) => <strong>{row.alloc.quantity}</strong>
        },
        {
            header: 'Not',
            cell: (row) => {
                const rawNote = row.alloc.latest_note;
                const displayNote = rawNote
                    ? (rawNote.includes(':') ? rawNote.split(':').slice(1).join(':').trim() : rawNote)
                    : '-';
                return <span className="text-muted text-small">{displayNote}</span>;
            }
        },
        {
            header: 'İşlemler',
            cell: (row) => (
                <div className="action-buttons">
                    <Button
                        variant="icon"
                        className="btn-success"
                        size="sm"
                        icon={ArrowUpCircle}
                        onClick={() => onMovementRequest(MOVEMENT_TYPES.IN, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Giriş"
                    />
                    <Button
                        variant="icon"
                        className="btn-danger"
                        size="sm"
                        icon={ArrowDownCircle}
                        onClick={() => onMovementRequest(MOVEMENT_TYPES.OUT, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Çıkış"
                    />
                    <Button
                        variant="icon"
                        className="btn-warning"
                        size="sm"
                        icon={ArrowRightLeft}
                        onClick={() => onMovementRequest(MOVEMENT_TYPES.TRANSFER, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Transfer"
                    />
                </div>
            )
        }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={item ? `${item.item_code} - ${item.item_name}` : 'Ürün Detayı'}
            size="lg"
        >
            {item && (
                <>
                    <h4 style={{ marginBottom: '1rem' }}>Stok Dağılımı</h4>
                    {detailData.length > 0 ? (
                        <Table
                            columns={detailColumns}
                            data={detailData}
                            keyField="id"
                            emptyMessage="Stok kaydı bulunmuyor"
                        />
                    ) : (
                        <p className="text-muted" style={{ padding: '1rem', fontStyle: 'italic' }}>Bu ürün için henüz stok kaydı bulunmuyor.</p>
                    )}

                    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                        <h4>Yeni Stok Girişi</h4>
                        <p className="text-small text-muted">Bu ürüne hiç stok olmayan yeni bir lokasyona giriş yapmak için:</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <select
                                className="form-select"
                                style={{ maxWidth: '200px' }}
                                onChange={(e) => {
                                    if (!e.target.value) return;
                                    const locId = parseInt(e.target.value);
                                    const loc = locations.find(l => l.id === locId);

                                    // Trigger new movement
                                    onMovementRequest(
                                        MOVEMENT_TYPES.IN,
                                        item,
                                        locId,
                                        loc?.location_code,
                                        { quantity: 0, customer_code: null } // Mock alloc for new entry
                                    );

                                    // Reset select
                                    e.target.value = "";
                                }}
                            >
                                <option value="">Lokasyon Seç...</option>
                                {locations.sort((a, b) => a.location_code.localeCompare(b.location_code)).map(l => (
                                    <option key={l.id} value={l.id}>{l.location_code}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </>
            )}
        </Modal>
    );
}
