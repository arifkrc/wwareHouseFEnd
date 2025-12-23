import React from 'react';

/**
 * Badge Component
 * @param {string} variant - success, warning, danger, info, primary
 * @param {ReactNode} children
 */
export default function Badge({ variant = 'primary', children, style = {} }) {
    const getVariantClass = () => {
        switch (variant) {
            case 'success': return 'badge-success';
            case 'warning': return 'badge-warning';
            case 'danger': return 'badge-danger';
            case 'info': return 'badge-info';
            case 'primary': return 'badge-primary'; // Adjust based on your CSS
            default: return 'badge-info';
        }
    };

    return (
        <span className={`badge ${getVariantClass()}`} style={style}>
            {children}
        </span>
    );
}
