/**
 * Movement type helper utilities
 * Provides consistent movement type labels, badges, and icons
 */

export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER'
};

export const getMovementTypeLabel = (type) => {
  switch (type) {
    case MOVEMENT_TYPES.IN:
      return 'Giriş';
    case MOVEMENT_TYPES.OUT:
      return 'Çıkış';
    case MOVEMENT_TYPES.TRANSFER:
      return 'Transfer';
    default:
      return type;
  }
};

export const getMovementTypeBadge = (type) => {
  switch (type) {
    case MOVEMENT_TYPES.IN:
      return 'badge-success';
    case MOVEMENT_TYPES.OUT:
      return 'badge-danger';
    case MOVEMENT_TYPES.TRANSFER:
      return 'badge-info';
    default:
      return '';
  }
};
