import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Mail, Calendar, ArrowRight, BookOpen, Shield, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'student': return 'Öğrenci';
      case 'teacher': return 'Öğretmen';
      case 'parent': return 'Veli';
      case 'admin': return 'Yönetici';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return GraduationCap;

      case 'parent': return User;
      case 'admin': return Shield;
      case 'teacher': return BookOpen;
      default: return User;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'student': return 'Görevlerinizi takip edin, deneme sonuçlarınızı görün ve performansınızı analiz edin.';

      case 'parent': return 'Çocuğunuzun akademik performansını takip edin ve gelişimini izleyin.';
      case 'admin': return 'Sistem yönetimi, kullanıcı yönetimi ve genel istatistikleri görüntüleyin.';
      case 'teacher': return 'Paylaşılan deneme sonuçlarını inceleyin ve öğrencilere yorum yapın.';
      default: return '';
    }
  };

  const getRoleFeatures = (role: string) => {
    switch (role) {
      case 'student': return [
        '📚 Günlük görev takibi',
        '📊 Deneme sonuçları',
        '📈 Performans analizi',
        '📅 Çalışma programı'
      ];

      case 'parent': return [
        '👨‍👩‍👧‍👦 Çocuk takibi',
        '📊 Akademik performans',
        '📅 Görev durumu',
        '📈 Gelişim raporu'
      ];
      case 'admin': return [
        '⚙️ Sistem yönetimi',
        '👥 Kullanıcı yönetimi',
        '📊 Genel istatistikler',
        '🔧 Ayarlar'
      ];
      case 'teacher': return [
        '📊 Deneme sonuçları inceleme',
        '💬 Öğrenci yorumları',
        '⭐ Değerlendirme sistemi',
        '📈 Detaylı analiz'
      ];
      default: return [];
    }
  };

  const navigateToPanel = () => {
    switch (userData?.role) {
      case 'student':
        navigate('/student');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      case 'parent':
        navigate('/parent');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      default:
        break;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilinmiyor';
    
    // Firestore Timestamp'i Date'e çevir
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR');
  };

  const RoleIcon = getRoleIcon(userData?.role || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6 shadow-xl">
              {React.createElement(getRoleIcon(userData?.role || 'user'), { className: "h-12 w-12 text-white" })}
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Hoş Geldiniz, {userData?.name}!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {getRoleText(userData?.role || '')} olarak sisteme başarıyla giriş yaptınız
            </p>
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700 text-sm">{userData?.email}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-gray-700 text-sm">Üye: {formatDate(userData?.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 mx-auto transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>

                 {/* Welcome Message */}
         <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-8">
           <div className="text-center">
             <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
               {getRoleDescription(userData?.role || '')}
             </p>
           </div>
         </div>

        {/* Main Content */}
        {userData && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Panel Access */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <RoleIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {getRoleText(userData.role)} Paneli
                  </h2>
                  <p className="text-blue-100 mt-1">
                    Özelliklerinize erişmek için panele gidin
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {getRoleFeatures(userData.role).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-blue-100">
                    <span className="text-lg">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={navigateToPanel}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm border border-white/30"
              >
                <span>Panele Git</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                Hızlı İşlemler
              </h3>
              <div className="space-y-4">
                {userData?.role === 'teacher' && (
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <User className="h-5 w-5" />
                    <span>Yeni Öğrenci Ekle</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Mail className="h-5 w-5" />
                  <span>Giriş Sayfası</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home; 