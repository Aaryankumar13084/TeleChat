import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';
import { Conversation, InsertConversation } from '@shared/schema';

export const useConversations = () => {
  const { token } = useAuth();
  
  // Get all conversations for the current user
  const { 
    data: conversations, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!token,
  });
  
  // Get a specific conversation by ID
  const getConversation = (id: number | string) => {
    return useQuery({
      queryKey: ['/api/conversations', id],
      enabled: !!token && !!id,
    });
  };
  
  // Create a new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: InsertConversation & { participantIds: (number | string)[] }) => {
      const res = await apiRequest('POST', '/api/conversations', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });
  
  // Create or get direct one-to-one conversation with a user
  const getDirectConversationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('POST', `/api/conversations/direct/${userId}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.setQueryData(['/api/conversations', data.id], data);
    },
  });
  
  return {
    conversations,
    isLoading,
    error,
    refetch,
    getConversation,
    createConversation: createConversationMutation.mutate,
    isCreatingConversation: createConversationMutation.isPending,
    getDirectConversation: getDirectConversationMutation.mutate,
    isGettingDirectConversation: getDirectConversationMutation.isPending
  };
};
