import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

/**
 * Custom hook for optimistic updates with React Query
 * Updates the UI immediately before the API call completes
 * Rolls back on error
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.queryKey - The query key to update (e.g., ['lab-master'])
 * @param {string} options.updateEndpoint - API endpoint for updates (e.g., '/lab-master/:id')
 * @param {string} options.successMessage - Message to show on success
 * @param {Function} options.onSuccess - Callback after successful update
 */
export const useOptimisticUpdate = ({
  queryKey,
  updateEndpoint,
  successMessage = 'Update successful',
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`${updateEndpoint}/${id}`, data);
      return response.data;
    },

    // Optimistically update the cache before the mutation
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        
        // Handle array data (list of records)
        if (Array.isArray(old)) {
          return old.map((item) =>
            item.id === id || item.Id === id ? { ...item, ...data } : item
          );
        }
        
        // Handle object data (single record)
        if (old.id === id || old.Id === id) {
          return { ...old, ...data };
        }
        
        return old;
      });

      // Return a context object with the snapshotted value
      return { previousData };
    },

    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      // Roll back to the previous value
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      // Show error message
      const errorMsg = err.response?.data?.error || 'Update failed';
      toast.error(errorMsg);
    },

    // Always refetch after error or success to ensure cache is in sync with server
    onSettled: (data, error, variables, context) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey });
      
      // Call success callback if provided and no error
      if (!error && onSuccess) {
        onSuccess(data);
      }
    },

    onSuccess: () => {
      toast.success(successMessage);
    },
  });
};

/**
 * Custom hook for optimistic creation with React Query
 * Adds new item to the list immediately before API call completes
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.queryKey - The query key to update
 * @param {string} options.createEndpoint - API endpoint for creation
 * @param {string} options.successMessage - Message to show on success
 * @param {Function} options.onSuccess - Callback after successful creation
 */
export const useOptimisticCreate = ({
  queryKey,
  createEndpoint,
  successMessage = 'Created successfully',
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post(createEndpoint, data);
      return response.data;
    },

    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically add the new item with a temporary ID
      queryClient.setQueryData(queryKey, (old) => {
        if (!old || !Array.isArray(old)) return old;
        
        const optimisticItem = {
          ...newData,
          id: `temp-${Date.now()}`,
          isOptimistic: true, // Flag to identify optimistic items
        };
        
        return [optimisticItem, ...old];
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      const errorMsg = err.response?.data?.error || 'Creation failed';
      toast.error(errorMsg);
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey });
      
      if (!error && onSuccess) {
        onSuccess(data);
      }
    },

    onSuccess: () => {
      toast.success(successMessage);
    },
  });
};

/**
 * Custom hook for optimistic deletion with React Query
 * Removes item from the list immediately before API call completes
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.queryKey - The query key to update
 * @param {string} options.deleteEndpoint - API endpoint for deletion
 * @param {string} options.successMessage - Message to show on success
 * @param {Function} options.onSuccess - Callback after successful deletion
 */
export const useOptimisticDelete = ({
  queryKey,
  deleteEndpoint,
  successMessage = 'Deleted successfully',
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`${deleteEndpoint}/${id}`);
      return response.data;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically remove the item
      queryClient.setQueryData(queryKey, (old) => {
        if (!old || !Array.isArray(old)) return old;
        
        return old.filter((item) => 
          item.id !== id && item.Id !== id
        );
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      const errorMsg = err.response?.data?.error || 'Deletion failed';
      toast.error(errorMsg);
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey });
      
      if (!error && onSuccess) {
        onSuccess(data);
      }
    },

    onSuccess: () => {
      toast.success(successMessage);
    },
  });
};

/**
 * Example usage in a component:
 * 
 * const LabMasterComponent = () => {
 *   const queryClient = useQueryClient();
 *   
 *   // Fetch data
 *   const { data: records, isLoading } = useQuery({
 *     queryKey: ['lab-master'],
 *     queryFn: () => api.get('/lab-master').then(res => res.data),
 *   });
 *   
 *   // Optimistic update mutation
 *   const updateMutation = useOptimisticUpdate({
 *     queryKey: ['lab-master'],
 *     updateEndpoint: '/lab-master',
 *     successMessage: 'Lab record updated successfully',
 *   });
 *   
 *   // Optimistic create mutation
 *   const createMutation = useOptimisticCreate({
 *     queryKey: ['lab-master'],
 *     createEndpoint: '/lab-master',
 *     successMessage: 'Lab record created successfully',
 *   });
 *   
 *   // Optimistic delete mutation
 *   const deleteMutation = useOptimisticDelete({
 *     queryKey: ['lab-master'],
 *     deleteEndpoint: '/lab-master',
 *     successMessage: 'Lab record deleted successfully',
 *   });
 *   
 *   const handleUpdate = (id, data) => {
 *     updateMutation.mutate({ id, data });
 *   };
 *   
 *   const handleCreate = (data) => {
 *     createMutation.mutate(data);
 *   };
 *   
 *   const handleDelete = (id) => {
 *     deleteMutation.mutate(id);
 *   };
 *   
 *   return (
 *     <div>
 *       {records?.map(record => (
 *         <div key={record.id || record.Id}>
 *           {record.Customer} - {record.DrgNo}
 *           {record.isOptimistic && <span> (Saving...)</span>}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * };
 */
