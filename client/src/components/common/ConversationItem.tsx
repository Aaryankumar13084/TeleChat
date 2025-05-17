import { format } from 'date-fns';
import { CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import { AvatarGroup } from '@/components/ui/avatar-group';

interface ConversationItemProps {
  conversation: any; // Simplified for brevity
  isActive?: boolean;
  onClick?: () => void;
}

export function ConversationItem({ conversation, isActive = false, onClick }: ConversationItemProps) {
  const { user } = useAuth();
  
  // Format timestamp into readable time
  const formatTime = (date: string | Date) => {
    if (!date) return '';
    
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      // Today - show time
      return format(messageDate, 'hh:mm a');
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      // Yesterday
      return 'Yesterday';
    } else if (today.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Within last 7 days - show day name
      return format(messageDate, 'EEEE');
    } else {
      // Earlier - show date
      return format(messageDate, 'dd/MM/yyyy');
    }
  };
  
  // Get display name or group name
  const getDisplayName = () => {
    if (conversation.isGroup) {
      return conversation.name;
    } else if (conversation.otherUser) {
      return conversation.otherUser.displayName || conversation.otherUser.username;
    }
    return 'Unknown';
  };
  
  // Get last message snippet
  const getLastMessageSnippet = () => {
    if (!conversation.lastMessage) return '';
    
    // If the message is from the current user, prepend "You: "
    const prefix = conversation.lastMessage.userId === user?.id ? 'You: ' : '';
    
    if (conversation.lastMessage.mediaType === 'image') {
      return `${prefix}📷 Photo`;
    } else if (conversation.lastMessage.mediaType === 'document') {
      return `${prefix}📄 Document`;
    } else {
      return `${prefix}${conversation.lastMessage.content || ''}`;
    }
  };
  
  // Get avatar to display
  const getAvatar = () => {
    if (conversation.isGroup) {
      if (conversation.avatarUrl) {
        return (
          <div className="relative">
            <img 
              src={conversation.avatarUrl}
              alt={conversation.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
        );
      } else {
        // Show avatar group for participants
        return (
          <AvatarGroup 
            users={conversation.participants
              .filter((p: any) => p.user && p.userId !== user?.id)
              .map((p: any) => p.user)
              .slice(0, 3)}
            size="md"
          />
        );
      }
    } else if (conversation.otherUser) {
      return (
        <UserAvatar 
          user={conversation.otherUser} 
          showStatus={true}
          size="lg"
        />
      );
    }
    
    return <UserAvatar size="lg" />;
  };
  
  // Check if there are unread messages
  const hasUnreadMessages = () => {
    if (!conversation.lastMessage) return false;
    
    // If the last message is from the current user, it's not unread
    if (conversation.lastMessage.userId === user?.id) return false;
    
    // Check if the message has been read by the current user
    return conversation.lastMessage.status !== 'seen';
  };
  
  // Count unread messages
  const getUnreadCount = () => {
    // This is a placeholder - in a real app you would track this properly
    return hasUnreadMessages() ? 1 : 0;
  };
  
  const unreadCount = getUnreadCount();

  return (
    <div 
      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isActive ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-primary' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        {getAvatar()}
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              {getDisplayName()}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {conversation.lastMessage ? formatTime(conversation.lastMessage.sentAt) : ''}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-gray-300 text-ellipsis w-40">
              {getLastMessageSnippet()}
            </p>
            
            {unreadCount > 0 ? (
              <span className="bg-primary text-white text-xs px-2 rounded-full">
                {unreadCount}
              </span>
            ) : (
              conversation.lastMessage && conversation.lastMessage.userId === user?.id && (
                <span className="text-xs">
                  {conversation.lastMessage.status === 'seen' ? (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  ) : (
                    <CheckCheck className="h-3 w-3 text-status-delivered" />
                  )}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
