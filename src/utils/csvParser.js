export const parseCSV = (text, options = {}) => {
    const {
        skipHeader = true,
        delimiter = ',',
        columnMap = null // optional map of CSV headers to object keys
    } = options;

    const lines = text.trim().split('\n');
    const parsedItems = [];
    const errors = [];

    lines.forEach((line, index) => {
        if (skipHeader && index === 0) return;
        if (!line.trim()) return;

        const cols = line.split(delimiter).map(s => s.trim());

        // Default format expected: item_code, item_name, quantity, description, location_code(optional)
        const [item_code, item_name, quantity, description, location_code] = cols;

        if (!item_code || !item_name) {
            errors.push(`Satır ${index + 1}: Ürün kodu ve adı zorunludur`);
            return;
        }

        const qty = parseInt(quantity);
        if (!isNaN(qty) && qty < 0) {
            errors.push(`Satır ${index + 1}: Geçersiz miktar`);
            return;
        }

        parsedItems.push({
            item_code: item_code.slice(0, 100),
            item_name: item_name.slice(0, 255),
            quantity: isNaN(qty) ? 0 : Math.min(qty, 1000000),
            description: (description || '').slice(0, 1000),
            location_code: location_code || null
        });
    });

    return { parsedItems, errors };
};
