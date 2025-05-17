import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface UserAvatarProps {
  user?: Partial<User>;
  showStatus?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ user, showStatus = false, size = "md", className = "" }: UserAvatarProps) {
  // Set size classes based on the size prop
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-24 w-24"
  };
  
  // Set fallback text size based on the size prop
  const fallbackSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-xl"
  };
  
  // Set status indicator size based on the avatar size
  const statusSize = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-3 h-3",
    xl: "w-4 h-4"
  };
  
  // Generate fallback text from display name or username
  const getFallbackText = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    } else if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className={`relative ${className}`}>
      <Avatar className={`${sizeClasses[size]} border-2 border-white dark:border-gray-700`}>
        {user?.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username || "User"} />
        ) : (
          <AvatarFallback className={`bg-primary text-white ${fallbackSize[size]}`}>
            {getFallbackText()}
          </AvatarFallback>
        )}
      </Avatar>
      
      {showStatus && (
        <span 
          className={`absolute bottom-0 right-0 ${statusSize[size]} ${user?.isOnline ? 'bg-accent' : 'bg-gray-400'} rounded-full border-2 border-white dark:border-gray-700`}
        />
      )}
    </div>
  );
}
