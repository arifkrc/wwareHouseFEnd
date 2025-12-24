import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Download, Filter } from 'lucide-react';

import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { getMovementTypeLabel, getMovementTypeBadge, MOVEMENT_TYPES } from '../utils/movementHelpers';
import { getProductType, PRODUCT_TYPES } from '../utils/productHelpers';
import { formatDate } from '../utils/dateHelper';
import { useTableExport } from '../hooks/useTableExport';
import { useToast } from '../hooks/useToast';
import './Dashboard.scss';

import Pagination from '../components/Pagination';
import api from '../services/api';
import Table from '../components/common/Table';
import StatsGrid from '../components/dashboard/StatsGrid';

import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

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
    <div className="container dashboard" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
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
          <Button
            variant="primary"
            onClick={handleFilterApply}
            disabled={movementsLoading}
          >
            Filtrele
          </Button>
          {(filters.startDate || filters.endDate || search) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilters({ startDate: '', endDate: '' });
                setSearch('');
                refresh({ limit: 20 });
              }}
            >
              Temizle
            </Button>
          )}
        </div>
      </div>

      <StatsGrid
        stats={stats}
        widgetStats={widgetStats}
        locationCount={locations.length}
        filters={filters}
      />

      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Düşük Stoklu Ürünler</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => {
                  downloadCSV(
                    widgetStats.lowStock,
                    ['Ürün Kodu', 'Ürün Adı', 'Stok'],
                    (item) => [item.item_code, item.item_name, item.quantity],
                    'dusuk_stok'
                  ) && success('Düşük stok listesi indirildi');
                }}
              >
                Excel
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => {
                  downloadCSV(
                    widgetStats.highStock,
                    ['Ürün Kodu', 'Ürün Adı', 'Stok'],
                    (item) => [item.item_code, item.item_name, item.quantity],
                    'yuksek_stok'
                  ) && success('Yüksek stok listesi indirildi');
                }}
              >
                Excel
              </Button>
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

            <Button
              variant="outline"
              size="sm"
              icon={Download}
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
            >
              Excel
            </Button>

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
