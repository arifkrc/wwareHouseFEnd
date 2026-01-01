import { useCallback } from 'react';
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

  const refresh = useCallback(() => queryClient.invalidateQueries(['locations']), [queryClient]);

  const createLocation = useCallback(async (data) => {
    const res = await createMutation.mutateAsync(data);
    return res.data;
  }, [createMutation]);

  const updateLocation = useCallback(async (id, data) => {
    const res = await updateMutation.mutateAsync({ id, ...data });
    return res.data;
  }, [updateMutation]);

  const deleteLocation = useCallback(async (id) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  return {
    locations,
    loading,
    error: error ? (error.message || 'Lokasyonlar yüklenemedi') : null,
    refresh,
    createLocation,
    updateLocation,
    deleteLocation
  };
};
