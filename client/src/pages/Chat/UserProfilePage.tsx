import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserProfilePageProps {
  userId: string;
  onStartChat: (userId: string) => void;
  onBack: () => void;
}

export function UserProfilePage({ userId, onStartChat, onBack }: UserProfilePageProps) {
  const { toast } = useToast();
  
  // Fetch user details
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      return response.json();
    },
    // If there's no API endpoint for getting a single user, use this placeholder data
    // that's similar to what's available in the conversation.otherUser object
    placeholderData: {
      id: userId,
      username: '',
      displayName: '',
      avatarUrl: null,
      bio: '',
      isOnline: false,
      lastSeen: new Date().toISOString()
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Profile</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We couldn't load this user's profile. Please try again later.
        </p>
        <Button onClick={onBack} variant="outline">Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center h-full p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-2"
          >
            ← Back
          </Button>
          <h1 className="text-2xl font-bold flex-1 text-center">User Profile</h1>
        </div>
        
        {/* User Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 mb-4">
            <UserAvatar 
              user={user} 
              showStatus={true} 
              className="w-full h-full text-4xl"
            />
          </div>
          
          <h2 className="text-2xl font-bold">{user.displayName}</h2>
          <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
          
          <div className="mt-2">
            {user.isOnline ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">
                Last seen {user.lastSeen ? format(new Date(user.lastSeen), 'MMM d, h:mm a') : 'Unknown'}
              </Badge>
            )}
          </div>
        </div>
        
        {/* User Bio */}
        {user.bio && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
            <h3 className="font-medium mb-2">Bio</h3>
            <p className="text-gray-600 dark:text-gray-300">{user.bio}</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            size="lg" 
            onClick={() => onStartChat(userId)}
            className="w-full"
          >
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}