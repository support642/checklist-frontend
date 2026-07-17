"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import { hasPageAccess, canAccessModule } from "../../utils/permissionUtils"

import DashboardHeader from "./dashboard/DashboardHeader.jsx"
import StatisticsCards from "./dashboard/StaticsCard.jsx"
import TaskNavigationTabs from "./dashboard/TaskNavigationTab.jsx"
import CompletionRateCard from "./dashboard/CompletionRateCard.jsx"
import TasksOverviewChart from "./dashboard/Chart/TaskOverviewChart.jsx"
import TasksCompletionChart from "./dashboard/Chart/TaskCompletionChart.jsx"
import StaffTasksTable from "./dashboard/StaffTaskTable.jsx"
import {
  fetchDashboardSummaryCounts,
  resetDashboardState
} from "../../redux/slice/dashboardSlice.js"
import {
  fetchDashboardDataApi,
  getUniqueDepartmentsApi,
  getStaffNamesByDepartmentApi,
  fetchChecklistDataByDateRangeApi,
  getChecklistDateRangeStatsApi,
  fetchDepartmentReportSummaryApi,
  fetchMachineReportSummaryApi
} from "../../redux/api/dashboardApi.js"
import { fetchDepartmentDataApi } from "../../redux/api/settingApi.js"
import MaintenanceView from "../../components/Maintenance/MaintenanceView.jsx"
import { fetchDelegationDataSortByDate } from "../../redux/api/delegationApi.js"
import { delegationData, delegationDoneData } from "../../redux/slice/delegationSlice.js"
import { fetchUserProfile } from "../../redux/slice/userProfileSlice.js"

export default function AdminDashboard() {
  const [dashboardType, setDashboardType] = useState(() => {
    const saved = localStorage.getItem("admin_dashboard_active_module");
    if (saved === "delegation") return "delegation";
    return "checklist";
  })
  const [taskView, setTaskView] = useState("recent")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all")
  const [availableStaff, setAvailableStaff] = useState([])
  const userRole = localStorage.getItem("role")
  const username = localStorage.getItem("user-name")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [allTasks, setAllTasks] = useState([])
  const [batchSize] = useState(2000)
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [availableDepartments, setAvailableDepartments] = useState([])

  const [unitFilter, setUnitFilter] = useState("all")
  const [availableUnits, setAvailableUnits] = useState([])

  const [divisionFilter, setDivisionFilter] = useState("all")
  const [availableDivisions, setAvailableDivisions] = useState([])

  // Raw list containing the full department objects with unit and division info
  const [rawDepartmentList, setRawDepartmentList] = useState([])

  // State for department data
  const [departmentData, setDepartmentData] = useState({
    allTasks: [],
    staffMembers: [],
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    barChartData: [],
    pieChartData: [],
    completedRatingOne: 0,
    completedRatingTwo: 0,
    completedRatingThreePlus: 0,
    pendingToday: 0,
    pendingUpcoming: 0,
    pendingOverdue: 0,
  })

  // New state for date range filtering
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
    filtered: false,
  })

  const [isExporting, setIsExporting] = useState(false)

  const { 
    dashboard, 
    totalTask, 
    completeTask, 
    pendingTask, 
    overdueTask,
    pendingToday,
    pendingUpcoming,
    pendingOverdue,
    notDoneTask,
    completedRatingOne,
    completedRatingTwo,
    completedRatingThreePlus,
    completedOnTime,
  } = useSelector((state) => state.dashBoard)
  const { profile } = useSelector((state) => state.userProfile)
  const dispatch = useDispatch()

  useEffect(() => {
    if (username) {
      dispatch(fetchUserProfile(username));
    }
  }, [dispatch, username]);

  useEffect(() => {
    const role = localStorage.getItem("role");
    const uname = localStorage.getItem("user-name");

    // Check if user has admin dashboard access. If not, restrict to their own name.
    if (!hasPageAccess("dashboard_admin")) {
      setDashboardStaffFilter(uname);
      setFilterStaff(uname);
      setDepartmentFilter("all");        // user cannot filter department
      setUnitFilter("all");
      setDivisionFilter("all");
    }
  }, []);

  // Role-based filter pre-filling based on user profile
  useEffect(() => {
    if (profile) {
      if (userRole === "admin") {
        if (profile.division) {
          setDivisionFilter(profile.division);
        }
        // Only pre-fill department if it's a single value (not a comma-separated list)
        if (profile.department && !profile.department.includes(",")) {
          setDepartmentFilter(profile.department);
        }
      } else if (userRole === "div_admin") {
        if (profile.division) {
          setDivisionFilter(profile.division);
        }
      }
    }
  }, [profile, userRole]);

