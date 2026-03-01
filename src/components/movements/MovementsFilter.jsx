import React from 'react';
import { RefreshCw, Download } from 'lucide-react';
import Button from '../common/Button';

export default function MovementsFilter({
    dateRange,
    setDateRange,
    search,
    setSearch,
    onRefresh,
    onExport,
    loading
}) {
    return (
        <div className="page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
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
                    onClick={onRefresh}
                    disabled={loading}
                    icon={RefreshCw}
                >
                    Yenile
                </Button>
                <Button
                    variant="outline"
                    onClick={onExport}
                    disabled={loading}
                    title="Listeyi Excel olarak indir"
                >
                    Excel İndir
                </Button>
            </div>
        </div>
    );
}
