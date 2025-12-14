import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/locations');
      setLocations(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Lokasyonlar yüklenemedi');
      console.error('Lokasyon yükleme hatası:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = useCallback(async (locationData) => {
    try {
      const response = await api.post('/locations', locationData);
      await fetchLocations(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Lokasyon oluşturulamadı');
      throw err;
    }
  }, [fetchLocations]);

  const updateLocation = useCallback(async (id, locationData) => {
    try {
      const response = await api.put(`/locations/${id}`, locationData);
      await fetchLocations(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Lokasyon güncellenemedi');
      throw err;
    }
  }, [fetchLocations]);

  const deleteLocation = useCallback(async (id) => {
    try {
      await api.delete(`/locations/${id}`);
      await fetchLocations(); // Refresh list
    } catch (err) {
      setError(err.message || 'Lokasyon silinemedi');
      throw err;
    }
  }, [fetchLocations]);

  return {
    locations,
    loading,
    error,
    refresh: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
};
