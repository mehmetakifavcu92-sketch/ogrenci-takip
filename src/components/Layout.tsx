import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Menu, X, User, Settings, ChevronDown, GraduationCap, Users, Plus } from 'lucide-react';
import { PACKAGES } from '../types';
import { collection, query, where, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Logo from './Logo';
import Toast from './Toast';

// TrialWarning import'u kaldırıldı

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, logout, createUserSilently } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overlayClickStartedRef = useRef(false);

  // Paket bilgileri (sadece öğretmenler için)
  const currentPackage = useMemo(() => {
    if (userData?.role !== 'teacher') return null;
    const userPackage = userData?.package || 'starter';
    return PACKAGES.find(p => p.type === userPackage) || PACKAGES[0];
  }, [userData?.package, userData?.role]);

  // Öğrenci sayısını gerçek zamanlı çek
  useEffect(() => {
    if (userData?.role !== 'teacher' || !userData?.id) {
      setStudentsLoading(false);
      return;
    }

    setStudentsLoading(true);

    // Gerçek zamanlı listener
    const studentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('teacherId', '==', userData.id)
    );

    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      try {
        // Aktif olanları filtreleyelim
        const activeStudents = snapshot.docs.filter(doc => {
          const data = doc.data();
          return !data.status || data.status === 'active';
        });
        
        setActiveStudentsCount(activeStudents.length);
        setStudentsLoading(false);
      } catch (error) {
        console.error('Error in real-time listener:', error);
        setStudentsLoading(false);
      }
    }, (error) => {
      console.error('Error setting up real-time listener:', error);
      setStudentsLoading(false);
    });

    // Cleanup function
    return () => unsubscribe();
  }, [userData?.id, userData?.role]);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Öğrenci Ekle modalı için ESC ile kapatma
  useEffect(() => {
    if (!showAddStudentModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddStudentModal(false);
        resetStudentForm();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showAddStudentModal]);

  // Öğrenci için öğretmen bilgilerini yükle
  useEffect(() => {
    const loadTeacherData = async () => {
      if (userData?.role !== 'student' || !userData?.teacherId) {
        setTeacherData(null);
        return;
      }
      
      try {
        const teacherDoc = await getDocs(query(
          collection(db, 'users'),
          where('id', '==', userData.teacherId),
          where('role', '==', 'teacher')
        ));
        
        if (!teacherDoc.empty) {
          setTeacherData(teacherDoc.docs[0].data());
        }
      } catch (error) {
        console.error('Error loading teacher data:', error);
      }
    };

    loadTeacherData();
  }, [userData?.teacherId, userData?.role]);

  const roleLabels = {
    student: 'Öğrenci',
    teacher: 'Öğretmen',
    parent: 'Veli',
    admin: 'Yönetici'
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({
      message,
      type,
      isVisible: true
    });
  };

  const resetStudentForm = () => {
    setStudentForm({
      name: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
  };

  const addStudent = async () => {
    if (!studentForm.name || !studentForm.email || !studentForm.username || !studentForm.password) {
      showToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    if (studentForm.password !== studentForm.confirmPassword) {
      showToast('Şifreler uyuşmuyor', 'error');
      return;
    }

    if (studentForm.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    try {
      // E-posta kontrolü
      const emailQuery = query(collection(db, 'users'), where('email', '==', studentForm.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        showToast('Bu e-posta adresi zaten kullanımda', 'error');
        return;
      }

      // Kullanıcı adı kontrolü
      const usernameQuery = query(collection(db, 'users'), where('username', '==', studentForm.username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        showToast('Bu kullanıcı adı zaten kullanımda', 'error');
        return;
      }

      // Öğrenci verilerini hazırla
      const studentData = {
        name: studentForm.name,
        email: studentForm.email,
        username: studentForm.username,
        role: 'student' as const,
        teacherId: userData?.id,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        isFirstLogin: true
      };

      // createUserSilently fonksiyonunu kullan
      await createUserSilently(studentForm.email, studentForm.password, studentData);

      showToast(`🎉 ${studentForm.name} başarıyla eklendi! Giriş bilgileri paylaşıldı.`, 'success');
      setShowAddStudentModal(false);
      resetStudentForm();
      
      // Öğrenci paneline gitmeyi engelle - sadece modal'ı kapat
      
    } catch (error: any) {
      console.error('Öğrenci ekleme hatası:', error);
      if (error.code === 'auth/email-already-in-use') {
        showToast('Bu e-posta adresi zaten kullanımda', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showToast('Geçersiz e-posta adresi', 'error');
      } else if (error.code === 'auth/weak-password') {
        showToast('Şifre çok zayıf', 'error');
      } else {
        showToast('Öğrenci eklenirken hata oluştu: ' + error.message, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Trial Warning Component - Kaldırıldı */}
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center gap-3 ml-2 lg:ml-0">
                <Logo size="md" />
                <h1 className="text-xl font-semibold text-gray-900">
                  Öğrenci Takip Sistemi
                </h1>
              </div>
              

            </div>
            
            <div className="flex items-center space-x-4">
              {/* Öğrenci Seçici (sadece öğretmenler için) */}
              {userData?.role === 'teacher' && (
                <div id="teacher-student-selector" className="flex items-center space-x-2">
                  {/* Bu alan TeacherDashboard tarafından doldurulacak */}
                </div>
              )}
              
              {/* Öğrenci Ekle Butonu (sadece öğretmenler için) */}
              {userData?.role === 'teacher' && (
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Öğrenci Ekle</span>
                </button>
              )}
              
              {/* Profil Dropdown Menüsü */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-700">
                        {userData?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {roleLabels[userData?.role as keyof typeof roleLabels]}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* Kullanıcı Bilgileri */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{userData?.name}</div>
                          <div className="text-sm text-gray-500">{userData?.email}</div>
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full mt-1 inline-block">
                            {roleLabels[userData?.role as keyof typeof roleLabels]}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kişisel Bilgiler */}
                    <div className="px-4 py-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Kişisel Bilgiler</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        {userData?.phone && (
                          <div className="flex justify-between">
                            <span>📞 Telefon:</span>
                            <span>{userData.phone}</span>
                          </div>
                        )}
                        {userData?.parentName && (
                          <div className="flex justify-between">
                            <span>👨‍👩‍👧‍👦 Veli:</span>
                            <span>{userData.parentName}</span>
                          </div>
                        )}
                        {userData?.parentPhone && (
                          <div className="flex justify-between">
                            <span>📞 Veli Tel:</span>
                            <span>{userData.parentPhone}</span>
                          </div>
                        )}
                        {teacherData && userData?.role === 'student' && (
                          <div className="flex justify-between">
                            <span>🎯 Öğretmen:</span>
                            <span className="text-blue-600 font-medium">{teacherData.name}</span>
                          </div>
                        )}
                        {userData?.username && (
                          <div className="flex justify-between">
                            <span>👤 Kullanıcı Adı:</span>
                            <span>{userData.username}</span>
                          </div>
                        )}
                        {userData?.status && (
                          <div className="flex justify-between">
                            <span>🟢 Durum:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              userData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {userData.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        )}
                        {userData?.createdAt && (
                          <div className="flex justify-between">
                            <span>📅 Kayıt:</span>
                            <span>{new Date(userData.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Paket Bilgileri (sadece öğretmenler için) */}
                    {currentPackage && (
                      <div className="px-4 py-2 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">📦 Paket Bilgileri</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>🎯 Mevcut Paket:</span>
                            <span className="font-medium text-blue-600">{currentPackage.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>💰 Fiyat:</span>
                            <span className="font-medium">
                              {currentPackage.type === 'trial' ? 'Ücretsiz' : `₺${currentPackage.price}/ay`}
                            </span>
                          </div>
                          {currentPackage.type === 'trial' && userData?.trialEndDate && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                              <div className="flex items-center text-orange-800">
                                <span className="mr-1">⚠️</span>
                                <span className="font-medium">Deneme Süresi</span>
                              </div>
                              <div className="text-orange-700 mt-1">
                                Bitiş: {new Date(userData.trialEndDate).toLocaleString('tr-TR')}
                              </div>
                              <div className="text-orange-600 text-xs mt-1">
                                Süre dolduğunda otomatik iptal olur
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>👥 Öğrenci Limiti:</span>
                            <span className="font-medium">
                              {currentPackage.studentLimit === -1 ? 'Sınırsız' : currentPackage.studentLimit}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>📊 Kullanım:</span>
                            <span className="font-medium">
                              {studentsLoading ? (
                                <span className="animate-pulse">Yükleniyor...</span>
                              ) : (
                                `${activeStudentsCount} / ${currentPackage.studentLimit === -1 ? '∞' : currentPackage.studentLimit}`
                              )}
                            </span>
                          </div>
                          {currentPackage.studentLimit !== -1 && !studentsLoading && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min((activeStudentsCount / currentPackage.studentLimit) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                %{Math.round((activeStudentsCount / currentPackage.studentLimit) * 100)} kullanım
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Çıkış Butonu */}
                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Öğrenci Ekleme Modal */}
      {showAddStudentModal && (
        <div 
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-start justify-center z-50 backdrop-blur-sm"
          style={{ 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)', 
            margin: 0, 
            padding: 0,
            top: 0,
            left: 0
          }}
          onMouseDown={(e) => {
            // Close only if the press STARTED on overlay
            overlayClickStartedRef.current = e.target === e.currentTarget;
          }}
          onMouseUp={(e) => {
            if (e.target === e.currentTarget && overlayClickStartedRef.current) {
              setShowAddStudentModal(false);
              resetStudentForm();
            }
            overlayClickStartedRef.current = false;
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                👨‍🎓 Yeni Öğrenci Ekle
              </h3>
              <button 
                onClick={() => {
                  setShowAddStudentModal(false);
                  resetStudentForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addStudent(); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Öğrenci adı soyadı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta *
                </label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  value={studentForm.username}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kullaniciadi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="En az 6 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre Tekrar *
                </label>
                <input
                  type="password"
                  value={studentForm.confirmPassword}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 active:scale-[0.98] transition"
                >
                  Öğrenci Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    resetStudentForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
};

export default Layout;
export {}; 