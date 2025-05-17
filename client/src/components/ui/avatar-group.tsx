import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface AvatarGroupProps {
  users: Partial<User>[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = "md", className = "" }: AvatarGroupProps) {
  // Set size classes based on the size prop
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };
  
  // Set fallback text size based on the size prop
  const fallbackSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };
  
  // Determine visible avatars and remaining count
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;
  
  // Generate fallback text from display name or username
  const getFallbackText = (user: Partial<User>) => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    } else if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <div className={`flex -space-x-3 ${className}`}>
      {visibleUsers.map((user, index) => (
        <Avatar 
          key={user.id || index} 
          className={`${sizeClasses[size]} border-2 border-white dark:border-gray-700 relative z-[${visibleUsers.length - index}]`}
        >
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username || "User"} />
          ) : (
            <AvatarFallback className={`bg-primary text-white ${fallbackSize[size]}`}>
              {getFallbackText(user)}
            </AvatarFallback>
          )}
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <Avatar 
          className={`${sizeClasses[size]} border-2 border-white dark:border-gray-700 relative bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center z-0`}
        >
          <span className={fallbackSize[size]}>+{remainingCount}</span>
        </Avatar>
      )}
    </div>
  );
}
