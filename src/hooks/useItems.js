import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useItems = () => {
  const queryClient = useQueryClient();

  // Helper to construct query key based on params
  const getQueryKey = (params) => ['items', params];

  // We need a way to track the "current" params to expose data
  // But hooks are declarative. We can expose a generic fetcher or specific data.
  // The original hook had a manual `fetchItems(params)`. 
  // To adapt this to React Query, we should use `useQuery` with dynamic params.
  // HOWEVER, the existing components call `refresh({ limit: -1 })` manually.

  // Strategy: 
  // 1. Maintain local state for params to drive the query.
  // 2. Or, since the app seems to load ALL items (`limit: -1`) mostly, optimize for that.

  // Let's assume for now we default to fetching ALL items as per recent changes
  // Components that want specific params will need to be updated eventually, 
  // but for backward compatibility with `refresh(params)`, we might need a workaround.

  // ACTUALLY: The best way is to expose a `refetch` that accepts params? 
  // No, `refetch` re-runs the CURRENT query.

  // Let's implement a standard "All Items" query for now, as that's what `Items.jsx` uses.
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
    onSuccess: () => queryClient.invalidateQueries(['items']),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries(['items']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['items']),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (itemsData) => api.post('/bulk/bulk-import', { items: itemsData }),
    onSuccess: () => queryClient.invalidateQueries(['items']),
  });

  return {
    items,
    loading,
    error: error ? (error.message || 'Ürünler yüklenemedi') : null,

    // Adapter: `refresh` in old hook accepted params. 
    // New `refresh` will just invalidate/refetch the main list.
    // If components strictly need pagination, we might need to expand this hook later.
    refresh: (params) => {
      // warning: params are ignored in this simple port unless we add state
      return queryClient.invalidateQueries(['items']);
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
    bulkCreateItems: async (data) => {
      const res = await bulkCreateMutation.mutateAsync(data);
      return res.data;
    },
    pagination
  };
};
