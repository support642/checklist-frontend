import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CheckCircle2, Trash2, X, Edit, Save } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { deleteUniqueMaintenanceTask, uniqueMaintenanceTaskData, updateUniqueMaintenanceTask, resetUniqueMaintenancePagination, fetchMaintenanceCounts } from "../redux/slice/maintenanceSlice";
import { hasModifyAccess } from "../utils/permissionUtils";

const CONFIG = {
  PAGE_CONFIG: {
    description: "Showing all unique maintenance tasks",
  },
};

function MaintenanceQuickTaskPage({ searchTerm, nameFilter, deptFilter, divFilter, freqFilter, userRole, userDept, userDiv, userName }) {
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPartNames, setExpandedPartNames] = useState({});


  const { uniqueMaintenanceTasks, loading, uniqueMaintenanceHasMore, uniqueMaintenancePage, uniqueMaintenanceTotal } = useSelector((state) => state.maintenance);
  const dispatch = useDispatch();
  const tableContainerRef = useRef(null);

  useEffect(() => {
    dispatch(resetUniqueMaintenancePagination());
    dispatch(uniqueMaintenanceTaskData({ 
      page: 0, 
      pageSize: 50, 
      nameFilter: nameFilter, 
      deptFilter: deptFilter,
      divFilter: divFilter,
      freqFilter: freqFilter, 
      append: false,
      userRole,
      userDept,
      userDiv,
      userName,
      search: searchTerm
    }));
  }, [dispatch, nameFilter, deptFilter, divFilter, freqFilter, userRole, userDept, userDiv, userName, searchTerm]);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Handle Infinite Scroll
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    
    // Check if scrolled near bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (uniqueMaintenanceHasMore) {
        dispatch(uniqueMaintenanceTaskData({ 
          page: uniqueMaintenancePage, 
          pageSize: 50, 
          nameFilter,
          deptFilter,
          divFilter,
          freqFilter,
          append: true,
          userRole,
          userDept,
          userDiv,
          userName,
          search: searchTerm
        }));
      }
    }
  }, [loading, uniqueMaintenanceHasMore, uniqueMaintenancePage, nameFilter, deptFilter, divFilter, freqFilter, dispatch, userRole, userDept, userDiv, userName, searchTerm]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Handle Edit Click
  const handleEditClick = (task) => {
    setEditingTaskId(task.task_id);
    setEditFormData({
      task_id: task.task_id,
      department: task.department || '',
      unit: task.unit || '',
      division: task.division || '',
      task_description: task.task_description || '',
      machine_name: task.machine_name || '',
      part_name: Array.isArray(task.part_name) ? task.part_name.join(', ') : (task.part_name || ''),
      part_area: task.part_area || '',
      given_by: task.given_by || '',
      name: task.name || '',
      frequency: task.frequency || '',
      duration: task.duration || '',
      status: task.status || '',
      remark: task.remark || '',
      machine_department: task.machine_department || '',
      machine_division: task.machine_division || '',
      enable_reminder: task.enable_reminder ?? false,
      require_attachment: task.require_attachment || 'no',
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editFormData.task_id) return;

    const originalTask = uniqueMaintenanceTasks.find(task => task.task_id === editFormData.task_id);
    if (!originalTask) return;

    setIsSaving(true);
    try {
      await dispatch(updateUniqueMaintenanceTask({
        updatedTask: editFormData,
        originalTask: {
          name: originalTask.name,
          task_description: originalTask.task_description
        }
      })).unwrap();

      setEditingTaskId(null);
      setEditFormData({});

      // Refresh
      dispatch(uniqueMaintenanceTaskData({ 
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
      }));
      
      dispatch(fetchMaintenanceCounts({ userRole, userDept, userDiv, userName }));

    } catch (error) {
      console.error("Failed to update task:", error);
      setError("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePartName = (taskId) => {
    setExpandedPartNames((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Handle checkbox selection
  const handleCheckboxChange = (task) => {
    const alreadySelected = selectedTasks.find(t => t.task_id === task.task_id);
    if (alreadySelected) {
      setSelectedTasks(selectedTasks.filter(t => t.task_id !== task.task_id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  // Select all
  const handleSelectAll = (filteredData) => {
    if (selectedTasks.length === filteredData.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredData);
    }
  };

  // Delete
  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;
    
    setIsDeleting(true);
    try {
      await dispatch(deleteUniqueMaintenanceTask(selectedTasks)).unwrap();
      setSelectedTasks([]);
      setSuccessMessage("Tasks deleted successfully");
      
      // Refresh
      dispatch(uniqueMaintenanceTaskData({ 
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
      }));

      dispatch(fetchMaintenanceCounts({ userRole, userDept, userDiv, userName }));
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      setError("Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let filtered = [...(uniqueMaintenanceTasks || [])]; // Create a copy to sort
    
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
    
    if (deptFilter) {
      filtered = filtered.filter(task => (task.department || task.user_access) === deptFilter);
    }

    if (divFilter) {
      filtered = filtered.filter(task => task.division === divFilter);
    }

    if (freqFilter) {
      filtered = filtered.filter(task => task.frequency === freqFilter);
    }

    return filtered;
  }, [uniqueMaintenanceTasks, nameFilter, deptFilter, divFilter, freqFilter, userRole, userName, userDept, userDiv]);

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center shadow-lg">
          <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
          {successMessage}
          <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700 ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-800 text-center">
          {error}{" "}
          <button 
            onClick={() => dispatch(uniqueMaintenanceTaskData({ page: 0, pageSize: 50, nameFilter, deptFilter, divFilter, freqFilter, append: false, userRole, userDept, userDiv, userName, search: searchTerm }))} 
            className="underline ml-2 hover:text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {loading && uniqueMaintenanceTasks.length === 0 && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
          <p className="text-purple-600">Loading maintenance data...</p>
        </div>
      )}

      {!error && isInitialized && (!loading || uniqueMaintenanceTasks.length > 0) && (
        <div className="mt-4 rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="text-purple-700 font-medium text-sm sm:text-base">Maintenance Tasks</h2>
              <p className="text-purple-600 text-sm mt-1">
                {CONFIG.PAGE_CONFIG.description} ({uniqueMaintenanceTotal} tasks)
              </p>
            </div>
            {selectedTasks.length > 0 && hasModifyAccess("quick_task") && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-purple-600">{selectedTasks.length} task(s) selected</span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  <Trash2 size={16} />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>

          <div 
            ref={tableContainerRef}
            className="flex-1 overflow-auto custom-scrollbar"
          >
            {/* Mobile View */}
            <div className="sm:hidden space-y-3 p-3">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTasks.some(t => t.task_id === task.task_id)}
                            onChange={() => handleCheckboxChange(task)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className={`px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800`}>
                            {task.frequency || "—"}
                          </span>
                       </div>
                       {hasModifyAccess("quick_task") && (
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
                          <input type="text" value={editFormData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.name || "—"}</span>)}
                      </div>
                      
                      {/* Machine Name */}
                      <div>
                        <span className="text-gray-500">Machine:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_name} onChange={(e) => handleInputChange('machine_name', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.machine_name || "—"}</span>)}
                      </div>

                      {/* Machine Dept */}
                      <div>
                        <span className="text-gray-500">Dept:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_department} onChange={(e) => handleInputChange('machine_department', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.machine_department || "—"}</span>)}
                      </div>

                      {/* Machine Div */}
                      <div>
                        <span className="text-gray-500">Div:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_division} onChange={(e) => handleInputChange('machine_division', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.machine_division || "—"}</span>)}
                      </div>
                      
                      {/* Part Name */}
                      <div className="col-span-2 mt-1">
                        <span className="text-gray-500">Part:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.part_name} onChange={(e) => handleInputChange('part_name', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (() => {
                          const partNameStr = Array.isArray(task.part_name) ? task.part_name.join(', ') : (task.part_name || "—");
                          const isExpanded = expandedPartNames[task.task_id];
                          const shouldTruncate = partNameStr.length > 80;
                          return (
                            <div className="inline-flex flex-col ml-1 align-top max-w-[calc(100%-40px)] w-full overflow-hidden">
                              <div className={`font-medium w-full ${isExpanded ? "max-h-[100px] overflow-y-auto overflow-x-hidden" : "line-clamp-2 text-xs overflow-hidden"}`}>
                                <div className="break-words whitespace-normal text-xs pr-1" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}>
                                  {partNameStr}
                                </div>
                              </div>
                              {shouldTruncate && (
                                <button
                                  onClick={() => togglePartName(task.task_id)}
                                  className="text-purple-600 text-[10px] font-bold hover:underline mt-1 text-left w-fit uppercase"
                                >
                                  {isExpanded ? "Show Less" : "Show More"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Part Area */}
                      <div>
                        <span className="text-gray-500">Area:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.part_area} onChange={(e) => handleInputChange('part_area', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.part_area || "—"}</span>)}
                      </div>
                      
                      {/* Given By (Assign From) */}
                      <div>
                        <span className="text-gray-500">Assigned By:</span>{' '}
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.given_by} onChange={(e) => handleInputChange('given_by', e.target.value)} className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs mt-1" />
                        ) : (<span className="font-medium">{task.given_by || "—"}</span>)}
                      </div>

                      {/* Status */}
                      <div>
                        <span className="text-gray-500">Status:</span>{' '}
                        <span className={`font-medium ${
                          task.status === "Transferred Pending" ? "text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200" : ""
                        }`}>
                          {task.status || "—"}
                        </span>
                      </div>

                      {/* Transferred From info for Mobile */}
                      {task.is_transferred && (
                        <div className="col-span-2 mt-2 p-2 bg-orange-50 border border-orange-100 rounded-md">
                          <span className="text-orange-700 font-bold uppercase text-[10px] block mb-1">Transferred Task</span>
                          <span className="text-gray-600">From: </span>
                          <span className="font-semibold text-gray-900">{task.transferred_from || task.given_by}</span>
                        </div>
                      )}

                      {/* Planned Date */}
                      <div>
                        <span className="text-gray-500">Planned:</span>{' '}
                        <span className="font-medium">{task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                   {searchTerm || nameFilter || freqFilter ? "No tasks matching your filters" : "No maintenance tasks available"}
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
                      checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                      onChange={() => handleSelectAll(filteredTasks)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-[48px] z-30 shadow-[1px_0_0_0_rgba(229,231,235,1)]">
                    ACTIONS
                  </th>
                  {[
                    { key: 'task_description', label: 'Task Description', minWidth: 'whitespace-nowrap' },
                    { key: 'name', label: 'Name', minWidth: 'min-w-[180px]' },
                    { key: 'given_by', label: 'Assign From', minWidth: 'min-w-[180px]' },
                    { key: 'task_start_date', label: 'Start Date' },
                    { key: 'planned_date', label: 'Planned Date' },
                    { key: 'frequency', label: 'Frequency' },
                    { key: 'task_id', label: 'Task ID' },
                    { key: 'machine_name', label: 'Machine Name' },
                    { key: 'part_name', label: 'Part Name' },
                    { key: 'part_area', label: 'Part Area' },
                    { key: 'machine_department', label: 'Dept' },
                    { key: 'machine_division', label: 'Div' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'status', label: 'Status' },
                    { key: 'remark', label: 'Remarks' },
                  ].map((column) => (
                    <th
                      key={column.label}
                      className={`px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.minWidth || ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap bg-white sticky left-0 z-10">
                        <input
                          type="checkbox"
                          checked={selectedTasks.some(t => t.task_id === task.task_id)}
                          onChange={() => handleCheckboxChange(task)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500 bg-white sticky left-[48px] z-10 shadow-[1px_0_0_0_rgba(229,231,235,1)]">
                        {editingTaskId === task.task_id ? (
                          <div className="flex gap-2 flex-col xl:flex-row">
                            <button onClick={handleSaveEdit} disabled={isSaving} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 justify-center">
                              <Save size={14} />
                              {isSaving ? '...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 justify-center">
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          hasModifyAccess("quick_task") && (
                          <button onClick={() => handleEditClick(task)} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 justify-center">
                            <Edit size={14} />
                            Edit
                          </button>
                          )
                        )}
                      </td>

                      {/* Task Description */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 max-w-xs">
                        {editingTaskId === task.task_id ? (
                          <textarea value={editFormData.task_description} onChange={(e) => handleInputChange('task_description', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" rows="3" />
                        ) : (
                          <div className="break-words">{task.task_description || "—"}</div>
                        )}
                      </td>

                      {/* Name */}
                      {/* Name */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 min-w-[180px]">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (
                          <div className="break-words">
                            {task.name || "—"}
                          </div>
                        )}
                      </td>

                      {/* Assign From / Given By */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 min-w-[180px]">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.given_by} onChange={(e) => handleInputChange('given_by', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (
                          <div className="break-words">
                            {task.given_by || "—"}
                          </div>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.task_start_date ? new Date(task.task_start_date).toLocaleDateString() : '—'}
                      </td>

                      {/* Planned Date */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.planned_date ? new Date(task.planned_date).toLocaleDateString() : '—'}
                      </td>

                      {/* Frequency */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800`}>
                          {task.frequency || "—"}
                        </span>
                      </td>

                      {/* Task ID */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.task_id || "—"}
                      </td>

                      {/* Machine Name */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_name} onChange={(e) => handleInputChange('machine_name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (task.machine_name || "—")}
                      </td>
                      
                      {/* Part Name */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 min-w-[200px] max-w-[400px]">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.part_name} onChange={(e) => handleInputChange('part_name', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (() => {
                          const partNameStr = Array.isArray(task.part_name) ? task.part_name.join(', ') : (task.part_name || "—");
                          const isExpanded = expandedPartNames[task.task_id];
                          const shouldTruncate = partNameStr.length > 100;
                          return (
                            <div className="flex flex-col max-w-[350px] w-full overflow-hidden">
                              <div className={`w-full ${isExpanded ? "max-h-[150px] overflow-y-auto overflow-x-hidden custom-scrollbar" : "line-clamp-2 overflow-hidden"}`}>
                                <div className="break-words whitespace-normal pr-2 text-sm text-gray-500" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}>
                                  {partNameStr}
                                </div>
                              </div>
                              {shouldTruncate && (
                                <button
                                  onClick={() => togglePartName(task.task_id)}
                                  className="text-purple-600 text-[10px] font-bold hover:underline mt-1 text-left w-fit uppercase"
                                >
                                  {isExpanded ? "Show Less" : "Show More"}
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Part Area */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.part_area} onChange={(e) => handleInputChange('part_area', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (task.part_area || "—")}
                      </td>

                      {/* Machine Dept */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_department} onChange={(e) => handleInputChange('machine_department', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (task.machine_department || "—")}
                      </td>

                      {/* Machine Div */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTaskId === task.task_id ? (
                          <input type="text" value={editFormData.machine_division} onChange={(e) => handleInputChange('machine_division', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        ) : (task.machine_division || "—")}
                      </td>

                      {/* Duration */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {editingTaskId === task.task_id ? (
                          <input 
                            type="text" 
                            value={editFormData.duration} 
                            onChange={(e) => handleInputChange('duration', e.target.value)} 
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                            placeholder="Duration"
                          />
                        ) : (task.duration || "—")}
                      </td>

                      {/* Status */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-sm font-medium">
                        {editingTaskId === task.task_id ? (
                          <select 
                            value={editFormData.status} 
                            onChange={(e) => handleInputChange('status', e.target.value)} 
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Select Status</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="Pending">Pending</option>
                          </select>
                        ) : (
                          <span className={
                            task.status === "Yes" ? "text-green-600" : 
                            task.status === "Pending" ? "text-yellow-600" : 
                            task.status === "Transferred Pending" ? "text-orange-600 font-bold flex flex-col" : 
                            "text-red-600"
                          }>
                            {task.status || "—"}
                            {task.is_transferred && (
                              <span className="text-[10px] text-gray-500 font-normal">
                                (From: {task.transferred_from || task.given_by})
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="px-2 sm:px-6 py-2 sm:py-4 text-sm text-gray-500 max-w-[200px]">
                        <div className="break-words truncate" title={task.remark}>{task.remark || "—"}</div>
                      </td>

                      {/* Actions moved to front */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={17} className="px-2 sm:px-6 py-2 sm:py-4 text-center text-gray-500">
                      {searchTerm || nameFilter || freqFilter ? "No tasks matching your filters" : "No maintenance tasks available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {loading && uniqueMaintenanceHasMore && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                <p className="text-purple-600 text-sm mt-2">Loading more tasks...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default MaintenanceQuickTaskPage;
