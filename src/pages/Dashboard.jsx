import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Package, MapPin, TrendingUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useItems } from '../hooks/useItems';
import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { getMovementTypeLabel, getMovementTypeBadge, MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType } from '../utils/productHelpers';
import { formatDate } from '../utils/dateHelper';
import './Dashboard.css';

export default function Dashboard() {
  const { items, loading: itemsLoading } = useItems();
  const { locations, loading: locationsLoading } = useLocations();
  const { movements, loading: movementsLoading, getMovementStats, refresh } = useMovements();
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalTransfer: 0
  });

  // Dashboard Filters
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const handleFilterApply = () => {
    refresh({
      limit: 20, // Keep limit for dashboard
      search,
      start_date: filters.startDate,
      end_date: filters.endDate
    });
  };

  const loading = itemsLoading || locationsLoading || movementsLoading;

  // Memoize expensive calculations
  const lowStockItems = useMemo(() =>
    items.filter(item => item.quantity < 10).slice(0, 5),
    [items]
  );

  const topStockItems = useMemo(() =>
    items.sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    [items]
  );

  const totalStock = useMemo(() =>
    items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );

  const recentMovements = useMemo(() =>
    (Array.isArray(movements) ? movements : []).slice(0, 10),
    [movements]
  );

  useEffect(() => {
    // Fetch stats based on current date filters
    getMovementStats({
      start_date: filters.startDate,
      end_date: filters.endDate
    }).then(data => setStats(data));
  }, [getMovementStats, filters.startDate, filters.endDate]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><BarChart3 size={28} /> Dashboard</h1>
        <p>Depo takip sistemi genel görünümü</p>
      </div>

      {/* Filter Section */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Son hareketlerde ara..."
            className="form-input"
            style={{ width: '250px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="form-input"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <span style={{ color: '#64748b' }}>-</span>
          <input
            type="date"
            className="form-input"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
          <button
            className="btn btn-primary"
            onClick={handleFilterApply}
            disabled={movementsLoading}
          >
            Filtrele
          </button>
          {(filters.startDate || filters.endDate || search) && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setFilters({ startDate: '', endDate: '' });
                setSearch('');
                refresh({ limit: 20 });
              }}
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Package size={24} color="#2563eb" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">{items.length}</div>
            <div className="dashboard-stat-label">Toplam Ürün</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7' }}>
            <MapPin size={24} color="#16a34a" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">{locations.length}</div>
            <div className="dashboard-stat-label">Lokasyon</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <ArrowDownToLine size={24} color="#059669" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">{stats.totalIn}</div>
            <div className="dashboard-stat-label">Giriş ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2' }}>
            <ArrowUpFromLine size={24} color="#dc2626" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">{stats.totalOut}</div>
            <div className="dashboard-stat-label">Çıkış ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff' }}>
            <TrendingUp size={24} color="#4f46e5" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">{stats.totalTransfer}</div>
            <div className="dashboard-stat-label">Transfer ({filters.startDate ? 'Seçilen' : '30 Gün'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Package size={24} color="#d97706" />
          </div>
          <div className="stat-content">
            <div className="dashboard-stat-value">
              {totalStock}
            </div>
            <div className="dashboard-stat-label">Toplam Stok</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Düşük Stoklu Ürünler</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün Kodu</th>
                  <th>Ürün Adı</th>
                  <th>Stok</th>
                  <th>Lokasyon</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.item_code}</td>
                    <td>{item.item_name}</td>
                    <td>
                      <span className="badge badge-warning">{item.quantity}</span>
                    </td>
                    <td>{item.location_code || '-'}</td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      Düşük stoklu ürün yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>En Fazla Stoklu Ürünler</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Ürün Kodu</th>
                  <th>Ürün Adı</th>
                  <th>Stok</th>
                  <th>Lokasyon</th>
                </tr>
              </thead>
              <tbody>
                {topStockItems.map(item => (
                  <tr key={item.id}>
                    <td>{item.item_code}</td>
                    <td>{item.item_name}</td>
                    <td>
                      <span className="badge badge-success">{item.quantity}</span>
                    </td>
                    <td>{item.location_code || '-'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      Henüz ürün yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Son Hareketler</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tip</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Kullanıcı</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    Henüz hareket kaydı yok
                  </td>
                </tr>
              ) : (
                recentMovements.map(movement => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.created_at)}</td>
                    <td>
                      <span className={`badge ${getMovementTypeBadge(movement.movement_type)}`}>
                        {getMovementTypeLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td>{movement.item_name}</td>
                    <td><strong>{movement.quantity}</strong></td>
                    <td>{movement.full_name}</td>
                    <td>{movement.movement_note || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
