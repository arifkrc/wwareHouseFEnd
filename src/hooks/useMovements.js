import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useMovements = () => {
  const queryClient = useQueryClient();

  // Query: Fetch Movements (Standard)
  // Logic simplified to default to recent movements or allow filtered fetching
  const { data: responseData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['movements', { limit: 20 }], // Default key
    queryFn: async () => {
      const response = await api.get('/movements?limit=20');
      return response.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const movements = responseData?.data || (Array.isArray(responseData) ? responseData : []) || [];
  const pagination = responseData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Helper to get stats
  const getMovementStats = async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
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
  };

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

          // This is complex logic to replicate backend behavior in frontend.
          // Simplified: Just update the `quantity` of the target item.
          // A full implementation would need to update `stock_distribution` too, 
          // which is risky to duplicate.
          // For MVP "Modern Feel", updating the main total quantity is usually enough.

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
            // Transfer doesn't change total quantity, so no update needed for main list

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
      // Rollback
      if (context?.previousItems) {
        queryClient.setQueryData(['items', { limit: -1 }], context.previousItems);
      }
    },
    onSettled: () => {
      // Always refetch to ensure truth
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] }); // Locations item_count might change
    },
  });

  return {
    movements,
    loading,
    error: error ? (error.message || 'Hareketler yüklenemedi') : null,
    refresh: (params) => {
      // If params provided, we might need a custom fetch or just invalidate.
      // For now, invalidate. 
      return queryClient.invalidateQueries(['movements']);
    },

    // Wrapper to match old signature
    createMovement: async (type, data) => {
      const res = await createMovementMutation.mutateAsync({ type, data });
      return res;
    },

    getMovementStats,
    pagination
  };
};
