import { useState, useMemo, useEffect } from 'react';
import { Package } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { useMovementHandler } from '../hooks/useMovementHandler';
import { useToast } from '../hooks/useToast';
import { useTableExport } from '../hooks/useTableExport';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType, PRODUCT_TYPES } from '../utils/productHelpers';
import api from '../services/api';
import Toast from '../components/Toast';
import MovementDrawer from '../components/MovementDrawer';
import ItemDetailDrawer from '../components/ItemDetailDrawer';

// New Components
import ItemsFilters from '../components/items/ItemsFilters';
import ItemsSummaryTable from '../components/items/ItemsSummaryTable';
import ItemsDetailedTable from '../components/items/ItemsDetailedTable';

import './Items.scss';

export default function Items() {
    const { items, loading: itemsLoading, refresh: refreshItems } = useItems();
    const { locations } = useLocations();
    const { refresh: refreshMovements } = useMovements();
    const { toasts, success, error, warning, removeToast } = useToast();

    const { executeMovement, isProcessing, setIsProcessing } = useMovementHandler({
        onSuccess: success,
        onError: error,
        onWarning: warning,
        refreshItems,
        refreshMovements,
        locations
    });
    const { downloadCSV } = useTableExport();

    const [searchTerm, setSearchTerm] = useState('');
    const [showZeroStock, setShowZeroStock] = useState(false);

    const [filterType, setFilterType] = useState('ALL'); // ALL, DISK, KAMPANA, POYRA
    const [stockSourceFilter, setStockSourceFilter] = useState('ALL'); // ALL, DOMESTIC, EXPORT
    const [customerFilter, setCustomerFilter] = useState('ALL');

    // View Mode: 'summary' or 'detailed'
    const [viewMode, setViewMode] = useState('summary');
    const [allocations, setAllocations] = useState([]);
    const [allocationsLoading, setAllocationsLoading] = useState(false);

    // Extract Unique Customers
    const uniqueCustomers = useMemo(() => {
        const custs = new Set();
        items.forEach(item => {
            const dist = item.stock_distribution || {};
            Object.values(dist).forEach(locData => {
                const allocs = locData.allocations || {};
                Object.values(allocs).forEach(a => {
                    if (a.customer_code) custs.add(a.customer_code);
                });
            });
        });
        return Array.from(custs).sort();
    }, [items]);

    // Fetch all items on mount
    useEffect(() => {
        refreshItems({ limit: -1 });
    }, [refreshItems]);

    // Keep selectedItem in sync with items list (for live updates)
    useEffect(() => {
        if (selectedItem && items.length > 0) {
            const updated = items.find(i => i.id === selectedItem.id);
            if (updated) setSelectedItem(updated);
        }
    }, [items]);


    // Movement Modal State
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
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

        // Filter by Stock Source (Domestic / Export)
        if (stockSourceFilter !== 'ALL') {
            result = result.filter(item => {
                if (stockSourceFilter === 'DOMESTIC') return (item.quantity_domestic || 0) > 0;
                if (stockSourceFilter === 'EXPORT') return (item.quantity_export || 0) > 0;
                return true;
            });
        }

        // Filter by Customer
        if (customerFilter !== 'ALL') {
            result = result.filter(item => {
                const dist = item.stock_distribution || {};
                // Check if any allocation matches customer
                return Object.values(dist).some(locData => {
                    const allocs = locData.allocations || {};
                    return Object.values(allocs).some(a => a.customer_code === customerFilter);
                });
            });
        }

        if (!searchTerm) return result;

        const lowerSearch = searchTerm.toLowerCase();
        return result.filter(item =>
            item.item_code.toLowerCase().includes(lowerSearch) ||
            item.item_name.toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm, showZeroStock, filterType, stockSourceFilter, customerFilter]);

    // Fetch Detailed Allocations
    const fetchDetailedAllocations = async () => {
        setAllocationsLoading(true);
        try {
            const response = await api.get('/items/allocations');
            setAllocations(response.data);
        } catch (err) {
            error('Detaylı stok bilgisi yüklenemedi');
        } finally {
            setAllocationsLoading(false);
        }
    };

    // Load allocations when switching to detailed view
    useEffect(() => {
        if (viewMode === 'detailed' && allocations.length === 0) {
            fetchDetailedAllocations();
        }
    }, [viewMode]);

    // Filter allocations with same logic as items
    const filteredAllocations = useMemo(() => {
        let result = allocations;

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(alloc =>
                alloc.item_code?.toLowerCase().includes(term) ||
                alloc.item_name?.toLowerCase().includes(term) ||
                alloc.customer_code?.toLowerCase().includes(term) ||
                alloc.location_code?.toLowerCase().includes(term)
            );
        }

        // Product type filter
        if (filterType !== 'ALL') {
            result = result.filter(alloc => {
                const productType = getProductType(alloc.item_code);
                return productType === filterType;
            });
        }

        // Export filter
        if (stockSourceFilter === 'EXPORT') {
            result = result.filter(alloc => alloc.is_export === true);
        } else if (stockSourceFilter === 'DOMESTIC') {
            result = result.filter(alloc => alloc.is_export === false);
        }

        // Customer filter
        if (customerFilter !== 'ALL') {
            result = result.filter(alloc => (alloc.customer_code || '-') === customerFilter);
        }

        return result;
    }, [allocations, searchTerm, filterType, stockSourceFilter, customerFilter]);

    const handleSearch = (e) => setSearchTerm(e.target.value);
    const handleFilterType = (e) => setFilterType(e.target.value);
    const handleStockFilter = (e) => setShowZeroStock(e.target.checked);

    const handleExportCSV = () => {
        if (viewMode === 'summary') {
            // Export summary table
            if (!filteredItems.length) {
                warning('Dışa aktarılacak veri yok');
                return;
            }

            const headers = ['Ürün Kodu', 'Ürün Adı', 'Stok Miktarı', 'Lokasyon', 'Kategori', 'Açıklama'];

            const rowMapper = (item) => {
                const type = getProductType(item.item_code);
                return [
                    item.item_code,
                    item.item_name,
                    item.quantity,
                    item.location_code || '-',
                    type.label,
                    item.description || ''
                ];
            };

            const successExport = downloadCSV(filteredItems, headers, rowMapper, 'urunler_listesi');
            if (successExport) {
                success('Excel dosyası indirildi');
            } else {
                error('İndirme başarısız');
            }
        } else {
            // Export detailed allocations
            if (!filteredAllocations.length) {
                warning('Dışa aktarılacak veri yok');
                return;
            }

            const headers = ['Ürün Kodu', 'Ürün Adı', 'Alan', 'Müşteri', 'İhracat', 'Miktar'];
            const rowMapper = (alloc) => [
                alloc.item_code,
                alloc.item_name,
                alloc.location_code,
                alloc.customer_code || '-',
                alloc.is_export ? 'Evet' : 'Hayır',
                alloc.quantity
            ];

            const successExport = downloadCSV(filteredAllocations, headers, rowMapper, 'detayli_stok_dagilimi');
            if (successExport) {
                success('Excel dosyası indirildi');
            } else {
                error('İndirme başarısız');
            }
        }
    };

    // Handlers
    const handleMovement = async () => {
        const success = await executeMovement(selectedItem, movementForm);
        if (success) {
            setShowMovementModal(false);
            setShowDetailModal(false);
            // If in detailed view, also refresh allocations immediately
            if (viewMode === 'detailed') {
                fetchDetailedAllocations();
            }
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
            quantity: type === MOVEMENT_TYPES.OUT ? alloc.quantity : '', // Auto-fill for OUT
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

    return (
        <div className="container" style={{ paddingBottom: '2rem', paddingTop: '2rem' }}>
            <div className="items-header">
                <div>
                    <h1><Package size={28} strokeWidth={2} fill="#e2e8f0" style={{ color: '#1e293b' }} /> Ürün Listesi</h1>
                    <p className="text-muted">Tüm ürünlerin stok durumu ve detayları</p>
                </div>

                <ItemsFilters
                    searchTerm={searchTerm}
                    onSearchChange={handleSearch}
                    filterType={filterType}
                    onFilterTypeChange={handleFilterType}
                    stockSourceFilter={stockSourceFilter}
                    onStockSourceChange={(e) => setStockSourceFilter(e.target.value)}
                    customerFilter={customerFilter}
                    onCustomerFilterChange={(e) => setCustomerFilter(e.target.value)}
                    showZeroStock={showZeroStock}
                    onShowZeroStockChange={handleStockFilter}
                    uniqueCustomers={uniqueCustomers}
                    onExport={handleExportCSV}
                />
            </div>

            {/* View Mode Tabs */}
            <div className="view-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
                <button
                    className={`tab-button ${viewMode === 'summary' ? 'active' : ''}`}
                    onClick={() => setViewMode('summary')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'summary' ? '600' : '400',
                        color: viewMode === 'summary' ? '#1e293b' : '#64748b',
                        borderBottom: viewMode === 'summary' ? '3px solid #3b82f6' : '3px solid transparent',
                        marginBottom: '-2px',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Özet Görünüm
                </button>
                <button
                    className={`tab-button ${viewMode === 'detailed' ? 'active' : ''}`}
                    onClick={() => setViewMode('detailed')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'detailed' ? '600' : '400',
                        color: viewMode === 'detailed' ? '#1e293b' : '#64748b',
                        borderBottom: viewMode === 'detailed' ? '3px solid #3b82f6' : '3px solid transparent',
                        marginBottom: '-2px',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Detaylı Müşteri Dağılımı
                </button>
            </div>

            {/* Summary View */}
            {viewMode === 'summary' && (
                <ItemsSummaryTable
                    items={filteredItems}
                    loading={itemsLoading}
                    onRowClick={openDetails}
                />
            )}

            {/* Detailed Allocations View */}
            {viewMode === 'detailed' && (
                <ItemsDetailedTable
                    allocations={filteredAllocations}
                    loading={allocationsLoading}
                    totalCount={allocations.length}
                />
            )}

            {/* Detail Modal */}
            <ItemDetailDrawer
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                item={selectedItem}
                locations={locations}
                onMovementRequest={handleOpenMovementGroup}
                onRefresh={() => refreshItems({ limit: -1 })}
            />

            <MovementDrawer
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
