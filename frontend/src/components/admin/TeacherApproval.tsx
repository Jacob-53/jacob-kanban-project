// src/components/admin/TeacherApproval.tsx

import { useEffect, useState } from "react";
import { getPendingTeachers, approveTeacher, rejectTeacher } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface User {
  id: number;
  username: string;
  email?: string;
}

export default function TeacherApproval() {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPendingTeachers(token!);
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    await approveTeacher(id, token!);
    fetchData();
  };

  const handleReject = async (id: number) => {
    await rejectTeacher(id, token!);
    fetchData();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pending Teacher Approvals</h2>
      {teachers.length === 0 ? (
        <p>No teachers waiting for approval.</p>
      ) : (
        <table className="w-full text-left border">
          <thead>
            <tr className="border-b">
              <th className="p-2">Username</th>
              <th className="p-2">Email</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{t.username}</td>
                <td className="p-2">{t.email || "-"}</td>
                <td className="p-2 space-x-2">
                  <Button size="sm" onClick={() => handleApprove(t.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(t.id)}>
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
