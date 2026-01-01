import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useMovements = () => {
  const queryClient = useQueryClient();
  const [params, setParams] = useState({ limit: 20, page: 1 });

  // Query: Fetch Movements with dynamic params
  const { data: responseData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['movements', params],
    queryFn: async () => {
      // Build query string from params object
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/movements?${queryString}`);
      return response.data;
    },
    keepPreviousData: true, // Prevents loading spinner flickering on page change (v4)
    staleTime: 1000 * 30, // 30 seconds
  });

  const movements = responseData?.data || (Array.isArray(responseData) ? responseData : []) || [];
  const pagination = responseData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Helper to get stats - Stable reference
  const getMovementStats = useCallback(async (statsParams = {}) => {
    try {
      const queryString = new URLSearchParams(statsParams).toString();
      const response = await api.get(`/movements/stats/summary?${queryString}`);
      return {
        totalIn: parseInt(response.data.total_in || 0),
        totalOut: parseInt(response.data.total_out || 0),
        totalTransfer: parseInt(response.data.total_transfer || 0),
        totalInQuantity: parseInt(response.data.total_in_quantity || 0),
        totalOutQuantity: parseInt(response.data.total_out_quantity || 0)
      };
    } catch (err) {
      console.error('İstatistikler yüklenemedi:', err);
      return { totalIn: 0, totalOut: 0, totalTransfer: 0 };
    }
  }, []);

  // Stable refresh function that updates params or invalidates
  const refresh = useCallback((newParams) => {
    if (newParams) {
      setParams(prev => {
        // Only update if params actually changed to avoid unnecessary renders
        const updated = { ...prev, ...newParams };
        if (JSON.stringify(prev) === JSON.stringify(updated)) return prev;
        return updated;
      });
    } else {
      queryClient.invalidateQueries(['movements']);
    }
  }, [queryClient]);

  // OPTIMISTIC UPDATE: Create Movement
  const createMovementMutation = useMutation({
    mutationFn: async ({ type, data }) => {
      const endpoint = `/movements/${type.toLowerCase()}`;
      const response = await api.post(endpoint, data);
      return response.data;
    },
    onMutate: async ({ type, data }) => {
      // 1. Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['items'] });
      await queryClient.cancelQueries({ queryKey: ['movements'] });

      // 2. Snapshot previous state
      const previousItems = queryClient.getQueryData(['items', { limit: -1 }]);

      // 3. Optimistically update 'items' cache
      if (previousItems) {
        queryClient.setQueryData(['items', { limit: -1 }], (old) => {
          if (!old) return old;
          const newData = { ...old };
          const itemList = newData.data ? [...newData.data] : (Array.isArray(newData) ? [...newData] : []);

          const targetItemIndex = itemList.findIndex(i => i.id === data.item_id);
          if (targetItemIndex > -1) {
            const item = { ...itemList[targetItemIndex] };
            const qty = parseInt(data.quantity);

            if (type === 'IN') {
              item.quantity = (item.quantity || 0) + qty;
            } else if (type === 'OUT') {
              item.quantity = (item.quantity || 0) - qty;
            }
            itemList[targetItemIndex] = item;
          }

          if (newData.data) newData.data = itemList;
          else return itemList;
          return newData;
        });
      }
      return { previousItems };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['items', { limit: -1 }], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      // Also invalidate filtered locations if needed
    },
  });

  // Mutation: Update Movement Note
  const updateMovementMutation = useMutation({
    mutationFn: async ({ id, note }) => {
      const response = await api.put(`/movements/${id}`, { movement_note: note });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['movements']);
    }
  });

  // Wrapper to match old signature
  const createMovement = useCallback(async (type, data) => {
    const res = await createMovementMutation.mutateAsync({ type, data });
    return res;
  }, [createMovementMutation]);

  const updateMovement = useCallback(async (id, note) => {
    const res = await updateMovementMutation.mutateAsync({ id, note });
    return res;
  }, [updateMovementMutation]);

  return {
    movements,
    loading,
    error: error ? (error.message || 'Hareketler yüklenemedi') : null,
    refresh,
    createMovement,
    updateMovement,
    getMovementStats,
    pagination
  };
};
