"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { format } from 'date-fns';
import { Search, ChevronDown, Filter, Trash2, Edit, Save, X, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "../components/layout/AdminLayout";
import { hasPageAccess, canAccessModule, hasModifyAccess } from "../utils/permissionUtils";
import DelegationPage from "./delegation-data";
import MaintenanceQuickTaskPage from "./maintenance-quick-task";
import { useDispatch, useSelector } from "react-redux";
import { 
  deleteChecklistTask, 
  uniqueChecklistTaskData, 
  uniqueDelegationTaskData, 
  updateChecklistTask, 
  fetchUsers, 
  resetChecklistPagination, 
  resetDelegationPagination,
  fetchQuickTaskCounts
} from "../redux/slice/quickTaskSlice";
import { fetchMaintenanceCounts } from "../redux/slice/maintenanceSlice";


export default function QuickTask() {
  const [tasks, setTasks] = useState([]);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeTab, setActiveTab] = useState(() => {
    if (canAccessModule('checklist')) return 'checklist';
    if (canAccessModule('delegation')) return 'delegation';
    if (canAccessModule('maintenance')) return 'maintenance';
    return 'checklist';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [nameFilter, setNameFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [divFilter, setDivFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
    const tableContainerRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState({
    name: false,
    department: false,
    division: false,
    frequency: false
  });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { 
    quickTask, 
    loading, 
    delegationTasks,
    delegationTotal,
    users,
    checklistPage,
    checklistTotal,
    checklistHasMore,
    delegationPage,
    delegationHasMore,
    discreteChecklistTotal,
    discreteDelegationTotal
  } = useSelector((state) => state.quickTask);
  const { uniqueMaintenanceTasks, uniqueMaintenanceTotal, discreteMaintenanceTotal } = useSelector((state) => state.maintenance);
  const { userData: currentUser } = useSelector((state) => state.login);
  const dispatch = useDispatch();

  // Retrieve user role and department info
  const userRole = (currentUser && !Array.isArray(currentUser))
    ? currentUser.role
    : localStorage.getItem('role');
  
  const loginUserData = (currentUser && !Array.isArray(currentUser) && Object.keys(currentUser).length > 0)
    ? currentUser
    : {
        user_name: localStorage.getItem('user-name'),
        role: localStorage.getItem('role'),
        email_id: localStorage.getItem('email_id'),
        unit: localStorage.getItem('unit'),
        division: localStorage.getItem('division'),
        department: localStorage.getItem('department'),
        user_access: localStorage.getItem('user_access')
      };

  const userDept = loginUserData?.department || loginUserData?.user_access;
  const userDiv = loginUserData?.division;

useEffect(() => {
  dispatch(fetchUsers());
  if (userRole) {
    const params = {
      userRole,
      userDept,
      userDiv,
      userName: loginUserData.user_name,
      search: debouncedSearchTerm,
      nameFilter,
      deptFilter,
      divFilter,
      freqFilter
    };
    
    // Fetch initial data
    dispatch(resetChecklistPagination());
    dispatch(resetDelegationPagination());
    dispatch(uniqueChecklistTaskData({ 
      page: 0, 
      pageSize: 50, 
      append: false,
      ...params
    }));

    dispatch(uniqueDelegationTaskData({ 
      page: 0, 
      pageSize: 50, 
      append: false,
      ...params
    }));

    // Fetch discrete counts for header
    dispatch(fetchQuickTaskCounts(params));
    dispatch(fetchMaintenanceCounts(params));
  }
}, [dispatch, userRole, userDept, userDiv, loginUserData.user_name, debouncedSearchTerm, nameFilter, deptFilter, divFilter, freqFilter]);


// Add this new function
const handleScroll = useCallback(() => {
  if (!tableContainerRef.current || loading) return;

  const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
  
  // Check if scrolled near bottom (within 100px)
  if (scrollHeight - scrollTop - clientHeight < 100) {
    if (activeTab === 'checklist' && checklistHasMore) {
      dispatch(uniqueChecklistTaskData({ 
        page: checklistPage, 
        pageSize: 50, 
        nameFilter,
        deptFilter,
        divFilter,
        freqFilter,
        search: debouncedSearchTerm,
        append: true,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else if (activeTab === 'delegation' && delegationHasMore) {
      dispatch(uniqueDelegationTaskData({ 
        page: delegationPage, 
        pageSize: 50, 
        nameFilter,
        deptFilter,
        divFilter,
        freqFilter,
        search: debouncedSearchTerm,
        append: true,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  }
}, [loading, activeTab, checklistHasMore, delegationHasMore, checklistPage, delegationPage, nameFilter, deptFilter, divFilter, freqFilter, debouncedSearchTerm, dispatch, userRole, userDept, userDiv, loginUserData.user_name]);

// Add scroll listener
useEffect(() => {
  const container = tableContainerRef.current;
  if (container) {
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }
}, [handleScroll]);

  // Helper to refresh discrete counts
  const refreshCounts = useCallback(() => {
    if (userRole) {
      const params = {
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      };
      dispatch(fetchQuickTaskCounts(params));
      dispatch(fetchMaintenanceCounts(params));
    }
  }, [dispatch, userRole, userDept, userDiv, loginUserData.user_name]);

  // const userRole = localStorage.getItem("role");
  const canModifyTasks = hasModifyAccess("quick_task");

  // Edit functionality
  const handleEditClick = (task) => {
    setEditingTaskId(task.task_id);
    setEditFormData({
      task_id: task.task_id,
      department: task.department || '',
      unit: task.unit || '',
      division: task.division || '',
      given_by: task.given_by || '',
      name: task.name || '',
      task_description: task.task_description || '',
      task_start_date: task.task_start_date || '',
      frequency: task.frequency || '',
      enable_reminder: task.enable_reminder || '',
      require_attachment: task.require_attachment || '',
      remark: task.remark || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) return;

    // Find the original task data for matching
    const originalTask = quickTask.find(task => task.task_id === editFormData.task_id);
    if (!originalTask) return;

    setIsSaving(true);
    try {
      await dispatch(updateChecklistTask({
        updatedTask: editFormData,
        originalTask: {
          department: originalTask.department,
          name: originalTask.name,
          task_description: originalTask.task_description
        }
      })).unwrap();

      setEditingTaskId(null);
      setEditFormData({});

      // Refresh the data to show all updated rows
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter, 
        deptFilter,
        divFilter,
        freqFilter, 
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));

      refreshCounts();

    } catch (error) {
      console.error("Failed to update task:", error);
      setError("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Change your checkbox to store whole row instead of only id
  const handleCheckboxChange = (task) => {
    if (selectedTasks.find(t => t.task_id === task.task_id)) {
      setSelectedTasks(selectedTasks.filter(t => t.task_id !== task.task_id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedTasks.length === filteredChecklistTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredChecklistTasks); // store full rows
    }
  };

  // Delete
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;

    setIsDeleting(true);
    try {
      console.log("Deleting rows:", selectedTasks);
      await dispatch(deleteChecklistTask(selectedTasks)).unwrap();
      setSelectedTasks([]);

      // Refresh the data to update counts and pagination
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter, 
        deptFilter,
        divFilter,
        freqFilter, 
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));

      refreshCounts();

    } catch (error) {
      console.error("Failed to delete tasks:", error);
      setError("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const CONFIG = {
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzXzqnKmbeXw3i6kySQcBOwxHQA7y8WBFfEe69MPbCR-jux0Zte7-TeSKi8P4CIFkhE/exec",
    SHEET_NAME: "Unique task",
    DELEGATION_SHEET: "Delegation",
    PAGE_CONFIG: {
      title: "Task Management",
      description: "Showing all unique tasks"
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? dateValue : format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return dateValue;
    }
  };

  const requestSort = (key) => {
    if (loading) return;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleDropdown = (dropdown) => {
    setDropdownOpen(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

const handleNameFilterSelect = (name) => {
  setNameFilter(name);
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: name,
        deptFilter: deptFilter,
        divFilter: divFilter,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: name,
        deptFilter: deptFilter,
        divFilter: divFilter,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, name: false });
};

const handleDeptFilterSelect = (dept) => {
  setDeptFilter(dept);
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: nameFilter,
        deptFilter: dept,
        divFilter: divFilter,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: nameFilter,
        deptFilter: dept,
        divFilter: divFilter,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, department: false });
};

const handleDivFilterSelect = (div) => {
  setDivFilter(div);
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: nameFilter,
        deptFilter: deptFilter,
        divFilter: div,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: nameFilter,
        deptFilter: deptFilter,
        divFilter: div,
        freqFilter: freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, division: false });
};

  const handleFrequencyFilterSelect = (freq) => {
  setFreqFilter(freq);
  
  if (activeTab === 'checklist') {
    dispatch(resetChecklistPagination());
    dispatch(uniqueChecklistTaskData({ 
      page: 0, 
      pageSize: 50, 
      nameFilter,
      deptFilter,
      divFilter,
      freqFilter: freq,
      append: false,
      userRole,
      userDept,
      userDiv,
      userName: loginUserData.user_name
    }));
  } else if (activeTab === 'delegation') {
    dispatch(resetDelegationPagination());
    dispatch(uniqueDelegationTaskData({ 
      page: 0, 
      pageSize: 50, 
      nameFilter,
      deptFilter,
      divFilter,
      freqFilter: freq,
      append: false,
      userRole,
      userDept,
      userDiv,
      userName: loginUserData.user_name
    }));
  }
  
  setDropdownOpen({ ...dropdownOpen, frequency: false });
};

const clearNameFilter = () => {
  setNameFilter('');
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: '',
        deptFilter,
        divFilter,
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter: '',
        deptFilter,
        divFilter,
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, name: false });
};

const clearDeptFilter = () => {
  setDeptFilter('');
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter,
        deptFilter: '',
        divFilter,
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter,
        deptFilter: '',
        divFilter,
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, department: false });
};

const clearDivFilter = () => {
  setDivFilter('');
  
  if (activeTab === 'checklist') {
      dispatch(uniqueChecklistTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter,
        deptFilter,
        divFilter: '',
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    } else {
      dispatch(resetDelegationPagination());
      dispatch(uniqueDelegationTaskData({ 
        page: 0, 
        pageSize: 50, 
        nameFilter,
        deptFilter,
        divFilter: '',
        freqFilter,
        append: false,
        userRole,
        userDept,
        userDiv,
        userName: loginUserData.user_name
      }));
    }
  
  setDropdownOpen({ ...dropdownOpen, division: false });
};

const clearFrequencyFilter = () => {
  setFreqFilter('');
  
  if (activeTab === 'checklist') {
    dispatch(resetChecklistPagination());
    dispatch(uniqueChecklistTaskData({ 
      page: 0, 
      pageSize: 50, 
      nameFilter,
      deptFilter,
      divFilter,
      freqFilter: '',
      append: false,
      userRole,
      userDept,
      userDiv,
      userName: loginUserData.user_name
    }));
  } else if (activeTab === 'delegation') {
    dispatch(resetDelegationPagination());
    dispatch(uniqueDelegationTaskData({ 
      page: 0, 
      pageSize: 50, 
      nameFilter,
      deptFilter,
      divFilter,
      freqFilter: '',
      append: false,
      userRole,
      userDept,
      userDiv,
      userName: loginUserData.user_name
    }));
  }
  
  setDropdownOpen({ ...dropdownOpen, frequency: false });
};

  // FIXED: Added proper null/undefined checks and string validation
const allNames = [
  ...new Set(users.map(user => user.user_name))
].filter(name => name && typeof name === 'string' && name.trim() !== '')
 .sort();

const allDepartments = [
  ...new Set(users.map(user => user.department || user.user_access))
].filter(dept => dept && typeof dept === 'string' && dept.trim() !== '')
 .sort();

const allDivisions = [
  ...new Set(users.map(user => user.division))
].filter(div => div && typeof div === 'string' && div.trim() !== '')
 .sort();

  // Static frequency options - always available regardless of loaded data
  const allFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'];


const filteredChecklistTasks = useMemo(() => {
  let filtered = [...quickTask];
  
  // 3. Sorting
  return filtered.sort((a, b) => {
    if (!sortConfig.key) return 0;
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
}, [quickTask, userRole, loginUserData, freqFilter, nameFilter, deptFilter, divFilter, searchTerm, sortConfig]);

const filteredDelegationTasks = useMemo(() => {
  const role = userRole?.toLowerCase();
  const targetDept = loginUserData?.department?.toLowerCase()?.trim() || loginUserData?.user_access?.toLowerCase()?.trim();
  const targetDiv = loginUserData?.division?.toLowerCase()?.trim();
  const targetName = loginUserData?.user_name?.toLowerCase()?.trim();

  let filtered = [...(delegationTasks || [])];

  // 1. Role-based restrictions
  filtered = filtered.filter(task => {
    if (role === 'admin') {
      return task.division?.toLowerCase()?.trim() === targetDiv && task.department?.toLowerCase()?.trim() === targetDept;
    } else if (role === 'div_admin') {
      return task.division?.toLowerCase()?.trim() === targetDiv;
    } else if (role === 'user') {
      return task.name?.toLowerCase()?.trim() === targetName;
    }
    return true; // super_admin
  });

  return filtered;
}, [delegationTasks, userRole, loginUserData, nameFilter, deptFilter, divFilter, freqFilter]);

const filteredMaintenanceTasks = useMemo(() => {
  const role = userRole?.toLowerCase();
  const targetDept = loginUserData?.department?.toLowerCase()?.trim() || loginUserData?.user_access?.toLowerCase()?.trim();
  const targetDiv = loginUserData?.division?.toLowerCase()?.trim();
  const targetName = loginUserData?.user_name?.toLowerCase()?.trim();

  let filtered = [...(uniqueMaintenanceTasks || [])];

  // 1. Role-based restrictions
  filtered = filtered.filter(task => {
    if (role === 'admin') {
      return task.division?.toLowerCase()?.trim() === targetDiv && task.department?.toLowerCase()?.trim() === targetDept;
    } else if (role === 'div_admin') {
      return task.division?.toLowerCase()?.trim() === targetDiv;
    } else if (role === 'user') {
      return task.name?.toLowerCase()?.trim() === targetName;
    }
    return true; // super_admin
  });

  return filtered;
}, [uniqueMaintenanceTasks, userRole, loginUserData, nameFilter, deptFilter, divFilter, freqFilter]);

  function formatTimestampToDDMMYYYY(timestamp) {
    if (!timestamp || timestamp === "" || timestamp === null) {
      return "—"; // or just return ""
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "—"; // fallback if it's not a valid date
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Format timestamp with time (DD/MM/YYYY HH:MM:SS)
  function formatTimestampWithTime(timestamp) {
    if (!timestamp || timestamp === "" || timestamp === null) {
      return "—";
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return "—";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return (
      <div>
        <div className="font-medium">{`${day}/${month}/${year}`}</div>
        <div className="text-xs text-gray-500">{`${hours}:${minutes}:${seconds}`}</div>
      </div>
    );
  }

  // Calculate the last task date based on task_start_date and frequency
  function calculateLastTaskDate(task) {
    if (!task) return "—";
    
    // Use planned_date if available
    if (task.planned_date) {
      return formatTimestampToDDMMYYYY(task.planned_date);
    }

    if (!task.task_start_date) return "—";
    
    // Fallback if no planned_date
    if (!task.frequency || task.frequency.toLowerCase() === 'once') {
      return formatTimestampToDDMMYYYY(task.task_start_date);
    }

    return "—";
  }

  return (
    <AdminLayout>
      <div className="sticky top-0 z-30 bg-white pb-4 border-b border-gray-200">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-purple-700">
              {CONFIG.PAGE_CONFIG.title}
            </h1>
            <p className="text-purple-600 text-sm">
              {activeTab === 'checklist'
                // ? `Showing ${filteredChecklistTasks.length} of ${discreteChecklistTotal} checklist tasks`
                ? `Showing ${discreteChecklistTotal} checklist tasks`
                : activeTab === 'delegation' 
                  // ? `Showing ${filteredDelegationTasks.length} of ${discreteDelegationTotal} delegation tasks` 
                  // : `Showing ${filteredMaintenanceTasks.length} of ${discreteMaintenanceTotal} maintenance tasks`}
                  ? `Showing ${discreteDelegationTotal} delegation tasks` 
                  : `Showing ${discreteMaintenanceTotal} maintenance tasks`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto flex-wrap">
            <div className="flex border border-purple-200 rounded-md overflow-hidden self-start">
              {canAccessModule('checklist') && (
                <button
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'checklist' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                  onClick={() => {
                    setActiveTab('checklist');
                    dispatch(resetChecklistPagination());
                    dispatch(uniqueChecklistTaskData({ 
                      page: 0, 
                      pageSize: 50, 
                      nameFilter, 
                      deptFilter,
                      divFilter,
                      freqFilter,
                      userRole,
                      userDept,
                      userDiv,
                      userName: loginUserData.user_name
                    }));
                  }}
                >
                  Checklist
                </button>
              )}
              {canAccessModule('delegation') && (
                <button
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'delegation' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                  onClick={() => {
                    setActiveTab('delegation');
                    dispatch(resetDelegationPagination());
                    dispatch(uniqueDelegationTaskData({ 
                      page: 0, 
                      pageSize: 50, 
                      nameFilter, 
                      deptFilter,
                      divFilter,
                      freqFilter,
                      userRole,
                      userDept,
                      userDiv,
                      userName: loginUserData.user_name
                    }));
                  }}
                >
                  Delegation
                </button>
              )}
              {canAccessModule('maintenance') && (
                <button
                  className={`px-4 py-2 text-sm font-medium ${activeTab === 'maintenance' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                  onClick={() => {
                    setActiveTab('maintenance');
                  }}
                >
                  Maintenance
                </button>
              )}
            </div>
                    <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                disabled={loading || delegationLoading}
              />
            </div>

            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden flex items-center justify-between w-full px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 font-bold shadow-sm transition-all active:scale-95"
            >
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-purple-500" />
                <span className="text-xs uppercase tracking-wider">
                  {showMobileFilters ? 'Hide Filter Options' : 'Show Filter Options'}
                </span>
              </div>
              {showMobileFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            <AnimatePresence>
              {(showMobileFilters) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="sm:hidden flex flex-col gap-3 w-full overflow-hidden"
                >
                  {/* Reuse the filter content for mobile */}
                  <FilterContent 
                    nameFilter={nameFilter}
                    setNameFilter={setNameFilter}
                    clearNameFilter={clearNameFilter}
                    handleNameFilterSelect={handleNameFilterSelect}
                    allNames={allNames}
                    dropdownOpen={dropdownOpen}
                    toggleDropdown={toggleDropdown}
                    setDropdownOpen={setDropdownOpen}
                    deptFilter={deptFilter}
                    setDeptFilter={setDeptFilter}
                    clearDeptFilter={clearDeptFilter}
                    handleDeptFilterSelect={handleDeptFilterSelect}
                    allDepartments={allDepartments}
                    divFilter={divFilter}
                    setDivFilter={setDivFilter}
                    clearDivFilter={clearDivFilter}
                    handleDivFilterSelect={handleDivFilterSelect}
                    allDivisions={allDivisions}
                    freqFilter={freqFilter}
                    handleFrequencyFilterSelect={handleFrequencyFilterSelect}
                    clearFrequencyFilter={clearFrequencyFilter}
                    allFrequencies={allFrequencies}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="hidden sm:flex gap-2 flex-wrap">
              <FilterContent 
                nameFilter={nameFilter}
                setNameFilter={setNameFilter}
                clearNameFilter={clearNameFilter}
                handleNameFilterSelect={handleNameFilterSelect}
                allNames={allNames}
                dropdownOpen={dropdownOpen}
                toggleDropdown={toggleDropdown}
                setDropdownOpen={setDropdownOpen}
                deptFilter={deptFilter}
                setDeptFilter={setDeptFilter}
                clearDeptFilter={clearDeptFilter}
                handleDeptFilterSelect={handleDeptFilterSelect}
                allDepartments={allDepartments}
                divFilter={divFilter}
                setDivFilter={setDivFilter}
                clearDivFilter={clearDivFilter}
                handleDivFilterSelect={handleDivFilterSelect}
                allDivisions={allDivisions}
                freqFilter={freqFilter}
                handleFrequencyFilterSelect={handleFrequencyFilterSelect}
                clearFrequencyFilter={clearFrequencyFilter}
                allFrequencies={allFrequencies}
              />
            </div>
            {selectedTasks.length > 0 && activeTab === 'checklist' && canModifyTasks && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 mt-2 sm:mt-0"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : `Delete (${selectedTasks.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button
            onClick={() => {
              dispatch(uniqueChecklistTaskData({ 
                page: 0, 
                pageSize: 50, 
                nameFilter: '', 
                freqFilter: '', 
                append: false,
                userRole,
                userDept,
                userDiv
              }))
            }}
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {loading && activeTab === 'delegation' && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading delegation data...</p>
        </div>
      )}

      {!error && (
        <>
          {activeTab === 'checklist' ? (
            <div className="mt-4 rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-purple-700 font-medium text-sm sm:text-base">Checklist Tasks</h2>
                  <p className="text-purple-600 text-xs sm:text-sm mt-1">
                    {CONFIG.PAGE_CONFIG.description}
                  </p>
                </div>
                {selectedTasks.length > 0 && (
                  <span className="text-sm text-purple-600">
                    {selectedTasks.length} task(s) selected
                  </span>
                )}
              </div>
              {/* <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}> */}
<div 
  ref={tableContainerRef}
  className="overflow-x-auto overflow-y-auto custom-scrollbar" 
  style={{ maxHeight: 'calc(100vh - 280px)' }}
>
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3 p-3">
                  {/* Mobile Select All */}
                  {canModifyTasks && filteredChecklistTasks.length > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedTasks.length === filteredChecklistTasks.length && filteredChecklistTasks.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-xs font-medium text-purple-700">Select All ({filteredChecklistTasks.length})</span>
                    </div>
                  )}
                  {filteredChecklistTasks.length > 0 ? (
                    filteredChecklistTasks.map((task, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task)}
                              onChange={() => handleCheckboxChange(task)}
                              disabled={!canModifyTasks}
                              className={`rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${!canModifyTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              task.frequency === 'Daily' ? 'bg-blue-100 text-blue-800' :
                              task.frequency === 'Weekly' ? 'bg-green-100 text-green-800' :
                              task.frequency === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.frequency}
                            </span>
                          </div>
                          {canModifyTasks && (
                            editingTaskId === task.task_id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  <Save size={12} />
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                >
                                  <X size={12} />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditClick(task)}
                                className="text-blue-600 text-xs underline"
                              >
                                Edit
                              </button>
                            )
                          )}
                        </div>
                        
                        {/* Task Description */}
                        {editingTaskId === task.task_id ? (
                          <textarea
                            value={editFormData.task_description}
                            onChange={(e) => handleInputChange('task_description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                            rows="3"
                            placeholder="Task Description"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 mb-2">{task.task_description || "—"}</p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Name */}
                          <div>
                            <span className="text-gray-500">Name:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              />
                            ) : (
                              <span className="font-medium">{task.name || "—"}</span>
                            )}
                          </div>
                          
                          {/* Department */}
                          <div>
                            <span className="text-gray-500">Dept:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.department}
                                onChange={(e) => handleInputChange('department', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              />
                            ) : (
                              <span className="font-medium">{task.department || "—"}</span>
                            )}
                          </div>

                          {/* Unit */}
                          <div>
                            <span className="text-gray-500">Unit:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.unit}
                                onChange={(e) => handleInputChange('unit', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              />
                            ) : (
                              <span className="font-medium">{task.unit || "—"}</span>
                            )}
                          </div>
                          
                          {/* Division */}
                          <div>
                            <span className="text-gray-500">Div:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.division}
                                onChange={(e) => handleInputChange('division', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              />
                            ) : (
                              <span className="font-medium">{task.division || "—"}</span>
                            )}
                          </div>
                          
                          {/* Given By */}
                          <div>
                            <span className="text-gray-500">Given By:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.given_by}
                                onChange={(e) => handleInputChange('given_by', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              />
                            ) : (
                              <span className="font-medium">{task.given_by || "—"}</span>
                            )}
                          </div>
                          
                          {/* Start Date (non-editable) */}
                          <div>
                            <span className="text-gray-500">Start:</span>{' '}
                            <span className="font-medium">{formatTimestampToDDMMYYYY(task.task_start_date)}</span>
                          </div>

                          {/* End Date (Planned Date) */}
                          <div>
                            <span className="text-gray-500">End:</span>{' '}
                            <span className="font-medium">{formatTimestampToDDMMYYYY(task.planned_date)}</span>
                          </div>
                          
                          {/* Reminder */}
                          <div>
                            <span className="text-gray-500">Reminder:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.enable_reminder}
                                onChange={(e) => handleInputChange('enable_reminder', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              <span className="font-medium">{task.enable_reminder || "—"}</span>
                            )}
                          </div>
                          
                          {/* Attachment */}
                          <div>
                            <span className="text-gray-500">Attachment:</span>{' '}
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.require_attachment}
                                onChange={(e) => handleInputChange('require_attachment', e.target.value)}
                                className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              <span className="font-medium">{task.require_attachment || "—"}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      {searchTerm || nameFilter || freqFilter
                        ? "No tasks matching your filters"
                        : "No tasks available"}
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 bg-gray-50 sticky left-0 z-30">
                        <input
                          type="checkbox"
                          checked={selectedTasks.length === filteredChecklistTasks.length && filteredChecklistTasks.length > 0}
                          onChange={handleSelectAll}
                          disabled={!canModifyTasks}
                          className={`rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${!canModifyTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </th>
                      <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-[48px] z-30 shadow-[1px_0_0_0_rgba(229,231,235,1)]">
                        ACTIONS
                      </th>
                      {[
                        { key: 'task_description', label: 'Task Description', minWidth: 'whitespace-nowrap' },
                        { key: 'name', label: 'Name', minWidth: 'min-w-[180px]' },
                        { key: 'given_by', label: 'Given By', minWidth: 'min-w-[180px]' },
                        { key: 'task_start_date', label: 'Start Date', bg: 'bg-yellow-50' },
                        { key: 'task_end_date', label: 'End Date', bg: 'bg-yellow-50' },
                        { key: 'frequency', label: 'Frequency' },
                        { key: 'department', label: 'Department' },
                        { key: 'unit', label: 'Unit' },
                        { key: 'division', label: 'Division' },
                        { key: 'enable_reminder', label: 'Reminders' },
                        { key: 'require_attachment', label: 'Attachment' },
                      ].map((column) => (
                        <th
                          key={column.label}
                          className={`px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.bg || ''} ${column.minWidth || ''} ${column.key && column.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                          onClick={() => column.key && column.key !== 'actions' && requestSort(column.key)}
                        >
                          <div className="flex items-center">
                            {column.label}
                            {sortConfig.key === column.key && (
                              <span className="ml-1">
                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredChecklistTasks.length > 0 ? (
                      filteredChecklistTasks.map((task, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap bg-white sticky left-0 z-10">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task)}
                              onChange={() => handleCheckboxChange(task)}
                              disabled={!canModifyTasks}
                              className={`rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${!canModifyTasks ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </td>

                          {/* Actions */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500 bg-white sticky left-[48px] z-10 shadow-[1px_0_0_0_rgba(229,231,235,1)]">
                            {editingTaskId === task.task_id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  <Save size={14} />
                                  {isSaving ? '...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                  <X size={14} />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              // REMOVED THE submission_date CHECK - ALWAYS SHOW EDIT BUTTON
                              canModifyTasks && (
                              <button
                                onClick={() => handleEditClick(task)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Edit size={14} />
                                Edit
                              </button>
                              )
                            )}
                          </td>

                          {/* Task Description */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 max-w-xs">
                            {editingTaskId === task.task_id ? (
                              <textarea
                                value={editFormData.task_description}
                                onChange={(e) => handleInputChange('task_description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows="3"
                              />
                            ) : (
                              <div className="break-words">
                                {task.task_description || "—"}
                              </div>
                            )}
                          </td>

                          {/* Name */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 min-w-[180px]">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="break-words">
                                {task.name || "—"}
                              </div>
                            )}
                          </td>

                          {/* Given By */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 min-w-[180px]">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.given_by}
                                onChange={(e) => handleInputChange('given_by', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <div className="break-words">
                                {task.given_by || "—"}
                              </div>
                            )}
                          </td>

                          {/* Task Start Date with Time */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                            {editingTaskId === task.task_id ? (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm cursor-not-allowed">
                                {formatTimestampWithTime(task.task_start_date)}
                              </span>
                            ) : (
                              formatTimestampWithTime(task.task_start_date)
                            )}
                          </td>

                          {/* End Date (Last Task Date) */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                            {calculateLastTaskDate(task)}
                          </td>

                          {/* Frequency - Non-editable */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 rounded-full text-xs ${task.frequency === 'Daily' ? 'bg-blue-100 text-blue-800' :
                              task.frequency === 'Weekly' ? 'bg-green-100 text-green-800' :
                                task.frequency === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                              }${editingTaskId === task.task_id ? ' opacity-60 cursor-not-allowed' : ''}`}>
                              {task.frequency || "—"}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.department}
                                onChange={(e) => handleInputChange('department', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.department || "—"
                            )}
                          </td>
                          
                          {/* Unit */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.unit}
                                onChange={(e) => handleInputChange('unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.unit || "—"
                            )}
                          </td>

                          {/* Division */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <input
                                type="text"
                                value={editFormData.division}
                                onChange={(e) => handleInputChange('division', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              task.division || "—"
                            )}
                          </td>

                          {/* Enable Reminders */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.enable_reminder}
                                onChange={(e) => handleInputChange('enable_reminder', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              task.enable_reminder || "—"
                            )}
                          </td>

                          {/* Require Attachment */}
                          <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingTaskId === task.task_id ? (
                              <select
                                value={editFormData.require_attachment}
                                onChange={(e) => handleInputChange('require_attachment', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Select</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            ) : (
                              task.require_attachment || "—"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={13} className="px-2 sm:px-6 py-2 sm:py-4 text-center text-gray-500">
                          {searchTerm || nameFilter || freqFilter
                            ? "No tasks matching your filters"
                            : "No tasks available"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {loading && checklistHasMore && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                  <p className="text-purple-600 text-sm mt-2">Loading more tasks...</p>
                </div>
              )}
              </div>
            </div>
          ) : activeTab === 'delegation' ? (
            <DelegationPage
              searchTerm={debouncedSearchTerm}
              nameFilter={nameFilter}
              deptFilter={deptFilter}
              divFilter={divFilter}
              freqFilter={freqFilter}
              setNameFilter={setNameFilter}
              setDeptFilter={setDeptFilter}
              setDivFilter={setDivFilter}
              setFreqFilter={setFreqFilter}
              userRole={userRole}
              userDept={userDept}
              userDiv={userDiv}
              userName={loginUserData?.user_name}
            />
          ) : (
            <MaintenanceQuickTaskPage
              searchTerm={debouncedSearchTerm}
              nameFilter={nameFilter}
              deptFilter={deptFilter}
              divFilter={divFilter}
              freqFilter={freqFilter}
              setNameFilter={setNameFilter}
              setDeptFilter={setDeptFilter}
              setDivFilter={setDivFilter}
              setFreqFilter={setFreqFilter}
              userRole={userRole}
              userDept={userDept}
              userDiv={userDiv}
              userName={loginUserData?.user_name}
            />
          )}
        </>
      )}
    </AdminLayout>
  );
}

/**
 * Sub-component for filters to avoid duplication between mobile collapse and desktop
 */
function FilterContent({ 
  nameFilter, setNameFilter, clearNameFilter, handleNameFilterSelect, allNames, dropdownOpen, toggleDropdown, setDropdownOpen,
  deptFilter, setDeptFilter, clearDeptFilter, handleDeptFilterSelect, allDepartments,
  divFilter, setDivFilter, clearDivFilter, handleDivFilterSelect, allDivisions,
  freqFilter, handleFrequencyFilterSelect, clearFrequencyFilter, allFrequencies
}) {
  return (
    <>
      {/* Name Filter */}
      <div className="relative w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={16} />
            </div>
            <input
              type="text"
              list="nameOptions"
              placeholder="Type or select name..."
              value={nameFilter}
              onChange={(e) => {
                const typedName = e.target.value;
                setNameFilter(typedName);
                if (typedName === '') clearNameFilter();
                else if (allNames.includes(typedName)) handleNameFilterSelect(typedName);
              }}
              className="w-full sm:w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <datalist id="nameOptions">
              {allNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {nameFilter && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  onClick={() => {
                    setNameFilter('');
                    clearNameFilter();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => toggleDropdown('name')}
            className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown size={16} className={`transition-transform ${dropdownOpen.name ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {dropdownOpen.name && (
          <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
            <div className="py-1">
              <button
                onClick={clearNameFilter}
                className={`block w-full text-left px-4 py-2 text-sm ${!nameFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Names
              </button>
              {allNames.map(name => (
                <button
                  key={name}
                  onClick={() => {
                    handleNameFilterSelect(name);
                    setDropdownOpen({ ...dropdownOpen, name: false });
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${nameFilter === name ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Department Filter */}
      <div className="relative w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={16} />
            </div>
            <input
              type="text"
              list="deptOptions"
              placeholder="Type or select department..."
              value={deptFilter}
              onChange={(e) => {
                const typedDept = e.target.value;
                setDeptFilter(typedDept);
                if (typedDept === '') clearDeptFilter();
                else if (allDepartments.includes(typedDept)) handleDeptFilterSelect(typedDept);
              }}
              className="w-full sm:w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <datalist id="deptOptions">
              {allDepartments.map(dept => (
                <option key={dept} value={dept} />
              ))}
            </datalist>
            {deptFilter && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  onClick={() => {
                    setDeptFilter('');
                    clearDeptFilter();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => toggleDropdown('department')}
            className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown size={16} className={`transition-transform ${dropdownOpen.department ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {dropdownOpen.department && (
          <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
            <div className="py-1">
              <button
                onClick={clearDeptFilter}
                className={`block w-full text-left px-4 py-2 text-sm ${!deptFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Departments
              </button>
              {allDepartments.map(dept => (
                <button
                  key={dept}
                  onClick={() => {
                    handleDeptFilterSelect(dept);
                    setDropdownOpen({ ...dropdownOpen, department: false });
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${deptFilter === dept ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Division Filter */}
      <div className="relative w-full sm:w-auto">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 sm:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={16} />
            </div>
            <input
              type="text"
              list="divOptions"
              placeholder="Type or select division..."
              value={divFilter}
              onChange={(e) => {
                const typedDiv = e.target.value;
                setDivFilter(typedDiv);
                if (typedDiv === '') clearDivFilter();
                else if (allDivisions.includes(typedDiv)) handleDivFilterSelect(typedDiv);
              }}
              className="w-full sm:w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <datalist id="divOptions">
              {allDivisions.map(div => (
                <option key={div} value={div} />
              ))}
            </datalist>
            {divFilter && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  onClick={() => {
                    setDivFilter('');
                    clearDivFilter();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => toggleDropdown('division')}
            className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown size={16} className={`transition-transform ${dropdownOpen.division ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {dropdownOpen.division && (
          <div className="absolute z-50 mt-1 w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto top-full right-0">
            <div className="py-1">
              <button
                onClick={clearDivFilter}
                className={`block w-full text-left px-4 py-2 text-sm ${!divFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Divisions
              </button>
              {allDivisions.map(div => (
                <button
                  key={div}
                  onClick={() => {
                    handleDivFilterSelect(div);
                    setDropdownOpen({ ...dropdownOpen, division: false });
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${divFilter === div ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Frequency Filter */}
      <div className="relative w-full sm:w-auto">
        <button
          onClick={() => toggleDropdown('frequency')}
          className="flex items-center justify-between w-full sm:w-auto gap-2 px-3 py-2 border border-purple-200 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 flex-shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">{freqFilter || 'Frequency'}</span>
          </div>
          <ChevronDown size={16} className={`transition-transform flex-shrink-0 ${dropdownOpen.frequency ? 'rotate-180' : ''}`} />
        </button>
        {dropdownOpen.frequency && (
          <div className="absolute z-50 mt-1 w-full sm:w-56 rounded-md bg-white shadow-lg border border-gray-200 max-h-60 overflow-auto bottom-full sm:bottom-auto mb-1 sm:mb-0">
            <div className="py-1">
              <button
                onClick={clearFrequencyFilter}
                className={`block w-full text-left px-4 py-2 text-sm ${!freqFilter ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                All Frequencies
              </button>
              {allFrequencies.map(freq => (
                <button
                  key={freq}
                  onClick={() => handleFrequencyFilterSelect(freq)}
                  className={`block w-full text-left px-4 py-2 text-sm ${freqFilter === freq ? 'bg-purple-100 text-purple-900' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
