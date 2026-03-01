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
    closeOnOverlayClick = true
}) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="drawer-overlay" onClick={handleOverlayClick}>
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
