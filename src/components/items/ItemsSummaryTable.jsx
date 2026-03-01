import React from 'react';
import { Info, Plane } from 'lucide-react';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ExpandableText from '../ExpandableText';
import { getProductType } from '../../utils/productHelpers';

export default function ItemsSummaryTable({
    items,
    loading,
    onRowClick
}) {
    // Columns for Main Table
    const columns = [
        {
            header: 'Kod',
            accessor: 'item_code',
            cell: (item) => {
                const type = getProductType(item.item_code);
                return (
                    <div className="item-code-wrapper">
                        <strong>{item.item_code}</strong>
                        <span
                            className="item-type-badge"
                            style={{
                                backgroundColor: type.bg,
                                color: type.color
                            }}
                        >
                            {type.label}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Ürün Adı',
            accessor: 'item_name',
            cell: (item) => <ExpandableText text={item.item_name} limit={30} />
        },
        {
            header: 'Toplam Stok',
            accessor: 'quantity',
            cell: (item) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={item.quantity > 0 ? 'success' : 'warning'}>
                        {item.quantity}
                    </Badge>
                    {item.quantity_export > 0 && (
                        <Badge variant="info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }} title={`İhracat: ${item.quantity_export}`}>
                            <Plane size={14} /> {item.quantity_export}
                        </Badge>
                    )}
                </div>
            )
        },
        {
            header: 'Birincil Konum',
            accessor: 'location_code',
            cell: (item) => item.location_code ? <Badge variant="info">{item.location_code}</Badge> : '-'
        },
        {
            header: 'İşlemler',
            cell: (item) => (
                <Button
                    variant="icon"
                    className="btn-primary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onRowClick(item); }}
                    title="Detay & Hareket"
                    icon={Info}
                >
                    Detay
                </Button>
            )
        }
    ];

    return (
        <>
            <div className="items-summary">
                <span style={{ fontWeight: 500 }}>Toplam:</span>
                <span className="summary-pill">
                    {items.length} kayıt
                </span>
            </div>
            <Table
                columns={columns}
                data={items}
                keyField="id"
                isLoading={loading}
                emptyMessage="Ürün bulunamadı"
            />
        </>
    );
}
