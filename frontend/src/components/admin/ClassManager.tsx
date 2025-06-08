// src/components/admin/ClassManager.tsx

import { useEffect, useState } from "react";
import { getClasses, createClass, deleteClass } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";

interface Class {
  id: number;
  name: string;
  student_count?: number;
}

export default function ClassManager() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getClasses(token!);
      setClasses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createClass(newName, token!);
    setNewName("");
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await deleteClass(id, token!);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Class Management</h2>

      <div className="flex gap-2">
        <Input
          placeholder="New class name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={handleCreate}>Create</Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-left border mt-4">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Students</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls.id} className="border-b">
                <td className="p-2">{cls.name}</td>
                <td className="p-2">{cls.student_count ?? '-'}</td>
                <td className="p-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(cls.id)}>
                    Delete
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
