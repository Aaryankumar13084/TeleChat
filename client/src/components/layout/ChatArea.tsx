import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Phone, Video, Search, MoreVertical, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { MessageBubble } from '@/components/common/MessageBubble';
import { MessageInput } from './MessageInput';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ImagePreviewModal } from '@/components/modals/ImagePreviewModal';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { EntityId, isSameId, getIdAsString } from '@/types/mongodb';

interface ChatAreaProps {
  conversation: any; // Simplified for brevity
  onMenuToggle?: () => void; // For mobile menu toggle
}

export function ChatArea({ conversation, onMenuToggle }: ChatAreaProps) {
  const { user } = useAuth();
  const { messages, sendMessage, isLoading } = useMessages(conversation?.id);
  const { sendTypingIndicator } = useWebSocket();
  // Safe empty default to avoid undefined errors
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, boolean>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Get conversation title
  const getConversationTitle = () => {
    if (conversation?.isGroup) {
      return conversation.name;
    } else if (conversation?.otherUser) {
      return conversation.otherUser.displayName || conversation.otherUser.username;
    }
    return '';
  };
  
  // Get conversation status (online/last seen)
  const getConversationStatus = () => {
    if (conversation?.isGroup) {
      // Count online participants
      const onlineCount = conversation.participants?.filter(
        (p: any) => p.user?.isOnline && p.userId !== user?.id
      ).length;
      
      return onlineCount > 0 
        ? `${onlineCount} online` 
        : 'No one online';
    } else if (conversation?.otherUser) {
      return conversation.otherUser.isOnline 
        ? 'Online'
        : conversation.otherUser.lastSeen 
          ? `Last seen ${format(new Date(conversation.otherUser.lastSeen), 'MMM d, h:mm a')}`
          : 'Offline';
    }
    return '';
  };
  
  // Group messages by date
  const groupedMessages = () => {
    if (!messages) return [];
    
    const groups: {[key: string]: any[]} = {};
    
    messages.forEach(message => {
      const date = new Date(message.sentAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };
  
  // Handle image click
  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setShowImagePreview(true);
  };
  
  // Handle profile click
  const handleProfileClick = (user: any) => {
    setProfileUser(user);
    setShowProfile(true);
  };
  
  // Get sender info for a message
  const getSender = (message: any) => {
    if (message.userId === user?.id) {
      return user;
    }
    
    if (conversation?.isGroup) {
      const participant = conversation.participants?.find((p: any) => p.userId === message.userId);
      return participant?.user;
    }
    
    return conversation?.otherUser;
  };
  
  // Check if there's a user typing
  const isTyping = () => {
    try {
      if (!conversation?.id) return false;
      
      // Get the conversation ID as a string
      const convId = getIdAsString(conversation.id);
      
      // Using optional chaining and nullish coalescing to prevent errors
      const conversationTyping = typingUsers?.[convId] ?? {}; 
      
      return Object.entries(conversationTyping)
        .some(([userId, isTyping]) => {
          if (!userId || !user?.id) return false;
          return !isSameId(userId, user.id) && !!isTyping;
        });
    } catch (error) {
      console.error('Error checking typing status:', error);
      return false; // Safely handle any errors
    }
  };
  
  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isTyping()) return null;
    
    let typingUser = null;
    
    try {
      if (!conversation?.isGroup) {
        typingUser = conversation?.otherUser;
      } else {
        // Find the first typing user
        const convId = getIdAsString(conversation.id);
        const conversationTyping = typingUsers?.[convId] ?? {};
        
        const typingEntry = Object.entries(conversationTyping)
          .find(([userId, isTyping]) => {
            if (!userId || !user?.id) return false;
            return !isSameId(userId, user.id) && !!isTyping;
          });
        
        const typingUserId = typingEntry?.[0];
        
        if (typingUserId && conversation.participants) {
          const participant = conversation.participants.find(
            (p: any) => p && p.userId && isSameId(p.userId, typingUserId)
          );
          typingUser = participant?.user;
        }
      }
    } catch (error) {
      console.error('Error rendering typing indicator:', error);
      return null; // Safely handle any errors
    }
    
    if (!typingUser) return null;
    
    return (
      <div className="flex mb-4">
        <div className="relative mr-2 flex-shrink-0">
          <UserAvatar user={typingUser} size="sm" />
        </div>
        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg message-bubble incoming shadow-sm">
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-typing"></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-typing" style={{animationDelay: '0.2s'}}></span>
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-typing" style={{animationDelay: '0.4s'}}></span>
          </div>
        </div>
      </div>
    );
  };
  
  // Handle sending messages
  const handleSendMessage = (content: string, mediaUrl?: string, mediaType?: string) => {
    if (!conversation?.id || !user?.id) return;
    
    sendMessage({
      conversationId: conversation.id,
      userId: user.id,
      content: content,
      mediaUrl,
      mediaType
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
            Welcome to TeleChat
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Select a conversation or start a new chat to begin messaging.
          </p>
          <Button>Start a new conversation</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2 text-gray-500 dark:text-gray-400"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div 
            className="relative cursor-pointer"
            onClick={() => {
              if (!conversation.isGroup && conversation.otherUser) {
                handleProfileClick(conversation.otherUser);
              }
            }}
          >
            {conversation.isGroup ? (
              conversation.avatarUrl ? (
                <img 
                  src={conversation.avatarUrl}
                  alt={conversation.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <span>{conversation.name?.charAt(0).toUpperCase() || 'G'}</span>
                </div>
              )
            ) : (
              <UserAvatar 
                user={conversation.otherUser} 
                showStatus={true}
                size="md"
              />
            )}
          </div>
          
          <div className="ml-3">
            <h2 className="text-sm font-semibold dark:text-white">
              {getConversationTitle()}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getConversationStatus()}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <Phone className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <Video className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 chat-container">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {groupedMessages().map((group, groupIndex) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex justify-center mb-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                    {new Date(group.date).toDateString() === new Date().toDateString()
                      ? 'Today'
                      : format(new Date(group.date), 'MMMM d, yyyy')}
                  </span>
                </div>
                
                {/* Messages for this date */}
                {group.messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.userId === user?.id}
                    sender={getSender(message)}
                    // Only show avatar for first message from a user in a series
                    showAvatar={
                      index === 0 || 
                      group.messages[index - 1].userId !== message.userId
                    }
                    onImageClick={handleImageClick}
                    onDocumentClick={(url) => window.open(url, '_blank')}
                  />
                ))}
              </div>
            ))}
            
            {/* Typing indicator */}
            {renderTypingIndicator()}
            
            {/* Invisible element to scroll to bottom */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message input */}
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={(isTyping) => {
          if (conversation?.id) {
            // Convert ID to number if needed by sendTypingIndicator
            const convId = typeof conversation.id === 'string' ? 
              parseInt(conversation.id, 10) : conversation.id;
            sendTypingIndicator(convId, isTyping);
          }
        }}
      />
      
      {/* Image preview modal */}
      <ImagePreviewModal 
        isOpen={showImagePreview}
        imageUrl={previewImage}
        onClose={() => setShowImagePreview(false)}
      />
      
      {/* Profile modal */}
      <ProfileModal 
        isOpen={showProfile}
        user={profileUser}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}
