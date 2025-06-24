// src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">환영합니다!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium">전체 작업</h2>
          <p className="text-3xl font-bold mt-2">5</p>
        </div>
        <div className="bg-green-500 text-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium">완료된 작업</h2>
          <p className="text-3xl font-bold mt-2">2</p>
        </div>
        <div className="bg-red-500 text-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium">지연된 작업</h2>
          <p className="text-3xl font-bold mt-2">1</p>
        </div>
        <div className="bg-yellow-500 text-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium">도움 요청</h2>
          <p className="text-3xl font-bold mt-2">3</p>
        </div>
      </div>
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">최근 활동</h2>
        <div className="space-y-3">
          <div className="p-3 border rounded">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">API 설계</h3>
                <p className="text-sm text-gray-500">상태: design</p>
              </div>
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">데이터베이스 모델링</h3>
                <p className="text-sm text-gray-500">상태: implementation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}