export type UserRole = 'student' | 'teacher' | 'parent' | 'admin' | 'coach';
export type StudentStatus = 'active' | 'on_break' | 'graduated' | 'dropped' | 'inactive';
export type PackageType = 'trial' | 'starter' | 'professional' | 'enterprise';

export interface Package {
  type: PackageType;
  name: string;
  studentLimit: number; // -1 for unlimited
  price: number;
  features: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  teacherId?: string; // Öğrenci için
  adminId?: string; // Öğretmen için
  coachId?: string; // Öğrenci için koç ID'si
  studentId?: string; // Veli için
  username?: string; // Öğrenci için kullanıcı adı
  phone?: string; // Telefon numarası
  parentName?: string; // Veli adı soyadı
  parentPhone?: string; // Veli telefonu
  
  // Öğrenci yönetimi için yeni alanlar
  status?: StudentStatus; // Öğrenci durumu
  teacherNotes?: string; // Öğretmenin özel notları
  lastActivity?: Date; // Son aktivite tarihi
  isActive?: boolean; // Aktif/pasif durumu
  pauseReason?: string; // Ara verme nedeni
  graduationDate?: Date; // Mezuniyet tarihi
  updatedAt?: Date; // Son güncelleme tarihi
  updatedBy?: string; // Kim tarafından güncellendi
  deletedAt?: Date; // Silinme tarihi
  deletedBy?: string; // Kim tarafından silindi
  
  // Hesap engelleme sistemi
  isBlocked?: boolean; // Hesap engellenmiş mi?
  blockReason?: string; // Engelleme nedeni
  blockedAt?: Date; // Engellenme tarihi
  blockedBy?: string; // Kim tarafından engellendi
  
  // Paket sistemi (öğretmenler için)
  package?: PackageType; // Hangi paketi kullanıyor
  packageStartDate?: Date; // Paket başlangıç tarihi
  packageEndDate?: Date; // Paket bitiş tarihi
  studentLimit?: number; // Kaç öğrenci ekleyebilir
  isTrialActive?: boolean; // Deneme paketi aktif mi?
  trialStartDate?: Date; // Deneme başlangıç tarihi
  trialEndDate?: Date; // Deneme bitiş tarihi
}

export interface Task {
  id: string;
  studentId: string;
  teacherId: string;
  title: string;
  description: string;
  subject: string;
  date: Date;
  priority: 'low' | 'normal' | 'high';
  isCompleted: boolean;
  createdAt: Date;
}

export interface Exam {
  id: string;
  studentId: string;
  teacherId: string;
  name: string;
  type: 'TYT' | 'AYT';
  field?: 'MF' | 'TM' | 'TS' | 'DİL'; // AYT için alan seçimi
  subject?: string; // Genel ders bilgisi
  date: Date;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  score: number;
  isAnalyzed?: boolean; // Analiz durumu
  // TYT için ders bazlı detaylar
  tytDetails?: {
    turkce: { correct: number; wrong: number; total: number };
    matematik: { correct: number; wrong: number; total: number };
    // Fen Bilimleri alt dersleri
    fen: {
      fizik: { correct: number; wrong: number; total: number };
      kimya: { correct: number; wrong: number; total: number };
      biyoloji: { correct: number; wrong: number; total: number };
      total: { correct: number; wrong: number; total: number };
    };
    // Sosyal Bilimler alt dersleri
    sosyal: {
      tarih: { correct: number; wrong: number; total: number };
      cografya: { correct: number; wrong: number; total: number };
      felsefe: { correct: number; wrong: number; total: number };
      din: { correct: number; wrong: number; total: number };
      total: { correct: number; wrong: number; total: number };
    };
  };
  // AYT için ders bazlı detaylar
  aytDetails?: {
    MF?: {
      matematik: { correct: number; wrong: number; total: number };
      fizik: { correct: number; wrong: number; total: number };
      kimya: { correct: number; wrong: number; total: number };
      biyoloji: { correct: number; wrong: number; total: number };
    };
    TM?: {
      matematik: { correct: number; wrong: number; total: number };
      turkce: { correct: number; wrong: number; total: number };
      tarih: { correct: number; wrong: number; total: number };
      cografya: { correct: number; wrong: number; total: number };
    };
    TS?: {
      turkce: { correct: number; wrong: number; total: number };
      tarih1: { correct: number; wrong: number; total: number };
      cografya1: { correct: number; wrong: number; total: number };
      tarih2: { correct: number; wrong: number; total: number };
      cografya2: { correct: number; wrong: number; total: number };
      felsefe: { correct: number; wrong: number; total: number };
      din: { correct: number; wrong: number; total: number };
    };
    DİL?: {
      ingilizce: { correct: number; wrong: number; total: number };
    };
  };
  createdAt: Date;
}

