# Öğrenci Takip Sistemi

React + Firebase + TailwindCSS kullanılarak geliştirilmiş modern bir öğrenci takip sistemi.

## 🚀 Özellikler

### 🔐 Kimlik Doğrulama Sistemi
- **Giriş Formu** (`/login`): Email ve şifre ile giriş
- **Kayıt Formu** (`/register`): Email, şifre, ad soyad ve rol seçimi ile kayıt
- **Otomatik Yönlendirme**: Başarılı giriş/kayıt sonrası ana sayfaya yönlendirme
- **Hata Yönetimi**: Kullanıcı dostu hata mesajları

### 👥 Kullanıcı Rolleri
- **Öğrenci**: Akademik performans takibi
- **Koç (Öğretmen)**: Öğrenci yönetimi ve değerlendirme
- **Veli**: Çocuklarının performansını takip etme
- **Yönetici**: Sistem yönetimi ve genel kontrol

### 🎨 Tasarım
- **Modern UI**: TailwindCSS ile sade ve şık tasarım
- **Responsive**: Mobil uyumlu tasarım
- **Gradient Arka Planlar**: Görsel olarak çekici arayüz
- **İkonlar**: Lucide React ikonları ile zenginleştirilmiş

## 🛠 Teknoloji Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router DOM
- **İkonlar**: Lucide React
- **State Management**: React Context API

## 📦 Kurulum

1. **Projeyi klonlayın**
```bash
git clone <repository-url>
cd ogrenci-takip
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Firebase yapılandırması**
   - Firebase Console'da yeni proje oluşturun
   - Authentication'ı etkinleştirin (Email/Password)
   - Firestore Database'i oluşturun
   - `src/firebase.ts` dosyasındaki yapılandırma bilgilerini güncelleyin

4. **Projeyi çalıştırın**
```bash
npm start
```

## 🔧 Firebase Kurulumu

### 1. Firebase Console'da Proje Oluşturma
1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. "Add project" butonuna tıklayın
3. Proje adını girin ve "Create project" butonuna tıklayın

### 2. Authentication Kurulumu
1. Sol menüden "Authentication" seçin
2. "Get started" butonuna tıklayın
3. "Sign-in method" sekmesinde "Email/Password" sağlayıcısını etkinleştirin

### 3. Firestore Database Kurulumu
1. Sol menüden "Firestore Database" seçin
2. "Create database" butonuna tıklayın
3. "Start in test mode" seçeneğini seçin
4. Veritabanı konumunu seçin

### 4. Yapılandırma Bilgilerini Alma
1. Proje ayarlarına gidin (⚙️ dişli simgesi)
2. "Genel" sekmesinde aşağıya kaydırın
3. "Firebase SDK snippet" bölümünde "Config" seçeneğini seçin
4. JavaScript/TypeScript formatını seçin
5. Bu bilgileri `src/firebase.ts` dosyasına kopyalayın

## 📁 Proje Yapısı

```
src/
├── components/
│   ├── Login.tsx          # Giriş formu
│   ├── Register.tsx       # Kayıt formu
│   ├── Home.tsx           # Ana sayfa
│   ├── Layout.tsx         # Sayfa düzeni
│   ├── AdminDashboard.tsx # Yönetici paneli
│   ├── CoachDashboard.tsx # Koç paneli
│   ├── StudentDashboard.tsx # Öğrenci paneli
│   └── ParentDashboard.tsx # Veli paneli
├── contexts/
│   └── AuthContext.tsx    # Kimlik doğrulama context'i
├── types/
│   └── index.ts           # TypeScript tip tanımları
├── firebase.ts            # Firebase yapılandırması
├── App.tsx                # Ana uygulama bileşeni
└── index.tsx              # Uygulama giriş noktası
```

## 🔐 Güvenlik

- Firebase Authentication ile güvenli kimlik doğrulama
- Firestore güvenlik kuralları ile veri koruması
- Client-side form validasyonu
- Şifre görünürlük kontrolü

## 🎯 Kullanım

1. **Kayıt Olma**: `/register` sayfasından yeni hesap oluşturun
2. **Giriş Yapma**: `/login` sayfasından hesabınıza giriş yapın
3. **Ana Sayfa**: Başarılı giriş sonrası kullanıcı bilgilerinizi görüntüleyin
4. **Çıkış Yapma**: Ana sayfadaki "Çıkış Yap" butonunu kullanın

## 🚀 Geliştirme

Projeyi geliştirmek için:

```bash
# Geliştirme sunucusunu başlatın
npm start

# Production build oluşturun
npm run build

# Testleri çalıştırın
npm test
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

Sorularınız için issue açabilir veya iletişime geçebilirsiniz. 