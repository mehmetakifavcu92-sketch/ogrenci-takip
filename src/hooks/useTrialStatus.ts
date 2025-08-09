import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const useTrialStatus = () => {
  const { userData } = useAuth();
  const [trialStatus, setTrialStatus] = useState<{
    isTrial: boolean;
    daysLeft: number;
    isExpired: boolean;
    showWarning: boolean;
  }>({
    isTrial: false,
    daysLeft: 0,
    isExpired: false,
    showWarning: false
  });

  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!userData || userData.role !== 'teacher') return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userData.id));
        if (userDoc.exists()) {
          const userDataFromDb = userDoc.data();
          
          if (userDataFromDb.package === 'trial' && userDataFromDb.trialEndDate) {
            const trialEndDate = userDataFromDb.trialEndDate.toDate();
            const now = new Date();
            const timeDiff = trialEndDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            const isExpired = daysLeft <= 0;
            const showWarning = daysLeft <= 1 && daysLeft > 0; // Son gün uyarısı
            
            setTrialStatus({
              isTrial: true,
              daysLeft: Math.max(0, daysLeft),
              isExpired,
              showWarning
            });
          }
        }
      } catch (error) {
        console.error('Trial status check error:', error);
      }
    };

    checkTrialStatus();
    
    // Her saat kontrol et
    const interval = setInterval(checkTrialStatus, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userData]);

  return trialStatus;
};
