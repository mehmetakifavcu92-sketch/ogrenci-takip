import React from 'react';
import { usePresence } from '../contexts/PresenceContext';

interface OnlineStatusProps {
  userId: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({ 
  userId, 
  showText = true, 
  size = 'md' 
}) => {
  const { userStatus } = usePresence();
  const status = userStatus[userId] || 'offline';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Çevrimiçi';
      case 'away':
        return 'Uzakta';
      case 'offline':
        return 'Çevrimdışı';
      default:
        return 'Bilinmiyor';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'md':
        return 'w-3 h-3';
      case 'lg':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${getSizeClasses(size)} ${getStatusColor(status)} rounded-full animate-pulse`} />
      {showText && (
        <span className={`text-sm ${
          status === 'online' ? 'text-green-600' : 
          status === 'away' ? 'text-yellow-600' : 
          'text-gray-500'
        }`}>
          {getStatusText(status)}
        </span>
      )}
    </div>
  );
};

// Kullanıcı listesi için online status
export const UserOnlineStatus: React.FC<{ userId: string; userName: string }> = ({ 
  userId, 
  userName 
}) => {
  const { userStatus } = usePresence();
  const status = userStatus[userId] || 'offline';

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
      <OnlineStatus userId={userId} showText={false} size="sm" />
      <span className="font-medium">{userName}</span>
      <span className={`text-xs px-2 py-1 rounded-full ${
        status === 'online' ? 'bg-green-100 text-green-800' : 
        status === 'away' ? 'bg-yellow-100 text-yellow-800' : 
        'bg-gray-100 text-gray-600'
      }`}>
        {status === 'online' ? 'Çevrimiçi' : 
         status === 'away' ? 'Uzakta' : 'Çevrimdışı'}
      </span>
    </div>
  );
};
