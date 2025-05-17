import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserSearchModal } from '@/components/modals/UserSearchModal';
import { useConversations } from '@/hooks/useConversations';

interface WelcomePageProps {
  onConversationSelect: (conversation: any) => void;
}

export function WelcomePage({ onConversationSelect }: WelcomePageProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { refetch } = useConversations();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Welcome to TeleChat
      </h1>
      
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Select a conversation or start a new chat to begin messaging.
      </p>
      
      <Button 
        size="lg" 
        className="py-6 px-8 text-lg"
        onClick={() => setShowUserSearch(true)}
      >
        Start a new conversation
      </Button>
      
      {/* User Search Modal */}
      <UserSearchModal 
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onUserSelect={async (userId) => {
          try {
            // Create or find direct conversation
            const response = await fetch(`/api/conversations/direct/${userId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to create conversation');
            }
            
            const conversation = await response.json();
            
            // Refresh conversations list
            refetch();
            
            // Select the new conversation
            onConversationSelect(conversation);
            
            // Close the modal
            setShowUserSearch(false);
          } catch (error) {
            console.error('Error selecting user:', error);
          }
        }}
      />
    </div>
  );
}