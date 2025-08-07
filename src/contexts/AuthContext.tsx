import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types/index';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  registerStudent: (email: string, password: string, name: string, username: string, coachId: string) => Promise<void>;
  registerCoach: (email: string, password: string, name: string, adminId: string) => Promise<void>;
  registerTeacher: (email: string, password: string, name: string) => Promise<void>;
  createUserSilently: (email: string, password: string, userData: Omit<User, 'id'>) => Promise<void>;
  createUserAndReturn: (email: string, password: string, userData: Omit<User, 'id'>, returnEmail: string, returnPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bypassAuthChange, setBypassAuthChange] = useState(false);

  const login = async (emailOrUsername: string, password: string) => {
    let emailToUse = emailOrUsername;
    
    // Eğer @ işareti yoksa, bu bir kullanıcı adı olabilir
    if (!emailOrUsername.includes('@')) {
      // Kullanıcı adını kullanarak email'i bul
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', emailOrUsername));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Kullanıcı adı bulunamadı');
      }
      
      // İlk eşleşen kullanıcının email'ini al
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      emailToUse = userData.email;
    }
    
    await signInWithEmailAndPassword(auth, emailToUse, password);
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    // Kullanıcı oluştur
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı verilerini Firestore'a kaydet
    const userData: User = {
      id: user.uid,
      email: user.email!,
      name,
      role,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Kullanıcı otomatik olarak giriş yapmış olacak (createUserWithEmailAndPassword bunu sağlar)
  };

  const registerStudent = async (email: string, password: string, name: string, username: string, coachId: string) => {
    // Koç öğrenci kaydı yapıyor
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Öğrenci verilerini Firestore'a kaydet
    const studentData: User = {
      id: user.uid,
      email: user.email!,
      name,
      username,
      role: 'student',
      coachId: coachId, // Koç ID'sini ekle
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), studentData);
    
    // Koç otomatik olarak giriş yapmış olacak, öğrenci değil
  };

  const registerCoach = async (email: string, password: string, name: string, adminId: string) => {
    // Yönetici koç kaydı yapıyor
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Koç verilerini Firestore'a kaydet
    const coachData: User = {
      id: user.uid,
      email: user.email!,
      name,
      role: 'coach',
      adminId: adminId, // Yönetici ID'sini ekle
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), coachData);
    
    // Yönetici otomatik olarak giriş yapmış olacak, koç değil
  };

  const registerTeacher = async (email: string, password: string, name: string) => {
    // Öğretmen kaydı
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Öğretmen verilerini Firestore'a kaydet
    const teacherData: User = {
      id: user.uid,
      email: user.email!,
      name,
      role: 'teacher',
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), teacherData);
  };

  const createUserSilently = async (email: string, password: string, userDataToSave: Omit<User, 'id'>) => {
    // Mevcut kullanıcının bilgilerini sakla
    const originalUser = currentUser;
    const originalUserData = userData;
    
    try {
      // AuthChange listener'ını ÖNCEDİN bypass et
      setBypassAuthChange(true);
      console.log('🔒 Bypass activated - blocking auth changes');
      
      // Küçük bir gecikme ekle ki bypass aktif olsun
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Yeni kullanıcı oluştur
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('👤 User created, but bypass is active');
      
      // Firestore'a kaydet
      const userDocWithId: User = {
        ...userDataToSave,
        id: user.uid
      };
      await setDoc(doc(db, 'users', user.uid), userDocWithId);
      
      // Orijinal kullanıcıyı ZORLA restore et
      if (originalUser && originalUserData) {
        console.log('🔄 Force restoring original user');
        setCurrentUser(originalUser);
        setUserData(originalUserData);
      }
      
      // 2 saniye sonra bypass'ı kaldır (daha uzun süre)
      setTimeout(() => {
        console.log('🔓 Bypass deactivated');
        setBypassAuthChange(false);
      }, 2000);
      
    } catch (error) {
      console.error('Silent user creation error:', error);
      setBypassAuthChange(false);
      throw error;
    }
  };

  const createUserAndReturn = async (email: string, password: string, userDataToSave: Omit<User, 'id'>, returnEmail: string, returnPassword: string) => {
    try {
      console.log('🚀 Creating user and returning to original...');
      
      // Yeni kullanıcı oluştur
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('👤 New user created:', user.uid);
      
      // Firestore'a kaydet
      const userDocWithId: User = {
        ...userDataToSave,
        id: user.uid
      };
      await setDoc(doc(db, 'users', user.uid), userDocWithId);
      console.log('💾 User data saved to Firestore');
      
      // Hemen orijinal kullanıcıya geri dön
      await signInWithEmailAndPassword(auth, returnEmail, returnPassword);
      console.log('🔄 Returned to original user');
      
    } catch (error) {
      console.error('Error in createUserAndReturn:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Eğer bypass modundaysak, auth change'i ignore et
      if (bypassAuthChange) {
        console.log('AuthChange bypassed - preserving current user');
        return;
      }
      
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Firestore Timestamp'leri Date'e çevir
            const userData: User = {
              id: data.id || user.uid,
              email: data.email || user.email || '',
              name: data.name || '',
              role: data.role || 'student',
              teacherId: data.teacherId,
              adminId: data.adminId,
              coachId: data.coachId,
              studentId: data.studentId,
              username: data.username,
              phone: data.phone,
              parentName: data.parentName,
              parentPhone: data.parentPhone,
              status: data.status,
              teacherNotes: data.teacherNotes,
              lastActivity: data.lastActivity?.toDate ? data.lastActivity.toDate() : data.lastActivity,
              isActive: data.isActive,
              pauseReason: data.pauseReason,
              graduationDate: data.graduationDate?.toDate ? data.graduationDate.toDate() : data.graduationDate,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
              updatedBy: data.updatedBy,
              deletedAt: data.deletedAt?.toDate ? data.deletedAt.toDate() : data.deletedAt,
              deletedBy: data.deletedBy,
              isBlocked: data.isBlocked,
              blockReason: data.blockReason,
              blockedAt: data.blockedAt?.toDate ? data.blockedAt.toDate() : data.blockedAt,
              blockedBy: data.blockedBy,
              package: data.package,
              packageStartDate: data.packageStartDate?.toDate ? data.packageStartDate.toDate() : data.packageStartDate,
              packageEndDate: data.packageEndDate?.toDate ? data.packageEndDate.toDate() : data.packageEndDate,
              studentLimit: data.studentLimit,
              isTrialActive: data.isTrialActive,
              trialStartDate: data.trialStartDate?.toDate ? data.trialStartDate.toDate() : data.trialStartDate,
              trialEndDate: data.trialEndDate?.toDate ? data.trialEndDate.toDate() : data.trialEndDate,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
            };
            setUserData(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [bypassAuthChange]);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    register,
    registerStudent,
    registerCoach,
    registerTeacher,
    createUserSilently,
    createUserAndReturn,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 