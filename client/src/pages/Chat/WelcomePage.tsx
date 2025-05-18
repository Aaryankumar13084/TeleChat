import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UserSearchModal } from '@/components/modals/UserSearchModal';
import { useConversations } from '@/hooks/useConversations';
import { UserProfilePage } from './UserProfilePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Users, Clock } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useAuth } from '@/hooks/useAuth';

interface WelcomePageProps {
  onConversationSelect: (conversation: any) => void;
  selectedUserId?: string;
}

export function WelcomePage({ onConversationSelect, selectedUserId }: WelcomePageProps) {
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(selectedUserId ? 'profile' : 'welcome');
  const { conversations, refetch } = useConversations();
  const { user } = useAuth();
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  
  // Load the conversation data and extract recent contacts
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      
      try {
        // Make a direct API call to get conversations since the hook isn't working properly
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error("No authentication token available");
          return;
        }
        
        const response = await fetch(`${window.location.origin}/api/conversations`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }
        
        const conversationsData = await response.json();
        console.log("Fetched conversations directly:", conversationsData);
        
        // Process the conversations to extract users
        const users = [];
        
        // Skip if no conversations
        if (!Array.isArray(conversationsData) || conversationsData.length === 0) {
          console.log("No conversations available from direct fetch");
          return;
        }
        
        for (const conv of conversationsData) {
          // Skip group conversations
          if (conv.isGroup) continue;
          
          // Check for participants
          if (Array.isArray(conv.participants)) {
            // Get other user from participants (not current user)
            const otherParticipant = conv.participants.find(p => 
              p.userId !== user.id && p.user
            );
            
            if (otherParticipant?.user) {
              users.push({
                ...otherParticipant.user,
                lastMessageTime: conv.lastMessage?.sentAt || new Date(),
                lastMessageContent: conv.lastMessage?.content || "Start a conversation",
                conversationId: conv.id
              });
            }
          }
        }
        
        // Sort by most recent message
        const sortedUsers = users.sort((a, b) => {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
        
        console.log("Processed recent contacts:", sortedUsers);
        setRecentUsers(sortedUsers);
        
        // Also refresh the conversations data
        refetch();
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };
    
    fetchConversations();
  }, [user]);

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
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
          <TabsTrigger value="welcome" className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            <span>New Chat</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span>Recent</span>
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
        
        <TabsContent value="recent" className="p-6">
          <h2 className="text-xl font-semibold text-center mb-6">Recent Contacts</h2>
          
          {recentUsers.length > 0 ? (
            <div className="space-y-4">
              {recentUsers.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => handleStartChat(user.id.toString())}
                >
                  <UserAvatar 
                    user={user} 
                    showStatus={true}
                    size="md" 
                  />
                  <div className="ml-3 flex-1">
                    <div>
                      <h3 className="font-medium">{user.displayName || user.username}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {user.lastMessageContent ? 
                          (user.lastMessageContent.length > 25 ? 
                            `${user.lastMessageContent.substring(0, 25)}...` : 
                            user.lastMessageContent) : 
                          'No messages yet'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.lastMessageTime ? 
                        new Date(user.lastMessageTime).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        }) : ''}
                    </span>
                    {user.isOnline && (
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No recent conversations</p>
              <Button 
                className="mt-4"
                onClick={() => setActiveTab('users')}
              >
                Find someone to chat with
              </Button>
            </div>
          )}
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