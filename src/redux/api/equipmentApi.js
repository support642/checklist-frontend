import { authFetch } from "../../utils/authFetch";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050/api";
const BASE_URL = `${API_BASE_URL}/equipment`;

/**
 * Fetch Equipment Master list
 */
export const fetchEquipmentMasterApi = async (department = "all", division = "all", status = "all", search = "") => {
  try {
    const params = new URLSearchParams();
    if (department && department !== "all") params.append("department", department);
    if (division && division !== "all") params.append("division", division);
    if (status && status !== "all") params.append("status", status);
    if (search) params.append("search", search);

    const response = await authFetch(`${BASE_URL}/master?${params.toString()}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching equipment master:", error);
    return { success: false, data: [], message: error.message };
  }
};

/**
 * Create a new Equipment Master record
 */
export const createEquipmentMasterApi = async (equipmentData) => {
  try {
    const response = await authFetch(`${BASE_URL}/master`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipmentData)
    });
    return await response.json();
  } catch (error) {
    console.error("Error creating equipment master:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Update an existing Equipment Master record
 */
export const updateEquipmentMasterApi = async (id, equipmentData) => {
  try {
    const response = await authFetch(`${BASE_URL}/master/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipmentData)
    });
    return await response.json();
  } catch (error) {
    console.error("Error updating equipment master:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete an Equipment Master record
 */
export const deleteEquipmentMasterApi = async (id) => {
  try {
    const response = await authFetch(`${BASE_URL}/master/${id}`, {
      method: "DELETE"
    });
    return await response.json();
  } catch (error) {
    console.error("Error deleting equipment master:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Fetch Unified Equipment History Register Data (all 16 columns)
 */
export const fetchEquipmentHistoryApi = async (department = "all", division = "all", status = "all", startDate = "", endDate = "", search = "") => {
  try {
    const params = new URLSearchParams();
    if (department && department !== "all") params.append("department", department);
    if (division && division !== "all") params.append("division", division);
    if (status && status !== "all") params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (search) params.append("search", search);

    const response = await authFetch(`${BASE_URL}/history?${params.toString()}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching equipment history:", error);
    return { success: false, data: [], message: error.message };
  }
};
