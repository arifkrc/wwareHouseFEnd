import { useState, useMemo } from 'react';
import { Package, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Info, Download, Filter } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType, PRODUCT_TYPES } from '../utils/productHelpers';
import api from '../services/api';
import Toast from '../components/Toast';
import MovementModal from '../components/MovementModal';
import ExpandableText from '../components/ExpandableText';

// Check if these paths are correct based on file listing. Yes, they are in components/common/
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export default function Items() {
    const { items, loading: itemsLoading, refresh: refreshItems } = useItems();
    const { locations } = useLocations();
    const { createMovement, refresh: refreshMovements } = useMovements();
    const { toasts, success, error, warning, removeToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [showZeroStock, setShowZeroStock] = useState(false);
    const [filterType, setFilterType] = useState('ALL'); // ALL, DISK, KAMPANA, POYRA

    // Movement Modal State
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [movementForm, setMovementForm] = useState({
        type: MOVEMENT_TYPES.IN,
        quantity: '',
        toLocationId: '',
        customer_code: '',
        notes: ''
    });

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Filter items
    const filteredItems = useMemo(() => {
        let result = items;

        if (!showZeroStock) {
            result = result.filter(item => item.quantity > 0);
        }

        // Filter by Product Type
        if (filterType !== 'ALL') {
            result = result.filter(item => {
                const type = getProductType(item.item_code);
                // Compare labels or keys? productHelpers uses full objects.
                // Let's match by label or add a key to PRODUCT_TYPES.
                // PRODUCT_TYPES.DISK.label is 'Disk'. 
                // Simple approach: Check if the type object matches the selected type constant.
                // But we selected a string key 'DISK'.

                // Map string key to type object
                let targetType;
                switch (filterType) {
                    case 'DISK': targetType = PRODUCT_TYPES.DISK; break;
                    case 'KAMPANA': targetType = PRODUCT_TYPES.KAMPANA; break;
                    case 'POYRA': targetType = PRODUCT_TYPES.POYRA; break;
                    default: return true;
                }
                return type === targetType;
            });
        }

        if (!searchTerm) return result;

        const lowerSearch = searchTerm.toLowerCase();
        return result.filter(item =>
            item.item_code.toLowerCase().includes(lowerSearch) ||
            item.item_name.toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm, showZeroStock, filterType]);

    const handleExportCSV = () => {
        if (!filteredItems.length) {
            warning('Dışa aktarılacak veri yok');
            return;
        }

        // Define CSV headers
        const headers = ['Ürün Kodu', 'Ürün Adı', 'Toplam Stok', 'Birincil Lokasyon', 'Ürün Türü'];

        // Map data to CSV rows
        const rows = filteredItems.map(item => {
            const type = getProductType(item.item_code);
            return [
                item.item_code,
                `"${item.item_name.replace(/"/g, '""')}"`, // Escape quotes
                item.quantity,
                item.location_code || '-',
                type.label
            ].join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');

        // Create download link
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `urunler_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        success('Excel dosyası indirildi');
    };

    // Handlers
    const handleMovement = async () => {
        if (!selectedItem || !movementForm.quantity) {
            warning('Lütfen miktar girin');
            return;
        }

        setIsProcessing(true);
        try {
            const finalCustomerCode = selectedItem.customer_code || movementForm.customer_code || null;

            const movementData = {
                item_id: selectedItem.id,
                quantity: parseInt(movementForm.quantity),
                movement_note: movementForm.notes,
                customer_code: finalCustomerCode
            };

            if (movementForm.type === MOVEMENT_TYPES.IN) {
                if (!movementForm.toLocationId) {
                    warning('Hangi lokasyona giriş yapılacak? Lütfen seçin.');
                    setIsProcessing(false);
                    return;
                }
                movementData.to_location_id = parseInt(movementForm.toLocationId);
                const locName = locations.find(l => l.id === movementData.to_location_id)?.location_code;
                movementData.movement_note = `Stok Girişi (${locName}): ${movementForm.notes}`;
            }
            else if (movementForm.type === MOVEMENT_TYPES.TRANSFER) {
                if (!movementForm.toLocationId) {
                    warning('Hedef lokasyon seçin');
                    setIsProcessing(false);
                    return;
                }
                // Determine source location from selectedItem context (set when opening modal)
                if (!selectedItem.current_zone_location_id) {
                    warning('Transfer için kaynak lokasyon belirlenemedi. Lütfen detay görünümünden işlem yapın.');
                    setIsProcessing(false);
                    return;
                }
                movementData.from_location_id = selectedItem.current_zone_location_id;
                movementData.to_location_id = parseInt(movementForm.toLocationId);
            }
            else if (movementForm.type === MOVEMENT_TYPES.OUT) {
                if (!selectedItem.current_zone_location_id) {
                    warning('Çıkış için kaynak lokasyon belirlenemedi. Lütfen detay görünümünden işlem yapın.');
                    setIsProcessing(false);
                    return;
                }
                movementData.from_location_id = selectedItem.current_zone_location_id;
            }

            await createMovement(movementForm.type, movementData);

            await refreshMovements();
            await refreshItems();

            // If we are in detail view, we might want to refresh the selected item details?
            // The detail view relies on 'selectedItem' object. 
            // We should probably re-fetch the item or close the detail modal.
            // For now, let's close the movement modal. The main list updates. 
            // If the user keeps Detail Modal open, the data might be stale unless we update 'selectedItem'.
            // Simple fix: Close detail modal if it's open, or user can re-open.
            // Better: 'refreshItems' updates the 'items' array. If 'selectedItem' is just a reference, it won't update?
            // Actually 'selectedItem' is a separate state. We need to find the updated item from new 'items' list if we want to keep it open.

            const updatedItem = items.find(i => i.id === selectedItem.id);
            // Note: 'items' here is from closure, might be old until next render. 
            // So simpler to just show success and let user see updated list.

            success('İşlem başarılı');
            setShowMovementModal(false);

            // If specific logic for Detail Modal update is needed, we would implement it here.
            // For now, we will close the Detail Modal to force refresh on re-open, 
            // or let the user see the list update behind.
            setShowDetailModal(false);

        } catch (err) {
            console.error(err);
            error('İşlem başarısız');
        } finally {
            setIsProcessing(false);
        }
    };

    const openDetails = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    const handleOpenMovementGroup = (type, item, locId, locName, alloc) => {
        // Pre-fill selected item with location context
        setSelectedItem({
            ...item,
            current_zone_name: locName,
            current_zone_location_id: parseInt(locId),
            stock_at_zone: alloc.quantity,
            customer_code: alloc.customer_code
        });

        let initialForm = {
            type,
            quantity: '',
            toLocationId: '',
            customer_code: '',
            notes: ''
        };

        if (type === MOVEMENT_TYPES.IN) {
            // For IN, we usually want to add MORE to this location, so pre-select it
            initialForm.toLocationId = parseInt(locId);
        }

        setMovementForm(initialForm);
        setShowMovementModal(true);
    };

    // Columns for Main Table
    const columns = [
        {
            header: 'Kod',
            accessor: 'item_code',
            cell: (item) => {
                const type = getProductType(item.item_code);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{item.item_code}</strong>
                        <span
                            style={{
                                fontSize: '0.7rem',
                                backgroundColor: type.bg,
                                color: type.color,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                width: 'fit-content',
                                marginTop: '2px',
                                fontWeight: '600'
                            }}
                        >
                            {type.label}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Ürün Adı',
            accessor: 'item_name',
            cell: (item) => <ExpandableText text={item.item_name} limit={30} />
        },
        {
            header: 'Toplam Stok',
            accessor: 'quantity',
            cell: (item) => (
                <Badge variant={item.quantity > 0 ? 'success' : 'warning'}>
                    {item.quantity}
                </Badge>
            )
        },
        {
            header: 'Birincil Konum',
            accessor: 'location_code',
            cell: (item) => item.location_code ? <Badge variant="info">{item.location_code}</Badge> : '-'
        },
        {
            header: 'İşlemler',
            cell: (item) => (
                <Button
                    variant="icon-primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openDetails(item); }}
                    title="Detay & Hareket"
                    icon={<Info size={18} />}
                >
                    Detay
                </Button>
            )
        }
    ];

    // Prepare Detail Modal Data
    const detailData = useMemo(() => {
        if (!selectedItem || !selectedItem.stock_distribution) return [];

        const rows = [];
        Object.entries(selectedItem.stock_distribution).forEach(([locId, data]) => {
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
                    originalItem: selectedItem
                });
            });
        });
        return rows;
    }, [selectedItem, locations]);

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
                        variant="icon-success"
                        size="sm"
                        icon={<ArrowUpCircle size={16} />}
                        onClick={() => handleOpenMovementGroup(MOVEMENT_TYPES.IN, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Giriş"
                    />
                    <Button
                        variant="icon-danger"
                        size="sm"
                        icon={<ArrowDownCircle size={16} />}
                        onClick={() => handleOpenMovementGroup(MOVEMENT_TYPES.OUT, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Çıkış"
                    />
                    <Button
                        variant="icon-warning"
                        size="sm"
                        icon={<ArrowRightLeft size={16} />}
                        onClick={() => handleOpenMovementGroup(MOVEMENT_TYPES.TRANSFER, row.originalItem, row.locId, row.locationName, row.alloc)}
                        title="Transfer"
                    />
                </div>
            )
        }
    ];

    return (
        <div className="page-container" style={{ padding: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1><Package size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Ürün Listesi</h1>
                    <p className="text-muted">Tüm ürünlerin stok durumu ve detayları</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        icon={<Download size={16} />}
                        title="Listeyi Excel olarak indir"
                    >
                        Excel
                    </Button>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Filter size={16} style={{ position: 'absolute', left: '10px', zIndex: 1, color: '#64748b' }} />
                        <select
                            className="form-select"
                            style={{ paddingLeft: '32px', minWidth: '140px', height: '40px' }}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">Tüm Türler</option>
                            <option value="DISK">Disk</option>
                            <option value="KAMPANA">Kampana</option>
                            <option value="POYRA">Poyra</option>
                        </select>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={showZeroStock}
                            onChange={(e) => setShowZeroStock(e.target.checked)}
                        />
                        Stoksuzlar
                    </label>

                    <div className="search-box" style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Ürün Ara..."
                            className="form-input"
                            style={{ paddingLeft: '40px', width: '250px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 500 }}>Toplam:</span>
                    <span style={{ marginLeft: '0.5rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', color: '#0f172a' }}>
                        {filteredItems.length} kayıt
                    </span>
                    {filteredItems.length !== items.length && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>(Filtrelendi)</span>
                    )}
                </div>
                <Table
                    columns={columns}
                    data={filteredItems}
                    keyField="id"
                    isLoading={itemsLoading}
                    emptyMessage="Ürün bulunamadı"
                />
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title={selectedItem ? `${selectedItem.item_code} - ${selectedItem.item_name}` : 'Ürün Detayı'}
                size="lg"
            >
                {selectedItem && (
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

                                        // Set item context for NEW entry
                                        setSelectedItem({
                                            ...selectedItem,
                                            current_zone_name: loc?.location_code,
                                            current_zone_location_id: locId,
                                            stock_at_zone: 0,
                                            customer_code: null
                                        });
                                        setMovementForm({ type: MOVEMENT_TYPES.IN, quantity: '', toLocationId: locId, customer_code: '', notes: '' });
                                        setShowMovementModal(true);
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

            <MovementModal
                isOpen={showMovementModal}
                onClose={() => setShowMovementModal(false)}
                selectedItem={selectedItem}
                movementForm={movementForm}
                setMovementForm={setMovementForm}
                handleMovement={handleMovement}
                isProcessing={isProcessing}
                locations={locations}
                titlePrefix={selectedItem?.current_zone_name ? `(${selectedItem.current_zone_name})` : ''}
            />

            {toasts.map(t => (
                <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
            ))}
        </div>
    );
}
