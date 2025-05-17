import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { User, Message as MessageType } from '@shared/schema';
import { UserAvatar } from './UserAvatar';

interface MessageBubbleProps {
  message: MessageType;
  isOwn: boolean;
  sender: Partial<User>;
  showAvatar?: boolean;
  onImageClick?: (imageUrl: string) => void;
  onDocumentClick?: (documentUrl: string) => void;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  sender, 
  showAvatar = true,
  onImageClick,
  onDocumentClick
}: MessageBubbleProps) {
  
  // Function to format timestamp
  const formatTime = (date: Date) => {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return format(date, 'hh:mm a');
  };
  
  // Render different types of media
  const renderMedia = () => {
    if (!message.mediaUrl) return null;
    
    switch (message.mediaType) {
      case 'image':
        return (
          <img 
            src={message.mediaUrl} 
            alt="Shared image" 
            className="rounded-lg cursor-pointer w-64 h-auto object-cover mb-2"
            onClick={() => onImageClick && onImageClick(message.mediaUrl!)}
          />
        );
      
      case 'document':
        return (
          <div 
            className="flex items-center p-3 bg-gray-100 dark:bg-gray-600 rounded-lg cursor-pointer mb-2"
            onClick={() => onDocumentClick && onDocumentClick(message.mediaUrl!)}
          >
            <div className="text-red-500 text-xl mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15v-4"></path>
                <path d="M12 15v-6"></path>
                <path d="M15 15v-2"></path>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium dark:text-white">
                {message.mediaUrl.split('/').pop() || 'Document'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click to download</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Render message status indicator (only for own messages)
  const renderStatusIndicator = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-status-delivered" />;
      
      case 'seen':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      
      default:
        return null;
    }
  };

  return (
    <div className={`flex mb-4 ${isOwn ? 'justify-end' : ''}`}>
      {!isOwn && showAvatar && (
        <div className="relative mr-2 flex-shrink-0">
          <UserAvatar user={sender} size="sm" />
        </div>
      )}
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : ''}`}>
        <div 
          className={`p-3 rounded-lg shadow-sm max-w-[70%] message-bubble ${
            isOwn 
              ? 'bg-primary text-white outgoing' 
              : 'bg-white dark:bg-gray-700 dark:text-white incoming'
          }`}
        >
          {renderMedia()}
          {message.content && <p className="text-sm">{message.content}</p>}
        </div>
        
        <div className={`flex items-center mt-1 ${isOwn ? 'flex-row' : 'flex-row-reverse'}`}>
          <span className="text-xs text-gray-500 mx-1">
            {formatTime(message.sentAt)}
          </span>
          {renderStatusIndicator()}
        </div>
      </div>
    </div>
  );
}
