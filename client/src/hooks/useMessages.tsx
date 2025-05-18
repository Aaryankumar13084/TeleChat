import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';
import { InsertMessage } from '@shared/schema';

export const useMessages = (conversationId?: number | string) => {
  const { token } = useAuth();
  
  // Get messages for a conversation
  const { 
    data: messages, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/messages', conversationId],
    enabled: !!token && !!conversationId,
  });
  
  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      const res = await apiRequest('POST', '/api/messages', data);
      return res.json();
    },
    onSuccess: (newMessage) => {
      // Optimistically update the messages cache
      queryClient.setQueryData(['/api/messages', newMessage.conversationId], (oldData: any) => {
        if (Array.isArray(oldData)) {
          return [...oldData, newMessage];
        }
        return [newMessage];
      });
      
      // Invalidate the conversations query to update the last message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
  
  return {
    messages: messages || [],
    isLoading,
    error,
    refetch,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending
  };
};
