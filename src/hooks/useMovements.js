import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const fetchMovements = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Build query string
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/movements?${queryString}`);

      // Handle both new paginated response and old array response (for safety)
      if (response.data.pagination) {
        setMovements(Array.isArray(response.data.data) ? response.data.data : []);
        setPagination(response.data.pagination);
      } else {
        setMovements(Array.isArray(response.data) ? response.data : []);
      }
      return response.data;
    } catch (err) {
      setError(err.message || 'Hareketler yüklenemedi');
      console.error('Hareket yükleme hatası:', err);
      // setMovements([]); // Don't clear on error, keep stale data? No, clear it.
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch with defaults
  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const createMovement = useCallback(async (movementType, movementData) => {
    try {
      const endpoint = `/movements/${movementType.toLowerCase()}`;
      const response = await api.post(endpoint, movementData);
      await fetchMovements(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Hareket kaydedilemedi');
      throw err;
    }
  }, [fetchMovements]);

  const getMovementStats = useCallback(async () => {
    try {
      const response = await api.get('/movements/stats/summary');
      return {
        totalIn: parseInt(response.data.total_in || 0),
        totalOut: parseInt(response.data.total_out || 0),
        totalTransfer: parseInt(response.data.total_transfer || 0)
      };
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err);
      return { totalIn: 0, totalOut: 0, totalTransfer: 0 };
    }
  }, []);

  return {
    movements,
    loading,
    error,
    refresh: fetchMovements,
    createMovement,
    getMovementStats,
    pagination,
  };
};
