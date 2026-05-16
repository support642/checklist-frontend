// checkListApi.js
import { authFetch } from "../../utils/authFetch";
// const BASE_URL = "http://localhost:5050/api/checklist";
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}/checklist`;

// =======================================================
// 1️⃣ Fetch Pending Checklist (AWS Backend)
// =======================================================
export const fetchChechListDataSortByDate = async (page = 1, search = '', status = 'all', frequency = 'all', name = 'all', division = 'all', departmentFilter = 'all') => {
  const username = localStorage.getItem("user-name");
  const role = localStorage.getItem("role");
  const department = localStorage.getItem("department");
  const unit = localStorage.getItem("unit");
  const divisionLocal = localStorage.getItem("division");

  let url = `${BASE_URL}/pending?page=${page}&username=${username}&role=${role}&department=${department}&unit=${unit}&division=${divisionLocal}&search=${encodeURIComponent(search)}`;

  if (status !== 'all') url += `&status=${status}`;
  if (frequency !== 'all') url += `&frequency=${frequency}`;
  if (name !== 'all') url += `&name=${encodeURIComponent(name)}`;
  if (division !== 'all') url += `&divisionFilter=${encodeURIComponent(division)}`;
  if (departmentFilter !== 'all') url += `&departmentFilter=${encodeURIComponent(departmentFilter)}`;

  const response = await authFetch(url);

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errJson = await response.json();
      throw new Error(errJson.error || `Server error ${response.status}`);
    } else {
      throw new Error(`Server returned non-JSON response (${response.status}).`);
    }
  }

  const json = await response.json();
  return {
    data: json.data || [],
    totalCount: json.totalCount || 0,
    page: json.page || page
  };
};


// =======================================================
// 2️⃣ Fetch Checklist History (AWS Backend)
// =======================================================
export const fetchChechListDataForHistory = async (page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all') => {
  const username = localStorage.getItem("user-name");
  const role = localStorage.getItem("role");
  const department = localStorage.getItem("department");
  const unit = localStorage.getItem("unit");
  const divisionLocal = localStorage.getItem("division");
  const limit = 50;

  let url = `${BASE_URL}/history?page=${page}&limit=${limit}&username=${username}&role=${role}&department=${department}&unit=${unit}&division=${divisionLocal}&search=${encodeURIComponent(search)}`;

  if (name !== 'all') url += `&nameFilter=${encodeURIComponent(name)}`;
  if (division !== 'all') url += `&divisionFilter=${encodeURIComponent(division)}`;
  if (departmentFilter !== 'all') url += `&departmentFilter=${encodeURIComponent(departmentFilter)}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (approvalStatus !== 'all') url += `&approvalStatus=${approvalStatus}`;

  const response = await authFetch(url);

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errJson = await response.json();
      throw new Error(errJson.error || `Server error ${response.status}`);
    } else {
      throw new Error(`Server returned non-JSON response (${response.status}).`);
    }
  }

  const json = await response.json();
  return json; // { data, totalCount, approvedCount, pendingCount, totalPages, page }
};


// =======================================================
// 3️⃣ Submit Checklist (AWS Backend)
// =======================================================
export const updateChecklistData = async (submissionData) => {
  try {
    const response = await authFetch(`${BASE_URL}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });

    if (!response.ok) {
      throw new Error("Update failed");
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("❌ Error Updating Checklist:", error);
    throw error;
  }
};


// =======================================================
// 4️⃣ Admin Done API (AWS Backend)
// =======================================================
export const postChecklistAdminDoneAPI = async (selectedItems) => {
  try {
    const response = await authFetch(`${BASE_URL}/admin-done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedItems),
    });

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("❌ Error Marking Admin Done:", error);
    return { error };
  }
};
// =======================================================
// 5️⃣ Send Email Notification (AWS Backend - Admin Only)
// =======================================================
export const sendEmailNotificationAPI = async (items) => {
  try {
    const response = await authFetch(`${BASE_URL}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error("Email sending failed");
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error("❌ Error Sending Email:", error);
    throw error;
  }
};
// =======================================================
// 6️⃣ Fetch Checklist Metadata (Divisions & Departments)
// =======================================================
export const fetchChecklistMetadata = async () => {
  const response = await authFetch(`${BASE_URL}/metadata`);

  if (!response.ok) {
    throw new Error("Failed to fetch checklist metadata");
  }

  return await response.json();
};
// =======================================================
// 7️⃣ Bulk Delete Checklist (Admin Only)
// =======================================================
export const bulkDeleteChecklistAPI = async (taskIds) => {
  try {
    const role = localStorage.getItem("role");
    const response = await authFetch(`${BASE_URL}/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds, role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Bulk delete failed");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error Bulk Deleting Checklist:", error);
    throw error;
  }
};

// =======================================================
// 7.1️⃣ Approve Activation Checklist (Admin Only)
// =======================================================
export const approveActivationChecklistAPI = async (taskIds) => {
  try {
    const response = await authFetch(`${BASE_URL}/approve-activation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Approval failed");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error Approving Activation:", error);
    throw error;
  }
};

// =======================================================
// 8️⃣ Bulk Leave Checklist (Admin Only)
// =======================================================
export const bulkLeaveChecklistAPI = async (taskIds) => {
  try {
    const response = await authFetch(`${BASE_URL}/bulk-leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Bulk leave update failed");
    }

    return await response.json();
  } catch (error) {
    console.error("❌ Error Bulk Leaving Checklist:", error);
    throw error;
  }
};
