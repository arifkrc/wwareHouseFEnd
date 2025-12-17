export const PRODUCT_TYPES = {
    DISK: { label: 'Disk', color: '#3b82f6', bg: '#dbeafe' },      // Blue
    KAMPANA: { label: 'Kampana', color: '#d97706', bg: '#fef3c7' }, // Orange
    POYRA: { label: 'Poyra', color: '#059669', bg: '#d1fae5' },     // Green
    UNKNOWN: { label: 'Diğer', color: '#64748b', bg: '#f1f5f9' }    // Gray
};

/**
 * Determines product type based on the 3rd character of the item code.
 * Rule:
 * 1 -> Disk
 * 2 -> Kampana
 * 4 -> Poyra
 * Other -> Unknown
 * @param {string} itemCode 
 * @returns {Object} Product type configuration { label, color, bg }
 */
export const getProductType = (itemCode) => {
    if (!itemCode || itemCode.length < 3) return PRODUCT_TYPES.UNKNOWN;

    const typeChar = itemCode.charAt(2); // 0-indexed, so 2 is the 3rd char

    switch (typeChar) {
        case '1': return PRODUCT_TYPES.DISK;
        case '2': return PRODUCT_TYPES.KAMPANA;
        case '4': return PRODUCT_TYPES.POYRA;
        default: return PRODUCT_TYPES.UNKNOWN;
    }
};
