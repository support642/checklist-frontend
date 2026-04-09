// ------------------------------
import { authFetch } from "../../utils/authFetch";
// dashboardApi.js (FULL FIXED FILE)
// ------------------------------

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/dashboard`;
const BASE_URL1 = `${import.meta.env.VITE_API_BASE_URL}/staff-tasks`;

// ---------------------------------------------------------------------
// GLOBAL ROLE HELPER — har API me repeat na karna pade isliye function
// ---------------------------------------------------------------------
const getFinalStaffFilter = (inputFilter) => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");

  if (role === "user") return username;
  if (!inputFilter || inputFilter === "all") return "all";

  return inputFilter;
};

// ---------------------------------------------------------------------
// 1️⃣ MAIN DASHBOARD DATA FETCH
// ---------------------------------------------------------------------
export const fetchDashboardDataApi = async (
  dashboardType,
  staffFilter = "all",
  page = 1,
  limit = 50,
  taskView = "recent",
  departmentFilter = "all",
  unitFilter = "all",
  divisionFilter = "all",
  startDate = "",
  endDate = ""
) => {

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  // 👇 Force user filter
  staffFilter = getFinalStaffFilter(staffFilter);

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    page,
    limit,
    taskView,
    departmentFilter,
    unitFilter,
    divisionFilter,
    role,
    username,
    unit,
    division,
    department,
    startDate,
    endDate
  });

  const res = await authFetch(`${BASE_URL}?${params.toString()}`);
  return await res.json();
};

// ---------------------------------------------------------------------
// 2️⃣ SUPABASE COUNT USING ROLE-BASED FILTERING
// ---------------------------------------------------------------------
export const getDashboardDataCount = async (dashboardType, staffFilter = "all", taskView = 'recent', departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");
    const unit = localStorage.getItem("unit");
    const division = localStorage.getItem("division");
    const department = localStorage.getItem("department");

    staffFilter = getFinalStaffFilter(staffFilter);

    const params = new URLSearchParams({
      dashboardType,
      staffFilter,
      taskView,
      departmentFilter,
      unitFilter,
      divisionFilter,
      role,
      username,
      unit,
      division,
      department,
      startDate,
      endDate
    });

    const url = `${BASE_URL}/count?${params.toString()}`;
    const res = await authFetch(url);

    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data === 'number' ? data : 0;

  } catch (err) {
    console.error("Dashboard Count Error:", err);
    return 0;
  }
};

// ---------------------------------------------------------------------
// 3️⃣ SUMMARY COUNT APIs (Admin + User both)
// ---------------------------------------------------------------------
export const countTotalTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const url = `${BASE_URL}/total?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}&role=${role}&username=${username}&unit=${unit}&division=${division}&department=${department}&startDate=${startDate}&endDate=${endDate}`;

  const res = await authFetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
};

export const countCompleteTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const url = `${BASE_URL}/completed?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}&role=${role}&username=${username}&unit=${unit}&division=${division}&department=${department}&startDate=${startDate}&endDate=${endDate}`;

  const res = await authFetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
};

export const countPendingOrDelayTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const url = `${BASE_URL}/pending?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}&role=${role}&username=${username}&unit=${unit}&division=${division}&department=${department}&startDate=${startDate}&endDate=${endDate}`;

  const res = await authFetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
};

export const countOverDueORExtendedTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const commonParams = `&unit=${unit}&division=${division}&department=${department}&role=${role}&username=${username}`;

  const url = `${BASE_URL}/overdue?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}${commonParams}&startDate=${startDate}&endDate=${endDate}`;

  const res = await authFetch(url);
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
};

// ---------------------------------------------------------------------
// 4️⃣ SUMMARY COMBINED API
// ---------------------------------------------------------------------
export const getDashboardSummaryApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const [totalTasks, completedTasks, pendingTasks, overdueTasks] = await Promise.all([
    countTotalTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate),
    countCompleteTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate),
    countPendingOrDelayTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate),
    countOverDueORExtendedTaskApi(dashboardType, staffFilter, departmentFilter, unitFilter, divisionFilter, startDate, endDate)
  ]);

  const completionRate =
    totalTasks > 0
      ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
      : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    completionRate
  };
};

// ---------------------------------------------------------------------
// 5️⃣ STAFF TASK TABLE APIs
// ---------------------------------------------------------------------
export const fetchStaffTasksDataApi = async (
  dashboardType,
  staffFilter = "all",
  page = 1,
  limit = 50,
  monthYear = "",
  tillDate = "",
  startDate = "",
  endDate = "",
  search = "",
  selectedDepartment = "all",
  selectedDivision = "all",
  selectedUnit = "all"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    page,
    limit,
    role,
    username,
    unit,
    division,
    department
  });

  // Add user-selected filters (from dropdown) — override scope if explicitly chosen
  if (selectedDepartment && selectedDepartment !== "all") params.append('selectedDepartment', selectedDepartment);
  if (selectedDivision && selectedDivision !== "all") params.append('selectedDivision', selectedDivision);
  if (selectedUnit && selectedUnit !== "all") params.append('selectedUnit', selectedUnit);

  // Add monthYear if provided
  if (monthYear) {
    params.append('monthYear', monthYear);
  }

  // Add tillDate if provided
  if (tillDate) {
    params.append('tillDate', tillDate);
  }

  // Add global date range if provided
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (search) params.append('search', search);

  const res = await authFetch(
    `${BASE_URL1}/tasks?${params.toString()}`
  );

  return await res.json();
};

export const getStaffTasksCountApi = async (
  dashboardType,
  staffFilter = "all",
  search = "",
  monthYear = "",
  tillDate = "",
  startDate = "",
  endDate = "",
  selectedDepartment = "all",
  selectedDivision = "all",
  selectedUnit = "all"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const params = new URLSearchParams({
    dashboardType,
    staffFilter,
    role,
    username,
    unit,
    division,
    department
  });

  if (search) params.append('search', search);
  if (monthYear) params.append('monthYear', monthYear);
  if (tillDate) params.append('tillDate', tillDate);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (selectedDepartment && selectedDepartment !== "all") params.append('selectedDepartment', selectedDepartment);
  if (selectedDivision && selectedDivision !== "all") params.append('selectedDivision', selectedDivision);
  if (selectedUnit && selectedUnit !== "all") params.append('selectedUnit', selectedUnit);

  const res = await authFetch(
    `${BASE_URL1}/count?${params.toString()}`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
};

// dashboardApi.js - Add this function
export const getStaffTaskSummaryApi = async (dashboardType, departmentFilter = "all", startDate = "", endDate = "") => {
  try {
    const params = new URLSearchParams({
      dashboardType,
      departmentFilter,
      startDate,
      endDate
    });

    const url = `${BASE_URL}/staff-summary?${params.toString()}`;
    const res = await authFetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();

  } catch (err) {
    console.error("Staff Summary Error:", err);
    return [];
  }
};

// ---------------------------------------------------------------------
export const getUniqueDepartmentsApi = async () => {
  const res = await authFetch(`${BASE_URL}/departments`);
  return res.json();
};

export const getStaffNamesByDepartmentApi = async (department, unit = "all", division = "all") => {
  const res = await authFetch(`${BASE_URL}/staff?department=${department}&unit=${unit}&division=${division}`);
  return res.json();
};

export const fetchStaffDetailsApi = async (
  dashboardType,
  staffName,
  monthYear = "",
  tillDate = "",
  startDate = "",
  endDate = ""
) => {
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const params = new URLSearchParams({
    dashboardType,
    staffName,
    role,
    username,
    unit,
    division,
    department
  });

  if (monthYear) params.append('monthYear', monthYear);
  if (tillDate) params.append('tillDate', tillDate);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const res = await authFetch(`${BASE_URL1}/details?${params.toString()}`);
  return await res.json();
};

export const getTotalUsersCountApi = async () => {
  const res = await authFetch(`${BASE_URL1}/users-count`);
  return res.json();
};

// ---------------------------------------------------------------------
// 6️⃣ DATE RANGE FILTERED APIS
// ---------------------------------------------------------------------
export const fetchChecklistDataByDateRangeApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all",
  unitFilter = "all",
  divisionFilter = "all"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const url = `${BASE_URL}/checklist/date-range?startDate=${startDate}&endDate=${endDate}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}`;

  const res = await authFetch(url);
  return res.json();
};

export const getChecklistDateRangeCountApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all",
  unitFilter = "all",
  divisionFilter = "all",
  statusFilter = "all"
) => {
  try {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("user-name");

    staffFilter = getFinalStaffFilter(staffFilter);

    const params = new URLSearchParams({
      startDate,
      endDate,
      staffFilter,
      departmentFilter,
      unitFilter,
      divisionFilter,
      statusFilter,
      role,
      username
    });

    const url = `${BASE_URL}/checklist/date-range/count?${params.toString()}`;
    const res = await authFetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    return await res.json();

  } catch (err) {
    console.error("Date Range Count Error:", err);
    return 0;
  }
};

export const getChecklistDateRangeStatsApi = async (
  startDate,
  endDate,
  staffFilter = "all",
  departmentFilter = "all",
  unitFilter = "all",
  divisionFilter = "all"
) => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const url = `${BASE_URL}/checklist/date-range/stats?startDate=${startDate}&endDate=${endDate}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}`;

  const res = await authFetch(url);
  return res.json();
};


export const countNotDoneTaskApi = async (dashboardType, staffFilter = "all", departmentFilter = "all", unitFilter = "all", divisionFilter = "all", startDate = "", endDate = "") => {
  staffFilter = getFinalStaffFilter(staffFilter);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const unit = localStorage.getItem("unit");
  const division = localStorage.getItem("division");
  const department = localStorage.getItem("department");

  const url = `${BASE_URL}/not-done?dashboardType=${dashboardType}&staffFilter=${staffFilter}&departmentFilter=${departmentFilter}&unitFilter=${unitFilter}&divisionFilter=${divisionFilter}&role=${role}&username=${username}&unit=${unit}&division=${division}&department=${department}&startDate=${startDate}&endDate=${endDate}`;

  const res = await authFetch(url);
  return res.json();
};
