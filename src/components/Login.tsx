import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, EyeOff, AlertTriangle, X, User, Rocket } from 'lucide-react';

const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedInfo, setBlockedInfo] = useState<{reason: string; blockedAt?: Date} | null>(null);
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);

  const { login, startTeacherTrial } = useAuth();
  const [showTrial, setShowTrial] = useState(false);
  const [trialName, setTrialName] = useState('');
  const [trialUsername, setTrialUsername] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPassword, setTrialPassword] = useState('');
  useEffect(() => {
    if (!showTrial) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowTrial(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showTrial]);

  // Modal her açıldığında alanları sıfırla
  useEffect(() => {
    if (showTrial) {
      setTrialName('');
      setTrialUsername('');
      setTrialEmail('');
      setTrialPassword('');
      setError('');
    }
  }, [showTrial]);

  useEffect(() => {
    // Engellenen kullanıcı bilgisini kontrol et
    const blockedUserInfo = localStorage.getItem('blockedUserInfo');
    if (blockedUserInfo) {
      try {
        setBlockedInfo(JSON.parse(blockedUserInfo));
      } catch (e) {
        console.error('Error parsing blocked user info:', e);
      }
    }

    // Silinen kullanıcı bilgisini kontrol et
    const deletedUserInfo = localStorage.getItem('deletedUserInfo');
    if (deletedUserInfo) {
      setShowDeletedMessage(true);
    }
  }, []);

  const clearBlockedInfo = () => {
    localStorage.removeItem('blockedUserInfo');
    setBlockedInfo(null);
  };

  const clearDeletedMessage = () => {
    localStorage.removeItem('deletedUserInfo');
    setShowDeletedMessage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(emailOrUsername, password);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Giriş Yap
            </h1>
            <p className="text-gray-600">
              Hesabınıza giriş yapın
            </p>
          </div>

          {/* Engellenen kullanıcı uyarısı */}
          {blockedInfo && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-orange-800 mb-1">
                      Hesabınız Engellenmiştir
                    </h3>
                    <p className="text-sm text-orange-700 mb-2">
                      {blockedInfo.reason}
                    </p>
                    <p className="text-xs text-orange-600">
                      Lütfen yönetici ile iletişime geçiniz.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearBlockedInfo}
                  className="text-orange-400 hover:text-orange-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Silinen kullanıcı uyarısı */}
          {showDeletedMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Hesap Bulunamadı
                    </h3>
                    <p className="text-sm text-red-700 mb-2">
                      Hesabınız sistem yöneticisi tarafından kaldırılmış olabilir.
                    </p>
                    <p className="text-xs text-red-600">
                      Lütfen yönetici ile iletişime geçiniz.
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearDeletedMessage}
                  className="text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta veya Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ornek@ogrencitakip.com veya kullaniciadi"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowTrial(true)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 via-rose-600 to-violet-600 hover:from-fuchsia-700 hover:via-rose-700 hover:to-violet-700 text-white font-semibold py-3 px-5 rounded-xl shadow-lg ring-1 ring-black/10 active:scale-[0.98] transition"
            >
              <Rocket className="h-4 w-4" /> 3 Günlük Denemeyi Başlat (Öğretmen)
            </button>
          </div>
        </div>
    {showTrial && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTrial(false); }}>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">👨‍🏫 Öğretmen Denemesi</h3>
            <button onClick={() => setShowTrial(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <p className="text-sm text-gray-600 mb-4">3 gün boyunca tüm özellikleri ücretsiz deneyin.</p>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            try {
              setLoading(true);
              await startTeacherTrial(trialName, trialUsername, trialEmail, trialPassword);
            } catch (err: any) {
              setError(err.message || 'Deneme başlatılamadı');
            } finally {
              setLoading(false);
            }
          }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
              <input value={trialName} onChange={(e) => setTrialName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Adınız Soyadınız" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
              <input value={trialUsername} onChange={(e) => setTrialUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="kullaniciadi" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input type="email" value={trialEmail} onChange={(e) => setTrialEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="ornek@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input type="password" value={trialPassword} onChange={(e) => setTrialPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="En az 6 karakter" required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 hover:from-cyan-600 hover:via-sky-700 hover:to-blue-800 text-white py-2.5 rounded-xl shadow-lg ring-1 ring-black/10 disabled:opacity-50 active:scale-[0.98] transition">
                <Rocket className="h-4 w-4" /> Hemen Başlat
              </button>
              <button type="button" onClick={() => setShowTrial(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl">İptal</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Deneme: 3 gün • Öğrenci limiti: 5 • Süre sonunda otomatik pasifleşir</p>
          </form>
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

export default Login; 