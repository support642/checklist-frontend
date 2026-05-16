"use client"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router-dom"
import { Search, CheckCircle2, ChevronLeft, ChevronRight, X, Bell } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { useDispatch, useSelector } from "react-redux"
import { checklistHistoryData } from "../../redux/slice/checklistSlice"
import { postChecklistAdminDoneAPI } from "../../redux/api/checkListApi"
import { postDelegationAdminDoneAPI } from "../../redux/api/delegationApi"
import { uniqueDoerNameData } from "../../redux/slice/assignTaskSlice"
import { hasPageAccess, canAccessModule, hasModifyAccess } from "../../utils/permissionUtils"
import { delegationDoneData } from "../../redux/slice/delegationSlice"
import { maintenanceHistoryData, maintenanceAdminDone } from "../../redux/slice/maintenanceSlice"
import { postMaintenanceAdminDoneAPI, sendMaintenanceNotificationAPI } from "../../redux/api/maintenanceApi"

const SearchableSelect = ({ value, onChange, options, placeholder, id }) => (
  <div className="relative group w-full sm:min-w-[120px]">
    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={10} />
    <input
      list={id}
      value={value === 'all' ? '' : value}
      onChange={(e) => onChange(e.target.value || 'all')}
      placeholder={placeholder}
      className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white shadow-xs"
    />
    <datalist id={id}>
      {options.map((opt) => (
        <option key={opt} value={opt} />
      ))}
    </datalist>
  </div>
);

