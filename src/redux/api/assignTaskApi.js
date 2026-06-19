import { authAxios, createAuthAxios } from "../../utils/authAxios";
import axios from "axios";

const API = createAuthAxios({
  // baseURL: "http://localhost:5050/api/assign-task",
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/assign-task`,
});

export const fetchUniqueDepartmentDataApi = async (user_name) => {
  return (await API.get(`/departments/${user_name}`)).data;
};

export const fetchUniqueGivenByDataApi = async () => {
  return (await API.get(`/given-by`)).data;
};

export const fetchUniqueDoerNameDataApi = async (args = {}) => {
  const { department, unit, division, role, ignoreLocalStorage } = args;
  
  // When ignoreLocalStorage is true (e.g. SalesDataPage), always use /doer-all
  // and pass division/department as query params for filtering
  if (ignoreLocalStorage) {
    const roleParam = role || localStorage.getItem("role");
    const params = {};
    if (roleParam) params.role = roleParam;
    if (division) params.division = division;
    if (department) params.department = department;
    return (await API.get(`/doer-all`, { params })).data;
  }

  if (!department) {
    // No department specified — return all active doer names with role-based filtering
    const roleParam = role || localStorage.getItem("role");
    
    const params = {};
    if (roleParam) params.role = roleParam;
    
    const divisionLocal = localStorage.getItem("division");
    const departmentLocal = localStorage.getItem("department");
    if (divisionLocal) params.division = divisionLocal;
    if (departmentLocal) params.department = departmentLocal;
    
    if (division) params.division = division;
    if (department) params.department = department;
    
    return (await API.get(`/doer-all`, { params })).data;
  }
  const params = {};
  if (unit) params.unit = unit;
  if (division) params.division = division;
  return (await API.get(`/doer/${department}`, { params })).data;
};

export const pushAssignTaskApi = async (tasks) => {
  return (await API.post(`/assign`, tasks)).data;
};
