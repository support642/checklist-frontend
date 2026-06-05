"use client"

import { Filter, ChevronDown, ChevronUp } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useDispatch } from "react-redux"
import { fetchDashboardDataApi, getDashboardDataCount } from "../../../redux/api/dashboardApi"
import { updateChecklistData } from "../../../redux/api/checkListApi"
import { insertDelegationDoneAndUpdate } from "../../../redux/api/delegationApi"
import { CheckCircle2, Circle } from "lucide-react"

export default function TaskNavigationTabs({
  dashboardType,
  taskView,
  setTaskView,
  searchQuery,
  setSearchQuery,
  filterStaff,
  setFilterStaff,
  departmentData,
  getFrequencyColor,
  dashboardStaffFilter,
  departmentFilter, // Add this prop
  username,
  userRole,
  onTaskComplete
}) {
  const dispatch = useDispatch()
  const [currentPage, setCurrentPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false) // Add this state
  const itemsPerPage = 50

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedTasks([])
    setHasMoreData(true)
    setTotalCount(0)
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter]) // Add departmentFilter

  // Function to load tasks from server
  const loadTasksFromServer = useCallback(async (page = 1, append = false) => {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true)


      // Use departmentFilter for server call (only affects table data)
      const data = await fetchDashboardDataApi(
        dashboardType,
        dashboardStaffFilter,
        page,
        itemsPerPage,
        taskView,
        departmentFilter // Pass department filter to API
      )

      // Get total count for this view (only on first load)
      if (page === 1) {
        const count = await getDashboardDataCount(dashboardType, dashboardStaffFilter, taskView, departmentFilter)
        setTotalCount(count)
      }

      if (!data || data.length === 0) {
        setHasMoreData(false)
        if (!append) {
          setDisplayedTasks([])
        }
        setIsLoadingMore(false)
        return
      }


      // Process the data similar to your existing logic
      const processedTasks = data.map((task) => {
        const taskStartDate = parseTaskStartDate(task.task_start_date)
        const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null

        let status = "pending"
        if (completionDate || task.status === 'Yes') {
          status = "completed"
        } else if (taskStartDate && isDateInPast(taskStartDate)) {
          status = "overdue"
        }

        return {
          id: task.task_id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: formatDateToDDMMYYYY(taskStartDate),
          originalTaskStartDate: task.task_start_date,
          status,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
          department: task.department || "N/A", // Add department field
          // Pass raw items for completion logic
          _raw: task
        }
      })


      // Apply client-side search filter if needed
      let filteredTasks = processedTasks.filter((task) => {
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


      if (append) {
        setDisplayedTasks(prev => [...prev, ...filteredTasks])
      } else {
        setDisplayedTasks(filteredTasks)
      }

      // Check if we have more data
      setHasMoreData(data.length === itemsPerPage)

    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [dashboardType, dashboardStaffFilter, taskView, searchQuery, departmentFilter, isLoadingMore, itemsPerPage])

  // Helper functions
  const parseTaskStartDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dateStr)
      return isNaN(parsed) ? null : parsed
    }

    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")
      const datePart = parts[0]
      const dateComponents = datePart.split("/")
      if (dateComponents.length !== 3) return null

      const [day, month, year] = dateComponents.map(Number)
      if (!day || !month || !year) return null

      const date = new Date(year, month - 1, day)
      if (parts.length > 1) {
        const timePart = parts[1]
        const timeComponents = timePart.split(":")
        if (timeComponents.length >= 2) {
          const [hours, minutes, seconds] = timeComponents.map(Number)
          date.setHours(hours || 0, minutes || 0, seconds || 0)
        }
      }
      return isNaN(date) ? null : date
    }

    const parsed = new Date(dateStr)
    return isNaN(parsed) ? null : parsed
  }

  const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return ""
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isDateInPast = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Initial load when component mounts or key dependencies change
  useEffect(() => {
    loadTasksFromServer(1, false)
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter])

  // Load more when search changes (client-side filter)
  useEffect(() => {
    if (currentPage === 1) {
      loadTasksFromServer(1, false)
    }
  }, [searchQuery])

  // Reset local staff filter when dashboardStaffFilter changes
  useEffect(() => {
    if (dashboardStaffFilter !== "all") {
      setFilterStaff("all")
    }
  }, [dashboardStaffFilter])

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadTasksFromServer(nextPage, true)
    }
  }

  // Handle scroll event for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreData || isLoadingMore) return

      const tableContainer = document.querySelector('.task-table-container')
      if (!tableContainer) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2

      if (isNearBottom) {
        loadMoreData()
      }
    }

    const tableContainer = document.querySelector('.task-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreData, isLoadingMore, currentPage])

  const handleTaskCompletion = async (task) => {
    try {
      const isChecklist = dashboardType === "checklist";
      
      // Determine if allowed: Only if task assigned to current user
      const isAssignedToMe = task.assignedTo?.toLowerCase() === username?.toLowerCase();
      
      if (!isAssignedToMe) return;

      if (confirm(`Are you sure you want to mark "${task.title}" as done?`)) {
         if (isChecklist) {
            await updateChecklistData([{
              taskId: task.id,
              status: "yes",
              remarks: "",
              image: null,
              submittedBy: username
            }]);
         } else {
            // Delegation
            const rawTask = task._raw;
            await dispatch(insertDelegationDoneAndUpdate({
              selectedDataArray: [{
                task_id: rawTask.task_id,
                given_by: rawTask.given_by,
                name: rawTask.name,
                task_description: rawTask.task_description,
                task_start_date: rawTask.task_start_date,
                planned_date: rawTask.planned_date,
                status: "done",
                next_extend_date: null,
                reason: "",
                image_base64: null,
                submittedBy: username
              }]
            })).unwrap();
         }

          // Trigger refresh
          if (onTaskComplete) onTaskComplete();
          loadTasksFromServer(1, false);
      }
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Failed to complete task");
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-3">
        <button
          className={`py-3 text-center font-medium transition-colors ${taskView === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("recent")}
        >
          {dashboardType === "delegation" ? "Today Tasks" : "Recent Tasks"}
        </button>
        <button
          className={`py-3 text-center font-medium transition-colors ${taskView === "upcoming" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("upcoming")}
        >
          {dashboardType === "delegation" ? "Future Tasks" : "Upcoming Tasks"}
        </button>
        <button
          className={`py-3 text-center font-medium transition-colors ${taskView === "overdue" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          onClick={() => setTaskView("overdue")}
        >
          Overdue Tasks
        </button>
      </div>

      <div className="p-4">
        {/* Accordion Filter Section */}
        <div className="mb-4 border border-gray-200 rounded-lg">
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-700">Filters</span>
              {(searchQuery || dashboardStaffFilter !== "all" || departmentFilter !== "all") && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                  Active
                </span>
              )}
            </div>
            {isFilterExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            )}
          </button>

          {isFilterExpanded && (
            <div className="p-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    Search Tasks
                  </label>
                  <input
                    id="search"
                    placeholder="Search by task title or ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Active Filters Display */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Active Filters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dashboardStaffFilter !== "all" && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Staff: {dashboardStaffFilter}
                      </span>
                    )}
                    {departmentFilter !== "all" && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        Department: {departmentFilter}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Search: {searchQuery}
                      </span>
                    )}
                    {!dashboardStaffFilter || dashboardStaffFilter === "all" &&
                      !departmentFilter || departmentFilter === "all" &&
                      !searchQuery && (
                        <span className="text-xs text-gray-500">No active filters</span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Show total count */}
        {totalCount > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Total {taskView} tasks: {totalCount} | Showing: {displayedTasks.length}
            {(dashboardStaffFilter !== "all" || departmentFilter !== "all") && (
              <div className="mt-1 text-xs">
                {dashboardStaffFilter !== "all" && (
                  <span className="mr-3">Filtered by Staff: {dashboardStaffFilter}</span>
                )}
                {departmentFilter !== "all" && (
                  <span>Filtered by Department: {departmentFilter}</span>
                )}
              </div>
            )}
          </div>
        )}

        {displayedTasks.length === 0 && !isLoadingMore ? (
          <div className="text-center p-8 text-gray-500">
            <p>No tasks found for {taskView} view.</p>
            {(dashboardStaffFilter !== "all" || departmentFilter !== "all") && (
              <p className="text-sm mt-2">Try adjusting your filters to see more results.</p>
            )}
          </div>
        ) : (
          <div
            className="task-table-container overflow-y-auto"
            style={{ maxHeight: "400px" }}
          >
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seq No.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  {dashboardType === "checklist" && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Start Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedTasks.map((task, index) => {
                  // Calculate sequence number - starts from 1 for the first item
                  const sequenceNumber = index + 1;

                  return (
                    <tr key={`${task.id}-${task.taskStartDate}-${index}`} className="hover:bg-gray-50">
                      {/* Add Sequence Number Cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        {sequenceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.status === "completed" ? (
                           <span className="flex items-center text-green-600 gap-1">
                             <CheckCircle2 size={16} /> Done
                           </span>
                        ) : (
                           /*(userRole === 'admin' || userRole === 'super_admin') && 
                           task.assignedTo?.toLowerCase() === username?.toLowerCase() ? (
                             <button 
                               onClick={() => handleTaskCompletion(task)}
                               className="flex items-center text-gray-400 hover:text-green-600 gap-1 transition-colors"
                               title="Mark as Done"
                             >
                               <Circle size={16} /> Mark Done
                             </button>
                           ) : */(
                             <span className="text-gray-400 text-xs">Pending</span>
                           )
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{task.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignedTo}</td>
                      {dashboardType === "checklist" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.department}</td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.taskStartDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}>
                          {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-3">
              {displayedTasks.map((task, index) => {
                const sequenceNumber = index + 1;
                
                return (
                  <div key={`mobile-${task.id}-${task.taskStartDate}-${index}`} className="p-3 border rounded-lg shadow-sm bg-white border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-gray-400">#{sequenceNumber}</span>
                       </div>
                       <div>
                         {task.status === "completed" ? (
                            <span className="flex items-center text-green-600 gap-1 text-[10px] font-bold uppercase shadow-sm bg-green-100 px-2 py-1 rounded-full border border-green-200">
                              <CheckCircle2 size={12} /> Done
                            </span>
                         ) : (
                            /*(userRole === 'admin' || userRole === 'super_admin') && 
                            task.assignedTo?.toLowerCase() === username?.toLowerCase() ? (
                              <button 
                                onClick={() => handleTaskCompletion(task)}
                                className="flex items-center text-purple-600 hover:text-purple-800 gap-1 transition-colors text-[10px] font-bold uppercase shadow-sm bg-purple-50 px-2 py-1 rounded-full border border-purple-200"
                                title="Mark as Done"
                              >
                                <Circle size={12} /> Mark Done
                              </button>
                            ) : */(
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>
                            )
                         )}
                       </div>
                    </div>
                    
                    <div className="text-sm font-medium mb-1 text-gray-800">{task.title}</div>
                    
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1 mt-2">
                       <span>ID: {task.id}</span>
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getFrequencyColor(task.frequency)} text-white`}>
                         {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                       </span>
                    </div>
                    
                    <div className="flex justify-between text-[10px] mb-1">
                       <span className="text-gray-600">Start Date: {task.taskStartDate}</span>
                       <span className="text-gray-600 font-medium truncate max-w-[120px]">Assignee: {task.assignedTo}</span>
                    </div>
                    
                    {dashboardType === "checklist" && task.department && task.department !== "N/A" && (
                      <div className="text-[10px] text-gray-500 mt-1 flex gap-1">
                        <span className="font-semibold">Dept:</span> {task.department}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading more tasks...</p>
              </div>
            )}

            {!hasMoreData && displayedTasks.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No more tasks to load
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
