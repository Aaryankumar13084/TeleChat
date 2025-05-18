import { useState, useEffect } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Phone } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isVideoCall?: boolean;
}

export function CallModal({ isOpen, onClose, user, isVideoCall = false }: CallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall);
  const [callDuration, setCallDuration] = useState(0);
  
  // Timer for call duration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
      setCallDuration(0);
    };
  }, [isOpen]);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-gray-900 text-white">
        <div className="relative h-96 flex flex-col items-center justify-center">
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
          
          {/* Main content */}
          <div className="text-center flex flex-col items-center">
            {isVideoCall && isVideoOn ? (
              <div className="w-full h-full absolute inset-0 bg-gray-800 flex items-center justify-center">
                {/* This would be the video stream in a real implementation */}
                <div className="text-gray-400">Video call with {user?.displayName || user?.username}</div>
              </div>
            ) : (
              <>
                <UserAvatar user={user} size="xl" />
                <h3 className="text-xl font-semibold mt-4">{user?.displayName || user?.username}</h3>
                <p className="text-gray-400">
                  {isVideoCall ? 'Video call' : 'Voice call'}
                </p>
                <p className="text-gray-400 mt-2">{formatTime(callDuration)}</p>
              </>
            )}
          </div>
          
          {/* Call controls */}
          <div className="call-controls">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`call-button ${isMuted ? 'bg-gray-700' : 'bg-gray-600'}`}
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="call-button end-call"
              onClick={onClose}
            >
              <Phone className="h-6 w-6 transform rotate-135" />
            </Button>
            
            {isVideoCall && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={`call-button ${!isVideoOn ? 'bg-gray-700' : 'bg-gray-600'}`}
                onClick={() => setIsVideoOn(!isVideoOn)}
              >
                {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}