// Öğretmen yorum sistemi için yeni tipler
export interface ExamComment {
  id: string;
  examId: string;
  teacherId: string;
  teacherName: string;
  comment: string;
  subject?: string; // Hangi ders için yorum yapıldığı
  rating?: 1 | 2 | 3 | 4 | 5; // Öğretmenin değerlendirmesi
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamShare {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  shareCode: string; // Benzersiz paylaşım kodu
  isActive: boolean;
  expiresAt?: Date; // Paylaşımın geçerlilik süresi
  createdAt: Date;
}

// Yeni eklenen tipler
export interface StudyProgram {
  id: string;
  studentId: string;
  teacherId: string;
  weekStart: Date;
  weekEnd: Date;
  tasks: {
    day: string;
    subjects: string[];
    tasks: string;
  }[];
  createdAt: Date;
}

export interface QuestionTracking {
  id: string;
  studentId: string;
  teacherId: string;
  date: Date;
  subjects: {
    matematik: { correct: number; wrong: number; empty: number };
    fizik: { correct: number; wrong: number; empty: number };
    kimya: { correct: number; wrong: number; empty: number };
    biyoloji: { correct: number; wrong: number; empty: number };
    turkce: { correct: number; wrong: number; empty: number };
    tarih: { correct: number; wrong: number; empty: number };
    cografya: { correct: number; wrong: number; empty: number };
    felsefe: { correct: number; wrong: number; empty: number };
    ingilizce: { correct: number; wrong: number; empty: number };
  };
  totalQuestions: number;
  createdAt: Date;
}

export interface ResourceBook {
  id: string;
  studentId: string;
  teacherId: string;
  name: string;
  subject: string;
  totalPages: number;
  completedPages: number;
  startDate: Date;
  targetDate: Date;
  isCompleted: boolean;
  notes?: string;
  createdAt: Date;
}

// YKS Konu Takibi için yeni interface'ler
export interface YKSTopic {
  id: string;
  name: string;
  subject: string;
  examType: 'TYT' | 'AYT' | 'BOTH';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  prerequisites?: string[]; // Ön koşul konular
  description?: string;
}

export interface TopicProgress {
  id: string;
  studentId: string;
  teacherId: string;
  topicId: string;
  topicName: string;
  subject: string;
  examType: 'TYT' | 'AYT' | 'BOTH';
  status: 'not_started' | 'in_progress' | 'completed' | 'review_needed';
  startDate?: Date;
  completedDate?: Date;
  studyHours: number;
  confidenceLevel: 1 | 2 | 3 | 4 | 5; // 1-5 arası güven seviyesi
  notes?: string;
  resources: ResourceBook[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySession {
  id: string;
  studentId: string;
  topicId: string;
  date: Date;
  duration: number; // dakika cinsinden
  notes?: string;
  resources: string[]; // kullanılan kaynaklar
  createdAt: Date;
}

// Öğretmen konu yönetimi için yeni interface
export interface CustomTopic {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  examType: 'TYT' | 'AYT' | 'BOTH';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  description?: string;
  isActive: boolean; // Konunun aktif olup olmadığı
  createdAt: Date;
  updatedAt: Date;
}

// YKS Konuları için sabit veri
export const YKS_TOPICS: YKSTopic[] = [
  // TYT Matematik
  { id: 'tyt_mat_1', name: 'Temel Kavramlar', subject: 'matematik', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_mat_2', name: 'Sayılar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_3', name: 'Rasyonel Sayılar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_4', name: 'Mutlak Değer', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 5 },
  { id: 'tyt_mat_5', name: 'Üslü Sayılar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_6', name: 'Köklü Sayılar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_7', name: 'Çarpanlara Ayırma', subject: 'matematik', examType: 'TYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'tyt_mat_8', name: 'Oran-Orantı', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 5 },
  { id: 'tyt_mat_9', name: 'Problemler', subject: 'matematik', examType: 'TYT', difficulty: 'hard', estimatedHours: 12 },
  { id: 'tyt_mat_10', name: 'Kümeler', subject: 'matematik', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_mat_11', name: 'Fonksiyonlar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_12', name: 'Polinomlar', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_13', name: 'İkinci Dereceden Denklemler', subject: 'matematik', examType: 'TYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'tyt_mat_14', name: 'Parabol', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_15', name: 'Trigonometri', subject: 'matematik', examType: 'TYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'tyt_mat_16', name: 'Logaritma', subject: 'matematik', examType: 'TYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'tyt_mat_17', name: 'Permütasyon-Kombinasyon', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_18', name: 'Olasılık', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_mat_19', name: 'İstatistik', subject: 'matematik', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_mat_20', name: 'Geometri Temel Kavramlar', subject: 'matematik', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_mat_21', name: 'Üçgenler', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 10 },
  { id: 'tyt_mat_22', name: 'Dörtgenler', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_23', name: 'Çember ve Daire', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_24', name: 'Analitik Geometri', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_mat_25', name: 'Katı Cisimler', subject: 'matematik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },

  // TYT Fizik
  { id: 'tyt_fiz_1', name: 'Fizik Bilimine Giriş', subject: 'fizik', examType: 'TYT', difficulty: 'easy', estimatedHours: 3 },
  { id: 'tyt_fiz_2', name: 'Madde ve Özellikleri', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fiz_3', name: 'Hareket ve Kuvvet', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_fiz_4', name: 'Enerji', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_fiz_5', name: 'Isı ve Sıcaklık', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fiz_6', name: 'Elektrik', subject: 'fizik', examType: 'TYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'tyt_fiz_7', name: 'Manyetizma', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fiz_8', name: 'Dalgalar', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fiz_9', name: 'Optik', subject: 'fizik', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },

  // TYT Kimya
  { id: 'tyt_kim_1', name: 'Kimya Bilimi', subject: 'kimya', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_kim_2', name: 'Atom ve Yapısı', subject: 'kimya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_kim_3', name: 'Periyodik Sistem', subject: 'kimya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_kim_4', name: 'Kimyasal Türler Arası Etkileşimler', subject: 'kimya', examType: 'TYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'tyt_kim_5', name: 'Asitler, Bazlar ve Tuzlar', subject: 'kimya', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_kim_6', name: 'Karışımlar', subject: 'kimya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_kim_7', name: 'Endüstride ve Canlılarda Enerji', subject: 'kimya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },

  // TYT Biyoloji
  { id: 'tyt_bio_1', name: 'Biyoloji Bilimi', subject: 'biyoloji', examType: 'TYT', difficulty: 'easy', estimatedHours: 3 },
  { id: 'tyt_bio_2', name: 'Canlıların Yapısı', subject: 'biyoloji', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_bio_3', name: 'Hücre', subject: 'biyoloji', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_bio_4', name: 'Canlıların Çeşitliliği', subject: 'biyoloji', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_bio_5', name: 'Üreme Sistemi', subject: 'biyoloji', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_bio_6', name: 'İnsan ve Çevre', subject: 'biyoloji', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },

  // TYT Türkçe
  { id: 'tyt_tur_1', name: 'Sözcükte Anlam', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tur_2', name: 'Cümlede Anlam', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_tur_3', name: 'Paragraf', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 10 },
  { id: 'tyt_tur_4', name: 'Ses Bilgisi', subject: 'turkce', examType: 'TYT', difficulty: 'easy', estimatedHours: 4 },
  { id: 'tyt_tur_5', name: 'Yazım Kuralları', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tur_6', name: 'Noktalama İşaretleri', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 4 },
  { id: 'tyt_tur_7', name: 'Dil Bilgisi', subject: 'turkce', examType: 'TYT', difficulty: 'hard', estimatedHours: 12 },
  { id: 'tyt_tur_8', name: 'Anlatım Bozuklukları', subject: 'turkce', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },

  // TYT Sosyal Bilimler
  { id: 'tyt_tar_1', name: 'Tarih Bilimi', subject: 'tarih', examType: 'TYT', difficulty: 'easy', estimatedHours: 3 },
  { id: 'tyt_tar_2', name: 'İlk Uygarlıklar', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tar_3', name: 'İlk Türk Devletleri', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tar_4', name: 'İslam Tarihi ve Uygarlığı', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tar_5', name: 'Türk-İslam Devletleri', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_tar_6', name: 'Osmanlı Devleti', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_tar_7', name: 'Atatürk İlkeleri ve İnkılap Tarihi', subject: 'tarih', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },

  { id: 'tyt_cog_1', name: 'Doğal Sistemler', subject: 'cografya', examType: 'TYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'tyt_cog_2', name: 'Beşeri Sistemler', subject: 'cografya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_cog_3', name: 'Mekansal Sentez', subject: 'cografya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_cog_4', name: 'Küresel Ortam', subject: 'cografya', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },

  { id: 'tyt_fel_1', name: 'Felsefenin Konusu', subject: 'felsefe', examType: 'TYT', difficulty: 'medium', estimatedHours: 4 },
  { id: 'tyt_fel_2', name: 'Bilgi Felsefesi', subject: 'felsefe', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fel_3', name: 'Varlık Felsefesi', subject: 'felsefe', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fel_4', name: 'Ahlak Felsefesi', subject: 'felsefe', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'tyt_fel_5', name: 'Din Felsefesi', subject: 'felsefe', examType: 'TYT', difficulty: 'medium', estimatedHours: 6 },

  // AYT Konuları (MF Alanı)
  { id: 'ayt_mat_1', name: 'Limit ve Süreklilik', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_mat_2', name: 'Türev', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 12 },
  { id: 'ayt_mat_3', name: 'İntegral', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 12 },
  { id: 'ayt_mat_4', name: 'Analitik Geometri', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_mat_5', name: 'Vektörler', subject: 'matematik', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_mat_6', name: 'Uzay Geometri', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_mat_7', name: 'Diziler', subject: 'matematik', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_mat_8', name: 'Seriler', subject: 'matematik', examType: 'AYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'ayt_mat_9', name: 'Olasılık', subject: 'matematik', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_mat_10', name: 'İstatistik', subject: 'matematik', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },

  { id: 'ayt_fiz_1', name: 'Vektörler', subject: 'fizik', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_fiz_2', name: 'Bağıl Hareket', subject: 'fizik', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_fiz_3', name: 'Newton\'un Hareket Yasaları', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_4', name: 'İş, Enerji ve Güç', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_5', name: 'İtme ve Momentum', subject: 'fizik', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_fiz_6', name: 'Tork ve Denge', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_7', name: 'Elektrik Alan', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_8', name: 'Manyetik Alan', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_9', name: 'İndüksiyon', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_fiz_10', name: 'Alternatif Akım', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'ayt_fiz_11', name: 'Modern Fizik', subject: 'fizik', examType: 'AYT', difficulty: 'hard', estimatedHours: 12 },

  { id: 'ayt_kim_1', name: 'Kimya Bilimi', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_kim_2', name: 'Atom Modelleri', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_kim_3', name: 'Periyodik Sistem', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_kim_4', name: 'Kimyasal Bağlar', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_kim_5', name: 'Gazlar', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_kim_6', name: 'Sıvı Çözeltiler', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_kim_7', name: 'Kimyasal Tepkimelerde Hız', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_kim_8', name: 'Kimyasal Tepkimelerde Denge', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_kim_9', name: 'Asit-Baz Dengesi', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 10 },
  { id: 'ayt_kim_10', name: 'Çözünürlük Dengesi', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 8 },
  { id: 'ayt_kim_11', name: 'Kimya ve Enerji', subject: 'kimya', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_kim_12', name: 'Organik Kimya', subject: 'kimya', examType: 'AYT', difficulty: 'hard', estimatedHours: 12 },

  { id: 'ayt_bio_1', name: 'Sinir Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_bio_2', name: 'Endokrin Sistem', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_3', name: 'Duyu Organları', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_4', name: 'Destek ve Hareket Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_5', name: 'Sindirim Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_6', name: 'Dolaşım Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_bio_7', name: 'Solunum Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_8', name: 'Boşaltım Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 6 },
  { id: 'ayt_bio_9', name: 'Üreme Sistemi', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_bio_10', name: 'Genetik', subject: 'biyoloji', examType: 'AYT', difficulty: 'hard', estimatedHours: 12 },
  { id: 'ayt_bio_11', name: 'Ekoloji', subject: 'biyoloji', examType: 'AYT', difficulty: 'medium', estimatedHours: 8 },
  { id: 'ayt_bio_12', name: 'Güncel Çevre Sorunları', subject: 'biyoloji', examType: 'AYT', difficulty: 'easy', estimatedHours: 4 }
];

export interface StudentStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  examStats: {
    TYT: Exam[];
    AYT: Exam[];
  };
  studyPrograms: StudyProgram[];
  questionTracking: QuestionTracking[];
  resourceBooks: ResourceBook[];
}

// Paket tanımları
export const PACKAGES: Package[] = [
  {
    type: 'trial',
    name: '24 Saat Deneme',
    studentLimit: 3,
    price: 0,
    features: [
      '3 Öğrenci',
      '24 Saat Geçerli',
      'Tüm Özellikler',
      'Otomatik İptal'
    ]
  },
  {
    type: 'starter',
    name: 'Başlangıç',
    studentLimit: 10,
    price: 99,
    features: [
      '10 Öğrenci',
      'Temel Raporlar',
      'Görev Yönetimi',
      'Deneme Takibi'
    ]
  },
  {
    type: 'professional',
    name: 'Profesyonel',
    studentLimit: 30,
    price: 199,
    features: [
      '30 Öğrenci',
      'Gelişmiş Raporlar',
      'Konu Takibi',
      'Analiz Grafikleri',
      'Veli Bildirimleri'
    ]
  },
  {
    type: 'enterprise',
    name: 'Kurumsal',
    studentLimit: -1, // Sınırsız
    price: 399,
    features: [
      'Sınırsız Öğrenci',
      'Tüm Özellikler',
      'Öncelikli Destek',
      'Özel Eğitim',
      'API Erişimi'
    ]
  }
];

// Yeni öğrenci takip sistemi için modeller

export interface QuestionSession {
  id: string;
  studentId: string;
  date: Date;
  subject: string; // matematik, fizik, kimya, etc.
  examType: 'TYT' | 'AYT'; 
  topic?: string; // konu (isteğe bağlı)
  
  // Soru çözme verileri
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  
  // Takip verileri
  reviewedWrongQuestions: boolean; // Yanlışlara döndü mü?
  reviewedBlankQuestions: boolean; // Boş bıraktıklarına baktı mı?
  timeSpent: number; // dakika cinsinden
  
  // Notlar
  studentNotes?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamAnalysis {
  id: string;
  studentId: string;
  examId: string; // Exam tablosundaki ID'ye referans
  
  // Analiz durumu
  analysisCompleted: boolean; // Analiz yaptı mı?
  analysisDate?: Date;
  
  // Ders bazlı detaylı analiz (yeni sistem)
  subjectAnalysis: {
    [subject: string]: {
      wrongCount: number; // Bu derste kaç yanlış
      blankCount: number; // Bu derste kaç boş
      reviewedWrong: boolean; // Yanlışları gözden geçirdi mi?
      reviewedBlank: boolean; // Boşları gözden geçirdi mi?
      solvedWithTeacher: number; // Öğretmen ile kaç soru çözdü
    };
  };
  
  // Genel özet (hesaplanmış)
  wrongQuestionCount: number; // Toplam yanlış (hesaplanır)
  blankQuestionCount: number; // Toplam boş (hesaplanır)
  reviewedWrongQuestions: boolean; // Tüm yanlışları gözden geçirdi mi?
  reviewedBlankQuestions: boolean; // Tüm boşları gözden geçirdi mi?
  wrongQuestionsReviewDate?: Date;
  blankQuestionsReviewDate?: Date;
  
  // Öğretmen ile çözüm
  solvedWithTeacherCount: number; // Toplam öğretmen ile çözülen
  askedTeacherForHelp: boolean; // Öğretmenden yardım istedi mi?
  teacherHelpDate?: Date;
  
  // Gelişim hedefleri (deprecated - artık kullanılmayacak)
  targetImprovements: string[]; // ['matematik zayıf', 'fizik orta']
  actionPlan?: string; // Öğrencinin planı
  
  // Analiz tamamlanma oranı
  completionPercentage: number; // 0-100 arası analiz tamamlanma yüzdesi
  
  // Öğretmen geri bildirimi
  teacherFeedback?: string;
  teacherSeen: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyActivity {
  id: string;
  studentId: string;
  date: Date;
  type: 'question_solving' | 'exam_analysis' | 'review' | 'study_plan';
  
  // Aktivite detayları
  subject?: string;
  duration: number; // dakika
  description: string;
  
  // Performans
  completed: boolean;
  effectiveness: 1 | 2 | 3 | 4 | 5; // 1-5 arası verimlilik
  
  // Öğretmen görünürlüğü
  teacherVisible: boolean;
  
  createdAt: Date;
}

export interface StudentMetrics {
  id: string;
  studentId: string;
  date: Date; // Haftalık metrikleri tutmak için
  
  // Soru çözme metrikleri
  totalQuestionsSolved: number;
  averageAccuracy: number; // %0-100
  reviewCompletionRate: number; // Yanlışları gözden geçirme oranı
  
  // Deneme metrikleri
  examsCompleted: number;
  analysisCompletionRate: number; // Deneme analizi tamamlama oranı
  improvementTrend: 'up' | 'down' | 'stable';
  
  // Çalışma alışkanlıkları
  dailyStudyTime: number; // dakika
  consistencyScore: number; // 0-100 düzenlilik skoru
  
  // Öğretmen değerlendirmesi
  teacherRating?: 1 | 2 | 3 | 4 | 5;
  teacherNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Grafik verileri için yardımcı tipler
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PerformanceChart {
  accuracy: ChartDataPoint[];
  questionCount: ChartDataPoint[];
  studyTime: ChartDataPoint[];
  examProgress: ChartDataPoint[];
}

export interface StudentDashboardData {
  questionSessions: QuestionSession[];
  examAnalyses: ExamAnalysis[];
  studyActivities: StudyActivity[];
  metrics: StudentMetrics[];
  chartData: PerformanceChart;
}

export interface TeacherStudentOverview {
  student: User;
  recentActivity: StudyActivity[];
  currentMetrics: StudentMetrics;
  pendingReviews: number; // Gözden geçirilmesi gereken items
  lastEngagement: Date; // Son etkileşim
} 