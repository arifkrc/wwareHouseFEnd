import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="pagination-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            padding: '1rem',
            borderTop: '1px solid #e2e8f0'
        }}>
            <div className="pagination-info" style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Topam <strong>{totalItems}</strong> kayıttan <strong>{startItem}-{endItem}</strong> arası gösteriliyor
            </div>

            <div className="pagination-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Simple Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                    .map((p, index, array) => {
                        // Add ellipsis logic if strictly needed, but simple filter is ok for now.
                        // Actually, let's just show relevant ones closer to current
                        return (
                            <button
                                key={p}
                                className={`btn btn-sm ${currentPage === p ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => onPageChange(p)}
                            >
                                {p}
                            </button>
                        );
                    })}

                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
