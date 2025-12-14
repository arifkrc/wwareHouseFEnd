import { useState } from 'react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Onayla', cancelText = 'İptal', type = 'danger' }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <div className={`confirm-icon confirm-icon-${type}`}>
            {type === 'danger' ? '!' : type === 'warning' ? '!' : 'i'}
          </div>
          <h3>{title}</h3>
        </div>
        
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        
        <div className="confirm-footer">
          <button 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm} 
            className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`}
            disabled={isProcessing}
          >
            {isProcessing ? 'İşleniyor...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
