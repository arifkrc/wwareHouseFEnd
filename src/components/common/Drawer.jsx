import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Drawer.scss';

export default function Drawer({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md', // 'sm', 'md', 'lg', 'xl' (Widths on desktop)
    closeOnOverlayClick = true,
    elevated = false // Set true when rendered on top of another drawer
}) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
        // NOTE: body.overflow is managed centrally by FactoryLayout/parent pages
        // to prevent conflicts when multiple drawers are stacked
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className={`drawer-overlay${elevated ? ' elevated' : ''}`}
            onClick={handleOverlayClick}
        >
            <div className={`drawer drawer-${size} ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <h3 className="drawer-title">{title}</h3>
                    <button className="drawer-close" onClick={onClose} title="Kapat">
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer-body">
                    {children}
                </div>

                {footer && (
                    <div className="drawer-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
