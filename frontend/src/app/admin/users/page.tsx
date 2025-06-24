'use client';

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import {
  UsersIcon,
  PencilIcon,
  TrashIcon,
  AcademicCapIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

type UserRole = 'admin' | 'teacher' | 'student';
type FilterRole = 'all' | UserRole;

export default function UsersManagePage() {
  const { user: currentUser } = useAuthStore();
  const { 
    users, 
    classes,
    fetchUsers, 
    fetchClasses,
    updateUserRole, 
    assignUserToClass, 
    deleteUser,
    isLoadingUsers,
    isLoadingClasses,
    isLoading,
    error,
    clearError
  } = useAdminStore();

  const router = useRouter();

  // 로컬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);

  // 권한 확인 및 데이터 로드
  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
    fetchClasses();
  }, [currentUser, router, fetchUsers, fetchClasses]);

  // 권한 체크
  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  // 로딩 상태
  if (isLoadingUsers || isLoadingClasses) {
    return (
      <div className="h-64 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // 사용자 필터링
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // 역할 변경 처리
  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  // 반 배정 처리
  const handleClassAssignment = async (userId: number, classId: number) => {
    try {
      await assignUserToClass(userId, classId);
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to assign user to class:', error);
    }
  };

  // 사용자 삭제 처리
  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // 역할별 아이콘
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="h-5 w-5 text-red-500" />;
      case 'teacher':
        return <AcademicCapIcon className="h-5 w-5 text-blue-500" />;
      case 'student':
        return <UserCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <UsersIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  // 역할별 배지 색상
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            시스템의 모든 사용자를 관리하고 권한을 설정하세요.
          </p>
        </div>
        
        <button
          onClick={() => router.push('/admin/users/create')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          새 사용자 추가
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

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 검색 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="사용자명, 이메일, 반 이름으로 검색..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 역할 필터 */}
          <div>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
            >
              <option value="all">모든 역할</option>
              <option value="admin">관리자</option>
              <option value="teacher">교사</option>
              <option value="student">학생</option>
            </select>
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-600">전체</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-gray-600">관리자</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'teacher').length}
            </p>
            <p className="text-sm text-gray-600">교사</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'student').length}
            </p>
            <p className="text-sm text-gray-600">학생</p>
          </div>
        </div>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  반
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRoleIcon(user.role)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role === 'admin' && '관리자'}
                      {user.role === 'teacher' && '교사'}
                      {user.role === 'student' && '학생'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.class_name || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email || '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="편집"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(user)}
                          className="text-red-600 hover:text-red-900"
                          title="삭제"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">검색 조건에 맞는 사용자가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              사용자 편집: {editingUser.username}
            </h3>
            
            <div className="space-y-4">
              {/* 역할 변경 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  역할
                </label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={editingUser.role}
                  onChange={(e) => handleRoleChange(editingUser.id, e.target.value as UserRole)}
                  disabled={isLoading}
                >
                  <option value="admin">관리자</option>
                  <option value="teacher">교사</option>
                  <option value="student">학생</option>
                </select>
              </div>

              {/* 반 배정 (학생만) */}
              {(editingUser.role === 'student' || editingUser.role === 'teacher') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    반 배정
                  </label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={editingUser.class_id || ''}
                    onChange={(e) => {
                      const classId = parseInt(e.target.value);
                      if (classId) {
                        handleClassAssignment(editingUser.id, classId);
                      }
                    }}
                    disabled={isLoading}
                  >
                    <option value="">반 선택...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={isLoading}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              사용자 삭제 확인
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              <strong>{showDeleteConfirm.username}</strong> 사용자를 정말 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없습니다.
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
                onClick={() => handleDeleteUser(showDeleteConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}