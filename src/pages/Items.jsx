import { useState, useMemo } from 'react';
import { Package, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Info } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import { MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType } from '../utils/productHelpers';
import Toast from '../components/Toast';
import MovementModal from '../components/MovementModal';
import ExpandableText from '../components/ExpandableText';

export default function Items() {
    const { items, loading: itemsLoading, refresh: refreshItems } = useItems();
    const { locations } = useLocations();
    const { createMovement, refresh: refreshMovements } = useMovements();
    const { toasts, success, error, warning, removeToast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');

    // Movement Modal State
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [movementForm, setMovementForm] = useState({
        type: MOVEMENT_TYPES.IN,
        quantity: '',
        toLocationId: '',
        notes: ''
    });

    // Detail Modal State (Simple view for stock breakdown)
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Filter items
    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const lowerSearch = searchTerm.toLowerCase();
        return items.filter(item =>
            item.item_code.toLowerCase().includes(lowerSearch) ||
            item.item_name.toLowerCase().includes(lowerSearch)
        );
    }, [items, searchTerm]);

    // Handlers
    const handleOpenMovement = (item, type) => {
        // Prepare item context for modal
        // Note: detailed stock info (customer codes etc) might be inside item.stock_distribution
        // But MovementModal expects a flatter structure for display usually.
        // For general "Add Stock", we just need basic item info.
        // For "Out/Transfer", we strictly need to know WHICH allocation.
        // Since this is a general "Items" list, we might implement a simpler flow or 
        // force user to pick allocation if multiple exist? 
        // For MVP/Fast iteration: Let's assume standard behavior. IF multiple allocations exist, 
        // the backend or modal logic might need complex handling. 
        // For now, we pass the aggregated item. 

        setSelectedItem(item);
        setMovementForm({
            type,
            quantity: '',
            toLocationId: '',
            notes: ''
        });
        setShowMovementModal(true);
    };

    const handleMovement = async () => {
        if (!selectedItem || !movementForm.quantity) {
            warning('Lütfen miktar girin');
            return;
        }

        setIsProcessing(true);
        try {
            const movementData = {
                item_id: selectedItem.id,
                quantity: parseInt(movementForm.quantity),
                movement_note: movementForm.notes,
                // customer_code handling: 
                // If we are in "Items" list, we don't strictly know which customer's stock unless we selected a specific allocation.
                // For IN: customer_code is optional (or entered in form - TODO: Add customer input to MovementModal if needed generic?)
                // For OUT/TRANSFER: If item has multiple customer stocks, backend might error or we pick FIFO? 
                // Current backend doesn't enforce FIFO strictly but expects specific allocation or just deducts total? 
                // Validating backend logic: 'locations.js' logic handles specific allocation deduction if logic matches. 
                // But the pure 'createMovement' endpoint works on item_id + location logic.

                // Let's rely on standard logic for now. 
            };

            if (movementForm.type === MOVEMENT_TYPES.IN) {
                // For global IN from Items page, we need a target location!
                // MovementModal usually infers 'to_location' from 'current_zone'. 
                // But here we are not in a zone. We need to ASK for location for IN too?
                // OR we default to a specific area? 
                // FactoryLayout logic: "IN to current zone".
                // Items Page logic: "IN to WHERE?" -> We need location selector for IN too!
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
                // TRANSFER needs FROM location. Item list shows TOTAL stock. 
                // We don't know FROM where. 
                // UX Decision: "Items" page is high level. 
                // Complex movements (Transfer/Out) should maybe be done from "Details" view where we see locations?
                // OR we ask user "From Location" too? 

                warning('Transfer işlemi için lütfen "Detay" görünümünden belirli bir lokasyonu seçin.');
                setIsProcessing(false);
                return;
            }
            else if (movementForm.type === MOVEMENT_TYPES.OUT) {
                // OUT needs FROM location.
                // Same issue. 
                warning('Çıkış işlemi için lütfen "Detay" görünümünden hangı lokasyondan çıkılacağını seçin.');
                setIsProcessing(false);
                return;
            }

            await createMovement(movementForm.type, movementData);

            await refreshMovements();
            await refreshItems();
            success('İşlem başarılı');
            setShowMovementModal(false);
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

    return (
        <div className="page-container" style={{ padding: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1><Package size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Ürün Listesi</h1>
                    <p className="text-muted">Tüm ürünlerin stok durumu ve detayları</p>
                </div>

                <div className="search-box" style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Ürün Ara..."
                        className="form-input"
                        style={{ paddingLeft: '40px', width: '300px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Kod</th>
                                <th>Ürün Adı</th>
                                <th>Toplam Stok</th>
                                <th>Birincil Konum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <strong>{item.item_code}</strong>

                                            {/* Product Type Badge */}
                                            {(() => {
                                                const type = getProductType(item.item_code);
                                                return (
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
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td><ExpandableText text={item.item_name} limit={30} /></td>
                                    <td>
                                        <span className={`badge ${item.quantity > 0 ? 'badge-success' : 'badge-warning'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td>
                                        {item.location_code ? (
                                            <span className="badge badge-info">{item.location_code}</span>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon btn-primary"
                                                onClick={() => openDetails(item)}
                                                title="Detay & Hareket"
                                            >
                                                <Info size={18} /> Detay
                                            </button>
                                            {/* Quick Actions removed to force user to go to details for correct location selection context */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Ürün bulunamadı</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedItem.item_code} - {selectedItem.item_name}</h3>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <h4>Stok Dağılımı</h4>
                            {selectedItem.stock_distribution && Object.keys(selectedItem.stock_distribution).length > 0 ? (
                                <table className="table" style={{ marginTop: '1rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Lokasyon</th>
                                            <th>Miktar</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(selectedItem.stock_distribution).map(([locId, qty]) => {
                                            const location = locations.find(l => l.id === parseInt(locId));
                                            return (
                                                <tr key={locId}>
                                                    <td>{location?.location_code || 'Bilinmiyor'}</td>
                                                    <td><strong>{qty}</strong></td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="btn-icon btn-success"
                                                                title="Giriş"
                                                                onClick={() => {
                                                                    setSelectedItem({
                                                                        ...selectedItem,
                                                                        current_zone_name: location?.location_code,
                                                                        current_zone_location_id: parseInt(locId),
                                                                        stock_at_zone: qty
                                                                    });
                                                                    setMovementForm({ type: MOVEMENT_TYPES.IN, quantity: '', toLocationId: parseInt(locId), notes: '' });
                                                                    setShowMovementModal(true);
                                                                }}
                                                            >
                                                                <ArrowUpCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="btn-icon btn-danger"
                                                                title="Çıkış"
                                                                onClick={() => {
                                                                    setSelectedItem({
                                                                        ...selectedItem,
                                                                        current_zone_name: location?.location_code,
                                                                        current_zone_location_id: parseInt(locId),
                                                                        stock_at_zone: qty
                                                                    });
                                                                    setMovementForm({ type: MOVEMENT_TYPES.OUT, quantity: '', toLocationId: '', notes: '' });
                                                                    setShowMovementModal(true);
                                                                }}
                                                            >
                                                                <ArrowDownCircle size={16} />
                                                            </button>
                                                            <button
                                                                className="btn-icon btn-warning"
                                                                title="Transfer"
                                                                onClick={() => {
                                                                    setSelectedItem({
                                                                        ...selectedItem,
                                                                        current_zone_name: location?.location_code,
                                                                        current_zone_location_id: parseInt(locId),
                                                                        stock_at_zone: qty
                                                                    });
                                                                    setMovementForm({ type: MOVEMENT_TYPES.TRANSFER, quantity: '', toLocationId: '', notes: '' });
                                                                    setShowMovementModal(true);
                                                                }}
                                                            >
                                                                <ArrowRightLeft size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
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
                                            setSelectedItem({
                                                ...selectedItem,
                                                current_zone_name: loc?.location_code,
                                                current_zone_location_id: locId,
                                                stock_at_zone: 0
                                            });
                                            setMovementForm({ type: MOVEMENT_TYPES.IN, quantity: '', toLocationId: locId, notes: '' });
                                            setShowMovementModal(true);
                                        }}
                                    >
                                        <option value="">Lokasyon Seç...</option>
                                        {locations.sort((a, b) => a.location_code.localeCompare(b.location_code)).map(l => (
                                            <option key={l.id} value={l.id}>{l.location_code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

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
