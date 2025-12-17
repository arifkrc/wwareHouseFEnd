import { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { useMovements } from '../hooks/useMovements';
import { getMovementTypeLabel, getMovementTypeBadge, MOVEMENT_TYPES } from '../utils/movementHelpers';
import { formatDate } from '../utils/dateHelper';
import './Movements.css';

export default function Movements() {
  const { movements, pagination, refresh: refreshMovements, loading } = useMovements();

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

  return (
    <div className="movements-page">
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
          <button
            className="btn btn-secondary"
            onClick={() => refreshMovements({ page: 1, limit: 20, search, sortBy, order, start_date: dateRange.startDate, end_date: dateRange.endDate })}
            disabled={loading}
          >
            <RefreshCw size={18} /> Yenile
          </button>
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
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="spinner"></div>
                  </td>
                </tr>
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
                    <td>{movement.movement_note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <button
            className="btn btn-outline"
            disabled={page === 1 || loading}
            onClick={() => handlePageChange(page - 1)}
          >
            Önceki
          </button>
          <span>Sayfa {pagination.page} / {pagination.totalPages} (Toplam {pagination.total})</span>
          <button
            className="btn btn-outline"
            disabled={page === pagination.totalPages || loading}
            onClick={() => handlePageChange(page + 1)}
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
