import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function ImagePreviewModal({ isOpen, imageUrl, onClose }: ImagePreviewModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Handle clicks outside the image
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl px-4">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-2 right-2 p-2 text-white bg-black bg-opacity-50 rounded-full z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
        
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="max-w-full max-h-[90vh] h-auto w-auto object-contain"
        />
      </div>
    </div>
  );
}
