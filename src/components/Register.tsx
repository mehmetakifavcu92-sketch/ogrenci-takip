import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserRole, PACKAGES, PackageType } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as UserRole,
    username: '',
    package: 'starter' as PackageType
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { userData } = useAuth();
  const navigate = useNavigate();

  // Admin kontrolü - sadece admin kullanıcılar öğretmen oluşturabilir
  const isAdmin = userData?.role === 'admin';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor!');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır!');
      setLoading(false);
      return;
    }

    if (formData.role === 'student' && !formData.username) {
      setError('Öğrenci için kullanıcı adı gereklidir!');
      setLoading(false);
      return;
    }

    // Admin kontrolü - sadece admin kullanıcılar öğretmen, veli ve admin oluşturabilir
          if (!isAdmin && (formData.role === 'teacher' || formData.role === 'parent' || formData.role === 'admin')) {
      setError('Bu rolü oluşturmak için admin yetkisi gereklidir!');
      setLoading(false);
      return;
    }

         try {
       // Admin için Firebase Auth kullanarak kullanıcı oluştur (otomatik giriş yapmadan)
       if (isAdmin && formData.role === 'teacher') {
         // Mevcut admin kullanıcısının email'ini sakla
         const adminEmail = userData!.email;
         
         // Firebase Auth ile kullanıcı oluştur
         const userCredential = await createUserWithEmailAndPassword(
           auth,
           formData.email,
           formData.password
         );

         // Firestore'a kullanıcı verilerini kaydet
         const packageInfo = PACKAGES.find(p => p.type === formData.package);
         const now = new Date();
         const isTrialPackage = formData.package === 'trial';
         
         const userDoc: User = {
           id: userCredential.user.uid,
           email: formData.email,
           name: formData.name,
           role: formData.role,
           createdAt: now,
           adminId: userData?.id || '',
           // Paket bilgileri (sadece öğretmen için)
           package: formData.package,
           packageStartDate: now,
           packageEndDate: isTrialPackage 
             ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 saat sonra
             : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
           studentLimit: packageInfo?.studentLimit || 10,
           // Deneme paketi için özel alanlar
           ...(isTrialPackage && {
             isTrialActive: true,
             trialStartDate: now,
             trialEndDate: new Date(now.getTime() + 24 * 60 * 60 * 1000)
           })
         };

         await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);

         // Admin'i tekrar giriş yaptır (yeni kullanıcı oluşturma otomatik giriş yaptırır)
         await signInWithEmailAndPassword(auth, adminEmail, 'admin123456');
         
         const packageDetails = PACKAGES.find(p => p.type === formData.package);
         const packageText = isTrialPackage 
           ? `${packageDetails?.name} (Ücretsiz - 24 saat geçerli - ${packageDetails?.studentLimit} öğrenci)`
           : `${packageDetails?.name} (₺${packageDetails?.price}/ay - ${packageDetails?.studentLimit === -1 ? 'Sınırsız' : packageDetails?.studentLimit} öğrenci)`;
           
         setSuccessMessage(`Öğretmen hesabı başarıyla oluşturuldu! 🎉 
           E-posta: ${formData.email} | Şifre: ${formData.password}
           Paket: ${packageText}
           ${isTrialPackage ? '⚠️ 24 saat sonra deneme süresi dolacaktır.' : ''}`);
         
         // 8 saniye sonra mesajı kaldır
         setTimeout(() => setSuccessMessage(''), 8000);
        
         // Formu sıfırla
         setFormData({
           name: '',
           email: '',
           password: '',
           confirmPassword: '',
           role: 'student' as UserRole,
           username: '',
           package: 'starter' as PackageType
         });
         return;
       }

       if (isAdmin && formData.role === 'parent') {
         // Mevcut admin kullanıcısının email'ini sakla
         const adminEmail = userData!.email;
         
         // Veli oluşturma işlemi - şimdilik basit kayıt
         const userCredential = await createUserWithEmailAndPassword(
           auth,
           formData.email,
           formData.password
         );

         const userDoc: User = {
           id: userCredential.user.uid,
           email: formData.email,
           name: formData.name,
           role: formData.role,
           createdAt: new Date(),
           adminId: userData?.id || ''
         };

         await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
         
         // Admin'i tekrar giriş yaptır (yeni kullanıcı oluşturma otomatik giriş yaptırır)
         await signInWithEmailAndPassword(auth, adminEmail, 'admin123456');
         
         setSuccessMessage(`Veli hesabı başarıyla oluşturuldu! 🎉 E-posta: ${formData.email} | Şifre: ${formData.password}`);
         
         // 8 saniye sonra mesajı kaldır
         setTimeout(() => setSuccessMessage(''), 8000);
         
         // Formu sıfırla
         setFormData({
           name: '',
           email: '',
           password: '',
           confirmPassword: '',
           role: 'student' as UserRole,
           username: '',
           package: 'starter' as PackageType
         });
         return;
       }

       if (isAdmin && formData.role === 'admin') {
         // Mevcut admin kullanıcısının email'ini sakla
         const adminEmail = userData!.email;
         
         // Admin oluşturma işlemi
         const userCredential = await createUserWithEmailAndPassword(
           auth,
           formData.email,
           formData.password
         );

         const userDoc: User = {
           id: userCredential.user.uid,
           email: formData.email,
           name: formData.name,
           role: formData.role,
           createdAt: new Date()
         };

         await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
         
         // Admin'i tekrar giriş yaptır (yeni kullanıcı oluşturma otomatik giriş yaptırır)
         await signInWithEmailAndPassword(auth, adminEmail, 'admin123456');
         
         setSuccessMessage(`Admin hesabı başarıyla oluşturuldu! 🎉 E-posta: ${formData.email} | Şifre: ${formData.password}`);
         
         // 8 saniye sonra mesajı kaldır
         setTimeout(() => setSuccessMessage(''), 8000);
         
         // Formu sıfırla
         setFormData({
           name: '',
           email: '',
           password: '',
           confirmPassword: '',
           role: 'student' as UserRole,
           username: '',
           package: 'starter' as PackageType
         });
         return;
       }

       // Öğrenci için normal Firebase Auth kullan
       const userCredential = await createUserWithEmailAndPassword(
         auth,
         formData.email,
         formData.password
       );

       const user = userCredential.user;

       try {
         // Create user document in Firestore
         const userDoc: Omit<User, 'id'> = {
           email: formData.email,
           name: formData.name,
           role: formData.role,
           createdAt: new Date(),
           ...(formData.username && { username: formData.username }),
           ...(formData.role === 'student' && userData?.id && { teacherId: userData.id })
         };

         await setDoc(doc(db, 'users', user.uid), userDoc);

         console.log('Öğrenci başarıyla oluşturuldu:', {
           uid: user.uid,
           email: formData.email,
           role: formData.role,
           userDoc: userDoc,
           teacherId: userData?.id
         });

         // Öğrenci için yönlendirme
         navigate('/student');
       } catch (firestoreError) {
         // Firestore hatası durumunda Firebase Auth'tan da sil
         console.error('Firestore error:', firestoreError);
         await user.delete();
         throw new Error('Veritabanına kayıt sırasında hata oluştu. Lütfen tekrar deneyin.');
       }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor!');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi!');
      } else if (error.code === 'auth/weak-password') {
        setError('Şifre çok zayıf!');
      } else if (error.message && error.message.includes('Veritabanına kayıt')) {
        setError(error.message);
      } else {
        setError('Kayıt olurken bir hata oluştu! Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isAdmin ? 'Yeni Kullanıcı Kaydı' : 'Yeni Öğrenci Kaydı'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isAdmin ? 'Sisteme yeni kullanıcı ekleyin' : 'Sisteme yeni öğrenci ekleyin'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-green-800 mb-1">
                    Başarılı!
                  </h4>
                  <p className="text-sm text-green-700">
                    {successMessage}
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setSuccessMessage('')}
                    className="text-green-400 hover:text-green-600 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isAdmin}
              >
                <option value="student">Öğrenci</option>
                {isAdmin && <option value="teacher">Öğretmen</option>}
                {isAdmin && <option value="parent">Veli</option>}
                {isAdmin && <option value="admin">Admin</option>}
              </select>
              {!isAdmin && (
                <p className="text-sm text-gray-500 mt-1">
                  Sadece admin kullanıcılar öğretmen, veli ve admin oluşturabilir.
                </p>
              )}
            </div>

            {/* Paket Seçimi - Sadece Öğretmen için */}
            {isAdmin && formData.role === 'teacher' && (
              <div>
                <label htmlFor="package" className="block text-sm font-medium text-gray-700 mb-2">
                  Paket Seçimi
                </label>
                <select
                  id="package"
                  name="package"
                  value={formData.package}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PACKAGES.map(pkg => (
                    <option key={pkg.type} value={pkg.type}>
                      {pkg.type === 'trial' 
                        ? `${pkg.name} - Ücretsiz (${pkg.studentLimit} öğrenci)`
                        : `${pkg.name} - ₺${pkg.price}/ay (${pkg.studentLimit === -1 ? 'Sınırsız' : pkg.studentLimit} öğrenci)`
                      }
                    </option>
                  ))}
                </select>
                
                {/* Seçili Paket Detayları */}
                {(() => {
                  const selectedPkg = PACKAGES.find(p => p.type === formData.package);
                  return selectedPkg && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">
                        {selectedPkg.name} Paketi Özellikleri:
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {selectedPkg.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        {selectedPkg.type === 'trial' ? (
                          <div className="space-y-1">
                            <span className="text-sm font-medium text-green-800">
                              ✅ Ücretsiz Deneme
                            </span>
                            <p className="text-xs text-orange-700 font-medium">
                              ⚠️ 24 saat sonra otomatik olarak iptal olur
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-blue-800">
                            Aylık Ücret: ₺{selectedPkg.price}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {formData.role === 'student' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="kullanici_adi"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şifre"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şifre Tekrar"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Kayıt Ol
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register; 