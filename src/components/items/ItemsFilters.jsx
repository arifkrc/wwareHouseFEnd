import React from 'react';
import { Search, Filter, Download } from 'lucide-react';
import Button from '../common/Button';
import { PRODUCT_TYPES } from '../../utils/productHelpers';

export default function ItemsFilters({
    searchTerm,
    onSearchChange,
    filterType,
    onFilterTypeChange,
    stockSourceFilter,
    onStockSourceChange,
    customerFilter,
    onCustomerFilterChange,
    showZeroStock,
    onShowZeroStockChange,
    uniqueCustomers,
    onExport
}) {
    return (
        <div className="items-controls">
            <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                icon={Download}
                title="Listeyi Excel olarak indir"
            >
                Excel
            </Button>

            <div className="filter-wrapper">
                <Filter size={16} className="filter-icon" />


                <select
                    className="form-select filter-select"
                    value={filterType}
                    onChange={onFilterTypeChange}
                >
                    <option value="ALL">Tüm Türler</option>
                    {Object.entries(PRODUCT_TYPES).filter(([key]) => key !== 'UNKNOWN').map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>

                <select
                    className="form-select filter-select"
                    value={stockSourceFilter}
                    onChange={onStockSourceChange}
                    style={{ marginLeft: '8px' }}
                >
                    <option value="ALL">Tüm Kaynaklar</option>
                    <option value="DOMESTIC">İç Piyasa</option>
                    <option value="EXPORT">Yurtdışı</option>
                </select>

                <select
                    className="form-select filter-select"
                    value={customerFilter}
                    onChange={onCustomerFilterChange}
                    style={{ marginLeft: '8px', maxWidth: '150px' }}
                >
                    <option value="ALL">Tüm Müşteriler</option>
                    {uniqueCustomers.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            <label className="stock-toggle">
                <input
                    type="checkbox"
                    checked={showZeroStock}
                    onChange={onShowZeroStockChange}
                />
                Stoksuzları Göster
            </label>

            <div className="search-wrapper">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Ürün Ara..."
                    className="form-input search-input"
                    value={searchTerm}
                    onChange={onSearchChange}
                />
            </div>
        </div>
    );
}
