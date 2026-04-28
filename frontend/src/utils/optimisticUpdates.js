const withOptimisticUpdate = (queryClient, queryKey, { idField = 'Id' } = {}) => ({
    add: ({ apiFn, successMessage, onSuccess }) => ({
        mutationFn: apiFn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries(queryKey);
            const previousData = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, (old = []) => [
                { ...variables, [idField]: `temp_${Date.now()}`, _optimistic: true },
                ...old
            ]);
            return { previousData };
        },
        onError: (err, _variables, context) => {
            if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
            toast.error(err.response?.data?.error || 'Operation failed');
        },
        onSuccess: (data, variables) => {
            if (successMessage) toast.success(successMessage);
            if (onSuccess) onSuccess(data, variables);
        },
        onSettled: () => {
            queryClient.invalidateQueries(queryKey);
        }
    }),

    update: ({ apiFn, successMessage, onSuccess }) => ({
        mutationFn: apiFn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries(queryKey);
            const previousData = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, (old = []) =>
                old.map(item =>
                    item[idField] === variables.id
                        ? { ...item, ...variables.data, _optimistic: true }
                        : item
                )
            );
            return { previousData };
        },
        onError: (err, _variables, context) => {
            if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
            toast.error(err.response?.data?.error || 'Operation failed');
        },
        onSuccess: (data, variables) => {
            if (successMessage) toast.success(successMessage);
            if (onSuccess) onSuccess(data, variables);
        },
        onSettled: () => {
            queryClient.invalidateQueries(queryKey);
        }
    }),

    remove: ({ apiFn, successMessage, onSuccess }) => ({
        mutationFn: apiFn,
        onMutate: async (id) => {
            await queryClient.cancelQueries(queryKey);
            const previousData = queryClient.getQueryData(queryKey);
            queryClient.setQueryData(queryKey, (old = []) =>
                old.filter(item => item[idField] !== id)
            );
            return { previousData };
        },
        onError: (err, _variables, context) => {
            if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
            toast.error(err.response?.data?.error || 'Operation failed');
        },
        onSuccess: (data, id) => {
            if (successMessage) toast.success(successMessage);
            if (onSuccess) onSuccess(data, id);
        },
        onSettled: () => {
            queryClient.invalidateQueries(queryKey);
        }
    })
});

import { toast } from 'sonner';

export default withOptimisticUpdate;