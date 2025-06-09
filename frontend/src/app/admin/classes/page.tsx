//src/app/admin/classes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAdminStore, Class } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import {
  AcademicCapIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

export default function ClassesManagePage() {
  const { user: currentUser } = useAuthStore();
  const { 
    classes,
    users,
    fetchClasses, 
    fetchUsers,
    createClass, 
    updateClass, 
    deleteClass,
    getClassUsers,
    assignUserToClass,
    isLoadingClasses,
    isLoading,
    error,
    clearError
  } = useAdminStore();

  const router = useRouter();

  // 로컬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Class | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Class | null>(null);
  const [showStudentsModal, setShowStudentsModal] = useState<Class | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<Class | null>(null);
  
  const [newClassName, setNewClassName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [classStudents, setClassStudents] = useState<User[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // 권한 확인 및 데이터 로드
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchClasses();
    fetchUsers();
  }, [currentUser, router, fetchClasses, fetchUsers]);

  // 권한 체크
  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  // 로딩 상태
  if (isLoadingClasses) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 반 필터링
  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 반 생성 처리
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      await createClass(newClassName);
      setNewClassName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create class:', error);
    }
  };

  // 반 수정 처리
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal || !editClassName.trim()) return;

    try {
      await updateClass(showEditModal.id, editClassName);
      setShowEditModal(null);
      setEditClassName('');
    } catch (error) {
      console.error('Failed to update class:', error);
    }
  };

  // 반 삭제 처리
  const handleDeleteClass = async (classId: number) => {
    try {
      await deleteClass(classId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete class:', error);
    }
  };

  // 반 학생 목록 조회
  const handleViewStudents = async (cls: Class) => {
    setShowStudentsModal(cls);
    setLoadingStudents(true);
    
    try {
      const students = await getClassUsers(cls.id);
      setClassStudents(students);
    } catch (error) {
      console.error('Failed to fetch class students:', error);
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // 학생 배정 처리
  const handleAssignStudent = async (userId: number) => {
    if (!showAssignModal) return;

    try {
      await assignUserToClass(userId, showAssignModal.id);
      setShowAssignModal(null);
      // 사용자 목록 새로고침
      fetchUsers();
    } catch (error) {
      console.error('Failed to assign student to class:', error);
    }
  };

  // 배정 가능한 학생들 (반이 없는 학생들)
  const availableStudents = users.filter(user => 
    user.role === 'student' && !user.class_id
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">반 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            반을 생성하고 학생들을 배정하여 관리하세요.
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          새 반 생성
        </button>
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

      {/* 검색 및 통계 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="반 이름으로 검색..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 통계 */}
          <div className="flex space-x-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{classes.length}</p>
              <p className="text-sm text-gray-600">전체 반</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-600">총 학생</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {availableStudents.length}
              </p>
              <p className="text-sm text-gray-600">미배정 학생</p>
            </div>
          </div>
        </div>
      </div>

      {/* 반 목록 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <div key={cls.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* 반 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <AcademicCapIcon className="h-8 w-8 text-indigo-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">ID: {cls.id}</p>
                  </div>
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewStudents(cls)}
                    className="p-2 text-gray-400 hover:text-indigo-600"
                    title="학생 목록 보기"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowAssignModal(cls)}
                    className="p-2 text-gray-400 hover:text-green-600"
                    title="학생 배정"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowEditModal(cls);
                      setEditClassName(cls.name);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600"
                    title="반 이름 수정"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => setShowDeleteConfirm(cls)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="반 삭제"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 반 정보 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">학생 수</span>
                  <span className="font-medium text-indigo-600">
                    {cls.student_count || 0}명
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">생성일</span>
                  <span className="text-sm text-gray-900">
                    {new Date(cls.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">최근 수정</span>
                  <span className="text-sm text-gray-900">
                    {new Date(cls.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {/* 빠른 액션 버튼 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewStudents(cls)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <UsersIcon className="h-4 w-4 mr-1" />
                    학생 목록
                  </button>
                  
                  <button
                    onClick={() => setShowAssignModal(cls)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    학생 배정
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 반이 없을 때 */}
      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? '검색 조건에 맞는 반이 없습니다.' : '아직 생성된 반이 없습니다.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              첫 번째 반 만들기
            </button>
          )}
        </div>
      )}

      {/* 반 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              새 반 생성
            </h3>
            
            <form onSubmit={handleCreateClass}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반 이름
                </label>
                <input
                  type="text"
                  placeholder="예: 컴퓨터공학과 1반"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClassName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  disabled={isLoading || !newClassName.trim()}
                >
                  {isLoading ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 반 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              반 이름 수정
            </h3>
            
            <form onSubmit={handleUpdateClass}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반 이름
                </label>
                <input
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(null);
                    setEditClassName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                  disabled={isLoading || !editClassName.trim()}
                >
                  {isLoading ? '수정 중...' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 반 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              반 삭제 확인
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              <strong>{showDeleteConfirm.name}</strong> 반을 정말 삭제하시겠습니까? 
              이 반에 속한 모든 학생들의 반 정보가 제거됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={() => handleDeleteClass(showDeleteConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 목록 모달 */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showStudentsModal.name} - 학생 목록
            </h3>
            
            {loadingStudents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                <p className="mt-2 text-gray-500">학생 목록을 불러오는 중...</p>
              </div>
            ) : classStudents.length > 0 ? (
              <div className="space-y-2">
                {classStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{student.username}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">ID: {student.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">이 반에는 아직 학생이 없습니다.</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowStudentsModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 배정 모달 */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {showAssignModal.name}에 학생 배정
            </h3>
            
            {availableStudents.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{student.username}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignStudent(student.id)}
                      className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                      disabled={isLoading}
                    >
                      배정
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">배정 가능한 학생이 없습니다.</p>
                <p className="text-sm text-gray-400 mt-1">모든 학생이 이미 반에 배정되어 있습니다.</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAssignModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}