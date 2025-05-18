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
    queryFn: async () => {
      console.log(`Fetching messages for conversation ID: ${conversationId}`);
      try {
        const response = await apiRequest('GET', `/api/messages/${conversationId}`);
        
        // Check if the response was successful
        if (!response.ok) {
          console.error(`Error fetching messages: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error(`Error response body: ${errorText}`);
          return [];
        }
        
        const data = await response.json();
        console.log("Messages received:", data);
        return data;
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    retry: 3 // Retry failed requests 3 times
  });
  
  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      console.log("Sending message:", data);
      const res = await apiRequest('POST', '/api/messages', data);
      const responseData = await res.json();
      console.log("Message sent response:", responseData);
      return responseData;
    },
    onSuccess: (newMessage) => {
      console.log("Message sent successfully:", newMessage);
      
      // Optimistically update the messages cache
      queryClient.setQueryData(['/api/messages', newMessage.conversationId], (oldData: any) => {
        console.log("Current messages before update:", oldData);
        if (Array.isArray(oldData)) {
          const updatedData = [...oldData, newMessage];
          console.log("Updated messages cache:", updatedData);
          return updatedData;
        }
        console.log("No existing messages, setting to:", [newMessage]);
        return [newMessage];
      });
      
      // Invalidate the conversations query to update the last message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      // Force refetch messages to ensure we have the latest data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', newMessage.conversationId] });
      }, 500);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    }
  });
  
  // Delete a message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string | number) => {
      console.log("Deleting message:", messageId);
      const res = await apiRequest('DELETE', `/api/messages/${messageId}`);
      if (!res.ok) {
        throw new Error('Failed to delete message');
      }
      return { messageId, conversationId };
    },
    onSuccess: (data) => {
      console.log("Message deleted successfully:", data);
      
      // Optimistically update messages cache to remove deleted message
      queryClient.setQueryData(['/api/messages', data.conversationId], (oldData: any) => {
        if (Array.isArray(oldData)) {
          const filteredData = oldData.filter(message => message.id !== data.messageId);
          console.log("Updated messages cache after deletion:", filteredData);
          return filteredData;
        }
        return oldData;
      });
      
      // Invalidate conversations to update last message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      console.error("Error deleting message:", error);
    }
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    refetch,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    deleteMessage: deleteMessageMutation.mutate,
    isDeleting: deleteMessageMutation.isPending
  };
};
