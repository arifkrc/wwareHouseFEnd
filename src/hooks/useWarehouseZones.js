import { useState, useEffect, useCallback } from 'react';
import { useLocations } from './useLocations';
import { useMovements } from './useMovements';

// Zone configuration - Single source of truth
// Fixed zone names: Streç (left), Koridor (corridor), Karşı Duvar (right)
// Passive zones cannot store items (Streç Makinesi, Kapı, Jeneratör)
// Zone configuration - Dynamic generation for 3x14 grid
import { LOCATIONS } from '../config/constants';

// Zone configuration - Dynamic generation based on constants
const generateZoneConfig = () => {
  const config = {};

  // Left Side (A Zones)
  for (let i = 1; i <= LOCATIONS.A_ZONES; i++) {
    const code = `A${i}`;
    let name = code;
    let passive = false;
    let color = '#506d95'; // Blue-ish

    // Special cases for Left (Keep hardcoded or move to config if needed, usually static features)
    if (i === 6) { name = 'Kapı (A6)'; passive = true; color = '#9ca3af'; }
    if (i === 9) { name = 'Jeneratör (A9)'; passive = true; color = '#9ca3af'; }
    if (i === 10) { name = 'Jeneratör (A10)'; passive = true; color = '#9ca3af'; }

    config[code] = { section: 'left', name, color, passive };
  }

  // Corridor (K Zones)
  for (let i = 1; i <= LOCATIONS.K_ZONES; i++) {
    const code = `K${i}`;
    config[code] = { section: 'corridor', name: code, color: '#e4ae62', passive: false };
  }

  // Right Side (B Zones)
  for (let i = 1; i <= LOCATIONS.B_ZONES; i++) {
    // B1 is now PAKETLEME
    if (i === 1) {
      const code = 'PAKETLEME';
      config[code] = {
        section: 'right',
        name: 'Paketleme',
        color: '#506d95',
        passive: false
      };
      continue;
    }

    const code = `B${i}`;
    let name = code;
    let passive = false;
    let color = '#506d95';

    // Special cases for Right
    if (i === 14) { name = 'Arızalı Makine (B14)'; passive = true; color = '#ef4444'; }

    config[code] = { section: 'right', name, color, passive };
  }

  return config;
};

const ZONE_CONFIG = generateZoneConfig();
export const useWarehouseZones = () => {
  const { locations, loading: locationsLoading, createLocation, updateLocation, refresh: refreshLocations } = useLocations();
  const { refresh: refreshMovements } = useMovements();
  const [zones, setZones] = useState([]);

  const mapLocationsToZones = useCallback(() => {
    const mappedZones = [];

    // OPTIMIZATION: Removed client-side stock calculation. 
    // We now rely on the backend 'locations' endpoint to provide 'item_count' and 'total_quantity'.
    // This removes the need to iterate through thousands of movement records on the frontend.

    // Map existing locations to zones
    // Use the item_count and total_quantity ALREADY returned by the backend (if available)
    // Fallback to 0 if not present (requires backend update to return these fields usually, 
    // but the current locations endpoint DOES calculate them in JS, so likely they exist in 'locations' prop)
    locations.forEach(loc => {
      const config = ZONE_CONFIG[loc.location_code];
      if (config) {
        // Optimization: Use values from backend if they exist, otherwise 0.
        const totalQuantity = loc.total_quantity || 0;
        const itemCount = loc.item_count || 0;

        mappedZones.push({
          id: loc.location_code.toLowerCase(),
          section: config.section,
          name: loc.description || config.name,
          originalName: config.name,
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
          originalName: ZONE_CONFIG[code].name,
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
      // Within same section, sort by numeric ID if possible
      // Extract number from code (A1 -> 1, K12 -> 12)
      const numA = parseInt(a.id.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.id.match(/\d+/)?.[0] || '0');

      return numA - numB;
    });

    setZones(sortedZones);
    return sortedZones;
  }, [locations]);

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

  const renameZone = useCallback(async (zone, newName) => {
    const trimmed = newName.trim();

    if (!zone.locationId) {
      // Zone not yet in DB – create it with the new name as description
      if (!trimmed) return;
      await createLocation({
        location_code: zone.id.toUpperCase(),
        description: trimmed,
      });
      return;
    }

    // Update existing location description by numeric DB id
    await updateLocation(zone.locationId, { description: trimmed });
  }, [createLocation, updateLocation]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshMovements(),
      refreshLocations()
    ]);
  }, [refreshMovements, refreshLocations]);

  return {
    zones,
    loading: locationsLoading,
    refresh: refreshAll,
    createZoneLocation,
    renameZone,
  };
};
