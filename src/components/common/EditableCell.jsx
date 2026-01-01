import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import Button from './Button';

/**
 * A table cell that switches to an input/textarea when clicked.
 * @param {string} value - The initial value to display
 * @param {function} onSave - Async callback (newValue) => Promise<void>
 * @param {boolean} isProcessing - External loading state
 * @param {string} type - 'text' or 'textarea'
 * @param {string} placeholder - Input placeholder
 */
export default function EditableCell({
    value,
    onSave,
    isProcessing = false,
    type = 'text',
    placeholder = 'Düzenle...',
    emptyValue = '-'
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value || '');
    const [localLoading, setLocalLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setCurrentValue(value || '');
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (currentValue === value) {
            setIsEditing(false);
            return;
        }

        setLocalLoading(true);
        try {
            await onSave(currentValue);
            setIsEditing(false);
        } catch (error) {
            console.error('Save failed:', error);
            // Optionally reset value or show error toast handled by parent
        } finally {
            setLocalLoading(false);
        }
    };

    const handleCancel = () => {
        setCurrentValue(value || '');
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="editable-cell-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {type === 'textarea' ? (
                    <textarea
                        ref={inputRef}
                        className="form-input"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing || localLoading}
                        rows={2}
                        style={{ width: '100%', minWidth: '150px', fontSize: '0.9em', padding: '4px' }}
                    />
                ) : (
                    <input
                        ref={inputRef}
                        type="text"
                        className="form-input"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing || localLoading}
                        style={{ width: '100%', minWidth: '120px', fontSize: '0.9em', padding: '4px' }}
                        placeholder={placeholder}
                    />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                        className="btn-icon btn-success btn-xs"
                        onClick={handleSave}
                        disabled={isProcessing || localLoading}
                        title="Kaydet"
                        style={{ padding: '2px' }}
                    >
                        <Check size={14} />
                    </button>
                    <button
                        className="btn-icon btn-danger btn-xs"
                        onClick={handleCancel}
                        disabled={isProcessing || localLoading}
                        title="İptal"
                        style={{ padding: '2px' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="editable-cell-display"
            onClick={() => setIsEditing(true)}
            title="Düzenlemek için tıklayın"
            style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '24px',
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {value || <span className="text-muted" style={{ fontSize: '0.85em', fontStyle: 'italic' }}>{emptyValue}</span>}
            </span>
            <Edit2 size={12} className="text-muted edit-icon" style={{ opacity: 0.5 }} />
        </div>
    );
}
