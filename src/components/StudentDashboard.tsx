import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Toast from './Toast';

const StudentDashboard: React.FC = () => {
  const { userData, currentUser } = useAuth();
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

  // Weekly Program states
  const [weeklyPrograms, setWeeklyPrograms] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    // Page refresh'te selectedWeek'i localStorage'dan restore et
    const saved = localStorage.getItem('student_selected_week');
    return saved ? new Date(saved) : new Date();
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
  const [activeTab, setActiveTab] = useState<'overview' | 'studyProgram' | 'exams' | 'questionTracking' | 'analytics' | 'charts' | 'topicTracking' | 'examAnalysis'>('overview');
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const subjects = ['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih', 'Coğrafya', 'Felsefe', 'İngilizce'];

  // Konu ekleme fonksiyonları
  const addTopicToSubject = (subjectKey: string) => {
    setQuestionTrackingForm(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectKey]: [
          ...prev.subjects[subjectKey as keyof typeof prev.subjects],
          {
            id: Date.now().toString(),
            topic: '',
            correct: 0,
            wrong: 0,
            empty: 0,
            reviewedWrong: false,
            reviewedBlank: false
          }
        ]
      }
    }));
  };

  const updateTopicInSubject = (subjectKey: string, topicId: string, field: string, value: any) => {
    setQuestionTrackingForm(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectKey]: prev.subjects[subjectKey as keyof typeof prev.subjects].map((topic: any) =>
          topic.id === topicId ? { ...topic, [field]: value } : topic
        )
      }
    }));
  };

  const removeTopicFromSubject = (subjectKey: string, topicId: string) => {
    setQuestionTrackingForm(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subjectKey]: prev.subjects[subjectKey as keyof typeof prev.subjects].filter((topic: any) => topic.id !== topicId)
      }
    }));
  };



  const handleExamFormInput = useCallback((field: string, value: any) => {
    setExamForm(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

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

  // Optimized modal close handlers
  const closeExamModal = useCallback(() => {
    setShowExamModal(false);
    // Reset form after a short delay to prevent flickering
    setTimeout(() => {
      setExamForm({
        name: '',
        type: 'TYT' as 'TYT' | 'AYT',
        field: 'MF' as 'MF' | 'TM' | 'TS' | 'DİL',
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
    }, 150);
  }, []);

  const closeQuestionTrackingModal = useCallback(() => {
    setShowQuestionTrackingModal(false);
    // Reset form after a short delay
    setTimeout(() => {
      setQuestionTrackingForm({
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
    }, 150);
  }, []);

  // Toast gösterme fonksiyonu
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({
      message,
      type,
      isVisible: true
    });
  };

  // Weekly Program Functions with Real-time Updates
  const loadWeeklyPrograms = useCallback(() => {
    if (!userData?.id) return;
    
    console.log('🔍 Öğrenci weekly programs yükleme başladı:', {
      studentId: userData.id,
      teacherId: userData.teacherId,
      studentName: userData.name,
      hasTeacherId: !!userData.teacherId
    });
    
    try {
      // Real-time listener for weekly programs
      let programsQuery;
      if (userData.teacherId) {
        // Hem studentId hem teacherId kontrolü yap
        programsQuery = query(
          collection(db, 'weeklyPrograms'),
          where('studentId', '==', userData.id),
          where('teacherId', '==', userData.teacherId)
        );
        console.log('📋 Query: studentId + teacherId kontrolü');
      } else {
        // Sadece studentId kontrolü yap (backwards compatibility)
        programsQuery = query(
          collection(db, 'weeklyPrograms'),
          where('studentId', '==', userData.id)
        );
        console.log('📋 Query: sadece studentId kontrolü (teacherId yok)');
      }
      
      const unsubscribePrograms = onSnapshot(programsQuery, (snapshot) => {
        console.log('🔄 Öğrenci real-time güncelleme aldı:', {
          docsCount: snapshot.docs.length,
          studentId: userData.id,
          timestamp: new Date().toLocaleTimeString()
        });

        const programsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          weekStart: doc.data().weekStart?.toDate ? doc.data().weekStart.toDate() : new Date(doc.data().weekStart),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }));
        
        console.log('📚 Öğrenci programları güncellendi:', {
          studentId: userData.id,
          teacherId: userData.teacherId,
          programCount: programsData.length,
          rawDocs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
          programs: programsData.map(p => ({
            id: p.id,
            studentId: (p as any).studentId,
            teacherId: (p as any).teacherId,
            activities: Object.keys((p as any).activities || {}).length,
            weekStart: (p as any).weekStart
          }))
        });
        
        setWeeklyPrograms(programsData);
      }, (error) => {
        console.error('Weekly programs real-time listener hatası:', error);
      });

      // Real-time listener for activity statuses
      const statusQuery = query(
        collection(db, 'activityStatuses'),
        where('studentId', '==', userData.id)
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
        unsubscribePrograms();
        unsubscribeStatuses();
      };
    } catch (error) {
      console.error('Weekly programs listener kurulurken hata:', error);
    }
  }, [userData?.id, userData?.teacherId]);

  useEffect(() => {
    loadStudentData();
  }, []);

  // selectedWeek localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('student_selected_week', selectedWeek.toISOString());
  }, [selectedWeek]);

  // Real-time weekly programs listener
  useEffect(() => {
    if (userData?.id) {
      console.log('🔄 Öğrenci weekly program listener kuruluyor:', {
        studentId: userData.id,
        teacherId: userData.teacherId,
        studentName: userData.name
      });
      const unsubscribe = loadWeeklyPrograms();
      return unsubscribe;
    }
  }, [loadWeeklyPrograms]);

  // Modal focus management
  useEffect(() => {
    if (showTopicsModal) {
      const modalElement = document.querySelector('[data-modal="topics"]') as HTMLElement;
      if (modalElement) {
        modalElement.focus();
      }
    }
  }, [showTopicsModal]);

  // Body overflow control for modal
  useEffect(() => {
    if (showQuestionTrackingModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [showQuestionTrackingModal]);

  const loadStudentData = async () => {
    try {
      // Load tasks
      const tasksQuery = query(
        collection(db, 'tasks'), 
        where('studentId', '==', userData?.id)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date instanceof Date ? data.date : (data.date?.toDate ? data.date.toDate() : new Date(data.date)),
          createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
        };
      }) as Task[];
      setTasks(tasksData);

      // Load exams
      const examsQuery = query(
        collection(db, 'exams'), 
        where('studentId', '==', userData?.id)
      );
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = examsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date instanceof Date ? data.date : (data.date?.toDate ? data.date.toDate() : new Date(data.date)),
          createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
        };
      }) as Exam[];
      setExams(examsData);

      // Load question tracking
      const questionTrackingQuery = query(
        collection(db, 'questionTracking'), 
        where('studentId', '==', userData?.id)
      );
      const questionTrackingSnapshot = await getDocs(questionTrackingQuery);
      const questionTrackingData = questionTrackingSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      }));
      setQuestionTracking(questionTrackingData);

      // Load topic progress
      const topicProgressQuery = query(
        collection(db, 'topicProgress'), 
        where('studentId', '==', userData?.id)
      );
      const topicProgressSnapshot = await getDocs(topicProgressQuery);
      const topicProgressData = topicProgressSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        startDate: doc.data().startDate?.toDate(),
        completedDate: doc.data().completedDate?.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as TopicProgress[];
      setTopicProgress(topicProgressData);

      // Load study sessions
      const studySessionsQuery = query(
        collection(db, 'studySessions'), 
        where('studentId', '==', userData?.id)
      );
      const studySessionsSnapshot = await getDocs(studySessionsQuery);
      const studySessionsData = studySessionsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as StudySession[];
      setStudySessions(studySessionsData);

      // Load resource books
      const resourceBooksQuery = query(
        collection(db, 'resourceBooks'), 
        where('studentId', '==', userData?.id)
      );
      const resourceBooksSnapshot = await getDocs(resourceBooksQuery);
      const resourceBooksData = resourceBooksSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        startDate: doc.data().startDate.toDate(),
        targetDate: doc.data().targetDate.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as ResourceBook[];
      setResourceBooks(resourceBooksData);

              // Load custom topics from teacher
      console.log('UserData:', userData);
      if (userData?.teacherId) {
        console.log('Loading custom topics for teacherId:', userData.teacherId);
        const customTopicsQuery = query(
          collection(db, 'customTopics'), 
          where('teacherId', '==', userData.teacherId),
          where('isActive', '==', true)
        );
        const customTopicsSnapshot = await getDocs(customTopicsQuery);
        const customTopicsData = customTopicsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate()
        })) as CustomTopic[];
        console.log('Loaded custom topics:', customTopicsData);
        setCustomTopics(customTopicsData);
      } else {
        console.log('No teacherId found for user:', userData);
        setCustomTopics([]);
      }

      // Load question sessions (new system)
      const questionSessionsQuery = query(
        collection(db, 'questionSessions'), 
        where('studentId', '==', userData?.id)
      );
      const questionSessionsSnapshot = await getDocs(questionSessionsQuery);
      const questionSessionsData = questionSessionsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date instanceof Date ? doc.data().date : (doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)),
        updatedAt: doc.data().updatedAt instanceof Date ? doc.data().updatedAt : (doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt))
      })) as QuestionSession[];
      setQuestionSessions(questionSessionsData);

      // Load exam analyses
      const examAnalysesQuery = query(
        collection(db, 'examAnalyses'), 
        where('studentId', '==', userData?.id)
      );
      const examAnalysesSnapshot = await getDocs(examAnalysesQuery);
      const examAnalysesData = examAnalysesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        analysisDate: doc.data().analysisDate ? (doc.data().analysisDate?.toDate ? doc.data().analysisDate.toDate() : new Date(doc.data().analysisDate)) : undefined,
        wrongQuestionsReviewDate: doc.data().wrongQuestionsReviewDate ? (doc.data().wrongQuestionsReviewDate?.toDate ? doc.data().wrongQuestionsReviewDate.toDate() : new Date(doc.data().wrongQuestionsReviewDate)) : undefined,
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)),
        updatedAt: doc.data().updatedAt instanceof Date ? doc.data().updatedAt : (doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt))
      })) as ExamAnalysis[];
      setExamAnalyses(examAnalysesData);

      // Load study activities
      const studyActivitiesQuery = query(
        collection(db, 'studyActivities'), 
        where('studentId', '==', userData?.id)
      );
      const studyActivitiesSnapshot = await getDocs(studyActivitiesQuery);
      const studyActivitiesData = studyActivitiesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date instanceof Date ? doc.data().date : (doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt))
      })) as StudyActivity[];
      setStudyActivities(studyActivitiesData);

      // Load student metrics
      const studentMetricsQuery = query(
        collection(db, 'studentMetrics'), 
        where('studentId', '==', userData?.id)
      );
      const studentMetricsSnapshot = await getDocs(studentMetricsQuery);
      const studentMetricsData = studentMetricsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date instanceof Date ? doc.data().date : (doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)),
        createdAt: doc.data().createdAt instanceof Date ? doc.data().createdAt : (doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)),
        updatedAt: doc.data().updatedAt instanceof Date ? doc.data().updatedAt : (doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt))
      })) as StudentMetrics[];
      setStudentMetrics(studentMetricsData);

    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, isCompleted: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { isCompleted });
      loadStudentData();
    } catch (error) {
      console.error('Görev durumu güncellenirken hata:', error);
    }
  };

  // Deneme ekleme
  const addExam = async (e: React.FormEvent) => {
    e.preventDefault();

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

        correctAnswers = examForm.tytDetails.turkce.correct + examForm.tytDetails.matematik.correct + 
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
        studentId: userData?.id,
        teacherId: userData?.teacherId || '',
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
      
      // Form reset
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
      setShowExamModal(false);
      
      // Verileri yenile
      loadStudentData();
    } catch (error) {
      console.error('Deneme eklenirken hata:', error);
      console.error('Hata detayı:', error instanceof Error ? error.message : error);
      showToast(`Deneme eklenirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'error');
    }
  };

  // Deneme görüntüleme
  const viewExam = (exam: Exam) => {
    try {
      console.log('Viewing exam:', exam);
      // Ensure date is properly converted
      const examWithProperDate = {
        ...exam,
        date: exam.date instanceof Date ? exam.date : new Date(exam.date)
      };
      setSelectedExam(examWithProperDate);
      setShowExamViewModal(true);
    } catch (error) {
      console.error('Error viewing exam:', error);
      alert('Deneme görüntülenirken hata oluştu!');
    }
  };

  // Deneme silme
  const deleteExam = async (examId: string) => {
    if (window.confirm('Bu denemeyi silmek istediğinizden emin misiniz?')) {
      try {
              await deleteDoc(doc(db, 'exams', examId));
      showToast('Deneme başarıyla silindi!', 'success');
        loadStudentData();
              } catch (error) {
          console.error('Deneme silinirken hata:', error);
          showToast('Deneme silinirken hata oluştu!', 'error');
        }
    }
  };

  // Deneme analiz durumu güncelleme
  const toggleExamAnalysis = async (examId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'exams', examId), {
        isAnalyzed: !currentStatus
      });
      showToast(currentStatus ? 'Analiz durumu kaldırıldı!' : 'Analiz tamamlandı olarak işaretlendi!', 'success');
      loadStudentData();
          } catch (error) {
        console.error('Analiz durumu güncellenirken hata:', error);
        showToast('Analiz durumu güncellenirken hata oluştu!', 'error');
      }
  };

  // Deneme paylaşma
  const shareExam = async (examId: string) => {
    console.log('shareExam function called with examId:', examId);
    console.log('userData:', userData);
    
    if (!userData?.id) {
      console.error('userData.id is missing');
      showToast('Kullanıcı bilgileri eksik!', 'error');
      return;
    }
    
    try {
      // Benzersiz paylaşım kodu oluştur
      const shareCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const examShare = {
        examId,
        studentId: userData.id,
        studentName: userData.name || '',
        shareCode,
        isActive: true,
        createdAt: new Date()
      };

      console.log('Creating examShare:', examShare);
      await addDoc(collection(db, 'examShares'), examShare);
      
      // Paylaşım linkini kopyala
      const shareLink = `${window.location.origin}/exam/${examId}`;
      console.log('Share link:', shareLink);
      await navigator.clipboard.writeText(shareLink);
      
      showToast('Deneme paylaşıldı! Link kopyalandı.', 'success');
    } catch (error) {
      console.error('Deneme paylaşılırken hata:', error);
      showToast('Deneme paylaşılırken hata oluştu!', 'error');
    }
  };

  // Ders gruplu soru takibi ekleme
  const addQuestionTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasyon - en az bir derste konu var mı?
    const allTopics = Object.entries(questionTrackingForm.subjects).flatMap(([subjectKey, topics]) => 
      topics.map((topic: any) => ({ ...topic, subject: subjectKey }))
    );
    
    const validTopics = allTopics.filter((topic: any) => 
      topic.topic.trim() && (topic.correct > 0 || topic.wrong > 0 || topic.empty > 0)
    );
    
    if (validTopics.length === 0) {
      showToast('En az bir derste konu ve soru sayısı girmelisiniz!', 'error');
      return;
    }
    
    try {
      // Her konu için ayrı kayıt oluştur
      const promises = validTopics.map(async (topicData: any) => {
        const totalQuestions = topicData.correct + topicData.wrong + topicData.empty;
        
        const newTopicTracking = {
          studentId: userData?.id,
          teacherId: userData?.teacherId || '',
          date: new Date(questionTrackingForm.date),
          subject: topicData.subject,
          topic: topicData.topic.trim(),
          correct: topicData.correct,
          wrong: topicData.wrong,
          empty: topicData.empty,
          totalQuestions,
          reviewedWrong: topicData.reviewedWrong,
          reviewedBlank: topicData.reviewedBlank,
          successRate: Math.round((topicData.correct / totalQuestions) * 100),
          createdAt: new Date()
        };

        return addDoc(collection(db, 'questionTracking'), newTopicTracking);
      });

      // Tüm kayıtları paralel olarak ekle
      await Promise.all(promises);
      showToast(`${validTopics.length} konu başarıyla kaydedildi!`, 'success');
      
      // Form reset
      setQuestionTrackingForm({
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
      setShowQuestionTrackingModal(false);
      
      // Verileri yenile
      loadStudentData();
    } catch (error) {
      console.error('Soru takibi eklenirken hata:', error);
      showToast('Soru takibi eklenirken hata oluştu!', 'error');
    }
  };

  // Yeni soru takibi sistemi - Günlük soru çözme kaydı (optimized)
  const saveDailyQuestionSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Memoized totalQuestions'ı kullan
      
      const newQuestionSession: Omit<QuestionSession, 'id'> = {
        studentId: userData?.id || '',
        date: new Date(dailyQuestionForm.date),
        subject: dailyQuestionForm.subject,
        examType: dailyQuestionForm.examType,
        topic: dailyQuestionForm.topic,
        totalQuestions: totalQuestions,
        correctAnswers: Number(dailyQuestionForm.correctAnswers) || 0,
        wrongAnswers: Number(dailyQuestionForm.wrongAnswers) || 0,
        blankAnswers: Number(dailyQuestionForm.blankAnswers) || 0,
        reviewedWrongQuestions: dailyQuestionForm.reviewedWrongQuestions,
        reviewedBlankQuestions: dailyQuestionForm.reviewedBlankQuestions,
        timeSpent: dailyQuestionForm.timeSpent,
        difficulty: dailyQuestionForm.difficulty,
        studentNotes: dailyQuestionForm.studentNotes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'questionSessions'), newQuestionSession);
      
      // StudyActivity kaydı da oluştur
      const studyActivity: Omit<StudyActivity, 'id'> = {
        studentId: userData?.id || '',
        date: new Date(dailyQuestionForm.date),
        type: 'question_solving',
        subject: dailyQuestionForm.subject,
        duration: dailyQuestionForm.timeSpent,
        description: `${totalQuestions} soru çözüldü (${Number(dailyQuestionForm.correctAnswers) || 0} doğru, ${Number(dailyQuestionForm.wrongAnswers) || 0} yanlış)`,
        completed: true,
        effectiveness: dailyQuestionForm.reviewedWrongQuestions && dailyQuestionForm.reviewedBlankQuestions ? 5 : 
                     dailyQuestionForm.reviewedWrongQuestions || dailyQuestionForm.reviewedBlankQuestions ? 4 : 3,
        teacherVisible: true,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'studyActivities'), studyActivity);
      
      showToast('Günlük soru çözme kaydı başarıyla eklendi!', 'success');
      
      // Modal'ı kapat ve formu sıfırla
      closeDailyQuestionModal();
      
      // Sadece gerekli verileri yenile (daha hızlı)
      loadQuestionSessionsOnly();
    } catch (error) {
      console.error('Soru çözme kaydı eklenirken hata:', error);
      showToast('Soru çözme kaydı eklenirken hata oluştu!', 'error');
    }
  }, [dailyQuestionForm, userData, showToast, closeDailyQuestionModal, loadQuestionSessionsOnly, totalQuestions]);

  // Deneme analizi kaydetme
  const saveExamAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Starting to save exam analysis...'); // Debug log
      console.log('Exam Analysis Form:', JSON.stringify(examAnalysisForm, null, 2)); // Detailed form debug
      const selectedExamForAnalysis = exams.find(exam => exam.id === examAnalysisForm.examId);
      if (!selectedExamForAnalysis) {
        showToast('Deneme bulunamadı!', 'error');
        return;
      }

      // Ders bazlı analiz verilerinden genel değerleri hesapla
      const subjects = Object.keys(examAnalysisForm.subjectAnalysis);
      const totalWrongQuestions = subjects.reduce((sum, subject) => 
        sum + examAnalysisForm.subjectAnalysis[subject].wrongCount, 0);
      const totalBlankQuestions = subjects.reduce((sum, subject) => 
        sum + examAnalysisForm.subjectAnalysis[subject].blankCount, 0);
      const totalSolvedWithTeacher = subjects.reduce((sum, subject) => 
        sum + examAnalysisForm.subjectAnalysis[subject].solvedWithTeacher, 0);
      
      // Tüm yanlış/boş sorular gözden geçirildi mi?
      const allWrongReviewed = subjects.every(subject => 
        examAnalysisForm.subjectAnalysis[subject].wrongCount === 0 || 
        examAnalysisForm.subjectAnalysis[subject].reviewedWrong);
      const allBlankReviewed = subjects.every(subject => 
        examAnalysisForm.subjectAnalysis[subject].blankCount === 0 || 
        examAnalysisForm.subjectAnalysis[subject].reviewedBlank);

      // Analiz tamamlanma yüzdesini hesapla
      const completionPercentage = (() => {
        let completed = 0;
        let total = 0;

        // Temel analiz yapıldı mı? (20 puan)
        total += 20;
        if (examAnalysisForm.analysisCompleted) completed += 20;

        // Yanlış sorular varsa bunları gözden geçirdi mi? (30 puan)
        if (totalWrongQuestions > 0) {
          total += 30;
          if (allWrongReviewed) completed += 30;
        }

        // Boş sorular varsa bunları gözden geçirdi mi? (20 puan)
        if (totalBlankQuestions > 0) {
          total += 20;
          if (allBlankReviewed) completed += 20;
        }

        // Öğretmenden yardım aldı mı? (30 puan)
        if (totalWrongQuestions > 0 || totalBlankQuestions > 0) {
          total += 30;
          if (examAnalysisForm.askedTeacherForHelp && totalSolvedWithTeacher > 0) completed += 30;
        }

        return total > 0 ? Math.round((completed / total) * 100) : 0;
      })();

      // Firestore için undefined değerleri temizle
      const examAnalysisData: any = {
        studentId: userData?.id || '',
        examId: examAnalysisForm.examId,
        analysisCompleted: examAnalysisForm.analysisCompleted,
        
        // Ders bazlı detaylı analiz
        subjectAnalysis: examAnalysisForm.subjectAnalysis,
        
        // Genel özet (hesaplanmış)
        wrongQuestionCount: totalWrongQuestions,
        blankQuestionCount: totalBlankQuestions,
        reviewedWrongQuestions: allWrongReviewed,
        reviewedBlankQuestions: allBlankReviewed,
        
        // Öğretmen ile çözüm
        solvedWithTeacherCount: totalSolvedWithTeacher,
        askedTeacherForHelp: examAnalysisForm.askedTeacherForHelp,
        
        // Eski format (backward compatibility)
        targetImprovements: examAnalysisForm.targetImprovements || [],
        actionPlan: examAnalysisForm.actionPlan || '',
        
        // Analiz tamamlanma oranı
        completionPercentage: completionPercentage,
        
        // Öğretmen geri bildirimi
        teacherSeen: false,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Sadece gerekli tarih alanlarını ekle (undefined olmasın)
      if (examAnalysisForm.analysisCompleted) {
        examAnalysisData.analysisDate = new Date();
      }
      
      if (allWrongReviewed) {
        examAnalysisData.wrongQuestionsReviewDate = new Date();
      }
      
      if (allBlankReviewed) {
        examAnalysisData.blankQuestionsReviewDate = new Date();
      }
      
      if (examAnalysisForm.askedTeacherForHelp) {
        examAnalysisData.teacherHelpDate = new Date();
      }

      console.log('Clean exam analysis data for Firestore:', examAnalysisData); // Debug log

      await addDoc(collection(db, 'examAnalyses'), examAnalysisData);
      
      // StudyActivity kaydı oluştur
      const studyActivity: Omit<StudyActivity, 'id'> = {
        studentId: userData?.id || '',
        date: new Date(),
        type: 'exam_analysis',
        subject: selectedExamForAnalysis.type,
        duration: 60, // Ortalama analiz süresi
        description: `${selectedExamForAnalysis.name} deneme analizi ${examAnalysisForm.analysisCompleted ? 'tamamlandı' : 'başlatıldı'}`,
        completed: examAnalysisForm.analysisCompleted && allWrongReviewed && allBlankReviewed,
        effectiveness: examAnalysisForm.analysisCompleted && allWrongReviewed && allBlankReviewed ? 5 : 3,
        teacherVisible: true,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'studyActivities'), studyActivity);
      
      showToast('Deneme analizi kaydı başarıyla eklendi!', 'success');
      
      // Form reset
      setExamAnalysisForm({
        examId: '',
        analysisCompleted: false,
        subjectAnalysis: {},
        askedTeacherForHelp: false,
        targetImprovements: [],
        actionPlan: ''
      });
      
      setShowExamAnalysisModal(false);
      loadStudentData();
    } catch (error) {
      console.error('Deneme analizi kaydı eklenirken hata:', error);
      console.error('Error details:', error.message || error); // Detailed error log
      console.error('Form data that caused error:', examAnalysisForm); // Form data log
      showToast(`Deneme analizi kaydı eklenirken hata oluştu: ${error.message || error}`, 'error');
    }
  };

  // Yanlış/boş soruları gözden geçirme durumunu güncelleme (optimized)
  const updateQuestionReviewStatus = useCallback(async (sessionId: string, field: 'reviewedWrongQuestions' | 'reviewedBlankQuestions', value: boolean) => {
    try {
      await updateDoc(doc(db, 'questionSessions', sessionId), {
        [field]: value,
        updatedAt: new Date()
      });
      
      showToast(`${field === 'reviewedWrongQuestions' ? 'Yanlış sorular' : 'Boş sorular'} gözden geçirme durumu güncellendi!`, 'success');
      
      // Sadece gerekli verileri yenile (daha hızlı)
      loadQuestionSessionsOnly();
    } catch (error) {
      console.error('Gözden geçirme durumu güncellenirken hata:', error);
      showToast('Güncelleme sırasında hata oluştu!', 'error');
    }
  }, [showToast, loadQuestionSessionsOnly]);

  const getCompletionRate = () => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.isCompleted).length;
    return Math.round((completed / tasks.length) * 100);
  };

  // Konu takibi fonksiyonları
  const addTopicProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const topic = YKS_TOPICS.find(t => t.id === topicProgressForm.topicId);
      if (!topic) {
        showToast('Konu bulunamadı!', 'error');
        return;
      }

      const newTopicProgress: TopicProgress = {
        id: '',
        studentId: userData?.id || '',
        teacherId: userData?.teacherId || '',
        topicId: topicProgressForm.topicId,
        topicName: topic.name,
        subject: topic.subject,
        examType: topic.examType,
        status: topicProgressForm.status,
        startDate: topicProgressForm.status !== 'not_started' ? new Date() : undefined,
        completedDate: topicProgressForm.status === 'completed' ? new Date() : undefined,
        studyHours: topicProgressForm.studyHours,
        confidenceLevel: topicProgressForm.confidenceLevel,
        notes: topicProgressForm.notes,
        resources: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'topicProgress'), newTopicProgress);
      showToast('Konu ilerlemesi başarıyla eklendi!', 'success');
      
      // Form reset
      setTopicProgressForm({
        topicId: '',
        topicName: '',
        subject: '',
        examType: 'TYT',
        status: 'not_started',
        studyHours: 0,
        confidenceLevel: 3,
        notes: ''
      });
      
      loadStudentData();
      setShowTopicProgressModal(false);
    } catch (error) {
      console.error('Konu ilerlemesi eklenirken hata:', error);
      showToast('Konu ilerlemesi eklenirken hata oluştu!', 'error');
    }
  };

  const updateTopicProgress = async (progressId: string, status: string, confidenceLevel: number, notes?: string) => {
    try {
      // Eğer progressId bir Firestore document id'si ise (mevcut kayıt), güncelle
      const existingProgress = topicProgress.find(p => p.id === progressId);
      if (existingProgress) {
        // Mevcut konu ilerlemesini güncelle
        const topicRef = doc(db, 'topicProgress', existingProgress.id);
        const updateData: any = {
          status,
          confidenceLevel,
          updatedAt: new Date()
        };

        if (status === 'completed') {
          updateData.completedDate = new Date();
        } else if (status === 'in_progress' && !existingProgress.startDate) {
          updateData.startDate = new Date();
        }

        if (notes !== undefined) {
          updateData.notes = notes;
        }

        await updateDoc(topicRef, updateData);
        
        // Optimizasyon: Sadece ilgili progress'i güncelle, tüm verileri yeniden yükleme
        setTopicProgress(prev => prev.map(p => 
          p.id === existingProgress.id 
            ? { 
                ...p, 
                status: status as 'not_started' | 'in_progress' | 'completed' | 'review_needed',
                confidenceLevel: confidenceLevel as 1 | 2 | 3 | 4 | 5,
                notes: notes || p.notes,
                updatedAt: new Date(),
                ...(status === 'completed' ? { completedDate: new Date() } : {}),
                ...(status === 'in_progress' && !p.startDate ? { startDate: new Date() } : {})
              }
            : p
        ));
        
        showToast('Konu ilerlemesi güncellendi!', 'success');
      } else {
        // Yeni konu ilerlemesi oluştur (progressId bu durumda topic.id olur)
        // Önce YKS konularında ara, bulamazsa custom konularda ara
        let selectedTopic = YKS_TOPICS.find(t => t.id === progressId);
        
        if (!selectedTopic) {
          // YKS konularında bulunamadı, custom konularda ara
          selectedTopic = customTopics.find(t => t.id === progressId);
        }
        
        if (!selectedTopic) {
          showToast('Konu bulunamadı!', 'error');
          return;
        }

        const newTopicProgress: Omit<TopicProgress, 'id'> = {
          studentId: currentUser?.uid || '',
          teacherId: userData?.teacherId || '',
          topicId: selectedTopic.id,
          topicName: selectedTopic.name,
          subject: selectedTopic.subject,
          examType: selectedTopic.examType,
          status: status as 'not_started' | 'in_progress' | 'completed' | 'review_needed',
          studyHours: 0,
          confidenceLevel: confidenceLevel as 1 | 2 | 3 | 4 | 5,
          notes: notes || '',
          resources: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (status === 'completed') {
          newTopicProgress.completedDate = new Date();
        } else if (status === 'in_progress') {
          newTopicProgress.startDate = new Date();
        }

        const docRef = await addDoc(collection(db, 'topicProgress'), newTopicProgress);
        
        // Optimizasyon: Yeni progress'i state'e ekle
        setTopicProgress(prev => [...prev, { ...newTopicProgress, id: docRef.id }]);
        
        showToast('Konu ilerlemesi eklendi!', 'success');
      }
    } catch (error) {
      console.error('Konu ilerlemesi güncellenirken hata:', error);
      showToast('Konu ilerlemesi güncellenirken hata oluştu!', 'error');
    }
  };

  const getTopicProgressStats = () => {
    const totalTopics = YKS_TOPICS.length + customTopics.length;
    const completedTopics = topicProgress.filter(t => t.status === 'completed').length;
    const inProgressTopics = topicProgress.filter(t => t.status === 'in_progress').length;
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

  const getTodayTasks = () => {
    const today = new Date().toDateString();
    return tasks.filter(task => task.date.toDateString() === today);
  };

  const getWeekProgram = () => {
    const weekStart = getStartOfWeek(selectedWeek);
    
    // Aynı hafta için birden fazla program varsa, en güncel olanı seç
    const matchingPrograms = weeklyPrograms.filter(program => {
      const programWeekStart = getStartOfWeek(program.weekStart);
      return programWeekStart.toDateString() === weekStart.toDateString();
    });
    
    console.log('🔍 Öğrenci haftalık program aranıyor:', {
      weekStart: weekStart.toDateString(),
      matchingCount: matchingPrograms.length,
      totalPrograms: weeklyPrograms.length,
      programs: matchingPrograms.map(p => ({
        id: p.id,
        createdAt: p.createdAt,
        activityCount: Object.keys(p.activities || {}).length,
        activities: p.activities
      }))
    });
    
    // En son oluşturulan programı seç
    const weekProgram = matchingPrograms.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
    
    if (weekProgram) {
      console.log('✅ Öğrenci haftalık program bulundu:', {
        programId: weekProgram.id,
        createdAt: weekProgram.createdAt,
        activityCount: Object.keys(weekProgram.activities || {}).length,
        activities: weekProgram.activities
      });
    } else {
      console.log('⚠️ Öğrenci için bu hafta program bulunamadı:', {
        weekStart: weekStart.toDateString(),
        studentId: userData?.id,
        teacherId: userData?.teacherId
      });
    }
    
    return weekProgram?.activities || {};
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(d.setDate(diff));
  };

  const updateActivityStatus = async (activityId: string, status: 'todo' | 'doing' | 'done') => {
    try {
      // Check if status already exists
      const existingStatusQuery = query(
        collection(db, 'activityStatuses'),
        where('studentId', '==', userData?.id),
        where('activityId', '==', activityId)
      );
      const existingStatusSnapshot = await getDocs(existingStatusQuery);

      if (existingStatusSnapshot.empty) {
        // Create new status
        await addDoc(collection(db, 'activityStatuses'), {
          studentId: userData?.id,
          activityId: activityId,
          status: status,
          updatedAt: new Date()
        });
      } else {
        // Update existing status
        const docId = existingStatusSnapshot.docs[0].id;
        await updateDoc(doc(db, 'activityStatuses', docId), {
          status: status,
          updatedAt: new Date()
        });
      }

      setActivityStatuses(prev => ({
        ...prev,
        [activityId]: status
      }));

      const statusTexts = {
        todo: 'Yapılacak olarak işaretlendi',
        doing: 'Yapılıyor olarak işaretlendi', 
        done: 'Tamamlandı olarak işaretlendi'
      };
      showToast(statusTexts[status], 'success');
    } catch (error) {
      console.error('Activity status güncellenirken hata:', error);
      showToast('Durum güncellenirken hata oluştu', 'error');
    }
  };

  const getActivityStatusColor = (activityId: string) => {
    const status = activityStatuses[activityId] || 'todo';
    switch(status) {
      case 'todo': return 'bg-gray-100 border-l-4 border-gray-400';
      case 'doing': return 'bg-yellow-100 border-l-4 border-yellow-400';
      case 'done': return 'bg-green-100 border-l-4 border-green-400';
      default: return 'bg-gray-100 border-l-4 border-gray-400';
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
    console.log('🎨 Öğrenci panel renk:', { subject, result });
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



  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getUpcomingTasks = () => {
    const today = new Date();
    return tasks.filter(task => task.date > today && !task.isCompleted);
  };

  // Haftalık görevleri organize et
  const getWeeklyTasks = () => {
    const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const weeklyTasks: { [key: string]: Task[] } = {};
    
    // Her gün için boş array oluştur
    weekDays.forEach(day => {
      weeklyTasks[day] = [];
    });
    
    // Tüm görevleri günlere göre organize et (tarih kısıtlaması yok)
    tasks.forEach(task => {
      const taskDate = new Date(task.date);
      const dayName = weekDays[taskDate.getDay()];
      
      // Tüm görevleri ekle
      if (weeklyTasks[dayName]) {
        weeklyTasks[dayName].push(task);
      }
    });
    
    return weeklyTasks;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDayName = (date: Date) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[date.getDay()];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Grafik verilerini hazırlayan fonksiyonlar
  const prepareExamChartData = () => {
    return exams
      .filter(exam => exam.type === 'TYT')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(exam => ({
        name: exam.name,
        date: new Date(exam.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
        turkce: exam.tytDetails?.turkce?.correct || 0,
        matematik: exam.tytDetails?.matematik?.correct || 0,
        fen: exam.tytDetails?.fen?.total?.correct || 0,
        sosyal: exam.tytDetails?.sosyal?.total?.correct || 0,
        toplam: exam.correctAnswers,
        puan: exam.score
      }));
  };

  const prepareSubjectChartData = () => {
    const subjectData = {
      turkce: { name: 'Türkçe', total: 0, count: 0 },
      matematik: { name: 'Matematik', total: 0, count: 0 },
      fen: { name: 'Fen Bilimleri', total: 0, count: 0 },
      sosyal: { name: 'Sosyal Bilimler', total: 0, count: 0 }
    };
    exams
      .filter(exam => exam.type === 'TYT')
      .forEach(exam => {
        subjectData.turkce.total += exam.tytDetails?.turkce?.correct || 0;
        subjectData.turkce.count += 1;
        subjectData.matematik.total += exam.tytDetails?.matematik?.correct || 0;
        subjectData.matematik.count += 1;
        subjectData.fen.total += exam.tytDetails?.fen?.total?.correct || 0;
        subjectData.fen.count += 1;
        subjectData.sosyal.total += exam.tytDetails?.sosyal?.total?.correct || 0;
        subjectData.sosyal.count += 1;
      });
    return Object.values(subjectData).map(subject => ({
      name: subject.name,
      ortalama: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      toplam: subject.total
    }));
  };

  const prepareFenSubSubjectsChartData = () => {
    const subSubjects = {
      fizik: { name: 'Fizik', total: 0, count: 0 },
      kimya: { name: 'Kimya', total: 0, count: 0 },
      biyoloji: { name: 'Biyoloji', total: 0, count: 0 }
    };
    exams
      .filter(exam => exam.type === 'TYT')
      .forEach(exam => {
        subSubjects.fizik.total += exam.tytDetails?.fen?.fizik?.correct || 0;
        subSubjects.fizik.count += 1;
        subSubjects.kimya.total += exam.tytDetails?.fen?.kimya?.correct || 0;
        subSubjects.kimya.count += 1;
        subSubjects.biyoloji.total += exam.tytDetails?.fen?.biyoloji?.correct || 0;
        subSubjects.biyoloji.count += 1;
      });
    return Object.values(subSubjects).map(subject => ({
      name: subject.name,
      ortalama: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      toplam: subject.total
    }));
  };

  const prepareSosyalSubSubjectsChartData = () => {
    const subSubjects = {
      tarih: { name: 'Tarih', total: 0, count: 0 },
      cografya: { name: 'Coğrafya', total: 0, count: 0 },
      felsefe: { name: 'Felsefe', total: 0, count: 0 },
      din: { name: 'Din Kültürü', total: 0, count: 0 }
    };
    exams
      .filter(exam => exam.type === 'TYT')
      .forEach(exam => {
        subSubjects.tarih.total += exam.tytDetails?.sosyal?.tarih?.correct || 0;
        subSubjects.tarih.count += 1;
        subSubjects.cografya.total += exam.tytDetails?.sosyal?.cografya?.correct || 0;
        subSubjects.cografya.count += 1;
        subSubjects.felsefe.total += exam.tytDetails?.sosyal?.felsefe?.correct || 0;
        subSubjects.felsefe.count += 1;
        subSubjects.din.total += exam.tytDetails?.sosyal?.din?.correct || 0;
        subSubjects.din.count += 1;
      });
    return Object.values(subSubjects).map(subject => ({
      name: subject.name,
      ortalama: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      toplam: subject.total
    }));
  };

  // AYT için grafik verilerini hazırlayan fonksiyonlar
  const prepareAytChartData = () => {
    return exams
      .filter(exam => exam.type === 'AYT')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(exam => {
        const details = exam.aytDetails;
        if (!details) return null;

        let subjects = {};
        if (exam.field === 'MF') {
          subjects = {
            matematik: details.MF?.matematik?.correct || 0,
            fizik: details.MF?.fizik?.correct || 0,
            kimya: details.MF?.kimya?.correct || 0,
            biyoloji: details.MF?.biyoloji?.correct || 0
          };
        } else if (exam.field === 'TM') {
          subjects = {
            matematik: details.TM?.matematik?.correct || 0,
            turkce: details.TM?.turkce?.correct || 0,
            tarih: details.TM?.tarih?.correct || 0,
            cografya: details.TM?.cografya?.correct || 0
          };
        } else if (exam.field === 'TS') {
          subjects = {
            turkce: details.TS?.turkce?.correct || 0,
            tarih1: details.TS?.tarih1?.correct || 0,
            cografya1: details.TS?.cografya1?.correct || 0,
            tarih2: details.TS?.tarih2?.correct || 0,
            cografya2: details.TS?.cografya2?.correct || 0,
            felsefe: details.TS?.felsefe?.correct || 0,
            din: details.TS?.din?.correct || 0
          };
        } else if (exam.field === 'DİL') {
          subjects = {
            ingilizce: details.DİL?.ingilizce?.correct || 0
          };
        }

        return {
          name: exam.name,
          date: new Date(exam.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
          field: exam.field,
          ...subjects,
          toplam: exam.correctAnswers,
          puan: exam.score
        };
      })
      .filter(Boolean);
  };

  const prepareAytSubjectChartData = () => {
    const subjectData = {
      MF: {
        matematik: { name: 'AYT Matematik (MF)', total: 0, count: 0 },
        fizik: { name: 'Fizik (MF)', total: 0, count: 0 },
        kimya: { name: 'Kimya (MF)', total: 0, count: 0 },
        biyoloji: { name: 'Biyoloji (MF)', total: 0, count: 0 }
      },
      TM: {
        matematik: { name: 'AYT Matematik (TM)', total: 0, count: 0 },
        turkce: { name: 'Türk Dili (TM)', total: 0, count: 0 },
        tarih: { name: 'Tarih (TM)', total: 0, count: 0 },
        cografya: { name: 'Coğrafya (TM)', total: 0, count: 0 }
      },
      TS: {
        turkce: { name: 'Türk Dili (TS)', total: 0, count: 0 },
        tarih1: { name: 'Tarih-1 (TS)', total: 0, count: 0 },
        cografya1: { name: 'Coğrafya-1 (TS)', total: 0, count: 0 },
        tarih2: { name: 'Tarih-2 (TS)', total: 0, count: 0 },
        cografya2: { name: 'Coğrafya-2 (TS)', total: 0, count: 0 },
        felsefe: { name: 'Felsefe (TS)', total: 0, count: 0 },
        din: { name: 'Din Kültürü (TS)', total: 0, count: 0 }
      },
      DİL: {
        ingilizce: { name: 'İngilizce (DİL)', total: 0, count: 0 }
      }
    };

    exams
      .filter(exam => exam.type === 'AYT')
      .forEach(exam => {
        const details = exam.aytDetails;
        if (!details) return;

        if (exam.field === 'MF') {
          subjectData.MF.matematik.total += details.MF?.matematik?.correct || 0;
          subjectData.MF.matematik.count += 1;
          subjectData.MF.fizik.total += details.MF?.fizik?.correct || 0;
          subjectData.MF.fizik.count += 1;
          subjectData.MF.kimya.total += details.MF?.kimya?.correct || 0;
          subjectData.MF.kimya.count += 1;
          subjectData.MF.biyoloji.total += details.MF?.biyoloji?.correct || 0;
          subjectData.MF.biyoloji.count += 1;
        } else if (exam.field === 'TM') {
          subjectData.TM.matematik.total += details.TM?.matematik?.correct || 0;
          subjectData.TM.matematik.count += 1;
          subjectData.TM.turkce.total += details.TM?.turkce?.correct || 0;
          subjectData.TM.turkce.count += 1;
          subjectData.TM.tarih.total += details.TM?.tarih?.correct || 0;
          subjectData.TM.tarih.count += 1;
          subjectData.TM.cografya.total += details.TM?.cografya?.correct || 0;
          subjectData.TM.cografya.count += 1;
        } else if (exam.field === 'TS') {
          subjectData.TS.turkce.total += details.TS?.turkce?.correct || 0;
          subjectData.TS.turkce.count += 1;
          subjectData.TS.tarih1.total += details.TS?.tarih1?.correct || 0;
          subjectData.TS.tarih1.count += 1;
          subjectData.TS.cografya1.total += details.TS?.cografya1?.correct || 0;
          subjectData.TS.cografya1.count += 1;
          subjectData.TS.tarih2.total += details.TS?.tarih2?.correct || 0;
          subjectData.TS.tarih2.count += 1;
          subjectData.TS.cografya2.total += details.TS?.cografya2?.correct || 0;
          subjectData.TS.cografya2.count += 1;
          subjectData.TS.felsefe.total += details.TS?.felsefe?.correct || 0;
          subjectData.TS.felsefe.count += 1;
          subjectData.TS.din.total += details.TS?.din?.correct || 0;
          subjectData.TS.din.count += 1;
        } else if (exam.field === 'DİL') {
          subjectData.DİL.ingilizce.total += details.DİL?.ingilizce?.correct || 0;
          subjectData.DİL.ingilizce.count += 1;
        }
      });

    // Tüm alanları birleştir
    const allSubjects = [
      ...Object.values(subjectData.MF),
      ...Object.values(subjectData.TM),
      ...Object.values(subjectData.TS),
      ...Object.values(subjectData.DİL)
    ];

    return allSubjects.map(subject => ({
      name: subject.name,
      ortalama: subject.count > 0 ? Math.round(subject.total / subject.count) : 0,
      toplam: subject.total
    }));
  };

  // Birleşik grafik verileri (TYT + AYT)
  const prepareCombinedChartData = () => {
    const combinedData = {
      turkce: { name: 'Türkçe', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      matematik: { name: 'Matematik', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      fizik: { name: 'Fizik', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      kimya: { name: 'Kimya', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      biyoloji: { name: 'Biyoloji', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      tarih: { name: 'Tarih', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      cografya: { name: 'Coğrafya', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      felsefe: { name: 'Felsefe', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      din: { name: 'Din Kültürü', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 },
      ingilizce: { name: 'İngilizce', tyt: 0, ayt: 0, tytCount: 0, aytCount: 0 }
    };

    // TYT verilerini ekle
    exams.filter(exam => exam.type === 'TYT').forEach(exam => {
      combinedData.turkce.tyt += exam.tytDetails?.turkce?.correct || 0;
      combinedData.turkce.tytCount += 1;
      combinedData.matematik.tyt += exam.tytDetails?.matematik?.correct || 0;
      combinedData.matematik.tytCount += 1;
      combinedData.fizik.tyt += exam.tytDetails?.fen?.fizik?.correct || 0;
      combinedData.fizik.tytCount += 1;
      combinedData.kimya.tyt += exam.tytDetails?.fen?.kimya?.correct || 0;
      combinedData.kimya.tytCount += 1;
      combinedData.biyoloji.tyt += exam.tytDetails?.fen?.biyoloji?.correct || 0;
      combinedData.biyoloji.tytCount += 1;
      combinedData.tarih.tyt += exam.tytDetails?.sosyal?.tarih?.correct || 0;
      combinedData.tarih.tytCount += 1;
      combinedData.cografya.tyt += exam.tytDetails?.sosyal?.cografya?.correct || 0;
      combinedData.cografya.tytCount += 1;
      combinedData.felsefe.tyt += exam.tytDetails?.sosyal?.felsefe?.correct || 0;
      combinedData.felsefe.tytCount += 1;
      combinedData.din.tyt += exam.tytDetails?.sosyal?.din?.correct || 0;
      combinedData.din.tytCount += 1;
    });

    // AYT verilerini ekle
    exams.filter(exam => exam.type === 'AYT').forEach(exam => {
      const details = exam.aytDetails;
      if (!details) return;

      if (exam.field === 'MF') {
        combinedData.matematik.ayt += details.MF?.matematik?.correct || 0;
        combinedData.matematik.aytCount += 1;
        combinedData.fizik.ayt += details.MF?.fizik?.correct || 0;
        combinedData.fizik.aytCount += 1;
        combinedData.kimya.ayt += details.MF?.kimya?.correct || 0;
        combinedData.kimya.aytCount += 1;
        combinedData.biyoloji.ayt += details.MF?.biyoloji?.correct || 0;
        combinedData.biyoloji.aytCount += 1;
      } else if (exam.field === 'TM') {
        combinedData.matematik.ayt += details.TM?.matematik?.correct || 0;
        combinedData.matematik.aytCount += 1;
        combinedData.turkce.ayt += details.TM?.turkce?.correct || 0;
        combinedData.turkce.aytCount += 1;
        combinedData.tarih.ayt += details.TM?.tarih?.correct || 0;
        combinedData.tarih.aytCount += 1;
        combinedData.cografya.ayt += details.TM?.cografya?.correct || 0;
        combinedData.cografya.aytCount += 1;
      } else if (exam.field === 'TS') {
        combinedData.turkce.ayt += details.TS?.turkce?.correct || 0;
        combinedData.turkce.aytCount += 1;
        combinedData.tarih.ayt += (details.TS?.tarih1?.correct || 0) + (details.TS?.tarih2?.correct || 0);
        combinedData.tarih.aytCount += 1;
        combinedData.cografya.ayt += (details.TS?.cografya1?.correct || 0) + (details.TS?.cografya2?.correct || 0);
        combinedData.cografya.aytCount += 1;
        combinedData.felsefe.ayt += details.TS?.felsefe?.correct || 0;
        combinedData.felsefe.aytCount += 1;
        combinedData.din.ayt += details.TS?.din?.correct || 0;
        combinedData.din.aytCount += 1;
      } else if (exam.field === 'DİL') {
        combinedData.ingilizce.ayt += details.DİL?.ingilizce?.correct || 0;
        combinedData.ingilizce.aytCount += 1;
      }
    });

    return Object.values(combinedData).map(subject => ({
      name: subject.name,
      tytOrtalama: subject.tytCount > 0 ? Math.round(subject.tyt / subject.tytCount) : 0,
      aytOrtalama: subject.aytCount > 0 ? Math.round(subject.ayt / subject.aytCount) : 0,
      tytToplam: subject.tyt,
      aytToplam: subject.ayt
    }));
  };

  const examChartData = prepareExamChartData();
  const subjectChartData = prepareSubjectChartData();
  const fenSubSubjectsData = prepareFenSubSubjectsChartData();
  const sosyalSubSubjectsData = prepareSosyalSubSubjectsChartData();
  const aytChartData = prepareAytChartData();
  const aytSubjectChartData = prepareAytSubjectChartData();
  const combinedChartData = prepareCombinedChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Öğrenci Paneli</h1>
        <div className="text-sm text-gray-500">
          Hoş geldiniz, {userData?.name}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Ana Sayfa', icon: Home },
            { id: 'studyProgram', label: 'Çalışma Programı', icon: BookOpen },
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




      {/* Ana Sayfa Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hoş Geldiniz Bölümü */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Merhaba {userData?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-gray-600">
                  Bugün de harika bir gün olsun! Çalışma hedeflerine doğru ilerlemen için buradayız.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-10 w-10 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Görev Tamamlama</p>
                  <p className="text-2xl font-bold text-gray-900">%{getCompletionRate()}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-success-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getCompletionRate()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary-600" />
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
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-purple-600" />
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
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Soru Takibi</p>
              </button>
              <button
                onClick={() => setActiveTab('exams')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Denemeler</p>
              </button>
              <button
                onClick={() => setActiveTab('studyProgram')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Çalışma Programı</p>
              </button>
              <button
                onClick={() => setActiveTab('topicTracking')}
                className="p-4 text-center rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <BookMarked className="h-8 w-8 text-orange-600 mx-auto mb-2" />
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
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
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
                    className="text-blue-600 text-sm mt-1 hover:text-blue-700"
                  >
                    İlk denemenizi ekleyin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Deneme Analizi Tab */}
      {activeTab === 'examAnalysis' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Deneme Analizi Takibi</h2>
            <button
              onClick={() => setShowExamAnalysisModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Analiz Kaydı Ekle</span>
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-purple-900 mb-2">🧠 Deneme Analizi</h3>
            <p className="text-purple-700">
              Her deneme sonrası analiz yaparak zayıf yönlerinizi belirleyin ve yanlış sorularınızı gözden geçirin.
            </p>
          </div>

          {/* Analiz Bekleyen Denemeler */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Analiz Bekleyen Denemeler</h3>
            {(() => {
              const unanalyzedExams = exams.filter(exam => 
                !examAnalyses.some(analysis => analysis.examId === exam.id && analysis.analysisCompleted)
              );
              
              return unanalyzedExams.length > 0 ? (
                <div className="space-y-3">
                  {unanalyzedExams.map(exam => (
                    <div key={exam.id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{exam.name}</h4>
                          <p className="text-sm text-gray-600">
                            {exam.type} - {exam.field} • {new Date(exam.date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setExamAnalysisForm(prev => ({ ...prev, examId: exam.id }));
                            setShowExamAnalysisModal(true);
                          }}
                          className="btn-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          Analiz Et
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p>Tüm denemeleriniz analiz edildi! 🎉</p>
                </div>
              );
            })()}
          </div>

          {/* Analiz Geçmişi */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Analiz Geçmişim</h3>
            {examAnalyses.length > 0 ? (
              <div className="space-y-4">
                {examAnalyses
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((analysis) => {
                    const exam = exams.find(e => e.id === analysis.examId);
                    if (!exam) return null;

                    return (
                      <div key={analysis.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{exam.name}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(exam.date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {analysis.analysisCompleted && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Analiz Tamamlandı
                              </span>
                            )}
                            {analysis.reviewedWrongQuestions && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Yanlışlar Gözden Geçirildi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detaylı Analiz Bilgileri */}
                        <div className="space-y-3">
                          {/* Analiz Tamamlanma Oranı */}
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                analysis.completionPercentage === 100 ? 'bg-green-500' : 
                                analysis.completionPercentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium text-gray-700">Analiz Durumu</span>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                analysis.completionPercentage === 100 ? 'text-green-600' : 
                                analysis.completionPercentage >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                %{analysis.completionPercentage || 0}
                              </div>
                              <div className="text-xs text-gray-500">
                                {analysis.completionPercentage === 100 ? 'Analiz Tamamlandı!' : 
                                 analysis.completionPercentage >= 70 ? 'İyi Gidiyor' : 'Eksikler Var'}
                              </div>
                            </div>
                          </div>

                          {/* Ders Bazlı Detaylar */}
                          {analysis.subjectAnalysis && Object.keys(analysis.subjectAnalysis).length > 0 && (
                            <div className="space-y-3">
                              <h6 className="text-sm font-medium text-gray-700">📚 Ders Bazlı Detaylar:</h6>
                              <div className="grid grid-cols-1 gap-2">
                                {Object.entries(analysis.subjectAnalysis).map(([subject, data]) => (
                                  <div key={subject} className="p-3 bg-white rounded border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-gray-900">{subject}</span>
                                      <div className="flex items-center space-x-2 text-xs">
                                        {data.wrongCount > 0 && (
                                          <span className="text-red-600">{data.wrongCount} yanlış</span>
                                        )}
                                        {data.blankCount > 0 && (
                                          <span className="text-gray-600">{data.blankCount} boş</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      {data.wrongCount > 0 && (
                                        <div className="flex items-center space-x-1">
                                          {data.reviewedWrong ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                          )}
                                          <span className={data.reviewedWrong ? 'text-green-600' : 'text-red-600'}>
                                            Yanlışlar {data.reviewedWrong ? 'incelendi' : 'bekleniyor'}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {data.blankCount > 0 && (
                                        <div className="flex items-center space-x-1">
                                          {data.reviewedBlank ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-gray-500" />
                                          )}
                                          <span className={data.reviewedBlank ? 'text-green-600' : 'text-gray-600'}>
                                            Boşlar {data.reviewedBlank ? 'incelendi' : 'bekleniyor'}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {data.solvedWithTeacher > 0 && (
                                        <div className="flex items-center space-x-1 col-span-2">
                                          <CheckCircle className="h-3 w-3 text-purple-500" />
                                          <span className="text-purple-600">
                                            {data.solvedWithTeacher} soru öğretmen ile çözüldü
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Genel Özet (Toplam) */}
                          {(analysis.wrongQuestionCount > 0 || analysis.blankQuestionCount > 0) && (
                            <div className="grid grid-cols-2 gap-3">
                              {analysis.wrongQuestionCount > 0 && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-red-700">Toplam Yanlış</span>
                                    <span className="text-lg font-bold text-red-600">{analysis.wrongQuestionCount}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-red-600">
                                    {analysis.reviewedWrongQuestions ? (
                                      <span className="flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Tümü gözden geçirildi
                                      </span>
                                    ) : (
                                      <span className="flex items-center">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Henüz tamamlanmadı
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {analysis.blankQuestionCount > 0 && (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Toplam Boş</span>
                                    <span className="text-lg font-bold text-gray-600">{analysis.blankQuestionCount}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-600">
                                    {analysis.reviewedBlankQuestions ? (
                                      <span className="flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Tümü gözden geçirildi
                                      </span>
                                    ) : (
                                      <span className="flex items-center">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Henüz tamamlanmadı
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Öğretmen Yardımı */}
                          {(analysis.wrongQuestionCount > 0 || analysis.blankQuestionCount > 0) && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-purple-700">Öğretmen Yardımı</span>
                                <div className="text-right">
                                  {analysis.askedTeacherForHelp ? (
                                    <div>
                                      <span className="text-lg font-bold text-purple-600">
                                        {analysis.solvedWithTeacherCount || 0}
                                      </span>
                                      <div className="text-xs text-purple-600">soru çözüldü</div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-purple-600">Yardım istenmedi</span>
                                  )}
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-purple-600">
                                {analysis.askedTeacherForHelp ? (
                                  <span className="flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Öğretmenden yardım alındı
                                  </span>
                                ) : (
                                  <span className="flex items-center">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Öğretmenden yardım alınmadı
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Eski gelişim alanları (deprecated) */}
                          {analysis.targetImprovements && analysis.targetImprovements.length > 0 && (
                            <div className="p-2 bg-orange-50 rounded border border-orange-200">
                              <span className="text-xs font-medium text-orange-700">Notlar:</span>
                              <div className="text-xs text-orange-600 mt-1">
                                {analysis.targetImprovements.join(', ')}
                              </div>
                            </div>
                          )}

                          {analysis.actionPlan && (
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <span className="text-xs font-medium text-blue-700">Aksiyon Planı:</span>
                              <div className="text-xs text-blue-600 mt-1">{analysis.actionPlan}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Henüz deneme analizi kaydınız bulunmuyor.</p>
                <p className="text-sm">İlk analizinizi eklemek için yukarıdaki butona tıklayın!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Haftalık Program Tab */}
      {activeTab === 'studyProgram' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  📅 Haftalık Çalışma Programım
                </h2>
                <p className="text-gray-600">
                  👨‍🏫 Öğretmeniniz tarafından hazırlanan programınızı takip edin
                </p>

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
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
                    <div className="text-center">
                      <h3 className="font-semibold">{dayName}</h3>
                      <p className="text-sm opacity-90">
                        {currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* Aktiviteler */}
                  <div className="p-3 space-y-3 min-h-[400px]">
                    {dayActivities.length > 0 ? (
                      dayActivities.map((activity: any) => {
                        const status = activityStatuses[activity.id] || 'todo';
                        return (
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
                                {getActivityStatusIcon(activity.id)}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm">{activity.subject}</h4>
                              <p className="text-xs opacity-90 mt-1">{activity.topic}</p>
                              {activity.time && (
                                <div className="flex items-center space-x-1 mt-2">
                                  <Clock className="h-3 w-3" />
                                  <span className="text-xs">{activity.time}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Durum Butonları */}
                            <div className="mt-3 flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActivityStatus(activity.id, 'todo');
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  status === 'todo' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                                }`}
                                title="Yapılacak"
                              >
                                📋
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActivityStatus(activity.id, 'doing');
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  status === 'doing' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                                }`}
                                title="Yapılıyor"
                              >
                                ⏳
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateActivityStatus(activity.id, 'done');
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  status === 'done' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                                }`}
                                title="Tamamlandı"
                              >
                                ✅
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Görev yok</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Program yoksa mesaj */}
          {Object.values(getWeekProgram()).flat().length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bu hafta için program henüz oluşturulmamış
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Öğretmeniniz size özel haftalık çalışma programı oluşturduğunda burada görünecek.
              </p>
              <div className="mt-4 flex justify-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  👨‍🏫 Öğretmeninizi bekleyin
                </span>
              </div>
            </div>
          )}

          {/* İstatistikler */}
          {Object.values(getWeekProgram()).flat().length > 0 && (
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
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(getWeekProgram()).flat().filter((a: any) => activityStatuses[a.id] === 'done').length}
                    </p>
                    <p className="text-sm text-gray-500">Tamamlanan</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Timer className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(getWeekProgram()).flat().filter((a: any) => activityStatuses[a.id] === 'doing').length}
                    </p>
                    <p className="text-sm text-gray-500">Devam Eden</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.values(getWeekProgram()).flat().length > 0 ? 
                        Math.round((Object.values(getWeekProgram()).flat().filter((a: any) => activityStatuses[a.id] === 'done').length / 
                        Object.values(getWeekProgram()).flat().length) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Tamamlama</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Denemeler Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Denemelerim</h2>
            <button
              onClick={() => setShowExamModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Deneme Ekle</span>
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Deneme Sonuçları</h3>
                         <p className="text-blue-700">
               TYT ve AYT deneme sonuçlarınızı burada girebilirsiniz. TYT için toplam 120 soru (Türkçe 40, Temel Matematik 40, 
               Fen Bilimleri 20, Sosyal Bilimler 20) ders bazlı giriş yapabilirsiniz.
             </p>
          </div>

          {/* Deneme Listesi */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Son Denemeler</h3>
            {exams.length > 0 ? (
              <div className="space-y-3">
            {exams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div>
                      <h4 className="font-semibold text-gray-900">{exam.name}</h4>
                      <p className="text-sm text-gray-500">
                        {exam.type} - {exam.field} - {exam.date.toLocaleDateString('tr-TR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Doğru: {exam.correctAnswers} | Yanlış: {exam.wrongAnswers} | Puan: %{exam.score}
                      </p>
                      {exam.isAnalyzed && (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mt-1">
                          Analiz Tamamlandı
                  </span>
                      )}
                </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewExam(exam)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        İncele
                      </button>
                      <button
                        onClick={() => {
                          console.log('Paylaş button clicked for exam:', exam.id);
                          shareExam(exam.id);
                        }}
                        disabled={!userData?.id}
                        className={`px-3 py-1 text-sm rounded ${
                          userData?.id 
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Paylaş
                      </button>
                      <button
                        onClick={() => toggleExamAnalysis(exam.id, exam.isAnalyzed || false)}
                        className={`px-3 py-1 text-sm rounded ${
                          exam.isAnalyzed 
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {exam.isAnalyzed ? 'Analizi Kaldır' : 'Analiz Et'}
                      </button>
                      <button
                        onClick={() => deleteExam(exam.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Sil
                      </button>
                </div>
              </div>
            ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Henüz deneme verisi girilmemiş. İlk denemenizi ekleyerek başlayın.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Soru Takibi Tab */}
      {activeTab === 'questionTracking' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Soru Takibi</h2>
            <button
              onClick={() => setShowQuestionTrackingModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Soru Ekle</span>
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">Günlük Soru Takibi</h3>
            <p className="text-green-700">
              Her gün hangi dersten kaç soru çözdüğünüzü burada girebilirsiniz. 
              Bu veriler öğretmeniniz tarafından takip edilecektir.
            </p>
          </div>

          {/* Soru takibi verileri */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📚 Konu Bazlı Soru Takibi Geçmişi</h3>
            {questionTracking.length > 0 ? (
              <div className="space-y-6">
                {questionTracking
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 7)
                  .map((tracking) => {
                    const trackingDate = tracking.date instanceof Date 
                      ? tracking.date.toLocaleDateString('tr-TR') 
                      : new Date(tracking.date).toLocaleDateString('tr-TR');
                    
                    // Yeni yapıya göre - her kayıt bir konuyu temsil ediyor
                    const subject = tracking.subject || 'Bilinmiyor';
                    const topic = tracking.topic || 'Konu belirtilmemiş';
                    const correct = Number(tracking.correct || 0);
                    const wrong = Number(tracking.wrong || 0);
                    const empty = Number(tracking.empty || 0);
                    const totalQuestions = correct + wrong + empty;
                    const successRate = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
                    
                    return (
                      <div key={tracking.id} className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                        {/* Tarih ve Genel İstatistikler */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">{trackingDate}</h4>
                              <p className="text-sm text-gray-600">Konu Bazlı Soru Çözme Detayı</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                            <div className="text-sm text-gray-500">Toplam Soru</div>
                          </div>
                        </div>

                        {/* Konu Detayları */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {subject === 'matematik' ? '🔢' :
                                 subject === 'fizik' ? '⚡' :
                                 subject === 'kimya' ? '🧪' :
                                 subject === 'biyoloji' ? '🧬' :
                                 subject === 'turkce' ? '📖' :
                                 subject === 'tarih' ? '🏛️' :
                                 subject === 'cografya' ? '🌍' :
                                 subject === 'felsefe' ? '🤔' :
                                 subject === 'ingilizce' ? '🇬🇧' : '📚'}
                              </span>
                              <h6 className="font-semibold text-gray-800">
                                {subject === 'matematik' ? 'Matematik' :
                                 subject === 'fizik' ? 'Fizik' :
                                 subject === 'kimya' ? 'Kimya' :
                                 subject === 'biyoloji' ? 'Biyoloji' :
                                 subject === 'turkce' ? 'Türkçe' :
                                 subject === 'tarih' ? 'Tarih' :
                                 subject === 'cografya' ? 'Coğrafya' :
                                 subject === 'felsefe' ? 'Felsefe' :
                                 subject === 'ingilizce' ? 'İngilizce' : subject}
                              </h6>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              successRate >= 80 ? 'bg-green-100 text-green-600' :
                              successRate >= 60 ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              %{successRate}
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">📖 Konu:</p>
                            <p className="text-gray-600">{topic}</p>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{totalQuestions}</div>
                              <div className="text-xs text-gray-500">Toplam</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{correct}</div>
                              <div className="text-xs text-gray-500">✅ Doğru</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">{wrong}</div>
                              <div className="text-xs text-gray-500">❌ Yanlış</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-yellow-600">{empty}</div>
                              <div className="text-xs text-gray-500">⭕ Boş</div>
                            </div>
                          </div>

                          {/* Gözden Geçirme Durumu */}
                          {(wrong > 0 || empty > 0) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">🔄 Gözden Geçirme:</p>
                              <div className="flex gap-4 text-xs">
                                {wrong > 0 && (
                                  <span className={tracking.reviewedWrong ? 'text-green-600' : 'text-red-600'}>
                                    {tracking.reviewedWrong ? '✅' : '❌'} Yanlışlar ({wrong})
                                  </span>
                                )}
                                {empty > 0 && (
                                  <span className={tracking.reviewedBlank ? 'text-green-600' : 'text-yellow-600'}>
                                    {tracking.reviewedBlank ? '✅' : '⏳'} Boşlar ({empty})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Henüz Soru Takibi Verisi Yok</h4>
                <p className="text-gray-600 mb-4">İlk soru takibi verinizi ekleyerek başlayın.</p>
                <button
                  onClick={() => setShowQuestionTrackingModal(true)}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>İlk Kaydı Ekle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Performans Analizi</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Görev İstatistikleri</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tamamlanan</span>
                    <span>{tasks.filter(t => t.isCompleted).length} / {tasks.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-success-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCompletionRate()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Deneme Ortalamaları</h3>
              <div className="space-y-3">
                {['TYT', 'AYT'].map(type => {
                  const typeExams = exams.filter(exam => exam.type === type);
                  const avgScore = typeExams.length > 0 
                    ? typeExams.reduce((sum, exam) => sum + exam.score, 0) / typeExams.length
                    : 0;
                  
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{type}</span>
                      <span className="font-medium">%{avgScore.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deneme Grafikleri Tab */}
      {activeTab === 'charts' && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900">Deneme Sonuçları Grafikleri</h2>
          
          {(examChartData.length > 0 || aytChartData.length > 0) ? (
            <>
              {/* TYT ve AYT Birleşik Ders Karşılaştırması */}
              {combinedChartData.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">TYT vs AYT Ders Karşılaştırması</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={combinedChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tytOrtalama" name="TYT Ortalama" fill="#8884d8" />
                      <Bar dataKey="aytOrtalama" name="AYT Ortalama" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* TYT Grafikleri */}
              {examChartData.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">TYT Deneme Sonuçları</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* TYT Zaman içinde ders bazında doğru sayısı */}
                    <div className="bg-white p-4 rounded shadow">
                      <h4 className="text-md font-medium mb-2">TYT Ders Bazında Doğru Sayısı (Zamana Göre)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={examChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="turkce" name="Türkçe" stroke="#8884d8" />
                          <Line type="monotone" dataKey="matematik" name="Matematik" stroke="#82ca9d" />
                          <Line type="monotone" dataKey="fen" name="Fen Bilimleri" stroke="#ffc658" />
                          <Line type="monotone" dataKey="sosyal" name="Sosyal Bilimler" stroke="#ff7300" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* TYT Son denemelerde toplam doğru ve puan */}
                    <div className="bg-white p-4 rounded shadow">
                      <h4 className="text-md font-medium mb-2">TYT Son Denemelerde Toplam Doğru ve Puan</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={examChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="toplam" name="Toplam Doğru" fill="#8884d8" />
                          <Bar dataKey="puan" name="Puan" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* TYT Ortalama doğru sayısı (ders bazında) */}
                  <div className="bg-white p-4 rounded shadow">
                    <h4 className="text-md font-medium mb-2">TYT Ders Bazında Ortalama Doğru</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subjectChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ortalama" name="Ortalama Doğru" fill="#8884d8" />
                        <Bar dataKey="toplam" name="Toplam Doğru" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* TYT Fen ve Sosyal alt branşlar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-4 rounded shadow">
                      <h4 className="text-md font-medium mb-2">TYT Fen Bilimleri Alt Branşlar</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={fenSubSubjectsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="ortalama" name="Ortalama Doğru" fill="#ffc658" />
                          <Bar dataKey="toplam" name="Toplam Doğru" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="bg-white p-4 rounded shadow">
                      <h4 className="text-md font-medium mb-2">TYT Sosyal Bilimler Alt Branşlar</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={sosyalSubSubjectsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="ortalama" name="Ortalama Doğru" fill="#ff7300" />
                          <Bar dataKey="toplam" name="Toplam Doğru" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* AYT Grafikleri */}
              {aytChartData.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">AYT Deneme Sonuçları</h3>
                  
                  {/* AYT Alan Bazlı Ders Ortalamaları */}
                  <div className="bg-white p-4 rounded shadow">
                    <h4 className="text-md font-medium mb-2">AYT Alan Bazlı Ders Ortalamaları</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={aytSubjectChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ortalama" name="Ortalama Doğru" fill="#82ca9d" />
                        <Bar dataKey="toplam" name="Toplam Doğru" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AYT Alan Bazlı Zaman Serisi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {aytChartData.filter(exam => exam.field === 'MF').length > 0 && (
                      <div className="bg-white p-4 rounded shadow">
                        <h4 className="text-md font-medium mb-2">AYT MF (Sayısal) - Zamana Göre</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={aytChartData.filter(exam => exam.field === 'MF')}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="matematik" name="Matematik" stroke="#8884d8" />
                            <Line type="monotone" dataKey="fizik" name="Fizik" stroke="#82ca9d" />
                            <Line type="monotone" dataKey="kimya" name="Kimya" stroke="#ffc658" />
                            <Line type="monotone" dataKey="biyoloji" name="Biyoloji" stroke="#ff7300" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {aytChartData.filter(exam => exam.field === 'TM').length > 0 && (
                      <div className="bg-white p-4 rounded shadow">
                        <h4 className="text-md font-medium mb-2">AYT TM (Eşit Ağırlık) - Zamana Göre</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={aytChartData.filter(exam => exam.field === 'TM')}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="matematik" name="Matematik" stroke="#8884d8" />
                            <Line type="monotone" dataKey="turkce" name="Türk Dili" stroke="#82ca9d" />
                            <Line type="monotone" dataKey="tarih" name="Tarih" stroke="#ffc658" />
                            <Line type="monotone" dataKey="cografya" name="Coğrafya" stroke="#ff7300" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {aytChartData.filter(exam => exam.field === 'TS').length > 0 && (
                      <div className="bg-white p-4 rounded shadow">
                        <h4 className="text-md font-medium mb-2">AYT TS (Sözel) - Zamana Göre</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={aytChartData.filter(exam => exam.field === 'TS')}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="turkce" name="Türk Dili" stroke="#8884d8" />
                            <Line type="monotone" dataKey="tarih1" name="Tarih-1" stroke="#82ca9d" />
                            <Line type="monotone" dataKey="tarih2" name="Tarih-2" stroke="#ffc658" />
                            <Line type="monotone" dataKey="cografya1" name="Coğrafya-1" stroke="#ff7300" />
                            <Line type="monotone" dataKey="cografya2" name="Coğrafya-2" stroke="#8dd1e1" />
                            <Line type="monotone" dataKey="felsefe" name="Felsefe" stroke="#d084d0" />
                            <Line type="monotone" dataKey="din" name="Din Kültürü" stroke="#ff8042" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {aytChartData.filter(exam => exam.field === 'DİL').length > 0 && (
                      <div className="bg-white p-4 rounded shadow">
                        <h4 className="text-md font-medium mb-2">AYT DİL (Yabancı Dil) - Zamana Göre</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={aytChartData.filter(exam => exam.field === 'DİL')}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="ingilizce" name="İngilizce" stroke="#8884d8" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg mb-2">Henüz deneme verisi bulunmuyor</p>
              <p className="text-sm">Grafikleri görmek için önce deneme sonuçlarınızı girin.</p>
            </div>
          )}
        </div>
      )}

      {/* Konu Takibi Tab */}
      {activeTab === 'topicTracking' && (
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

          {/* Ders Seçimi */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ders Seçin</h3>
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
                        ? 'border-green-500 bg-green-50 shadow-lg transform scale-105' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-center">
                      <h4 className={`font-medium text-lg ${
                        isSelected ? 'text-green-700' : 'text-gray-900'
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
                              isSelected ? 'bg-green-500' : 'bg-gray-400'
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
                                className={`h-4 w-4 cursor-pointer ${
                                  level <= (progress?.confidenceLevel || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                                onClick={() => updateTopicProgress(
                                  progress ? progress.id : topic.id,
                                  status,
                                  level,
                                  progress?.notes
                                )}
                              />
                            ))}
                          </div>
                          
                          <select
                            value={status}
                            onChange={(e) => updateTopicProgress(
                              progress ? progress.id : topic.id,
                              e.target.value,
                              progress?.confidenceLevel || 3,
                              progress?.notes
                            )}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="not_started">Başlanmadı</option>
                            <option value="in_progress">Devam Ediyor</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="review_needed">Tekrar Gerekli</option>
                          </select>
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

                {/* Öğretmen Konuları */}
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
                                className={`h-4 w-4 cursor-pointer ${
                                  level <= (progress?.confidenceLevel || 0)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                                onClick={() => updateTopicProgress(
                                  progress ? progress.id : topic.id,
                                  status,
                                  level,
                                  progress?.notes
                                )}
                              />
                            ))}
                          </div>
                          
                          <select
                            value={status}
                            onChange={(e) => updateTopicProgress(
                              progress ? progress.id : topic.id,
                              e.target.value,
                              progress?.confidenceLevel || 3,
                              progress?.notes
                            )}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="not_started">Başlanmadı</option>
                            <option value="in_progress">Devam Ediyor</option>
                            <option value="completed">Tamamlandı</option>
                            <option value="review_needed">Tekrar Gerekli</option>
                          </select>
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

          {/* Konu Ekleme Butonu */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowTopicProgressModal(true)}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Konu İlerlemesi Ekle</span>
            </button>
          </div>
        </div>
      )}

      {/* Deneme Ekleme Modal */}
      {showExamModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-[9999] backdrop-blur-sm"
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
          <div className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[85vh] overflow-y-auto">
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

      {/* Soru Takibi Modal */}
      {showQuestionTrackingModal && (
        <div 
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-start justify-center z-[99999] backdrop-blur-md"
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
              closeQuestionTrackingModal();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeQuestionTrackingModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-[900px] w-full max-h-[98vh] overflow-y-auto modal-content relative z-10"
            style={{ marginTop: '8px' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Günlük Soru Takibi Ekle</h3>
                <button
                  onClick={closeQuestionTrackingModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={addQuestionTracking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                  <input
                    type="date"
                    value={questionTrackingForm.date}
                    onChange={(e) => setQuestionTrackingForm({...questionTrackingForm, date: e.target.value})}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-6">
                  <h4 className="font-medium text-gray-900">📚 Ders Bazlı Soru Takibi</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      💡 Her ders için konular ekleyip, o gün çözdüğünüz tüm soruları tek seferde girebilirsiniz!
                    </p>
                  </div>
                  
                  {/* Dersler */}
                  {[
                    { key: 'matematik', label: 'Matematik', icon: '🔢', color: 'blue' },
                    { key: 'fizik', label: 'Fizik', icon: '⚡', color: 'purple' },
                    { key: 'kimya', label: 'Kimya', icon: '🧪', color: 'green' },
                    { key: 'biyoloji', label: 'Biyoloji', icon: '🧬', color: 'emerald' },
                    { key: 'turkce', label: 'Türkçe', icon: '📖', color: 'red' },
                    { key: 'tarih', label: 'Tarih', icon: '🏛️', color: 'yellow' },
                    { key: 'cografya', label: 'Coğrafya', icon: '🌍', color: 'cyan' },
                    { key: 'felsefe', label: 'Felsefe', icon: '🤔', color: 'indigo' },
                    { key: 'ingilizce', label: 'İngilizce', icon: '🇬🇧', color: 'pink' }
                  ].map((subject) => {
                    const topics = questionTrackingForm.subjects[subject.key as keyof typeof questionTrackingForm.subjects];
                    
                    return (
                      <div key={subject.key} className={`border-2 rounded-xl p-4 ${
                        subject.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                        subject.color === 'purple' ? 'border-purple-200 bg-purple-50' :
                        subject.color === 'green' ? 'border-green-200 bg-green-50' :
                        subject.color === 'emerald' ? 'border-emerald-200 bg-emerald-50' :
                        subject.color === 'red' ? 'border-red-200 bg-red-50' :
                        subject.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
                        subject.color === 'cyan' ? 'border-cyan-200 bg-cyan-50' :
                        subject.color === 'indigo' ? 'border-indigo-200 bg-indigo-50' :
                        'border-pink-200 bg-pink-50'
                      }`}>
                        {/* Ders Başlığı */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{subject.icon}</span>
                            <h5 className={`text-lg font-bold ${
                              subject.color === 'blue' ? 'text-blue-700' :
                              subject.color === 'purple' ? 'text-purple-700' :
                              subject.color === 'green' ? 'text-green-700' :
                              subject.color === 'emerald' ? 'text-emerald-700' :
                              subject.color === 'red' ? 'text-red-700' :
                              subject.color === 'yellow' ? 'text-yellow-700' :
                              subject.color === 'cyan' ? 'text-cyan-700' :
                              subject.color === 'indigo' ? 'text-indigo-700' :
                              'text-pink-700'
                            }`}>{subject.label}</h5>
                            {topics.length > 0 && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                subject.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                subject.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                subject.color === 'green' ? 'bg-green-100 text-green-600' :
                                subject.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                                subject.color === 'red' ? 'bg-red-100 text-red-600' :
                                subject.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                                subject.color === 'cyan' ? 'bg-cyan-100 text-cyan-600' :
                                subject.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                                'bg-pink-100 text-pink-600'
                              }`}>
                                {topics.length} konu
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addTopicToSubject(subject.key)}
                            className={`btn-primary text-white px-3 py-1 text-sm ${
                              subject.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                              subject.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                              subject.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                              subject.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' :
                              subject.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                              subject.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                              subject.color === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-700' :
                              subject.color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' :
                              'bg-pink-600 hover:bg-pink-700'
                            }`}
                          >
                            + Konu Ekle
                          </button>
                        </div>

                        {/* Konular */}
                        {topics.length > 0 && (
                          <div className="space-y-3">
                            {topics.map((topic: any) => {
                              const totalQuestions = topic.correct + topic.wrong + topic.empty;
                              const successRate = totalQuestions > 0 ? Math.round((topic.correct / totalQuestions) * 100) : 0;
                              
                              return (
                                <div key={topic.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                  {/* Konu Adı */}
                                  <div className="mb-3">
                                    <input
                                      type="text"
                                      value={topic.topic}
                                      onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'topic', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Konu adını girin... (örn: Rasyonel Sayılar)"
                                    />
                                  </div>

                                  {/* Soru Sayıları */}
                                  <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">✅ Doğru</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={topic.correct || ''}
                                        onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'correct', parseInt(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">❌ Yanlış</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={topic.wrong || ''}
                                        onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'wrong', parseInt(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">⭕ Boş</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={topic.empty || ''}
                                        onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'empty', parseInt(e.target.value) || 0)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                        placeholder="0"
                                      />
                                    </div>
                                  </div>

                                  {/* İstatistikler ve Gözden Geçirme */}
                                  {totalQuestions > 0 && (
                                    <div className="space-y-3">
                                      {/* Başarı Oranı */}
                                      <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                                        <span className="text-sm text-gray-600">Toplam: {totalQuestions} soru</span>
                                        <span className={`text-sm font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          %{successRate} başarı
                                        </span>
                                      </div>

                                      {/* Gözden Geçirme */}
                                      {(topic.wrong > 0 || topic.empty > 0) && (
                                        <div className="space-y-2">
                                          {topic.wrong > 0 && (
                                            <label className="flex items-center space-x-2 text-sm">
                                              <input
                                                type="checkbox"
                                                checked={topic.reviewedWrong}
                                                onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'reviewedWrong', e.target.checked)}
                                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                              />
                                              <span className="text-red-700">Yanlış sorular gözden geçirildi ({topic.wrong})</span>
                                            </label>
                                          )}
                                          {topic.empty > 0 && (
                                            <label className="flex items-center space-x-2 text-sm">
                                              <input
                                                type="checkbox"
                                                checked={topic.reviewedBlank}
                                                onChange={(e) => updateTopicInSubject(subject.key, topic.id, 'reviewedBlank', e.target.checked)}
                                                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                              />
                                              <span className="text-yellow-700">Boş sorular gözden geçirildi ({topic.empty})</span>
                                            </label>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Sil Butonu */}
                                  <div className="flex justify-end mt-3">
                                    <button
                                      type="button"
                                      onClick={() => removeTopicFromSubject(subject.key, topic.id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      🗑️ Sil
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Boş durumu */}
                        {topics.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">Henüz konu eklenmemiş</p>
                            <p className="text-xs">Yukarıdaki "Konu Ekle" butonunu kullanın</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">Soru Takibi Ekle</button>
                  <button
                    type="button"
                    onClick={closeQuestionTrackingModal}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-50">
          <div className="relative mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white max-h-[85vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Deneme Detayları</h3>
                <button
                  onClick={() => {
                    setShowExamViewModal(false);
                    setSelectedExam(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Deneme Adı</label>
                    <p className="text-gray-900">{selectedExam.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Deneme Türü</label>
                    <p className="text-gray-900">{selectedExam.type}</p>
                  </div>
                  {selectedExam.type === 'AYT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Alan</label>
                      <p className="text-gray-900">{selectedExam.field}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tarih</label>
                    <p className="text-gray-900">
                      {selectedExam.date instanceof Date 
                        ? selectedExam.date.toLocaleDateString('tr-TR') 
                        : new Date(selectedExam.date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Genel Sonuçlar</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Doğru</label>
                      <p className="text-2xl font-bold text-green-600">{selectedExam.correctAnswers}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Yanlış</label>
                      <p className="text-2xl font-bold text-red-600">{selectedExam.wrongAnswers}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Boş</label>
                      <p className="text-2xl font-bold text-gray-600">
                        {Math.max(0, selectedExam.totalQuestions - selectedExam.correctAnswers - selectedExam.wrongAnswers)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedExam.type === 'TYT' && selectedExam.tytDetails && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">TYT Ders Bazlı Detaylar</h4>
                    
                    {/* Türkçe */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Türkçe</h5>
                      <div className="bg-red-50 p-3 rounded border">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-green-600">✅ Doğru:</span>
                              <span className="font-medium">{selectedExam.tytDetails?.turkce?.correct || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-600">❌ Yanlış:</span>
                              <span className="font-medium">{selectedExam.tytDetails?.turkce?.wrong || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">⚪ Boş:</span>
                              <span className="font-medium">
                                {Math.max(0, (selectedExam.tytDetails?.turkce?.total || 40) - 
                                            (selectedExam.tytDetails?.turkce?.correct || 0) - 
                                            (selectedExam.tytDetails?.turkce?.wrong || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Temel Matematik */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Temel Matematik</h5>
                      <div className="bg-purple-50 p-3 rounded border">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-green-600">✅ Doğru:</span>
                              <span className="font-medium">{selectedExam.tytDetails?.matematik?.correct || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-600">❌ Yanlış:</span>
                              <span className="font-medium">{selectedExam.tytDetails?.matematik?.wrong || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">⚪ Boş:</span>
                              <span className="font-medium">
                                {Math.max(0, (selectedExam.tytDetails?.matematik?.total || 40) - 
                                            (selectedExam.tytDetails?.matematik?.correct || 0) - 
                                            (selectedExam.tytDetails?.matematik?.wrong || 0))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fen Bilimleri Alt Dersleri */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Fen Bilimleri</h5>
                      <div className="bg-blue-50 p-3 rounded border">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Fizik</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.fizik?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.fizik?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.fen?.fizik?.total || 7) - 
                                              (selectedExam.tytDetails?.fen?.fizik?.correct || 0) - 
                                              (selectedExam.tytDetails?.fen?.fizik?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Kimya</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.kimya?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.kimya?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.fen?.kimya?.total || 7) - 
                                              (selectedExam.tytDetails?.fen?.kimya?.correct || 0) - 
                                              (selectedExam.tytDetails?.fen?.kimya?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Biyoloji</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.biyoloji?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.fen?.biyoloji?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.fen?.biyoloji?.total || 6) - 
                                              (selectedExam.tytDetails?.fen?.biyoloji?.correct || 0) - 
                                              (selectedExam.tytDetails?.fen?.biyoloji?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm font-medium text-blue-800 text-center">
                          📊 Toplam Fen: {
                            (selectedExam.tytDetails?.fen?.fizik?.correct || 0) + 
                            (selectedExam.tytDetails?.fen?.kimya?.correct || 0) + 
                            (selectedExam.tytDetails?.fen?.biyoloji?.correct || 0)
                          } doğru, {
                            (selectedExam.tytDetails?.fen?.fizik?.wrong || 0) + 
                            (selectedExam.tytDetails?.fen?.kimya?.wrong || 0) + 
                            (selectedExam.tytDetails?.fen?.biyoloji?.wrong || 0)
                          } yanlış, {
                            Math.max(0, (selectedExam.tytDetails?.fen?.fizik?.total || 7) - (selectedExam.tytDetails?.fen?.fizik?.correct || 0) - (selectedExam.tytDetails?.fen?.fizik?.wrong || 0)) +
                            Math.max(0, (selectedExam.tytDetails?.fen?.kimya?.total || 7) - (selectedExam.tytDetails?.fen?.kimya?.correct || 0) - (selectedExam.tytDetails?.fen?.kimya?.wrong || 0)) +
                            Math.max(0, (selectedExam.tytDetails?.fen?.biyoloji?.total || 6) - (selectedExam.tytDetails?.fen?.biyoloji?.correct || 0) - (selectedExam.tytDetails?.fen?.biyoloji?.wrong || 0))
                          } boş
                        </div>
                      </div>
                    </div>

                    {/* Sosyal Bilimler Alt Dersleri */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Sosyal Bilimler</h5>
                      <div className="bg-green-50 p-3 rounded border">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Tarih</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.tarih?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.tarih?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.sosyal?.tarih?.total || 5) - 
                                              (selectedExam.tytDetails?.sosyal?.tarih?.correct || 0) - 
                                              (selectedExam.tytDetails?.sosyal?.tarih?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Coğrafya</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.cografya?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.cografya?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.sosyal?.cografya?.total || 5) - 
                                              (selectedExam.tytDetails?.sosyal?.cografya?.correct || 0) - 
                                              (selectedExam.tytDetails?.sosyal?.cografya?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Felsefe</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.felsefe?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.felsefe?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.sosyal?.felsefe?.total || 5) - 
                                              (selectedExam.tytDetails?.sosyal?.felsefe?.correct || 0) - 
                                              (selectedExam.tytDetails?.sosyal?.felsefe?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <div className="font-medium text-gray-900 mb-1">Din Kültürü</div>
                            <div className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-green-600">✅ Doğru:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.din?.correct || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">❌ Yanlış:</span>
                                <span className="font-medium">{selectedExam.tytDetails?.sosyal?.din?.wrong || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">⚪ Boş:</span>
                                <span className="font-medium">
                                  {Math.max(0, (selectedExam.tytDetails?.sosyal?.din?.total || 5) - 
                                              (selectedExam.tytDetails?.sosyal?.din?.correct || 0) - 
                                              (selectedExam.tytDetails?.sosyal?.din?.wrong || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm font-medium text-green-800 text-center">
                          📊 Toplam Sosyal: {
                            (selectedExam.tytDetails?.sosyal?.tarih?.correct || 0) + 
                            (selectedExam.tytDetails?.sosyal?.cografya?.correct || 0) + 
                            (selectedExam.tytDetails?.sosyal?.felsefe?.correct || 0) + 
                            (selectedExam.tytDetails?.sosyal?.din?.correct || 0)
                          } doğru, {
                            (selectedExam.tytDetails?.sosyal?.tarih?.wrong || 0) + 
                            (selectedExam.tytDetails?.sosyal?.cografya?.wrong || 0) + 
                            (selectedExam.tytDetails?.sosyal?.felsefe?.wrong || 0) + 
                            (selectedExam.tytDetails?.sosyal?.din?.wrong || 0)
                          } yanlış, {
                            Math.max(0, (selectedExam.tytDetails?.sosyal?.tarih?.total || 5) - (selectedExam.tytDetails?.sosyal?.tarih?.correct || 0) - (selectedExam.tytDetails?.sosyal?.tarih?.wrong || 0)) +
                            Math.max(0, (selectedExam.tytDetails?.sosyal?.cografya?.total || 5) - (selectedExam.tytDetails?.sosyal?.cografya?.correct || 0) - (selectedExam.tytDetails?.sosyal?.cografya?.wrong || 0)) +
                            Math.max(0, (selectedExam.tytDetails?.sosyal?.felsefe?.total || 5) - (selectedExam.tytDetails?.sosyal?.felsefe?.correct || 0) - (selectedExam.tytDetails?.sosyal?.felsefe?.wrong || 0)) +
                            Math.max(0, (selectedExam.tytDetails?.sosyal?.din?.total || 5) - (selectedExam.tytDetails?.sosyal?.din?.correct || 0) - (selectedExam.tytDetails?.sosyal?.din?.wrong || 0))
                          } boş
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedExam.type === 'AYT' && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">AYT Sonuçları</h5>
                    <p className="text-sm text-gray-600">
                      Doğru: {selectedExam.correctAnswers} | Yanlış: {selectedExam.wrongAnswers} | Boş: {Math.max(0, selectedExam.totalQuestions - selectedExam.correctAnswers - selectedExam.wrongAnswers)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konu Takibi Modal */}
      {showTopicProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Konu İlerlemesi Ekle</h3>
                <button
                  onClick={() => setShowTopicProgressModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={addTopicProgress} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konu Seçin</label>
                  <select
                    value={topicProgressForm.topicId}
                    onChange={(e) => {
                      const topic = YKS_TOPICS.find(t => t.id === e.target.value);
                      setTopicProgressForm({
                        ...topicProgressForm,
                        topicId: e.target.value,
                        topicName: topic?.name || '',
                        subject: topic?.subject || '',
                        examType: topic?.examType || 'TYT'
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Konu seçin...</option>
                    {YKS_TOPICS.map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name} ({topic.subject} - {topic.examType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                  <select
                    value={topicProgressForm.status}
                    onChange={(e) => setTopicProgressForm({
                      ...topicProgressForm,
                      status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'review_needed'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="not_started">Başlanmadı</option>
                    <option value="in_progress">Devam Ediyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="review_needed">Tekrar Gerekli</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Çalışma Saati</label>
                  <input
                    type="number"
                    min="0"
                    value={topicProgressForm.studyHours}
                    onChange={(e) => setTopicProgressForm({
                      ...topicProgressForm,
                      studyHours: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Güven Seviyesi</label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTopicProgressForm({
                          ...topicProgressForm,
                          confidenceLevel: level as 1 | 2 | 3 | 4 | 5
                        })}
                        className={`p-2 rounded ${
                          topicProgressForm.confidenceLevel >= level
                            ? 'text-yellow-400 bg-yellow-50'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        <Star className="h-6 w-6" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <textarea
                    value={topicProgressForm.notes}
                    onChange={(e) => setTopicProgressForm({
                      ...topicProgressForm,
                      notes: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Konu hakkında notlarınız..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button type="submit" className="btn-primary flex-1">Konu Ekle</button>
                  <button
                    type="button"
                    onClick={() => setShowTopicProgressModal(false)}
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
                            'Konuları çalışmaya başladığınızda ve tamamladığınızda burada görünecekler. Çalışma programınızdan konuları takip edebilirsiniz.' :
                            'Bir konuyu çalışmaya başladığınızda burada görünecek. Çalışma programınızdan yeni konular ekleyebilirsiniz.'
                          }
                        </p>
                        <button
                          onClick={() => {
                            setShowTopicsModal(false);
                            setActiveTab('studyProgram');
                          }}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Çalışma Programına Git
                        </button>
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

      {/* Günlük Soru Çözme Modal */}
      {showDailyQuestionModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-[9999] backdrop-blur-sm"
          onClick={closeDailyQuestionModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Günlük Soru Çözme Kaydı</h3>
                <button
                  onClick={closeDailyQuestionModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={saveDailyQuestionSession} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Tarih
                    </label>
                    <input
                      type="date"
                      value={dailyQuestionForm.date}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ders
                    </label>
                    <select
                      value={dailyQuestionForm.subject}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="matematik">Matematik</option>
                      <option value="fizik">Fizik</option>
                      <option value="kimya">Kimya</option>
                      <option value="biyoloji">Biyoloji</option>
                      <option value="turkce">Türkçe</option>
                      <option value="tarih">Tarih</option>
                      <option value="cografya">Coğrafya</option>
                      <option value="felsefe">Felsefe</option>
                      <option value="din">Din Kültürü</option>
                      <option value="ingilizce">İngilizce</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sınav Türü
                    </label>
                    <select
                      value={dailyQuestionForm.examType}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, examType: e.target.value as 'TYT' | 'AYT' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konu (İsteğe bağlı)
                  </label>
                  <input
                    type="text"
                    value={dailyQuestionForm.topic}
                    onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn: Türev, Fotosentez, Osmanlı Tarihi..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Doğru
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dailyQuestionForm.correctAnswers}
                      onChange={(e) => handleFormChange('correctAnswers', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yanlış
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dailyQuestionForm.wrongAnswers}
                      onChange={(e) => handleFormChange('wrongAnswers', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Boş
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dailyQuestionForm.blankAnswers}
                      onChange={(e) => handleFormChange('blankAnswers', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Otomatik Hesaplanan Toplam */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-center">
                    <span className="text-sm text-gray-600">Toplam Soru: </span>
                    <span className="text-lg font-bold text-blue-600">
                      {totalQuestions}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Süre (dakika)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dailyQuestionForm.timeSpent}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, timeSpent: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zorluk
                    </label>
                    <select
                      value={dailyQuestionForm.difficulty}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">Kolay</option>
                      <option value="medium">Orta</option>
                      <option value="hard">Zor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={dailyQuestionForm.reviewedWrongQuestions}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, reviewedWrongQuestions: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Yanlış yaptığım sorulara geri döndüm</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={dailyQuestionForm.reviewedBlankQuestions}
                      onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, reviewedBlankQuestions: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Boş bıraktığım sorulara baktım</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlarım (İsteğe bağlı)
                  </label>
                  <textarea
                    value={dailyQuestionForm.studentNotes}
                    onChange={(e) => setDailyQuestionForm(prev => ({ ...prev, studentNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Bu soru çözme seansı hakkında notlarınız..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeDailyQuestionModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deneme Analizi Modal */}
      {showExamAnalysisModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Deneme Analizi Kaydı</h3>
                <button
                  onClick={() => setShowExamAnalysisModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={saveExamAnalysis} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deneme Seçin
                  </label>
                  <select
                    value={examAnalysisForm.examId}
                    onChange={(e) => {
                      console.log('Exam selection changed:', e.target.value); // Debug log
                      setExamAnalysisForm(prev => ({ ...prev, examId: e.target.value }));
                      if (e.target.value) {
                        console.log('Calling loadExamDetailsForAnalysis with examId:', e.target.value); // Debug log
                        loadExamDetailsForAnalysis(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Deneme seçin...</option>
                    {exams.map(exam => (
                      <option key={exam.id} value={exam.id}>
                        {exam.name} - {exam.type} ({new Date(exam.date).toLocaleDateString('tr-TR')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ders Bazlı Analiz */}
                {Object.keys(examAnalysisForm.subjectAnalysis).length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">📚 Ders Bazlı Analiz</h4>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        Seçtiğiniz deneme sonuçlarından otomatik olarak yanlış ve boş sorular çekildi. 
                        Her ders için hangi sorulara geri döndüğünüzü işaretleyin.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(examAnalysisForm.subjectAnalysis).map(([subject, data]) => (
                        <div key={subject} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">{subject}</h5>
                            <div className="flex items-center space-x-4 text-sm">
                              {data.wrongCount > 0 && (
                                <span className="text-red-600 font-medium">
                                  {data.wrongCount} yanlış
                                </span>
                              )}
                              {data.blankCount > 0 && (
                                <span className="text-gray-600 font-medium">
                                  {data.blankCount} boş
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {data.wrongCount > 0 && (
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={data.reviewedWrong}
                                  onChange={(e) => setExamAnalysisForm(prev => ({
                                    ...prev,
                                    subjectAnalysis: {
                                      ...prev.subjectAnalysis,
                                      [subject]: { ...data, reviewedWrong: e.target.checked }
                                    }
                                  }))}
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700">
                                  {data.wrongCount} yanlış soruma geri döndüm
                                </span>
                              </label>
                            )}
                            
                            {data.blankCount > 0 && (
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={data.reviewedBlank}
                                  onChange={(e) => setExamAnalysisForm(prev => ({
                                    ...prev,
                                    subjectAnalysis: {
                                      ...prev.subjectAnalysis,
                                      [subject]: { ...data, reviewedBlank: e.target.checked }
                                    }
                                  }))}
                                  className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                                />
                                <span className="text-sm text-gray-700">
                                  {data.blankCount} boş soruma baktım
                                </span>
                              </label>
                            )}
                            
                            {(data.wrongCount > 0 || data.blankCount > 0) && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Öğretmen ile kaç soru çözdüm?
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={data.wrongCount + data.blankCount}
                                  placeholder="0"
                                  value={data.solvedWithTeacher || ''}
                                  onChange={(e) => setExamAnalysisForm(prev => ({
                                    ...prev,
                                    subjectAnalysis: {
                                      ...prev.subjectAnalysis,
                                      [subject]: { ...data, solvedWithTeacher: parseInt(e.target.value) || 0 }
                                    }
                                  }))}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(examAnalysisForm.subjectAnalysis).length === 0 && examAnalysisForm.examId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      Bu denemede hiç yanlış veya boş soru yok! 🎉 Analiz için sadece genel durumu işaretleyebilirsiniz.
                    </p>
                  </div>
                )}

                {/* Genel Analiz Durumu */}
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-900">Genel Analiz Durumu</h4>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={examAnalysisForm.analysisCompleted}
                      onChange={(e) => setExamAnalysisForm(prev => ({ ...prev, analysisCompleted: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Deneme analizini tamamladım</span>
                  </label>

                  {Object.keys(examAnalysisForm.subjectAnalysis).length > 0 && (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={examAnalysisForm.askedTeacherForHelp}
                        onChange={(e) => setExamAnalysisForm(prev => ({ ...prev, askedTeacherForHelp: e.target.checked }))}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Öğretmenden yardım istedim</span>
                    </label>
                  )}
                </div>

                {/* Notlar (eski gelişim alanları) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notlarım (İsteğe bağlı)
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Hangi konularda zorlandığınızı, ne çalışmanız gerektiğini yazabilirsiniz.
                  </div>
                  <textarea
                    value={examAnalysisForm.targetImprovements.join(', ')}
                    onChange={(e) => setExamAnalysisForm(prev => ({ 
                      ...prev, 
                      targetImprovements: e.target.value ? e.target.value.split(', ').filter(Boolean) : []
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Örn: Matematik integral konusu, fizik hareket konuları..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aksiyon Planım
                  </label>
                  <textarea
                    value={examAnalysisForm.actionPlan}
                    onChange={(e) => setExamAnalysisForm(prev => ({ ...prev, actionPlan: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Bu deneme sonrası hangi konulara odaklanacağım, nasıl çalışacağım..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExamAnalysisModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
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
    </div>
  );
};

export default StudentDashboard;