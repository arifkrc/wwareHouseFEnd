import { useState, useEffect } from 'react';
import { History, RefreshCw, Edit2 } from 'lucide-react';
import { useMovements } from '../hooks/useMovements';
import { useToast } from '../hooks/useToast';
import { useTableExport } from '../hooks/useTableExport';
import { getMovementTypeLabel, getMovementTypeBadge, MOVEMENT_TYPES } from '../utils/movementHelpers';
import { formatDate } from '../utils/dateHelper';
import Button from '../components/common/Button';
import Pagination from '../components/Pagination';
import Skeleton from '../components/common/Skeleton';
import Modal from '../components/common/Modal';
import './Movements.scss';

export default function Movements() {
  const { movements, pagination, refresh: refreshMovements, loading } = useMovements();
  const { downloadCSV } = useTableExport();

  // Local state for filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Debounce Search and Date Range
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshMovements({
        page: 1,
        limit: 20,
        search,
        sortBy,
        order,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      setPage(1); // Reset to page 1 on search or date range change
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [search, dateRange, refreshMovements]); // Include dateRange in debounce effect

  // Separate effect for Page/Sort changes
  useEffect(() => {
    refreshMovements({
      page,
      limit: 20,
      search,
      sortBy,
      order,
      start_date: dateRange.startDate,
      end_date: dateRange.endDate
    });
  }, [page, sortBy, order, search, dateRange, refreshMovements]); // Added search, dateRange, refreshMovements to dependencies for completeness

  const handleSort = (field) => {
    const newOrder = sortBy === field && order === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setOrder(newOrder);
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  // Edit Note State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [editNote, setEditNote] = useState('');
  const { updateMovement } = useMovements();
  const { success, error: showError } = useToast();

  const handleEditClick = (movement) => {
    setSelectedMovement(movement);
    setEditNote(movement.movement_note || '');
    setEditModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!selectedMovement) return;
    try {
      await updateMovement(selectedMovement.id, editNote);
      success('Not güncellendi');
      setEditModalOpen(false);
      refreshMovements(); // Refresh list to show new note
    } catch (err) {
      console.error(err);
      showError('Not güncellenemedi');
    }
  };

  const handleExport = () => {
    if (!movements || movements.length === 0) {
      showError('Dışa aktarılacak veri yok');
      return;
    }

    const headers = ['Tarih', 'İşlem Tipi', 'Ürün Kodu', 'Ürün Adı', 'Miktar', 'Kaynak Depo', 'Hedef Depo', 'Kullanıcı', 'Not'];

    const rowMapper = (m) => [
      formatDate(m.created_at),
      getMovementTypeLabel(m.movement_type),
      m.item_code,
      m.item_name,
      m.quantity,
      m.from_location_code || '-',
      m.to_location_code || '-',
      m.full_name,
      m.movement_note || ''
    ];

    downloadCSV(movements, headers, rowMapper, 'hareket_gecmisi');
  };

  return (
    <div className="container movements-page" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <div>
          <h1><History size={28} /> Hareket Geçmişi</h1>
          <p>Tüm stok hareketlerinin geçmişi</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            className="form-input"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            title="Başlangıç Tarihi"
          />
          <input
            type="date"
            className="form-input"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            title="Bitiş Tarihi"
          />
          <input
            type="text"
            className="form-input"
            placeholder="Ara: Ürün, Kod, Not..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '200px' }}
          />
          <Button
            variant="secondary"
            onClick={() => refreshMovements({ page: 1, limit: 20, search, sortBy, order, start_date: dateRange.startDate, end_date: dateRange.endDate })}
            disabled={loading}
            icon={RefreshCw}
          >
            Yenile
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || movements.length === 0}
            title="Listeyi Excel olarak indir"
          >
            Excel İndir
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr className="sortable-header">
                <th onClick={() => handleSort('created_at')}>Tarih {sortBy === 'created_at' && (order === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('movement_type')}>Tip {sortBy === 'movement_type' && (order === 'asc' ? '↑' : '↓')}</th>
                <th>Ürün</th>
                <th onClick={() => handleSort('quantity')}>Miktar {sortBy === 'quantity' && (order === 'asc' ? '↑' : '↓')}</th>
                <th>Nereden</th>
                <th>Nereye</th>
                <th>Kullanıcı</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    {Array.from({ length: 8 }).map((_, colIdx) => (
                      <td key={colIdx} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <Skeleton height="20px" width={`${Math.floor(Math.random() * 40 + 60)}%`} borderRadius="4px" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                movements.map(movement => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.created_at)}</td>
                    <td>
                      <span className={`badge ${getMovementTypeBadge(movement.movement_type)} `}>
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td>
                      <strong>{movement.item_code}</strong> - {movement.item_name}
                    </td>
                    <td><strong>{movement.quantity}</strong></td>
                    <td>{movement.from_location_code || '-'}</td>
                    <td>{movement.to_location_code || '-'}</td>
                    <td>{movement.full_name}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ flex: 1 }}>{movement.movement_note || '-'}</span>
                      <button
                        onClick={() => handleEditClick(movement)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
                        title="Notu Düzenle"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          totalItems={pagination.total}
          itemsPerPage={20}
        />
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Notu Düzenle"
        size="sm"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>İptal</Button>
            <Button variant="primary" onClick={handleSaveNote}>Kaydet</Button>
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>Hareket Notu</label>
          <textarea
            className="form-input"
            rows={3}
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Not giriniz..."
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
