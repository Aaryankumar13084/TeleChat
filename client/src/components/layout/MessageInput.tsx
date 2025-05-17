import { useState, useRef, useEffect } from 'react';
import { Paperclip, Smile, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageInputProps {
  onSendMessage: (content: string, mediaUrl?: string, mediaType?: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export function MessageInput({ onSendMessage, onTyping }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Typing indicator logic
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasTyping = useRef(false);
  
  useEffect(() => {
    return () => {
      // Clear typing timeout on unmount
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        
        // If we were typing, send not typing status
        if (wasTyping.current && onTyping) {
          onTyping(false);
        }
      }
    };
  }, [onTyping]);
  
  const handleTyping = () => {
    // If we weren't typing before, send typing status
    if (!wasTyping.current && onTyping) {
      onTyping(true);
      wasTyping.current = true;
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (wasTyping.current && onTyping) {
        onTyping(false);
        wasTyping.current = false;
      }
    }, 3000); // Stop typing after 3 seconds of inactivity
  };
  
  // Handle message submit
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      
      // Clear typing status
      if (wasTyping.current && onTyping) {
        clearTimeout(typingTimeoutRef.current!);
        onTyping(false);
        wasTyping.current = false;
      }
    }
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };
  
  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // In a real app, this would upload to Cloudinary or similar service
      // For this demo, we'll simulate by creating a URL from the file
      const fileType = file.type.startsWith('image/') 
        ? 'image' 
        : 'document';
      
      // Create a blob URL for demo purposes
      // In production, this would be replaced with a Cloudinary upload
      const blobUrl = URL.createObjectURL(file);
      
      // In a real app with Cloudinary, we would:
      // 1. Upload the file to Cloudinary
      // 2. Get the secure URL back
      // 3. Use that URL in the message

      // Send the message with media
      onSendMessage(
        fileType === 'image' ? '' : file.name, 
        blobUrl,
        fileType
      );
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <form className="flex items-end" onSubmit={handleSubmit}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary">
              <Smile className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="grid grid-cols-6 gap-2 p-2">
              {['😊', '😂', '❤️', '👍', '🎉', '🙏', '🔥', '👏', '😍', '🤔', '😢', '😭'].map(emoji => (
                <DropdownMenuItem key={emoji} className="cursor-pointer text-center text-xl p-2" onClick={() => setMessage(prev => prev + emoji)}>
                  {emoji}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <Button 
            type="button"
            variant="ghost" 
            size="icon" 
            className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 relative mx-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="py-2 px-4 bg-gray-100 dark:bg-gray-700 dark:text-white border-0 focus-visible:ring-primary rounded-full message-input"
            disabled={isUploading}
          />
        </div>
        
        <Button 
          type="submit"
          size="icon"
          className="bg-primary hover:bg-secondary text-white rounded-full"
          disabled={!message.trim() || isUploading}
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
