import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Package, MapPin, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Download, Filter } from 'lucide-react';

import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { getMovementTypeLabel, getMovementTypeBadge, MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType, PRODUCT_TYPES } from '../utils/productHelpers';
import { formatDate } from '../utils/dateHelper';
import { useTableExport } from '../hooks/useTableExport';
import { useToast } from '../hooks/useToast';
import './Dashboard.css';

import Pagination from '../components/Pagination';
import api from '../services/api';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';

export default function Dashboard() {

  // We will NOT use useItems for dashboard widgets anymore.

  const { locations, loading: locationsLoading } = useLocations();
  const { movements, loading: movementsLoading, getMovementStats, refresh, pagination: movPagination } = useMovements();

  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalTransfer: 0
  });

  const [widgetStats, setWidgetStats] = useState({
    lowStock: [],
    highStock: [],
    totalStockCount: 0 // Adding this if we want total summary
  });

  // Dashboard Filters
  const [search, setSearch] = useState('');
  const [movementFilterType, setMovementFilterType] = useState('ALL'); // Product Type Filter for Movements
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const { downloadCSV } = useTableExport();
  const { success } = useToast();

  // Filter movements by product type
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    if (movementFilterType === 'ALL') return movements;

    return movements.filter(m => {
      // m.items is undefined, but m.item_code is available from our backend join
      // Wait, movements.js:87 says "item_code: m.items?.item_code"
      if (!m.item_code) return false;
      const type = getProductType(m.item_code);

      let targetType;
      switch (movementFilterType) {
        case 'DISK': targetType = PRODUCT_TYPES.DISK; break;
        case 'KAMPANA': targetType = PRODUCT_TYPES.KAMPANA; break;
        case 'POYRA': targetType = PRODUCT_TYPES.POYRA; break;
        default: return true;
      }
      return type === targetType;
    });
  }, [movements, movementFilterType]);

  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterApply = () => {
    refresh({
      page: 1, // Reset to page 1
      limit: 10,
      search,
      start_date: filters.startDate,
      end_date: filters.endDate
    });
    setCurrentPage(1);
  };

  const handlePageChange = (p) => {
    setCurrentPage(p);
    refresh({
      page: p,
      limit: 10,
      search,
      start_date: filters.startDate,
      end_date: filters.endDate
    });
  };

  const loading = locationsLoading || movementsLoading;

  // Fetch Dashboard Widgets (Top/Low Stock)
  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const res = await api.get('/items/stats/widgets');
        setWidgetStats(res.data);
      } catch (err) {
        console.error('Widget stats error:', err);
      }
    };
    fetchWidgets();
  }, []);

  // Fetch stats based on current date filters
  useEffect(() => {
    getMovementStats({
      start_date: filters.startDate,
      end_date: filters.endDate
    }).then(data => setStats(data));
  }, [getMovementStats, filters.startDate, filters.endDate]);

  // Initial Movements Load
  useEffect(() => {
    refresh({ page: 1, limit: 10 });
  }, [refresh]);

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
            <div className="dashboard-stat-value">{widgetStats.totalStockCount || 0}</div>
            <div className="dashboard-stat-label">Toplam Stok</div>
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
              {widgetStats.totalItemCount || 0}
            </div>
            <div className="dashboard-stat-label">Ürün Çeşidi (Kalem)</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Düşük Stoklu Ürünler</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  downloadCSV(
                    widgetStats.lowStock,
                    ['Ürün Kodu', 'Ürün Adı', 'Stok'],
                    (item) => [item.item_code, item.item_name, item.quantity],
                    'dusuk_stok'
                  ) && success('Düşük stok listesi indirildi');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                style={{ fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <Download size={16} /> Excel
              </a>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                {widgetStats.lowStock.length}
              </span>
            </div>
          </div>
          <Table
            columns={[
              { header: 'Ürün Kodu', accessor: 'item_code' },
              { header: 'Ürün Adı', accessor: 'item_name' },
              {
                header: 'Stok',
                accessor: 'quantity',
                render: (row) => <Badge variant="warning">{row.quantity}</Badge>
              },
              { header: 'Lokasyon', render: () => '-' }
            ]}
            data={widgetStats.lowStock}
            emptyMessage="Düşük stoklu ürün yok"
          />
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>En Fazla Stoklu Ürünler</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  downloadCSV(
                    widgetStats.highStock,
                    ['Ürün Kodu', 'Ürün Adı', 'Stok'],
                    (item) => [item.item_code, item.item_name, item.quantity],
                    'yuksek_stok'
                  ) && success('Yüksek stok listesi indirildi');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                style={{ fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <Download size={16} /> Excel
              </a>
              <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                {widgetStats.highStock.length}
              </span>
            </div>
          </div>
          <Table
            columns={[
              { header: 'Ürün Kodu', accessor: 'item_code' },
              { header: 'Ürün Adı', accessor: 'item_name' },
              {
                header: 'Stok',
                accessor: 'quantity',
                render: (row) => <Badge variant="success">{row.quantity}</Badge>
              },
              { header: 'Lokasyon', render: () => '-' }
            ]}
            data={widgetStats.highStock}
            emptyMessage="Henüz ürün yok"
          />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3>Son Hareketler</h3>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Filter size={14} style={{ position: 'absolute', left: '8px', zIndex: 1, color: '#64748b' }} />
              <select
                className="form-select"
                style={{ paddingLeft: '28px', minWidth: '130px', height: '36px', fontSize: '0.9rem' }}
                value={movementFilterType}
                onChange={(e) => setMovementFilterType(e.target.value)}
              >
                <option value="ALL">Tüm Türler</option>
                <option value="DISK">Disk</option>
                <option value="KAMPANA">Kampana</option>
                <option value="POYRA">Poyra</option>
              </select>
            </div>

            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                downloadCSV(
                  filteredMovements,
                  ['Tarih', 'Tip', 'Ürün Kodu', 'Ürün Adı', 'Miktar', 'Kullanıcı', 'Not'],
                  (item) => [
                    formatDate(item.created_at),
                    getMovementTypeLabel(item.movement_type),
                    item.item_code,
                    item.item_name,
                    item.quantity,
                    item.full_name,
                    item.movement_note
                  ],
                  'hareket_gecmisi'
                ) && success('Hareket listesi indirildi');
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={14} /> Excel
            </button>

            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
              Toplam: {filteredMovements.length}
            </span>
          </div>
        </div>

        <Table
          columns={[
            { header: 'Tarih', accessor: 'created_at', render: (row) => formatDate(row.created_at) },
            {
              header: 'Tip',
              accessor: 'movement_type',
              render: (row) => (
                <Badge variant={getMovementTypeBadge(row.movement_type).replace('badge-', '')}>
                  {getMovementTypeLabel(row.movement_type)}
                </Badge>
              )
            },
            {
              header: 'Ürün',
              accessor: 'item_name',
              cell: (row) => ( // Use cell instead of render if your Table supports it (our common Table checks render then accessor)
                // The common Table.jsx checks `col.render` OR `row[col.accessor]`.
                // To show code AND name:
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{row.item_code}</div>
                  <div style={{ fontSize: '0.85em', color: '#64748b' }}>{row.item_name}</div>
                </div>
              ),
              render: (row) => (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9em' }}>{row.item_code}</div>
                  <div style={{ fontSize: '0.85em', color: '#64748b' }}>{row.item_name}</div>
                </div>
              )
            },
            { header: 'Miktar', accessor: 'quantity', render: (row) => <strong>{row.quantity}</strong> },
            { header: 'Kullanıcı', accessor: 'full_name' },
            { header: 'Not', accessor: 'movement_note', render: (row) => row.movement_note || '-' }
          ]}
          data={filteredMovements}
          emptyMessage="Henüz hareket kaydı yok"
        />
        <div style={{ marginTop: '1rem' }}>
          <Pagination
            currentPage={movPagination.page}
            totalPages={movPagination.totalPages}
            totalItems={movPagination.total}
            itemsPerPage={movPagination.limit}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}
