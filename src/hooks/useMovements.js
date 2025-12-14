import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/movements');
      setMovements(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Hareketler yüklenemedi');
      console.error('Hareket yükleme hatası:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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
  };
};
