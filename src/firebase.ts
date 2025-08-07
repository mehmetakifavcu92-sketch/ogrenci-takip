import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase Console'dan aldığınız gerçek yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyD15JEL3BZKCQasM5oj-2aAOO-PKyk-E_E",
  authDomain: "ogrenci-takip-3c6f7.firebaseapp.com",
  projectId: "ogrenci-takip-3c6f7",
  storageBucket: "ogrenci-takip-3c6f7.firebasestorage.app",
  messagingSenderId: "106645234070",
  appId: "1:106645234070:web:aa3bea1c6b98279ad6bdb7"
};

// Ana uygulama instance'ı
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);



// Öğrenci oluşturma için ayrı instance (main auth session'ı bozmamak için)
const adminApp = initializeApp(firebaseConfig, 'admin');
export const adminAuth = getAuth(adminApp);

export default app; 