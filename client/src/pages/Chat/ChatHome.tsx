import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatArea } from '@/components/layout/ChatArea';
import { ConfirmDialog }  from '@/components/modals/ConfirmDialog';
import { WelcomePage } from '@/pages/Chat/WelcomePage';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMobile } from '@/hooks/use-mobile';
import { isSameId } from '@/types/mongodb';

export default function ChatHome() {
  const { user, logout } = useAuth();
  const { isMobile } = useMobile();
  const [_, setLocation] = useLocation();
  const { conversations, isLoading } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  
  // Initialize WebSocket connection
  const { isConnected } = useWebSocket();
  
  // When conversations load, select the first one by default
  useEffect(() => {
    if (conversations && Array.isArray(conversations) && conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations, selectedConversation]);
  
  // Effect to update selected conversation if it changes in the list
  useEffect(() => {
    if (selectedConversation && conversations && Array.isArray(conversations)) {
      const updatedConversation = conversations.find(
        (conv) => isSameId(conv.id, selectedConversation.id)
      );
      if (updatedConversation) {
        setSelectedConversation(updatedConversation);
      }
    }
  }, [conversations, selectedConversation]);
  
  // Handle conversation selection
  const handleConversationSelect = (conversation: any) => {
    setSelectedConversation(conversation);
    // Clear any selected user ID when a conversation is selected
    setSelectedUserId(undefined);
    if (isMobile) {
      setShowMobileSidebar(false);
    }
  };
  
  // Handle user selection for displaying profile
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedConversation(null); // Clear any selected conversation
  };
  
  // Handle mobile menu toggle
  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  // Logout handler
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  
  // Confirm logout
  const confirmLogout = () => {
    logout();
    setLocation('/login');
    setShowLogoutConfirm(false);
  };

  return (
    <div className="h-screen flex flex-col bg-light dark:bg-gray-900">
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - Always visible on larger screens */}
        <div className="hidden md:block">
          <Sidebar 
            onConversationSelect={handleConversationSelect}
            onUserProfileClick={handleUserSelect}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
        
        {/* Mobile Sidebar - Only visible when toggled */}
        {isMobile && showMobileSidebar && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div 
              className="fixed inset-0 bg-black/30"
              onClick={() => setShowMobileSidebar(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-full max-w-xs">
              <Sidebar 
                onConversationSelect={handleConversationSelect}
                onUserProfileClick={handleUserSelect}
                selectedConversationId={selectedConversation?.id}
                isMobile={true}
                onClose={() => setShowMobileSidebar(false)}
              />
            </div>
          </div>
        )}
        
        {/* Main Chat Area or Welcome Page */}
        {selectedConversation ? (
          <ChatArea 
            conversation={selectedConversation}
            onMenuToggle={toggleMobileSidebar}
          />
        ) : (
          <div className="flex-1">
            <WelcomePage 
              onConversationSelect={handleConversationSelect} 
              selectedUserId={selectedUserId} 
            />
          </div>
        )}
      </div>
      
      {/* Mobile Navigation - Only visible on small screens when no chat is selected */}
      {isMobile && !selectedConversation && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-3 flex justify-around">
          <button className="p-2 text-primary dark:text-secondary">
            <i className="fas fa-comment text-xl"></i>
          </button>
          <button className="p-2 text-gray-500 dark:text-gray-400">
            <i className="fas fa-users text-xl"></i>
          </button>
          <button className="p-2 text-gray-500 dark:text-gray-400">
            <i className="fas fa-phone text-xl"></i>
          </button>
          <button className="p-2 text-gray-500 dark:text-gray-400" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt text-xl"></i>
          </button>
        </div>
      )}
      
      {/* Logout Confirm Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out of TeleChat?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        variant="destructive"
      />
    </div>
  );
}
