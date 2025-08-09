import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { usePresence } from '../contexts/PresenceContext';
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
  User,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Toast from './Toast';

const TeacherDashboard: React.FC = () => {
  const { userData, currentUser, createUserSilently } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const { userStatus } = usePresence();
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
  
  // Haftalık düzenleme modal state'leri
  const [showWeeklyEditModal, setShowWeeklyEditModal] = useState(false);
  const [weeklyEditData, setWeeklyEditData] = useState<any>({});
  const [selectedEditDay, setSelectedEditDay] = useState<string>('pazartesi');
  const [showCleanupConfirmModal, setShowCleanupConfirmModal] = useState(false);
  
  // Öğrenci arama ve filtreleme state'leri
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  
  // Öğrenci/Veli Ekleme Modal State'leri
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentForm, setStudentForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
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
  const [activeTab, setActiveTab] = useState<'studyProgram' | 'studentManagement' | 'topicTracking' | 'exams' | 'questionTracking' | 'analytics' | 'charts' | 'examAnalysis'>('studyProgram');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [showTopicsModal, setShowTopicsModal] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('');

  // Deneme ekleme form state
  const [showExamModal, setShowExamModal] = useState(false);
  const [showExamViewModal, setShowExamViewModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  
  // ESC ile modal kapatma
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showWeeklyEditModal) {
          setShowWeeklyEditModal(false);
        }
        if (showAddActivityModal) {
          setShowAddActivityModal(false);
          setEditingActivity(null);
        }
        if (showCleanupConfirmModal) {
          setShowCleanupConfirmModal(false);
        }
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
          setEditingStudent(null);
        }
        if (showExamModal) {
          closeExamModal();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showWeeklyEditModal, showAddActivityModal, showCleanupConfirmModal, showDeleteConfirmModal, showExamModal]);

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

  // students listesi güncellenince, seçili öğrenci listede yoksa seçimi düzelt
  useEffect(() => {
    if (!selectedStudent) return;
    const exists = students.some(s => s.id === selectedStudent.id);
    if (!exists) {
      // Listede ilk uygun öğrenciyi seç, yoksa null yap
      if (students.length > 0) {
        setSelectedStudent(students[0]);
        try { localStorage.setItem('teacher_selected_student', JSON.stringify(students[0])); } catch {}
      } else {
        setSelectedStudent(null);
        try { localStorage.removeItem('teacher_selected_student'); } catch {}
      }
    }
  }, [students]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      
      if (!userData?.id) {
        console.log('Teacher userData not found');
        return;
      }

      // Öğretmenin öğrencilerini gerçek zamanlı dinle
      const studentsQueryRef = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('teacherId', '==', userData.id)
      );
      const unsubStudents = onSnapshot(studentsQueryRef, (snapshot) => {
        const liveStudents = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: (d.data() as any).createdAt?.toDate ? (d.data() as any).createdAt.toDate() : new Date((d.data() as any).createdAt),
          lastActivity: (d.data() as any).lastActivity?.toDate ? (d.data() as any).lastActivity.toDate() : null
        }));
        setStudents(liveStudents);
      });

      // Öğrencilerin teacherId'si eksikse düzelt
      for (const student of students) {
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

      // Seçili öğrencinin verilerini yükle (artık otomatik seçim yok)
      if (selectedStudent) {
        await loadStudentSpecificData(selectedStudent.id);
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

  // Sadece seçili haftayı temizle
  const cleanupCurrentWeek = async () => {
    const weekStart = getStartOfWeek(selectedWeek);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const weekRange = `${weekStart.toLocaleDateString('tr-TR')} - ${weekEnd.toLocaleDateString('tr-TR')}`;
    
    // Onay modalını göster
    setShowCleanupConfirmModal(true);
  };

  const confirmCleanupCurrentWeek = async () => {
    const weekStart = getStartOfWeek(selectedWeek);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    const weekRange = `${weekStart.toLocaleDateString('tr-TR')} - ${weekEnd.toLocaleDateString('tr-TR')}`;

    try {
      console.log('🧹 Seçili hafta temizliği başlıyor:', {
        weekStart: weekStart,
        weekEnd: weekEnd,
        weekRange: weekRange
      });
      
      // Seçili hafta için program bul
      const existingProgram = weeklyPrograms.find(program => 
        program.weekStart.getTime() === weekStart.getTime()
      );
      
      if (existingProgram) {
        // Programı sil
        await deleteDoc(doc(db, 'weeklyPrograms', existingProgram.id));
        
        console.log('✅ Seçili hafta programı silindi:', {
          programId: existingProgram.id,
          weekRange: weekRange
        });
        
        // Modal'ı kapat ve başarı mesajı göster
        setShowCleanupConfirmModal(false);
        showToast(`Bu hafta (${weekRange}) temizlendi!`, 'success');
      } else {
        console.log('ℹ️ Bu hafta için program bulunamadı:', {
          weekRange: weekRange
        });
        setShowCleanupConfirmModal(false);
        showToast('Bu hafta için program bulunamadı', 'info');
      }
      
    } catch (error) {
      console.error('Hafta temizliği hatası:', error);
      setShowCleanupConfirmModal(false);
      showToast('Hafta temizliği sırasında hata oluştu', 'error');
    }
  };

  // Haftalık düzenleme modalını aç
  const openWeeklyEditModal = () => {
    const weekProgram = getWeekProgram();
    setWeeklyEditData(weekProgram);
    setShowWeeklyEditModal(true);
  };

  // Haftalık düzenleme modalında aktivite ekle
  const addActivityToWeeklyEdit = (day: string) => {
    const newActivity = {
      id: Date.now().toString(),
      time: '',
      subject: '',
      topic: '',
      type: 'konu' as 'konu' | 'test' | 'deneme' | 'tekrar' | 'analiz'
    };

    setWeeklyEditData(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newActivity]
    }));
  };

  // Haftalık düzenleme modalında aktivite güncelle
  const updateActivityInWeeklyEdit = (day: string, activityId: string, field: string, value: any) => {
    setWeeklyEditData(prev => ({
      ...prev,
      [day]: prev[day].map((activity: any) => 
        activity.id === activityId ? { ...activity, [field]: value } : activity
      )
    }));
  };

  // Haftalık düzenleme modalında aktivite sil
  const deleteActivityFromWeeklyEdit = (day: string, activityId: string) => {
    setWeeklyEditData(prev => ({
      ...prev,
      [day]: prev[day].filter((activity: any) => activity.id !== activityId)
    }));
  };

  // Haftalık düzenleme modalını kaydet
  // Ders seçimi eksik aktiviteleri kontrol eden fonksiyon
  const getEmptySubjectActivities = () => {
    const emptyActivities: { day: string; activityId: string; dayName: string }[] = [];
    
    Object.keys(weeklyEditData).forEach(day => {
      const activities = weeklyEditData[day] || [];
      activities.forEach((activity: any) => {
        if (!activity.subject) {
          const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
          const dayIndex = ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].indexOf(day);
          emptyActivities.push({
            day,
            activityId: activity.id,
            dayName: dayNames[dayIndex]
          });
        }
      });
    });
    
    return emptyActivities;
  };

  const saveWeeklyEdit = async () => {
    try {
      // Validation: Ders seçimi zorunlu mu kontrol et
      const hasEmptySubjects = Object.keys(weeklyEditData).some(day => {
        const activities = weeklyEditData[day] || [];
        return activities.some((activity: any) => !activity.subject);
      });

      if (hasEmptySubjects) {
        showToast('Lütfen tüm aktiviteler için ders seçin', 'error');
        return;
      }

      const weekStart = getStartOfWeek(selectedWeek);
      const existingProgram = weeklyPrograms.find(program => 
        program.weekStart.getTime() === weekStart.getTime()
      );

      const updatedProgram = {
        studentId: selectedStudent.id,
        teacherId: userData?.id,
        weekStart: weekStart,
        weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
        activities: weeklyEditData,
        createdAt: existingProgram?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (existingProgram) {
        await updateDoc(doc(db, 'weeklyPrograms', existingProgram.id), updatedProgram);
        console.log('✅ Haftalık program güncellendi:', existingProgram.id);
      } else {
        await addDoc(collection(db, 'weeklyPrograms'), updatedProgram);
        console.log('✅ Yeni haftalık program oluşturuldu');
      }

      showToast('Haftalık program başarıyla kaydedildi!', 'success');
      setShowWeeklyEditModal(false);
    } catch (error) {
      console.error('Haftalık program kaydetme hatası:', error);
      showToast('Program kaydedilirken hata oluştu', 'error');
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
      'matematik': 'bg-blue-500 text-white',
      'fizik': 'bg-green-500 text-white',
      'kimya': 'bg-purple-500 text-white',
      'biyoloji': 'bg-emerald-500 text-white',
      'turkce': 'bg-red-500 text-white',
      'tarih': 'bg-orange-500 text-white',
      'cografya': 'bg-yellow-500 text-black', // sarıda siyah yazı
      'felsefe': 'bg-indigo-500 text-white',
      'ingilizce': 'bg-pink-500 text-white',
      'diger': 'bg-gray-500 text-white',
      // Büyük harfli versiyonlar da ekleyelim (backwards compatibility)
      'Matematik': 'bg-blue-500 text-white',
      'Fizik': 'bg-green-500 text-white',
      'Kimya': 'bg-purple-500 text-white',
      'Biyoloji': 'bg-emerald-500 text-white',
      'Türkçe': 'bg-red-500 text-white',
      'Tarih': 'bg-orange-500 text-white',
      'Coğrafya': 'bg-yellow-500 text-black',
      'Felsefe': 'bg-indigo-500 text-white',
      'İngilizce': 'bg-pink-500 text-white',
      'Diğer': 'bg-gray-500 text-white'
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
    const wrapperClass = 'bg-white/80 rounded-md p-1 ring-1 ring-black/10';
    const iconClass = 'h-4 w-4 text-gray-900';
    switch (status) {
      case 'doing':
        return <div className={wrapperClass}><Timer className={iconClass} /></div>;
      case 'done':
        return <div className={wrapperClass}><CheckCircle className={iconClass} /></div>;
      case 'todo':
      default:
        return <div className={wrapperClass}><Clock className={iconClass} /></div>;
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
      username: '',
      password: '',
      confirmPassword: ''
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
      username: student.username || '',
      password: '',
      confirmPassword: ''
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
    setEditingStudent(student);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteStudent = async () => {
    if (!editingStudent) return;
    
    try {
      // Öğrenciyi users koleksiyonundan sil
      await deleteDoc(doc(db, 'users', editingStudent.id));

      // İlgili haftalık programları sil
      const programsQuery = query(
        collection(db, 'weeklyPrograms'),
        where('studentId', '==', editingStudent.id)
      );
      const programsSnapshot = await getDocs(programsQuery);
      
      const deletePromises = programsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Yerel state'i anında güncelle (UI'da kalıntı isimleri engelle)
      setStudents(prevStudents => prevStudents.filter(s => s.id !== editingStudent.id));
      if (selectedStudent?.id === editingStudent.id) {
        setSelectedStudent(null);
        try { localStorage.removeItem('teacher_selected_student'); } catch {}
      }

      showToast(`${editingStudent.name} başarıyla silindi!`, 'success');
      setShowDeleteConfirmModal(false);
      setEditingStudent(null);
      
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

      showToast(`${studentForm.name} başarıyla eklendi!`, 'success');
      setShowAddStudentModal(false);
      resetStudentForm();
      
      // Öğrenci listesini yenile (seçimi koru)
      await loadTeacherData();
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
      if (selectorContainer) {
        const selectedStudentData = selectedStudent ? students.find(s => s.id === selectedStudent.id) : null;
        const selectedName = selectedStudentData ? (selectedStudentData as any).name : '';
        const selectedUsername = selectedStudentData ? (selectedStudentData as any).username : '';
      
      selectorContainer.innerHTML = `
          <div class="relative">
          <div class="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group" id="student-dropdown-trigger">
            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
              <span class="text-gray-400 font-semibold text-sm">${selectedName ? selectedName.charAt(0).toUpperCase() : '?'}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium text-gray-900 truncate">${selectedName || 'Öğrenci seçiniz'}</span>
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
            <option value="" ${!selectedStudent ? 'selected' : ''} disabled hidden>Öğrenci seçiniz</option>
            ${students.map(student => 
              `<option value="${student.id}" ${selectedStudent?.id === student.id ? 'selected' : ''}>
                ${(student as any).name} ${(student as any).username ? `(@${(student as any).username})` : ''}
              </option>`
            ).join('')}
          </select>
        </div>
      `;
      
      // Event listener ekle (change)
      const selectElement = document.getElementById('student-selector') as HTMLSelectElement;
      if (selectElement) {
        selectElement.onchange = (e) => {
          const target = e.target as HTMLSelectElement;
          const student = students.find(s => s.id === target.value);
          setSelectedStudent(student || null);
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

  // Deneme ekleme fonksiyonları
  const handleExamFormInput = (field: string, value: any) => {
    setExamForm(prev => ({ ...prev, [field]: value }));
  };

  const handleExamFormDetailInput = (examType: 'tyt' | 'ayt', section: string, subsection: string, field: string, value: number) => {
    setExamForm(prev => ({
      ...prev,
      [`${examType}Details`]: {
        ...prev[`${examType}Details`],
        [section]: {
          ...prev[`${examType}Details`][section],
          [subsection]: {
            ...prev[`${examType}Details`][section][subsection],
            [field]: value
          }
        }
      }
    }));
  };

  const handleAytInput = useCallback((field: 'MF' | 'TM' | 'TS' | 'DİL', subjectKey: string, type: 'correct' | 'wrong', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setExamForm(prev => ({
      ...prev,
      aytDetails: {
        ...prev.aytDetails,
        [field]: {
          ...prev.aytDetails[field],
          [subjectKey]: {
            ...prev.aytDetails[field][subjectKey as any],
            [type]: numValue
          }
        }
      }
    }));
  }, []);

  const handleTytInput = useCallback((subjectKey: string, type: 'correct' | 'wrong', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setExamForm(prev => ({
      ...prev,
      tytDetails: {
        ...prev.tytDetails,
        [subjectKey]: {
          ...prev.tytDetails[subjectKey as keyof typeof prev.tytDetails],
          [type]: numValue
        }
      }
    }));
  }, []);

  const handleTytFenInput = useCallback((subjectKey: string, type: 'correct' | 'wrong', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setExamForm(prev => {
      const updatedFen = {
        ...prev.tytDetails.fen,
        [subjectKey]: {
          ...prev.tytDetails.fen[subjectKey as keyof typeof prev.tytDetails.fen],
          [type]: numValue
        }
      };
      
      // Recalculate totals
      const totalCorrect = updatedFen.fizik.correct + updatedFen.kimya.correct + updatedFen.biyoloji.correct;
      const totalWrong = updatedFen.fizik.wrong + updatedFen.kimya.wrong + updatedFen.biyoloji.wrong;
      updatedFen.total = { correct: totalCorrect, wrong: totalWrong, total: 20 };
      
      return {
        ...prev,
        tytDetails: {
          ...prev.tytDetails,
          fen: updatedFen
        }
      };
    });
  }, []);

  const handleTytSosyalInput = useCallback((subjectKey: string, type: 'correct' | 'wrong', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    setExamForm(prev => {
      const updatedSosyal = {
        ...prev.tytDetails.sosyal,
        [subjectKey]: {
          ...prev.tytDetails.sosyal[subjectKey as keyof typeof prev.tytDetails.sosyal],
          [type]: numValue
        }
      };
      
      // Recalculate totals
      const totalCorrect = updatedSosyal.tarih.correct + updatedSosyal.cografya.correct + updatedSosyal.felsefe.correct + updatedSosyal.din.correct;
      const totalWrong = updatedSosyal.tarih.wrong + updatedSosyal.cografya.wrong + updatedSosyal.felsefe.wrong + updatedSosyal.din.wrong;
      updatedSosyal.total = { correct: totalCorrect, wrong: totalWrong, total: 20 };
      
      return {
        ...prev,
        tytDetails: {
          ...prev.tytDetails,
          sosyal: updatedSosyal
        }
      };
    });
  }, []);

  // AYT için otomatik hesaplama fonksiyonları
  const calculateAytTotals = useCallback((field: 'MF' | 'TM' | 'TS' | 'DİL') => {
    const details = examForm.aytDetails[field];
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalQuestions = 0;

    if (field === 'MF') {
      const mfDetails = details as typeof examForm.aytDetails.MF;
      totalCorrect = mfDetails.matematik.correct + mfDetails.fizik.correct + mfDetails.kimya.correct + mfDetails.biyoloji.correct;
      totalWrong = mfDetails.matematik.wrong + mfDetails.fizik.wrong + mfDetails.kimya.wrong + mfDetails.biyoloji.wrong;
      totalQuestions = 80;
    } else if (field === 'TM') {
      const tmDetails = details as typeof examForm.aytDetails.TM;
      totalCorrect = tmDetails.matematik.correct + tmDetails.turkce.correct + tmDetails.tarih.correct + tmDetails.cografya.correct;
      totalWrong = tmDetails.matematik.wrong + tmDetails.turkce.wrong + tmDetails.tarih.wrong + tmDetails.cografya.wrong;
      totalQuestions = 80;
    } else if (field === 'TS') {
      const tsDetails = details as typeof examForm.aytDetails.TS;
      totalCorrect = tsDetails.turkce.correct + tsDetails.tarih1.correct + tsDetails.cografya1.correct + 
                    tsDetails.tarih2.correct + tsDetails.cografya2.correct + tsDetails.felsefe.correct + tsDetails.din.correct;
      totalWrong = tsDetails.turkce.wrong + tsDetails.tarih1.wrong + tsDetails.cografya1.wrong + 
                  tsDetails.tarih2.wrong + tsDetails.cografya2.wrong + tsDetails.felsefe.wrong + tsDetails.din.wrong;
      totalQuestions = 80;
    } else if (field === 'DİL') {
      const dilDetails = details as typeof examForm.aytDetails.DİL;
      totalCorrect = dilDetails.ingilizce.correct;
      totalWrong = dilDetails.ingilizce.wrong;
      totalQuestions = 80;
    }

    return { totalCorrect, totalWrong, totalQuestions, net: totalCorrect - (totalWrong * 0.25) };
  }, [examForm.aytDetails]);

  // TYT için otomatik hesaplama fonksiyonu
  const calculateTytTotals = useCallback(() => {
    const turkce = examForm.tytDetails.turkce;
    const matematik = examForm.tytDetails.matematik;
    const fen = examForm.tytDetails.fen.total;
    const sosyal = examForm.tytDetails.sosyal.total;

    const totalCorrect = turkce.correct + matematik.correct + fen.correct + sosyal.correct;
    const totalWrong = turkce.wrong + matematik.wrong + fen.wrong + sosyal.wrong;
    const totalQuestions = 120;

    return { totalCorrect, totalWrong, totalQuestions, net: totalCorrect - (totalWrong * 0.25) };
  }, [examForm.tytDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const closeExamModal = () => {
    setShowExamModal(false);
    // Reset form after a short delay to prevent flickering
    setTimeout(() => {
      setExamForm({
        name: '',
        type: 'TYT',
        field: 'MF',
        date: new Date().toISOString().split('T')[0],
        correctAnswers: 0,
        wrongAnswers: 0,
        totalQuestions: 0,
        score: 0,
        tytDetails: {
          turkce: { correct: 0, wrong: 0, total: 40 },
          matematik: { correct: 0, wrong: 0, total: 40 },
          fen: {
            fizik: { correct: 0, wrong: 0, total: 7 },
            kimya: { correct: 0, wrong: 0, total: 7 },
            biyoloji: { correct: 0, wrong: 0, total: 6 },
            total: { correct: 0, wrong: 0, total: 20 }
          },
          sosyal: {
            tarih: { correct: 0, wrong: 0, total: 5 },
            cografya: { correct: 0, wrong: 0, total: 5 },
            felsefe: { correct: 0, wrong: 0, total: 5 },
            din: { correct: 0, wrong: 0, total: 5 },
            total: { correct: 0, wrong: 0, total: 20 }
          }
        },
        aytDetails: {
          MF: {
            matematik: { correct: 0, wrong: 0, total: 40 },
            fizik: { correct: 0, wrong: 0, total: 14 },
            kimya: { correct: 0, wrong: 0, total: 13 },
            biyoloji: { correct: 0, wrong: 0, total: 13 }
          },
          TM: {
            matematik: { correct: 0, wrong: 0, total: 40 },
            turkce: { correct: 0, wrong: 0, total: 24 },
            tarih: { correct: 0, wrong: 0, total: 10 },
            cografya: { correct: 0, wrong: 0, total: 6 }
          },
          TS: {
            turkce: { correct: 0, wrong: 0, total: 24 },
            tarih1: { correct: 0, wrong: 0, total: 10 },
            cografya1: { correct: 0, wrong: 0, total: 6 },
            tarih2: { correct: 0, wrong: 0, total: 11 },
            cografya2: { correct: 0, wrong: 0, total: 11 },
            felsefe: { correct: 0, wrong: 0, total: 12 },
            din: { correct: 0, wrong: 0, total: 6 }
          },
          DİL: {
            ingilizce: { correct: 0, wrong: 0, total: 80 }
          }
        }
      });
    }, 100);
  };

  const addExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent?.id) {
      showToast('Öğrenci seçilmedi!', 'error');
      return;
    }

    try {
      console.log('Adding exam with form data:', examForm);
      let correctAnswers = 0;
      let wrongAnswers = 0;
      let totalQuestions = 0;

      if (examForm.type === 'TYT') {
        // TYT için toplam hesaplama
        // ÖNEMLİ: total değerleri sabit olmalı (Türkçe=40, Matematik=40)
        // Girilen correct+wrong değerleri total'dan fazla olamaz
        const turkceTotal = examForm.tytDetails.turkce.total || 40; // Sabit değer
        const matematikTotal = examForm.tytDetails.matematik.total || 40; // Sabit değer
        
        console.log('TYT Exam saving - Türkçe:', {
          correct: examForm.tytDetails.turkce.correct,
          wrong: examForm.tytDetails.turkce.wrong,
          total: turkceTotal,
          blank_calculated: turkceTotal - examForm.tytDetails.turkce.correct - examForm.tytDetails.turkce.wrong
        });
        // Fen ve Sosyal için sabit toplam değerler (YKS standartları)
        const fenTotal = 20; // Fizik:7 + Kimya:7 + Biyoloji:6 = 20
        const sosyalTotal = 20; // Tarih:5 + Coğrafya:5 + Felsefe:5 + Din:5 = 20

        correctAnswers = examForm.tytDetails.turkce.correct + 
                        examForm.tytDetails.matematik.correct + 
                        examForm.tytDetails.fen.fizik.correct + examForm.tytDetails.fen.kimya.correct + 
                        examForm.tytDetails.fen.biyoloji.correct + examForm.tytDetails.sosyal.tarih.correct + 
                        examForm.tytDetails.sosyal.cografya.correct + examForm.tytDetails.sosyal.felsefe.correct + 
                        examForm.tytDetails.sosyal.din.correct;
        
        wrongAnswers = examForm.tytDetails.turkce.wrong + examForm.tytDetails.matematik.wrong + 
                      examForm.tytDetails.fen.fizik.wrong + examForm.tytDetails.fen.kimya.wrong + 
                      examForm.tytDetails.fen.biyoloji.wrong + examForm.tytDetails.sosyal.tarih.wrong + 
                      examForm.tytDetails.sosyal.cografya.wrong + examForm.tytDetails.sosyal.felsefe.wrong + 
                      examForm.tytDetails.sosyal.din.wrong;
        
        totalQuestions = turkceTotal + matematikTotal + fenTotal + sosyalTotal;
      } else {
        // AYT için alan bazlı hesaplama
        if (examForm.field === 'MF') {
          correctAnswers = examForm.aytDetails.MF.matematik.correct + examForm.aytDetails.MF.fizik.correct + 
                          examForm.aytDetails.MF.kimya.correct + examForm.aytDetails.MF.biyoloji.correct;
          wrongAnswers = examForm.aytDetails.MF.matematik.wrong + examForm.aytDetails.MF.fizik.wrong + 
                        examForm.aytDetails.MF.kimya.wrong + examForm.aytDetails.MF.biyoloji.wrong;
          totalQuestions = 80;
        } else if (examForm.field === 'TM') {
          correctAnswers = examForm.aytDetails.TM.matematik.correct + examForm.aytDetails.TM.turkce.correct + 
                          examForm.aytDetails.TM.tarih.correct + examForm.aytDetails.TM.cografya.correct;
          wrongAnswers = examForm.aytDetails.TM.matematik.wrong + examForm.aytDetails.TM.turkce.wrong + 
                        examForm.aytDetails.TM.tarih.wrong + examForm.aytDetails.TM.cografya.wrong;
          totalQuestions = 80;
        } else if (examForm.field === 'TS') {
          correctAnswers = examForm.aytDetails.TS.turkce.correct + examForm.aytDetails.TS.tarih1.correct + 
                          examForm.aytDetails.TS.cografya1.correct + examForm.aytDetails.TS.tarih2.correct + 
                          examForm.aytDetails.TS.cografya2.correct + examForm.aytDetails.TS.felsefe.correct + 
                          examForm.aytDetails.TS.din.correct;
          wrongAnswers = examForm.aytDetails.TS.turkce.wrong + examForm.aytDetails.TS.tarih1.wrong + 
                        examForm.aytDetails.TS.cografya1.wrong + examForm.aytDetails.TS.tarih2.wrong + 
                        examForm.aytDetails.TS.cografya2.wrong + examForm.aytDetails.TS.felsefe.wrong + 
                        examForm.aytDetails.TS.din.wrong;
          totalQuestions = 80;
        } else if (examForm.field === 'DİL') {
          correctAnswers = examForm.aytDetails.DİL.ingilizce.correct;
          wrongAnswers = examForm.aytDetails.DİL.ingilizce.wrong;
          totalQuestions = 80;
        }
      }

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      const newExam = {
        studentId: selectedStudent.id,
        teacherId: userData?.id,
        name: examForm.name,
        type: examForm.type,
        field: examForm.field,
        date: new Date(examForm.date),
        correctAnswers,
        wrongAnswers,
        totalQuestions,
        score,
        isAnalyzed: false,
        ...(examForm.type === 'TYT' && { tytDetails: examForm.tytDetails }),
        ...(examForm.type === 'AYT' && { aytDetails: examForm.aytDetails }),
        createdAt: new Date()
      };

      console.log('New exam object:', newExam);

      await addDoc(collection(db, 'exams'), newExam);
      showToast('Deneme başarıyla eklendi!', 'success');
      
      closeExamModal();
      
      // Verileri yenile
      await loadStudentSpecificData(selectedStudent.id);
    } catch (error) {
      console.error('Deneme eklenirken hata:', error);
      console.error('Hata detayı:', error instanceof Error ? error.message : error);
      showToast(`Deneme eklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'error');
    }
  };

  const viewExam = (exam: Exam) => {
    setSelectedExam(exam);
    setShowExamViewModal(true);
  };

  const toggleExamAnalysis = async (examId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'exams', examId), {
        isAnalyzed: !currentStatus,
        updatedAt: new Date()
      });
      
      showToast(`Deneme analizi ${!currentStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}!`, 'success');
      await loadStudentSpecificData(selectedStudent.id);
    } catch (error) {
      console.error('Deneme analizi güncellenirken hata:', error);
      showToast('Deneme analizi güncellenirken hata oluştu', 'error');
    }
  };

  const deleteExam = async (examId: string) => {
    if (!window.confirm('Bu denemeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'exams', examId));
      showToast('Deneme başarıyla silindi!', 'success');
      await loadStudentSpecificData(selectedStudent.id);
    } catch (error) {
      console.error('Deneme silinirken hata:', error);
      showToast('Deneme silinirken hata oluştu', 'error');
    }
  };

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
        <nav className="-mb-px flex flex-wrap gap-2 md:space-x-8">
          {[ 
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

      {/* (Kaldırıldı) Ana Sayfa Tab */}
      {false && (
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
      {false && students.length === 0 && !loading && (
        <div className="card">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz öğrenciniz yok</h3>
            <p className="text-gray-600 mb-4">Aşağıdan hızlıca öğrenci ekleyin veya öğrenci seçin.</p>
            <div className="mt-2 flex justify-center gap-3">
              <button onClick={() => setShowAddStudentModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Öğrenci Ekle</button>
              <button onClick={() => setActiveTab('studentManagement')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Öğrenci Yönetimi</button>
            </div>
          </div>
        </div>
      )}

      {/* Haftalık Program Tab */}
      {activeTab === 'studyProgram' && !selectedStudent && (
        <div className="card">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Öğrenci Seçilmedi</h3>
            <p className="text-gray-600 mb-4">
              Çalışma programını görüntülemek için önce bir öğrenci seçin veya öğrenci ekleyin.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• Sağ üstteki öğrenci seçiminden bir öğrenci seçebilirsiniz</p>
              <p>• Öğrenci listeniz boşsa "Öğrenci Ekle" butonunu kullanabilirsiniz</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'studyProgram' && selectedStudent && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  📅 {selectedStudent.name} için Haftalık Program
                  {/* Çevrimiçi rozet */}
                  {userStatus[selectedStudent.id] && (
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      userStatus[selectedStudent.id] === 'online' ? 'bg-green-100 text-green-800' :
                      userStatus[selectedStudent.id] === 'away' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userStatus[selectedStudent.id] === 'online' ? 'Çevrimiçi' : userStatus[selectedStudent.id] === 'away' ? 'Uzakta' : 'Çevrimdışı'}
                    </span>
                  )}
                </h2>
                <p className="text-gray-600">
                  Öğrenciniz için haftalık çalışma programı oluşturun ve yönetin
                </p>
                <button
                  onClick={cleanupCurrentWeek}
                  className="mt-3 px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                >
                  🧹 Bu Haftayı Temizle
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
                  onClick={openWeeklyEditModal}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Tüm Haftayı Düzenle</span>
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  Öğrencilerim ({students.length})
                  <span className="text-sm font-normal text-gray-500">
                    — Çevrimiçi: {students.filter(s => userStatus[s.id] === 'online').length}
                  </span>
                </h3>
                <div className="flex items-center space-x-3">
                  {/* Arama Kutusu */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Öğrenci ara..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {/* Filtre Butonu */}
                  <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tümü</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>
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
                  {students
                    .filter((student) => {
                      const isActive = (student as any).isActive !== false;
                      const matchesSearch = studentSearchTerm === '' || 
                        (student as any).name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        (student as any).email?.toLowerCase().includes(studentSearchTerm.toLowerCase());
                      const matchesFilter = studentFilter === 'all' || 
                        (studentFilter === 'active' && isActive) ||
                        (studentFilter === 'inactive' && !isActive);
                      return matchesSearch && matchesFilter;
                    })
                    .map((student) => {
                      const isActive = (student as any).isActive !== false; // Default true if undefined
                      return (
                      <div key={student.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? 'bg-blue-100' : 'bg-gray-200'
                            }`}>
                              <User className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                              <span className={`absolute -right-1 -bottom-1 w-3 h-3 rounded-full ring-2 ring-white ${
                                userStatus[student.id] === 'online' ? 'bg-green-500' :
                                userStatus[student.id] === 'away' ? 'bg-yellow-400' :
                                'bg-gray-300'
                              }`}></span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
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
                                {userStatus[student.id] && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    userStatus[student.id] === 'online' ? 'bg-green-100 text-green-800' :
                                    userStatus[student.id] === 'away' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {userStatus[student.id] === 'online' ? 'Çevrimiçi' : userStatus[student.id] === 'away' ? 'Uzakta' : 'Çevrimdışı'}
                                  </span>
                                )}
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
                          <p>📅 Kayıt: {(student as any).createdAt?.toDate?.()?.toLocaleDateString?.('tr-TR') || (student as any).createdAt?.toLocaleDateString?.('tr-TR') || 'Belirtilmemiş'}</p>
                          <p>👤 Kullanıcı Adı: {(student as any).username || 'Belirtilmemiş'}</p>
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
            <div className="bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition-shadow">
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
            <div className="bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition-shadow">
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
            <div className="bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition-shadow">
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
            <div className="bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const activeStudents = students.filter(s => (s as any).isActive !== false);
                      return activeStudents.length > 0 ? Math.round((activeStudents.length / students.length) * 100) : 0;
                    })()}%
                  </p>
                  <p className="text-sm text-gray-500">Aktiflik Oranı</p>
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
            {/* Denemeler Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  📊 {selectedStudent ? `${selectedStudent.name} için Denemeler` : 'Denemeler'}
                </h2>
                <p className="text-gray-600">
                  Öğrencinizin deneme sonuçlarını görüntüleyin ve yeni deneme ekleyin
                </p>
              </div>
              <button
                onClick={() => setShowExamModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Deneme Ekle</span>
              </button>
            </div>
          </div>

          {/* Deneme Listesi */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Deneme Sonuçları</h3>
            </div>
            
            {exams.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Deneme Yok</h3>
                <p className="text-gray-600 mb-4">
                  {selectedStudent ? `${selectedStudent.name} için henüz deneme sonucu girilmemiş.` : 'Öğrenci seçilmedi.'}
                </p>
                {selectedStudent && (
                  <button
                    onClick={() => setShowExamModal(true)}
                    className="btn-primary"
                  >
                    İlk Denemeyi Ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {exams.map((exam) => (
                  <div key={exam.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            exam.score >= 80 ? 'bg-green-500' :
                            exam.score >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-gray-900">{exam.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {exam.type}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                {exam.field}
                              </span>
                              <span>{new Date(exam.date).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {exam.score}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {exam.correctAnswers}/{exam.totalQuestions} doğru
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewExam(exam)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Detayları Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleExamAnalysis(exam.id, exam.isAnalyzed || false)}
                            className={`p-2 rounded-lg ${
                              exam.isAnalyzed 
                                ? 'text-green-600 hover:bg-green-50' 
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={exam.isAnalyzed ? 'Analizi Kapat' : 'Analizi Aç'}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteExam(exam.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Denemeyi Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diğer sekmeler için geliştirme mesajı */}
      {activeTab !== 'studyProgram' && activeTab !== 'studentManagement' && activeTab !== 'topicTracking' && activeTab !== 'exams' && (
        <div className="card">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bu Sekme Geliştiriliyor</h3>
            <p className="text-gray-600 mb-4">
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
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
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {editingActivity ? 'Görev Düzenle' : 'Yeni Görev Ekle'}
            </h3>
            <div className="space-y-4" onKeyDown={(e) => {
              if (e.key === 'Enter') addStudent();
              if (e.key === 'Escape') {
                setShowAddStudentModal(false);
                resetStudentForm();
              }
            }}>
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
                  <option value="matematik">Matematik</option>
                  <option value="fizik">Fizik</option>
                  <option value="kimya">Kimya</option>
                  <option value="biyoloji">Biyoloji</option>
                  <option value="turkce">Türkçe</option>
                  <option value="tarih">Tarih</option>
                  <option value="cografya">Coğrafya</option>
                  <option value="felsefe">Felsefe</option>
                  <option value="ingilizce">İngilizce</option>
                  <option value="diger">Diğer</option>
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddStudentModal(false);
              resetStudentForm();
            }
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddParentModal(false);
              resetParentForm();
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditStudentModal(false);
              setEditingStudent(null);
              resetStudentForm();
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomTopicModal(false);
              setCustomTopicForm({ name: '', subject: '', difficulty: 'medium' });
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Haftalık Düzenleme Modal */}
      {showWeeklyEditModal && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowWeeklyEditModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    📅 Haftalık Program Düzenleme
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {selectedStudent?.name} için {getStartOfWeek(selectedWeek).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {new Date(getStartOfWeek(selectedWeek).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <button
                  onClick={() => setShowWeeklyEditModal(false)}
                  className="text-white hover:text-blue-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Gün Sekmeleri */}
              <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
                {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day, index) => {
                  const dayName = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][index];
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedEditDay(day)}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        selectedEditDay === day
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>

              {/* Seçili Günün Aktiviteleri */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'][['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].indexOf(selectedEditDay)]} Aktiviteleri
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="text-red-500">*</span> Ders seçimi zorunludur
                    </p>
                  </div>
                  <button
                    onClick={() => addActivityToWeeklyEdit(selectedEditDay)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Yeni Aktivite</span>
                  </button>
                </div>

                {/* Ders Seçimi Uyarısı */}
                {(() => {
                  const emptyActivities = getEmptySubjectActivities();
                  if (emptyActivities.length > 0) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Ders Seçimi Eksik
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>Aşağıdaki aktiviteler için ders seçimi yapılmamış:</p>
                              <ul className="mt-1 list-disc list-inside">
                                {emptyActivities.map((item, index) => (
                                  <li key={index}>
                                    <span className="font-medium">{item.dayName}</span> gününde aktivite #{item.activityId.slice(-4)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Aktiviteler Listesi */}
                <div className="space-y-3">
                  {(weeklyEditData[selectedEditDay] || []).map((activity: any, index: number) => (
                    <div key={activity.id} className={`rounded-lg p-4 border ${
                      !activity.subject ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Ders */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ders <span className="text-red-500">*</span>
                            {!activity.subject && (
                              <span className="ml-2 text-xs text-red-500 font-medium">(Zorunlu)</span>
                            )}
                          </label>
                          <select
                            value={activity.subject}
                            onChange={(e) => updateActivityInWeeklyEdit(selectedEditDay, activity.id, 'subject', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                              !activity.subject 
                                ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          >
                            <option value="">Ders seçin</option>
                            <option value="matematik">Matematik</option>
                            <option value="fizik">Fizik</option>
                            <option value="kimya">Kimya</option>
                            <option value="biyoloji">Biyoloji</option>
                            <option value="turkce">Türkçe</option>
                            <option value="tarih">Tarih</option>
                            <option value="cografya">Coğrafya</option>
                            <option value="felsefe">Felsefe</option>
                            <option value="ingilizce">İngilizce</option>
                            <option value="diger">Diğer</option>
                          </select>
                        </div>

                        {/* Aktivite Tipi */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                          <select
                            value={activity.type}
                            onChange={(e) => updateActivityInWeeklyEdit(selectedEditDay, activity.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="konu">Konu Çalışması</option>
                            <option value="test">Test</option>
                            <option value="deneme">Deneme</option>
                            <option value="tekrar">Tekrar</option>
                            <option value="analiz">Analiz</option>
                          </select>
                        </div>

                        {/* Süre */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Süre</label>
                          <input
                            type="text"
                            value={activity.time}
                            onChange={(e) => updateActivityInWeeklyEdit(selectedEditDay, activity.id, 'time', e.target.value)}
                            placeholder="09:00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* İşlemler */}
                        <div className="flex items-end">
                          <button
                            onClick={() => deleteActivityFromWeeklyEdit(selectedEditDay, activity.id)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      {/* Konu */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konu</label>
                        <input
                          type="text"
                          value={activity.topic}
                          onChange={(e) => updateActivityInWeeklyEdit(selectedEditDay, activity.id, 'topic', e.target.value)}
                          placeholder="Konu başlığı"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Boş Durum */}
                  {(weeklyEditData[selectedEditDay] || []).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Bu gün için henüz aktivite eklenmemiş</p>
                      <button
                        onClick={() => addActivityToWeeklyEdit(selectedEditDay)}
                        className="text-blue-600 text-sm mt-1 hover:text-blue-700"
                      >
                        İlk aktiviteyi ekleyin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex-shrink-0">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowWeeklyEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={saveWeeklyEdit}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hafta Temizleme Onay Modal */}
      {showCleanupConfirmModal && (
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
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full modal-content relative z-10"
            style={{ marginTop: '8px' }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      🧹 Hafta Temizleme
                    </h2>
                    <p className="text-red-100 text-sm mt-1">
                      Bu işlem geri alınamaz!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCleanupConfirmModal(false)}
                  className="text-white hover:text-red-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Bu haftayı temizlemek istediğinizden emin misiniz?
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-yellow-800 font-medium">
                      {(() => {
                        const weekStart = getStartOfWeek(selectedWeek);
                        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                        return `${weekStart.toLocaleDateString('tr-TR')} - ${weekEnd.toLocaleDateString('tr-TR')}`;
                      })()} tarih aralığındaki tüm programlar silinecek.
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Bu işlem geri alınamaz ve tüm haftalık program verileri kalıcı olarak silinecektir.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowCleanupConfirmModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={confirmCleanupCurrentWeek}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Evet, Temizle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Öğrenci Silme Onay Modal */}
      {showDeleteConfirmModal && editingStudent && (
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
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full modal-content relative z-10"
            style={{ marginTop: '8px' }}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white bg-opacity-20 rounded-full p-2">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      🗑️ Öğrenci Silme
                    </h2>
                    <p className="text-red-100 text-sm mt-1">
                      Bu işlem geri alınamaz!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setEditingStudent(null);
                  }}
                  className="text-white hover:text-red-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {editingStudent.name} adlı öğrenciyi silmek istediğinizden emin misiniz?
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-yellow-800 font-medium">
                      Bu işlem geri alınamaz ve aşağıdaki veriler tamamen silinir:
                    </span>
                  </div>
                  <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                    <li>Öğrenci hesabı ve tüm bilgileri</li>
                    <li>Haftalık programları</li>
                    <li>Deneme sonuçları</li>
                    <li>Aktivite geçmişi</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Evet, Sil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deneme Ekleme Modal */}
      {showExamModal && (
        <div 
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-start justify-center z-[9999] backdrop-blur-sm"
          style={{ 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)', 
            margin: 0, 
            padding: 0,
            top: 0,
            left: 0
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeExamModal();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeExamModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[85vh] overflow-y-auto modal-content relative z-10"
            style={{ marginTop: '8px' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Yeni Deneme Ekle</h3>
                <button
                  onClick={closeExamModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            <form onSubmit={addExam} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deneme Adı</label>
                <input
                  type="text"
                  value={examForm.name}
                  onChange={(e) => handleExamFormInput('name', e.target.value)}
                  onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn: TYT Deneme 1"
                  required
                />
              </div>
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deneme Türü</label>
                <select
                  value={examForm.type}
                      onChange={(e) => handleExamFormInput('type', e.target.value as 'TYT' | 'AYT')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                </select>
              </div>
                </div>

                {examForm.type === 'AYT' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alan</label>
                  <select
                      value={examForm.field}
                      onChange={(e) => handleExamFormInput('field', e.target.value as 'MF' | 'TM' | 'TS' | 'DİL')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                      <option value="MF">MF (Sayısal - Matematik-Fen)</option>
                      <option value="TM">TM (Eşit Ağırlık - Türkçe-Matematik)</option>
                      <option value="TS">TS (Sözel - Türkçe-Sosyal)</option>
                      <option value="DİL">DİL (Yabancı Dil)</option>
                  </select>
                </div>
              )}

              {/* AYT Alan Bazlı Ders Girişi */}
              {examForm.type === 'AYT' && examForm.field && (
                <div className="space-y-6">
                  <h4 className="font-medium text-gray-900">
                    AYT {examForm.field} Alan Ders Bazlı Giriş
                    {examForm.field === 'MF' && ' (Toplam 80 soru)'}
                    {examForm.field === 'TM' && ' (Toplam 80 soru)'}
                    {examForm.field === 'TS' && ' (Toplam 80 soru)'}
                    {examForm.field === 'DİL' && ' (Toplam 80 soru)'}
                  </h4>
                  
                  <div className="space-y-4">
                                         {examForm.field === 'MF' && (
                       <>
                         {[
                           { key: 'matematik', label: 'AYT Matematik', total: 40 },
                           { key: 'fizik', label: 'Fizik', total: 14 },
                           { key: 'kimya', label: 'Kimya', total: 13 },
                           { key: 'biyoloji', label: 'Biyoloji', total: 13 }
                         ].map((subject) => (
                          <div key={subject.key} className="grid grid-cols-3 gap-3">
                            <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.MF[subject.key as keyof typeof examForm.aytDetails.MF].correct || ''}
                              onChange={(e) => {
                                handleAytInput('MF', subject.key, 'correct', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Doğru"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.MF[subject.key as keyof typeof examForm.aytDetails.MF].wrong || ''}
                              onChange={(e) => {
                                handleAytInput('MF', subject.key, 'wrong', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Yanlış"
                            />
                          </div>
                        ))}
                        {(() => {
                          const totals = calculateAytTotals('MF');
                          return (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <span className="font-medium text-blue-800">Toplam Doğru</span>
                                  <div className="text-lg font-bold text-blue-900">{totals.totalCorrect}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-red-800">Toplam Yanlış</span>
                                  <div className="text-lg font-bold text-red-900">{totals.totalWrong}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-green-800">Net</span>
                                  <div className="text-lg font-bold text-green-900">{totals.net.toFixed(2)}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-gray-800">Toplam Soru</span>
                                  <div className="text-lg font-bold text-gray-900">{totals.totalQuestions}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                                         {examForm.field === 'TM' && (
                       <>
                         {[
                           { key: 'matematik', label: 'AYT Matematik', total: 40 },
                           { key: 'turkce', label: 'Türk Dili ve Edebiyatı', total: 24 },
                           { key: 'tarih', label: 'Tarih-1', total: 10 },
                           { key: 'cografya', label: 'Coğrafya-1', total: 6 }
                         ].map((subject) => (
                          <div key={subject.key} className="grid grid-cols-3 gap-3">
                            <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.TM[subject.key as keyof typeof examForm.aytDetails.TM].correct || ''}
                              onChange={(e) => {
                                handleAytInput('TM', subject.key, 'correct', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Doğru"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.TM[subject.key as keyof typeof examForm.aytDetails.TM].wrong || ''}
                              onChange={(e) => {
                                handleAytInput('TM', subject.key, 'wrong', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Yanlış"
                            />
                          </div>
                        ))}
                        {(() => {
                          const totals = calculateAytTotals('TM');
                          return (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <span className="font-medium text-blue-800">Toplam Doğru</span>
                                  <div className="text-lg font-bold text-blue-900">{totals.totalCorrect}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-red-800">Toplam Yanlış</span>
                                  <div className="text-lg font-bold text-red-900">{totals.totalWrong}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-green-800">Net</span>
                                  <div className="text-lg font-bold text-green-900">{totals.net.toFixed(2)}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-gray-800">Toplam Soru</span>
                                  <div className="text-lg font-bold text-gray-900">{totals.totalQuestions}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                                         {examForm.field === 'TS' && (
                       <>
                         {[
                           { key: 'turkce', label: 'Türk Dili ve Edebiyatı', total: 24 },
                           { key: 'tarih1', label: 'Tarih-1', total: 10 },
                           { key: 'cografya1', label: 'Coğrafya-1', total: 6 },
                           { key: 'tarih2', label: 'Tarih-2', total: 11 },
                           { key: 'cografya2', label: 'Coğrafya-2', total: 11 },
                           { key: 'felsefe', label: 'Felsefe Grubu', total: 12 },
                           { key: 'din', label: 'Din Kültürü', total: 6 }
                         ].map((subject) => (
                          <div key={subject.key} className="grid grid-cols-3 gap-3">
                            <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.TS[subject.key as keyof typeof examForm.aytDetails.TS].correct || ''}
                              onChange={(e) => {
                                handleAytInput('TS', subject.key, 'correct', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Doğru"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.TS[subject.key as keyof typeof examForm.aytDetails.TS].wrong || ''}
                              onChange={(e) => {
                                handleAytInput('TS', subject.key, 'wrong', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Yanlış"
                            />
                          </div>
                        ))}
                        {(() => {
                          const totals = calculateAytTotals('TS');
                          return (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <span className="font-medium text-blue-800">Toplam Doğru</span>
                                  <div className="text-lg font-bold text-blue-900">{totals.totalCorrect}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-red-800">Toplam Yanlış</span>
                                  <div className="text-lg font-bold text-red-900">{totals.totalWrong}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-green-800">Net</span>
                                  <div className="text-lg font-bold text-green-900">{totals.net.toFixed(2)}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-gray-800">Toplam Soru</span>
                                  <div className="text-lg font-bold text-gray-900">{totals.totalQuestions}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {examForm.field === 'DİL' && (
                      <>
                        {[
                          { key: 'ingilizce', label: 'İngilizce', total: 80 }
                        ].map((subject) => (
                          <div key={subject.key} className="grid grid-cols-3 gap-3">
                            <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.DİL[subject.key as keyof typeof examForm.aytDetails.DİL].correct || ''}
                              onChange={(e) => {
                                handleAytInput('DİL', subject.key, 'correct', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Doğru"
                            />
                            <input
                              type="number"
                              min="0"
                              max={subject.total}
                              value={examForm.aytDetails.DİL[subject.key as keyof typeof examForm.aytDetails.DİL].wrong || ''}
                              onChange={(e) => {
                                handleAytInput('DİL', subject.key, 'wrong', e.target.value);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Yanlış"
                            />
                          </div>
                        ))}
                        {(() => {
                          const totals = calculateAytTotals('DİL');
                          return (
                            <div className="p-3 bg-blue-50 rounded-lg border">
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <span className="font-medium text-blue-800">Toplam Doğru</span>
                                  <div className="text-lg font-bold text-blue-900">{totals.totalCorrect}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-red-800">Toplam Yanlış</span>
                                  <div className="text-lg font-bold text-red-900">{totals.totalWrong}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-green-800">Net</span>
                                  <div className="text-lg font-bold text-green-900">{totals.net.toFixed(2)}</div>
                                </div>
                                <div className="text-center">
                                  <span className="font-medium text-gray-800">Toplam Soru</span>
                                  <div className="text-lg font-bold text-gray-900">{totals.totalQuestions}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={examForm.date}
                  onChange={(e) => handleExamFormInput('date', e.target.value)}
                  onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

                                 {examForm.type === 'TYT' && (
                   <div className="space-y-6">
                     <h4 className="font-medium text-gray-900">TYT Ders Bazlı Giriş (Toplam 120 soru)</h4>
                     
                     {/* Türkçe ve Matematik */}
                     <div className="space-y-4">
                       <h5 className="font-medium text-gray-800">Ana Dersler</h5>
                       {[
                         { key: 'turkce', label: 'Türkçe', total: 40 },
                         { key: 'matematik', label: 'Temel Matematik', total: 40 }
                       ].map((subject) => (
                         <div key={subject.key} className="grid grid-cols-3 gap-3">
                           <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails[subject.key as 'turkce' | 'matematik'].correct || ''}
                             onChange={(e) => {
                               handleTytInput(subject.key, 'correct', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Doğru"
                           />
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails[subject.key as 'turkce' | 'matematik'].wrong || ''}
                             onChange={(e) => {
                               handleTytInput(subject.key, 'wrong', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Yanlış"
                           />
                         </div>
                       ))}
                     </div>

                     {/* Fen Bilimleri Alt Dersleri */}
                     <div className="space-y-4">
                       <h5 className="font-medium text-gray-800">Fen Bilimleri (Toplam 20 soru)</h5>
                       {[
                         { key: 'fizik', label: 'Fizik', total: 7 },
                         { key: 'kimya', label: 'Kimya', total: 7 },
                         { key: 'biyoloji', label: 'Biyoloji', total: 6 }
                       ].map((subject) => (
                         <div key={subject.key} className="grid grid-cols-3 gap-3 ml-4">
                           <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails.fen[subject.key as 'fizik' | 'kimya' | 'biyoloji'].correct || ''}
                             onChange={(e) => {
                               handleTytFenInput(subject.key, 'correct', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Doğru"
                           />
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails.fen[subject.key as 'fizik' | 'kimya' | 'biyoloji'].wrong || ''}
                             onChange={(e) => {
                               handleTytFenInput(subject.key, 'wrong', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Yanlış"
                           />
                         </div>
                       ))}
                       <div className="ml-4 p-2 bg-blue-50 rounded border">
                         <span className="text-sm font-medium text-blue-800">
                           Fen Toplam: {examForm.tytDetails.fen.total.correct} doğru, {examForm.tytDetails.fen.total.wrong} yanlış
                         </span>
                       </div>
                     </div>

                     {/* Sosyal Bilimler Alt Dersleri */}
                     <div className="space-y-4">
                       <h5 className="font-medium text-gray-800">Sosyal Bilimler (Toplam 20 soru)</h5>
                       {[
                         { key: 'tarih', label: 'Tarih', total: 5 },
                         { key: 'cografya', label: 'Coğrafya', total: 5 },
                         { key: 'felsefe', label: 'Felsefe', total: 5 },
                         { key: 'din', label: 'Din Kültürü', total: 5 }
                       ].map((subject) => (
                         <div key={subject.key} className="grid grid-cols-3 gap-3 ml-4">
                           <label className="text-sm font-medium text-gray-700">{subject.label}</label>
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails.sosyal[subject.key as 'tarih' | 'cografya' | 'felsefe' | 'din'].correct || ''}
                             onChange={(e) => {
                               handleTytSosyalInput(subject.key, 'correct', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Doğru"
                           />
                           <input
                             type="number"
                             min="0"
                             max={subject.total}
                             value={examForm.tytDetails.sosyal[subject.key as 'tarih' | 'cografya' | 'felsefe' | 'din'].wrong || ''}
                             onChange={(e) => {
                               handleTytSosyalInput(subject.key, 'wrong', e.target.value);
                             }}
                             onFocus={(e) => e.target.select()}
                             className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Yanlış"
                           />
                         </div>
                       ))}
                       <div className="ml-4 p-2 bg-green-50 rounded border">
                         <span className="text-sm font-medium text-green-800">
                           Sosyal Toplam: {examForm.tytDetails.sosyal.total.correct} doğru, {examForm.tytDetails.sosyal.total.wrong} yanlış
                         </span>
                       </div>
                     </div>
                     
                     {/* TYT Genel Toplam */}
                     {(() => {
                       const totals = calculateTytTotals();
                       return (
                         <div className="p-4 bg-purple-50 rounded-lg border">
                           <h5 className="font-medium text-purple-800 mb-3 text-center">TYT Genel Toplam</h5>
                           <div className="grid grid-cols-4 gap-4 text-sm">
                             <div className="text-center">
                               <span className="font-medium text-blue-800">Toplam Doğru</span>
                               <div className="text-lg font-bold text-blue-900">{totals.totalCorrect}</div>
                             </div>
                             <div className="text-center">
                               <span className="font-medium text-red-800">Toplam Yanlış</span>
                               <div className="text-lg font-bold text-red-900">{totals.totalWrong}</div>
                             </div>
                             <div className="text-center">
                               <span className="font-medium text-green-800">Net</span>
                               <div className="text-lg font-bold text-green-900">{totals.net.toFixed(2)}</div>
                             </div>
                             <div className="text-center">
                               <span className="font-medium text-gray-800">Toplam Soru</span>
                               <div className="text-lg font-bold text-gray-900">{totals.totalQuestions}</div>
                             </div>
                           </div>
                         </div>
                       );
                     })()}
                   </div>
                )}


                
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">Deneme Ekle</button>
                  <button
                    type="button"
                    onClick={closeExamModal}
                    className="btn-secondary flex-1"
                  >
                    İptal
                  </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deneme Görüntüleme Modal */}
      {showExamViewModal && selectedExam && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExamViewModal(false);
              setSelectedExam(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md mx-4 modal-content relative z-10"
            style={{ marginTop: '8px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              Deneme Analizi
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deneme Adı
                </label>
                <p>{selectedExam.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deneme Türü
                </label>
                <p>{selectedExam.type}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deneme Alanı
                </label>
                <p>{selectedExam.field}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <p>{new Date(selectedExam.date).toLocaleDateString('tr-TR')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doğru Sayısı
                </label>
                <p>{selectedExam.correctAnswers}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yanlış Sayısı
                </label>
                <p>{selectedExam.wrongAnswers}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Toplam Soru Sayısı
                </label>
                <p>{selectedExam.totalQuestions}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puan
                </label>
                <p>{selectedExam.score}%</p>
              </div>

              {examForm.type === 'TYT' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Türkçe
                    </label>
                    <p>{examForm.tytDetails.turkce.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matematik
                    </label>
                    <p>{examForm.tytDetails.matematik.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fen Bilimleri
                    </label>
                    <p>{examForm.tytDetails.fen.total.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sosyal Bilimler
                    </label>
                    <p>{examForm.tytDetails.sosyal.total.correct}</p>
                  </div>
                </>
              )}

              {examForm.type === 'AYT' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Matematik
                    </label>
                    <p>{examForm.aytDetails.MF.matematik.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fizik
                    </label>
                    <p>{examForm.aytDetails.MF.fizik.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kimya
                    </label>
                    <p>{examForm.aytDetails.MF.kimya.correct}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Biyoloji
                    </label>
                    <p>{examForm.aytDetails.MF.biyoloji.correct}</p>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={() => setShowExamViewModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;