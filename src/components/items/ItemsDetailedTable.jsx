import React from 'react';
import Table from '../common/Table';
import Badge from '../common/Badge';

export default function ItemsDetailedTable({
    allocations,
    loading,
    totalCount
}) {
    const columns = [
        {
            accessor: 'item_code',
            header: 'Ürün Kodu',
            sortable: true
        },
        {
            accessor: 'item_name',
            header: 'Ürün Adı',
            sortable: true
        },
        {
            accessor: 'location_code',
            header: 'Alan',
            sortable: true
        },
        {
            accessor: 'customer_code',
            header: 'Müşteri',
            sortable: true,
            render: (row) => row.customer_code || '-'
        },
        {
            accessor: 'is_export',
            header: 'İhracat',
            sortable: true,
            render: (row) => (
                <Badge variant={row.is_export ? 'info' : 'secondary'}>
                    {row.is_export ? 'İhracat' : 'Yurtiçi'}
                </Badge>
            )
        },
        {
            accessor: 'quantity',
            header: 'Miktar',
            sortable: true,
            render: (row) => (
                <Badge variant="primary">{row.quantity}</Badge>
            )
        }
    ];

    return (
        <>
            <div className="items-summary" style={{ marginBottom: '1rem' }}>
                <span style={{ fontWeight: 500 }}>Toplam Kayıt:</span>
                <span className="summary-pill">
                    {allocations.length} allocation
                </span>
                {totalCount !== undefined && allocations.length !== totalCount && (
                    <span className="summary-filtered">(Filtrelendi)</span>
                )}
            </div>
            <Table
                columns={columns}
                data={allocations}
                keyField="item_id"
                isLoading={loading}
                emptyMessage="Detaylı stok bilgisi bulunamadı"
            />
        </>
    );
}
