import { authAxios, createAuthAxios } from "../../utils/authAxios";
import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
// const API = "http://localhost:5050/api";
const API = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api'}`;

const api = createAuthAxios({
  baseURL: API,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for better logging
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response received from: ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// SINGLE — send all tasks in one go
export const insertDelegationDoneAndUpdate = createAsyncThunk(
  "delegation/submit",
  async ({ selectedDataArray }, { rejectWithValue }) => {
    try {
      console.log('🚀 Sending delegation submission:', {
        itemCount: selectedDataArray.length,
        data: selectedDataArray
      });

      const { data } = await api.post(`/delegation/submit`, {
        selectedData: selectedDataArray,
      });

      console.log('✅ Delegation submission successful:', data);
      return data;

    } catch (err) {
      console.error('❌ Delegation submission failed:', {
        error: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      // Handle different types of errors
      if (err.code === 'ERR_NETWORK') {
        return rejectWithValue('Network error: Please check your internet connection and try again.');
      } else if (err.code === 'ECONNABORTED') {
        return rejectWithValue('Request timeout: The server took too long to respond.');
      } else {
        return rejectWithValue(err.response?.data || err.message);
      }
    }
  }
);

// FETCH PENDING
export const fetchDelegationDataSortByDate = async (startDate = "", endDate = "") => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const userAccess = localStorage.getItem("user_access");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const { data } = await authAxios.get(`${API}/delegation`, {
    params: { role, username, user_access: userAccess, unit, division, department, startDate, endDate },
  });

  return data;
};

// FETCH DONE
export const fetchDelegation_DoneDataSortByDate = async (page = 1, search = "", startDate = "", endDate = "", name = 'all', division = 'all', departmentFilter = 'all', approvalStatus = 'all') => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const userAccess = localStorage.getItem("user_access");
  const unit = localStorage.getItem("unit");
  const divisionLocal = localStorage.getItem("division");
  const department = localStorage.getItem("department");
  const limit = 50;

  const { data } = await authAxios.get(`${API}/delegation-done`, {
    params: { 
      role, 
      username, 
      user_access: userAccess, 
      search, 
      unit, 
      division: divisionLocal, 
      department, 
      startDate, 
      endDate,
      nameFilter: name,
      divisionFilter: division,
      departmentFilter: departmentFilter,
      page,
      limit,
      approvalStatus
    },
  });

  return data;
};

// ADMIN DONE - Mark delegation items as approved
export const postDelegationAdminDoneAPI = async (items) => {
  try {
    const { data } = await authAxios.post(`${API}/delegation/admin-done`, items);
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

// REVERT TO PENDING (Admin Only)
export const revertDelegationTaskAPI = async (items) => {
  try {
    const { data } = await authAxios.post(`${API}/delegation/revert`, { items });
    return { data, error: null };
  } catch (err) {
    console.error("❌ Revert error:", err);
    return { data: null, error: err };
  }
};

// SEND EMAIL NOTIFICATION (Admin Only)
export const sendDelegationEmailAPI = async (items) => {
  try {
    const { data } = await api.post(`/delegation/send-email`, { items });
    return { data, error: null };
  } catch (err) {
    console.error("❌ Send Email error:", err);
    return { data: null, error: err.response?.data || err.message };
  }
};
