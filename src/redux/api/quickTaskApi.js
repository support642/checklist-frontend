// API BASE URL
import { authFetch } from "../../utils/authFetch";
// const API_BASE = "http://localhost:5050/api";
// const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}`;/tasks`;
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}`;


// =========================
// FETCH CHECKLIST (PAGINATED)
// =========================
export const fetchChecklistData = async (page = 0, pageSize = 50, nameFilter = "", freqFilter = "", userRole = "", userDept = "", userDiv = "", userName = "", deptFilter = "", divFilter = "", search = "") => {
  const res = await authFetch(`${API_BASE}/tasks/checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, pageSize, nameFilter, freqFilter, userRole, userDept, userDiv, userName, deptFilter, divFilter, search }),
  });

  return res.json();
};

// =========================
// FETCH DELEGATION
// =========================
export const fetchDelegationData = async (page = 0, pageSize = 50, nameFilter = "", freqFilter = "", userRole = "", userDept = "", userDiv = "", userName = "", deptFilter = "", divFilter = "", search = "") => {
  const res = await authFetch(`${API_BASE}/tasks/delegation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, pageSize, nameFilter, freqFilter, userRole, userDept, userDiv, userName, deptFilter, divFilter, search }),
  });

  return res.json();
};

// =========================
// DELETE CHECKLIST TASKS
// =========================
export const deleteChecklistTasksApi = async (tasks) => {
  const res = await authFetch(`${API_BASE}/tasks/delete-checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  });

  return res.json();
};

// =========================
// DELETE DELEGATION TASKS
// =========================
export const deleteDelegationTasksApi = async (taskIds) => {
  const res = await authFetch(`${API_BASE}/tasks/delete-delegation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds }),
  });

  return res.json();
};

// =========================
// UPDATE CHECKLIST TASK
// =========================
export const updateChecklistTaskApi = async (updatedTask, originalTask) => {
  const res = await authFetch(`${API_BASE}/tasks/update-checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updatedTask, originalTask }),
  });

  return res.json();
};

// =========================
// FETCH USERS
// =========================
export const fetchUsersData = async () => {
  const res = await authFetch(`${API_BASE}/tasks/users`);
  return res.json();
};

// =========================
// FETCH UNIQUE TASK COUNTS
// =========================
export const fetchQuickTaskCountsApi = async (userRole, userDept, userDiv, userName) => {
  const res = await authFetch(`${API_BASE}/tasks/counts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userRole, userDept, userDiv, userName }),
  });
  return res.json();
};
