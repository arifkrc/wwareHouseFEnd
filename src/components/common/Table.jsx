import React from 'react';
import './Table.css'; // We will create this CSS

export default function Table({
    columns,
    data,
    keyField = 'id',
    isLoading = false,
    emptyMessage = 'Kayıt bulunamadı',
    onRowClick,
    children // Option to pass custom tbody if data prop isn't flexible enough
}) {
    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col, index) => (
                            <th key={index} style={col.style || {}}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-8 text-muted">
                                Yükleniyor...
                            </td>
                        </tr>
                    ) : (data && data.length > 0) ? (
                        data.map((row, rowIndex) => (
                            <tr
                                key={row[keyField] || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                            >
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex}>
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
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
