import { X, Phone, Video, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/common/UserAvatar';
import { User } from '@shared/schema';

interface ProfileModalProps {
  isOpen: boolean;
  user: Partial<User> | null;
  onClose: () => void;
}

export function ProfileModal({ isOpen, user, onClose }: ProfileModalProps) {
  // Handle clicks outside the modal content
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen || !user) return null;
  
  // Mock shared media for UI demo
  const sharedMedia = [
    "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf"
  ];
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="relative p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 dark:text-gray-400">
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 text-center">
          <div className="relative inline-block">
            <UserAvatar 
              user={user} 
              showStatus={true}
              size="xl"
            />
          </div>
          
          <h3 className="mt-4 text-xl font-semibold dark:text-white">
            {user.displayName || user.username}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400">
            {user.bio || 'No bio provided'}
          </p>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {user.isOnline ? 'Online' : 'Offline'}
          </p>
          
          <div className="flex justify-center space-x-4 mt-4">
            <Button 
              size="icon"
              className="p-3 bg-primary text-white rounded-full hover:bg-secondary"
              aria-label="Call"
            >
              <Phone className="h-5 w-5" />
            </Button>
            
            <Button 
              size="icon"
              className="p-3 bg-primary text-white rounded-full hover:bg-secondary"
              aria-label="Video call"
            >
              <Video className="h-5 w-5" />
            </Button>
            
            <Button 
              size="icon"
              className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label="Info"
            >
              <Info className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="mt-6 text-left">
            <h4 className="font-medium mb-2 dark:text-white">About</h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {user.bio || 'No additional information available.'}
            </p>
            
            <h4 className="font-medium mt-4 mb-2 dark:text-white">Email</h4>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{user.email || 'Not provided'}</p>
            
            <h4 className="font-medium mt-4 mb-2 dark:text-white">Shared Media</h4>
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.map((url, index) => (
                <img 
                  key={index}
                  src={`${url}?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100`}
                  alt={`Shared media ${index + 1}`}
                  className="rounded-lg object-cover w-full h-20"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
