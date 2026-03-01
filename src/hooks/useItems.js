import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useItems = () => {
  const queryClient = useQueryClient();

  // Helper to construct query key based on params
  const getQueryKey = (params) => ['items', params];

  // Fetch all items (defaulting to unlimited for now to match UI requirements)
  const { data: responseData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['items', { limit: -1 }],
    queryFn: async () => {
      const response = await api.get('/items?limit=-1');
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });

  const items = responseData?.data || (Array.isArray(responseData) ? responseData : []) || [];
  const pagination = responseData?.pagination || { total: 0, page: 1, limit: -1, totalPages: 1 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (itemData) => api.post('/items', itemData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });



  return {
    items,
    loading,
    error: error ? (error.message || 'Ürünler yüklenemedi') : null,

    // Adapter: `refresh` in old hook accepted params. 
    // New `refresh` will just invalidate/refetch the main list.
    // If components strictly need pagination, we might need to expand this hook later.
    refresh: (params) => {
      return queryClient.invalidateQueries({ queryKey: ['items'] });
    },

    createItem: async (data) => {
      const res = await createMutation.mutateAsync(data);
      return res.data;
    },
    updateItem: async (id, data) => {
      const res = await updateMutation.mutateAsync({ id, ...data });
      return res.data;
    },
    deleteItem: async (id) => {
      await deleteMutation.mutateAsync(id);
    },

    // Bulk Create Helper
    bulkCreateItems: async (itemsData) => {
      const res = await api.post('/items/bulk', itemsData);
      queryClient.invalidateQueries({ queryKey: ['items'] });
      return res.data;
    },

    pagination
  };
};
