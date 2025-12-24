import { useState, useMemo, useEffect } from 'react';
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
import Badge from '../components/common/Badge';

import Button from '../components/common/Button';
import ItemDetailModal from '../components/ItemDetailModal';
import './Items.scss';


export default function Items() {
    const { items, loading: itemsLoading, refresh: refreshItems } = useItems();
    const { locations } = useLocations();
    const { createMovement, refresh: refreshMovements } = useMovements();
    const { toasts, success, error, warning, removeToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [showZeroStock, setShowZeroStock] = useState(false);
    const [filterType, setFilterType] = useState('ALL'); // ALL, DISK, KAMPANA, POYRA

    // Fetch all items on mount
    useEffect(() => {
        refreshItems({ limit: -1 });
    }, [refreshItems]);

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

    // Client-side filtering
    const filteredItems = useMemo(() => {
        let result = items;

        if (!showZeroStock) {
            result = result.filter(item => item.quantity > 0);
        }

        // Filter by Product Type
        if (filterType !== 'ALL') {
            result = result.filter(item => {
                const type = getProductType(item.item_code);
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

    const handleSearch = (e) => setSearchTerm(e.target.value);
    const handleFilterType = (e) => setFilterType(e.target.value);
    const handleStockFilter = (e) => setShowZeroStock(e.target.checked);

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
                    <div className="item-code-wrapper">
                        <strong>{item.item_code}</strong>
                        <span
                            className="item-type-badge"
                            style={{
                                backgroundColor: type.bg,
                                color: type.color
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
                    variant="icon"
                    className="btn-primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); openDetails(item); }}
                    title="Detay & Hareket"
                    icon={Info}
                >
                    Detay
                </Button>
            )
        }
    ];

    // Detail columns and data calculation moved to ItemDetailModal

    return (
        <div className="container" style={{ paddingBottom: '2rem', paddingTop: '2rem' }}>
            <div className="items-header">
                <div>
                    <h1><Package size={28} /> Ürün Listesi</h1>
                    <p className="text-muted">Tüm ürünlerin stok durumu ve detayları</p>
                </div>

                <div className="items-controls">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        icon={Download}
                        title="Listeyi Excel olarak indir"
                    >
                        Excel
                    </Button>

                    <div className="filter-wrapper">
                        <Filter size={16} className="filter-icon" />
                        <select
                            className="form-select filter-select"
                            value={filterType}
                            onChange={handleFilterType}
                        >
                            <option value="ALL">Tüm Türler</option>
                            <option value="DISK">Disk</option>
                            <option value="KAMPANA">Kampana</option>
                            <option value="POYRA">Poyra</option>
                        </select>
                    </div>

                    <label className="stock-toggle">
                        <input
                            type="checkbox"
                            checked={showZeroStock}
                            onChange={handleStockFilter}
                        />
                        Stoksuzları Göster
                    </label>

                    <div className="search-wrapper">
                        <Search size={20} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Ürün Ara..."
                            className="form-input search-input"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="items-summary">
                <span style={{ fontWeight: 500 }}>Toplam:</span>
                <span className="summary-pill">
                    {filteredItems.length} kayıt
                </span>
                {filteredItems.length !== items.length && (
                    <span className="summary-filtered">(Filtrelendi)</span>
                )}
            </div>
            <Table
                columns={columns}
                data={filteredItems}
                keyField="id"
                isLoading={itemsLoading}
                emptyMessage="Ürün bulunamadı"
            />


            {/* Detail Modal */}
            {/* Detail Modal */}
            <ItemDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                item={selectedItem}
                locations={locations}
                onMovementRequest={handleOpenMovementGroup}
            />

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

            {
                toasts.map(t => (
                    <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
                ))
            }
        </div >
    );
}
