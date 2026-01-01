import { useCallback } from 'react';

/**
 * Hook to handle CSV export functionality
 * @returns {Object} { downloadCSV }
 */
export const useTableExport = () => {
    /**
     * Converts data to CSV and triggers download
     * @param {Array} data - Array of objects to export
     * @param {Array<string>} headers - Array of CSV column headers
     * @param {Function} rowMapper - Function that takes an item and returns an array of string values (matching headers)
     * @param {string} filename - Name of the file to download (without extension)
     */
    const downloadCSV = useCallback((data, headers, rowMapper, filename) => {
        if (!data || data.length === 0) {
            console.warn('No data to export');
            return false;
        }

        try {
            // Map data to CSV rows
            const rows = data.map(item => {
                const values = rowMapper(item);
                // Escape quotes and commas in values
                return values.map(val => {
                    if (val === null || val === undefined) return '';
                    const str = String(val);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(';');
            });

            // Combine headers and rows
            const csvContent = [headers.join(';'), ...rows].join('\n');

            // Create download link with BOM for Excel UTF-8 support
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().slice(0, 10);
            const fullFilename = `${filename}_${timestamp}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', fullFilename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return true;
        } catch (error) {
            console.error('Export failed:', error);
            return false;
        }
    }, []);

    return { downloadCSV };
};
