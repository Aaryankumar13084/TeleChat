import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserSearchModal } from '@/components/modals/UserSearchModal';
import { useConversations } from '@/hooks/useConversations';
import { UserProfilePage } from './UserProfilePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users } from 'lucide-react';

interface WelcomePageProps {
  onConversationSelect: (conversation: any) => void;
  selectedUserId?: string;
}

export function WelcomePage({ onConversationSelect, selectedUserId }: WelcomePageProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(selectedUserId ? 'profile' : 'welcome');
  const { refetch } = useConversations();

  const handleStartChat = async (userId: string) => {
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
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // If a specific user is selected, show their profile
  if (selectedUserId) {
    return (
      <UserProfilePage 
        userId={selectedUserId}
        onStartChat={handleStartChat}
        onBack={() => setActiveTab('welcome')}
      />
    );
  }

  return (
    <div className="flex flex-col items-center h-full bg-gray-50 dark:bg-gray-900">
      <Tabs 
        defaultValue="welcome" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full max-w-3xl mx-auto mt-8"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="welcome" className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span>New Chat</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            <span>Find Users</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="welcome" className="flex flex-col items-center justify-center text-center p-6">
          <h1 className="text-3xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to TeleChat
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Select a conversation or start a new chat to begin messaging.
          </p>
          
          <Button 
            size="lg" 
            className="py-6 px-8 text-lg"
            onClick={() => setActiveTab('users')}
          >
            Find someone to chat with
          </Button>
        </TabsContent>
        
        <TabsContent value="users" className="p-6">
          <Button 
            size="lg" 
            className="w-full py-6 text-lg mb-8"
            onClick={() => setShowUserSearch(true)}
          >
            Search for users
          </Button>
          
          <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
            <p>Looking for someone specific?</p>
            <p>Use the search to find friends and colleagues.</p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* User Search Modal */}
      <UserSearchModal 
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onUserSelect={handleStartChat}
      />
    </div>
  );
}