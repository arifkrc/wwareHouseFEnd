import { useState, useEffect, useCallback } from 'react';
import { useLocations } from './useLocations';
import { useItems } from './useItems';
import { useMovements } from './useMovements';

// Zone configuration - Single source of truth
// Fixed zone names: Streç (left), Koridor (corridor), Karşı Duvar (right)
// Passive zones cannot store items (Streç Makinesi, Kapı, Jeneratör)
const ZONE_CONFIG = {
  'SOL-1': { section: 'left', name: 'Streç Sol', color: '#506d95', passive: false },
  'SOL-2': { section: 'left', name: 'Streç Makinesi', color: '#9ca3af', passive: true },
  'SOL-3': { section: 'left', name: 'Streç Sağ', color: '#506d95', passive: false },
  'SOL-4': { section: 'left', name: 'Kapı', color: '#9ca3af', passive: true },
  'SOL-5': { section: 'left', name: 'Jeneratör Sol', color: '#506d95', passive: false },
  'SOL-6': { section: 'left', name: 'Jeneratör', color: '#9ca3af', passive: true },
  'SOL-7': { section: 'left', name: 'Jeneratör Sağ', color: '#506d95', passive: false },
  'KORIDOR-1': { section: 'corridor', name: 'Koridor 1', color: '#e4ae62', passive: false },
  'KORIDOR-2': { section: 'corridor', name: 'Koridor 2', color: '#e4ae62', passive: false },
  'KORIDOR-3': { section: 'corridor', name: 'Koridor 3', color: '#e4ae62', passive: false },
  'KORIDOR-4': { section: 'corridor', name: 'Koridor 4', color: '#e4ae62', passive: false },
  'KORIDOR-5': { section: 'corridor', name: 'Koridor 5', color: '#e4ae62', passive: false },
  'KORIDOR-6': { section: 'corridor', name: 'Koridor 6', color: '#e4ae62', passive: false },
  'KORIDOR-7': { section: 'corridor', name: 'Koridor 7', color: '#e4ae62', passive: false },
  'SAG-1': { section: 'right', name: 'Streç Karşı Sol', color: '#506d95', passive: false },
  'SAG-2': { section: 'right', name: 'Streç Karşı', color: '#506d95', passive: false },
  'SAG-3': { section: 'right', name: 'Streç Karşı Sağ', color: '#506d95', passive: false },
  'SAG-4': { section: 'right', name: 'Kapı Karşı', color: '#506d95', passive: false },
  'SAG-5': { section: 'right', name: 'Jeneratör Sol Karşı', color: '#506d95', passive: false },
  'SAG-6': { section: 'right', name: 'Jeneratör Karşı', color: '#506d95', passive: false },
  'SAG-7': { section: 'right', name: 'Jeneratör Karşı Sağ', color: '#506d95', passive: false },
};
export const useWarehouseZones = () => {
  const { locations, loading: locationsLoading, createLocation } = useLocations();
  const { items } = useItems();
  const { movements } = useMovements();
  const [zones, setZones] = useState([]);

  const mapLocationsToZones = useCallback(() => {
    const mappedZones = [];

    // Calculate stock per location AND per item from movements
    const stockByLocationAndItem = {}; // { locationId: { itemId: quantity } }

    movements?.forEach(m => {
      const itemId = m.item_id;
      
      if (m.movement_type === 'IN' && m.to_location_id) {
        if (!stockByLocationAndItem[m.to_location_id]) {
          stockByLocationAndItem[m.to_location_id] = {};
        }
        if (!stockByLocationAndItem[m.to_location_id][itemId]) {
          stockByLocationAndItem[m.to_location_id][itemId] = 0;
        }
        stockByLocationAndItem[m.to_location_id][itemId] += m.quantity;
      } else if (m.movement_type === 'OUT' && m.from_location_id) {
        if (!stockByLocationAndItem[m.from_location_id]) {
          stockByLocationAndItem[m.from_location_id] = {};
        }
        if (!stockByLocationAndItem[m.from_location_id][itemId]) {
          stockByLocationAndItem[m.from_location_id][itemId] = 0;
        }
        stockByLocationAndItem[m.from_location_id][itemId] -= m.quantity;
      } else if (m.movement_type === 'TRANSFER') {
        // Decrease from source
        if (m.from_location_id) {
          if (!stockByLocationAndItem[m.from_location_id]) {
            stockByLocationAndItem[m.from_location_id] = {};
          }
          if (!stockByLocationAndItem[m.from_location_id][itemId]) {
            stockByLocationAndItem[m.from_location_id][itemId] = 0;
          }
          stockByLocationAndItem[m.from_location_id][itemId] -= m.quantity;
        }
        // Increase at destination
        if (m.to_location_id) {
          if (!stockByLocationAndItem[m.to_location_id]) {
            stockByLocationAndItem[m.to_location_id] = {};
          }
          if (!stockByLocationAndItem[m.to_location_id][itemId]) {
            stockByLocationAndItem[m.to_location_id][itemId] = 0;
          }
          stockByLocationAndItem[m.to_location_id][itemId] += m.quantity;
        }
      }
    });

    // Now calculate totals per location (only count items with stock > 0)
    const stockByLocation = {};
    const itemsByLocation = {};

    Object.keys(stockByLocationAndItem).forEach(locationId => {
      const items = stockByLocationAndItem[locationId];
      let totalQuantity = 0;
      let itemCount = 0;

      Object.keys(items).forEach(itemId => {
        const quantity = items[itemId];
        if (quantity > 0) {
          totalQuantity += quantity;
          itemCount++;
        }
      });

      stockByLocation[locationId] = totalQuantity;
      itemsByLocation[locationId] = itemCount;
    });

    // Map existing locations to zones
    locations.forEach(loc => {
      const config = ZONE_CONFIG[loc.location_code];
      if (config) {
        const totalQuantity = stockByLocation[loc.id] || 0;
        const itemCount = itemsByLocation[loc.id] || 0;
        
        mappedZones.push({
          id: loc.location_code.toLowerCase(),
          section: config.section,
          name: config.name,
          description: loc.description,
          color: config.color,
          passive: config.passive,
          locationId: loc.id,
          itemCount: itemCount,
          totalQuantity: totalQuantity,
        });
      }
    });

    // Add missing zones (not yet in database)
    Object.keys(ZONE_CONFIG).forEach(code => {
      if (!mappedZones.find(z => z.id === code.toLowerCase())) {
        mappedZones.push({
          id: code.toLowerCase(),
          section: ZONE_CONFIG[code].section,
          name: ZONE_CONFIG[code].name,
          description: '',
          color: ZONE_CONFIG[code].color,
          passive: ZONE_CONFIG[code].passive,
          locationId: null,
          itemCount: 0,
          totalQuantity: 0,
        });
      }
    });

    // Sort by section and zone order (SOL-1, SOL-2, ... KORIDOR-1, ... SAG-1, ...)
    const sortedZones = mappedZones.sort((a, b) => {
      const order = { left: 0, corridor: 1, right: 2 };
      const sectionCompare = order[a.section] - order[b.section];
      if (sectionCompare !== 0) return sectionCompare;
      
      // Within same section, sort by ID to maintain consistent order
      return a.id.localeCompare(b.id);
    });

    setZones(sortedZones);
    return sortedZones;
  }, [locations, movements]);

  // Update zones when locations or items change
  useEffect(() => {
    mapLocationsToZones();
  }, [mapLocationsToZones]);

  const createZoneLocation = useCallback(async (zone) => {
    try {
      const response = await createLocation({
        location_code: zone.id.toUpperCase(),
        description: zone.description || zone.name,
      });
      
      // Zones will be auto-updated via locations hook
      return response;
    } catch (err) {
      console.error('Zone lokasyonu oluşturulamadı:', err);
      throw err;
    }
  }, [createLocation]);

  return {
    zones,
    loading: locationsLoading,
    refresh: mapLocationsToZones,
    createZoneLocation,
  };
};
