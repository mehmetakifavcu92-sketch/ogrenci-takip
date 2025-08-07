import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Task, Exam } from '../types';
import { 
  BookOpen, 
  FileText, 
  BarChart3, 
  User as UserIcon,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Target,
  Eye
} from 'lucide-react';

const ParentDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [student, setStudent] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'exams' | 'analytics'>('overview');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      if (!userData?.studentId) {
        setLoading(false);
        return;
      }

      // Load student info
      const studentDoc = await getDoc(doc(db, 'users', userData.studentId));
      if (studentDoc.exists()) {
        setStudent({ ...studentDoc.data(), id: studentDoc.id } as User);
      }

      // Load tasks
      const tasksQuery = query(
        collection(db, 'tasks'), 
        where('studentId', '==', userData.studentId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as Task[];
      setTasks(tasksData);

      // Load exams
      const examsQuery = query(
        collection(db, 'exams'), 
        where('studentId', '==', userData.studentId)
      );
      const examsSnapshot = await getDocs(examsQuery);
      const examsData = examsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      })) as Exam[];
      setExams(examsData);
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
    } finally {
      setLoading(false);
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

  const getRecentExams = () => {
    return exams.slice(0, 5).sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Öğrenci Bulunamadı</h3>
        <p className="text-gray-500">Çocuğunuzun hesabı henüz sisteme bağlanmamış.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Veli Paneli</h1>
        <div className="text-sm text-gray-500">
          Hoş geldiniz, {userData?.name}
        </div>
      </div>

      {/* Student Info */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{student.name}</h2>
            <p className="text-gray-600">{student.email}</p>
            <p className="text-sm text-gray-500">Öğrenci</p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam Deneme</p>
              <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: Eye },
            { id: 'tasks', label: 'Görevler', icon: BookOpen },
            { id: 'exams', label: 'Denemeler', icon: FileText },
            { id: 'analytics', label: 'Analiz', icon: BarChart3 }
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
          {/* Today's Tasks */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bugünkü Görevler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getTodayTasks().map((task) => (
                <div key={task.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                          {task.subject}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.isCompleted 
                            ? 'bg-success-100 text-success-700' 
                            : 'bg-warning-100 text-warning-700'
                        }`}>
                          {task.isCompleted ? 'Tamamlandı' : 'Bekliyor'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2">
                      {task.isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-success-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-warning-600" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {getTodayTasks().length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Bugün için görev bulunmuyor.
                </div>
              )}
            </div>
          </div>

          {/* Recent Exams */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Son Denemeler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getRecentExams().map((exam) => (
                <div key={exam.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{exam.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      exam.type === 'TYT' ? 'bg-blue-100 text-blue-700' :
                      exam.type === 'AYT' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {exam.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {exam.subject && `${exam.subject} - `}
                    {exam.date.toLocaleDateString('tr-TR')}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Doğru: {exam.correctAnswers}</span>
                    <span>Yanlış: {exam.wrongAnswers}</span>
                    <span className="font-medium">%{exam.score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
              {getRecentExams().length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Henüz deneme sonucu bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Tüm Görevler</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        {task.subject}
                      </span>
                      <span className="text-xs text-gray-500">
                        {task.date.toLocaleDateString('tr-TR')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.isCompleted 
                          ? 'bg-success-100 text-success-700' 
                          : 'bg-warning-100 text-warning-700'
                      }`}>
                        {task.isCompleted ? 'Tamamlandı' : 'Bekliyor'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2">
                    {task.isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-success-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-warning-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                Henüz görev bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Tüm Denemeler</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div key={exam.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{exam.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    exam.type === 'TYT' ? 'bg-blue-100 text-blue-700' :
                    exam.type === 'AYT' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {exam.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {exam.subject && `${exam.subject} - `}
                  {exam.date.toLocaleDateString('tr-TR')}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span>Doğru: {exam.correctAnswers}</span>
                  <span>Yanlış: {exam.wrongAnswers}</span>
                  <span className="font-medium">%{exam.score.toFixed(1)}</span>
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                Henüz deneme sonucu bulunmuyor.
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
                {['TYT', 'AYT', 'BRANCH'].map(type => {
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
    </div>
  );
};

export default ParentDashboard; 