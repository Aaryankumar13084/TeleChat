import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from './UserAvatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

interface MessageBubbleProps {
  message: any;
  isOwn: boolean;
  sender?: any;
  showAvatar?: boolean;
  onImageClick?: (url: string) => void;
  onDocumentClick?: (url: string) => void;
  onDeleteMessage?: (messageId: string | number) => void;
}

export function MessageBubble({
  message,
  isOwn,
  sender,
  showAvatar = true,
  onImageClick,
  onDocumentClick,
  onDeleteMessage
}: MessageBubbleProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Check if the message contains an image
  const isImage = message.mediaType === 'image' && message.mediaUrl;
  // Check if the message contains a document
  const isDocument = message.mediaType === 'document' && message.mediaUrl;
  
  // Check if the current user is the sender of the message
  const canDelete = isOwn || (user?.id === message.userId);
  
  // Format the message time
  const formatTime = (date: string) => {
    return format(new Date(date), 'h:mm a');
  };

  // Handle message deletion
  const handleDelete = () => {
    if (isConfirmingDelete) {
      // Execute the delete
      if (onDeleteMessage && message.id) {
        onDeleteMessage(message.id);
      }
      setIsConfirmingDelete(false);
    } else {
      // Show confirmation
      setIsConfirmingDelete(true);
    }
  };
  
  // Cancel delete confirmation
  const cancelDelete = () => {
    setIsConfirmingDelete(false);
  };
  
  return (
    <div 
      className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onClick={cancelDelete}
    >
      {/* Avatar for incoming messages */}
      {!isOwn && showAvatar && (
        <div className="relative mr-2 flex-shrink-0">
          <UserAvatar user={sender} size="sm" />
        </div>
      )}
      
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Sender name for group chats */}
        {!isOwn && sender && showAvatar && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {sender.displayName || sender.username}
          </div>
        )}
        
        {/* Message content */}
        <div className="flex items-start group">
          <div 
            className={`p-3 rounded-lg message-bubble ${
              isOwn 
                ? 'bg-primary text-white outgoing' 
                : 'bg-white dark:bg-gray-700 incoming'
            } shadow-sm`}
            style={{ borderRadius: isOwn ? '1rem 0 1rem 1rem' : '0 1rem 1rem 1rem' }}
          >
            {/* Document */}
            {isDocument && (
              <div 
                className="mb-2 cursor-pointer flex items-center bg-gray-100 dark:bg-gray-800 p-2 rounded"
                onClick={() => onDocumentClick && message.mediaUrl && onDocumentClick(message.mediaUrl)}
              >
                <div className="bg-gray-200 dark:bg-gray-600 p-2 rounded mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-medium truncate" style={{ maxWidth: "150px" }}>
                    {message.mediaUrl.split('/').pop()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Document
                  </div>
                </div>
              </div>
            )}
            
            {/* Image */}
            {isImage && (
              <div 
                className="mb-2 overflow-hidden rounded cursor-pointer"
                onClick={() => onImageClick && message.mediaUrl && onImageClick(message.mediaUrl)}
              >
                <img 
                  src={message.mediaUrl} 
                  alt="Media" 
                  className="max-w-full h-auto rounded"
                  style={{ maxHeight: "200px" }}
                />
              </div>
            )}
            
            {/* Text content */}
            {message.content && (
              <div className={`whitespace-pre-wrap break-words ${isImage || isDocument ? 'mt-2' : ''}`}>
                {message.content}
              </div>
            )}
          </div>
          
          {/* Delete option */}
          {canDelete && (
            <div 
              className={`opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'mr-2 order-first' : 'ml-2'}`}
              onClick={(e) => e.stopPropagation()}
              ref={dropdownRef}
            >
              {isConfirmingDelete ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDelete}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "end" : "start"}>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
        
        {/* Message timestamp */}
        <div className={`text-[10px] ${isOwn ? 'text-right' : 'text-left'} text-gray-500 dark:text-gray-400 mt-1 mx-1`}>
          {formatTime(message.sentAt)}
          {message.status === 'read' && isOwn && (
            <span className="ml-1 text-blue-500">✓✓</span>
          )}
          {message.status === 'delivered' && isOwn && (
            <span className="ml-1">✓✓</span>
          )}
          {message.status === 'sent' && isOwn && (
            <span className="ml-1">✓</span>
          )}
        </div>
      </div>
    </div>
  );
}