import { authFetch } from "../utils/authFetch";
"use client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Trash2, X } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { deleteDelegationTask, uniqueDelegationTaskData } from "../redux/slice/quickTaskSlice"
import { hasModifyAccess } from "../utils/permissionUtils"

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzXzqnKmbeXw3i6kySQcBOwxHQA7y8WBFfEe69MPbCR-jux0Zte7-TeSKi8P4CIFkhE/exec",
  DRIVE_FOLDER_ID: "1LPsmRqzqvp6b7aY9FS1NfiiK0LV03v03",
  SOURCE_SHEET_NAME: "Delegation",
  TARGET_SHEET_NAME: "Delegation Done",
  PAGE_CONFIG: {
    title: "Pending Delegation Tasks",
    description: "Showing all pending tasks",
  },
}



function DelegationPage({ searchTerm, nameFilter, deptFilter, divFilter, freqFilter, userRole, userDept, userDiv, userName }) {
 const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [isDeleting, setIsDeleting] = useState(false)

  const { delegationTasks, loading, delegationTotal } = useSelector((state) => state.quickTask)
  const dispatch = useDispatch()
useEffect(()=>{
  dispatch(uniqueDelegationTaskData({ 
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
    userName,
    search: searchTerm
  }))
},[dispatch, nameFilter, deptFilter, divFilter, freqFilter, userRole, userDept, userDiv, userName, searchTerm])

 // Handle checkbox selection
  const handleCheckboxChange = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(task_id => task_id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  // Select all checkboxes
  const handleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredTasks.map(task => task.task_id))
    }
  }

  // Delete selected tasks
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return
    
    setIsDeleting(true)
    try {
      console.log(selectedTasks);
      
      await dispatch(deleteDelegationTask(selectedTasks)).unwrap()
      setSelectedTasks([])
      setSuccessMessage("Tasks deleted successfully")
      // Refresh the task list
      dispatch(uniqueDelegationTaskData({ 
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
        userName 
      }))
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Failed to delete tasks:", error)
      setError("Failed to delete tasks")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDateTime = useCallback((dateStr) => {
    if (!dateStr) return "—"
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateStr
    }
  }, [])

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  //   try {
  //   //  setLoading(true)
  //     setError(null)

  //     const tasksRes = await authFetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SOURCE_SHEET_NAME}&action=fetch`)

  //     if (!tasksRes.ok) throw new Error("Failed to fetch tasks")
      
  //     const tasksData = await tasksRes.json()

  //     const currentUsername = username.toLowerCase()
  //     const processedTasks = tasksData.table.rows.slice(1).map((row, index) => {
  //       const rowData = {
  //         _id: `task_${index}_${Math.random().toString(36).substr(2, 9)}`,
  //         _rowIndex: index + 2,
  //       }

  //       row.c.forEach((cell, colIndex) => {
  //         rowData[`col${colIndex}`] = cell?.v || ""
  //       })

  //       return rowData
  //     }).filter(task => 
  //       userRole === "admin" || 
  //       task.col4?.toLowerCase() === currentUsername
  //     )

  //     setTasks(processedTasks)
  //     setLoading(false)
  //   } catch (err) {
  //     console.error("Error fetching data:", err)
  //     setError("Failed to load data: " + err.message)
  //     setLoading(false)
  //   }
  // }, [userRole, username, isInitialized])

  useEffect(() => {
    if (isInitialized) {
     // fetchData()
     dispatch(uniqueDelegationTaskData({ 
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
       userName,
       search: searchTerm
     }))
    }
  }, [dispatch, isInitialized, nameFilter, deptFilter, divFilter, freqFilter, userRole, userDept, userDiv, userName, searchTerm])

  const filteredTasks = useMemo(() => {
    let filtered = [...delegationTasks]; // Create a copy to sort
    
    // 1. Role-based restrictions (Enforce organizational boundaries)
    const role = userRole?.toLowerCase()?.trim();
    const targetDept = userDept?.toLowerCase()?.trim();
    const targetDiv = userDiv?.toLowerCase()?.trim();
    const targetName = userName?.toLowerCase()?.trim();

    filtered = filtered.filter(task => {
      if (role === 'admin') {
        // Admin: Only show tasks within their Division AND Department
        return task.division?.toLowerCase()?.trim() === targetDiv && 
               (task.department || task.user_access)?.toLowerCase()?.trim() === targetDept;
      } else if (role === 'div_admin') {
        // Division Admin: Only show tasks within their Division
        return task.division?.toLowerCase()?.trim() === targetDiv;
      } else if (role === 'user') {
        // User: Only show tasks assigned to them
        return task.name?.toLowerCase()?.trim() === targetName;
      }
      return true; // super_admin sees all
    });

    // 2. Applied Filters (Name, Dept, etc. - Search is now handled by backend)

    if (nameFilter) {
      filtered = filtered.filter(task => task.name === nameFilter)
    }

    if (deptFilter) {
      filtered = filtered.filter(task => (task.department || task.user_access) === deptFilter)
    }

    if (divFilter) {
      filtered = filtered.filter(task => task.division === divFilter)
    }
    
    if (freqFilter) {
      filtered = filtered.filter(task => task.frequency === freqFilter)
    }

    return filtered
  }, [delegationTasks, searchTerm, nameFilter, deptFilter, divFilter, freqFilter, userRole, userName, userDept, userDiv])

  

  return (
    <>
      {/* Success Message - Fixed position */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700 ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button 
            onClick={() => dispatch(uniqueDelegationTaskData({ 
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
              userName 
            }))}
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State
      {(!isInitialized || loading) && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading delegation data...</p>
        </div>
      )} */}

      {/* Main Content */}
      {!error && isInitialized && !loading && (
         <div className="mt-4 rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-purple-700 font-medium">Delegation Tasks</h2>
              <p className="text-purple-600 text-sm">
                {CONFIG.PAGE_CONFIG.description} ({userRole?.toLowerCase() === 'user' ? filteredTasks.length : delegationTotal} tasks)
              </p>
            </div>
            
            {/* Delete selected button */}
            {selectedTasks.length > 0 && hasModifyAccess("quick_task") && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : `Delete (${selectedTasks.length})`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3 p-3">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.task_id)}
                          onChange={() => handleCheckboxChange(task.task_id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                      <div className="text-xs text-gray-500">
                        ID: {task.task_id || "—"}
                      </div>
                    </div>
                    
                    {/* Task Description */}
                    <p className="text-sm font-medium text-gray-900 mb-2">{task.task_description || "-"}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Name */}
                      <div>
                        <span className="text-gray-500">Name:</span>{' '}
                        <span className="font-medium">{task.name || "-"}</span>
                      </div>
                      
                      {/* Department */}
                      <div>
                        <span className="text-gray-500">Dept:</span>{' '}
                        <span className="font-medium">{task.department || "-"}</span>
                      </div>

                      {/* Unit */}
                      <div>
                        <span className="text-gray-500">Unit:</span>{' '}
                        <span className="font-medium">{task.unit || "-"}</span>
                      </div>
                      
                      {/* Division */}
                      <div>
                        <span className="text-gray-500">Div:</span>{' '}
                        <span className="font-medium">{task.division || "-"}</span>
                      </div>
                      
                      {/* Given By */}
                      <div>
                        <span className="text-gray-500">Given By:</span>{' '}
                        <span className="font-medium">{task.given_by || "-"}</span>
                      </div>
                      
                      {/* Start Date */}
                      <div>
                        <span className="text-gray-500">Start:</span>{' '}
                        <span className="font-medium">{formatDateTime(task.task_start_date)}</span>
                      </div>
                      
                      {/* End Date */}
                      <div>
                        <span className="text-gray-500">End:</span>{' '}
                        <span className="font-medium">{formatDateTime(task.planned_date)}</span>
                      </div>
                      
                      {/* Reminder */}
                      <div>
                        <span className="text-gray-500">Reminder:</span>{' '}
                        <span className="font-medium">{task.enable_reminder || "-"}</span>
                      </div>
                      
                      {/* Attachment */}
                      <div>
                        <span className="text-gray-500">Attachment:</span>{' '}
                        <span className="font-medium">{task.require_attachment || "-"}</span>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-400">
                        Created: {formatDateTime(task.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  {searchTerm || nameFilter || freqFilter
                    ? "No tasks matching your filters"
                    : "No pending tasks found"}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TIMESTAMP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TASK ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GIVEN BY
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                    TASK DESCRIPTION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                    TASK START DATE
                  </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                    PLANNED DATE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DEPARTMENT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UNIT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DIVISION
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FREQ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ENABLE REMINDERS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    REQUIRE ATTACHMENT
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task,index) => (
                     <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.task_id)}
                          onChange={() => handleCheckboxChange(task.task_id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDateTime(task.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.task_id || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.given_by || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 min-w-[300px] max-w-[400px]">
                        <div className="whitespace-normal break-words">
                          {task.task_description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                        {formatDateTime(task.task_start_date)}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 bg-yellow-50">
                        {formatDateTime(task.planned_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.department || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.unit || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.division || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.frequency === 'Daily' ? 'bg-blue-100 text-blue-800' :
                          task.frequency === 'Weekly' ? 'bg-green-100 text-green-800' :
                          task.frequency === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.frequency || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.enable_reminder || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.require_attachment|| "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm || nameFilter || freqFilter 
                        ? "No tasks matching your filters" 
                        : "No pending tasks found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default DelegationPage