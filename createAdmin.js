// Bu dosyayı çalıştırarak yönetici hesabı oluşturabilirsiniz
// Node.js ile çalıştırın: node createAdmin.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD15JEL3BZKCQasM5oj-2aAOO-PKyk-E_E",
  authDomain: "ogrenci-takip-3c6f7.firebaseapp.com",
  projectId: "ogrenci-takip-3c6f7",
  storageBucket: "ogrenci-takip-3c6f7.firebasestorage.app",
  messagingSenderId: "106645234070",
  appId: "1:106645234070:web:aa3bea1c6b98279ad6bdb7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const adminEmail = 'admin@ogrencitakip.com';
    const adminPassword = 'AdminGizli2024@!';
    const adminName = 'Sistem Yöneticisi';

    console.log('Yönetici hesabı oluşturuluyor...');
    
    // Firebase Auth ile kullanıcı oluştur
    const { user } = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    
    // Firestore'a yönetici verilerini kaydet
    const adminData = {
      id: user.uid,
      email: adminEmail,
      name: adminName,
      role: 'admin',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), adminData);
    
    console.log('✅ Yönetici hesabı başarıyla oluşturuldu!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Şifre:', adminPassword);
    console.log('👤 Ad:', adminName);
    console.log('🆔 UID:', user.uid);
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

createAdmin(); 