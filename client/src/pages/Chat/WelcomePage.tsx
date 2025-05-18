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
  
  // Log and extract users from conversations
  useEffect(() => {
    if (!user) return;
    console.log("Conversations data:", conversations);
    
    if (!conversations || !Array.isArray(conversations)) {
      console.log("No conversations data available");
      return;
    }
    
    try {
      // Process and extract users from all conversations
      const users = [];
      
      for (const conv of conversations) {
        // For direct conversations, get the other user
        if (!conv.isGroup) {
          // Get the other user from the conversation
          // In MongoDB data structure, otherUser is directly included in the conversation
          if (conv.otherUser) {
            users.push({
              ...conv.otherUser,
              lastMessageTime: conv.lastMessage?.sentAt || new Date(),
              lastMessageContent: conv.lastMessage?.content || "Start a conversation",
              conversationId: conv.id
            });
          } else {
            // Alternative way to get the other user from participants
            const otherParticipant = conv.participants?.find(
              p => p.userId !== user.id && p.user
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
      }
      
      // Sort by most recent message time
      const sortedUsers = users.sort((a, b) => {
        const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return bTime - aTime; // Most recent first
      });
      
      console.log("Processed recent users:", sortedUsers);
      setRecentUsers(sortedUsers);
    } catch (error) {
      console.error("Error processing conversations:", error);
    }
  }, [conversations, user]);

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