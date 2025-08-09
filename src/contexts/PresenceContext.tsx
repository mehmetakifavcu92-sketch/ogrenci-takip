import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, ref, onValue, set, serverTimestamp, onDisconnect } from 'firebase/database';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface PresenceContextType {
  onlineUsers: string[];
  isOnline: (userId: string) => boolean;
  userStatus: { [key: string]: 'online' | 'offline' | 'away' };
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};

interface PresenceProviderProps {
  children: React.ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children }) => {
  console.log('🚀 PresenceProvider rendered!');
  
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [userStatus, setUserStatus] = useState<{ [key: string]: 'online' | 'offline' | 'away' }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user?.email);
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    console.log('🌐 Setting up presence for user:', currentUser.email);
    
    try {
      const db = getDatabase();
      const presenceRef = ref(db, 'presence');
      const userPresenceRef = ref(db, `presence/${currentUser.uid}`);

      // Kullanıcı online olduğunda
      const setOnline = () => {
        console.log('✅ Setting user online:', currentUser.email);
        set(userPresenceRef, {
          status: 'online',
          lastSeen: serverTimestamp(),
          email: currentUser.email,
          displayName: currentUser.displayName || 'Anonim'
        });

        // Kullanıcı çıkış yaptığında offline yap
        onDisconnect(userPresenceRef).set({
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      };

      // Presence değişikliklerini dinle
      const unsubscribePresence = onValue(presenceRef, (snapshot) => {
        const presenceData = snapshot.val();
        console.log('📡 Presence data received:', presenceData);
        console.log('🔍 Snapshot exists:', !!snapshot);
        console.log('🔍 Snapshot key:', snapshot.key);
        console.log('🔍 Snapshot ref:', presenceRef.toString());
        
        if (presenceData) {
          const online: string[] = [];
          const status: { [key: string]: 'online' | 'offline' | 'away' } = {};

          Object.keys(presenceData).forEach(userId => {
            const userPresence = presenceData[userId];
            console.log('👤 User presence data:', userId, userPresence);
            if (userPresence.status === 'online') {
              online.push(userId);
              status[userId] = 'online';
            } else if (userPresence.status === 'away') {
              status[userId] = 'away';
            } else {
              status[userId] = 'offline';
            }
          });

          console.log('👥 Online users:', online);
          console.log('📊 User statuses:', status);
          
          setOnlineUsers(online);
          setUserStatus(status);
        } else {
          console.log('⚠️ No presence data found');
        }
      }, (error) => {
        console.error('❌ Presence listener error:', error);
      });

      // Kullanıcıyı online yap
      setOnline();

      // Sayfa kapatıldığında offline yap
      const handleBeforeUnload = () => {
        console.log('🚪 Page unloading, setting offline');
        set(userPresenceRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      };

      // Çıkış yapıldığında offline yap
      const handleLogout = () => {
        console.log('🚪 User logging out, setting offline');
        set(userPresenceRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('storage', handleLogout);

      // Auth state değişikliklerini dinle (çıkış yapma için)
      const auth = getAuth();
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (!user && currentUser) {
          console.log('🚪 User logged out, cleaning up presence');
          handleLogout();
        }
      });

      // Visibility change (tab değişimi) için - sadece kullanıcı zaten online olduktan sonra
      const handleVisibilityChange = () => {
        // Kullanıcı henüz online olmamışsa, visibility change'i ignore et
        if (!document.hasFocus()) return;
        
        if (document.hidden) {
          console.log('👁️ Tab hidden, setting away');
          set(userPresenceRef, {
            status: 'away',
            lastSeen: serverTimestamp()
          });
        } else {
          console.log('👁️ Tab visible, setting online');
          set(userPresenceRef, {
            status: 'online',
            lastSeen: serverTimestamp()
          });
        }
      };

      // Visibility change listener'ı biraz geciktir (giriş yapma işlemi tamamlansın)
      setTimeout(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }, 1000);

      return () => {
        console.log('🧹 Cleaning up presence for user:', currentUser.email);
        unsubscribePresence();
        unsubscribeAuth();
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('storage', handleLogout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        
        // Cleanup: kullanıcıyı offline yap
        set(userPresenceRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      };
    } catch (error) {
      console.error('❌ Error setting up presence:', error);
    }
  }, [currentUser]);

  const isOnline = (userId: string): boolean => {
    return onlineUsers.includes(userId);
  };

  const value: PresenceContextType = {
    onlineUsers,
    isOnline,
    userStatus
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
};
