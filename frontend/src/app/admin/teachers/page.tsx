'use client';

import { useEffect, useState } from 'react';
import { useAdminStore, PendingTeacher } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  AcademicCapIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function TeachersApprovePage() {
  const { user: currentUser } = useAuthStore();
  const { 
    pendingTeachers,
    users,
    fetchPendingTeachers,
    fetchUsers,
    approveTeacher,
    rejectTeacher,
    isLoading,
    error,
    clearError
  } = useAdminStore();

  const router = useRouter();

  // 로컬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState<PendingTeacher | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState<PendingTeacher | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  // 권한 확인 및 데이터 로드
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchPendingTeachers();
    fetchUsers();
  }, [currentUser, router, fetchPendingTeachers, fetchUsers]);

  // 권한 체크
  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  // 검색 필터링
  const filteredTeachers = pendingTeachers.filter(teacher =>
    teacher.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 승인된 교사 목록 (users에서 교사 역할인 사용자들)
  const approvedTeachers = users.filter(user => user.role === 'teacher');

  // 표시할 목록 결정
  const displayList = filter === 'approved' ? approvedTeachers : filteredTeachers;

  // 교사 승인 처리
  const handleApproveTeacher = async (teacherId: number) => {
    try {
      await approveTeacher(teacherId);
      setShowApproveConfirm(null);
    } catch (error) {
      console.error('Failed to approve teacher:', error);
    }
  };

  // 교사 거부 처리
  const handleRejectTeacher = async (teacherId: number) => {
    try {
      await rejectTeacher(teacherId);
      setShowRejectConfirm(null);
    } catch (error) {
      console.error('Failed to reject teacher:', error);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 대기 시간 계산
  const getWaitingTime = (requestedAt: string) => {
    const now = new Date();
    const requested = new Date(requestedAt);
    const diffInHours = Math.floor((now.getTime() - requested.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '1시간 미만';
    } else if (diffInHours < 24) {
      return `${diffInHours}시간`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days}일`;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">교사 승인 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          교사 권한을 요청한 사용자들을 승인하거나 거부하세요.
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-yellow-50 rounded-lg p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-yellow-900">{pendingTeachers.length}</p>
              <p className="text-sm text-yellow-700">승인 대기</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center">
            <CheckBadgeIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-green-900">{approvedTeachers.length}</p>
              <p className="text-sm text-green-700">승인된 교사</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold text-blue-900">
                {pendingTeachers.length + approvedTeachers.length}
              </p>
              <p className="text-sm text-blue-700">전체 교사 요청</p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* 필터 탭 */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'pending'
                  ? 'bg-white text-yellow-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              승인 대기 ({pendingTeachers.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'approved'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              승인된 교사 ({approvedTeachers.length})
            </button>
          </div>

          {/* 검색 */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="사용자명, 이메일로 검색..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 교사 목록 */}
      {isLoading ? (
        <div className="h-64 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : displayList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayList.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* 교사 정보 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-indigo-100 rounded-full p-3">
                      <UserIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{teacher.username}</h3>
                      <p className="text-sm text-gray-500">ID: {teacher.id}</p>
                    </div>
                  </div>
                  
                  {/* 상태 배지 */}
                  {filter === 'pending' ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      대기 중
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      승인됨
                    </span>
                  )}
                </div>

                {/* 교사 세부 정보 */}
                <div className="space-y-3">
                {teacher.email && (
                    <div className="flex items-center text-sm text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    <span>{teacher.email}</span>
                    </div>
                )}

                {(() => {
                    // 안전한 타입 체크
                    if (filter === 'pending' && 'requested_at' in teacher) {
                    const requestedAt = teacher.requested_at;
                    if (typeof requestedAt === 'string') {
                        return (
                        <>
                            <div className="flex items-center text-sm text-gray-600">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            <span>요청일: {formatDate(requestedAt)}</span>
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            <span>대기 시간: {getWaitingTime(requestedAt)}</span>
                            </div>
                        </>
                        );
                    }
                    }
                    return null;
                })()}

                {filter === 'approved' && teacher.class_name && (
                    <div className="flex items-center text-sm text-gray-600">
                    <AcademicCapIcon className="h-4 w-4 mr-2" />
                    <span>담당 반: {teacher.class_name}</span>
                    </div>
                )}
                </div>

                {/* 액션 버튼 */}
                {filter === 'pending' && (
                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={() => setShowApproveConfirm(teacher as PendingTeacher)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      <CheckIcon className="h-4 w-4 mr-1" />
                      승인
                    </button>
                    
                    <button
                      onClick={() => setShowRejectConfirm(teacher as PendingTeacher)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      <XMarkIcon className="h-4 w-4 mr-1" />
                      거부
                    </button>
                  </div>
                )}

                {filter === 'approved' && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-green-600">
                      <CheckBadgeIcon className="h-4 w-4 mr-2" />
                      <span>교사 권한 승인됨</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          {filter === 'pending' ? (
            <>
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? '검색 조건에 맞는 승인 대기 교사가 없습니다.' : '현재 승인 대기 중인 교사가 없습니다.'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                새로운 교사 승인 요청이 들어오면 여기에 표시됩니다.
              </p>
            </>
          ) : (
            <>
              <CheckBadgeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? '검색 조건에 맞는 승인된 교사가 없습니다.' : '아직 승인된 교사가 없습니다.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* 승인 확인 모달 */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              교사 승인 확인
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              <strong>{showApproveConfirm.username}</strong>님을 교사로 승인하시겠습니까?
              승인 후에는 교사 권한으로 시스템을 사용할 수 있습니다.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowApproveConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleApproveTeacher(showApproveConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? '승인 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거부 확인 모달 */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              교사 승인 거부 확인
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              <strong>{showRejectConfirm.username}</strong>님의 교사 승인 요청을 거부하시겠습니까?
              거부된 사용자는 학생 권한을 유지합니다.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleRejectTeacher(showRejectConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? '거부 중...' : '거부'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}