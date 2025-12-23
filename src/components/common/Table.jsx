import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, Filter, Search, X } from 'lucide-react';
import './Table.css';

export default function Table({
    columns,
    data,
    keyField = 'id',
    isLoading = false,
    emptyMessage = 'Kayıt bulunamadı',
    onRowClick,
    children
}) {
    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Filter State
    const [activeFilterColumn, setActiveFilterColumn] = useState(null);
    const [filters, setFilters] = useState({}); // { accessor: Set(selectedValues) }
    const [filterSearch, setFilterSearch] = useState('');

    const filterRef = useRef(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setActiveFilterColumn(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Helper to access nested properties safely
    const getValue = (item, accessor) => {
        if (!accessor) return null;
        if (typeof accessor !== 'string') return item[accessor];
        return accessor.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : null, item);
    };

    // 1. Extract Unique Values for Filtering
    const getUniqueValues = (accessor) => {
        if (!data) return [];
        const values = new Set();
        data.forEach(item => {
            const val = getValue(item, accessor);
            if (val !== null && val !== undefined && val !== '') {
                values.add(String(val));
            }
        });
        return Array.from(values).sort();
    };

    // 2. Process Data (Filter -> Sort)
    const processedData = useMemo(() => {
        if (!data) return [];
        let processed = [...data];

        // Apply Filters
        Object.keys(filters).forEach(key => {
            const selectedValues = filters[key];
            if (selectedValues && selectedValues.size > 0) {
                processed = processed.filter(item => {
                    const val = String(getValue(item, key) || '');
                    return selectedValues.has(val);
                });
            }
        });

        // Apply Sorting
        if (sortConfig.key) {
            processed.sort((a, b) => {
                const valA = getValue(a, sortConfig.key);
                const valB = getValue(b, sortConfig.key);

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return processed;
    }, [data, filters, sortConfig]);

    // Handlers
    const handleSort = (accessor) => {
        if (!accessor) return;
        setSortConfig(current => ({
            key: accessor,
            direction: current.key === accessor && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleFilterDropdown = (e, accessor) => {
        e.stopPropagation(); // Prevent sort trigger
        if (activeFilterColumn === accessor) {
            setActiveFilterColumn(null);
        } else {
            setActiveFilterColumn(accessor);
            setFilterSearch('');
        }
    };

    const applyFilter = (accessor, selectedSet) => {
        setFilters(prev => ({
            ...prev,
            [accessor]: selectedSet
        }));
        setActiveFilterColumn(null);
    };

    // Render Filter Dropdown
    const renderFilterDropdown = (column) => {
        const uniqueValues = getUniqueValues(column.accessor);
        const filteredValues = uniqueValues.filter(v =>
            v.toLowerCase().includes(filterSearch.toLowerCase())
        );

        return (
            <FilterDropdown
                values={uniqueValues}
                initialSelection={filters[column.accessor]}
                onApply={(selected) => applyFilter(column.accessor, selected)}
                onClose={() => setActiveFilterColumn(null)}
            />
        );
    };

    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col, index) => {
                            const isSorted = sortConfig.key === col.accessor;
                            const isFiltered = filters[col.accessor] && filters[col.accessor].size < getUniqueValues(col.accessor).length;

                            return (
                                <th key={index} style={col.style || {}}>
                                    <div className="th-content">
                                        <div
                                            className="th-text"
                                            onClick={() => col.accessor && handleSort(col.accessor)}
                                        >
                                            {col.header}
                                            {isSorted && (
                                                sortConfig.direction === 'asc' ?
                                                    <ArrowUp size={14} /> :
                                                    <ArrowDown size={14} />
                                            )}
                                        </div>

                                        {col.accessor && (
                                            <div
                                                className={`filter-icon-wrapper ${activeFilterColumn === col.accessor || isFiltered ? 'active' : ''}`}
                                                onClick={(e) => toggleFilterDropdown(e, col.accessor)}
                                            >
                                                <Filter size={14} fill={isFiltered ? "currentColor" : "none"} />
                                            </div>
                                        )}
                                    </div>

                                    {activeFilterColumn === col.accessor && (
                                        <div ref={filterRef}>
                                            {renderFilterDropdown(col)}
                                        </div>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-8 text-muted">
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                            </td>
                        </tr>
                    ) : (processedData && processedData.length > 0) ? (
                        processedData.map((row, rowIndex) => (
                            <tr
                                key={row[keyField] || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                            >
                                {columns.map((col, colIndex) => {
                                    const renderCell = col.render || col.cell;
                                    const value = renderCell ? renderCell(row) : getValue(row, col.accessor);

                                    // Safety check for objects
                                    const safeValue = (typeof value === 'object' && value !== null && !React.isValidElement(value))
                                        ? JSON.stringify(value)
                                        : value;

                                    return (
                                        <td key={colIndex}>
                                            {safeValue}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    ) : children ? (
                        children
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-8 text-muted">
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// Sub-component for Filter Logic to isolate temp state
function FilterDropdown({ values, initialSelection, onApply, onClose }) {
    const [selected, setSelected] = useState(() => {
        return initialSelection ? new Set(initialSelection) : new Set(values);
    });
    const [searchTerm, setSearchTerm] = useState('');

    const filteredValues = values.filter(v =>
        v.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleValue = (val) => {
        const newSet = new Set(selected);
        if (newSet.has(val)) {
            newSet.delete(val);
        } else {
            newSet.add(val);
        }
        setSelected(newSet);
    };

    const toggleSelectAll = () => {
        if (selected.size === filteredValues.length && filteredValues.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(values));
        }
    };

    const handleApply = () => {
        if (selected.size === values.length) {
            onApply(undefined); // Remove filter
        } else {
            onApply(selected);
        }
    };

    return (
        <div className="filter-dropdown" onClick={e => e.stopPropagation()}>
            <div className="filter-header">
                <input
                    type="text"
                    placeholder="Ara..."
                    className="filter-search"
                    autoFocus
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="filter-body">
                <div className="filter-item" onClick={toggleSelectAll} style={{ fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                    <input
                        type="checkbox"
                        checked={selected.size > 0 && filteredValues.every(v => selected.has(v))}
                        readOnly
                    />
                    <span>(Tümünü Seç)</span>
                </div>
                {filteredValues.map(val => (
                    <div key={val} className="filter-item" onClick={() => toggleValue(val)}>
                        <input
                            type="checkbox"
                            checked={selected.has(val)}
                            readOnly
                        />
                        <span>{val}</span>
                    </div>
                ))}
                {filteredValues.length === 0 && (
                    <div style={{ padding: '8px', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>Sonuç yok</div>
                )}
            </div>
            <div className="filter-footer">
                <button className="filter-btn clear" onClick={() => onApply(undefined)}>Temizle</button>
                <button className="filter-btn apply" onClick={handleApply}>Uygula</button>
            </div>
        </div>
    );
}
