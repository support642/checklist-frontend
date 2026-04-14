import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Plus, Bell } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { useDispatch, useSelector } from "react-redux"
import { checklistData, checklistHistoryData, updateChecklist, checklistMetadata } from "../../redux/slice/checklistSlice"
import { maintenanceData, updateMaintenance } from "../../redux/slice/maintenanceSlice"
import { postChecklistAdminDoneAPI, sendEmailNotificationAPI } from "../../redux/api/checkListApi"
import { sendMaintenanceNotificationAPI } from "../../redux/api/maintenanceApi"
import { uniqueDoerNameData } from "../../redux/slice/assignTaskSlice";
import { useNavigate, useSearchParams } from "react-router-dom"
import { hasModifyAccess, canAccessModule } from "../../utils/permissionUtils";

// Configuration object - Move all configurations here
const CONFIG = {
  checklist: {
    title: "Checklist Tasks",
    historyTitle: "Checklist Task History",
    description: "Showing today's tasks and past due tasks",
    historyDescription: "Read-only view of completed tasks with submission history (excluding admin-processed items)",
  },
  maintenance: {
    title: "Maintenance Tasks",
    historyTitle: "Maintenance Task History",
    description: "Showing today's maintenance items and past due tasks",
    historyDescription: "Read-only view of completed maintenance tasks with submission history",
  }
}

