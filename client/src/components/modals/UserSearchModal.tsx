import { useState } from 'react';
import { Search, X, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EntityId, getIdAsString } from '@/types/mongodb';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';

interface User {
  id: string; // Changed to string for MongoDB ObjectId compatibility
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (userId: string) => void;
}

export function UserSearchModal({ isOpen, onClose, onUserSelect }: UserSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { token } = useAuth();
  
  // Only search if query is at least 2 characters
  const shouldSearch = searchQuery.length >= 2;
  
  // Fetch users based on search query
  const { 
    data: users, 
    isLoading,
    error 
  } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: async () => {
      if (!shouldSearch) return [];
      
      try {
        const response = await apiRequest(
          'GET', 
          `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        return response.json();
      } catch (error) {
        console.error('Error searching users:', error);
        throw new Error('Failed to search users');
      }
    },
    enabled: shouldSearch && !!token,
  });
  
  const handleUserSelect = async (userId: EntityId) => {
    try {
      console.log('Selecting user with ID:', userId);
      // Create or get a direct conversation with this user
      const idStr = typeof userId === 'string' ? userId : String(userId);
      const response = await fetch(`/api/conversations/direct/${idStr}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      
      const conversation = await response.json();
      console.log('Conversation created/found:', conversation);
      
      // Close modal and pass the conversation to parent
      onClose();
      onUserSelect(userId);
      
      toast({
        title: 'Conversation created',
        description: 'You can now start chatting',
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Failed to create conversation',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find Users</DialogTitle>
          <DialogDescription>
            Search for users to start a conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by username or name"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="mt-4 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              Failed to search users. Please try again.
            </div>
          ) : !shouldSearch ? (
            <div className="text-center py-4 text-gray-500">
              Enter at least 2 characters to search
            </div>
          ) : users && users.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No users found matching "{searchQuery}"
            </div>
          ) : (
            <ul className="space-y-2">
              {users?.map((user: User) => (
                <li key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center">
                    <UserAvatar user={user} showStatus={true} />
                    <div className="ml-3">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleUserSelect(user.id as EntityId)}
                    className="ml-2"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    <span>Chat</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}