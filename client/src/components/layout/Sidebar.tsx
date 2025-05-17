import { useState } from 'react';
import { Search, Moon, Sun, PlusCircle, Menu, Settings, Users, MessageSquare, Phone, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ConversationItem } from '@/components/common/ConversationItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConversations } from '@/hooks/useConversations';
import { useDarkMode } from '@/hooks/use-mobile';
import { UserSearchModal } from '@/components/modals/UserSearchModal';

interface SidebarProps {
  onConversationSelect: (conversation: any) => void;
  selectedConversationId?: number;
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ 
  onConversationSelect, 
  selectedConversationId, 
  isMobile = false,
  onClose
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { conversations, isLoading, refetch } = useConversations();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  
  // Filter conversations based on search query
  const filteredConversations = conversations?.filter(conversation => {
    const searchIn = conversation.isGroup
      ? conversation.name?.toLowerCase()
      : conversation.otherUser?.displayName?.toLowerCase() || 
        conversation.otherUser?.username?.toLowerCase();
    
    return !searchQuery || 
      searchIn?.includes(searchQuery.toLowerCase());
  });
  
  // Sort conversations by last message time (newest first)
  const sortedConversations = [...(filteredConversations || [])].sort((a, b) => {
    const aTime = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
    const bTime = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className={`flex flex-col ${isMobile ? 'w-full' : 'w-1/4 max-w-xs'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <UserAvatar 
            user={user} 
            showStatus={true} 
            size="md"
          />
          <div className="ml-3">
            <h2 className="text-sm font-semibold dark:text-white">
              {user?.displayName || user?.username}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <Settings className="h-5 w-5" />
          </Button>
          
          {isMobile && (
            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400" onClick={onClose}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search"
            className="pl-10 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-none focus-visible:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sortedConversations?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              No conversations yet
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              onClick={() => setShowUserSearch(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Find new user to chat
            </Button>
          </div>
        ) : (
          <ul>
            {sortedConversations?.map((conversation) => (
              <li key={conversation.id}>
                <ConversationItem
                  conversation={conversation}
                  isActive={selectedConversationId === conversation.id}
                  onClick={() => {
                    onConversationSelect(conversation);
                    if (isMobile && onClose) {
                      onClose();
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Bottom navigation */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-around">
        <Button variant="ghost" size="icon" className="text-primary dark:text-secondary">
          <MessageSquare className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary"
          onClick={() => setShowUserSearch(true)}
        >
          <UserPlus className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">
          <Phone className="h-5 w-5" />
        </Button>
        
        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
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
