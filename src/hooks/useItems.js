import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/items');
      setItems(Array.isArray(response.data) ? response.data : []);
      return response.data;
    } catch (err) {
      setError(err.message || 'Ürünler yüklenemedi');
      console.error('Ürün yükleme hatası:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(async (itemData) => {
    try {
      const response = await api.post('/items', itemData);
      await fetchItems(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Ürün oluşturulamadı');
      throw err;
    }
  }, [fetchItems]);

  const updateItem = useCallback(async (id, itemData) => {
    try {
      const response = await api.put(`/items/${id}`, itemData);
      await fetchItems(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Ürün güncellenemedi');
      throw err;
    }
  }, [fetchItems]);

  const deleteItem = useCallback(async (id) => {
    try {
      await api.delete(`/items/${id}`);
      await fetchItems(); // Refresh list
    } catch (err) {
      setError(err.message || 'Ürün silinemedi');
      throw err;
    }
  }, [fetchItems]);

  const bulkCreateItems = useCallback(async (itemsData) => {
    try {
      const response = await api.post('/bulk/bulk-import', { items: itemsData });
      await fetchItems(); // Refresh list
      return response.data;
    } catch (err) {
      setError(err.message || 'Toplu ürün eklenemedi');
      throw err;
    }
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkCreateItems,
    // bulkAssignLocation removed - use movements/in instead
  };
};
