import React from 'react';

/**
 * Button Component
 * @param {string} variant - primary, secondary, outline, danger, success, icon
 * @param {string} size - sm, md, lg
 * @param {boolean} isLoading
 * @param {LucideIcon} icon
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    children,
    className = '',
    disabled,
    ...props
}) {
    let btnClass = 'btn';

    // Variant mapping
    if (variant === 'outline') btnClass += ' btn-outline';
    else if (variant === 'icon') btnClass = 'btn-icon'; // Base replace
    else if (variant === 'danger') btnClass += ' btn-danger';
    else if (variant === 'success') btnClass += ' btn-success';
    else if (variant === 'primary') btnClass += ' btn-primary';

    // Size mapping (if defined in CSS, otherwise default)
    if (size === 'sm') btnClass += ' btn-sm';
    if (size === 'lg') btnClass += ' btn-lg';

    return (
        <button
            className={`${btnClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="spinner-small mr-2" /> // Assumes spinner CSS exists
            ) : Icon ? (
                <Icon size={size === 'sm' ? 14 : 18} style={children ? { marginRight: '6px' } : {}} />
            ) : null}
            {children}
        </button>
    );
}