function AccountDataPage() {


  const [accountData, setAccountData] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // Filter for Today/Overdue/Upcoming
  const [frequencyFilter, setFrequencyFilter] = useState("all") // Filter for Frequency
  const [nameFilter, setNameFilter] = useState("all") // Filter for Name
  const [nameDropdownOpen, setNameDropdownOpen] = useState(false)
  const [nameSearchTerm, setNameSearchTerm] = useState("")
  const nameDropdownRef = useRef(null)
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [divisionDropdownOpen, setDivisionDropdownOpen] = useState(false)
  const [divisionSearchTerm, setDivisionSearchTerm] = useState("")
  const divisionDropdownRef = useRef(null)
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false)
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("")
  const departmentDropdownRef = useRef(null)
  const [error, setError] = useState(null)
  const [remarksData, setRemarksData] = useState({})
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [userDept, setUserDept] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState('checklist');

  const { checklist, loading, history, hasMore, currentPage, uniqueDivisions, uniqueDepartments } = useSelector((state) => state.checkList);
  const { maintenance, loading: maintLoading, hasMore: maintHasMore, currentPage: maintCurrentPage } = useSelector((state) => state.maintenance);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const tableContainerRef = useRef(null);
  const historyTableContainerRef = useRef(null);

  // Maintenance specific
  const [maintSelectedItems, setMaintSelectedItems] = useState(new Set());
  const [maintAdditionalData, setMaintAdditionalData] = useState({});
  const [maintRemarksData, setMaintRemarksData] = useState({});
  const [maintUploadedImages, setMaintUploadedImages] = useState({});
  const [expandedPartNames, setExpandedPartNames] = useState({});
  const maintTableContainerRef = useRef(null);

  const { doerName } = useSelector((state) => state.assignTask)

  // Track search for API calls
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Sentinel for infinite scroll
  const loaderRef = useRef(null);

  // Debounce search term update
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Initial data load - Reset all
  useEffect(() => {
    dispatch(uniqueDoerNameData());
    dispatch(checklistMetadata());

    const view = searchParams.get('view');
    if (view === 'maintenance') {
      setActiveView('maintenance');
    }
  }, [dispatch, searchParams])

  // Re-fetch data when filters or search change
  useEffect(() => {
    const filters = {
      page: 1,
      search: debouncedSearch,
      status: statusFilter,
      frequency: frequencyFilter,
      name: nameFilter,
      division: divisionFilter,
      departmentFilter: departmentFilter
    };

    if (activeView === 'checklist') {
      dispatch(checklistData(filters));
    } else {
      dispatch(maintenanceData(filters));
    }
  }, [debouncedSearch, activeView, statusFilter, frequencyFilter, nameFilter, divisionFilter, departmentFilter, dispatch]);

  // Infinite Scroll Observer
  useEffect(() => {
    const currentLoader = loaderRef.current;
    if (!currentLoader) return;

    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        if (activeView === 'checklist' && hasMore && !loading) {
          dispatch(checklistData({
            page: currentPage + 1,
            search: debouncedSearch,
            status: statusFilter,
            frequency: frequencyFilter,
            name: nameFilter,
            division: divisionFilter,
            departmentFilter: departmentFilter
          }));
        } else if (activeView === 'maintenance' && maintHasMore && !maintLoading) {
          dispatch(maintenanceData({
            page: maintCurrentPage + 1,
            search: debouncedSearch,
            status: statusFilter,
            frequency: frequencyFilter,
            name: nameFilter,
            division: divisionFilter,
            departmentFilter: departmentFilter
          }));
        }
      }
    }, { threshold: 0.1 });

    observer.observe(currentLoader);
    return () => observer.disconnect();
  }, [
    activeView, hasMore, loading, currentPage, 
    maintHasMore, maintLoading, maintCurrentPage,
    debouncedSearch, statusFilter, frequencyFilter, nameFilter, divisionFilter, departmentFilter,
    dispatch
  ]);

  useEffect(() => {
    if (activeView === 'maintenance' && maintenance?.length === 0) {
      dispatch(maintenanceData({ page: 1, search: debouncedSearch }));
    }
  }, [activeView, dispatch, maintenance?.length, debouncedSearch]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close name dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (nameDropdownRef.current && !nameDropdownRef.current.contains(e.target)) {
        setNameDropdownOpen(false);
        setNameSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close division dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (divisionDropdownRef.current && !divisionDropdownRef.current.contains(e.target)) {
        setDivisionDropdownOpen(false);
        setDivisionSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close department dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target)) {
        setDepartmentDropdownOpen(false);
        setDepartmentSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Removed infinite scroll and pagination state handlers since all tasks render on a single page.

  // NEW: Admin history selection states
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([])
  const [markingAsDone, setMarkingAsDone] = useState(false)

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    itemCount: 0,
  })
  const [adminRemarks, setAdminRemarks] = useState({}) // New state for admin remarks

  // UPDATED: Format date-time to DD/MM/YYYY HH:MM:SS
  const formatDateTimeToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const seconds = date.getSeconds().toString().padStart(2, "0")
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  // UPDATED: Format date only to DD/MM/YYYY (for comparison purposes)
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isEmpty = (value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }

  useEffect(() => {
    const role = localStorage.getItem("role")
    const user = localStorage.getItem("username") || localStorage.getItem("user-name")
    const dept = localStorage.getItem("department")
    setUserRole(role || "")
    setUsername(user || "")
    setUserDept(dept || "")
  }, [])

  // Load initial history data when showing history
  useEffect(() => {
    if (showHistory && history.length === 0) {
      dispatch(checklistHistoryData(1))
        .then((result) => {
          if (result.payload && result.payload.length < 50) {
            setHasMoreHistory(false)
          }
        })
    }
  }, [showHistory, history.length, dispatch])

  // UPDATED: Parse Google Sheets date-time to handle DD/MM/YYYY HH:MM:SS format
  const parseGoogleSheetsDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return ""
    // If already in DD/MM/YYYY HH:MM:SS format, return as is
    if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
      return dateTimeStr
    }
    // If in DD/MM/YYYY format (without time), return as is
    if (typeof dateTimeStr === "string" && dateTimeStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateTimeStr
    }
    // Handle Google Sheets Date(year,month,day) format
    if (typeof dateTimeStr === "string" && dateTimeStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateTimeStr)
      if (match) {
        const year = Number.parseInt(match[1], 10)
        const month = Number.parseInt(match[2], 10)
        const day = Number.parseInt(match[3], 10)
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
    }
    // Try to parse as a regular date
    try {
      const date = new Date(dateTimeStr)
      if (!isNaN(date.getTime())) {
        // Check if the original string contained time information
        if (typeof dateTimeStr === "string" && (dateTimeStr.includes(":") || dateTimeStr.includes("T"))) {
          return formatDateTimeToDDMMYYYY(date)
        } else {
          return formatDateToDDMMYYYY(date)
        }
      }
    } catch (error) {
      console.error("Error parsing date-time:", error)
    }
    return dateTimeStr
  }

  // UPDATED: Parse date from DD/MM/YYYY or DD/MM/YYYY HH:MM:SS format for comparison
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;

    const [datePart] = dateStr.split(" ");
    const parts = datePart.split("/");

    if (parts.length !== 3) return null;

    return new Date(parts[2], parts[1] - 1, parts[0]); // yyyy, mm (0-indexed), dd
  };



  const sortDateWise = (a, b) => {
    // For current data structure, use task_start_date instead of col6
    const dateStrA = a.task_start_date || ""
    const dateStrB = b.task_start_date || ""

    const dateA = new Date(dateStrA)
    const dateB = new Date(dateStrB)

    if (!dateA || isNaN(dateA.getTime())) return 1
    if (!dateB || isNaN(dateB.getTime())) return -1

    return dateA.getTime() - dateB.getTime()
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
    setNameFilter("all")
  }

  // NEW: Admin functions for history management
  const handleMarkMultipleDone = async () => {
    if (selectedHistoryItems.length === 0) {
      return
    }
    if (markingAsDone) return

    // Open confirmation modal
    setConfirmationModal({
      isOpen: true,
      itemCount: selectedHistoryItems.length,
    })
  }

  // NEW: Confirmation modal component
  const ConfirmationModal = ({ isOpen, itemCount, onConfirm, onCancel }) => {
    if (!isOpen) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-yellow-100 text-yellow-600 rounded-full p-3 mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Mark Items as Done</h2>
          </div>

          <p className="text-gray-600 text-center mb-6 text-sm sm:text-base">
            Are you sure you want to mark {itemCount} {itemCount === 1 ? "item" : "items"} as done?
          </p>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  const parseSupabaseDate = (dateStr) => {
    if (!dateStr) return null;

    // Handle ISO string from Supabase
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return new Date(dateStr);
    }

    // Handle already parsed Date objects
    if (dateStr instanceof Date) {
      return dateStr;
    }

    // Fallback for other formats
    return new Date(dateStr);
  };

  // UPDATED: Confirmation handler - Don't remove items from UI, just update their status
  const confirmMarkDone = async () => {
    setConfirmationModal({ isOpen: false, itemCount: 0 });
    setMarkingAsDone(true);
    try {
      const payload = selectedHistoryItems.map(item => ({
        task_id: item.task_id,
        remarks: adminRemarks[item.task_id] || ""
      }))
      const { data, error } = await postChecklistAdminDoneAPI(payload);

      if (error) {
        throw new Error(error.message || "Failed to mark items as done");
      }

      // Clear selected items
      setSelectedHistoryItems([]);
      setAdminRemarks({}); // Clear remarks

      // Refresh data
      dispatch(checklistHistoryData());

      setSuccessMessage(
        `Successfully marked ${selectedHistoryItems.length} items as admin processed!`
      );
    } catch (error) {
      console.error("Error marking tasks as done:", error);
      setSuccessMessage(`Failed to mark tasks as done: ${error.message}`);
    } finally {
      setMarkingAsDone(false);
    }
  };

  // NEW: Handle sending email notification for selected history items
  const handleSendEmailNotification = async () => {
    if (selectedHistoryItems.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await sendEmailNotificationAPI(selectedHistoryItems);
      
      if (error) {
        throw new Error(error.message || "Failed to send email notifications");
      }
      
      setSuccessMessage(`Successfully sent email notifications to ${selectedHistoryItems.length} users!`);
    } catch (err) {
      console.error("Error sending email:", err);
      setError(err.message || "Failed to send email notifications");
    } finally {
      setIsSubmitting(false);
    }
  };

  // With backend filtering and infinite scroll, we use Redux data directly
  const filteredAccountData = useMemo(() => {
    return checklist || [];
  }, [checklist]);

  const filteredMaintenanceData = useMemo(() => {
    return maintenance || [];
  }, [maintenance]);

  // Filter options are now fetched from the backend on mount and stored in Redux

  // Helper function to determine task status (Today, Upcoming, Overdue)
  const getTaskStatus = (taskStartDate) => {
    if (!taskStartDate) return 'unknown';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const taskDate = new Date(taskStartDate);
    taskDate.setHours(0, 0, 0, 0);
    
    if (isNaN(taskDate.getTime())) return 'unknown';
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'upcoming';
  };

  // Check if checkbox should be enabled (only for today and overdue tasks)
  const isCheckboxEnabled = (taskStartDate) => {
    const status = getTaskStatus(taskStartDate);
    return status === 'today' || status === 'overdue';
  };

  const filteredHistoryData = useMemo(() => {
    if (!Array.isArray(history)) return []

    const filtered = history
      .filter((item) => {
        // Search filter
        const matchesSearch = searchTerm
          ? Object.entries(item).some(([key, value]) => {
            if (['image', 'admin_done'].includes(key)) return false
            return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
          })
          : true

        // Member filter
        const matchesMember = selectedMembers.length > 0
          ? selectedMembers.includes(item.name)
          : true

        // Date range filter
        let matchesDateRange = true

        if (startDate || endDate) {
          const itemDate = parseSupabaseDate(item.task_start_date)
          if (!itemDate || isNaN(itemDate.getTime())) return false

          // Normalize to start of day for comparison
          const itemDateOnly = new Date(
            itemDate.getFullYear(),
            itemDate.getMonth(),
            itemDate.getDate()
          )

          // Create comparison dates
          const start = startDate ? new Date(startDate) : null
          if (start) start.setHours(0, 0, 0, 0)

          const end = endDate ? new Date(endDate) : null
          if (end) {
            end.setHours(23, 59, 59, 999) // End of day
          }

          // Compare dates
          if (start && itemDateOnly < start) matchesDateRange = false
          if (end && itemDateOnly > end) matchesDateRange = false
        }        return matchesSearch && matchesMember && matchesDateRange
      })
      .sort((a, b) => {
        const dateA = parseSupabaseDate(a.task_start_date)
        const dateB = parseSupabaseDate(b.task_start_date)
        return dateB - dateA // Sort newest first
      });
      
    return filtered; // Return all data so UI pagination works
  }, [history, searchTerm, selectedMembers, startDate, endDate, userRole, userDept])


  const getTaskStatistics = () => {
    const totalCompleted = history.length
    const memberStats =
      selectedMembers.length > 0
        ? selectedMembers.reduce((stats, member) => {
          const memberTasks = history.filter((task) => task.name === member).length
          return {
            ...stats,
            [member]: memberTasks,
          }
        }, {})
        : {}
    const filteredTotal = filteredHistoryData.length
    return {
      totalCompleted,
      memberStats,
      filteredTotal,
    }
  }

  const handleMemberSelection = (member) => {
    setSelectedMembers((prev) => {
      if (prev.includes(member)) {
        return prev.filter((item) => item !== member)
      } else {
        return [...prev, member]
      }
    })
  }

  const getFilteredMembersList = () => {
    if ((userRole === "admin" || userRole === "div_admin")) {
      return doerName
    } else {
      return doerName.filter((member) => (member?.user_name || member).toLowerCase() === username.toLowerCase())
    }
  }


  // Checkbox handlers with better state management
  const handleSelectItem = useCallback((id, isChecked) => {
    console.log(`Checkbox action: ${id} -> ${isChecked}`)
    setSelectedItems((prev) => {
      const newSelected = new Set(prev)
      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        // Clean up related data when unchecking
        setAdditionalData((prevData) => {
          const newAdditionalData = { ...prevData }
          delete newAdditionalData[id]
          return newAdditionalData
        })
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks }
          delete newRemarksData[id]
          return newRemarksData
        })
      }
      console.log(`Updated selection: ${Array.from(newSelected)}`)
      return newSelected
    })
    // Auto-set status to "Yes" when checkbox is checked
    if (isChecked) {
      setAdditionalData((prev) => ({ ...prev, [id]: "Yes" }))
    }
  }, [])

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation()
      const isChecked = e.target.checked
      console.log(`Checkbox clicked: ${id}, checked: ${isChecked}`)
      handleSelectItem(id, isChecked)
    },
    [handleSelectItem],
  )

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation()
      const checked = e.target.checked
      console.log(`Select all clicked: ${checked}`)
      if (checked) {
        const allIds = filteredAccountData.map((item) => item.task_id)
        setSelectedItems(new Set(allIds))
        // Auto-set status to "Yes" for all items
        setAdditionalData((prev) => {
          const updated = { ...prev }
          allIds.forEach((id) => { updated[id] = "Yes" })
          return updated
        })
        console.log(`Selected all items: ${allIds}`)
      } else {
        setSelectedItems(new Set())
        setAdditionalData({})
        setRemarksData({})
        console.log("Cleared all selections")
      }
    },
    [filteredAccountData],
  )

  const [uploadedImages, setUploadedImages] = useState({});
  const [hasMoreHistory, setHasMoreHistory] = useState(true)

  // Update the handleImageUpload function
  const handleImageUpload = async (id, e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    setUploadedImages(prev => {
      const existingFiles = prev[id] || [];
      const totalCount = existingFiles.length + newFiles.length;
      
      if (totalCount > 5) {
        alert("Maximum 5 files allowed per task.");
        return prev;
      }

      const fileDataArray = newFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      const mergedFiles = [...existingFiles, ...fileDataArray];

      // Also update the accountData if needed
      setAccountData(currentAcc => 
        currentAcc.map(item => 
          item.task_id === id ? { ...item, image: mergedFiles.map(f => f.file) } : item
        )
      );

      return {
        ...prev,
        [id]: mergedFiles
      };
    });
  };

  // Maintenance Handlers
  const handleMaintCheckboxClick = (e, id) => {
    e.stopPropagation()
    const isChecked = e.target.checked
    setMaintSelectedItems((prev) => {
      const newSelected = new Set(prev)
      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        setMaintAdditionalData(prev => { const d = {...prev}; delete d[id]; return d; })
        setMaintRemarksData(prev => { const d = {...prev}; delete d[id]; return d; })
      }
      return newSelected
    })
    if (isChecked) {
      setMaintAdditionalData(prev => ({ ...prev, [id]: "Yes" }))
    }
  }

  const handleMaintImageUpload = (id, e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;
    
    setMaintUploadedImages(prev => {
      const existingFiles = prev[id] || [];
      const totalCount = existingFiles.length + newFiles.length;
      
      if (totalCount > 5) {
        alert("Maximum 5 files allowed per task.");
        return prev;
      }

      const fileDataArray = newFiles.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      return {
        ...prev,
        [id]: [...existingFiles, ...fileDataArray]
      };
    });
  };

  const togglePartName = (taskId) => {
    setExpandedPartNames((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleMaintSubmit = async () => {
    const selected = Array.from(maintSelectedItems);
    if (selected.length === 0) return;

    setIsSubmitting(true);

    try {
      const submissionData = await Promise.all(
        selected.map(async (id) => {
          const item = maintenance.find((m) => m.task_id === id);
          const imageDataArray = maintUploadedImages[id];
          let finalBase64Images = [];

          if (imageDataArray && Array.isArray(imageDataArray)) {
            finalBase64Images = await Promise.all(
              imageDataArray.map(data => fileToBase64(data.file))
            );
          }

          return {
            taskId: item.task_id,
            status: maintAdditionalData[id] || "",
            remarks: maintRemarksData[id] || "",
            images: finalBase64Images.length > 0 ? finalBase64Images : (item.image ? [item.image] : []),
          };
        })
      );

      await dispatch(updateMaintenance(submissionData));
      
      setSuccessMessage(`Successfully logged ${selected.length} maintenance task records!`);
      setMaintSelectedItems(new Set());
      setMaintAdditionalData({});
      setMaintRemarksData({});
      setMaintUploadedImages({});
      
      // Refresh maintenance list
      setTimeout(() => {
        dispatch(maintenanceData({ page: 1, search: debouncedSearch }));
      }, 1000);

    } catch (e) {
      console.error(e);
      alert('Failed to submit maintenance tasks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMaintNotification = async () => {
    const selected = Array.from(maintSelectedItems);
    if (selected.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const selectedTasks = selected.map(id => maintenance.find(m => m.task_id === id)).filter(Boolean);
      const { data, error } = await sendMaintenanceNotificationAPI(selectedTasks);
      
      if (error) {
        throw new Error(error.message || "Failed to send notifications");
      }
      
      setSuccessMessage(`Successfully sent notifications to ${selected.length} users!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error sending notification:", err);
      setSuccessMessage(`Failed to send notifications: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};


  const toggleHistory = () => {
    setShowHistory((prev) => !prev)
    resetFilters()
  }






  // UPDATED: MAIN SUBMIT FUNCTION with date-time formatting
const handleSubmit = async () => {
  // Permission guard: view-only users cannot submit
  if (!hasModifyAccess('pending_task')) {
    alert('You have view-only access and cannot submit tasks.');
    return;
  }
  const selectedItemsArray = Array.from(selectedItems);
  if (selectedItemsArray.length === 0) {
    alert("Please select at least one item to submit");
    return;
  }

  // NEW: Check if all selected items have status selected
  const missingStatus = selectedItemsArray.filter((id) => {
    const status = additionalData[id];
    return !status || status === ""; 
  });

  if (missingStatus.length > 0) {
    alert(`Please select status (Yes/No) for all selected tasks.`);
    return;
  }

  // Check remarks for "No"
  const missingRemarks = selectedItemsArray.filter((id) => {
    const additionalStatus = additionalData[id];
    const remarks = remarksData[id];
    return additionalStatus === "No" && (!remarks || remarks.trim() === "");
  });

  if (missingRemarks.length > 0) {
    alert(`Please provide remarks for items marked as "No".`);
    return;
  }

  // Required images
  const missingRequiredImages = selectedItemsArray.filter((id) => {
    const item = checklist.find((acc) => acc.task_id === id);
    const requiresAttachment = item.require_attachment?.toUpperCase() === "YES";
    const hasImage = uploadedImages[id] || item.image;
    const statusIsNo = additionalData[id] === "No";

    return requiresAttachment && !hasImage && !statusIsNo;
  });

  if (missingRequiredImages.length > 0) {
    alert(`Please upload images for all required attachments.`);
    return;
  }

  setIsSubmitting(true);

    // 🔥 FIXED: Convert image to BASE64
    const submissionData = await Promise.all(
      selectedItemsArray.map(async (id) => {
        const item = checklist.find((acc) => acc.task_id === id);
        const imageDataArray = uploadedImages[id];

        let finalBase64Images = [];

        if (imageDataArray && Array.isArray(imageDataArray)) {
          finalBase64Images = await Promise.all(
            imageDataArray.map(data => fileToBase64(data.file))
          );
        }

        return {
          taskId: item.task_id,
          status: additionalData[id] || "",
          remarks: remarksData[id] || "",
          images: finalBase64Images.length > 0 ? finalBase64Images : (item.image ? [item.image] : []), // <– yahi backend ko milega
        };
      })
    );

    console.log("Submission Data:", submissionData);

    await dispatch(updateChecklist(submissionData));

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(
        `Successfully logged ${selectedItemsArray.length} task records!`
      );

      // Reset
      setSelectedItems(new Set());
      setAdditionalData({});
      setRemarksData({});
      setUploadedImages({});

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }, 1500);
  };


  // Convert Set to Array for display
  const selectedItemsCount = selectedItems.size

  return (
    <AdminLayout>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Main Title hidden on mobile to prioritize card header */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-purple-700 hidden sm:block">
            {showHistory ? CONFIG[activeView].historyTitle : CONFIG[activeView].title}
          </h1>
            
            {/* Checklist / Maintenance Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              {canAccessModule("checklist") && (
                <button
                  onClick={() => setActiveView('checklist')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'checklist' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Checklist
                </button>
              )}
              {canAccessModule("maintenance") && (
                <button
                  onClick={() => setActiveView('maintenance')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'maintenance' 
                      ? 'bg-white text-purple-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Maintenance
                </button>
              )}
            </div>
          </div>
          {/* Row 1: Search + Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400" size={18} />
              </div>
              <input
                type="text"
                placeholder={showHistory ? "Search history..." : "Search tasks..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {userRole === "super_admin" && (
                <button
                  onClick={() => navigate('/dashboard/history')}
                  className="flex-1 sm:flex-none rounded-md gradient-bg py-2 px-3 sm:px-4 text-white hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base"
                >
                  <div className="flex items-center justify-center">
                    <History className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View History</span>
                    <span className="sm:hidden">History</span>
                  </div>
                </button>
              )}
              {!showHistory && (userRole === "user" || userRole === "admin" || userRole === "div_admin" || userRole === "super_admin") && hasModifyAccess('pending_task') && (
                <div className="flex gap-2">
                  {activeView === 'maintenance' && (userRole === "admin" || userRole === "div_admin" || userRole === "super_admin") && maintSelectedItems.size > 0 && (
                    <button
                      onClick={handleSendMaintNotification}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none rounded-md bg-blue-600 py-2 px-3 sm:px-4 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2 font-bold shadow-md shadow-blue-100 group"
                    >
                      <Bell className={`h-4 w-4 ${isSubmitting ? 'animate-bounce' : 'group-hover:animate-ring'}`} />
                      <span className="hidden sm:inline">Notify ({maintSelectedItems.size})</span>
                      <span className="sm:hidden">Notify ({maintSelectedItems.size})</span>
                    </button>
                  )}
                  <button
                    onClick={activeView === 'checklist' ? handleSubmit : handleMaintSubmit}
                    disabled={(activeView === 'checklist' ? selectedItemsCount === 0 : maintSelectedItems.size === 0) || isSubmitting}
                    className="flex-1 sm:flex-none rounded-md gradient-bg py-2 px-3 sm:px-4 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isSubmitting ? "Processing..." : (
                      <>
                        <span className="hidden sm:inline">Submit Selected ({activeView === 'checklist' ? selectedItemsCount : maintSelectedItems.size})</span>
                        <span className="sm:hidden">Submit ({activeView === 'checklist' ? selectedItemsCount : maintSelectedItems.size})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: All Filter Dropdowns */}
          {!showHistory && (
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-1">
              {/* Name searchable dropdown */}
              <div className="relative w-full sm:w-auto" ref={nameDropdownRef}>
                <button
                  type="button"
                  onClick={() => setNameDropdownOpen(!nameDropdownOpen)}
                  className="px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white w-full sm:min-w-[140px] text-left flex items-center justify-between gap-2 shadow-sm"
                >
                  <span className="truncate">{nameFilter === 'all' ? 'All Names' : nameFilter}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${nameDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {nameDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" placeholder="Search name..." value={nameSearchTerm} onChange={(e) => setNameSearchTerm(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button type="button" onClick={() => { setNameFilter('all'); setNameDropdownOpen(false); setNameSearchTerm(''); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${nameFilter === 'all' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}>All Names</button>
                      {doerName && doerName
                        .filter(name => (name?.user_name || name).toLowerCase().includes(nameSearchTerm.toLowerCase()))
                        .map((name, index) => {
                          const displayName = name?.user_name || name;
                          return (
                            <button 
                              type="button" 
                              key={index} 
                              onClick={() => { setNameFilter(displayName); setNameDropdownOpen(false); setNameSearchTerm(''); }} 
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${nameFilter === displayName ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}
                            >
                              {displayName}
                            </button>
                          );
                        })
                      }
                    </div>
                  </div>
                )}
              </div>
              {/* Division searchable dropdown */}
              <div className="relative w-full sm:w-auto" ref={divisionDropdownRef}>
                <button
                  type="button"
                  onClick={() => setDivisionDropdownOpen(!divisionDropdownOpen)}
                  className="px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white w-full sm:min-w-[140px] text-left flex items-center justify-between gap-2 shadow-sm"
                >
                  <span className="truncate">{divisionFilter === 'all' ? 'All Divisions' : divisionFilter}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${divisionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {divisionDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" placeholder="Search division..." value={divisionSearchTerm} onChange={(e) => setDivisionSearchTerm(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button type="button" onClick={() => { setDivisionFilter('all'); setDivisionDropdownOpen(false); setDivisionSearchTerm(''); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${divisionFilter === 'all' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}>All Divisions</button>
                      {uniqueDivisions.filter(d => d.toLowerCase().includes(divisionSearchTerm.toLowerCase())).map((div, index) => (
                        <button type="button" key={index} onClick={() => { setDivisionFilter(div); setDivisionDropdownOpen(false); setDivisionSearchTerm(''); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${divisionFilter === div ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}>{div}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Department searchable dropdown */}
              <div className="relative w-full sm:w-auto" ref={departmentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setDepartmentDropdownOpen(!departmentDropdownOpen)}
                  className="px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white w-full sm:min-w-[140px] text-left flex items-center justify-between gap-2 shadow-sm"
                >
                  <span className="truncate">{departmentFilter === 'all' ? 'All Departments' : departmentFilter}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${departmentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {departmentDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full sm:w-64 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div className="p-2 border-b border-gray-100">
                      <input type="text" placeholder="Search department..." value={departmentSearchTerm} onChange={(e) => setDepartmentSearchTerm(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" autoFocus />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button type="button" onClick={() => { setDepartmentFilter('all'); setDepartmentDropdownOpen(false); setDepartmentSearchTerm(''); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${departmentFilter === 'all' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}>All Departments</button>
                      {uniqueDepartments.filter(d => d.toLowerCase().includes(departmentSearchTerm.toLowerCase())).map((dept, index) => (
                        <button type="button" key={index} onClick={() => { setDepartmentFilter(dept); setDepartmentDropdownOpen(false); setDepartmentSearchTerm(''); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${departmentFilter === dept ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-700'}`}>{dept}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Status filter */}
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white w-full sm:w-auto shadow-sm">
                <option value="all">All Tasks</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Upcoming</option>
              </select>
              {/* Frequency filter */}
              <select value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)} className="col-span-2 sm:col-auto px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white w-full sm:w-auto shadow-sm">
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

            {/* Admin Submit Button for History View */}
            {showHistory && (userRole === "admin" || userRole === "div_admin") && selectedHistoryItems.length > 0 && (
              <div className="fixed bottom-4 right-4 sm:top-40 sm:bottom-auto sm:right-10 z-50">
                <button
                  onClick={handleMarkMultipleDone}
                  disabled={markingAsDone}
                  className="rounded-md bg-green-600 text-white px-3 sm:px-4 py-2 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base mr-2"
                >
                  {markingAsDone ? "Processing..." : (
                    <>
                      <span className="hidden sm:inline">Mark {selectedHistoryItems.length} Items as Done</span>
                      <span className="sm:hidden">Mark Done ({selectedHistoryItems.length})</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendEmailNotification}
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 text-white px-3 sm:px-4 py-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
                >
                  {isSubmitting ? "Sending..." : (
                    <>
                      <span className="hidden sm:inline">Send Email Notification ({selectedHistoryItems.length})</span>
                      <span className="sm:hidden">Send Email ({selectedHistoryItems.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 rounded-md flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500 flex-shrink-0" />
              <span className="break-words">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700 ml-2 flex-shrink-0">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4">
            <h2 className="text-purple-700 font-medium text-sm sm:text-base">
              {showHistory ? `Completed ${activeView === 'maintenance' ? 'Maintenance' : 'Checklist'} Tasks` : activeView === 'maintenance' ? `Pending Maintenance Tasks` : `Pending Checklist Tasks`}
            </h2>
            <p className="text-purple-600 text-xs sm:text-sm mt-1">
              {showHistory
                ? `${CONFIG[activeView].historyDescription} for ${(userRole === "admin" || userRole === "div_admin") ? "all" : "your"} tasks`
                : CONFIG[activeView].description}
            </p>
          </div>

          {loading && currentPage === 1 ? (
            // Full table loading for initial load
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600 text-sm sm:text-base">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center text-sm sm:text-base">
              {error}{" "}
              <button className="underline ml-2" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : showHistory ? (
            <>
              {/* History Filters */}
              <div className="p-3 sm:p-4 border-b border-purple-100 bg-gray-50">
                <div className="flex flex-col gap-3 sm:gap-4">
                  {getFilteredMembersList().length > 0 && (
                    <div className="flex flex-col">
                      <div className="mb-2 flex items-center">
                        <span className="text-xs sm:text-sm font-medium text-purple-700">Filter by Member:</span>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                        {getFilteredMembersList().map((member, idx) => (
                          <div key={idx} className="flex items-center">
                            <input
                              id={`member-${idx}`}
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              checked={selectedMembers.includes(member)}
                              onChange={() => handleMemberSelection(member)}
                            />
                            <label htmlFor={`member-${idx}`} className="ml-2 text-xs sm:text-sm text-gray-700">
                              {member}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center">
                      <span className="text-xs sm:text-sm font-medium text-purple-700">Filter by Date Range:</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex items-center w-full sm:w-auto">
                        <label htmlFor="start-date" className="text-xs sm:text-sm text-gray-700 mr-1 whitespace-nowrap">
                          From
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                          }}
                          className="text-xs sm:text-sm border border-gray-200 rounded-md p-1 flex-1 sm:flex-none"
                        />
                      </div>
                      <div className="flex items-center w-full sm:w-auto">
                        <label htmlFor="end-date" className="text-xs sm:text-sm text-gray-700 mr-1 whitespace-nowrap">
                          To
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                          }}
                          className="text-xs sm:text-sm border border-gray-200 rounded-md p-1 flex-1 sm:flex-none"
                        />
                      </div>
                    </div>
                  </div>
                  {(selectedMembers.length > 0 || startDate || endDate || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>

              {/* NEW: Confirmation Modal */}
              <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                itemCount={confirmationModal.itemCount}
                onConfirm={confirmMarkDone}
                onCancel={() => setConfirmationModal({ isOpen: false, itemCount: 0 })}
              />

              {/* Task Statistics */}
              <div className="p-3 sm:p-4 border-b border-purple-100 bg-blue-50">
                <div className="flex flex-col">
                  <h3 className="text-xs sm:text-sm font-medium text-blue-700 mb-2">Task Completion Statistics:</h3>
                  <div className="flex flex-wrap gap-2 sm:gap-4">
                    <div className="px-2 sm:px-3 py-2 bg-white rounded-md shadow-sm">
                      <span className="text-xs text-gray-500">Total Completed</span>
                      <div className="text-base sm:text-lg font-semibold text-blue-600">{getTaskStatistics().totalCompleted}</div>
                    </div>
                    {(selectedMembers.length > 0 || startDate || endDate || searchTerm) && (
                      <div className="px-2 sm:px-3 py-2 bg-white rounded-md shadow-sm">
                        <span className="text-xs text-gray-500">Filtered Results</span>
                        <div className="text-base sm:text-lg font-semibold text-blue-600">{getTaskStatistics().filteredTotal}</div>
                      </div>
                    )}
                    {selectedMembers.map((member) => (
                      <div key={member} className="px-2 sm:px-3 py-2 bg-white rounded-md shadow-sm">
                        <span className="text-xs text-gray-500">{member}</span>
                        <div className="text-base sm:text-lg font-semibold text-indigo-600">
                          {getTaskStatistics().memberStats[member]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* History Table - Mobile Responsive */}
              <div ref={historyTableContainerRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                {loading && currentPage === 1 ? (
                  <div className="text-center py-10">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-purple-600 text-sm sm:text-base">Loading history data...</p>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Task ID
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Department
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Unit
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Division
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Given By
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Name
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                            Task Description
                          </th>
                          {(userRole === "admin" || userRole === "div_admin") && (
                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 whitespace-nowrap">
                              Admin Remarks
                            </th>
                          )}
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50 whitespace-nowrap">
                            Task End Date
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Freq
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Reminders
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Attachment
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 whitespace-nowrap">
                            Actual Date
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 whitespace-nowrap">
                            Status
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 min-w-[120px]">
                            Remarks
                          </th>
                          <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            File
                          </th>

                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredHistoryData.length > 0 ? (
                          filteredHistoryData.map((history, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                                  {history.task_id || "—"}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.department || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.unit || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.division || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.given_by || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.name || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[150px]">
                                <div className="text-xs sm:text-sm text-gray-900 break-words" title={history.task_description}>
                                  {history.task_description || "—"}
                                </div>
                              </td>
                              {(userRole === "admin" || userRole === "div_admin") && (
                                <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50">
                                  {history.admin_done !== 'Done' ? (
                                    <input
                                      type="text"
                                      placeholder="Add remark..."
                                      value={adminRemarks[history.task_id] || ""}
                                      onChange={(e) => setAdminRemarks(prev => ({
                                        ...prev,
                                        [history.task_id]: e.target.value
                                      }))}
                                      className="w-full text-xs p-1 border border-gray-300 rounded"
                                    />
                                  ) : (
                                    <div className="text-xs text-gray-600 break-words">{history.admin_done_remarks || "—"}</div>
                                  )}
                                </td>
                              )}
                              <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">
                                  {history.task_start_date || "—"}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.frequency || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.enable_reminder || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">{history.require_attachment || "—"}</div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50">
                                <div className="text-xs sm:text-sm text-gray-900 break-words">
                                  {history.submission_date ? (() => {
                                    const dateObj = new Date(history.submission_date);
                                    const day = ("0" + dateObj.getDate()).slice(-2);
                                    const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
                                    const year = dateObj.getFullYear();
                                    const hours = ("0" + dateObj.getHours()).slice(-2);
                                    const minutes = ("0" + dateObj.getMinutes()).slice(-2);
                                    const seconds = ("0" + dateObj.getSeconds()).slice(-2);

                                    return (
                                      <div>
                                        <div className="font-medium break-words">
                                          {`${day}/${month}/${year}`}
                                        </div>
                                        <div className="text-xs text-gray-500 break-words">
                                          {`${hours}:${minutes}:${seconds}`}
                                        </div>
                                      </div>
                                    );
                                  })() : "—"}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4 bg-blue-50">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full break-words ${history.status === "Yes"
                                    ? "bg-green-100 text-green-800"
                                    : history.status === "No"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                  {history.status || "—"}
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50 min-w-[120px]">
                                <div className="text-xs sm:text-sm text-gray-900 break-words" title={history.remark}>
                                  {history.remark || "—"}
                                </div>
                              </td>
                              <td className="px-2 sm:px-3 py-2 sm:py-4">
                                {history.image ? (
                                  <div className="flex flex-col gap-1">
                                    {history.image.split(',').map((imgUrl, i) => (
                                      <a
                                        key={i}
                                        href={imgUrl.trim()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline flex items-center break-words text-xs sm:text-sm"
                                      >
                                        <span className="break-words">View {i + 1}</span>
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs sm:text-sm">No files</span>
                                )}
                              </td>

                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={(userRole === "admin" || userRole === "div_admin") ? 17 : 15} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                              {searchTerm || selectedMembers.length > 0 || startDate || endDate
                                ? "No historical records matching your filters"
                                : "No completed records found"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination Controls Array History */}
                    {hasMoreHistory && (
                      <div ref={loaderRef} className="h-10 flex items-center justify-center bg-gray-50 border-t border-gray-100">
                        {loading && (
                          <div className="flex items-center gap-2 text-purple-600 animate-pulse">
                            <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                            <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-200"></div>
                            <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-400"></div>
                            <span className="text-xs font-medium ml-1">Loading more history...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : activeView === 'maintenance' ? (
            <div
              ref={maintTableContainerRef}
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              {/* Mobile Card View for Maintenance */}
              <div className="lg:hidden space-y-3 p-3">
                {/* Mobile Select All for Maintenance */}
                {(userRole === "user" || userRole === "admin" || userRole === "div_admin" || userRole === "super_admin") && filteredMaintenanceData.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={filteredMaintenanceData.length > 0 && filteredMaintenanceData.every(item => maintSelectedItems.has(item.task_id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMaintSelectedItems(new Set(filteredMaintenanceData.map(item => item.task_id)));
                          setMaintAdditionalData(prev => {
                            const updated = { ...prev };
                            filteredMaintenanceData.forEach(item => { updated[item.task_id] = "Yes" });
                            return updated;
                          });
                        } else {
                          setMaintSelectedItems(new Set());
                          setMaintAdditionalData({});
                          setMaintRemarksData({});
                        }
                      }}
                    />
                    <span className="text-xs font-medium text-purple-700">Select All ({filteredMaintenanceData.length})</span>
                  </div>
                )}
                {filteredMaintenanceData.length > 0 ? (
                  filteredMaintenanceData.map((item, index) => {
                    // Skip items with no description (potential header rows or corrupt data)
                    if (!item.task_description && !item.task_id) return null;

                    const isSelected = maintSelectedItems.has(item.task_id);
                    const taskStatus = getTaskStatus(item.task_start_date || item.planned_date);
                    return (
                      <div key={index} className={`bg-white border rounded-lg p-3 shadow-sm ${taskStatus === 'upcoming' ? "border-blue-300 bg-blue-50" : taskStatus === 'overdue' ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                              <input
                                type="checkbox"
                                className={`h-4 w-4 rounded border-gray-300 text-purple-600`}
                                checked={isSelected}
                                onChange={(e) => handleMaintCheckboxClick(e, item.task_id)}
                              />
                            )}
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              taskStatus === 'today' ? "bg-green-100 text-green-800" 
                              : taskStatus === 'upcoming' ? "bg-blue-100 text-blue-800" 
                              : taskStatus === 'overdue' ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                            }`}>
                              {taskStatus === 'today' ? 'Today' : taskStatus === 'upcoming' ? 'Upcoming' : 'Overdue'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">#{item.task_id}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">{item.task_description || "—"}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{item.name || "—"}</span></div>
                          <div><span className="text-gray-500">Dept:</span> <span className="font-medium">{item.department || "—"}</span></div>
                          <div><span className="text-gray-500">Unit:</span> <span className="font-medium">{item.unit || "—"}</span></div>
                          <div><span className="text-gray-500">Division:</span> <span className="font-medium">{item.division || "—"}</span></div>
                          <div><span className="text-gray-500">M-Dept:</span> <span className="font-medium">{item.machine_department || "—"}</span></div>
                          <div><span className="text-gray-500">M-Div:</span> <span className="font-medium">{item.machine_division || "—"}</span></div>
                          <div><span className="text-gray-500">Machine:</span> <span className="font-medium">{item.machine_name || "—"}</span></div>
                          <div className="col-span-2 mt-1 flex flex-wrap items-start">
                            <span className="text-gray-500 mr-1">Part:</span> 
                            {(() => {
                              const partNameStr = Array.isArray(item.part_name) ? item.part_name.join(', ') : (item.part_name || "");
                              const fullDisplay = item.machine_name + (partNameStr ? ` / ${partNameStr}` : "");
                              const isExpanded = expandedPartNames[item.task_id];
                              const shouldTruncate = fullDisplay.length > 80;
                              return (
                                <div className="inline-flex flex-col flex-1 min-w-0">
                                  <div className={`font-medium ${isExpanded ? "max-h-[100px] overflow-y-auto pr-1 text-xs" : "line-clamp-2 text-xs"}`}>
                                    {fullDisplay || "—"}
                                  </div>
                                  {shouldTruncate && (
                                    <button
                                      onClick={() => togglePartName(item.task_id)}
                                      className="text-purple-600 text-[10px] font-bold hover:underline mt-0.5 text-left w-fit uppercase"
                                    >
                                      {isExpanded ? "Show Less" : "Show More"}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div><span className="text-gray-500">Area:</span> <span className="font-medium">{item.part_area || "—"}</span></div>
                          <div><span className="text-gray-500">Given By:</span> <span className="font-medium">{item.given_by || "—"}</span></div>
                          <div><span className="text-gray-500">Planned Date:</span> <span className="font-medium">{item.planned_date || "—"}</span></div>
                          <div><span className="text-gray-500">Frequency:</span> <span className="font-medium">{item.frequency || "—"}</span></div>
                        </div>
                        {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && isSelected && (
                          <div className="border-t pt-2 mt-2 space-y-2">
                            <select
                              value={maintAdditionalData[item.task_id] || ""}
                              onChange={(e) => {
                                setMaintAdditionalData((prev) => ({ ...prev, [item.task_id]: e.target.value }));
                                if (e.target.value !== "No") {
                                  setMaintRemarksData(prev => { const d = {...prev}; delete d[item.task_id]; return d; });
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs"
                            >
                              <option value="">Status...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Remarks"
                              value={maintRemarksData[item.task_id] || ""}
                              onChange={(e) => setMaintRemarksData((prev) => ({ ...prev, [item.task_id]: e.target.value }))}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs box-border"
                            />
                            {/* Image Upload for Mobile Maintenance */}
                            <div className="space-y-1">
                              {maintUploadedImages[item.task_id] || item.image ? (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                  <img
                                    src={
                                      (maintUploadedImages[item.task_id] && maintUploadedImages[item.task_id][0]?.previewUrl) ||
                                      (typeof item.image === 'string' ? item.image.split(',')[0] : '')
                                    }
                                    alt="Receipt"
                                    className="h-10 w-10 object-cover rounded-md flex-shrink-0"
                                  />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs text-gray-600 truncate mb-1">
                                      {maintUploadedImages[item.task_id] 
                                        ? `${maintUploadedImages[item.task_id].length} file(s) ready` 
                                        : (typeof item.image === 'string' ? `${item.image.split(',').length} file(s) uploaded` : "Uploaded")}
                                    </span>
                                    {maintUploadedImages[item.task_id] ? (
                                      <span className="text-xs text-green-600">Ready to upload</span>
                                    ) : (
                                      <button
                                        className="text-xs text-purple-600 hover:text-purple-800 text-left"
                                        onClick={() => window.open(item.image.split(',')[0], "_blank")}
                                      >
                                        View Image
                                      </button>
                                    )}
                                  </div>
                                  {maintUploadedImages[item.task_id] && maintUploadedImages[item.task_id].length < 5 && (
                                    <label className="cursor-pointer ml-auto bg-purple-100 text-purple-600 rounded-full p-2 hover:bg-purple-200 transition-colors flex-shrink-0" title="Add another file">
                                      <Plus className="h-4 w-4" />
                                      <input type="file" multiple className="hidden" accept="*/*" onChange={(e) => handleMaintImageUpload(item.task_id, e)} />
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <label
                                  className={`flex items-center justify-center gap-2 cursor-pointer ${
                                    item.require_attachment?.toUpperCase() === "YES" &&
                                    maintAdditionalData[item.task_id] !== "No"
                                      ? "text-red-600 font-medium bg-red-50"
                                      : "text-purple-600 bg-purple-50"
                                  } hover:bg-opacity-80 px-3 py-2 rounded-md border ${
                                    item.require_attachment?.toUpperCase() === "YES" &&
                                    maintAdditionalData[item.task_id] !== "No"
                                      ? "border-red-300"
                                      : "border-purple-300"
                                  }`}
                                >
                                  <Upload className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs">
                                    {item.require_attachment?.toUpperCase() === "YES" &&
                                    maintAdditionalData[item.task_id] !== "No"
                                      ? "Upload File (Required)"
                                      : "Upload File"}
                                  </span>
                                  <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    accept="*/*"
                                    onChange={(e) => handleMaintImageUpload(item.task_id, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {searchTerm ? "No maintenance tasks matching your search" : "No pending maintenance tasks found"}
                  </div>
                )}
              </div>

              {/* Desktop view for Maintenance */}
              <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b w-16">Seq. No.</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b text-purple-600">Task Status</th>
                    {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 border-b">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={filteredMaintenanceData.length > 0 && filteredMaintenanceData.every(item => maintSelectedItems.has(item.task_id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMaintSelectedItems(new Set(filteredMaintenanceData.map(item => item.task_id)));
                              setMaintAdditionalData(prev => {
                                const updated = { ...prev };
                                filteredMaintenanceData.forEach(item => { updated[item.task_id] = "Yes" });
                                return updated;
                              });
                            } else {
                              setMaintSelectedItems(new Set());
                              setMaintAdditionalData({});
                              setMaintRemarksData({});
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px] border-b">Task Description</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] border-b">Name</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] border-b">Given By</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] border-b bg-orange-50">Remark</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b bg-yellow-50">Planned</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b bg-yellow-50">Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">ID</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b bg-green-50">File</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Unit</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Division</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Dept</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">M-Dept</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">M-Div</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Machine</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Part</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Area</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Freq</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Remind</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-b">Attach</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMaintenanceData.length > 0 ? (
                    filteredMaintenanceData.map((item, index) => {
                      const isSelected = maintSelectedItems.has(item.task_id);
                      const taskStatus = getTaskStatus(item.task_start_date || item.planned_date);
                      return (
                        <tr key={index} className={`${isSelected ? "bg-purple-50" : taskStatus === 'upcoming' ? "bg-blue-50" : taskStatus === 'overdue' ? "bg-red-50" : ""} hover:bg-gray-50`}>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 text-center">
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              taskStatus === 'today' 
                                ? "bg-green-100 text-green-800" 
                                : taskStatus === 'upcoming' 
                                  ? "bg-blue-100 text-blue-800" 
                                  : taskStatus === 'overdue'
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}>
                              {taskStatus === 'today' ? 'Today' : taskStatus === 'upcoming' ? 'Upcoming' : taskStatus === 'overdue' ? 'Overdue' : '—'}
                            </span>
                          </td>
                          {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                            <td className="px-2 sm:px-3 py-2 sm:py-4 w-12 border-b">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                checked={isSelected}
                                onChange={(e) => handleMaintCheckboxClick(e, item.task_id)}
                              />
                            </td>
                          )}
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[200px] border-b">
                            <div className="text-xs sm:text-sm text-gray-900 break-words" title={item.task_description}>
                              {item.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[180px] border-b">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{item.name || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[180px] border-b">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{item.given_by || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-orange-50 min-w-[150px] border-b">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected || !maintAdditionalData[item.task_id]}
                              value={maintRemarksData[item.task_id] || ""}
                              onChange={(e) => setMaintRemarksData((prev) => ({ ...prev, [item.task_id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full min-w-32 border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm"
                            />
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50 border-b">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">
                              {item.planned_date || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50 border-b">
                            <select
                              disabled={!isSelected}
                              value={maintAdditionalData[item.task_id] || ""}
                              onChange={(e) => {
                                setMaintAdditionalData((prev) => ({ ...prev, [item.task_id]: e.target.value }));
                                if (e.target.value !== "No") {
                                  setMaintRemarksData(prev => { const d = {...prev}; delete d[item.task_id]; return d; });
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 flex w-full min-w-[100px] disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{item.task_id || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50 border-b">
                            {maintUploadedImages[item.task_id] || item.image ? (
                              <div className="flex items-center">
                                <img
                                  src={(maintUploadedImages[item.task_id] && maintUploadedImages[item.task_id][0]?.previewUrl) || (typeof item.image === 'string' ? item.image.split(',')[0] : '')}
                                  alt="Preview"
                                  className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-md mr-2 flex-shrink-0"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs text-gray-500 break-words mb-1">
                                    {maintUploadedImages[item.task_id] ? `${maintUploadedImages[item.task_id].length} files` : "Uploaded"}
                                  </span>
                                  {maintUploadedImages[item.task_id] ? (
                                    <span className="text-xs text-green-600">Ready</span>
                                  ) : (
                                    <button
                                      className="text-xs text-purple-600 hover:text-purple-800 whitespace-nowrap"
                                      onClick={() => window.open(item.image.split(',')[0], "_blank")}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                                {maintUploadedImages[item.task_id] && maintUploadedImages[item.task_id].length < 5 && (
                                  <label className="cursor-pointer ml-2 bg-purple-100 text-purple-600 rounded-full p-1 hover:bg-purple-200 transition-colors flex-shrink-0" title="Add another file">
                                    <Plus className="h-4 w-4" />
                                    <input type="file" multiple className="hidden" accept="*/*" onChange={(e) => handleMaintImageUpload(item.task_id, e)} />
                                  </label>
                                )}
                              </div>
                            ) : (
                              <label
                                className={`flex items-center cursor-pointer whitespace-nowrap ${item.require_attachment?.toUpperCase() === "YES" && maintAdditionalData[item.task_id] !== "No" ? "text-red-600 font-medium" : "text-purple-600"} hover:text-purple-800`}
                              >
                                <Upload className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="text-xs">
                                  {item.require_attachment?.toUpperCase() === "YES" && maintAdditionalData[item.task_id] !== "No" ? "Required*" : "Upload"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="*/*"
                                  onChange={(e) => handleMaintImageUpload(item.task_id, e)}
                                  disabled={!isSelected}
                                />
                              </label>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.unit || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.division || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.department || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.machine_department || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.machine_division || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.machine_name || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b min-w-[150px] max-w-[300px]">
                            {(() => {
                              const partNameStr = Array.isArray(item.part_name) ? item.part_name.join(', ') : (item.part_name || "—");
                              const isExpanded = expandedPartNames[item.task_id];
                              const shouldTruncate = partNameStr.length > 80;
                              return (
                                <div className="flex flex-col">
                                  <div className={`text-xs sm:text-sm text-gray-900 ${isExpanded ? "max-h-[120px] overflow-y-auto pr-2 custom-scrollbar break-words" : "line-clamp-2 break-words"}`}>
                                    {partNameStr}
                                  </div>
                                  {shouldTruncate && (
                                    <button
                                      onClick={() => togglePartName(item.task_id)}
                                      className="text-purple-600 text-[10px] font-bold hover:underline mt-1 text-left w-fit uppercase"
                                    >
                                      {isExpanded ? "Show Less" : "Show More"}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.part_area || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.frequency || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.enable_reminders || "—"}</div></td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 border-b whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-900">{item.require_attachment || "—"}</div></td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={22} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        {searchTerm ? "No maintenance tasks matching your search" : "No pending maintenance tasks found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div ref={loaderRef} className="h-10 flex items-center justify-center bg-gray-50 border-t border-gray-100">
                {maintLoading && (
                  <div className="flex items-center gap-2 text-purple-600 animate-pulse">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-400"></div>
                    <span className="text-xs font-medium ml-1">Loading more maintenance...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Regular Tasks Table - Mobile Responsive */
            <div
              ref={tableContainerRef}
              className="overflow-x-auto overflow-y-auto"
              style={{ maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 280px)' }}
            >
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4 bg-gray-50">
                {/* Mobile Select All for Checklist */}
                {(userRole === "user" || userRole === "admin" || userRole === "div_admin" || userRole === "super_admin") && filteredAccountData.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date)).length > 0 && filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date)).every(item => selectedItems.has(item.task_id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const enabledItems = filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date));
                          setSelectedItems(new Set(enabledItems.map(item => item.task_id)));
                          setAdditionalData((prev) => {
                            const updated = { ...prev };
                            enabledItems.forEach((item) => { updated[item.task_id] = "Yes" });
                            return updated;
                          });
                        } else {
                          setSelectedItems(new Set());
                          setAdditionalData({});
                          setRemarksData({});
                        }
                      }}
                    />
                    <span className="text-xs font-medium text-purple-700">Select All ({filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date)).length})</span>
                  </div>
                )}
                {filteredAccountData.length > 0 ? (
                  filteredAccountData.map((account, index) => {
                    // Skip items with no description (potential header rows or corrupt data)
                    if (!account.task_description && !account.task_id) return null;
                    
                    const isSelected = selectedItems.has(account.task_id);
                    const taskStatus = getTaskStatus(account.task_start_date);
                    const checkboxEnabled = isCheckboxEnabled(account.task_start_date);
                    return (
                      <div key={index} className={`bg-white border rounded-lg p-3 shadow-sm ${taskStatus === 'upcoming' ? "border-blue-300 bg-blue-50" : taskStatus === 'overdue' ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                              <input
                                type="checkbox"
                                className={`h-4 w-4 rounded border-gray-300 text-purple-600 ${!checkboxEnabled ? 'opacity-50' : ''}`}
                                checked={isSelected}
                                disabled={!checkboxEnabled}
                                onChange={(e) => handleCheckboxClick(e, account.task_id)}
                              />
                            )}
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              taskStatus === 'today' ? "bg-green-100 text-green-800" 
                              : taskStatus === 'upcoming' ? "bg-blue-100 text-blue-800" 
                              : taskStatus === 'overdue' ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                            }`}>
                              {taskStatus === 'today' ? 'Today' : taskStatus === 'upcoming' ? 'Upcoming' : 'Overdue'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">#{account.task_id}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">{account.task_description || "—"}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div><span className="text-gray-500">Name:</span> <span className="font-medium">{account.name || "—"}</span></div>
                          <div><span className="text-gray-500">Dept:</span> <span className="font-medium">{account.department || "—"}</span></div>
                          <div><span className="text-gray-500">Unit:</span> <span className="font-medium">{account.unit || "—"}</span></div>
                          <div><span className="text-gray-500">Division:</span> <span className="font-medium">{account.division || "—"}</span></div>
                          <div><span className="text-gray-500">Given By:</span> <span className="font-medium">{account.given_by || "—"}</span></div>
                          <div><span className="text-gray-500">Frequency:</span> <span className="font-medium">{account.frequency || "—"}</span></div>
                          <div><span className="text-gray-500">Date:</span> <span className="font-medium">{account.task_start_date || "—"}</span></div>
                        </div>
                        {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && isSelected && (
                          <div className="border-t pt-2 mt-2 space-y-2">
                            <select
                              value={additionalData[account.task_id] || ""}
                              onChange={(e) => {
                                setAdditionalData((prev) => ({ ...prev, [account.task_id]: e.target.value }));
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs"
                            >
                              <option value="">Status...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Remarks"
                              value={remarksData[account.task_id] || ""}
                              onChange={(e) => setRemarksData((prev) => ({ ...prev, [account.task_id]: e.target.value }))}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full text-xs"
                            />
                            {/* Image Upload for Mobile */}
                            <div className="space-y-1">
                              {uploadedImages[account.task_id] || account.image ? (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                  <img
                                    src={
                                      (uploadedImages[account.task_id] && uploadedImages[account.task_id][0]?.previewUrl) ||
                                      (typeof account.image === 'string' ? account.image.split(',')[0] : '')
                                    }
                                    alt="Receipt"
                                    className="h-10 w-10 object-cover rounded-md flex-shrink-0"
                                  />
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs text-gray-600 truncate">
                                      {uploadedImages[account.task_id] 
                                        ? `${uploadedImages[account.task_id].length} file(s) ready` 
                                        : (typeof account.image === 'string' ? `${account.image.split(',').length} file(s) uploaded` : "Uploaded")}
                                    </span>
                                    {uploadedImages[account.task_id] ? (
                                      <span className="text-xs text-green-600">Ready to upload</span>
                                    ) : (
                                      <button
                                        className="text-xs text-purple-600 hover:text-purple-800 text-left"
                                        onClick={() => window.open(account.image.split(',')[0], "_blank")}
                                      >
                                        View Image
                                      </button>
                                    )}
                                  </div>
                                  {uploadedImages[account.task_id] && uploadedImages[account.task_id].length < 5 && (
                                    <label className="cursor-pointer ml-auto bg-purple-100 text-purple-600 rounded-full p-2 hover:bg-purple-200 transition-colors flex-shrink-0" title="Add another file">
                                      <Plus className="h-4 w-4" />
                                      <input type="file" multiple className="hidden" accept="*/*" onChange={(e) => handleImageUpload(account.task_id, e)} />
                                    </label>
                                  )}
                                </div>
                              ) : (
                                <label
                                  className={`flex items-center justify-center gap-2 cursor-pointer ${
                                    account.require_attachment?.toUpperCase() === "YES" &&
                                    additionalData[account.task_id] !== "No"
                                      ? "text-red-600 font-medium bg-red-50"
                                      : "text-purple-600 bg-purple-50"
                                  } hover:bg-opacity-80 px-3 py-2 rounded-md border ${
                                    account.require_attachment?.toUpperCase() === "YES" &&
                                    additionalData[account.task_id] !== "No"
                                      ? "border-red-300"
                                      : "border-purple-300"
                                  }`}
                                >
                                  <Upload className="h-4 w-4 flex-shrink-0" />
                                  <span className="text-xs">
                                    {account.require_attachment?.toUpperCase() === "YES" &&
                                    additionalData[account.task_id] !== "No"
                                      ? "Upload File (Required)"
                                      : "Upload File"}
                                  </span>
                                  <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    accept="*/*"
                                    onChange={(e) => handleImageUpload(account.task_id, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {searchTerm ? "No tasks matching your search" : "No pending tasks found"}
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <table className="min-w-full divide-y divide-gray-200 hidden lg:table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">
                      Seq. No.
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Task Status
                    </th>
                    {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          checked={filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date)).length > 0 && filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date)).every(item => selectedItems.has(item.task_id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Only select items with enabled checkboxes (today and overdue)
                              const enabledItems = filteredAccountData.filter(item => isCheckboxEnabled(item.task_start_date));
                              setSelectedItems(new Set(enabledItems.map(item => item.task_id)));
                              // Auto-set status to "Yes" for all selected items
                              setAdditionalData((prev) => {
                                const updated = { ...prev };
                                enabledItems.forEach((item) => { updated[item.task_id] = "Yes" });
                                return updated;
                              });
                            } else {
                              setSelectedItems(new Set());
                              setAdditionalData({});
                              setRemarksData({});
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Task Description
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Name
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Given By
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] bg-orange-50">
                      Remark
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50 whitespace-nowrap">
                      Task End Date
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-yellow-50">
                      Status
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-green-50">
                      Upload File
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Task ID
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Department
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Unit
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Division
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Freq
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Reminders
                    </th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Attachment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccountData.length > 0 ? (
                    filteredAccountData.map((account, index) => {
                      const isSelected = selectedItems.has(account.task_id);
                      const sequenceNumber = index + 1;
                      const taskStatus = getTaskStatus(account.task_start_date);
                      const checkboxEnabled = isCheckboxEnabled(account.task_start_date);
                      return (
                        <tr key={index} className={`${isSelected ? "bg-purple-50" : taskStatus === 'upcoming' ? "bg-blue-50" : taskStatus === 'overdue' ? "bg-red-50" : ""} hover:bg-gray-50`}>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 w-16">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 text-center">
                              {sequenceNumber}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              taskStatus === 'today' 
                                ? "bg-green-100 text-green-800" 
                                : taskStatus === 'upcoming' 
                                  ? "bg-blue-100 text-blue-800" 
                                  : taskStatus === 'overdue'
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}>
                              {taskStatus === 'today' ? 'Today' : taskStatus === 'upcoming' ? 'Upcoming' : taskStatus === 'overdue' ? 'Overdue' : '—'}
                            </span>
                          </td>
                          {(userRole === "user" || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin") && (
                            <td className="px-2 sm:px-3 py-2 sm:py-4 w-12">
                              <input
                                type="checkbox"
                                className={`h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 ${!checkboxEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                checked={isSelected}
                                disabled={!checkboxEnabled}
                                onChange={(e) => handleCheckboxClick(e, account.task_id)}
                                title={!checkboxEnabled ? 'Cannot select upcoming tasks' : ''}
                              />
                            </td>
                          )}
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[200px]">
                            <div className="text-xs sm:text-sm text-gray-900 break-words" title={account.task_description}>
                              {account.task_description || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[180px]">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.name || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[180px]">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.given_by || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-orange-50 min-w-[150px]">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected || !additionalData[account.task_id]}
                              value={remarksData[account.task_id] || ""}
                              onChange={(e) => setRemarksData((prev) => ({ ...prev, [account.task_id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm break-words"
                            />
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">
                              {account.task_start_date || "—"}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50">
                            <select
                              disabled={!isSelected}
                              value={additionalData[account.task_id] || ""}
                              onChange={(e) => {
                                setAdditionalData((prev) => ({ ...prev, [account.task_id]: e.target.value }));
                                if (e.target.value !== "No") {
                                  setRemarksData((prev) => {
                                    const newData = { ...prev };
                                    delete newData[account.task_id];
                                    return newData;
                                  });
                                }
                              }}
                              className="border border-gray-300 rounded-md px-2 py-1 w-full min-w-[100px] disabled:bg-gray-100 disabled:cursor-not-allowed text-xs sm:text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50">
                            {uploadedImages[account.task_id] || account.image ? (
                              <div className="flex items-center">
                                <img
                                  src={
                                    (uploadedImages[account.task_id] && uploadedImages[account.task_id][0]?.previewUrl) ||
                                    (typeof account.image === 'string' ? account.image.split(',')[0] : '')
                                  }
                                  alt="Receipt"
                                  className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-md mr-2 flex-shrink-0"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs text-gray-500 break-words mb-1">
                                    {uploadedImages[account.task_id] ? `${uploadedImages[account.task_id].length} files` : "Uploaded"}
                                  </span>
                                  {uploadedImages[account.task_id] ? (
                                    <span className="text-xs text-green-600">Ready</span>
                                  ) : (
                                    <button
                                      className="text-xs text-purple-600 hover:text-purple-800 break-words"
                                      onClick={() => window.open(account.image.split(',')[0], "_blank")}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                                {uploadedImages[account.task_id] && uploadedImages[account.task_id].length < 5 && (
                                  <label className="cursor-pointer ml-2 bg-purple-100 text-purple-600 rounded-full p-1 hover:bg-purple-200 transition-colors flex-shrink-0" title="Add another file">
                                    <Plus className="h-4 w-4" />
                                    <input type="file" multiple className="hidden" accept="*/*" onChange={(e) => handleImageUpload(account.task_id, e)} />
                                  </label>
                                )}
                              </div>
                            ) : (
                              <label
                                className={`flex items-center cursor-pointer ${account.require_attachment?.toUpperCase() === "YES" &&
                                  additionalData[account.task_id] !== "No" // Only show as required if status is not "No"
                                  ? "text-red-600 font-medium"
                                  : "text-purple-600"
                                  } hover:text-purple-800`}
                              >
                                <Upload className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="text-xs break-words">
                                  {account.require_attachment?.toUpperCase() === "YES" &&
                                    additionalData[account.task_id] !== "No"
                                    ? "Required*"
                                    : "Upload"}
                                </span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="*/*"
                                  onChange={(e) => handleImageUpload(account.task_id, e)}
                                  disabled={!isSelected}
                                />
                              </label>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.task_id || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.department || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.unit || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.division || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.frequency || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.enable_reminder || "—"}</div>
                          </td>
                          <td className="px-2 sm:px-3 py-2 sm:py-4">
                            <div className="text-xs sm:text-sm text-gray-900 break-words">{account.require_attachment || "—"}</div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={17} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        {searchTerm
                          ? "No tasks matching your search"
                          : "No pending tasks found for today, tomorrow, or past due dates"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div ref={loaderRef} className="h-10 flex items-center justify-center bg-gray-50 border-t border-gray-100">
                {loading && (
                  <div className="flex items-center gap-2 text-purple-600 animate-pulse">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animation-delay-400"></div>
                    <span className="text-xs font-medium ml-1">Loading more tasks...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </AdminLayout>
  );
}

export default AccountDataPage
