import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Exam, YKS_TOPICS, TopicProgress, StudySession, ResourceBook, CustomTopic, QuestionSession, ExamAnalysis, StudyActivity, StudentMetrics, ChartDataPoint } from '../types';
import { 
  BookOpen, 
  FileText, 
  BarChart3, 
  Plus,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Target,
  BookMarked,
  GraduationCap,
  Lightbulb,
  Star,
  Clock,
  Edit,
  Trash2,
  Eye,
  Activity,
  Calculator,
  PenTool,
  CheckSquare,
  RotateCcw,
  Timer,
  Brain,
  Home,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Toast from './Toast';

const TeacherDashboard: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [questionTracking, setQuestionTracking] = useState<any[]>([]);
  const [questionSessions, setQuestionSessions] = useState<QuestionSession[]>([]);
  const [examAnalyses, setExamAnalyses] = useState<ExamAnalysis[]>([]);
  const [studyActivities, setStudyActivities] = useState<StudyActivity[]>([]);
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [resourceBooks, setResourceBooks] = useState<ResourceBook[]>([]);
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(() => {
    // Page refresh'te selectedStudent'ı localStorage'dan restore et
    const saved = localStorage.getItem('teacher_selected_student');
    return saved ? JSON.parse(saved) : null;
  });

  // Weekly Program states
  const [weeklyPrograms, setWeeklyPrograms] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Page refresh'te selectedWeek'i localStorage'dan restore et
    const saved = localStorage.getItem('teacher_selected_week');
    return saved ? new Date(saved) : new Date();
  });
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  
  // Öğrenci/Veli Ekleme Modal State'leri
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    packageType: 'basic' as 'basic' | 'standard' | 'premium'
  });
  const [parentForm, setParentForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: ''
  });

  // Konu Takibi State'leri
  const [showCustomTopicModal, setShowCustomTopicModal] = useState(false);
  const [customTopicForm, setCustomTopicForm] = useState({
    name: '',
    subject: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });
  const [activityForm, setActivityForm] = useState({
    day: '',
    time: '',
    subject: '',
    topic: '',
    type: 'konu' as 'konu' | 'test' | 'deneme' | 'tekrar' | 'analiz'
  });
  const [activityStatuses, setActivityStatuses] = useState<{[key: string]: 'todo' | 'doing' | 'done'}>({});

  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'studyProgram' | 'studentManagement' | 'topicTracking' | 'exams' | 'questionTracking' | 'analytics' | 'charts' | 'examAnalysis'>('overview');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('');

  // Deneme ekleme form state
  const [showExamModal, setShowExamModal] = useState(false);
  const [showExamViewModal, setShowExamViewModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  
  // Modal state optimization - will be defined after all modal states are declared
  const [examForm, setExamForm] = useState({
    name: '',
    type: 'TYT' as 'TYT' | 'AYT',
    field: 'MF' as 'MF' | 'TM' | 'TS' | 'DİL',
    date: new Date().toISOString().split('T')[0],
    correctAnswers: 0,
    wrongAnswers: 0,
    totalQuestions: 0,
    score: 0,
    // TYT için ders bazlı detaylar
    tytDetails: {
      turkce: { correct: 0, wrong: 0, total: 40 },
      matematik: { correct: 0, wrong: 0, total: 40 },
      // Fen Bilimleri alt dersleri
      fen: {
        fizik: { correct: 0, wrong: 0, total: 7 },
        kimya: { correct: 0, wrong: 0, total: 7 },
        biyoloji: { correct: 0, wrong: 0, total: 6 },
        total: { correct: 0, wrong: 0, total: 20 }
      },
      // Sosyal Bilimler alt dersleri
      sosyal: {
        tarih: { correct: 0, wrong: 0, total: 5 },
        cografya: { correct: 0, wrong: 0, total: 5 },
        felsefe: { correct: 0, wrong: 0, total: 5 },
        din: { correct: 0, wrong: 0, total: 5 },
        total: { correct: 0, wrong: 0, total: 20 }
      }
    },
    // AYT için alan bazlı detaylar
    aytDetails: {
      // Sayısal (SAY) - 80 soru
      MF: {
        matematik: { correct: 0, wrong: 0, total: 40 },
        fizik: { correct: 0, wrong: 0, total: 14 },
        kimya: { correct: 0, wrong: 0, total: 13 },
        biyoloji: { correct: 0, wrong: 0, total: 13 }
      },
      // Eşit Ağırlık (EA) - 80 soru
      TM: {
        matematik: { correct: 0, wrong: 0, total: 40 },
        turkce: { correct: 0, wrong: 0, total: 24 },
        tarih: { correct: 0, wrong: 0, total: 10 },
        cografya: { correct: 0, wrong: 0, total: 6 }
      },
      // Sözel (SÖZ) - 80 soru
      TS: {
        turkce: { correct: 0, wrong: 0, total: 24 },
        tarih1: { correct: 0, wrong: 0, total: 10 },
        cografya1: { correct: 0, wrong: 0, total: 6 },
        tarih2: { correct: 0, wrong: 0, total: 11 },
        cografya2: { correct: 0, wrong: 0, total: 11 },
        felsefe: { correct: 0, wrong: 0, total: 12 },
        din: { correct: 0, wrong: 0, total: 6 }
      },
      // Dil (YDT) - 80 soru
      DİL: {
        ingilizce: { correct: 0, wrong: 0, total: 80 }
      }
    }
  });

  // Soru takibi form state
  const [showQuestionTrackingModal, setShowQuestionTrackingModal] = useState(false);
  
  // Konu takibi modal state'leri
  const [showTopicProgressModal, setShowTopicProgressModal] = useState(false);
  const [showStudySessionModal, setShowStudySessionModal] = useState(false);
  const [showResourceBookModal, setShowResourceBookModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  // Konu takibi form state'leri
  const [topicProgressForm, setTopicProgressForm] = useState({
    topicId: '',
    topicName: '',
    subject: '',
    examType: 'TYT' as 'TYT' | 'AYT' | 'BOTH',
    status: 'not_started' as 'not_started' | 'in_progress' | 'completed' | 'review_needed',
    studyHours: 0,
    confidenceLevel: 3 as 1 | 2 | 3 | 4 | 5,
    notes: ''
  });

  const [studySessionForm, setStudySessionForm] = useState({
    topicId: '',
    date: new Date().toISOString().split('T')[0],
    duration: 0,
    notes: '',
    resources: [] as string[]
  });

  const [resourceBookForm, setResourceBookForm] = useState({
    name: '',
    subject: '',
    totalPages: 0,
    completedPages: 0,
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [questionTrackingForm, setQuestionTrackingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    subjects: {
      matematik: [],
      fizik: [],
      kimya: [],
      biyoloji: [],
      turkce: [],
      tarih: [],
      cografya: [],
      felsefe: [],
      ingilizce: []
    }
  });

  // Yeni soru takibi formu (QuestionSession için)
  const [dailyQuestionForm, setDailyQuestionForm] = useState({
    subject: 'matematik',
    examType: 'TYT' as 'TYT' | 'AYT',
    topic: '',
    correctAnswers: '' as string | number,
    wrongAnswers: '' as string | number,
    blankAnswers: '' as string | number,
    reviewedWrongQuestions: false,
    reviewedBlankQuestions: false,
    timeSpent: 0,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    studentNotes: '',
    date: new Date().toISOString().split('T')[0] // Bugünün tarihi varsayılan
  });

  // Günlük kayıt gruplarının açık/kapalı durumu
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Toplam soru sayısını memoize et
  const totalQuestions = useMemo(() => {
    const correct = Number(dailyQuestionForm.correctAnswers) || 0;
    const wrong = Number(dailyQuestionForm.wrongAnswers) || 0;
    const blank = Number(dailyQuestionForm.blankAnswers) || 0;
    return correct + wrong + blank;
  }, [dailyQuestionForm.correctAnswers, dailyQuestionForm.wrongAnswers, dailyQuestionForm.blankAnswers]);

  // Form handler'larını optimize et
  const handleFormChange = useCallback((field: string, value: any) => {
    setDailyQuestionForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Form reset fonksiyonu
  const resetDailyQuestionForm = useCallback(() => {
    setDailyQuestionForm({
      subject: 'matematik',
      examType: 'TYT',
      topic: '',
      correctAnswers: '',
      wrongAnswers: '',
      blankAnswers: '',
      reviewedWrongQuestions: false,
      reviewedBlankQuestions: false,
      timeSpent: 0,
      difficulty: 'medium',
      studentNotes: '',
      date: new Date().toISOString().split('T')[0]
    });
  }, []);

  // Modal kapatma fonksiyonu (ESC ve X butonu için)
  const closeDailyQuestionModal = useCallback(() => {
    setShowDailyQuestionModal(false);
    resetDailyQuestionForm();
  }, [resetDailyQuestionForm]);



  // Sadece question sessions'ı yenile (performans için)
  const loadQuestionSessionsOnly = useCallback(async () => {
    try {
      if (!userData?.id) return;

      // Question sessions'ı yenile
      const questionSessionsQuery = query(
        collection(db, 'questionSessions'),
        where('studentId', '==', userData.id)
      );
      const questionSessionsSnapshot = await getDocs(questionSessionsQuery);
      const questionSessionsData = questionSessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date instanceof Date ? doc.data().date : (doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)),
        updatedAt: doc.data().updatedAt instanceof Date ? doc.data().updatedAt : (doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt))
      })) as QuestionSession[];
      setQuestionSessions(questionSessionsData);

      // Study activities'i yenile
      const studyActivitiesQuery = query(
        collection(db, 'studyActivities'),
        where('studentId', '==', userData.id)
      );
      const studyActivitiesSnapshot = await getDocs(studyActivitiesQuery);
      const studyActivitiesData = studyActivitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date instanceof Date ? doc.data().date : (doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt))
      })) as StudyActivity[];
      setStudyActivities(studyActivitiesData);

    } catch (error) {
      console.error('Question sessions yüklenirken hata:', error);
    }
  }, [userData]);

  // Exam seçildiğinde ders bazlı detayları otomatik çek
  const loadExamDetailsForAnalysis = useCallback((examId: string) => {
    const selectedExam = exams.find(exam => exam.id === examId);
    if (!selectedExam) return;

    console.log('Selected Exam for Analysis:', selectedExam); // Debug log

    const subjectAnalysis: { [subject: string]: {
      wrongCount: number;
      blankCount: number;
      reviewedWrong: boolean;
      reviewedBlank: boolean;
      solvedWithTeacher: number;
    }} = {};

    // Eğer exam'de TYT/AYT detayları yoksa, genel wrongAnswers/totalQuestions'dan ders dağılımı yap
    if (selectedExam.type === 'TYT' && selectedExam.tytDetails) {
      const details = selectedExam.tytDetails;
      console.log('TYT Details:', details); // Debug log
      
      // Türkçe
      const turkceBlankCount = details.turkce.total - details.turkce.correct - details.turkce.wrong;
      console.log('Türkçe analizi:', {
        correct: details.turkce.correct,
        wrong: details.turkce.wrong, 
        total: details.turkce.total,
        calculated_blank: turkceBlankCount
      });
      
      if (details.turkce.wrong > 0 || turkceBlankCount > 0) {
        subjectAnalysis['Türkçe'] = {
          wrongCount: details.turkce.wrong,
          blankCount: Math.max(0, turkceBlankCount),
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      // Matematik  
      const matematikBlankCount = details.matematik.total - details.matematik.correct - details.matematik.wrong;
      console.log('Matematik analizi:', {
        correct: details.matematik.correct,
        wrong: details.matematik.wrong,
        total: details.matematik.total,
        calculated_blank: matematikBlankCount
      });
      
      if (details.matematik.wrong > 0 || matematikBlankCount > 0) {
        subjectAnalysis['Matematik'] = {
          wrongCount: details.matematik.wrong,
          blankCount: Math.max(0, matematikBlankCount),
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      // Fen Bilimleri alt dersleri
      if (details.fen.fizik.wrong > 0 || (details.fen.fizik.total - details.fen.fizik.correct - details.fen.fizik.wrong) > 0) {
        subjectAnalysis['Fizik'] = {
          wrongCount: details.fen.fizik.wrong,
          blankCount: details.fen.fizik.total - details.fen.fizik.correct - details.fen.fizik.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      if (details.fen.kimya.wrong > 0 || (details.fen.kimya.total - details.fen.kimya.correct - details.fen.kimya.wrong) > 0) {
        subjectAnalysis['Kimya'] = {
          wrongCount: details.fen.kimya.wrong,
          blankCount: details.fen.kimya.total - details.fen.kimya.correct - details.fen.kimya.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      if (details.fen.biyoloji.wrong > 0 || (details.fen.biyoloji.total - details.fen.biyoloji.correct - details.fen.biyoloji.wrong) > 0) {
        subjectAnalysis['Biyoloji'] = {
          wrongCount: details.fen.biyoloji.wrong,
          blankCount: details.fen.biyoloji.total - details.fen.biyoloji.correct - details.fen.biyoloji.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      // Sosyal Bilimler alt dersleri
      if (details.sosyal.tarih.wrong > 0 || (details.sosyal.tarih.total - details.sosyal.tarih.correct - details.sosyal.tarih.wrong) > 0) {
        subjectAnalysis['Tarih'] = {
          wrongCount: details.sosyal.tarih.wrong,
          blankCount: details.sosyal.tarih.total - details.sosyal.tarih.correct - details.sosyal.tarih.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      if (details.sosyal.cografya.wrong > 0 || (details.sosyal.cografya.total - details.sosyal.cografya.correct - details.sosyal.cografya.wrong) > 0) {
        subjectAnalysis['Coğrafya'] = {
          wrongCount: details.sosyal.cografya.wrong,
          blankCount: details.sosyal.cografya.total - details.sosyal.cografya.correct - details.sosyal.cografya.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      if (details.sosyal.felsefe.wrong > 0 || (details.sosyal.felsefe.total - details.sosyal.felsefe.correct - details.sosyal.felsefe.wrong) > 0) {
        subjectAnalysis['Felsefe'] = {
          wrongCount: details.sosyal.felsefe.wrong,
          blankCount: details.sosyal.felsefe.total - details.sosyal.felsefe.correct - details.sosyal.felsefe.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }

      if (details.sosyal.din.wrong > 0 || (details.sosyal.din.total - details.sosyal.din.correct - details.sosyal.din.wrong) > 0) {
        subjectAnalysis['Din Kültürü'] = {
          wrongCount: details.sosyal.din.wrong,
          blankCount: details.sosyal.din.total - details.sosyal.din.correct - details.sosyal.din.wrong,
          reviewedWrong: false,
          reviewedBlank: false,
          solvedWithTeacher: 0
        };
      }
    }

    if (selectedExam.type === 'AYT' && selectedExam.aytDetails && selectedExam.field) {
      const field = selectedExam.field;
      const details = selectedExam.aytDetails[field];

      if (details) {
        Object.entries(details).forEach(([subject, data]) => {
          const subjectName = subject === 'matematik' ? 'Matematik' :
                             subject === 'fizik' ? 'Fizik' :
                             subject === 'kimya' ? 'Kimya' :
                             subject === 'biyoloji' ? 'Biyoloji' :
                             subject === 'turkce' ? 'Türkçe' :
                             subject === 'tarih' ? 'Tarih' :
                             subject === 'cografya' ? 'Coğrafya' :
                             subject === 'tarih1' ? 'Tarih-1' :
                             subject === 'cografya1' ? 'Coğrafya-1' :
                             subject === 'tarih2' ? 'Tarih-2' :
                             subject === 'cografya2' ? 'Coğrafya-2' :
                             subject === 'felsefe' ? 'Felsefe' :
                             subject === 'din' ? 'Din Kültürü' :
                             subject === 'ingilizce' ? 'İngilizce' : subject;

          if (data.wrong > 0 || (data.total - data.correct - data.wrong) > 0) {
            subjectAnalysis[subjectName] = {
              wrongCount: data.wrong,
              blankCount: data.total - data.correct - data.wrong,
              reviewedWrong: false,
              reviewedBlank: false,
              solvedWithTeacher: 0
            };
          }
        });
      }
    }

    // Eğer hiç ders bazlı detay bulunamadıysa, genel exam verilerinden yaklaşık dağılım yap
    if (Object.keys(subjectAnalysis).length === 0 && (selectedExam.wrongAnswers > 0 || (selectedExam.totalQuestions - selectedExam.correctAnswers - selectedExam.wrongAnswers) > 0)) {
      console.log('No subject details found, creating general analysis from exam totals'); // Debug log
      
      // Genel yanlış ve boş sayıları hesapla
      const totalWrong = selectedExam.wrongAnswers;
      const totalBlank = selectedExam.totalQuestions - selectedExam.correctAnswers - selectedExam.wrongAnswers;
      
      if (selectedExam.type === 'TYT') {
        // TYT için standart ders dağılımı (yaklaşık)
        if (totalWrong > 0 || totalBlank > 0) {
          subjectAnalysis['Genel TYT Analizi'] = {
            wrongCount: totalWrong,
            blankCount: Math.max(0, totalBlank),
            reviewedWrong: false,
            reviewedBlank: false,
            solvedWithTeacher: 0
          };
        }
      } else if (selectedExam.type === 'AYT') {
        // AYT için genel analiz
        if (totalWrong > 0 || totalBlank > 0) {
          subjectAnalysis[`Genel AYT Analizi (${selectedExam.field || 'Bilinmeyen'})`] = {
            wrongCount: totalWrong,
            blankCount: Math.max(0, totalBlank),
            reviewedWrong: false,
            reviewedBlank: false,
            solvedWithTeacher: 0
          };
        }
      }
    }

    console.log('Final Subject Analysis:', subjectAnalysis); // Debug log

    setExamAnalysisForm(prev => ({
      ...prev,
      examId,
      subjectAnalysis
    }));
  }, [exams]);

  // Deneme analizi formu (ExamAnalysis için)
  const [examAnalysisForm, setExamAnalysisForm] = useState({
    examId: '',
    analysisCompleted: false,
    subjectAnalysis: {} as { [subject: string]: {
      wrongCount: number;
      blankCount: number;
      reviewedWrong: boolean;
      reviewedBlank: boolean;
      solvedWithTeacher: number;
    }},
    askedTeacherForHelp: false,
    targetImprovements: [] as string[],
    actionPlan: ''
  });

  // Modal states for new features
  const [showDailyQuestionModal, setShowDailyQuestionModal] = useState(false);
  const [showExamAnalysisModal, setShowExamAnalysisModal] = useState(false);

  // ESC tuşu event listener
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDailyQuestionModal) {
          closeDailyQuestionModal();
        }
        if (showExamAnalysisModal) {
          setShowExamAnalysisModal(false);
        }
        if (showExamModal) {
          setShowExamModal(false);
        }
        if (showExamViewModal) {
          setShowExamViewModal(false);
        }
        if (showTopicsModal) {
          setShowTopicsModal(false);
        }
        if (showQuestionTrackingModal) {
          setShowQuestionTrackingModal(false);
        }
        if (showTopicProgressModal) {
          setShowTopicProgressModal(false);
        }
        if (showStudySessionModal) {
          setShowStudySessionModal(false);
        }
        if (showResourceBookModal) {
          setShowResourceBookModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showDailyQuestionModal, showExamAnalysisModal, showExamModal, showExamViewModal, showTopicsModal, showQuestionTrackingModal, showTopicProgressModal, showStudySessionModal, showResourceBookModal, closeDailyQuestionModal]);

  // Toast gösterme fonksiyonu
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    });
  };

  useEffect(() => {
    loadTeacherData();
  }, [userData?.id]);

  // selectedStudent localStorage'a kaydet
  useEffect(() => {
    if (selectedStudent) {
      localStorage.setItem('teacher_selected_student', JSON.stringify(selectedStudent));
    } else {
      localStorage.removeItem('teacher_selected_student');
    }
  }, [selectedStudent]);

  // selectedWeek localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('teacher_selected_week', selectedWeek.toISOString());
  }, [selectedWeek]);

  // Weekly Program Functions with Real-time Updates
  const loadWeeklyPrograms = useCallback(() => {
    if (!selectedStudent?.id || !userData?.id) return;
    
    console.log('🔍 Öğretmen weekly programs yükleme başladı:', {
      studentId: selectedStudent.id,
      teacherId: userData.id,
      studentName: selectedStudent.name
    });
    
    try {
      // Real-time listener for weekly programs
      const programsQuery = query(
        collection(db, 'weeklyPrograms'),
        where('studentId', '==', selectedStudent.id),
        where('teacherId', '==', userData.id)
      );
      
      const unsubscribe = onSnapshot(programsQuery, (snapshot) => {
        console.log('🔄 Öğretmen real-time güncelleme aldı:', {
          docsCount: snapshot.docs.length,
          studentId: selectedStudent.id,
          teacherId: userData.id,
          timestamp: new Date().toLocaleTimeString()
        });

        const programsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          weekStart: doc.data().weekStart?.toDate ? doc.data().weekStart.toDate() : new Date(doc.data().weekStart),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }));
        
        console.log('📋 Öğretmen programlar güncellendi:', programsData.map(p => ({
          id: p.id,
          studentId: (p as any).studentId,
          teacherId: (p as any).teacherId,
          activities: Object.keys((p as any).activities || {}).length
        })));
        
        setWeeklyPrograms(programsData);
      }, (error) => {
        console.error('Weekly programs real-time listener hatası:', error);
      });

      // Real-time listener for activity statuses
      const statusQuery = query(
        collection(db, 'activityStatuses'),
        where('studentId', '==', selectedStudent.id)
      );
      
      const unsubscribeStatuses = onSnapshot(statusQuery, (snapshot) => {
        const statusData: {[key: string]: 'todo' | 'doing' | 'done'} = {};
        snapshot.docs.forEach(doc => {
          statusData[doc.data().activityId] = doc.data().status;
        });
        setActivityStatuses(statusData);
      }, (error) => {
        console.error('Activity statuses real-time listener hatası:', error);
      });

      // Return cleanup function
      return () => {
        unsubscribe();
        unsubscribeStatuses();
      };
    } catch (error) {
      console.error('Weekly programs listener kurulurken hata:', error);
    }
  }, [selectedStudent?.id, userData?.id]);

  // Seçili öğrenci değiştiğinde verileri yenile
  useEffect(() => {
    if (selectedStudent) {
      loadStudentSpecificData(selectedStudent.id);
    }
  }, [selectedStudent]);

  // Real-time weekly programs listener
  useEffect(() => {
    if (selectedStudent?.id && userData?.id) {
      console.log('🔄 Öğretmen weekly program listener kuruluyor:', {
        studentId: selectedStudent.id,
        teacherId: userData.id,
        studentName: selectedStudent.name
      });
      const unsubscribe = loadWeeklyPrograms();
      return unsubscribe;
    }
  }, [loadWeeklyPrograms]);

  // Page load'da selectedStudent varsa student data'sını yükle
  useEffect(() => {
    if (selectedStudent?.id && userData?.id) {
      console.log('🔄 Page refresh - selectedStudent restore edildi:', selectedStudent.name);
      loadStudentSpecificData(selectedStudent.id);
    }
  }, [userData?.id]);

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        if (showAddActivityModal) {
          setShowAddActivityModal(false);
          setEditingActivity(null);
          setActivityForm({
            day: '',
            time: '',
            subject: '',
            topic: '',
            type: 'konu'
          });
        } else if (showAddStudentModal) {
          setShowAddStudentModal(false);
          resetStudentForm();
        } else if (showAddParentModal) {
          setShowAddParentModal(false);
          resetParentForm();
        } else if (showEditStudentModal) {
          setShowEditStudentModal(false);
          setEditingStudent(null);
          resetStudentForm();
        } else if (showCustomTopicModal) {
          setShowCustomTopicModal(false);
          setCustomTopicForm({ name: '', subject: '', difficulty: 'medium' });
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showAddActivityModal, showAddStudentModal, showAddParentModal, showEditStudentModal, showCustomTopicModal]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      
      if (!userData?.id) {
        console.log('Teacher userData not found');
        return;
      }

      // Öğretmenin öğrencilerini çek
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('teacherId', '==', userData.id)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        lastActivity: doc.data().lastActivity?.toDate ? doc.data().lastActivity.toDate() : null
      }));
      console.log('Loaded students:', studentsData);
      console.log('🔍 Öğrencilerin teacherId kontrol:', studentsData.map(s => ({
        name: (s as any).name,
        id: s.id,
        teacherId: (s as any).teacherId,
        currentTeacherId: userData.id
      })));
      setStudents(studentsData);

      // Eğer öğrenci seçili değilse ve öğrenci varsa, ilkini seç
      if (!selectedStudent && studentsData.length > 0) {
        setSelectedStudent(studentsData[0]);
      }

      // Öğrencilerin teacherId'si eksikse düzelt
      for (const student of studentsData) {
        if (!(student as any).teacherId) {
          console.log(`⚠️ Öğrenci ${(student as any).name} teacherId'si eksik, düzeltiliyor...`);
          try {
            await updateDoc(doc(db, 'users', student.id), {
              teacherId: userData.id,
              updatedAt: new Date()
            });
            console.log(`✅ ${(student as any).name} teacherId'si güncellendi`);
          } catch (error) {
            console.error(`❌ ${(student as any).name} teacherId güncellenemedi:`, error);
          }
        }
      }

      // Seçili öğrencinin verilerini yükle
      if (selectedStudent || studentsData.length > 0) {
        const currentStudent = selectedStudent || studentsData[0];
        await loadStudentSpecificData(currentStudent.id);
      }

    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentSpecificData = async (studentId: string) => {
    try {
      // Konu takibi verilerini yükle
      await loadTopicProgress();
      await loadCustomTopics();
      
      // Seçili öğrencinin görevlerini çek
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('studentId', '==', studentId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Task[];
      setTasks(tasksData);

      // Seçili öğrencinin denemelerini çek
      const examsQuery = query(
        collection(db, 'exams'),
        where('studentId', '==', studentId)
      );
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      })) as Exam[];
      setExams(examsData);

      // Diğer öğrenci verilerini de çek
      const questionSessionsQuery = query(
        collection(db, 'questionSessions'),
        where('studentId', '==', studentId)
      );
      const questionSessionsSnapshot = await getDocs(questionSessionsQuery);
      const questionSessionsData = questionSessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt)
      })) as QuestionSession[];
      setQuestionSessions(questionSessionsData);

      // Deneme analizlerini çek
      const examAnalysesQuery = query(
        collection(db, 'examAnalyses'),
        where('studentId', '==', studentId)
      );
      const examAnalysesSnapshot = await getDocs(examAnalysesQuery);
      const examAnalysesData = examAnalysesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt)
      })) as ExamAnalysis[];
      setExamAnalyses(examAnalysesData);

    } catch (error) {
      console.error('Öğrenci verileri yüklenirken hata:', error);
      showToast('Öğrenci verileri yüklenirken hata oluştu', 'error');
    }
  };

  const getCompletionRate = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  const getTodayTasks = () => {
    const today = new Date().toDateString();
    return tasks.filter(task => task.date.toDateString() === today);
  };

  const getWeekProgram = () => {
    const weekStart = getStartOfWeek(selectedWeek);
    const weekProgram = weeklyPrograms.find(program => 
      program.weekStart.getTime() === weekStart.getTime()
    );
    return weekProgram?.activities || {};
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(d.setDate(diff));
  };

  // Firebase temizlik fonksiyonu
  const cleanupOldPrograms = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Tüm eski programları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    try {
      console.log('🧹 Firebase temizliği başlıyor...');
      
      // Tüm weekly programs'ları al
      const allProgramsQuery = query(collection(db, 'weeklyPrograms'));
      const allSnapshot = await getDocs(allProgramsQuery);
      
      console.log(`🧹 ${allSnapshot.docs.length} program bulundu, siliniyor...`);
      
      // Hepsini sil
      const deletePromises = allSnapshot.docs.map(docSnapshot => 
        deleteDoc(docSnapshot.ref)
      );
      
      await Promise.all(deletePromises);
      
      console.log('✅ Tüm eski programlar silindi!');
      showToast(`${allSnapshot.docs.length} eski program temizlendi!`, 'success');
      
    } catch (error) {
      console.error('Temizlik hatası:', error);
      showToast('Temizlik sırasında hata oluştu', 'error');
    }
  };

  const addActivity = async () => {
    if (!selectedStudent?.id || !activityForm.day || !activityForm.subject) {
      showToast('Lütfen ders alanını doldurun', 'error');
      return;
    }

    try {
      const weekStart = getStartOfWeek(selectedWeek);
      const existingProgram = weeklyPrograms.find(program => 
        program.weekStart.getTime() === weekStart.getTime()
      );

      const newActivity = {
        id: Date.now().toString(),
        time: activityForm.time || '',
        subject: activityForm.subject,
        topic: activityForm.topic,
        type: activityForm.type
      };

      console.log('🔥 Öğretmen aktivite ekleme başladı:', {
        studentId: selectedStudent.id,
        teacherId: userData?.id,
        studentName: selectedStudent.name,
        activitySubject: newActivity.subject,
        weekStart: weekStart,
        existingProgram: existingProgram ? existingProgram.id : 'Yeni program oluşturulacak'
      });

      if (existingProgram) {
        // Mevcut programa ekle
        const updatedActivities = {
          ...existingProgram.activities,
          [activityForm.day]: [
            ...(existingProgram.activities[activityForm.day] || []),
            newActivity
          ]
        };

        await updateDoc(doc(db, 'weeklyPrograms', existingProgram.id), {
          activities: updatedActivities,
          updatedAt: new Date()
        });
        
        console.log('✅ Mevcut programa aktivite eklendi:', {
          programId: existingProgram.id,
          day: activityForm.day,
          activityId: newActivity.id
        });
      } else {
        // Yeni program oluştur
        const newProgram = {
          studentId: selectedStudent.id,
          teacherId: userData?.id,
          weekStart: weekStart,
          weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
          activities: {
            [activityForm.day]: [newActivity]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('🔥 Yeni program oluşturuluyor:', {
          studentId: selectedStudent.id,
          teacherId: userData?.id,
          studentName: selectedStudent.name,
          activitySubject: newActivity.subject,
          weekStart: weekStart,
          studentTeacherId: selectedStudent.teacherId,
          fullProgram: newProgram
        });

        const docRef = await addDoc(collection(db, 'weeklyPrograms'), newProgram);
        console.log('✅ Yeni program Firebase\'e kaydedildi, Document ID:', docRef.id);
      }
      
      // Başarılı kayıt sonrası toast göster
      showToast('Görev başarıyla eklendi! Öğrenci paneline anında yansıyacak.', 'success');
      
      setShowAddActivityModal(false);
      setActivityForm({
        day: '',
        time: '',
        subject: '',
        topic: '',
        type: 'konu'
      });
    } catch (error) {
      console.error('Aktivite eklenirken hata:', error);
      showToast('Görev eklenirken hata oluştu', 'error');
    }
  };

  const getSubjectColor = (subject: string) => {
    const colors: { [key: string]: string } = {
      'Matematik': 'bg-blue-500 text-white',
      'Fizik': 'bg-green-500 text-white',
      'Kimya': 'bg-purple-500 text-white',
      'Biyoloji': 'bg-emerald-500 text-white',
      'Türkçe': 'bg-red-500 text-white',
      'Tarih': 'bg-orange-500 text-white',
      'Coğrafya': 'bg-yellow-500 text-black', // sarıda siyah yazı
      'Felsefe': 'bg-indigo-500 text-white',
      'İngilizce': 'bg-pink-500 text-white'
    };
    const result = colors[subject] || 'bg-gray-500 text-white';
    console.log('🎨 Öğretmen panel renk:', { subject, result });
    return result;
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'konu': return <BookOpen className="h-3 w-3" />;
      case 'test': return <Target className="h-3 w-3" />;
      case 'deneme': return <Edit className="h-3 w-3" />;
      case 'tekrar': return <RotateCcw className="h-3 w-3" />;
      case 'analiz': return <BarChart3 className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'konu': return 'Konu';
      case 'test': return 'Test';
      case 'deneme': return 'Deneme';
      case 'tekrar': return 'Tekrar';
      case 'analiz': return 'Analiz';
      default: return 'Görev';
    }
  };

  const getActivityStatusIcon = (activityId: string) => {
    const status = activityStatuses[activityId] || 'todo';
    switch(status) {
      case 'todo': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'doing': return <Timer className="h-4 w-4 text-yellow-500" />;
      case 'done': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityStatusText = (activityId: string) => {
    const status = activityStatuses[activityId] || 'todo';
    switch(status) {
      case 'todo': return 'Yapılacak';
      case 'doing': return 'Devam Ediyor';
      case 'done': return 'Tamamlandı';
      default: return 'Yapılacak';
    }
  };

  const deleteActivity = async (activityId: string, day: string) => {
    try {
      const weekStart = getStartOfWeek(selectedWeek);
      const existingProgram = weeklyPrograms.find(program => 
        program.weekStart.getTime() === weekStart.getTime()
      );

      if (existingProgram) {
        const updatedActivities = {
          ...existingProgram.activities,
          [day]: existingProgram.activities[day]?.filter((activity: any) => activity.id !== activityId) || []
        };

        await updateDoc(doc(db, 'weeklyPrograms', existingProgram.id), {
          activities: updatedActivities,
          updatedAt: new Date()
        });

        showToast('Görev başarıyla silindi!', 'success');
      }
    } catch (error) {
      console.error('Görev silinirken hata:', error);
      showToast('Görev silinirken hata oluştu', 'error');
    }
  };

  const editActivity = (activity: any, day: string) => {
    setEditingActivity({ ...activity, day });
    setActivityForm({
      day: day,
      time: activity.time || '',
      subject: activity.subject,
      topic: activity.topic,
      type: activity.type
    });
    setShowAddActivityModal(true);
  };

  const updateActivity = async () => {
    if (!selectedStudent?.id || !activityForm.subject || !editingActivity) {
      showToast('Lütfen ders alanını doldurun', 'error');
      return;
    }

    try {
      const weekStart = getStartOfWeek(selectedWeek);
      const existingProgram = weeklyPrograms.find(program => 
        program.weekStart.getTime() === weekStart.getTime()
      );

      if (existingProgram) {
        const updatedActivities = { ...existingProgram.activities };
        
        // Eski günden kaldır
        if (updatedActivities[editingActivity.day]) {
          updatedActivities[editingActivity.day] = updatedActivities[editingActivity.day].filter(
            (activity: any) => activity.id !== editingActivity.id
          );
        }

        // Yeni güne ekle (gün değişmişse)
        const updatedActivity = {
          id: editingActivity.id,
          time: activityForm.time || '',
          subject: activityForm.subject,
          topic: activityForm.topic,
          type: activityForm.type,
          color: getSubjectColor(activityForm.subject)
        };

        if (!updatedActivities[activityForm.day]) {
          updatedActivities[activityForm.day] = [];
        }
        updatedActivities[activityForm.day].push(updatedActivity);

        await updateDoc(doc(db, 'weeklyPrograms', existingProgram.id), {
          activities: updatedActivities,
          updatedAt: new Date()
        });

        showToast('Görev başarıyla güncellendi!', 'success');
        setShowAddActivityModal(false);
        setEditingActivity(null);
        setActivityForm({
          day: '',
          time: '',
          subject: '',
          topic: '',
          type: 'konu'
        });
      }
    } catch (error) {
      console.error('Görev güncellenirken hata:', error);
      showToast('Görev güncellenirken hata oluştu', 'error');
    }
  };

  // Form reset fonksiyonları
  const resetStudentForm = () => {
    setStudentForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      packageType: 'basic'
    });
  };

  const resetParentForm = () => {
    setParentForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      studentId: ''
    });
  };

  // Öğrenci aktif/pasif durumu değiştirme
  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', studentId), {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      showToast(`Öğrenci durumu ${!currentStatus ? 'aktif' : 'pasif'} olarak güncellendi!`, 'success');
      await loadTeacherData(); // Listeyi yenile
    } catch (error) {
      console.error('Öğrenci durumu güncelleme hatası:', error);
      showToast('Öğrenci durumu güncellenirken hata oluştu', 'error');
    }
  };

  // Öğrenci düzenleme modal'ını aç
  const openEditStudent = (student: any) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      password: '',
      confirmPassword: '',
      packageType: student.packageType || 'basic'
    });
    setShowEditStudentModal(true);
  };

  // Öğrenci güncelleme fonksiyonu
  const updateStudent = async () => {
    if (!editingStudent || !studentForm.name || !studentForm.email) {
      showToast('Lütfen ad ve e-posta alanlarını doldurun', 'error');
      return;
    }

    // Şifre girilmişse kontrolü yap
    if (studentForm.password && studentForm.password !== studentForm.confirmPassword) {
      showToast('Şifreler uyuşmuyor', 'error');
      return;
    }

    if (studentForm.password && studentForm.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    try {
      const updateData: any = {
        name: studentForm.name,
        email: studentForm.email,
        packageType: studentForm.packageType,
        updatedAt: new Date()
      };

      // Şifre girilmişse ekle
      if (studentForm.password) {
        updateData.password = studentForm.password;
      }

      await updateDoc(doc(db, 'users', editingStudent.id), updateData);

      showToast(`${studentForm.name} başarıyla güncellendi!`, 'success');
      setShowEditStudentModal(false);
      setEditingStudent(null);
      resetStudentForm();
      
      // Öğrenci listesini yenile
      await loadTeacherData();
    } catch (error) {
      console.error('Öğrenci güncelleme hatası:', error);
      showToast('Öğrenci güncellenirken hata oluştu', 'error');
    }
  };

  // Öğrenci silme fonksiyonu
  const deleteStudent = async (student: any) => {
    // eslint-disable-next-line no-restricted-globals
    const isConfirmed = confirm(
      `⚠️ UYARI: ${student.name} adlı öğrenciyi kalıcı olarak silmek istediğinizden emin misiniz?\n\n` +
      `Bu işlem geri alınamaz ve aşağıdaki veriler tamamen silinir:\n` +
      `• Öğrenci hesabı ve tüm bilgileri\n` +
      `• Haftalık programları\n` +
      `• Deneme sonuçları\n` +
      `• Aktivite geçmişi\n\n` +
      `Silmek için TAMAM'a basın.`
    );

    if (!isConfirmed) return;

    try {
      // Öğrenciyi users koleksiyonundan sil
      await deleteDoc(doc(db, 'users', student.id));

      // İlgili haftalık programları sil
      const programsQuery = query(
        collection(db, 'weeklyPrograms'),
        where('studentId', '==', student.id)
      );
      const programsSnapshot = await getDocs(programsQuery);
      
      const deletePromises = programsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      showToast(`${student.name} ve tüm verileri başarıyla silindi!`, 'success');
      
      // Seçili öğrenci silinmişse seçimi temizle
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
        localStorage.removeItem('teacher_selected_student');
      }
      
      // Öğrenci listesini yenile
      await loadTeacherData();
    } catch (error) {
      console.error('Öğrenci silme hatası:', error);
      showToast('Öğrenci silinirken hata oluştu', 'error');
    }
  };

  // Konu takibi fonksiyonları
  const loadTopicProgress = async () => {
    if (!selectedStudent?.id) return;

    try {
      const progressQuery = query(
        collection(db, 'topicProgress'),
        where('studentId', '==', selectedStudent.id)
      );
      const progressSnapshot = await getDocs(progressQuery);
      const progressData = progressSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as TopicProgress[];
      
      setTopicProgress(progressData);
    } catch (error) {
      console.error('Konu ilerlemesi yüklenirken hata:', error);
    }
  };

  const loadCustomTopics = async () => {
    if (!userData?.id) return;

    try {
      const customTopicsQuery = query(
        collection(db, 'customTopics'),
        where('teacherId', '==', userData.id),
        where('isActive', '==', true)
      );
      const customTopicsSnapshot = await getDocs(customTopicsQuery);
      const customTopicsData = customTopicsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as CustomTopic[];
      
      setCustomTopics(customTopicsData);
    } catch (error) {
      console.error('Özel konular yüklenirken hata:', error);
    }
  };

  const updateTopicProgress = async (topicId: string, status: 'not_started' | 'in_progress' | 'completed') => {
    if (!selectedStudent?.id) return;

    try {
      // Mevcut ilerlemeyi kontrol et
      const existingProgress = topicProgress.find(p => p.topicId === topicId);
      
      if (existingProgress) {
        // Güncelle
        await updateDoc(doc(db, 'topicProgress', existingProgress.id), {
          status,
          updatedAt: new Date()
        });
      } else {
        // Yeni oluştur
        const topic = YKS_TOPICS.find(t => t.id === topicId) || customTopics.find(t => t.id === topicId);
        if (!topic) return;

        await addDoc(collection(db, 'topicProgress'), {
          studentId: selectedStudent.id,
          topicId,
          subject: topic.subject,
          status,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Konu ilerlemesini yeniden yükle
      await loadTopicProgress();
      showToast('Konu ilerlemesi güncellendi!', 'success');
    } catch (error) {
      console.error('Konu ilerlemesi güncellenirken hata:', error);
      showToast('Konu ilerlemesi güncellenirken hata oluştu!', 'error');
    }
  };

  const addCustomTopic = async () => {
    if (!customTopicForm.name || !customTopicForm.subject || !userData?.id) {
      showToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'customTopics'), {
        name: customTopicForm.name,
        subject: customTopicForm.subject.toLowerCase(),
        difficulty: customTopicForm.difficulty,
        teacherId: userData.id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      showToast('Özel konu başarıyla eklendi!', 'success');
      setShowCustomTopicModal(false);
      setCustomTopicForm({ name: '', subject: '', difficulty: 'medium' });
      await loadCustomTopics();
    } catch (error) {
      console.error('Özel konu eklenirken hata:', error);
      showToast('Özel konu eklenirken hata oluştu', 'error');
    }
  };

  const deleteCustomTopic = async (topicId: string) => {
    // eslint-disable-next-line no-restricted-globals
    const isConfirmed = confirm('Bu özel konuyu silmek istediğinizden emin misiniz?');
    if (!isConfirmed) return;

    try {
      await updateDoc(doc(db, 'customTopics', topicId), {
        isActive: false,
        updatedAt: new Date()
      });

      showToast('Özel konu silindi!', 'success');
      await loadCustomTopics();
    } catch (error) {
      console.error('Özel konu silinirken hata:', error);
      showToast('Özel konu silinirken hata oluştu', 'error');
    }
  };

  const getTopicProgressStats = () => {
    const totalTopics = YKS_TOPICS.length + customTopics.length;
    
    // Define the valid subjects that match the modal filtering
    const validSubjects = ['matematik', 'fizik', 'kimya', 'biyoloji', 'turkce', 'tarih', 'cografya', 'felsefe'];
    
    // Only count topics that are in valid subjects
    const completedTopics = topicProgress.filter(t => {
      const isValidSubject = validSubjects.includes(t.subject);
      return t.status === 'completed' && isValidSubject;
    }).length;
    
    const inProgressTopics = topicProgress.filter(t => {
      const isValidSubject = validSubjects.includes(t.subject);
      return t.status === 'in_progress' && isValidSubject;
    }).length;
    
    const notStartedTopics = totalTopics - completedTopics - inProgressTopics;
    
    return {
      total: totalTopics,
      completed: completedTopics,
      inProgress: inProgressTopics,
      notStarted: notStartedTopics,
      completionRate: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
    };
  };

  const getSubjectProgress = (subject: string) => {
    const subjectTopics = YKS_TOPICS.filter(t => t.subject === subject);
    const customSubjectTopics = customTopics.filter(t => t.subject === subject);
    const allSubjectTopics = [...subjectTopics, ...customSubjectTopics];
    const subjectProgress = topicProgress.filter(t => t.subject === subject);
    
    const completed = subjectProgress.filter(t => t.status === 'completed').length;
    const inProgress = subjectProgress.filter(t => t.status === 'in_progress').length;
    const total = allSubjectTopics.length;
    
    return {
      total,
      completed,
      inProgress,
      notStarted: total - completed - inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  // Öğrenci ekleme fonksiyonu
  const addStudent = async () => {
    if (!studentForm.name || !studentForm.email || !studentForm.password) {
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
      // E-posta kontrolü (manuel)
      const emailQuery = query(collection(db, 'users'), where('email', '==', studentForm.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        showToast('Bu e-posta adresi zaten kullanımda', 'error');
        return;
      }

      // Benzersiz ID oluştur
      const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Sadece Firestore'a kullanıcı bilgilerini kaydet (Auth hesabı oluşturmadan)
      await setDoc(doc(db, 'users', studentId), {
        name: studentForm.name,
        email: studentForm.email,
        password: studentForm.password, // Geçici şifre, ilk girişte değiştirilecek
        role: 'student',
        teacherId: userData?.id, // Bu öğretmenin ID'si
        packageType: studentForm.packageType,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        isFirstLogin: true // İlk giriş bayrağı
      });

      showToast(`${studentForm.name} başarıyla eklendi! Giriş bilgileri: ${studentForm.email}`, 'success');
      setShowAddStudentModal(false);
      resetStudentForm();
      
      // Öğrenci listesini yenile
      await loadTeacherData();
    } catch (error: any) {
      console.error('Öğrenci ekleme hatası:', error);
      showToast('Öğrenci eklenirken hata oluştu', 'error');
    }
  };

  // Veli ekleme fonksiyonu
  const addParent = async () => {
    if (!parentForm.name || !parentForm.email || !parentForm.password || !parentForm.studentId) {
      showToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    if (parentForm.password !== parentForm.confirmPassword) {
      showToast('Şifreler uyuşmuyor', 'error');
      return;
    }

    if (parentForm.password.length < 6) {
      showToast('Şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    try {
      // Seçilen öğrencinin var olup olmadığını kontrol et
      const selectedStudentForParent = students.find(s => s.id === parentForm.studentId);
      if (!selectedStudentForParent) {
        showToast('Seçilen öğrenci bulunamadı', 'error');
        return;
      }

      // E-posta kontrolü (manuel)
      const emailQuery = query(collection(db, 'users'), where('email', '==', parentForm.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        showToast('Bu e-posta adresi zaten kullanımda', 'error');
        return;
      }

      // Benzersiz ID oluştur
      const parentId = `parent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Sadece Firestore'a kullanıcı bilgilerini kaydet (Auth hesabı oluşturmadan)
      await setDoc(doc(db, 'users', parentId), {
        name: parentForm.name,
        email: parentForm.email,
        password: parentForm.password, // Geçici şifre, ilk girişte değiştirilecek
        role: 'parent',
        studentId: parentForm.studentId,
        teacherId: userData?.id,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        isFirstLogin: true // İlk giriş bayrağı
      });

      showToast(`${parentForm.name} başarıyla eklendi! Giriş bilgileri: ${parentForm.email}`, 'success');
      setShowAddParentModal(false);
      resetParentForm();
    } catch (error: any) {
      console.error('Veli ekleme hatası:', error);
      showToast('Veli eklenirken hata oluştu', 'error');
    }
  };

  // Öğrenci seçiciyi Layout'a mount et
  useEffect(() => {
    const selectorContainer = document.getElementById('teacher-student-selector');
    if (selectorContainer && students.length > 0) {
      const selectedStudentData = selectedStudent ? students.find(s => s.id === selectedStudent.id) : students[0];
      const selectedName = selectedStudentData ? (selectedStudentData as any).name : '';
      const selectedUsername = selectedStudentData ? (selectedStudentData as any).username : '';
      
      selectorContainer.innerHTML = `
        <div class="relative">
          <div class="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group" id="student-dropdown-trigger">
            <div class="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center shadow-sm">
              <span class="text-white font-semibold text-sm">${selectedName.charAt(0).toUpperCase()}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-gray-900 truncate">${selectedName}</span>
              ${selectedUsername ? `<span class="text-xs text-gray-500 truncate">@${selectedUsername}</span>` : ''}
            </div>
            <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
          
          <select 
            id="student-selector"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            ${students.map(student => 
              `<option value="${student.id}" ${selectedStudent?.id === student.id ? 'selected' : ''}>
                ${(student as any).name} ${(student as any).username ? `(@${(student as any).username})` : ''}
              </option>`
            ).join('')}
          </select>
        </div>
      `;
      
      // Event listener ekle
      const selectElement = document.getElementById('student-selector') as HTMLSelectElement;
      if (selectElement) {
        selectElement.onchange = (e) => {
          const target = e.target as HTMLSelectElement;
          const student = students.find(s => s.id === target.value);
          setSelectedStudent(student);
          if (student) {
            loadStudentSpecificData(student.id);
          }
        };
      }
    } else if (selectorContainer) {
      selectorContainer.innerHTML = '';
    }

    // Cleanup function - component unmount olduğunda temizle
    return () => {
      const selectorContainer = document.getElementById('teacher-student-selector');
      if (selectorContainer) {
        selectorContainer.innerHTML = '';
      }
    };
  }, [students, selectedStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Öğrenci Yoksa Uyarı */}
      {students.length === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Henüz Öğrenciniz Yok</h3>
          <p className="text-yellow-700">
            Size bağlı öğrenci bulunmuyor. Yöneticiden öğrenci ataması yapmasını isteyebilirsiniz.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Ana Sayfa', icon: Home },
            { id: 'studyProgram', label: 'Çalışma Programı', icon: BookOpen },
            { id: 'studentManagement', label: 'Öğrenci Yönetimi', icon: User },
            { id: 'exams', label: 'Denemeler', icon: FileText },
            { id: 'examAnalysis', label: 'Deneme Analizi', icon: Brain },
            { id: 'questionTracking', label: 'Soru Takibi', icon: TrendingUp },
            { id: 'topicTracking', label: 'Konu Takibi', icon: BookMarked },
            { id: 'analytics', label: 'Analiz', icon: BarChart3 },
            { id: 'charts', label: 'Deneme Grafikleri', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
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

      {/* Ana Sayfa Tab */}
      {activeTab === 'overview' && selectedStudent && (
        <div className="space-y-6">
          {/* Hoş Geldiniz Bölümü */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Merhaba {userData?.name?.split(' ')[0]}! 👨‍🏫
                </h1>
                <p className="text-gray-600">
                  <span className="font-medium text-orange-700">{selectedStudent.name}</span> adlı öğrencinizin 
                  gelişimini takip ediyorsunuz.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Öğrenci Başarı Oranı</p>
                  <p className="text-2xl font-bold text-gray-900">%{getCompletionRate()}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getCompletionRate()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bugünkü Görevler</p>
                  <p className="text-2xl font-bold text-gray-900">{getTodayTasks().length}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {getTodayTasks().filter(task => task.isCompleted).length} tamamlandı
                </p>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bu Ay Deneme</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {exams.filter(exam => {
                      const examDate = new Date(exam.date);
                      const now = new Date();
                      return examDate.getMonth() === now.getMonth() && examDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🚀 Hızlı Erişim</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('questionTracking')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Soru Takibi</p>
              </button>
              <button
                onClick={() => setActiveTab('exams')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Denemeler</p>
              </button>
              <button
                onClick={() => setActiveTab('studyProgram')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                <BookOpen className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Çalışma Programı</p>
              </button>
              <button
                onClick={() => setActiveTab('studentManagement')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Öğrenci Yönetimi</p>
              </button>
              <button
                onClick={() => setActiveTab('topicTracking')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <BookMarked className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Konu Takibi</p>
              </button>
            </div>
          </div>

          {/* Son Aktiviteler */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📈 Son Aktiviteler</h3>
            <div className="space-y-3">
              {exams.slice(0, 3).map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{exam.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exam.date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{exam.score} puan</p>
                    <p className="text-xs text-gray-500">{exam.type}</p>
                  </div>
                </div>
              ))}
              {exams.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Henüz deneme eklenmemiş</p>
                  <button
                    onClick={() => setActiveTab('exams')}
                    className="text-orange-600 text-sm mt-1 hover:text-orange-700"
                  >
                    İlk denemeyi ekleyin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview tab öğrenci yoksa */}
      {activeTab === 'overview' && students.length === 0 && !loading && (
        <div className="card">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci Ataması Bekleniyor</h3>
            <p className="text-gray-600 mb-4">
              Size atanmış öğrenci bulunmuyor. Dashboard'u kullanabilmek için önce öğrenci ataması yapılması gerekiyor.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Yöneticiden öğrenci ataması yapmasını isteyebilirsiniz</p>
              <p>• Öğrenci atandıktan sonra burada verilerini görebileceksiniz</p>
            </div>
          </div>
        </div>
      )}

      {/* Haftalık Program Tab */}
      {activeTab === 'studyProgram' && selectedStudent && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  📅 {selectedStudent.name} için Haftalık Program
                </h2>
                <p className="text-gray-600">
                  Öğrenciniz için haftalık çalışma programı oluşturun ve yönetin
                </p>
                <button
                  onClick={cleanupOldPrograms}
                  className="mt-3 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  🧹 Eski Programları Temizle
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">
                      {getStartOfWeek(selectedWeek).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {' '}
                      {new Date(getStartOfWeek(selectedWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date().getFullYear()}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button 
                  onClick={() => setShowAddActivityModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Görev Ekle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Program Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day, index) => {
              const dayName = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][index];
              const weekStart = getStartOfWeek(selectedWeek);
              const currentDate = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
              const weekProgram = getWeekProgram();
              const dayActivities = weekProgram[day] || [];

              return (
                <div key={day} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Gün Başlığı */}
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
                    <div className="text-center">
                      <h3 className="font-semibold">{dayName}</h3>
                      <p className="text-sm opacity-90">
                        {currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Aktiviteler */}
                  <div className="p-3 space-y-3 min-h-[400px]">
                    {dayActivities.map((activity: any) => (
                      <div
                        key={activity.id}
                        className={`${getSubjectColor(activity.subject)} rounded-lg p-3 cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1">
                            {getTypeIcon(activity.type)}
                            <span className="text-xs font-medium opacity-90">
                              {getTypeLabel(activity.type)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                editActivity(activity, day);
                              }}
                              className="p-1 hover:bg-white/20 rounded"
                              title="Düzenle"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
                                  deleteActivity(activity.id, day);
                                }
                              }}
                              className="p-1 hover:bg-white/20 rounded"
                              title="Sil"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{activity.subject}</h4>
                          <p className="text-xs opacity-90 mt-1">{activity.topic}</p>
                          {activity.time && (
                            <div className="flex items-center space-x-1 mt-2">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">{activity.time}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          {getActivityStatusIcon(activity.id)}
                          <span className="text-xs text-gray-600">
                            {getActivityStatusText(activity.id)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Boş Alan - Aktivite Ekleme */}
                    <button
                      onClick={() => {
                        setActivityForm(prev => ({ ...prev, day }));
                        setSelectedDay(day);
                        setShowAddActivityModal(true);
                      }}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors group"
                    >
                      <Plus className="h-6 w-6 text-gray-400 group-hover:text-orange-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-500 group-hover:text-orange-600">
                        Görev Ekle
                      </p>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(getWeekProgram()).flat().length}
                  </p>
                  <p className="text-sm text-gray-500">Toplam Görev</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(getWeekProgram()).filter(day => getWeekProgram()[day]?.length > 0).length}
                  </p>
                  <p className="text-sm text-gray-500">Aktif Gün</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(Object.values(getWeekProgram()).flat().map((a: any) => a.subject)).size}
                  </p>
                  <p className="text-sm text-gray-500">Farklı Ders</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.values(getWeekProgram()).flat().length > 0 ? 
                      Math.round(Object.values(getWeekProgram()).flat().length / 7 * 10) / 10 : 0}
                  </p>
                  <p className="text-sm text-gray-500">Günlük Ort.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Öğrenci Yönetimi Tab */}
      {activeTab === 'studentManagement' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  👥 Öğrenci ve Veli Yönetimi
                </h2>
                <p className="text-gray-600">
                  Yeni öğrenci/veli ekleyin, mevcut öğrencilerinizi yönetin
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Öğrenci Ekle
                </button>
                <button 
                  onClick={() => setShowAddParentModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Veli Ekle
                </button>
              </div>
            </div>
          </div>

          {/* Öğrenci Listesi */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Öğrencilerim ({students.length})</h3>
            </div>
            <div className="p-6">
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz öğrenci yok</h3>
                  <p className="text-gray-500 mb-4">İlk öğrencinizi ekleyerek başlayın</p>
                  <button 
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Öğrenci Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => {
                    const isActive = (student as any).isActive !== false; // Default true if undefined
                    return (
                      <div key={student.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? 'bg-blue-100' : 'bg-gray-200'
                            }`}>
                              <User className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                                  {(student as any).name}
                                </h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isActive 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {isActive ? '🟢 Aktif' : '🔴 Pasif'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500">{(student as any).email}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedStudent(student)}
                            className={`px-3 py-1 rounded text-xs ${
                              selectedStudent?.id === student.id
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {selectedStudent?.id === student.id ? 'Seçili' : 'Seç'}
                          </button>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1 mb-3">
                          <p>📅 Kayıt: {(student as any).createdAt?.toLocaleDateString?.() || 'Belirtilmemiş'}</p>
                          <p>📦 Paket: {(student as any).packageType || 'basic'}</p>
                          <p>🔗 ID: {student.id.slice(-8)}</p>
                        </div>
                        
                        <div className="space-y-2">
                          {/* Aktif/Pasif Toggle */}
                          <button
                            onClick={() => toggleStudentStatus(student.id, isActive)}
                            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {isActive ? '⏸️ Pasif Yap' : '▶️ Aktif Yap'}
                          </button>
                          
                          {/* Düzenle ve Sil Butonları */}
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openEditStudent(student)}
                              className="flex-1 px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition-colors"
                            >
                              ✏️ Düzenle
                            </button>
                            <button 
                              onClick={() => deleteStudent(student)}
                              className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                  <p className="text-sm text-gray-500">Toplam Öğrenci</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.filter(s => (s as any).isActive !== false).length}
                  </p>
                  <p className="text-sm text-gray-500">Aktif Öğrenci</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.filter(s => {
                      const created = (s as any).createdAt;
                      if (!created) return false;
                      const createdDate = created.toDate ? created.toDate() : created;
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return createdDate >= thirtyDaysAgo;
                    }).length}
                  </p>
                  <p className="text-sm text-gray-500">Bu Ay Eklenen</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.length > 0 ? Math.round(students.length / 30 * 100) / 100 : 0}
                  </p>
                  <p className="text-sm text-gray-500">Günlük Ortalama</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konu Takibi Tab */}
      {activeTab === 'topicTracking' && selectedStudent && (
        <div className="space-y-6">
          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(() => {
              const stats = getTopicProgressStats();
              return (
                <>
                  <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                    setSelectedSubject('');
                    setSelectedStatusFilter('');
                  }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <BookMarked className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Toplam Konu</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                    setModalStatusFilter('completed');
                    setShowTopicsModal(true);
                  }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tamamlanan</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                    setModalStatusFilter('in_progress');
                    setShowTopicsModal(true);
                  }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Devam Eden</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                    setSelectedSubject('');
                    setSelectedStatusFilter('');
                  }}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Target className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tamamlanma</p>
                        <p className="text-2xl font-bold text-gray-900">%{stats.completionRate}</p>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Özel Konular */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Özel Konular</h3>
              <button
                onClick={() => setShowCustomTopicModal(true)}
                className="btn-primary flex items-center space-x-2 px-4 py-2"
              >
                <Plus className="h-4 w-4" />
                <span>Konu Ekle</span>
              </button>
            </div>
            {customTopics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customTopics.map(topic => (
                  <div key={topic.id} className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{topic.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{topic.subject}</p>
                      </div>
                      <button
                        onClick={() => deleteCustomTopic(topic.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookMarked className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz özel konu eklenmemiş</p>
              </div>
            )}
          </div>

          {/* Ders Başına İlerleme */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ders Başına İlerleme</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'matematik', label: 'Matematik', color: 'blue' },
                { key: 'fizik', label: 'Fizik', color: 'purple' },
                { key: 'kimya', label: 'Kimya', color: 'green' },
                { key: 'biyoloji', label: 'Biyoloji', color: 'emerald' },
                { key: 'turkce', label: 'Türkçe', color: 'orange' },
                { key: 'tarih', label: 'Tarih', color: 'red' },
                { key: 'cografya', label: 'Coğrafya', color: 'teal' },
                { key: 'felsefe', label: 'Felsefe', color: 'indigo' }
              ].map(subject => {
                const progress = getSubjectProgress(subject.key);
                const isSelected = selectedSubject === subject.key;
                
                return (
                  <button
                    key={subject.key}
                    onClick={() => {
                      setSelectedSubject(selectedSubject === subject.key ? '' : subject.key);
                      setSelectedStatusFilter('');
                    }}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-orange-500 bg-orange-50 shadow-lg transform scale-105' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <h4 className={`font-medium text-lg ${
                        isSelected ? 'text-orange-700' : 'text-gray-900'
                      }`}>
                        {subject.label}
                      </h4>
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-600">
                          %{progress.completionRate}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              isSelected ? 'bg-orange-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${progress.completionRate}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {progress.completed}/{progress.total}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seçili Dersin Konuları */}
          {(selectedSubject || selectedStatusFilter) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {(() => {
                    const subjectNames: { [key: string]: string } = {
                      matematik: 'Matematik',
                      fizik: 'Fizik',
                      kimya: 'Kimya',
                      biyoloji: 'Biyoloji',
                      turkce: 'Türkçe',
                      tarih: 'Tarih',
                      cografya: 'Coğrafya',
                      felsefe: 'Felsefe'
                    };
                    
                    const statusNames: { [key: string]: string } = {
                      completed: 'Tamamlanan',
                      in_progress: 'Devam Eden',
                      not_started: 'Başlanmamış',
                      review_needed: 'Tekrar Gerekli'
                    };
                    
                    let title = '';
                    if (selectedSubject && selectedStatusFilter) {
                      title = `${subjectNames[selectedSubject]} - ${statusNames[selectedStatusFilter]} Konuları`;
                    } else if (selectedSubject) {
                      title = `${subjectNames[selectedSubject]} Konuları`;
                    } else if (selectedStatusFilter) {
                      title = `${statusNames[selectedStatusFilter]} Konuları`;
                    } else {
                      title = 'Tüm Konular';
                    }
                    return title;
                  })()}
                </h3>
                <button
                  onClick={() => {
                    setSelectedSubject('');
                    setSelectedStatusFilter('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                {/* YKS Konuları */}
                {YKS_TOPICS.filter(topic => {
                  // Subject filter
                  const matchesSubject = selectedSubject ? topic.subject === selectedSubject : true;
                  
                  // Status filter
                  const progress = topicProgress.find(p => p.topicId === topic.id);
                  const status = progress?.status || 'not_started';
                  const matchesStatus = selectedStatusFilter ? status === selectedStatusFilter : true;
                  
                  return matchesSubject && matchesStatus;
                }).map(topic => {
                  const progress = topicProgress.find(p => p.topicId === topic.id);
                  const status = progress?.status || 'not_started';
                  
                  return (
                    <div key={topic.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'completed' ? 'bg-green-500' :
                              status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`}></div>
                            <div>
                              <h4 className="font-medium text-gray-900">{topic.name}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{topic.examType}</span>
                                <span className="text-xs text-gray-400">
                                  ~{topic.estimatedHours} saat
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map(level => (
                              <Star
                                key={level}
                                className={`h-4 w-4 ${
                                  level <= (progress?.confidenceLevel || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {status === 'completed' ? 'Tamamlandı' : 
                             status === 'in_progress' ? 'Devam Ediyor' : 
                             status === 'review_needed' ? 'Tekrar Gerekli' : 'Başlanmadı'}
                          </span>
                        </div>
                      </div>
                      
                      {progress && progress.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Not:</strong> {progress.notes}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Özel Konular */}
                {customTopics.filter(topic => {
                  // Subject filter
                  const matchesSubject = selectedSubject ? topic.subject.toLowerCase() === selectedSubject.toLowerCase() : true;
                  
                  // Status filter
                  const progress = topicProgress.find(p => p.topicId === topic.id);
                  const status = progress?.status || 'not_started';
                  const matchesStatus = selectedStatusFilter ? status === selectedStatusFilter : true;
                  
                  return matchesSubject && matchesStatus;
                }).map(topic => {
                  const progress = topicProgress.find(p => p.topicId === topic.id);
                  const status = progress?.status || 'not_started';
                  
                  return (
                    <div key={topic.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors bg-purple-50 border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status === 'completed' ? 'bg-green-500' :
                              status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`}></div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{topic.name}</h4>
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  Öğretmen Konusu
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>{topic.examType}</span>
                                <span className="text-xs text-gray-400">
                                  ~{topic.estimatedHours} saat
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map(level => (
                              <Star
                                key={level}
                                className={`h-4 w-4 ${
                                  level <= (progress?.confidenceLevel || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500">
                            {status === 'completed' ? 'Tamamlandı' : 
                             status === 'in_progress' ? 'Devam Ediyor' : 
                             status === 'review_needed' ? 'Tekrar Gerekli' : 'Başlanmadı'}
                          </span>
                        </div>
                      </div>
                      
                      {topic.description && (
                        <div className="mt-2 text-sm text-gray-600 bg-purple-50 p-2 rounded">
                          <strong>Açıklama:</strong> {topic.description}
                        </div>
                      )}
                      
                      {progress && progress.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Not:</strong> {progress.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diğer tab'ler için geçici içerik */}
      {activeTab !== 'overview' && activeTab !== 'studyProgram' && activeTab !== 'studentManagement' && activeTab !== 'topicTracking' && (
        <div className="card">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bu Sekme Geliştiriliyor</h3>
            <p className="text-gray-600 mb-4">
              {activeTab === 'exams' && 'Deneme yönetimi özellikleri yakında eklenecek.'}
              {activeTab === 'examAnalysis' && 'Deneme analizi özellikleri yakında eklenecek.'}
              {activeTab === 'questionTracking' && 'Soru takibi özellikleri yakında eklenecek.'}
              {activeTab === 'analytics' && 'Analiz özellikleri yakında eklenecek.'}
              {activeTab === 'charts' && 'Grafik özellikleri yakında eklenecek.'}
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-lg">
              <Clock className="h-4 w-4 mr-2" />
              Çok yakında...
            </div>
          </div>
        </div>
      )}

      {/* Aktivite Ekleme Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingActivity ? 'Görev Düzenle' : 'Yeni Görev Ekle'}
            </h3>
            <div className="space-y-4">
              {editingActivity && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gün</label>
                  <select 
                    value={activityForm.day}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, day: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="pazartesi">Pazartesi</option>
                    <option value="sali">Salı</option>
                    <option value="carsamba">Çarşamba</option>
                    <option value="persembe">Perşembe</option>
                    <option value="cuma">Cuma</option>
                    <option value="cumartesi">Cumartesi</option>
                    <option value="pazar">Pazar</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saat Aralığı <span className="text-gray-400 text-xs">(opsiyonel)</span></label>
                <input 
                  type="text" 
                  placeholder="09:00-10:30 (isteğe bağlı)" 
                  value={activityForm.time}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ders</label>
                <select 
                  value={activityForm.subject}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="Matematik">Matematik</option>
                  <option value="Fizik">Fizik</option>
                  <option value="Kimya">Kimya</option>
                  <option value="Biyoloji">Biyoloji</option>
                  <option value="Türkçe">Türkçe</option>
                  <option value="Tarih">Tarih</option>
                  <option value="Coğrafya">Coğrafya</option>
                  <option value="Felsefe">Felsefe</option>
                  <option value="İngilizce">İngilizce</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konu/Açıklama</label>
                <input 
                  type="text" 
                  placeholder="Limit ve Süreklilik" 
                  value={activityForm.topic}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aktivite Türü</label>
                <select 
                  value={activityForm.type}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="konu">Konu Anlatımı</option>
                  <option value="test">Test Çözümü</option>
                  <option value="deneme">Deneme</option>
                  <option value="tekrar">Tekrar</option>
                  <option value="analiz">Analiz</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddActivityModal(false);
                  setEditingActivity(null);
                  setActivityForm({
                    day: '',
                    time: '',
                    subject: '',
                    topic: '',
                    type: 'konu'
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                İptal
              </button>
              <button 
                onClick={editingActivity ? updateActivity : addActivity}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                {editingActivity ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öğrenci Ekleme Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
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

            <div className="space-y-4">
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
                  placeholder="Şifrenizi tekrar girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paket Türü
                </label>
                <select
                  value={studentForm.packageType}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, packageType: e.target.value as 'basic' | 'standard' | 'premium' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="basic">Temel</option>
                  <option value="standard">Standart</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddStudentModal(false);
                  resetStudentForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button 
                onClick={addStudent}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Öğrenci Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veli Ekleme Modal */}
      {showAddParentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                👨‍👩‍👧‍👦 Yeni Veli Ekle
              </h3>
              <button 
                onClick={() => {
                  setShowAddParentModal(false);
                  resetParentForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={parentForm.name}
                  onChange={(e) => setParentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Veli adı soyadı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta *
                </label>
                <input
                  type="email"
                  value={parentForm.email}
                  onChange={(e) => setParentForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={parentForm.password}
                  onChange={(e) => setParentForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="En az 6 karakter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre Tekrar *
                </label>
                <input
                  type="password"
                  value={parentForm.confirmPassword}
                  onChange={(e) => setParentForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Şifrenizi tekrar girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öğrenci Seçin *
                </label>
                <select
                  value={parentForm.studentId}
                  onChange={(e) => setParentForm(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Öğrenci seçin...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {(student as any).name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowAddParentModal(false);
                  resetParentForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button 
                onClick={addParent}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Veli Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öğrenci Düzenleme Modal */}
      {showEditStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ✏️ Öğrenci Düzenle
              </h3>
              <button 
                onClick={() => {
                  setShowEditStudentModal(false);
                  setEditingStudent(null);
                  resetStudentForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Şifre (Opsiyonel)
                </label>
                <input
                  type="password"
                  value={studentForm.password}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Değiştirmek istemiyorsanız boş bırakın"
                />
              </div>

              {studentForm.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şifre Tekrar *
                  </label>
                  <input
                    type="password"
                    value={studentForm.confirmPassword}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Şifrenizi tekrar girin"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paket Türü
                </label>
                <select
                  value={studentForm.packageType}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, packageType: e.target.value as 'basic' | 'standard' | 'premium' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="basic">Temel</option>
                  <option value="standard">Standart</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowEditStudentModal(false);
                  setEditingStudent(null);
                  resetStudentForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button 
                onClick={updateStudent}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Özel Konu Ekleme Modal */}
      {showCustomTopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ➕ Özel Konu Ekle
              </h3>
              <button 
                onClick={() => {
                  setShowCustomTopicModal(false);
                  setCustomTopicForm({ name: '', subject: '', difficulty: 'medium' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konu Adı *
                </label>
                <input
                  type="text"
                  value={customTopicForm.name}
                  onChange={(e) => setCustomTopicForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Örn: Türev Uygulamaları"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ders *
                </label>
                <select
                  value={customTopicForm.subject}
                  onChange={(e) => setCustomTopicForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Ders seçin...</option>
                  <option value="matematik">Matematik</option>
                  <option value="fizik">Fizik</option>
                  <option value="kimya">Kimya</option>
                  <option value="biyoloji">Biyoloji</option>
                  <option value="turkce">Türkçe</option>
                  <option value="tarih">Tarih</option>
                  <option value="cografya">Coğrafya</option>
                  <option value="felsefe">Felsefe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zorluk Seviyesi
                </label>
                <select
                  value={customTopicForm.difficulty}
                  onChange={(e) => setCustomTopicForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="easy">Kolay</option>
                  <option value="medium">Orta</option>
                  <option value="hard">Zor</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => {
                  setShowCustomTopicModal(false);
                  setCustomTopicForm({ name: '', subject: '', difficulty: 'medium' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button 
                onClick={addCustomTopic}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Konu Ekle
              </button>
            </div>
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

      {/* Konular Modal */}
      {showTopicsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-[9999] backdrop-blur-sm"
          data-modal="topics"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTopicsModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowTopicsModal(false);
            }
          }}
          tabIndex={0}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-[800px] w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {modalStatusFilter === 'completed' ? 'Tamamlanan Konular' : 'Devam Eden Konular'}
                </h3>
                <button
                  onClick={() => setShowTopicsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Derslere göre gruplandırılmış konular */}
                {[
                  { key: 'matematik', label: 'Matematik', color: 'blue' },
                  { key: 'fizik', label: 'Fizik', color: 'purple' },
                  { key: 'kimya', label: 'Kimya', color: 'green' },
                  { key: 'biyoloji', label: 'Biyoloji', color: 'emerald' },
                  { key: 'turkce', label: 'Türkçe', color: 'orange' },
                  { key: 'tarih', label: 'Tarih', color: 'red' },
                  { key: 'cografya', label: 'Coğrafya', color: 'teal' },
                  { key: 'felsefe', label: 'Felsefe', color: 'indigo' }
                ].map(subject => {
                  // YKS konularını filtrele
                  const yksTopics = YKS_TOPICS.filter(topic => {
                    const progress = topicProgress.find(p => p.topicId === topic.id);
                    const status = progress?.status || 'not_started';
                    return topic.subject === subject.key && status === modalStatusFilter;
                  });

                  // Custom konuları filtrele
                  const customTopicsForSubject = customTopics.filter(topic => {
                    const progress = topicProgress.find(p => p.topicId === topic.id);
                    const status = progress?.status || 'not_started';
                    return topic.subject.toLowerCase() === subject.key && status === modalStatusFilter;
                  });

                  const allTopics = [...yksTopics, ...customTopicsForSubject];

                  if (allTopics.length === 0) return null;

                  return (
                    <div key={subject.key} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className={`text-lg font-semibold mb-3 text-${subject.color}-700`}>
                        {subject.label} ({allTopics.length} konu)
                      </h4>
                      <div className="space-y-2">
                        {allTopics.map(topic => {
                          const progress = topicProgress.find(p => p.topicId === topic.id);
                          const isCustom = customTopics.some(ct => ct.id === topic.id);
                          
                          return (
                            <div key={topic.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                              isCustom ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'
                            }`}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  modalStatusFilter === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">{topic.name}</span>
                                    {isCustom && (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                        Öğretmen Konusu
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {topic.examType} • ~{topic.estimatedHours} saat
                                  </div>
                                </div>
                              </div>
                              
                              {progress && (
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    {[1, 2, 3, 4, 5].map(level => (
                                      <Star
                                        key={level}
                                        className={`h-4 w-4 ${
                                          level <= (progress.confidenceLevel || 0)
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {progress.notes && `"${progress.notes}"`}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty State Mesajı */}
                {(() => {
                  // Tüm dersler için filtrelenmiş konu sayısını hesapla
                  const allFilteredTopics = [
                    'matematik', 'fizik', 'kimya', 'biyoloji', 'turkce', 'tarih', 'cografya', 'felsefe'
                  ].reduce((total, subjectKey) => {
                    // YKS konularını say
                    const yksCount = YKS_TOPICS.filter(topic => {
                      const progress = topicProgress.find(p => p.topicId === topic.id);
                      const status = progress?.status || 'not_started';
                      return topic.subject === subjectKey && status === modalStatusFilter;
                    }).length;
                    
                    // Custom konuları say
                    const customCount = customTopics.filter(topic => {
                      const progress = topicProgress.find(p => p.topicId === topic.id);
                      const status = progress?.status || 'not_started';
                      return topic.subject.toLowerCase() === subjectKey && status === modalStatusFilter;
                    }).length;
                    
                    return total + yksCount + customCount;
                  }, 0);
                  
                  if (allFilteredTopics === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          {modalStatusFilter === 'completed' ? (
                            <CheckCircle className="h-10 w-10 text-gray-400" />
                          ) : (
                            <Clock className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {modalStatusFilter === 'completed' ? 
                            'Henüz tamamlanmış konu yok' : 
                            'Henüz devam eden konu yok'
                          }
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          {modalStatusFilter === 'completed' ? 
                            'Öğrenci konuları çalışmaya başladığında ve tamamladığında burada görünecekler.' :
                            'Öğrenci bir konuyu çalışmaya başladığında burada görünecek.'
                          }
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;