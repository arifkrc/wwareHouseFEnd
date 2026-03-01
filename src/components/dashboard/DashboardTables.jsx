import React from 'react';
import { Download, Filter, Plane } from 'lucide-react';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Pagination from '../Pagination';
import { formatDate } from '../../utils/dateHelper';
import { getMovementTypeLabel, getMovementTypeBadge } from '../../utils/movementHelpers';

export function LowStockTable({ data, onDownload }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Düşük Stoklu Ürünler</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={Download}
                        onClick={onDownload}
                    >
                        Excel
                    </Button>
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {data.length}
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
                data={data}
                emptyMessage="Düşük stoklu ürün yok"
            />
        </div>
    );
}

export function HighStockTable({ data, onDownload }) {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>En Fazla Stoklu Ürünler</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={Download}
                        onClick={onDownload}
                    >
                        Excel
                    </Button>
                    <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {data.length}
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
                data={data}
                emptyMessage="Henüz ürün yok"
            />
        </div>
    );
}

export function RecentMovementsTable({
    data,
    total,
    filterType,
    onFilterChange,
    onDownload,
    pagination,
    onPageChange
}) {
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3>Son Hareketler</h3>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Filter size={14} style={{ position: 'absolute', left: '8px', zIndex: 1, color: '#64748b' }} />
                        <select
                            className="form-select"
                            style={{ paddingLeft: '28px', minWidth: '130px', height: '36px', fontSize: '0.9rem' }}
                            value={filterType}
                            onChange={(e) => onFilterChange(e.target.value)}
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
                        onClick={onDownload}
                    >
                        Excel
                    </Button>

                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                        Toplam: {data.length}
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
                        render: (row) => (
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {row.item_code}
                                    {row.is_export && <Badge variant="info" style={{ padding: '0 4px', height: '18px' }} title="İhracat"><Plane size={12} /></Badge>}
                                </div>
                                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{row.item_name}</div>
                            </div>
                        )
                    },
                    { header: 'Miktar', accessor: 'quantity', render: (row) => <strong>{row.quantity}</strong> },
                    { header: 'Kullanıcı', accessor: 'full_name' },
                    { header: 'Not', accessor: 'movement_note', render: (row) => row.movement_note || '-' }
                ]}
                data={data}
                emptyMessage="Henüz hareket kaydı yok"
            />
            <div style={{ marginTop: '1rem' }}>
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={onPageChange}
                />
            </div>
        </div>
    );
}