// Tab visibility fallback logic
useEffect(() => {
  if (!canAccessModule(dashboardType)) {
    const availableModules = ["checklist", "delegation", "maintenance"].filter(canAccessModule);
    if (availableModules.length > 0) {
      setDashboardType(availableModules[0]);
    }
  }
}, [dashboardType]);



  // Reset all filters to default values
  const resetAllFilters = () => {
    setDivisionFilter("all");
    setDepartmentFilter("all");
    setUnitFilter("all");
    setDashboardStaffFilter("all");
    setDateRange({
      startDate: "",
      endDate: "",
      filtered: false
    });
    
    // Also re-apply role-based filters if needed
    if (profile) {
      if (userRole === "admin") {
        if (profile.division) setDivisionFilter(profile.division);
        if (profile.department && !profile.department.includes(",")) {
          setDepartmentFilter(profile.department);
        }
      } else if (userRole === "div_admin") {
        if (profile.division) setDivisionFilter(profile.division);
      }
    }
    
    // Reset local filters and search
    setFilterStatus("all");
    setFilterStaff("all");
    setSearchQuery("");
    
    // Reset pagination
    setCurrentPage(1);
    setHasMoreData(true);
  };

  const handleDateRangeChange = (startDate, endDate) => {
    if (startDate && endDate) {
      setDateRange({
        startDate,
        endDate,
        filtered: true
      });
    } else {
      setDateRange({
        startDate: "",
        endDate: "",
        filtered: false
      });
    }
  };

  // CSV Export Logic
  const handleExportCSV = async (statusType = "all") => {
    setIsExporting(true);
    try {
      // Fetch all matching tasks using page = 1 and limit = 10000
      const allTasksData = await fetchDashboardDataApi(
        dashboardType,
        dashboardStaffFilter,
        1,
        10000,
        statusType === "leave" ? "leave" : "all",
        departmentFilter,
        unitFilter,
        divisionFilter,
        dateRange.startDate,
        dateRange.endDate
      );

      if (!allTasksData || allTasksData.length === 0) {
        alert("No data available to export.");
        setIsExporting(false);
        return;
      }

      const username = localStorage.getItem("user-name");
      const userRole = localStorage.getItem("role");
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Admin-level restrictions: Filter data by department
      const userAccess = localStorage.getItem("user_access") || "";
      const userDepartments = userAccess ? userAccess.split(',').map(dept => dept.trim().toLowerCase()) : [];
      
      let filteredData = allTasksData;
      if (userRole === "admin" && userDepartments.length > 0) {
        filteredData = allTasksData.filter(task => {
          const taskDept = (task.department || "").toLowerCase().trim();
          return userDepartments.includes(taskDept);
        });
      }

      // For standard users, filter to only their tasks
      if (userRole === "user" && username) {
        filteredData = filteredData.filter(
          (task) => task.name && task.name.toLowerCase() === username.toLowerCase()
        );
      }

      // Apply dynamic status logic & mapping
      const processedTasks = filteredData
        .map((task) => {
          const dateField = dashboardType === "delegation" ? task.planned_date : task.task_start_date;
          const taskStartDate = parseTaskStartDate(dateField);
          const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null;

          let status = "pending";
          if (task.status?.toLowerCase() === 'leave') {
            status = "leave";
          } else if (task.status?.toLowerCase() === 'inactive') {
            status = "week off";
          } else if (completionDate) {
            status = "completed";
          } else if (taskStartDate && isDateInPast(taskStartDate)) {
            status = "overdue";
          }

          // Override for checklist if status field says "Yes" or "yes"
          if (dashboardType === "checklist" && task.status?.toLowerCase() === 'yes') {
            status = "completed";
          }

          const shouldCountForCards = 
            (taskStartDate && taskStartDate <= today) || 
            (dashboardType === "delegation") ||
            (status === "completed") ||
            (status === "leave") ||
            (status === "week off");

          if (!shouldCountForCards) {
            return null;
          }

          return {
            id: task.task_id,
            title: task.task_description,
            assignedTo: task.name || "Unassigned",
            department: task.department || "N/A",
            division: task.division || "N/A",
            taskStartDate: formatDateToDDMMYYYY(taskStartDate),
            originalTaskStartDate: task.task_start_date,
            submission_date: task.submission_date,
            status,
            frequency: task.frequency || "one-time",
            rating: task.color_code_for || 0,
            is_on_time: task.is_on_time,
          };
        })
        .filter(Boolean);

      // Helper to escape CSV fields (handle commas and quotes)
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, "\"\"")}"`;
        }
        return str;
      };

      // =====================================================
      // SUMMARY / DEPARTMENT REPORT MODE
      // =====================================================
      if (statusType === "summary") {
        const summaryData = await fetchDepartmentReportSummaryApi({
          dashboardType,
          staffFilter: dashboardStaffFilter,
          departmentFilter,
          unitFilter,
          divisionFilter,
          role: userRole,
          username,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });

        // Group tasks by Division → Department
        const groupMap = {};
        summaryData.forEach((row) => {
          const div = (row.division || "N/A").trim();
          const dept = (row.department || "N/A").trim();

          if (!groupMap[div]) groupMap[div] = {};
          groupMap[div][dept] = {
            total: row.total,
            completed: row.completed,
            pending: row.pending,
            overdue: row.overdue
          };
        });

        // Build CSV rows
        const summaryHeaders = [
          "Row Labels",
          "Sum of TOTAL TASKS",
          "Sum of COMPLETED",
          "Sum of PENDING",
          "Sum of OVERDUE",
          "Average of WORK"
        ];

        const summaryRows = [];
        let grandTotal = 0, grandCompleted = 0, grandPending = 0, grandOverdue = 0;

        // Sort divisions alphabetically
        const sortedDivisions = Object.keys(groupMap).sort();

        sortedDivisions.forEach((div) => {
          const departments = groupMap[div];
          let divTotal = 0, divCompleted = 0, divPending = 0, divOverdue = 0;

          // Calculate division totals first
          Object.values(departments).forEach((stats) => {
            divTotal += stats.total;
            divCompleted += stats.completed;
            divPending += stats.pending;
            divOverdue += stats.overdue;
          });

          const divWorkPct = divTotal > 0 ? Math.round((divCompleted / divTotal) * 100) : 0;

          // Division header row
          summaryRows.push([
            escapeCSV(div),
            divTotal,
            divCompleted,
            divPending,
            divOverdue,
            `${divWorkPct}%`
          ]);

          // Sort departments alphabetically within division
          const sortedDepts = Object.keys(departments).sort();
          sortedDepts.forEach((dept) => {
            const s = departments[dept];
            const deptWorkPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
            summaryRows.push([
              escapeCSV(`    ${dept}`),
              s.total,
              s.completed,
              s.pending,
              s.overdue,
              `${deptWorkPct}%`
            ]);
          });

          grandTotal += divTotal;
          grandCompleted += divCompleted;
          grandPending += divPending;
          grandOverdue += divOverdue;
        });

        // Grand Total row
        const grandWorkPct = grandTotal > 0 ? Math.round((grandCompleted / grandTotal) * 100) : 0;
        summaryRows.push([
          "Grand Total",
          grandTotal,
          grandCompleted,
          grandPending,
          grandOverdue,
          `${grandWorkPct}%`
        ]);

        const csvString = [
          summaryHeaders.join(","),
          ...summaryRows.map(row => row.join(","))
        ].join("\n");

        // Trigger Download
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().split('T')[0];
        const moduleStr = dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1);
        link.setAttribute("href", url);
        link.setAttribute("download", `Department_Report_${moduleStr}_${dateStr}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return; // Exit early for summary mode
      }

      // =====================================================
      // MACHINE REPORT MODE
      // =====================================================
      if (statusType === "machine") {
        const machineData = await fetchMachineReportSummaryApi({
          staffFilter: dashboardStaffFilter,
          departmentFilter,
          unitFilter,
          divisionFilter,
          role: userRole,
          username,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        });

        if (!machineData || machineData.length === 0) {
          alert("No machine data available to export.");
          setIsExporting(false);
          return;
        }

        // Group tasks by Machine Division → Machine Department → Machine Name
        const groupMap = {};
        machineData.forEach((row) => {
          const div = (row.machine_division || "N/A").trim();
          const dept = (row.machine_department || "N/A").trim();
          const machine = (row.machine_name || "N/A").trim();

          if (!groupMap[div]) groupMap[div] = {};
          if (!groupMap[div][dept]) groupMap[div][dept] = {};
          groupMap[div][dept][machine] = {
            total: row.total,
            completed: row.completed,
            pending: row.pending,
            overdue: row.overdue
          };
        });

        // Build CSV rows
        const summaryHeaders = [
          "Row Labels",
          "Sum of TOTAL TASKS",
          "Sum of COMPLETED",
          "Sum of PENDING",
          "Sum of OVERDUE",
          "Average of WORK"
        ];

        const summaryRows = [];
        let grandTotal = 0, grandCompleted = 0, grandPending = 0, grandOverdue = 0;

        // Sort divisions alphabetically
        const sortedDivisions = Object.keys(groupMap).sort();

        sortedDivisions.forEach((div) => {
          const departments = groupMap[div];
          let divTotal = 0, divCompleted = 0, divPending = 0, divOverdue = 0;

          // Calculate division totals first
          Object.values(departments).forEach((depts) => {
            Object.values(depts).forEach((stats) => {
              divTotal += stats.total;
              divCompleted += stats.completed;
              divPending += stats.pending;
              divOverdue += stats.overdue;
            });
          });

          const divWorkPct = divTotal > 0 ? Math.round((divCompleted / divTotal) * 100) : 0;

          // Division header row
          summaryRows.push([
            escapeCSV(div),
            divTotal,
            divCompleted,
            divPending,
            divOverdue,
            `${divWorkPct}%`
          ]);

          // Sort departments alphabetically within division
          const sortedDepts = Object.keys(departments).sort();
          sortedDepts.forEach((dept) => {
            const machines = departments[dept];
            let deptTotal = 0, deptCompleted = 0, deptPending = 0, deptOverdue = 0;

            // Calculate department totals
            Object.values(machines).forEach((stats) => {
              deptTotal += stats.total;
              deptCompleted += stats.completed;
              deptPending += stats.pending;
              deptOverdue += stats.overdue;
            });

            const deptWorkPct = deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0;

            summaryRows.push([
              escapeCSV(`    ${dept}`),
              deptTotal,
              deptCompleted,
              deptPending,
              deptOverdue,
              `${deptWorkPct}%`
            ]);

            // Sort machines alphabetically within department
            const sortedMachines = Object.keys(machines).sort();
            sortedMachines.forEach((machine) => {
              const s = machines[machine];
              const machineWorkPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              summaryRows.push([
                escapeCSV(`        ${machine}`),
                s.total,
                s.completed,
                s.pending,
                s.overdue,
                `${machineWorkPct}%`
              ]);
            });
          });

          grandTotal += divTotal;
          grandCompleted += divCompleted;
          grandPending += divPending;
          grandOverdue += divOverdue;
        });

        // Grand Total row
        const grandWorkPct = grandTotal > 0 ? Math.round((grandCompleted / grandTotal) * 100) : 0;
        summaryRows.push([
          "Grand Total",
          grandTotal,
          grandCompleted,
          grandPending,
          grandOverdue,
          `${grandWorkPct}%`
        ]);

        const csvString = [
          summaryHeaders.join(","),
          ...summaryRows.map(row => row.join(","))
        ].join("\n");

        // Trigger Download
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `Machine_Report_Maintenance_${dateStr}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return; // Exit early for machine mode
      }

      // =====================================================
      // DETAILED TASK-LEVEL EXPORT (all / completed / pending / overdue)
      // =====================================================
      const exportedTasks = processedTasks.filter((task) => {
        // Status filter (statusType)
        if (statusType === "leave") {
          if (task.status !== "leave" && task.status !== "week off") return false;
        } else if (statusType !== "all" && task.status !== statusType) {
          return false;
        }
        
        // Local staff filter
        if (filterStaff !== "all" && task.assignedTo.toLowerCase() !== filterStaff.toLowerCase()) {
          return false;
        }
        
        // Search query filter
        if (searchQuery && searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase().trim();
          return (
            (task.title && task.title.toLowerCase().includes(query)) ||
            (task.id && task.id.toString().includes(query)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(query))
          );
        }
        return true;
      });

      if (exportedTasks.length === 0) {
        alert(`No ${statusType} tasks found to export.`);
        setIsExporting(false);
        return;
      }

      // CSV Headers
      const headers = [
        "Task ID",
        "Task Description",
        "Assigned To",
        "Department",
        "Division",
        "Planned Date",
        "Status",
        "Submission Date",
        "Frequency"
      ];

      // Generate CSV Rows
      const csvRows = exportedTasks.map(task => [
        escapeCSV(task.id),
        escapeCSV(task.title),
        escapeCSV(task.assignedTo),
        escapeCSV(task.department),
        escapeCSV(task.division),
        escapeCSV(task.taskStartDate),
        escapeCSV(task.status?.toUpperCase()),
        escapeCSV(task.submission_date ? formatDateToDDMMYYYY(new Date(task.submission_date)) : "N/A"),
        escapeCSV(task.frequency)
      ]);

      // Combine into final string
      const csvString = [
        headers.join(","),
        ...csvRows.map(row => row.join(","))
      ].join("\n");

      // Trigger Download
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      // Create meaningful filename
      const dateStr = new Date().toISOString().split('T')[0];
      const moduleStr = dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1);
      const filterStr = dashboardStaffFilter !== "all" ? `_${dashboardStaffFilter}` : "";
      const statusStr = statusType !== "all" ? `_${statusType.toUpperCase()}` : "";
      
      link.setAttribute("href", url);
      link.setAttribute("download", `Task_History_${moduleStr}${filterStr}${statusStr}_${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };


  const processFilteredData = (data, stats) => {
    const username = localStorage.getItem("user-name");
    const userRole = localStorage.getItem("role");
    const todayInProcess = new Date();
    todayInProcess.setHours(23, 59, 59, 999);

    // Admin-level restrictions: Filter data by department
    const userAccess = localStorage.getItem("user_access") || "";
    const userDepartments = userAccess ? userAccess.split(',').map(dept => dept.trim().toLowerCase()) : [];
    
    let filteredData = data;
    if (userRole === "admin" && userDepartments.length > 0) {
      filteredData = data.filter(task => {
        const taskDept = (task.department || "").toLowerCase().trim();
        return userDepartments.includes(taskDept);
      });
    }

    let totalTasks = 0;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;

    const monthlyData = {
      Jan: { completed: 0, pending: 0 },
      Feb: { completed: 0, pending: 0 },
      Mar: { completed: 0, pending: 0 },
      Apr: { completed: 0, pending: 0 },
      May: { completed: 0, pending: 0 },
      Jun: { completed: 0, pending: 0 },
      Jul: { completed: 0, pending: 0 },
      Aug: { completed: 0, pending: 0 },
      Sep: { completed: 0, pending: 0 },
      Oct: { completed: 0, pending: 0 },
      Nov: { completed: 0, pending: 0 },
      Dec: { completed: 0, pending: 0 },
    };

    // Process tasks
    const processedTasks = filteredData
      .map((task) => {
        // Skip if not assigned to current user (for standard users)
        if (userRole === "user" && task.name?.toLowerCase() !== username?.toLowerCase()) {
          return null;
        }

        // For delegation use planned_date, for checklist use task_start_date
        const dateField = dashboardType === "delegation" ? task.planned_date : task.task_start_date;
        const taskStartDate = parseTaskStartDate(dateField);
        const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null;

        let status = "pending";
        if (completionDate) {
          status = "completed";
        } else if (taskStartDate && isDateInPast(taskStartDate)) {
          status = "overdue";
        }

        // Count tasks for statistics - include ALL tasks in the date range
        if (taskStartDate) {
          totalTasks++;

          if (dashboardType === "checklist") {
            // For checklist: Use status field directly
            if (task.status?.toLowerCase() === 'yes') {
              completedTasks++;
            } else {
              pendingTasks++;
            }

            // Overdue tasks for checklist: past tasks with status not 'yes'
            if (taskStartDate && taskStartDate < todayInProcess && task.status?.toLowerCase() !== 'yes') {
              overdueTasks++;
            }
          } else {
            // For delegation: Use submission_date
            if (task.submission_date) {
              completedTasks++;
            } else {
              pendingTasks++;
              if (taskStartDate && taskStartDate < todayInProcess) {
                overdueTasks++;
              }
            }
          }
        }

        // Update monthly data
        if (taskStartDate) {
          const monthName = taskStartDate.toLocaleString("default", { month: "short" });
          if (monthlyData[monthName]) {
            if (status === "completed") {
              monthlyData[monthName].completed++;
            } else {
              monthlyData[monthName].pending++;
            }
          }
        }

        return {
          id: task.task_id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: formatDateToDDMMYYYY(taskStartDate),
          originalTaskStartDate: task.task_start_date,
          submission_date: task.submission_date,
          status,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
          is_on_time: task.is_on_time,
        };
      })
      .filter(Boolean);

    const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
      name,
      completed: data.completed,
      pending: data.pending,
    }));

    const pieChartData = [
      { name: "Completed", value: completedTasks, color: "#22c55e" },
      { name: "Pending", value: pendingTasks, color: "#facc15" },
      { name: "Overdue", value: overdueTasks, color: "#ef4444" },
    ];

    // Use stats from API if available, otherwise use our calculations
    const finalStats = stats || {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
    };

    // Update department data with filtered results
    setDepartmentData(prev => ({
      ...prev,
      allTasks: processedTasks,
      totalTasks: finalStats.totalTasks,
      completedTasks: finalStats.completedTasks,
      pendingTasks: finalStats.pendingTasks,
      overdueTasks: finalStats.overdueTasks,
      completionRate: finalStats.completionRate,
      barChartData,
      pieChartData,
    }));

    // (Local state filteredDateStats was removed in favor of Redux completedOnTime implementation)
  };

  const fetchDepartmentDataWithDateRange = async (startDate, endDate, page = 1, append = false) => {
    try {
      const data = await fetchDashboardDataApi(dashboardType, dashboardStaffFilter, page, batchSize, 'all', departmentFilter, unitFilter, divisionFilter);

      // Filter data by date range on client side
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filteredData = data.filter(task => {
        // For delegation use planned_date, for checklist use task_start_date
        const dateField = dashboardType === "delegation" ? task.planned_date : task.task_start_date;
        const taskDate = parseTaskStartDate(dateField);
        return taskDate && taskDate >= start && taskDate <= end;
      });

      // Calculate stats manually with proper logic
      let totalTasks = filteredData.length;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;
      let notDoneTasks = 0;
      let pendingToday = 0;
      let pendingUpcoming = 0;
      let pendingOverdue = 0;
      let completedRatingOne = 0;
      let completedRatingTwo = 0;
      let completedRatingThreePlus = 0;

      filteredData.forEach(task => {
        // For delegation use planned_date, for checklist use task_start_date
        const dateField = dashboardType === "delegation" ? task.planned_date : task.task_start_date;
        const taskStartDate = parseTaskStartDate(dateField);
        const taskDate = taskStartDate; // Alias for compatibility with existing code Below
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dashboardType === "checklist") {
          // For checklist: Use status field
          if (task.status?.toLowerCase() === 'yes') {
            completedTasks++;
          } else if (task.status?.toLowerCase() === 'no') {
            notDoneTasks++;
            pendingTasks++; // Not done tasks are also pending
          } else {
            // For null or other status
            pendingTasks++;
          }

          // Overdue tasks for checklist: past tasks with status not 'yes'
          if (taskDate && taskDate < today && task.status?.toLowerCase() !== 'yes') {
            overdueTasks++;
          }
        } else {
          // Delegation logic: if submission date exists, it's completed no matter the planned_date
            if (task.submission_date) {
              completedTasks++;
              // Also ensure it is counted as a total task, since we included it
              if (!filteredData.some(t => t.task_id === task.task_id)) totalTasks++; 
              
              if (task.color_code_for === 1) completedRatingOne++;
              else if (task.color_code_for === 2) completedRatingTwo++;
              else if (task.color_code_for >= 3) completedRatingThreePlus++;
            } else {
              pendingTasks++;
              if (taskDate && taskDate < today) {
                overdueTasks++;
                if (dashboardType === "delegation") pendingOverdue++;
              } else if (taskDate && isDateToday(taskDate)) {
                if (dashboardType === "delegation") pendingToday++;
              } else if (taskDate && taskDate > today) {
                if (dashboardType === "delegation") pendingUpcoming++;
              }
            }
          // For delegation, not done is simply pending tasks
          notDoneTasks = pendingTasks;
        }
      });

      const stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        notDoneTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0,
        pendingToday,
        pendingUpcoming,
        pendingOverdue,
        completedRatingOne,
        completedRatingTwo,
        completedRatingThreePlus,
      };

      processFilteredData(filteredData, stats);
    } catch (error) {
      console.error("Error fetching data with date range:", error);
    }
  };

  // Updated date parsing function to handle both formats
  const parseTaskStartDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    // Handle YYYY-MM-DD format (ISO format from Supabase)
    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dateStr)
      return isNaN(parsed) ? null : parsed
    }

    // Handle DD/MM/YYYY format (with or without time)
    if (dateStr.includes("/")) {
      // Split by space first to separate date and time
      const parts = dateStr.split(" ")
      const datePart = parts[0] // "25/08/2025"

      const dateComponents = datePart.split("/")
      if (dateComponents.length !== 3) return null

      const [day, month, year] = dateComponents.map(Number)

      if (!day || !month || !year) return null

      // Create date object (month is 0-indexed)
      const date = new Date(year, month - 1, day)

      // If there's time component, parse it
      if (parts.length > 1) {
        const timePart = parts[1] // "09:00:00"
        const timeComponents = timePart.split(":")
        if (timeComponents.length >= 2) {
          const [hours, minutes, seconds] = timeComponents.map(Number)
          date.setHours(hours || 0, minutes || 0, seconds || 0)
        }
      }

      return isNaN(date) ? null : date
    }

    // Fallback: Try ISO format
    const parsed = new Date(dateStr)
    return isNaN(parsed) ? null : parsed
  }

  // Helper function to format date from ISO format to DD/MM/YYYY
  const formatLocalDate = (isoDate) => {
    if (!isoDate) return ""
    const date = new Date(isoDate)
    return formatDateToDDMMYYYY(date)
  }

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return ""
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Check if date is today
  const isDateToday = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is in the past (excluding today)
  const isDateInPast = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Check if date is in the future (excluding today)
  const isDateFuture = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate > today
  }

  // Function to check if a date is tomorrow
  const isDateTomorrow = (dateStr) => {
    const date = parseTaskStartDate(dateStr)
    if (!date) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date.getTime() === tomorrow.getTime()
  }

  const fetchDepartmentData = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setIsLoadingMore(true)
        setHasMoreData(true)
      } else {
        setIsLoadingMore(true)
      }

      // Use the updated API function with department filter and date range
      const data = await fetchDashboardDataApi(
        dashboardType,
        dashboardStaffFilter,
        page,
        batchSize,
        'all',
        departmentFilter,
        unitFilter,
        divisionFilter,
        dateRange.startDate,
        dateRange.endDate
      )

      if (!data || data.length === 0) {
        if (page === 1) {
          setDepartmentData(prev => ({
            ...prev,
            allTasks: [],
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            overdueTasks: 0,
            completionRate: 0,
          }))
        }
        setHasMoreData(false)
        setIsLoadingMore(false)
        return
      }


      const username = localStorage.getItem("user-name")
      const userRole = localStorage.getItem("role")
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      let totalTasks = 0
      let completedTasks = 0
      let pendingTasks = 0
      let overdueTasks = 0
      let completedRatingOne = 0
      let completedRatingTwo = 0
      let completedRatingThreePlus = 0
      let pendingToday = 0
      let pendingUpcoming = 0
      let pendingOverdue = 0

      const monthlyData = {
        Jan: { completed: 0, pending: 0 },
        Feb: { completed: 0, pending: 0 },
        Mar: { completed: 0, pending: 0 },
        Apr: { completed: 0, pending: 0 },
        May: { completed: 0, pending: 0 },
        Jun: { completed: 0, pending: 0 },
        Jul: { completed: 0, pending: 0 },
        Aug: { completed: 0, pending: 0 },
        Sep: { completed: 0, pending: 0 },
        Oct: { completed: 0, pending: 0 },
        Nov: { completed: 0, pending: 0 },
        Dec: { completed: 0, pending: 0 },
      }

      // Admin-level restrictions: Filter data by department
      const userAccess = localStorage.getItem("user_access") || "";
      const userDepartments = userAccess ? userAccess.split(',').map(dept => dept.trim().toLowerCase()) : [];
      
      let filteredData = data;
      if (userRole === "admin" && userDepartments.length > 0) {
        filteredData = data.filter(task => {
          const taskDept = (task.department || "").toLowerCase().trim();
          return userDepartments.includes(taskDept);
        });
      }

      // Extract unique staff names for the dropdown from the filtered data
      let uniqueStaff;

      if (dashboardType === 'checklist' && (departmentFilter !== 'all' || divisionFilter !== 'all' || unitFilter !== 'all')) {
        // For checklist with department filter, get staff from users table based on user_access
        try {
          uniqueStaff = await getStaffNamesByDepartmentApi(departmentFilter, unitFilter, divisionFilter);
        } catch (error) {
          console.error('Error fetching staff by department:', error);
          uniqueStaff = [...new Set(filteredData.map((task) => task.name).filter((name) => name && name.trim() !== ""))];
        }
      } else if (dashboardType === 'delegation') {
        // For delegation, fetch all delegation tasks from existing API and extract staff names
        try {
          const delegationDataList = await fetchDelegationDataSortByDate(dateRange.startDate, dateRange.endDate);
          let filteredDelegationList = delegationDataList;
          if (userRole === "admin" && userDepartments.length > 0) {
            filteredDelegationList = delegationDataList.filter(task => {
              const taskDept = (task.department || "").toLowerCase().trim();
              return userDepartments.includes(taskDept);
            });
          }
          // Only show members who have at least one pending delegation task
          uniqueStaff = [...new Set(
            filteredDelegationList
              .filter(task => !task.submission_date)
              .map((task) => task.name)
              .filter((name) => name && name.trim() !== "")
          )];
        } catch (error) {
          console.error('Error fetching delegation staff:', error);
          uniqueStaff = [];
        }
      } else {
        // Default behavior - extract from task data
        uniqueStaff = [...new Set(filteredData.map((task) => task.name).filter((name) => name && name.trim() !== ""))];
      }

      // For standard users, always ensure current user appears in staff dropdown
      if (userRole === "user" && username) {
        if (!uniqueStaff.some(staff => staff.toLowerCase() === username.toLowerCase())) {
          uniqueStaff.push(username)
        }
      }

      setAvailableStaff(uniqueStaff)

      // SECOND: Apply dashboard staff filter ONLY if not "all"
      if (dashboardStaffFilter !== "all") {
        filteredData = filteredData.filter(
          (task) => task.name && task.name.toLowerCase() === dashboardStaffFilter.toLowerCase(),
        )
      }

      // Process tasks with your field names
      const processedTasks = filteredData
        .map((task) => {
          // Skip if not assigned to current user (for standard users)
          if (userRole === "user" && task.name?.toLowerCase() !== username?.toLowerCase()) {
            return null;
          }

          // For delegation use planned_date, for checklist use task_start_date
          const dateField = dashboardType === "delegation" ? task.planned_date : task.task_start_date;
          const taskStartDate = parseTaskStartDate(dateField);
          const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null;

          let status = "pending";
          if (completionDate) {
            status = "completed";
          } else if (taskStartDate && isDateInPast(taskStartDate)) {
            status = "overdue";
          }

          // Logic: For checklist, count up to today. For delegation, if completed, ALWAYS count. If pending, count up to today.
          const shouldCountForCards = 
            (taskStartDate && taskStartDate <= today) || 
            (dashboardType === "delegation") ||
            (status === "completed");

          // Only count tasks for cards based on the condition above
          if (shouldCountForCards) {
            if (status === "completed") {
              completedTasks++;
              // Count ratings for all modules if they have the field
              const rating = Number(task.color_code_for || 0);
              if (rating === 1) completedRatingOne++;
              else if (rating === 2) completedRatingTwo++;
              else if (rating >= 3) completedRatingThreePlus++;
            } else {
              pendingTasks++;
              if (status === "overdue") {
                overdueTasks++;
                pendingOverdue++;
              } else if (taskStartDate && isDateToday(taskStartDate)) {
                pendingToday++;
              } else if (taskStartDate && taskStartDate > today) {
                pendingUpcoming++;
              }
            }
            totalTasks++;
          }

          // Update monthly data for all tasks
          if (taskStartDate) {
            const monthName = taskStartDate.toLocaleString("default", { month: "short" });
            if (monthlyData[monthName]) {
              if (status === "completed") {
                monthlyData[monthName].completed++;
              } else {
                monthlyData[monthName].pending++;
              }
            }
          }

          return {
            id: task.task_id,
            title: task.task_description,
            assignedTo: task.name || "Unassigned",
            taskStartDate: formatDateToDDMMYYYY(taskStartDate),
            originalTaskStartDate: task.task_start_date,
            submission_date: task.submission_date,
            status,
            frequency: task.frequency || "one-time",
            rating: task.color_code_for || 0,
            is_on_time: task.is_on_time,
          };
        })
        .filter(Boolean);

      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0

      const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        completed: data.completed,
        pending: data.pending,
      }))

      const pieChartData = [
        { name: "Completed", value: completedTasks, color: "#22c55e" },
        { name: "Pending", value: pendingTasks, color: "#facc15" },
        { name: "Overdue", value: overdueTasks, color: "#ef4444" },
      ]

      const staffMap = new Map()

      if (processedTasks.length > 0) {
        processedTasks.forEach((task) => {
          const taskDate = parseTaskStartDate(task.originalTaskStartDate)
          // Only include tasks up to today for staff calculations
          if (taskDate && taskDate <= today) {
            const assignedTo = task.assignedTo || "Unassigned"
            if (!staffMap.has(assignedTo)) {
              staffMap.set(assignedTo, {
                name: assignedTo,
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
              })
            }
            const staff = staffMap.get(assignedTo)
            staff.totalTasks++
            if (task.status === "completed") {
              staff.completedTasks++
            } else {
              staff.pendingTasks++
            }
          }
        })
      }

      const staffMembers = Array.from(staffMap.values()).map((staff) => ({
        ...staff,
        id: (staff.name || "unassigned").replace(/\s+/g, "-").toLowerCase(),
        email: `${(staff.name || "unassigned").toLowerCase().replace(/\s+/g, ".")}@example.com`,
        progress: staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0,
      }))

      setDepartmentData(prev => {
        const updatedTasks = append
          ? [...prev.allTasks, ...processedTasks]
          : processedTasks

        return {
          allTasks: updatedTasks,
          staffMembers,
          totalTasks: append ? prev.totalTasks + totalTasks : totalTasks,
          completedTasks: append ? prev.completedTasks + completedTasks : completedTasks,
          pendingTasks: append ? prev.pendingTasks + pendingTasks : pendingTasks,
          overdueTasks: append ? prev.overdueTasks + overdueTasks : overdueTasks,
          completionRate: append
            ? (updatedTasks.filter(t => t.status === "completed").length / updatedTasks.length * 100).toFixed(1)
            : completionRate,
          barChartData,
          pieChartData,
          completedRatingOne: append ? prev.completedRatingOne + completedRatingOne : completedRatingOne,
          completedRatingTwo: append ? prev.completedRatingTwo + completedRatingTwo : completedRatingTwo,
          completedRatingThreePlus: append ? prev.completedRatingThreePlus + completedRatingThreePlus : completedRatingThreePlus,
          pendingToday: append ? prev.pendingToday + pendingToday : pendingToday,
          pendingUpcoming: append ? prev.pendingUpcoming + pendingUpcoming : pendingUpcoming,
          pendingOverdue: append ? prev.pendingOverdue + pendingOverdue : pendingOverdue,
        }
      })

      // Check if we have more data to load
      if (data.length < batchSize) {
        setHasMoreData(false)
        setIsLoadingMore(false)
      } else {
        setCurrentPage(page)
        fetchDepartmentData(page + 1, true)
      }
    } catch (error) {
      console.error(`Error fetching ${dashboardType} data:`, error)
      setIsLoadingMore(false)
    }
  }

  const fetchDepartments = async () => {
    if (dashboardType === 'checklist' || dashboardType === 'maintenance') {
      try {
        const fullDepts = await fetchDepartmentDataApi();
        setRawDepartmentList(fullDepts);
        
        // Extract unique units for initial load
        const allUnits = [...new Set(fullDepts.map(d => d.unit).filter(u => u && u.trim() !== ''))].sort();
        setAvailableUnits(allUnits);

        // Get unique departments purely for filtering initial UI
        // We'll update availableDepartments dynamically in another effect
        const departments = [...new Set(fullDepts.map(d => d.department).filter(u => u && u.trim() !== ''))].sort();

        // Get user's department access
        const userAccess = localStorage.getItem("user_access") || "";

        const userDepartments = userAccess
          ? userAccess.split(',').map(dept => dept.trim().toLowerCase())
          : [];

        // Filter departments based on user access for standard admin users
        let filteredDepartments = departments;
        if (userRole === "admin" && userDepartments.length > 0) {
          filteredDepartments = departments.filter(dept =>
            userDepartments.includes(dept.toLowerCase())
          );
        }

        setAvailableDepartments(filteredDepartments);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setAvailableDepartments([]);
        setAvailableUnits([]);
        setAvailableDivisions([]);
      }
    } else {
      setAvailableDepartments([]);
      setAvailableUnits([]);
      setAvailableDivisions([]);
    }
  }

  useEffect(() => {
    fetchDepartments();
  }, [dashboardType, userRole]);

  // Dynamically update available Divisions and Departments based on Unit and Division selection
  useEffect(() => {
    if (!rawDepartmentList || rawDepartmentList.length === 0) return;

    let filtered = [...rawDepartmentList];
    
    // Filter by unit if selected
    if (unitFilter !== "all") {
      filtered = filtered.filter(d => d.unit && d.unit.toLowerCase() === unitFilter.toLowerCase());
    }
    
    // Filter by division if selected
    if (divisionFilter !== "all") {
      filtered = filtered.filter(d => d.division && d.division.toLowerCase() === divisionFilter.toLowerCase());
    }

    // Rebuild available Divisions based on the current full list (or just unit filtered list)
    if (unitFilter !== "all") {
      const unitFilteredList = rawDepartmentList.filter(d => d.unit && d.unit.toLowerCase() === unitFilter.toLowerCase());
      const divs = [...new Set(unitFilteredList.map(d => d.division).filter(v => v && v.trim() !== ''))].sort();
      setAvailableDivisions(divs);
    } else {
      setAvailableDivisions([...new Set(rawDepartmentList.map(d => d.division).filter(v => v && v.trim() !== ''))].sort());
    }

    // Rebuild available Departments based on Unit/Division filters
    const depts = [...new Set(filtered.map(d => d.department).filter(v => v && v.trim() !== ''))].sort();

    // Check against user permissions
    const userAccess = localStorage.getItem("user_access") || "";
    const userDepartments = userAccess ? userAccess.split(',').map(dept => dept.trim().toLowerCase()) : [];
    
    let finalDepartments = depts;
    if (userRole === "admin" && userDepartments.length > 0) {
      finalDepartments = depts.filter(dept => userDepartments.includes(dept.toLowerCase()));
    }
    setAvailableDepartments(finalDepartments);

  }, [unitFilter, divisionFilter, rawDepartmentList, userRole]);
 
  // DIV_ADMIN: Robust auto-select division from available options (handles case mismatches)
  useEffect(() => {
    if (userRole === "div_admin" && availableDivisions.length > 0) {
      const userDivision = localStorage.getItem("division");
      if (userDivision) {
        // If current filter doesn't exactly match any available option (e.g. case mismatch or still 'all'),
        // try to find a case-insensitive match.
        const isExactMatch = availableDivisions.includes(divisionFilter);
        if (!isExactMatch) {
          const match = availableDivisions.find(d => d.toLowerCase() === userDivision.toLowerCase());
          if (match && divisionFilter !== match) {
            setDivisionFilter(match);
          }
        }
      }
    }
  }, [availableDivisions, userRole, divisionFilter]);


  // Reset staff filter when department filter changes
  useEffect(() => {
    if (dashboardType === 'checklist' || dashboardType === 'maintenance') {
      setDashboardStaffFilter("all");
    }
  }, [departmentFilter, dashboardType]);

  // Update available staff when department filter changes
  useEffect(() => {
    const updateStaffList = async () => {
      if (dashboardType === 'checklist' || dashboardType === 'maintenance') {
        if (departmentFilter !== 'all' || divisionFilter !== 'all' || unitFilter !== 'all') {
          try {
            const staffNames = await getStaffNamesByDepartmentApi(departmentFilter, unitFilter, divisionFilter);
            setAvailableStaff(staffNames || []);
          } catch (error) {
            console.error('Error fetching staff by filters:', error);
            setAvailableStaff([]);
          }
        } else {
          // When "all" is selected, reset to empty and let fetchDepartmentData populate it
          // Don't clear it here as it will be populated by fetchDepartmentData
        }
      }
    };

    updateStaffList();
  }, [departmentFilter, divisionFilter, unitFilter, dashboardType]);

  // Add scroll event listener for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      const tableContainer = document.querySelector('.task-table-container')
      if (!tableContainer) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2

      if (isNearBottom && !isLoadingMore && hasMoreData) {
        loadMoreData()
      }
    }

    const tableContainer = document.querySelector('.task-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [isLoadingMore, hasMoreData])

  useEffect(() => {
    // Fetch detailed data for charts and tables
    fetchDepartmentData(1, false)

    // Update Redux state counts with staff, department filters and date range
    const filterParams = {
      dashboardType,
      staffFilter: dashboardStaffFilter,
      departmentFilter,
      unitFilter,
      divisionFilter,
      role: userRole,
      username,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    };

    dispatch(fetchDashboardSummaryCounts(filterParams));

    if (dashboardType === "delegation") {
      dispatch(delegationData({ startDate: dateRange.startDate, endDate: dateRange.endDate }));
      dispatch(delegationDoneData({ startDate: dateRange.startDate, endDate: dateRange.endDate }));
    }
  }, [dashboardType, dashboardStaffFilter, departmentFilter, unitFilter, divisionFilter, dateRange.startDate, dateRange.endDate, dispatch, userRole, username])

  // Filter tasks based on criteria
  const filteredTasks = departmentData.allTasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false
    if (filterStaff !== "all" && task.assignedTo.toLowerCase() !== filterStaff.toLowerCase()) {
      return false
    }
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim()
      return (
        (task.title && task.title.toLowerCase().includes(query)) ||
        (task.id && task.id.toString().includes(query)) ||
        (task.assignedTo && task.assignedTo.toLowerCase().includes(query))
      )
    }
    return true
  })

  // Reset dashboard staff filter when dashboard type changes
  useEffect(() => {
    setDashboardStaffFilter("all")
    setDepartmentFilter("all")
    setUnitFilter("all")
    if (userRole === "div_admin") {
      const userDivision = localStorage.getItem("division");
      setDivisionFilter(userDivision || "all")
    } else {
      setDivisionFilter("all")
    }
    setCurrentPage(1)
    setHasMoreData(true)
    // Clear date range when dashboard type changes
    setDateRange({
      startDate: "",
      endDate: "",
      filtered: false
    });
  }, [dashboardType])

  const getTasksByView = (view) => {
    return filteredTasks.filter((task) => {
      const taskDate = parseTaskStartDate(task.originalTaskStartDate);
      if (!taskDate) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const taskDateOnly = new Date(taskDate);
      taskDateOnly.setHours(0, 0, 0, 0);

      switch (view) {
        case "recent":
          // For delegation, show today's tasks regardless of completion status
          if (dashboardType === "delegation") {
            return isDateToday(taskDate);
          }
          // For checklist, show today's tasks but exclude completed ones
          return isDateToday(taskDate) && task.status !== "completed";

        case "upcoming":
          // Show all future tasks
          return taskDateOnly > today;

        case "overdue":
          // For delegation, show tasks that are past due and have null submission_date
          if (dashboardType === "delegation") {
            return taskDateOnly < today && !task.submission_date;
          }
          // For checklist, show tasks that are past due and not completed
          return taskDateOnly < today && task.status !== "completed";

        default:
          return true;
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600 text-white"
      case "pending":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "overdue":
        return "bg-red-500 hover:bg-red-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
        
    }
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-gray-500 hover:bg-gray-600 text-white"
      case "daily":
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case "weekly":
        return "bg-purple-500 hover:bg-purple-600 text-white"
      case "fortnightly":
        return "bg-indigo-500 hover:bg-indigo-600 text-white"
      case "monthly":
        return "bg-orange-500 hover:bg-orange-600 text-white"
      case "quarterly":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "yearly":
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate filtered stats for cards - same logic as table
  const cardStats = (() => {
    // Filter tasks that are not upcoming (due today or before)
    const filteredTasks = departmentData.allTasks.filter((task) => {
      const taskDate = parseTaskStartDate(task.originalTaskStartDate)
      return taskDate && taskDate <= today
    })

    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter((task) => task.status === "completed").length
    const pendingTasks = totalTasks - completedTasks
    const overdueTasks = filteredTasks.filter((task) => task.status === "overdue").length

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
    }
  })()

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchDepartmentData(nextPage, true)
    }
  }

  // Use displayStats consistently
  const displayStats = {
    totalTasks: dashboardType === "delegation" 
      ? ((completedRatingOne || 0) + 
         (completedRatingTwo || 0) + 
         (completedRatingThreePlus || 0) + 
         (pendingToday || 0) + 
         (pendingOverdue || 0))
      : (totalTask || 0),
    completedTasks: completeTask || 0,
    pendingTasks: pendingTask || 0,
    overdueTasks: overdueTask || 0,
    pendingToday: pendingToday || 0,
    pendingUpcoming: pendingUpcoming || 0,
    pendingOverdue: pendingOverdue || 0,
    completedRatingOne: completedRatingOne || 0,
    completedRatingTwo: completedRatingTwo || 0,
    completedRatingThreePlus: completedRatingThreePlus || 0,
    completedOnTime: completedOnTime || 0,
    notDoneTasks: notDoneTask || 0,
  };

  const finalNotDoneTask = displayStats.notDoneTasks;

  // Persistence for active module tab
  const [activeModule, setActiveModule] = useState(() => {
    const saved = localStorage.getItem("admin_dashboard_active_module");
    if (saved && canAccessModule(saved)) return saved;
    // Default fallback based on access
    if (canAccessModule("checklist")) return "checklist";
    if (canAccessModule("delegation")) return "delegation";
    if (canAccessModule("maintenance")) return "maintenance";
    return "checklist"; // Hard fallback
  });

  const handleModuleChange = (module) => {
    setActiveModule(module);
    localStorage.setItem("admin_dashboard_active_module", module);
    
    // Dispatch reset to clear Redux counts immediately to prevent showing old counts from previous tab
    dispatch(resetDashboardState());
    
    // Reset local department state data
    setDepartmentData({
      allTasks: [],
      staffMembers: [],
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      completionRate: 0,
      barChartData: [],
      pieChartData: [],
      completedRatingOne: 0,
      completedRatingTwo: 0,
      completedRatingThreePlus: 0,
      pendingToday: 0,
      pendingUpcoming: 0,
      pendingOverdue: 0,
    });
    
    // Reset all filter states to default values immediately to prevent duplicate fetch on render
    setDashboardStaffFilter("all");
    setDepartmentFilter("all");
    setUnitFilter("all");
    if (userRole === "div_admin") {
      const userDivision = localStorage.getItem("division");
      setDivisionFilter(userDivision || "all");
    } else {
      setDivisionFilter("all");
    }
    setCurrentPage(1);
    setHasMoreData(true);
    setDateRange({
      startDate: "",
      endDate: "",
      filtered: false
    });

    // Sync dashboardType with module
    if (module === "checklist") {
      setDashboardType("checklist");
    } else if (module === "delegation") {
      setDashboardType("delegation");
    } else if (module === "maintenance") {
      setDashboardType("maintenance");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Level Module Switcher (Segmented Control) */}
        {(canAccessModule("checklist") || canAccessModule("delegation") || canAccessModule("maintenance")) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            <div className="flex items-center gap-2">
               {/* Left side empty or logo space */}
            </div>

            <div className="flex w-full p-1 bg-white rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {canAccessModule("checklist") && (
                <button
                  onClick={() => handleModuleChange("checklist")}
                  className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 min-w-0 ${
                    activeModule === "checklist"
                      ? "bg-blue-600 text-white shadow-lg scale-105 z-10"
                      : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  }`}
                >
                  <i className="fas fa-clipboard-list h-4 w-4 shrink-0" />
                  <span className="hidden min-[480px]:inline truncate">Checklist</span>
                </button>
              )}
              {canAccessModule("delegation") && (
                <button
                  onClick={() => handleModuleChange("delegation")}
                  className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 min-w-0 ${
                    activeModule === "delegation"
                      ? "bg-blue-600 text-white shadow-lg scale-105 z-10"
                      : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  }`}
                >
                  <i className="fas fa-handshake h-4 w-4 shrink-0" />
                  <span className="hidden min-[480px]:inline truncate">Delegation</span>
                </button>
              )}
              {canAccessModule("maintenance") && (
                <button
                  onClick={() => handleModuleChange("maintenance")}
                  className={`flex-1 flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 min-w-0 ${
                    activeModule === "maintenance"
                      ? "bg-blue-600 text-white shadow-lg scale-105 z-10"
                      : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                  }`}
                >
                  <i className="fas fa-tools h-4 w-4 shrink-0" />
                  <span className="hidden min-[480px]:inline truncate">Maintenance</span>
                </button>
              )}
            </div>
            
            <div className="hidden sm:block">
               {/* Spacing or other admin info */}
            </div>
          </div>
        )}


        <div className="space-y-6 animate-in fade-in duration-500">
          <DashboardHeader
            dashboardType={dashboardType}
            setDashboardType={setDashboardType}
            dashboardStaffFilter={dashboardStaffFilter}
            setDashboardStaffFilter={setDashboardStaffFilter}
            availableStaff={availableStaff}
            userRole={userRole}
            username={username}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            availableDepartments={availableDepartments}
            unitFilter={unitFilter}
            setUnitFilter={setUnitFilter}
            availableUnits={availableUnits}
            divisionFilter={divisionFilter}
            setDivisionFilter={setDivisionFilter}
            availableDivisions={availableDivisions}
            isLoadingMore={isLoadingMore}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
            onResetFilters={resetAllFilters}
            onExportCSV={handleExportCSV}
            isExporting={isExporting}
          />

          {(activeModule === "checklist" || activeModule === "delegation") ? (
            <>
              <StatisticsCards
                totalTask={displayStats.totalTasks}
                completeTask={displayStats.completedTasks}
                pendingTask={displayStats.pendingTasks}
                overdueTask={displayStats.overdueTasks}
                notDoneTask={notDoneTask}
                dashboardType={dashboardType}
                dateRange={dateRange.filtered ? dateRange : null}
                dashboardStaffFilter={dashboardStaffFilter}
                allStaffTasks={departmentData.allTasks}
                pendingToday={displayStats.pendingToday}
                pendingUpcoming={displayStats.pendingUpcoming}
                pendingOverdue={displayStats.pendingOverdue}
                completedRatingOne={displayStats.completedRatingOne}
                completedRatingTwo={displayStats.completedRatingTwo}
                completedRatingThreePlus={displayStats.completedRatingThreePlus}
                completedOnTime={displayStats.completedOnTime}
                isLoading={isLoadingMore}
              />

              {activeTab === "overview" && (activeModule === "checklist" || activeModule === "delegation") && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-purple-200 shadow-md bg-white">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                      <h3 className="text-purple-700 font-medium">Staff Task Summary</h3>
                      <p className="text-purple-600 text-sm">Overview of tasks assigned to each staff member</p>
                    </div>
                    <div className="p-4">
                      <StaffTasksTable
                        dashboardType={dashboardType}
                        dashboardStaffFilter={dashboardStaffFilter}
                        departmentFilter={departmentFilter}
                        divisionFilter={divisionFilter}
                        unitFilter={unitFilter}
                        parseTaskStartDate={parseTaskStartDate}
                        startDate={dateRange.startDate}
                        endDate={dateRange.endDate}
                      />
                    </div>
                  </div>
                </div>
              )}

              <TaskNavigationTabs
                taskView={taskView}
                setTaskView={setTaskView}
                dashboardType={dashboardType}
                dashboardStaffFilter={dashboardStaffFilter}
                departmentFilter={departmentFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterStaff={filterStaff}
                setFilterStaff={setFilterStaff}
                departmentData={departmentData}
                getTasksByView={getTasksByView}
                getFrequencyColor={getFrequencyColor}
                isLoadingMore={isLoadingMore}
                hasMoreData={hasMoreData}
                username={username}
                userRole={userRole}
                onTaskComplete={() => {
                  setCurrentPage(1)
                  fetchDepartmentData(1, false)
                }}
              />
            </>
          ) : (
            <MaintenanceView 
              startDate={dateRange.startDate} 
              endDate={dateRange.endDate}
              dashboardStaffFilter={dashboardStaffFilter}
              departmentFilter={departmentFilter}
              unitFilter={unitFilter}
              divisionFilter={divisionFilter}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
