// src/app/students/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTaskStore } from '@/store/taskStore';
import { useHelpRequestStore } from '@/store/helpRequestStore';
import { User } from '@/types';

interface StudentWithStats extends User {
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  help_requests: number;
  progress_percentage: number;
  last_activity?: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const { user, token } = useAuthStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { helpRequests, fetchHelpRequests } = useHelpRequestStore();
  const router = useRouter();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (user && (user.role === 'teacher' || user.role === 'admin') && token) {
      fetchStudentsData();
      fetchTasks();
      fetchHelpRequests();
    }
  }, [user, token]);

  const fetchStudentsData = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('학생 목록을 가져올 수 없습니다.');
      }

      const users = await response.json();
      
      // 학생들만 필터링 (교사는 자신의 반, 관리자는 전체)
      const studentUsers = users.filter((u: User) => 
        u.role === 'student' && 
        (user?.role === 'admin' || u.class_id === user?.class_id)
      );

      // 각 학생의 통계 계산
      const studentsWithStats = studentUsers.map((student: User) => {
        const studentTasks = tasks.filter(t => t.user_id === student.id);
        const completedTasks = studentTasks.filter(t => t.stage === 'done');
        const delayedTasks = studentTasks.filter(t => t.is_delayed);
        const studentHelpRequests = helpRequests.filter(hr => hr.user_id === student.id);

        // 마지막 활동 시간 계산
        const lastTaskActivity = studentTasks
          .filter(t => t.current_stage_started_at)
          .sort((a, b) => new Date(b.current_stage_started_at!).getTime() - new Date(a.current_stage_started_at!).getTime())[0];

        return {
          ...student,
          total_tasks: studentTasks.length,
          completed_tasks: completedTasks.length,
          delayed_tasks: delayedTasks.length,
          help_requests: studentHelpRequests.length,
          progress_percentage: studentTasks.length > 0 
            ? Math.round((completedTasks.length / studentTasks.length) * 100)
            : 0,
          last_activity: lastTaskActivity?.current_stage_started_at,
        };
      });

      setStudents(studentsWithStats);
    } catch (error) {
      setError(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStudentTasks = (student: StudentWithStats) => {
    router.push(`/tasks?user_id=${student.id}`);
  };

  const handleCreateTaskForStudent = (student: StudentWithStats) => {
    setSelectedStudent(student);
    setShowTaskModal(true);
  };

  const getStatusBadge = (count: number, type: 'delayed' | 'help') => {
    if (count === 0) return null;
    
    const colors = {
      delayed: 'bg-red-100 text-red-800',
      help: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[type]}`}>
        {count}
      </span>
    );
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return '활동 없음';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return '방금 전';
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffHours < 48) return '1일 전';
    return date.toLocaleDateString('ko-KR');
  };

  if (user?.role === 'student') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">접근 권한이 없습니다</h2>
          <p className="text-gray-500 mt-2">이 페이지는 교사 및 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'admin' ? '전체 학생 관리' : '내 반 학생 관리'}
        </h1>
        <div className="flex space-x-2">
          <button
            onClick={fetchStudentsData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            새로고침
          </button>
          <button
            onClick={() => router.push('/statistics')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            통계 보기
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-lg p-3">
              <span className="text-white text-xl">👥</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">전체 학생</div>
              <div className="text-2xl font-bold text-gray-900">{students.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-lg p-3">
              <span className="text-white text-xl">✅</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">평균 진행률</div>
              <div className="text-2xl font-bold text-gray-900">
                {students.length > 0 
                  ? Math.round(students.reduce((sum, s) => sum + s.progress_percentage, 0) / students.length)
                  : 0
                }%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-500 rounded-lg p-3">
              <span className="text-white text-xl">⚠️</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">지연 중인 학생</div>
              <div className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.delayed_tasks > 0).length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-500 rounded-lg p-3">
              <span className="text-white text-xl">🆘</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">도움 요청</div>
              <div className="text-2xl font-bold text-gray-900">
                {students.reduce((sum, s) => sum + s.help_requests, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 목록 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {students.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                학생이 없습니다
              </h3>
              <p className="text-gray-600">
                {user?.role === 'admin' 
                  ? '시스템에 등록된 학생이 없습니다.' 
                  : '귀하의 반에 배정된 학생이 없습니다.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    학생 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    태스크 현황
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행률
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    문제 상황
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 활동
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {student.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.username}
                          </div>
                          {student.class_name && (
                            <div className="text-sm text-gray-500">
                              {student.class_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>전체: {student.total_tasks}개</div>
                        <div className="text-green-600">완료: {student.completed_tasks}개</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              student.progress_percentage >= 80 ? 'bg-green-600' :
                              student.progress_percentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${student.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {student.progress_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {getStatusBadge(student.delayed_tasks, 'delayed')}
                        {getStatusBadge(student.help_requests, 'help')}
                        {student.delayed_tasks === 0 && student.help_requests === 0 && (
                          <span className="text-green-600 text-sm">정상</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatLastActivity(student.last_activity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewStudentTasks(student)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          태스크 보기
                        </button>
                        <button
                          onClick={() => handleCreateTaskForStudent(student)}
                          className="text-green-600 hover:text-green-900"
                        >
                          태스크 생성
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 태스크 생성 모달 (간단한 버전) */}
      {showTaskModal && selectedStudent && (
        <TaskCreateModal 
          student={selectedStudent}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

// 간단한 태스크 생성 모달 컴포넌트
interface TaskCreateModalProps {
  student: StudentWithStats;
  onClose: () => void;
}

function TaskCreateModal({ student, onClose }: TaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedTime, setExpectedTime] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createTask } = useTaskStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        user_id: student.id,
        stage: 'todo',
        expected_time: expectedTime,
      });
      onClose();
    } catch (error) {
      console.error('태스크 생성 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">
          {student.username}에게 태스크 생성
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="태스크 제목을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
              placeholder="태스크 설명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              예상 시간 (분)
            </label>
            <input
              type="number"
              value={expectedTime}
              onChange={(e) => setExpectedTime(parseInt(e.target.value) || 30)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              min="1"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className={`
                px-4 py-2 text-sm font-medium text-white rounded-md
                ${isSubmitting || !title.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                }
              `}
            >
              {isSubmitting ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}