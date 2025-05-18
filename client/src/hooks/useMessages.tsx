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
  
  return {
    messages: messages || [],
    isLoading,
    error,
    refetch,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending
  };
};
