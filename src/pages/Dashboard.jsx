import { useState, useEffect, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

import { useLocations } from '../hooks/useLocations';
import { useMovements } from '../hooks/useMovements';
import { getProductType, PRODUCT_TYPES } from '../utils/productHelpers';
import { useTableExport } from '../hooks/useTableExport';
import { useToast } from '../hooks/useToast';
import './Dashboard.scss';

import api from '../services/api';
import StatsGrid from '../components/dashboard/StatsGrid';
import DashboardFilter from '../components/dashboard/DashboardFilter';
import { LowStockTable, HighStockTable, RecentMovementsTable } from '../components/dashboard/DashboardTables';

export default function Dashboard() {

  // We will NOT use useItems for dashboard widgets anymore.

  const { locations, loading: locationsLoading } = useLocations();
  const { movements, loading: movementsLoading, getMovementStats, refresh, pagination: movPagination } = useMovements();

  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    totalTransfer: 0,
    total_patlatma: 0,
    total_sevk: 0,
    totalPatlatmaQuantity: 0,
    totalSevkQuantity: 0
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

  const handleFilterClear = () => {
    setFilters({ startDate: '', endDate: '' });
    setSearch('');
    refresh({ limit: 20 });
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
        <h1><BarChart3 size={28} strokeWidth={2} /> Dashboard</h1>
        <p>Depo takip sistemi genel görünümü</p>
      </div>

      <DashboardFilter
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        loading={movementsLoading}
      />

      <StatsGrid
        stats={stats}
        widgetStats={widgetStats}
        locationCount={locations.length}
        filters={filters}
      />

      <div className="dashboard-grid">
        <LowStockTable
          data={widgetStats.lowStock}
          onDownload={() => {
            downloadCSV(
              widgetStats.lowStock,
              ['Ürün Kodu', 'Ürün Adı', 'Stok'],
              (item) => [item.item_code, item.item_name, item.quantity],
              'dusuk_stok'
            ) && success('Düşük stok listesi indirildi');
          }}
        />

        <HighStockTable
          data={widgetStats.highStock}
          onDownload={() => {
            downloadCSV(
              widgetStats.highStock,
              ['Ürün Kodu', 'Ürün Adı', 'Stok'],
              (item) => [item.item_code, item.item_name, item.quantity],
              'yuksek_stok'
            ) && success('Yüksek stok listesi indirildi');
          }}
        />
      </div>

      <RecentMovementsTable
        data={filteredMovements}
        total={movPagination.total}
        filterType={movementFilterType}
        onFilterChange={setMovementFilterType}
        onDownload={() => {
          downloadCSV(
            filteredMovements,
            ['Tarih', 'Tip', 'Ürün Kodu', 'Ürün Adı', 'Miktar', 'Kullanıcı', 'Not'],
            (item) => [
              formatDate(item.created_at),
              item.movement_type, // Label logic handled in component usually, but here CSV needs raw string or helper. Using raw first.
              item.item_code,
              item.item_name,
              item.quantity,
              item.full_name,
              item.movement_note
            ],
            'hareket_gecmisi'
          ) && success('Hareket listesi indirildi');
        }}
        pagination={movPagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
