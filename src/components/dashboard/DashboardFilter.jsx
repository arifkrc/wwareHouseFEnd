import React from 'react';
import Button from '../common/Button';

export default function DashboardFilter({
    search,
    setSearch,
    filters,
    setFilters,
    onApply,
    onClear,
    loading
}) {
    return (
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
                    onClick={onApply}
                    disabled={loading}
                >
                    Filtrele
                </Button>
                {(filters.startDate || filters.endDate || search) && (
                    <Button
                        variant="outline"
                        onClick={onClear}
                    >
                        Temizle
                    </Button>
                )}
            </div>
        </div>
    );
}
