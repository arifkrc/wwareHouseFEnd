import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useLocations = () => {
  const queryClient = useQueryClient();

  // Query: Fetch Locations
  const { data: locations = [], isLoading: loading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/locations');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutation: Create Location
  const createMutation = useMutation({
    mutationFn: (locationData) => api.post('/locations', locationData),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations']);
    },
  });

  // Mutation: Update Location
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations']);
    },
  });

  // Mutation: Delete Location
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['locations']);
    },
  });

  return {
    locations,
    loading,
    error: error ? (error.message || 'Lokasyonlar yüklenemedi') : null,
    refresh: () => queryClient.invalidateQueries(['locations']), // Manual refresh if needed

    // Wrappers to maintain API compatibility with old hook
    createLocation: async (data) => {
      const res = await createMutation.mutateAsync(data);
      return res.data;
    },
    updateLocation: async (id, data) => {
      const res = await updateMutation.mutateAsync({ id, ...data });
      return res.data;
    },
    deleteLocation: async (id) => {
      await deleteMutation.mutateAsync(id);
    }
  };
};
