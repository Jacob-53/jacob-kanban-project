// src/app/admin/stats/page.tsx

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_classes: number;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch("/admin/stats/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    };
    fetchStats();
  }, [token]);

  if (!stats) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold">{stats.total_users}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm text-gray-500">Students</h3>
          <p className="text-2xl font-bold">{stats.total_students}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm text-gray-500">Teachers</h3>
          <p className="text-2xl font-bold">{stats.total_teachers}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm text-gray-500">Classes</h3>
          <p className="text-2xl font-bold">{stats.total_classes}</p>
        </CardContent>
      </Card>
    </div>
  );
}