function HistoryPage() {
  const [activeTab, setActiveTab] = useState("checklist") // 'checklist', 'delegation', or 'maintenance'
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [nameFilter, setNameFilter] = useState("all")
  const [approvalStatusFilter, setApprovalStatusFilter] = useState("pending") // 'all', 'pending', 'approved'
  const ITEMS_PER_PAGE = 50

  // Admin approval states
  const [selectedHistoryItems, setSelectedHistoryItems] = useState([])
  const [selectedDelegationItems, setSelectedDelegationItems] = useState([])
  const [selectedMaintenanceItems, setSelectedMaintenanceItems] = useState([])
  const [markingAsDone, setMarkingAsDone] = useState(false)
  const [maintAdminRemarks, setMaintAdminRemarks] = useState({})
  const [maintCurrentPage, setMaintCurrentPage] = useState(1)
  const [delegationCurrentPage, setDelegationCurrentPage] = useState(1)
  const [successMessage, setSuccessMessage] = useState("")
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    itemCount: 0,
    type: "checklist" // 'checklist' or 'delegation'
  })
  const [fileModal, setFileModal] = useState({ isOpen: false, urls: [] })
  const [adminRemarks, setAdminRemarks] = useState({}) // New state for admin remarks

  const { 
    history, 
    historyTotalCount, 
    historyApprovedCount, 
    historyPendingCount, 
    historyTotalPages,
    loading 
  } = useSelector((state) => state.checkList)
  
  const { 
    delegation_done, 
    delegationTotalCount, 
    delegationApprovedCount,
    delegationPendingCount,
    delegationTotalPages,
    delegationCurrentPage: delegationPageFromRedux
  } = useSelector((state) => state.delegation)
  
  const { doerName } = useSelector((state) => state.assignTask)
  
  const { 
    history: maintHistory, 
    historyTotalCount: maintTotalCount, 
    historyApprovedCount: maintApprovedCount, 
    historyPendingCount: maintPendingCount,
    historyTotalPages: maintTotalPagesFromRedux,
    historyCurrentPage: maintPageFromRedux,
    loading: maintLoading 
  } = useSelector((state) => state.maintenance)
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const filters = {
      page: currentPage,
      search: debouncedSearch,
      startDate,
      endDate,
      name: nameFilter,
      division: divisionFilter,
      departmentFilter: departmentFilter,
      approvalStatus: approvalStatusFilter
    }
    dispatch(checklistHistoryData(filters))
  }, [dispatch, debouncedSearch, nameFilter, divisionFilter, departmentFilter, startDate, endDate, approvalStatusFilter, currentPage])

  useEffect(() => {
    const filters = {
      page: delegationCurrentPage,
      search: debouncedSearch,
      startDate,
      endDate,
      name: nameFilter,
      division: divisionFilter,
      departmentFilter: departmentFilter,
      approvalStatus: approvalStatusFilter
    }
    dispatch(delegationDoneData(filters))
  }, [dispatch, debouncedSearch, nameFilter, divisionFilter, departmentFilter, startDate, endDate, approvalStatusFilter, delegationCurrentPage])

  useEffect(() => {
    const filters = {
      page: maintCurrentPage,
      search: debouncedSearch,
      startDate,
      endDate,
      name: nameFilter,
      division: divisionFilter,
      departmentFilter: departmentFilter,
      approvalStatus: approvalStatusFilter
    }
    dispatch(maintenanceHistoryData(filters))
  }, [dispatch, debouncedSearch, nameFilter, divisionFilter, departmentFilter, startDate, endDate, approvalStatusFilter, maintCurrentPage])

  useEffect(() => {
    dispatch(uniqueDoerNameData())
  }, [dispatch])

  useEffect(() => {
    const role = localStorage.getItem("role")
    const user = localStorage.getItem("user-name")
    setUserRole(role || "")
    setUsername(user || "")
    const tab = searchParams.get('tab')
    setIsSuperAdmin(role === "super_admin" || role === "admin" || role === "div_admin")

    if (tab === 'maintenance') {
      setActiveTab('maintenance')
    } else if (tab === 'delegation') {
      setActiveTab('delegation')
    }
  }, [searchParams])

  // Tab visibility fallback logic
  useEffect(() => {
    if (!canAccessModule(activeTab)) {
      const availableTabs = ["checklist", "delegation", "maintenance"].filter(canAccessModule);
      if (availableTabs.length > 0) {
        setActiveTab(availableTabs[0]);
      }
    }
  }, [activeTab]);

  const parseSupabaseDate = (dateStr) => {
    if (!dateStr) return null
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      return new Date(dateStr)
    }
    if (dateStr instanceof Date) {
      return dateStr
    }
    return new Date(dateStr)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
    setApprovalStatusFilter("all") // Reset to all
    setDivisionFilter("all")
    setDepartmentFilter("all")
    setNameFilter("all")
    setCurrentPage(1)
    setMaintCurrentPage(1)
    setDelegationCurrentPage(1)
  }

  // Handle checkbox selection for checklist admin approval
  const handleHistoryItemSelect = (taskId, isChecked) => {
    if (isChecked) {
      setSelectedHistoryItems(prev => [...prev, { task_id: taskId }])
    } else {
      setSelectedHistoryItems(prev => prev.filter(item => item.task_id !== taskId))
    }
  }

  // Handle checkbox selection for delegation admin approval
  const handleDelegationItemSelect = (id, isChecked) => {
    if (isChecked) {
      setSelectedDelegationItems(prev => [...prev, { id: id }])
    } else {
      setSelectedDelegationItems(prev => prev.filter(item => item.id !== id))
    }
  }

  // Handle select all for checklist items without admin_done = 'Done'
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const pendingItems = filteredHistoryData
        .filter(item => item.admin_done !== 'Done')
        .map(item => ({ task_id: item.task_id }))
      setSelectedHistoryItems(pendingItems)
    } else {
      setSelectedHistoryItems([])
    }
  }

  // Handle select all for delegation items without admin_done = 'Done'
  const handleSelectAllDelegation = (isChecked) => {
    if (isChecked) {
      const pendingItems = filteredDelegationData
        .filter(item => item.admin_done !== 'Done')
        .map(item => ({ id: item.id }))
      setSelectedDelegationItems(pendingItems)
    } else {
      setSelectedDelegationItems([])
    }
  }

  // Maintenance checkbox handlers
  const handleMaintenanceItemSelect = (taskId, isChecked) => {
    if (isChecked) {
      setSelectedMaintenanceItems(prev => [...prev, { task_id: taskId }])
    } else {
      setSelectedMaintenanceItems(prev => prev.filter(item => item.task_id !== taskId))
    }
  }

  const handleSelectAllMaintenance = (isChecked) => {
    if (isChecked) {
      const pendingItems = filteredMaintenanceData
        .filter(item => item.admin_done !== 'Done' && item.admin_done !== 'true' && item.admin_done !== true)
        .map(item => ({ task_id: item.task_id }))
      setSelectedMaintenanceItems(pendingItems)
    } else {
      setSelectedMaintenanceItems([])
    }
  }

  const isMaintenanceItemSelected = (taskId) => {
    return selectedMaintenanceItems.some(item => item.task_id === taskId)
  }

  // Mark selected items as done
  const handleMarkDone = async (type) => {
    let items
    if (type === "checklist") items = selectedHistoryItems
    else if (type === "maintenance") items = selectedMaintenanceItems
    else items = selectedDelegationItems
    if (items.length === 0) return
    setConfirmationModal({
      isOpen: true,
      itemCount: items.length,
      type: type
    })
  }

  const confirmMarkDone = async () => {
    const type = confirmationModal.type
    setConfirmationModal({ isOpen: false, itemCount: 0, type: "checklist" })
    setMarkingAsDone(true)
    try {
      let data, error
      if (type === "checklist") {
        const payload = selectedHistoryItems.map(item => ({
          task_id: item.task_id,
          remarks: adminRemarks[item.task_id] || "",
          approvedBy: localStorage.getItem("user-name") || "Admin"
        }))
        const result = await postChecklistAdminDoneAPI(payload)
        data = result.data
        error = result.error
      } else if (type === "maintenance") {
        const payload = selectedMaintenanceItems.map(item => ({
          task_id: item.task_id,
          remarks: maintAdminRemarks[item.task_id] || "",
          approvedBy: localStorage.getItem("user-name") || "Admin"
        }))
        const result = await postMaintenanceAdminDoneAPI(payload)
        data = result.data
        error = result.error
      } else {
        const payload = selectedDelegationItems.map(item => ({
          id: item.id,
          remarks: adminRemarks[item.id] || "",
          approvedBy: localStorage.getItem("user-name") || "Admin"
        }))
        const result = await postDelegationAdminDoneAPI(payload)
        data = result.data
        error = result.error
      }

      if (error) {
        throw new Error(error.message || "Failed to mark items as done")
      }

      const currentFilters = {
        page: type === "checklist" ? currentPage : (type === "maintenance" ? maintCurrentPage : delegationCurrentPage),
        search: debouncedSearch,
        startDate,
        endDate,
        name: nameFilter,
        division: divisionFilter,
        departmentFilter: departmentFilter,
        approvalStatus: approvalStatusFilter
      }

      if (type === "checklist") {
        setSelectedHistoryItems([])
        dispatch(checklistHistoryData(currentFilters))
      } else if (type === "maintenance") {
        setSelectedMaintenanceItems([])
        dispatch(maintenanceHistoryData(currentFilters))
      } else {
        setSelectedDelegationItems([])
        dispatch(delegationDoneData(currentFilters))
      }
      
      let count
      if (type === "checklist") count = selectedHistoryItems.length
      else if (type === "maintenance") count = selectedMaintenanceItems.length
      else count = selectedDelegationItems.length
      setSuccessMessage(`Successfully marked ${count} items as approved!`)
      
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error marking tasks as done:", error)
      setSuccessMessage(`Failed to mark tasks as done: ${error.message}`)
    } finally {
      setMarkingAsDone(false)
    }
  }

  // Use data directly from Redux (already filtered & paginated by backend)
  const filteredHistoryData = history || []

  const filteredMaintenanceData = maintHistory || []

  // Maintenance pagination
  const maintTotalPages = maintTotalPagesFromRedux || 1
  const maintStartRecord = filteredMaintenanceData.length > 0 ? (maintCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const maintEndRecord = Math.min(maintCurrentPage * ITEMS_PER_PAGE, maintTotalCount)
  const paginatedMaintenanceData = filteredMaintenanceData

  const pendingMaintenanceApprovalCount = maintPendingCount

  const isMaintItemDone = (item) => {
    return item.admin_done === 'Done' || item.admin_done === 'true' || item.admin_done === true
  }

  const handleSendMaintenanceNotification = async () => {
    if (selectedMaintenanceItems.length === 0) return;
    setMarkingAsDone(true); // Using existing loading overlay state
    try {
      // selectedMaintenanceItems is [{task_id: ...}, ...]
      const selectedIds = selectedMaintenanceItems.map(item => item.task_id);
      const selectedTasks = maintHistory.filter(m => selectedIds.includes(m.task_id));
      
      const { data, error } = await sendMaintenanceNotificationAPI(selectedTasks);
      
      if (error) {
        throw new Error(error.message || "Failed to send notifications");
      }
      
      setSuccessMessage(`Successfully sent notifications to ${selectedMaintenanceItems.length} users!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error sending notification:", err);
      setSuccessMessage(`Failed to send notifications: ${err.message}`);
    } finally {
      setMarkingAsDone(false);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
    setMaintCurrentPage(1)
    setDelegationCurrentPage(1)
  }, [searchTerm, selectedMembers, startDate, endDate, approvalStatusFilter])

  // Pagination helpers (based on filtered data, not raw DB total)
  const totalPagesDerived = historyTotalPages || 1
  const startRecord = filteredHistoryData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, historyTotalCount)

  // Paginated slice of filtered data for display
  const paginatedData = filteredHistoryData

  // Filtered delegation data
  const filteredDelegationData = delegation_done || []


  // Recalculate delegation stats based on visible (non-extended) tasks
  const delegationStats = { 
    total: delegationTotalCount, 
    approved: delegationApprovedCount, 
    pending: delegationPendingCount 
  }

  // Delegation pagination
  const delegationTotalPagesDerived = delegationTotalPages || 1
  const delegationStartRecord = filteredDelegationData.length > 0 ? (delegationCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const delegationEndRecord = Math.min(delegationCurrentPage * ITEMS_PER_PAGE, delegationTotalCount)
  const paginatedDelegationData = filteredDelegationData

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
    if (userRole === "admin" || userRole === "div_admin") {
      return doerName.map(member => member?.user_name || member)
    } else {
      return doerName
        .map(member => member?.user_name || member)
        .filter((member) => member.toLowerCase() === username.toLowerCase())
    }
  }

  // Check if an item is selected
  const isItemSelected = (taskId) => {
    return selectedHistoryItems.some(item => item.task_id === taskId)
  }

  const isDelegationItemSelected = (id) => {
    return selectedDelegationItems.some(item => item.id === id)
  }

  // Count pending approval items
  const pendingApprovalCount = historyPendingCount
  const pendingDelegationApprovalCount = delegationPendingCount
  

  // Confirmation Modal Component
  const ConfirmationModal = ({ isOpen, itemCount, onConfirm, onCancel }) => {
    if (!isOpen) return null

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 max-w-md w-full mx-4 border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 text-green-600 rounded-full p-3 mr-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Approve Items</h2>
          </div>

          <p className="text-gray-600 text-center mb-6 text-sm sm:text-base">
            Are you sure you want to approve {itemCount} {itemCount === 1 ? "item" : "items"}?
          </p>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all font-medium text-sm sm:text-base border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all font-medium shadow-lg shadow-green-100 text-sm sm:text-base"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

   // File View Modal Component
  const FileModal = ({ isOpen, urls, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 max-w-lg w-full mx-4 border border-gray-100 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Attached Files</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {urls.map((url, i) => {
              const cleanedUrl = url.trim();
              const ext = cleanedUrl.split('.').pop().split('?')[0].toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
              
              return (
                <a
                  key={i}
                  href={cleanedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 hover:bg-purple-50 rounded-xl border border-gray-100 transition-all group hover:border-purple-200 hover:shadow-sm"
                >
                  {isImage ? (
                    <img src={cleanedUrl} alt={`File ${i+1}`} className="w-12 h-12 object-cover rounded-lg shadow-sm mr-4" />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 mr-4">
                      <span className="text-[10px] font-black text-purple-600 uppercase tracking-tighter">{ext.slice(0,3)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate mb-0.5">Document {i + 1}</p>
                    <p className="text-[10px] font-medium text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Click to view &rarr;
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "—"
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "—"
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  // Derive filter options
  const divisionOptions = useMemo(() => {
    const all = [
      ...(history || []).map(item => item.division),
      ...(maintHistory || []).map(item => item.division),
      ...(delegation_done || []).map(item => item.division)
    ].filter(Boolean);
    return [...new Set(all)].sort();
  }, [history, maintHistory, delegation_done]);

  const departmentOptions = useMemo(() => {
    const all = [
      ...(history || []).map(item => item.department),
      ...(maintHistory || []).map(item => item.department),
      ...(delegation_done || []).map(item => item.department)
    ].filter(Boolean);
    return [...new Set(all)].sort();
  }, [history, maintHistory, delegation_done]);

  const memberOptions = useMemo(() => {
    const all = [
      ...(history || []).map(item => item.name),
      ...(maintHistory || []).map(item => item.name),
      ...(delegation_done || []).map(item => item.name)
    ].filter(Boolean);
    return [...new Set(all)].sort();
  }, [history, maintHistory, delegation_done]);


  return (
    <AdminLayout>
      <div className="space-y-2 p-2 sm:p-0">
        {/* Header - Compact */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-purple-700">Approval Pending</h1>
          </div>
        </div>

        {/* Tabs - Compact */}
        <div className="bg-white rounded-md shadow-sm">
          <div className="flex gap-1">
            {canAccessModule("checklist") && (
              <button
                onClick={() => {
                  setActiveTab("checklist")
                  setSearchTerm("")
                  setSelectedHistoryItems([])
                  setSelectedDelegationItems([])
                  setSelectedMaintenanceItems([])
                  setCurrentPage(1)
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-l-md transition-colors ${
                  activeTab === "checklist"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Checklist
              </button>
            )}
            {canAccessModule("delegation") && (
              <button
                onClick={() => {
                  setActiveTab("delegation")
                  setSearchTerm("")
                  setSelectedHistoryItems([])
                  setSelectedDelegationItems([])
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === "delegation"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Delegation
              </button>
            )}
            {canAccessModule("maintenance") && (
              <button
                onClick={() => {
                  setActiveTab("maintenance")
                  setSearchTerm("")
                  setSelectedHistoryItems([])
                  setSelectedDelegationItems([])
                  setSelectedMaintenanceItems([])
                  setMaintCurrentPage(1)
                }}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-r-md transition-colors ${
                  activeTab === "maintenance"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Maintenance
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className={`p-2 rounded-md text-sm ${successMessage.includes('Failed') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {successMessage}
          </div>
        )}

        {/* Filters + Stats - Combined Compact */}
        <div className="bg-white rounded-md shadow-sm p-2">
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-[120px] sm:max-w-[200px]">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-1 items-end sm:items-center w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-1.5 py-1 border border-gray-300 rounded text-[11px] sm:text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                <span className="text-[10px] sm:text-xs text-gray-500 font-medium">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-1.5 py-1 border border-gray-300 rounded text-[11px] sm:text-xs focus:ring-1 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>

            {/* Filter Control Group */}
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:w-auto items-center overflow-x-hidden pt-1 sm:pt-0">
              {/* Name Filter - Mobile Order 1 */}
              <div className="max-sm:order-1 sm:order-none w-full sm:w-auto">
                <SearchableSelect
                  id="names-list"
                  value={nameFilter}
                  onChange={setNameFilter}
                  options={memberOptions}
                  placeholder="Filter by Name"
                />
              </div>

              {/* Division Filter - Mobile Order 3 */}
              <div className="max-sm:order-3 sm:order-none w-full sm:w-auto">
                <SearchableSelect
                  id="divisions-list"
                  value={divisionFilter}
                  onChange={setDivisionFilter}
                  options={divisionOptions}
                  placeholder="Division"
                />
              </div>

              {/* Department Filter - Mobile Order 5 */}
              <div className="max-sm:order-5 sm:order-none w-full sm:w-auto col-span-2 sm:col-auto">
                <SearchableSelect
                  id="departments-list"
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  options={departmentOptions}
                  placeholder="Department"
                />
              </div>

              {/* Approval Status Filter - Mobile Order 2 */}
              <div className="max-sm:order-2 sm:order-none w-full sm:w-auto">
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

              {/* Reset Logic */}
              <div className="max-sm:order-4 sm:order-none w-full sm:w-auto">
                <button
                  onClick={resetFilters}
                  className="w-full px-2 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 border border-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex gap-3 ml-0 sm:ml-auto text-xs py-1">
              {activeTab === "maintenance" ? (
                <>
                  <span className="text-purple-600 font-medium">{maintTotalCount} Total</span>
                  <span className="text-orange-600 font-medium">{maintPendingCount} Pending</span>
                  <span className="text-green-600 font-medium">{maintApprovedCount} Approved</span>
                </>
              ) : activeTab === "delegation" ? (
                <>
                  <span className="text-purple-600 font-medium">{delegationStats.total} Total</span>
                  <span className="text-orange-600 font-medium">{delegationStats.pending} Pending</span>
                  <span className="text-green-600 font-medium">{delegationStats.approved} Approved</span>
                </>
              ) : (
                <>
                  <span className="text-purple-600 font-medium">{historyTotalCount} Total</span>
                  <span className="text-orange-600 font-medium">{historyPendingCount} Pending</span>
                  <span className="text-green-600 font-medium">{historyApprovedCount} Approved</span>
                </>
              )}
            </div>

            {/* Admin Approval Button */}
            {hasModifyAccess("admin_approval") && activeTab === "checklist" && selectedHistoryItems.length > 0 && (
              <button
                onClick={() => handleMarkDone("checklist")}
                disabled={markingAsDone}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                {markingAsDone ? "..." : `Approve (${selectedHistoryItems.length})`}
              </button>
            )}

            {/* Maintenance Approval Button */}
            {hasModifyAccess("admin_approval") && activeTab === "maintenance" && selectedMaintenanceItems.length > 0 && (
              <button
                onClick={() => handleMarkDone("maintenance")}
                disabled={markingAsDone}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                {markingAsDone ? "..." : `Approve (${selectedMaintenanceItems.length})`}
              </button>
            )}

            {isSuperAdmin && activeTab === "delegation" && selectedDelegationItems.length > 0 && (
              <button
                onClick={() => handleMarkDone("delegation")}
                disabled={markingAsDone}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                {markingAsDone ? "..." : `Approve (${selectedDelegationItems.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Table Container - More height */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <style>{`
            /* Mobile Card Layout Styles - Improved Grid version */
            @media (max-width: 768px) {
              .mobile-card-table {
                display: block;
              }
              .mobile-card-table thead {
                display: none;
              }
              .mobile-card-table tbody {
                display: block;
              }
              .mobile-card-table tr {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.25rem 0.75rem; 
                margin-bottom: 1.25rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.75rem;
                padding: 1.25rem;
                background-color: #ffffff;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
              }
              .mobile-card-table td {
                display: flex;
                flex-direction: column;
                text-align: left;
                padding: 0.375rem 0;
                border: none;
                background: transparent !important;
                min-width: 0;
              }
              .mobile-card-table td::before {
                content: attr(data-label);
                font-weight: 700;
                color: #9ca3af;
                font-size: 0.65rem;
                text-transform: uppercase;
                margin-bottom: 0.15rem;
                letter-spacing: 0.025em;
              }
              
              /* Value styling */
              .mobile-card-table td > div,
              .mobile-card-table td > span {
                font-size: 0.875rem;
                color: #374151;
              }

              /* Full width fields for better readability */
              .mobile-card-table td.mobile-checkbox-cell,
              .mobile-card-table td[data-label="Task Description"],
              .mobile-card-table td[data-label="Task/Machine"],
              .mobile-card-table td[data-label="Admin Remarks"],
              .mobile-card-table td[data-label="Remarks"],
              .mobile-card-table td[data-label="Reply"],
              .mobile-card-table td[data-label="Reason"],
              .mobile-card-table td[data-label="File"],
              .mobile-card-table td[data-label="Proof"],
              .mobile-card-table td[data-label="Submission Time"],
              .mobile-card-table td[data-label="Submission Date"],
              .mobile-card-table td[data-label="Created At"] {
                grid-column: span 2;
                padding-bottom: 0.5rem;
              }

              /* Special styling for checkbox row */
              .mobile-card-table td.mobile-checkbox-cell {
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding-bottom: 0.75rem !important;
                border-bottom: 1px solid #f3f4f6 !important;
                margin-bottom: 0.5rem !important;
              }
              .mobile-card-table td.mobile-checkbox-cell::before {
                margin-bottom: 0;
                font-size: 0.75rem;
                color: #6b7280;
              }
              
              .mobile-card-table td[data-label="Task ID"] div {
                font-weight: 700;
                color: #6366f1;
              }
            }
          `}</style>
          <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {(loading || maintLoading) ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                <p className="text-purple-600 text-sm sm:text-base">Loading data...</p>
              </div>
            ) : activeTab === "maintenance" ? (
              /* Maintenance Table */
              <>
              {/* Mobile Select All for Maintenance */}
              {isSuperAdmin && (
                <div className="sm:hidden flex items-center gap-2 p-2 mx-3 mt-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAllMaintenance(e.target.checked)}
                    checked={selectedMaintenanceItems.length > 0 && selectedMaintenanceItems.length === pendingMaintenanceApprovalCount}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-xs font-medium text-purple-700">Select All ({pendingMaintenanceApprovalCount})</span>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200 mobile-card-table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllMaintenance(e.target.checked)}
                          checked={selectedMaintenanceItems.length > 0 && selectedMaintenanceItems.length === pendingMaintenanceApprovalCount}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Status</th>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Admin Remarks</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">Task/Machine</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">M-Dept</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">M-Div</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Submitted By</th>
                    {approvalStatusFilter === 'approved' && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Approved By</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Submission Time</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 min-w-[120px]">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedMaintenanceData.length > 0 ? (
                    paginatedMaintenanceData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 mobile-checkbox-cell" data-label="Select">
                            {!isMaintItemDone(item) ? (
                              <input
                                type="checkbox"
                                checked={isMaintenanceItemSelected(item.task_id)}
                                onChange={(e) => handleMaintenanceItemSelect(item.task_id, e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Admin Status">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isMaintItemDone(item)
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}>
                            {isMaintItemDone(item) ? "Approved" : "Pending"}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Admin Remarks">
                            {!isMaintItemDone(item) ? (
                              <input
                                type="text"
                                placeholder="Remark..."
                                value={maintAdminRemarks[item.task_id] || ""}
                                onChange={(e) => setMaintAdminRemarks(prev => ({
                                  ...prev,
                                  [item.task_id]: e.target.value
                                }))}
                                disabled={!isMaintenanceItemSelected(item.task_id)}
                                className={`w-full text-xs p-1 border-2 border-purple-300 rounded font-bold focus:border-purple-500 focus:bg-white bg-purple-50 ${
                                  !isMaintenanceItemSelected(item.task_id) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            ) : (
                              <div className="text-xs text-gray-600 font-medium">{item.admin_remark || item.admin_done_remarks || "—"}</div>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Task ID">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{item.task_id || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="User">
                          <div className="text-xs sm:text-sm text-gray-900">{item.name || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[150px]" data-label="Task/Machine">
                          <div className="text-xs sm:text-sm text-gray-900" title={item.task_description}>
                            {item.task_description || "—"}
                          </div>
                          {(item.machine_name || item.part_name) && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.machine_name}{item.part_name ? ` / ${Array.isArray(item.part_name) ? item.part_name.join(', ') : item.part_name}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Given By">
                          <div className="text-xs sm:text-sm text-gray-900">{item.given_by || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Department">
                          <div className="text-xs sm:text-sm text-gray-900">{item.department || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Unit">
                          <div className="text-xs sm:text-sm text-gray-900">{item.unit || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Division">
                          <div className="text-xs sm:text-sm text-gray-900">{item.division || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="M-Dept">
                          <div className="text-xs sm:text-sm text-gray-900">{item.machine_department || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="M-Div">
                          <div className="text-xs sm:text-sm text-gray-900">{item.machine_division || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50" data-label="Submitted By">
                          <div className="text-xs sm:text-sm text-gray-900 font-medium">{item.submitted_by || "—"}</div>
                        </td>
                        {approvalStatusFilter === 'approved' && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Approved By">
                            <div className="text-xs sm:text-sm text-purple-700 font-bold">{item.approved_by || "—"}</div>
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50" data-label="Submission Time">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {item.submission_date ? (() => {
                              const dateObj = new Date(item.submission_date)
                              const day = ("0" + dateObj.getDate()).slice(-2)
                              const month = ("0" + (dateObj.getMonth() + 1)).slice(-2)
                              const year = dateObj.getFullYear()
                              const hours = ("0" + dateObj.getHours()).slice(-2)
                              const minutes = ("0" + dateObj.getMinutes()).slice(-2)
                              return (
                                <div>
                                  <div className="font-medium">{`${day}/${month}/${year}`}</div>
                                  <div className="text-xs text-gray-500">{`${hours}:${minutes}`}</div>
                                </div>
                              )
                            })() : "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Frequency">
                          <div className="text-xs sm:text-sm text-gray-900">{item.frequency || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Proof">
                          {item.image ? (
                            <button
                              onClick={() => {
                                const urls = typeof item.image === 'string' ? item.image.split(',') : [item.image];
                                if (urls.length === 1) {
                                  window.open(urls[0].trim(), "_blank");
                                } else {
                                  setFileModal({ isOpen: true, urls });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 underline flex items-center text-xs sm:text-sm"
                            >
                              <img
                                src={typeof item.image === 'string' ? item.image.split(',')[0].trim() : item.image}
                                alt="Proof"
                                className="h-6 w-6 sm:h-8 sm:w-8 object-cover rounded-md mr-2"
                              />
                              {(typeof item.image === 'string' && item.image.split(',').length > 1) 
                                ? `View ${item.image.split(',').length} Files` 
                                : 'View'}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No file</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Actions">
                          <div className="text-xs sm:text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.status === "yes" || item.status === "done"
                                ? "bg-green-100 text-green-800"
                                : item.status === "no"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}>
                              {item.status || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50 min-w-[120px]" data-label="Reason">
                          <div className="text-xs sm:text-sm text-gray-900" title={item.remark}>
                            {item.remark || "—"}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={(isSuperAdmin ? 18 : 16) - (approvalStatusFilter === 'approved' ? 0 : 1)} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        {searchTerm || selectedMembers.length > 0 || startDate || endDate
                          ? "No records matching your filters"
                          : "No maintenance records found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </>
            ) : activeTab === "checklist" ? (
              /* Checklist Table */
              <>
              {/* Mobile Select All for Checklist */}
              {isSuperAdmin && (
                <div className="sm:hidden flex items-center gap-2 p-2 mx-3 mt-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedHistoryItems.length > 0 && selectedHistoryItems.length === pendingApprovalCount}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-xs font-medium text-purple-700">Select All ({pendingApprovalCount})</span>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200 mobile-card-table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={selectedHistoryItems.length > 0 && selectedHistoryItems.length === pendingApprovalCount}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Status</th>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Admin Remarks</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">Task Description</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Task Start Date</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Submission Date</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Submitted By</th>
                    {approvalStatusFilter === 'approved' && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Approved By</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 min-w-[120px]">Remarks</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((historyItem, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 mobile-checkbox-cell" data-label="Select">
                            {historyItem.admin_done !== 'Done' ? (
                              <input
                                type="checkbox"
                                checked={isItemSelected(historyItem.task_id)}
                                onChange={(e) => handleHistoryItemSelect(historyItem.task_id, e.target.checked)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Admin Status">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            historyItem.admin_done === 'Done'
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}>
                            {historyItem.admin_done === 'Done' ? "Approved" : "Pending"}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Admin Remarks">
                            {historyItem.admin_done !== 'Done' ? (
                              <input
                                type="text"
                                placeholder="Remark..."
                                value={adminRemarks[historyItem.task_id] || ""}
                                onChange={(e) => setAdminRemarks(prev => ({
                                  ...prev,
                                  [historyItem.task_id]: e.target.value
                                }))}
                                disabled={!isItemSelected(historyItem.task_id)}
                                className={`w-full text-xs p-1 border-2 border-purple-300 rounded font-bold focus:border-purple-500 focus:bg-white bg-purple-50 ${
                                  !isItemSelected(historyItem.task_id) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            ) : (
                              <div className="text-xs text-gray-600 font-medium">{historyItem.admin_done_remarks || "—"}</div>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Name">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.name || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[150px]" data-label="Task Description">
                          <div className="text-xs sm:text-sm text-gray-900" title={historyItem.task_description}>
                            {historyItem.task_description || "—"}
                          </div>
                        </td>

                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50" data-label="Task Start Date">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {historyItem.task_start_date ? (() => {
                              const date = parseSupabaseDate(historyItem.task_start_date)
                              if (!date || isNaN(date.getTime())) return "Invalid date"
                              const day = date.getDate().toString().padStart(2, '0')
                              const month = (date.getMonth() + 1).toString().padStart(2, '0')
                              const year = date.getFullYear()
                              return `${day}/${month}/${year}`
                            })() : "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Frequency">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.frequency || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50" data-label="Submission Date">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {historyItem.submission_date ? (() => {
                              const dateObj = new Date(historyItem.submission_date)
                              const day = ("0" + dateObj.getDate()).slice(-2)
                              const month = ("0" + (dateObj.getMonth() + 1)).slice(-2)
                              const year = dateObj.getFullYear()
                              const hours = ("0" + dateObj.getHours()).slice(-2)
                              const minutes = ("0" + dateObj.getMinutes()).slice(-2)
                              return (
                                <div>
                                  <div className="font-medium">{`${day}/${month}/${year}`}</div>
                                  <div className="text-xs text-gray-500">{`${hours}:${minutes}`}</div>
                                </div>
                              )
                            })() : "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50" data-label="Submitted By">
                           <div className="text-xs sm:text-sm text-gray-900 font-medium">{historyItem.submitted_by || "—"}</div>
                        </td>
                        {approvalStatusFilter === 'approved' && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Approved By">
                             <div className="text-xs sm:text-sm text-purple-700 font-bold">{historyItem.approved_by || "—"}</div>
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-blue-50" data-label="Status">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            historyItem.status === "yes"
                              ? "bg-green-100 text-green-800"
                              : historyItem.status === "no"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {historyItem.status || "—"}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Task ID">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{historyItem.task_id || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Department">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.department || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Unit">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.unit || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Division">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.division || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Given By">
                          <div className="text-xs sm:text-sm text-gray-900">{historyItem.given_by || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50 min-w-[120px]" data-label="Remarks">
                          <div className="text-xs sm:text-sm text-gray-900" title={historyItem.remark}>
                            {historyItem.remark || "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="File">
                          {historyItem.image ? (
                            <button
                              onClick={() => {
                                const urls = typeof historyItem.image === 'string' ? historyItem.image.split(',') : [historyItem.image];
                                if (urls.length === 1) {
                                  window.open(urls[0].trim(), "_blank");
                                } else {
                                  setFileModal({ isOpen: true, urls });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 underline flex items-center text-xs sm:text-sm"
                            >
                              <img
                                src={typeof historyItem.image === 'string' ? historyItem.image.split(',')[0].trim() : historyItem.image}
                                alt="Attachment"
                                className="h-6 w-6 sm:h-8 sm:w-8 object-cover rounded-md mr-2"
                              />
                              {(typeof historyItem.image === 'string' && historyItem.image.split(',').length > 1) 
                                ? `View ${historyItem.image.split(',').length} Files` 
                                : 'View'}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No file</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={(isSuperAdmin ? 17 : 15) - (approvalStatusFilter === 'approved' ? 0 : 1)} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        {searchTerm || selectedMembers.length > 0 || startDate || endDate
                          ? "No records matching your filters"
                          : "No completed records found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </>
            ) : (
              /* Delegation Table */
              <table className="min-w-full divide-y divide-gray-200 mobile-card-table">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllDelegation(e.target.checked)}
                          checked={selectedDelegationItems.length > 0 && selectedDelegationItems.length === pendingDelegationApprovalCount}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">Task Description</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 min-w-[120px]">Reply</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given By</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">Status</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">Created At</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">Submitted By</th>
                    {approvalStatusFilter === 'approved' && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Approved By</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extend</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">File</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">Admin Status</th>
                    {isSuperAdmin && (
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">Admin Remarks</th>
                    )}
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedDelegationData.length > 0 ? (
                    paginatedDelegationData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 mobile-checkbox-cell" data-label="Select">
                            {item.admin_done !== 'Done' ? (
                              <input
                                type="checkbox"
                                checked={isDelegationItemSelected(item.id)}
                                onChange={(e) => handleDelegationItemSelect(item.id, e.target.checked)}
                                disabled={item.status !== "completed"}
                                className={`h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded ${
                                  item.status !== "completed" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                }`}
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[150px]" data-label="Task Description">
                          <div className="text-xs sm:text-sm text-gray-900" title={item.task_description}>
                            {item.task_description || "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50 min-w-[120px]" data-label="Reply">
                          <div className="text-xs sm:text-sm text-gray-900" title={item.reason}>
                            {item.reason || "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Given By">
                          <div className="text-xs sm:text-sm text-gray-900">{item.given_by || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Name">
                          <div className="text-xs sm:text-sm text-gray-900">{item.name || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-blue-50" data-label="Status">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : item.status === "extend"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}>
                            {item.status || "—"}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-yellow-50" data-label="Created At">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {formatDateForDisplay(item.created_at)}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 bg-green-50" data-label="Submitted By">
                           <div className="text-xs sm:text-sm text-gray-900 font-medium">{item.submitted_by || "—"}</div>
                        </td>
                        {approvalStatusFilter === 'approved' && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Approved By">
                             <div className="text-xs sm:text-sm text-purple-700 font-bold">{item.approved_by || "—"}</div>
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Extend">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {item.next_extend_date ? formatDateForDisplay(item.next_extend_date) : "—"}
                          </div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[100px]" data-label="File">
                          {item.image_url ? (
                            <button
                              onClick={() => {
                                const urls = typeof item.image_url === 'string' ? item.image_url.split(',') : [item.image_url];
                                if (urls.length === 1) {
                                  window.open(urls[0].trim(), "_blank");
                                } else {
                                  setFileModal({ isOpen: true, urls });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 underline flex items-center text-xs sm:text-sm"
                            >
                              <img
                                src={typeof item.image_url === 'string' ? item.image_url.split(',')[0].trim() : item.image_url}
                                alt="Attachment"
                                className="h-6 w-6 sm:h-8 sm:w-8 object-cover rounded-md mr-2"
                              />
                              {(typeof item.image_url === 'string' && item.image_url.split(',').length > 1) 
                                ? `View ${item.image_url.split(',').length} Files` 
                                : 'View'}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No file</span>
                          )}
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 min-w-[120px]" data-label="Admin Status">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.admin_done === 'Done'
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}>
                            {item.admin_done === 'Done' ? "Approved" : "Pending"}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-2 sm:px-3 py-2 sm:py-4 bg-purple-50" data-label="Admin Remarks">
                            {item.admin_done !== 'Done' ? (
                              <input
                                type="text"
                                placeholder="Remark..."
                                value={adminRemarks[item.id] || ""}
                                onChange={(e) => setAdminRemarks(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                disabled={!isDelegationItemSelected(item.id)}
                                className={`w-full text-xs p-1 border-2 border-purple-300 rounded font-bold focus:border-purple-500 focus:bg-white bg-purple-50 ${
                                  !isDelegationItemSelected(item.id) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            ) : (
                              <div className="text-xs text-gray-600 font-medium">{item.admin_done_remarks || "—"}</div>
                            )}
                          </td>
                        )}
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Task ID">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">{item.task_id || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Department">
                          <div className="text-xs sm:text-sm text-gray-900">{item.department || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Unit">
                          <div className="text-xs sm:text-sm text-gray-900">{item.unit || "—"}</div>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4" data-label="Division">
                          <div className="text-xs sm:text-sm text-gray-900">{item.division || "—"}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={(isSuperAdmin ? 16 : 14) - (approvalStatusFilter === 'approved' ? 0 : 1)} className="px-4 sm:px-6 py-4 text-center text-gray-500 text-xs sm:text-sm">
                        {searchTerm || startDate || endDate
                          ? "No records matching your filters"
                          : "No delegation records found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-t border-gray-200">
            {activeTab === "maintenance" ? (
              <>
                <span className="text-xs text-gray-600">
                  {filteredMaintenanceData.length > 0
                    ? `Showing ${maintStartRecord}–${maintEndRecord} of ${filteredMaintenanceData.length} records (${maintTotalCount} in database)`
                    : "No records"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMaintCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={maintCurrentPage === 1 || maintLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" /> Previous
                  </button>
                  <span className="text-xs font-medium text-gray-700">
                    Page {maintCurrentPage} of {maintTotalPages}
                  </span>
                  <button
                    onClick={() => setMaintCurrentPage(prev => Math.min(prev + 1, maintTotalPages))}
                    disabled={maintCurrentPage >= maintTotalPages || maintLoading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : activeTab === "delegation" ? (
              <>
                <span className="text-xs text-gray-600">
                  {filteredDelegationData.length > 0
                    ? `Showing ${delegationStartRecord}–${delegationEndRecord} of ${delegationTotalCount} records`
                    : "No records"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDelegationCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={delegationCurrentPage === 1 || loading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" /> Previous
                  </button>
                  <span className="text-xs font-medium text-gray-700">
                    Page {delegationCurrentPage} of {delegationTotalPagesDerived}
                  </span>
                  <button
                    onClick={() => setDelegationCurrentPage(prev => Math.min(prev + 1, delegationTotalPagesDerived))}
                    disabled={delegationCurrentPage >= delegationTotalPagesDerived || loading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-600">
                  {filteredHistoryData.length > 0
                    ? `Showing ${startRecord}–${endRecord} of ${historyTotalCount} records`
                    : "No records"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" /> Previous
                  </button>
                  <span className="text-xs font-medium text-gray-700">
                    Page {currentPage} of {totalPagesDerived}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesDerived))}
                    disabled={currentPage >= totalPagesDerived || loading}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          itemCount={confirmationModal.itemCount}
          onConfirm={confirmMarkDone}
          onCancel={() => setConfirmationModal({ isOpen: false, itemCount: 0, type: "checklist" })}
        />

        {/* File Modal */}
        <FileModal
          isOpen={fileModal.isOpen}
          urls={fileModal.urls}
          onClose={() => setFileModal({ isOpen: false, urls: [] })}
        />
      </div>
    </AdminLayout>
  )
}

export default HistoryPage
