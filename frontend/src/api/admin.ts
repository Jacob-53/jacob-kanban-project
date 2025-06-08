// src/api/admin.ts

export async function getPendingTeachers(token: string) {
  const res = await fetch("/admin/teachers/pending", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch pending teachers");
  return res.json();
}

export async function approveTeacher(id: number, token: string) {
  const res = await fetch(`/admin/teachers/${id}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to approve teacher");
  return res.json();
}

export async function rejectTeacher(id: number, token: string) {
  const res = await fetch(`/admin/teachers/${id}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to reject teacher");
  return res.json();
}

export async function getClasses(token: string) {
  const res = await fetch("/admin/classes", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch classes");
  return res.json();
}

export async function createClass(name: string, token: string) {
  const res = await fetch("/admin/classes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create class");
  return res.json();
}

export async function deleteClass(id: number, token: string) {
  const res = await fetch(`/admin/classes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete class");
  return res.json();
}
