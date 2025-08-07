import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  GraduationCap,
  Users,
  Calendar,
  Phone,
  Package,
  Clock,
  Trash2 as TrashIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Timestamp'i Date'e çeviren yardımcı fonksiyon
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

const AdminDashboard: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'users' | 'relationships' | 'statistics'>('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // ESC tuşu event listener
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showUserModal) {
          setShowUserModal(false);
          setSelectedUser(null);
          setEditingUser(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showUserModal]);

  useEffect(() => {
    loadData();
    
    // URL'den başarı mesajını kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    console.log('URL params:', window.location.search);
    console.log('Message from URL:', message);
    if (message) {
      setSuccessMessage(decodeURIComponent(message));
      // URL'den mesajı temizle
      window.history.replaceState({}, document.title, window.location.pathname);
      // 8 saniye sonra mesajı kaldır (şifre bilgisi için daha uzun)
      setTimeout(() => setSuccessMessage(''), 8000);
    }
  }, []);

  const loadData = async () => {
    try {
      // Tüm kullanıcıları yükle (debug için)
      const allUsersQuery = query(collection(db, 'users'));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      const allUsersData = allUsersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as User[];
      
      console.log('Tüm kullanıcılar:', allUsersData);
      
      // Tüm kullanıcıları set et
      setAllUsers(allUsersData);
      
      // Öğretmenleri filtrele
      const teachersData = allUsersData.filter(user => user.role === 'teacher');
      console.log('Filtrelenmiş öğretmenler:', teachersData);
      setTeachers(teachersData);

      // Öğrencileri filtrele
      const studentsData = allUsersData.filter(user => user.role === 'student');
      setStudents(studentsData);
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (userId: string, userRole: string, userName: string) => {
    const reason = prompt(`${userRole === 'teacher' ? 'Öğretmen' : 'Öğrenci'} hesabını engelleme sebebi:`, 
      'Ödeme yapılmadığı için hesap engellenmiştir.');
    
    if (reason !== null) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          isBlocked: true,
          blockReason: reason,
          blockedAt: new Date(),
          blockedBy: userData?.id
        });
        alert(`${userName} hesabı başarıyla engellendi!`);
        loadData();
      } catch (error) {
        console.error('Kullanıcı engellenirken hata:', error);
        alert('Kullanıcı engellenirken hata oluştu!');
      }
    }
  };

  const unblockUser = async (userId: string, userRole: string, userName: string) => {
    if (window.confirm(`${userName} (${userRole === 'teacher' ? 'Öğretmen' : 'Öğrenci'}) hesabının engelini kaldırmak istediğinizden emin misiniz?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          isBlocked: false,
          blockReason: null,
          blockedAt: null,
          blockedBy: null
        });
        alert(`${userName} hesabının engeli başarıyla kaldırıldı!`);
        loadData();
      } catch (error) {
        console.error('Kullanıcı engeli kaldırılırken hata:', error);
        alert('Kullanıcı engeli kaldırılırken hata oluştu!');
      }
    }
  };

  const cleanupFirestoreUsers = async () => {
    const confirmed = window.confirm(
      '⚠️ VERİTABANI TEMİZLEME ⚠️\n\n' +
      'Bu işlem Authentication\'da BULUNMAYAN tüm kullanıcıları Firestore\'dan silecek.\n\n' +
      'Şu anda Authentication\'da:\n' +
      '• 3 kullanıcı var\n' +
      '• Firestore\'da 21 kullanıcı var\n' +
      '• 18 fazla kullanıcı silinecek\n\n' +
      'SADECE şu kullanıcılar KALACAK:\n' +
      '• Admin hesabı\n' +
      '• 2 öğretmen hesabı\n\n' +
      'GERİ ALINMAZ! Devam etmek istediğinizden emin misiniz?'
    );
    
    if (!confirmed) return;

    try {
      // Authentication'da olan aktif kullanıcıları belirle
      const keepEmails = prompt(
        'Güvenlik için: Authentication\'da KALAN 3 email adresini virgül ile ayırarak yazın:\n\n' +
        'Örnek: admin@email.com, ogretmen1@email.com, ogretmen2@email.com\n\n' +
        'Bu emailler dışında tüm kullanıcılar silinecek!'
      );

      if (!keepEmails) {
        alert('İşlem iptal edildi.');
        return;
      }

      const keepEmailList = keepEmails.split(',').map(email => email.trim().toLowerCase());
      
      if (keepEmailList.length !== 3) {
        alert('Hata: Tam olarak 3 email adresi girmelisiniz!');
        return;
      }

      // Silinecek kullanıcıları bul
      const usersToDelete = allUsers.filter(user => 
        !keepEmailList.includes(user.email.toLowerCase())
      );

      if (usersToDelete.length === 0) {
        alert('Silinecek kullanıcı bulunamadı.');
        return;
      }

      const finalConfirm = window.confirm(
        `SON ONAY:\n\n` +
        `${usersToDelete.length} kullanıcı silinecek.\n\n` +
        `Silinecekler:\n${usersToDelete.map(u => `• ${u.name} (${u.email})`).join('\n')}\n\n` +
        `Kalacaklar:\n${keepEmailList.map(email => `• ${email}`).join('\n')}\n\n` +
        `Bu işlem GERİ ALINMAZ! Devam et?`
      );

      if (!finalConfirm) {
        alert('İşlem iptal edildi.');
        return;
      }

      // Toplu silme işlemi
      let deletedCount = 0;
      let errorCount = 0;

      for (const user of usersToDelete) {
        try {
          await deleteDoc(doc(db, 'users', user.id));
          deletedCount++;
          console.log(`Silindi: ${user.name} (${user.email})`);
        } catch (error) {
          console.error(`Silinemedi: ${user.name} (${user.email})`, error);
          errorCount++;
        }
      }

      alert(
        `✅ TOPLU TEMİZLİK TAMAMLANDI!\n\n` +
        `📊 Sonuç:\n` +
        `• ${deletedCount} kullanıcı silindi\n` +
        `• ${errorCount} hata oluştu\n` +
        `• ${keepEmailList.length} kullanıcı korundu\n\n` +
        `Sayfa yeniden yüklenecek...`
      );

      // Verileri yeniden yükle
      loadData();

    } catch (error) {
      console.error('Toplu silme hatası:', error);
      alert('Toplu silme işlemi sırasında hata oluştu!');
    }
  };

  const deleteUserPermanently = async (userId: string, userRole: string, userName: string, userEmail: string) => {
    // Çift onay sistemi
    const firstConfirm = window.confirm(
      `⚠️ UYARI: KALICI SİLME ⚠️\n\n` +
      `${userName} (${userRole === 'teacher' ? 'Öğretmen' : userRole === 'student' ? 'Öğrenci' : userRole === 'parent' ? 'Veli' : 'Kullanıcı'}) ` +
      `hesabını KALICI olarak silmek istediğinizden emin misiniz?\n\n` +
      `Bu işlem GERİ ALINMAZ!\n\n` +
      `• Tüm veriler silinecek\n` +
      `• Hesap tamamen kaldırılacak\n` +
      `• Giriş yapamayacak\n\n` +
      `Devam etmek için TAMAM'a basın.`
    );

    if (!firstConfirm) return;

    // İkinci onay - Email doğrulaması
    const emailConfirm = prompt(
      `Son onay: Güvenlik için kullanıcının email adresini yazın:\n\n` +
      `Silinecek hesap: ${userName}\n` +
      `Email: ${userEmail}\n\n` +
      `Email adresini buraya yazın:`
    );

    if (emailConfirm !== userEmail) {
      alert('Email adresi yanlış! İşlem iptal edildi.');
      return;
    }

    try {
      // 1. Firestore'dan kullanıcıyı sil
      await deleteDoc(doc(db, 'users', userId));

      // 2. Kullanıcının oluşturduğu verileri de sil (isteğe bağlı)
      // TODO: Görevler, sınavlar vb. veriler de silinebilir

      alert(`${userName} hesabı kalıcı olarak silindi!\n\nNot: Firebase Authentication'dan manuel silme gerekebilir.`);
      loadData();
      
    } catch (error) {
      console.error('Kullanıcı kalıcı olarak silinirken hata:', error);
      alert('Kullanıcı silinirken hata oluştu!');
    }
  };

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Yönetici Paneli</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Hoş geldiniz, {userData?.name}
          </div>
          <button
            onClick={() => navigate('/register')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            <UserPlus className="h-4 w-4" />
            Yeni Öğretmen Ekle
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-green-800 mb-1">
                Başarılı!
              </h3>
              <p className="text-green-700">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setSuccessMessage('')}
                className="text-green-400 hover:text-green-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: Shield },
            { id: 'teachers', label: 'Öğretmenler', icon: Users },
            { id: 'students', label: 'Öğrenciler', icon: GraduationCap },
            { id: 'users', label: 'Tüm Kullanıcılar', icon: Shield },
            { id: 'relationships', label: 'Öğrenci-Öğretmen İlişkileri', icon: Users },
            { id: 'statistics', label: 'İstatistikler', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Sistem Genel Bakış</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Toplam Öğretmen</p>
                  <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Toplam Öğrenci</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aktif Sistem</p>
                  <p className="text-2xl font-bold text-gray-900">✓</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Son Eklenen Öğretmenlar</h3>
              <div className="space-y-3">
                {teachers.slice(0, 5).map((teacher) => (
                  <div key={teacher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{teacher.name}</p>
                      <p className="text-sm text-gray-500">{teacher.email}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Öğretmen
                    </span>
                  </div>
                ))}
                {teachers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Henüz öğretmen eklenmemiş</p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Son Eklenen Öğrenciler</h3>
              <div className="space-y-3">
                {students.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.username}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      Öğrenci
                    </span>
                  </div>
                ))}
                {students.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Henüz öğrenci eklenmemiş</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

                  {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Öğretmen Yönetimi</h2>
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <UserPlus className="h-4 w-4" />
              Yeni Öğretmen Ekle
            </button>
          </div>
          
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {teachers.map((teacher) => (
               <div key={teacher.id} className="card hover:shadow-lg transition-shadow duration-200">
                 <div className="flex items-center space-x-3 mb-4">
                   <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                     <Users className="h-6 w-6 text-blue-600" />
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center gap-2">
                       <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                       {teacher.isBlocked ? (
                         <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                           Engelli
                         </span>
                       ) : (
                         <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                           Aktif
                         </span>
                       )}
                     </div>
                     <p className="text-sm text-gray-500">{teacher.email}</p>
                     {teacher.isBlocked && teacher.blockReason && (
                       <p className="text-xs text-red-600 mt-1">📝 {teacher.blockReason}</p>
                     )}
                   </div>
                 </div>
                 <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Kayıt Tarihi:</span>
                       <span className="text-gray-900">
                         {convertTimestamp(teacher.createdAt).toLocaleDateString('tr-TR')}
                       </span>
                     </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-600">Öğrenci Sayısı:</span>
                     <span className="text-gray-900">
                       {students.filter(s => s.teacherId === teacher.id).length}
                     </span>
                   </div>
                 </div>
                 <div className="pt-3 border-t border-gray-100">
                   {/* Üst sıra: Görüntüle ve Düzenle */}
                   <div className="flex items-center justify-between mb-2">
                     <button
                       onClick={() => viewUserDetails(teacher)}
                       className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                     >
                       <Eye className="h-4 w-4" />
                       Detay
                     </button>
                     <button
                       onClick={() => editUser(teacher)}
                       className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                     >
                       <Edit className="h-4 w-4" />
                       Düzenle
                     </button>
                   </div>
                   
                   {/* Alt sıra: Engelleme ve Silme */}
                   <div className="flex items-center justify-between">
                     {teacher.isBlocked ? (
                       <button
                         onClick={() => unblockUser(teacher.id, 'teacher', teacher.name)}
                         className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                       >
                         <CheckCircle className="h-4 w-4" />
                         Engeli Kaldır
                       </button>
                     ) : (
                       <button
                         onClick={() => blockUser(teacher.id, 'teacher', teacher.name)}
                         className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm font-medium"
                       >
                         <Shield className="h-4 w-4" />
                         Engelle
                       </button>
                     )}
                     
                     {/* Kalıcı Silme Butonu */}
                     <button
                       onClick={() => deleteUserPermanently(teacher.id, 'teacher', teacher.name, teacher.email)}
                       className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium border border-red-200 hover:border-red-300 px-2 py-1 rounded"
                     >
                       <TrashIcon className="h-4 w-4" />
                       Kalıcı Sil
                     </button>
                   </div>
                 </div>
               </div>
             ))}
            {teachers.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Users className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Henüz öğretmen eklenmemiş
                </h3>
                <p className="text-gray-500 mb-4">
                  İlk öğretmeninizi ekleyerek başlayın
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  İlk Öğretmeni Ekle
                </button>
              </div>
            )}
          </div>
        </div>
             )}

       {/* Students Tab */}
       {activeTab === 'students' && (
         <div className="space-y-6">
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-semibold text-gray-900">Öğrenci Yönetimi</h2>
             <div className="text-sm text-gray-500">
               Toplam {students.length} öğrenci
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {students.map((student) => {
               const teacher = teachers.find(c => c.id === student.teacherId);
               return (
                 <div key={student.id} className="card hover:shadow-lg transition-shadow duration-200">
                   <div className="flex items-center space-x-3 mb-4">
                     <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                       <GraduationCap className="h-6 w-6 text-green-600" />
                     </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <h3 className="font-semibold text-gray-900">{student.name}</h3>
                         {student.isBlocked ? (
                           <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                             Engelli
                           </span>
                         ) : (
                           <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                             Aktif
                           </span>
                         )}
                       </div>
                       <p className="text-sm text-gray-500">{student.username}</p>
                       {student.isBlocked && student.blockReason && (
                         <p className="text-xs text-red-600 mt-1">📝 {student.blockReason}</p>
                       )}
                     </div>
                   </div>
                   <div className="space-y-2 mb-4">
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Email:</span>
                       <span className="text-gray-900">{student.email}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Öğretmen:</span>
                       <span className="text-gray-900">
                         {teacher ? (
                           <span className="text-blue-600 font-medium">{teacher.name}</span>
                         ) : (
                           <span className="text-yellow-600 font-medium">Öğretmeni Yok</span>
                         )}
                       </span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-600">Kayıt Tarihi:</span>
                       <span className="text-gray-900">
                         {convertTimestamp(student.createdAt).toLocaleDateString('tr-TR')}
                       </span>
                     </div>
                   </div>
                   <div className="pt-3 border-t border-gray-100">
                     {/* Üst sıra: Görüntüle ve Düzenle */}
                     <div className="flex items-center justify-between mb-2">
                       <button
                         onClick={() => viewUserDetails(student)}
                         className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                       >
                         <Eye className="h-4 w-4" />
                         Detay
                       </button>
                       <button
                         onClick={() => editUser(student)}
                         className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                       >
                         <Edit className="h-4 w-4" />
                         Düzenle
                       </button>
                     </div>
                     
                     {/* Alt sıra: Engelleme ve Silme */}
                     <div className="flex items-center justify-between">
                       {student.isBlocked ? (
                         <button
                           onClick={() => unblockUser(student.id, 'student', student.name)}
                           className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                         >
                           <CheckCircle className="h-4 w-4" />
                           Engeli Kaldır
                         </button>
                       ) : (
                         <button
                           onClick={() => blockUser(student.id, 'student', student.name)}
                           className="flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm font-medium"
                         >
                           <Shield className="h-4 w-4" />
                           Engelle
                         </button>
                       )}
                       
                       {/* Kalıcı Silme Butonu */}
                       <button
                         onClick={() => deleteUserPermanently(student.id, 'student', student.name, student.email)}
                         className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium border border-red-200 hover:border-red-300 px-2 py-1 rounded"
                       >
                         <TrashIcon className="h-4 w-4" />
                         Kalıcı Sil
                       </button>
                     </div>
                   </div>
                 </div>
               );
             })}
             {students.length === 0 && (
               <div className="col-span-full text-center py-12">
                 <div className="text-gray-400 mb-4">
                   <GraduationCap className="h-16 w-16 mx-auto" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900 mb-2">
                   Henüz öğrenci eklenmemiş
                 </h3>
                 <p className="text-gray-500">
                   Öğretmenler öğrenci ekleyebilir
                 </p>
               </div>
             )}
           </div>
         </div>
       )}

       {/* Relationships Tab */}
       {activeTab === 'relationships' && (
         <div className="space-y-6">
           <h2 className="text-xl font-semibold text-gray-900">Öğrenci-Öğretmen İlişkileri</h2>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Öğretmenlara göre gruplandırma */}
             <div className="card">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Öğretmenlara Göre Öğrenciler</h3>
               <div className="space-y-4">
                 {teachers.map((teacher) => {
                   const teacherStudents = students.filter(student => student.teacherId === teacher.id);
                   return (
                     <div key={teacher.id} className="border rounded-lg p-4 bg-blue-50">
                       <div className="flex items-center justify-between mb-3">
                         <h4 className="font-semibold text-blue-900">{teacher.name}</h4>
                         <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                           {teacherStudents.length} öğrenci
                         </span>
                       </div>
                       <div className="space-y-2">
                         {teacherStudents.length > 0 ? (
                           teacherStudents.map((student) => (
                             <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                               <div>
                                 <p className="font-medium text-gray-900">{student.name}</p>
                                 <p className="text-sm text-gray-500">@{student.username}</p>
                               </div>
                               <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                 Öğrenci
                               </span>
                             </div>
                           ))
                         ) : (
                           <p className="text-gray-500 text-sm italic">Bu öğretmenin henüz öğrencisi yok</p>
                         )}
                       </div>
                     </div>
                   );
                 })}
                 {teachers.length === 0 && (
                   <p className="text-gray-500 text-center py-4">Henüz öğretmen eklenmemiş</p>
                 )}
               </div>
             </div>

             {/* Öğretmeni Yok öğrenciler */}
             <div className="card">
               <h3 className="text-lg font-medium text-gray-900 mb-4">Öğretmeni Yok Öğrenciler</h3>
               <div className="space-y-3">
                 {students.filter(student => !student.teacherId).map((student) => (
                   <div key={student.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                     <div>
                       <p className="font-medium text-gray-900">{student.name}</p>
                       <p className="text-sm text-gray-500">@{student.username}</p>
                       <p className="text-xs text-yellow-600">Öğretmen atanmadı</p>
                     </div>
                     <button
                       onClick={() => editUser(student)}
                       className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                     >
                       Öğretmen Ata
                     </button>
                   </div>
                 ))}
                 {students.filter(student => !student.teacherId).length === 0 && (
                   <p className="text-green-600 text-center py-4">Tüm öğrencilerin öğretmenleri var! 🎉</p>
                 )}
               </div>
             </div>
           </div>

           {/* Özet istatistikler */}
           <div className="card">
             <h3 className="text-lg font-medium text-gray-900 mb-4">İlişki Özeti</h3>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="text-center p-4 bg-blue-50 rounded-lg">
                 <p className="text-2xl font-bold text-blue-600">{teachers.length}</p>
                 <p className="text-sm text-gray-600">Toplam Öğretmen</p>
               </div>
               <div className="text-center p-4 bg-green-50 rounded-lg">
                 <p className="text-2xl font-bold text-green-600">{students.length}</p>
                 <p className="text-sm text-gray-600">Toplam Öğrenci</p>
               </div>
               <div className="text-center p-4 bg-purple-50 rounded-lg">
                 <p className="text-2xl font-bold text-purple-600">
                   {students.filter(s => s.teacherId).length}
                 </p>
                 <p className="text-sm text-gray-600">Öğretmenlu Öğrenci</p>
               </div>
               <div className="text-center p-4 bg-yellow-50 rounded-lg">
                 <p className="text-2xl font-bold text-yellow-600">
                   {students.filter(s => !s.teacherId).length}
                 </p>
                 <p className="text-sm text-gray-600">Öğretmeni Yok Öğrenci</p>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Tüm Kullanıcılar ({allUsers.length})</h2>
            <button
              onClick={cleanupFirestoreUsers}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              title="Authentication'da olmayan kullanıcıları Firestore'dan temizle"
            >
              <Shield className="h-4 w-4" />
              Veritabanı Temizle
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-posta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kayıt Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paket
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                              user.role === 'admin' ? 'bg-red-500' : 
                              user.role === 'teacher' ? 'bg-blue-500' : 
                              user.role === 'student' ? 'bg-green-500' : 'bg-purple-500'
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            {user.username && (
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'student' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {user.role === 'admin' ? 'Yönetici' :
                           user.role === 'teacher' ? 'Öğretmen' :
                           user.role === 'student' ? 'Öğrenci' : 'Veli'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isBlocked ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Engelli
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role === 'teacher' && user.package ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.package === 'trial' ? 'bg-orange-100 text-orange-800' :
                              user.package === 'starter' ? 'bg-blue-100 text-blue-800' :
                              user.package === 'professional' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.package === 'trial' ? 'Deneme' :
                               user.package === 'starter' ? 'Başlangıç' :
                               user.package === 'professional' ? 'Profesyonel' : 'Kurumsal'}
                            </span>
                            {user.package === 'trial' && user.trialEndDate && (
                              <div className="text-xs text-orange-600 mt-1">
                                Bitiş: {new Date(user.trialEndDate).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {allUsers.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz kullanıcı yok</h3>
              <p className="text-gray-500">Sistem kullanıcıları burada görünecek</p>
            </div>
          )}
        </div>
      )}

       {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Sistem İstatistikleri</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Öğretmen İstatistikleri</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Öğretmen</span>
                  <span className="font-medium">{teachers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Aktif Öğretmen</span>
                  <span className="font-medium">{teachers.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ortalama Öğrenci/Öğretmen</span>
                  <span className="font-medium">
                    {teachers.length > 0 ? (students.length / teachers.length).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Öğrenci İstatistikleri</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Toplam Öğrenci</span>
                  <span className="font-medium">{students.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Aktif Öğrenci</span>
                  <span className="font-medium">{students.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Öğretmeni Yok Öğrenci</span>
                  <span className="font-medium">
                    {students.filter(s => !s.teacherId).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Öğretmen Başına Öğrenci Dağılımı</h3>
            <div className="space-y-3">
              {teachers.map((teacher) => {
                const studentCount = students.filter(s => s.teacherId === teacher.id).length;
                return (
                  <div key={teacher.id} className="flex items-center justify-between">
                    <span className="text-gray-600">{teacher.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((studentCount / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8">{studentCount}</span>
                    </div>
                  </div>
                );
              })}
              {teachers.length === 0 && (
                <p className="text-gray-500 text-center py-4">Henüz öğretmen bulunmuyor</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && (selectedUser || editingUser) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUserModal(false);
              setSelectedUser(null);
              setEditingUser(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Kullanıcı Düzenle' : 'Kullanıcı Detayları'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {editingUser ? (
                <UserEditForm 
                  user={editingUser} 
                  teachers={teachers}
                  onSave={async (updatedUser) => {
                    try {
                      await updateDoc(doc(db, 'users', updatedUser.id), {
                        name: updatedUser.name,
                        email: updatedUser.email,
                        ...(updatedUser.username && { username: updatedUser.username }),
                        ...(updatedUser.teacherId && { teacherId: updatedUser.teacherId })
                      });
                      alert('Kullanıcı başarıyla güncellendi!');
                      setShowUserModal(false);
                      setEditingUser(null);
                      loadData();
                    } catch (error) {
                      console.error('Kullanıcı güncellenirken hata:', error);
                      alert('Kullanıcı güncellenirken hata oluştu!');
                    }
                  }}
                  onCancel={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                  }}
                />
              ) : (
                <UserDetailView 
                  user={selectedUser!} 
                  teachers={teachers}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User Detail View Component
const UserDetailView: React.FC<{ user: User; teachers: User[] }> = ({ user, teachers }) => {
  const teacher = teachers.find(c => c.id === user.teacherId);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          user.role === 'teacher' ? 'bg-blue-100' : 'bg-green-100'
        }`}>
          {user.role === 'teacher' ? (
            <Users className="h-6 w-6 text-blue-600" />
          ) : (
            <GraduationCap className="h-6 w-6 text-green-600" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{user.name}</h4>
          <p className="text-sm text-gray-500">{user.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Email:</span>
          <span className="text-gray-900">{user.email}</span>
        </div>
        
        {user.username && (
          <div className="flex justify-between">
            <span className="text-gray-600">Kullanıcı Adı:</span>
            <span className="text-gray-900">{user.username}</span>
          </div>
        )}
        
        {user.teacherId && (
          <div className="flex justify-between">
            <span className="text-gray-600">Öğretmen:</span>
            <span className="text-gray-900">{teacher?.name || 'Bilinmiyor'}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600">Kayıt Tarihi:</span>
          <span className="text-gray-900">
            {convertTimestamp(user.createdAt).toLocaleDateString('tr-TR')}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Kullanıcı ID:</span>
          <span className="text-gray-900 text-xs font-mono">{user.id}</span>
        </div>
      </div>
    </div>
  );
};

// User Edit Form Component
const UserEditForm: React.FC<{ 
  user: User; 
  teachers: User[];
  onSave: (user: User) => void;
  onCancel: () => void;
}> = ({ user, teachers, onSave, onCancel }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username || '');
  const [teacherId, setTeacherId] = useState(user.teacherId || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const updatedUser = {
      ...user,
      name,
      email,
      ...(user.role === 'student' && { username }),
      ...(user.role === 'student' && { teacherId })
    };
    
    onSave(updatedUser);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ad Soyad
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {user.role === 'student' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Öğretmen
            </label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-ring-blue-500"
            >
              <option value="">Öğretmen Seçin</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
};

export default AdminDashboard; 