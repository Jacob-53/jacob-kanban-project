//app/admin/setting/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

interface SystemSettings {
  site_name: string;
  max_users_per_class: number;
  default_task_timeout: number;
  auto_approve_teachers: boolean;
  enable_notifications: boolean;
  maintenance_mode: boolean;
}

interface BackupInfo {
  last_backup: string;
  backup_size: string;
  next_scheduled: string;
}

export default function AdminSettingsPage() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'Jacob Kanban',
    max_users_per_class: 30,
    default_task_timeout: 60,
    auto_approve_teachers: false,
    enable_notifications: true,
    maintenance_mode: false
  });
  const [backupInfo, setBackupInfo] = useState<BackupInfo>({
    last_backup: '2024-01-15 14:30:00',
    backup_size: '125 MB',
    next_scheduled: '2024-01-16 02:00:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      // 실제로는 백엔드에서 설정을 가져와야 함
      // const response = await fetch(`${API_URL}/admin/settings`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setSettings(data);
      
      // 현재는 더미 데이터 사용
      console.log('시스템 설정 로드됨');
    } catch (error) {
      console.error('설정 로드 오류:', error);
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    if (!token) return;

    setIsSaving(true);
    setMessage(null);

    try {
      // 실제로는 백엔드로 설정을 저장해야 함
      // const response = await fetch(`${API_URL}/admin/settings`, {
      //   method: 'PUT',
      //   headers: { 
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(settings)
      // });
      
      // if (!response.ok) throw new Error('설정 저장 실패');
      
      // 현재는 로컬에서만 시뮬레이션
      setTimeout(() => {
        setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
        setIsSaving(false);
      }, 1000);
      
    } catch (error) {
      console.error('설정 저장 오류:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
      setIsSaving(false);
    }
  };

  const performBackup = async () => {
    if (!token) return;

    try {
      setMessage({ type: 'success', text: '백업이 시작되었습니다. 완료되면 알려드리겠습니다.' });
      
      // 실제로는 백엔드 백업 API 호출
      // await fetch(`${API_URL}/admin/backup`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
    } catch (error) {
      console.error('백업 오류:', error);
      setMessage({ type: 'error', text: '백업 실행에 실패했습니다.' });
    }
  };

  const clearCache = async () => {
    try {
      setMessage({ type: 'success', text: '캐시가 정리되었습니다.' });
      
      // 실제로는 백엔드 캐시 정리 API 호출
      // await fetch(`${API_URL}/admin/cache/clear`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
    } catch (error) {
      console.error('캐시 정리 오류:', error);
      setMessage({ type: 'error', text: '캐시 정리에 실패했습니다.' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">시스템 설정</h1>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">시스템 설정</h1>
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`px-4 py-2 rounded-lg text-white font-medium ${
            isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSaving ? '저장 중...' : '설정 저장'}
        </button>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* 일반 설정 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">일반 설정</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사이트 이름
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => handleSettingChange('site_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              반당 최대 학생 수
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.max_users_per_class}
              onChange={(e) => handleSettingChange('max_users_per_class', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기본 태스크 제한 시간 (분)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={settings.default_task_timeout}
              onChange={(e) => handleSettingChange('default_task_timeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 권한 및 보안 설정 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">권한 및 보안</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">교사 자동 승인</h3>
              <p className="text-sm text-gray-500">신규 교사 계정을 자동으로 승인합니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_approve_teachers}
                onChange={(e) => handleSettingChange('auto_approve_teachers', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">알림 활성화</h3>
              <p className="text-sm text-gray-500">시스템 알림을 활성화합니다</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_notifications}
                onChange={(e) => handleSettingChange('enable_notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">유지보수 모드</h3>
              <p className="text-sm text-gray-500">관리자만 접근 가능한 유지보수 모드</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => handleSettingChange('maintenance_mode', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 백업 및 유지보수 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">백업 및 유지보수</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* 백업 정보 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">백업 현황</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">마지막 백업:</span>
                <p className="font-medium">{backupInfo.last_backup}</p>
              </div>
              <div>
                <span className="text-gray-500">백업 크기:</span>
                <p className="font-medium">{backupInfo.backup_size}</p>
              </div>
              <div>
                <span className="text-gray-500">다음 예정:</span>
                <p className="font-medium">{backupInfo.next_scheduled}</p>
              </div>
            </div>
          </div>

          {/* 관리 작업 버튼들 */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={performBackup}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              즉시 백업
            </button>

            <button
              onClick={clearCache}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              캐시 정리
            </button>

            <button
              onClick={() => window.location.href = `${API_URL}/docs`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              API 문서
            </button>
          </div>
        </div>
      </div>

      {/* 시스템 정보 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">시스템 정보</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">버전 정보</h3>
              <ul className="space-y-1 text-gray-600">
                <li>Jacob Kanban: v1.0.0</li>
                <li>FastAPI: v0.104.0</li>
                <li>PostgreSQL: v15.0</li>
                <li>Next.js: v15.3.0</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">서버 상태</h3>
              <ul className="space-y-1 text-gray-600">
                <li>🟢 웹 서버: 정상</li>
                <li>🟢 데이터베이스: 정상</li>
                <li>🟢 백그라운드 작업: 정상</li>
                <li>🟢 알림 서비스: 정상</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}