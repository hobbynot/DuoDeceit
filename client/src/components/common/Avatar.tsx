import React from 'react';
import { Crown, Skull, WifiOff } from 'lucide-react';

interface AvatarProps {
  username: string;
  avatarColor: string;
  isHost?: boolean;
  isEliminated?: boolean;
  isConnected?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulse?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  username,
  avatarColor,
  isHost = false,
  isEliminated = false,
  isConnected = true,
  size = 'md',
  pulse = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  }[size];

  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="relative inline-flex items-center justify-center">
      <div
        className={`${sizeClasses} rounded-2xl font-bold flex items-center justify-center shadow-lg transition-transform duration-200 border-2 select-none ${
          pulse ? 'ring-4 ring-mystery-cyan/60 scale-105' : ''
        } ${isEliminated ? 'opacity-40 grayscale border-slate-700' : 'border-white/20'}`}
        style={{
          backgroundColor: isEliminated ? '#1e293b' : avatarColor,
          color: '#ffffff',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {isEliminated ? (
          <Skull className={size === 'xl' ? 'w-12 h-12' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} />
        ) : (
          initial
        )}
      </div>

      {isHost && !isEliminated && (
        <span
          className="absolute -top-2 -right-1 bg-amber-400 text-dark-950 p-1 rounded-full shadow-md animate-bounce"
          title="Host"
        >
          <Crown className="w-3.5 h-3.5 fill-current" />
        </span>
      )}

      {!isConnected && (
        <span
          className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-md"
          title="Disconnected"
        >
          <WifiOff className="w-3 h-3" />
        </span>
      )}
    </div>
  );
};
