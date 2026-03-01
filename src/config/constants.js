// Pagination & Limits
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    UNLIMITED: -1,
    MAX_LIMIT: 10000
};

// Widget Configuration  
export const WIDGETS = {
    TOP_STOCK_COUNT: 5,
    LOW_STOCK_COUNT: 5,
    LOW_STOCK_THRESHOLD: 10
};

// Cache TTL (milliseconds)
export const CACHE_TTL = {
    ITEM_DETAILS: 3600000,     // 1 hour
    LOCATIONS: 3600000,        // 1 hour  
    STOCK_SUMMARY: 60000       // 1 minute
};

// Auto-refresh Intervals
export const REFRESH_INTERVALS = {
    FACTORY_LAYOUT: 30000,     // 30 seconds
    DASHBOARD: 60000           // 1 minute
};

// Stock Thresholds
export const STOCK_THRESHOLDS = {
    LOW_STOCK: 10,
    CRITICAL_STOCK: 5
};

// Warehouse Configuration
export const LOCATIONS = {
    A_ZONES: 14,
    B_ZONES: 14,
    K_ZONES: 14
};
