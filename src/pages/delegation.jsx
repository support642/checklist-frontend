"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";
import { hasModifyAccess } from "../utils/permissionUtils";
import { useDispatch, useSelector } from "react-redux";
import {
  delegationData,
} from "../redux/slice/delegationSlice";
import Toast from "../components/Toast";

import { insertDelegationDoneAndUpdate } from "../redux/api/delegationApi";

// Configuration object
const CONFIG = {
  PAGE_CONFIG: {
    title: "DELEGATION Tasks",
    description: "Showing all pending tasks",
  },
};

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DelegationDataPage() {
  const [uploadedImages, setUploadedImages] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [remarksData, setRemarksData] = useState({});
  const [statusData, setStatusData] = useState({});
  const [nextTargetDate, setNextTargetDate] = useState({});
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  const filterOptions = [
    { value: "all", label: "All Tasks" },
    { value: "overdue", label: "Overdue" },
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
  ];

  const { loading, delegation } = useSelector(
    (state) => state.delegation
  );
  const dispatch = useDispatch();

  // Unique options for datalists (search suggestions)
  const nameOptions = useMemo(() => {
    if (!delegation) return [];
    return [...new Set(delegation.map(task => task.name).filter(Boolean))].sort();
  }, [delegation]);

  const divisionOptions = useMemo(() => {
    if (!delegation) return [];
    return [...new Set(delegation.map(task => task.division).filter(Boolean))].sort();
  }, [delegation]);

  const deptOptions = useMemo(() => {
    if (!delegation) return [];
    // Only show departments matching the selected division
    const filteredByDiv = divisionFilter 
      ? delegation.filter(task => task.division === divisionFilter)
      : delegation;
    return [...new Set(filteredByDiv.map(task => task.department).filter(Boolean))].sort();
  }, [delegation, divisionFilter]);

  // Reset department filter when division changes
  useEffect(() => {
    setDeptFilter("");
  }, [divisionFilter]);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    dispatch(delegationData());
  }, [dispatch]);

  const formatDateTimeToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }, []);

  const formatDateToDDMMYYYY = useCallback((date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  useEffect(() => {
    const role = localStorage.getItem("role");
    const user = localStorage.getItem("user-name");
    setUserRole(role || "");
    setUsername(user || "");
  }, []);

  const parseGoogleSheetsDateTime = useCallback(
    (dateTimeStr) => {
      if (!dateTimeStr) return "";

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{1,2}:\d{1,2}$/)
      ) {
        const [datePart, timePart] = dateTimeStr.split(" ");
        const [day, month, year] = datePart.split("/");
        const [hours, minutes, seconds] = timePart.split(":");

        return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year} ${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
      }

      if (
        typeof dateTimeStr === "string" &&
        dateTimeStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)
      ) {
        const parts = dateTimeStr.split("/");
        if (parts.length === 3) {
          return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]} 00:00:00`;
        }
        return dateTimeStr + " 00:00:00";
      }

      try {
        const date = new Date(dateTimeStr);
        if (!isNaN(date.getTime())) {
          if (typeof dateTimeStr === 'string' && (dateTimeStr.includes(":") || dateTimeStr.includes("T"))) {
            return formatDateTimeToDDMMYYYY(date);
          } else {
            return formatDateToDDMMYYYY(date) + " 00:00:00";
          }
        }
      } catch (error) {
        console.error("Error parsing datetime:", error);
      }

      return dateTimeStr;
    },
    [formatDateTimeToDDMMYYYY, formatDateToDDMMYYYY]
  );

  const formatDateTimeForDisplay = useCallback(
    (dateTimeStr) => {
      if (!dateTimeStr) return "—";
      return parseGoogleSheetsDateTime(dateTimeStr) || "—";
    },
    [parseGoogleSheetsDateTime]
  );

  const getRowColor = useCallback((colorCode) => {
    if (!colorCode) return "bg-white";
    const code = colorCode.toString().toLowerCase();
    switch (code) {
      case "red": return "bg-red-50 border-l-4 border-red-400";
      case "yellow": return "bg-yellow-50 border-l-4 border-yellow-400";
      case "green": return "bg-green-50 border-l-4 border-green-400";
      case "blue": return "bg-blue-50 border-l-4 border-blue-400";
      default: return "bg-white";
    }
  }, []);

  const filteredDelegationTasks = useMemo(() => {
    if (!delegation) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return delegation.filter((task) => {
      const matchesGlobalSearch = debouncedSearchTerm
        ? Object.values(task).some(
          (value) => value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
        : true;

      const matchesName = !nameFilter || task.name?.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesDept = !deptFilter || task.department?.toLowerCase().includes(deptFilter.toLowerCase());
      const matchesDiv = !divisionFilter || task.division?.toLowerCase().includes(divisionFilter.toLowerCase());

      let matchesDateFilter = true;
      if (dateFilter !== "all" && task.planned_date) {
        const plannedDate = new Date(task.planned_date);
        plannedDate.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "overdue": matchesDateFilter = plannedDate < today; break;
          case "today": matchesDateFilter = plannedDate.getTime() === today.getTime(); break;
          case "upcoming": matchesDateFilter = plannedDate > today; break;
          default: matchesDateFilter = true;
        }
      }

      return matchesGlobalSearch && matchesDateFilter && matchesName && matchesDept && matchesDiv;
    });
  }, [delegation, debouncedSearchTerm, dateFilter, nameFilter, deptFilter, divisionFilter]);

  const unifiedData = useMemo(() => {
    return filteredDelegationTasks.map(task => ({
      ...task,
      unifiedType: 'pending',
      unifiedId: `p-${task.task_id}`
    })).sort((a, b) => (b.task_id || 0) - (a.task_id || 0));
  }, [filteredDelegationTasks]);

  const StatusBadge = ({ status }) => {
    const lowerStatus = (status || "").toString().toLowerCase().trim();
    switch (lowerStatus) {
      case 'pending': return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</span>;
      case 'partial done':
      case 'partial_done': return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-blue-100 text-blue-700 border border-blue-200">Partial Done</span>;
      case 'completed':
      case 'done': return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-green-100 text-green-700 border border-green-200">Done</span>;
      case 'extend date':
      case 'extend': return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-purple-100 text-purple-700 border border-purple-200">Extended</span>;
      default: return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm bg-gray-100 text-gray-500 border border-gray-200">{status || "Pending"}</span>;
    }
  };

  const handleSelectItem = useCallback((id, isChecked) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (isChecked) {
        newSelected.add(id);
        setStatusData((prevStatus) => ({ ...prevStatus, [id]: "Done" }));
        // Pre-fill remark with the latest from history if needed - feature removed to simplify
      } else {
        newSelected.delete(id);
        setStatusData((prevStatus) => {
          const newStatusData = { ...prevStatus };
          delete newStatusData[id];
          return newStatusData;
        });
        setNextTargetDate((prevDate) => {
          const newDateData = { ...prevDate };
          delete newDateData[id];
          return newDateData;
        });
      }
      return newSelected;
    });
  }, []);

  const handleImageUpload = useCallback((id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUploadedImages((prev) => ({ 
      ...prev, 
      [id]: { file, previewUrl } 
    }));
  }, []);

  const handleStatusChange = useCallback((id, value) => {
    setStatusData((prev) => ({ ...prev, [id]: value }));
    if (value === "Done") {
      setNextTargetDate((prev) => {
        const newDates = { ...prev };
        delete newDates[id];
        return newDates;
      });
    }
  }, []);

  const handleNextTargetDateChange = useCallback((id, value) => {
    setNextTargetDate((prev) => ({ ...prev, [id]: value }));
  }, []);

  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems);
    if (selectedItemsArray.length === 0) {
      setToast({ show: true, message: "Please select at least one task", type: "warning" });
      return;
    }

    if (selectedItemsArray.some(id => !statusData[id])) {
      setToast({ show: true, message: "Please select status for all selected items.", type: "warning" });
      return;
    }

    if (selectedItemsArray.some(id => statusData[id] === "Extend date" && !nextTargetDate[id])) {
      setToast({ show: true, message: "Please select next target date for extended tasks.", type: "warning" });
      return;
    }

    const missingRequiredImages = selectedItemsArray.filter((id) => {
      const item = delegation.find((account) => account.task_id === id);
      return item.require_attachment?.toUpperCase() === "YES" && !uploadedImages[id] && !item.image;
    });

    if (missingRequiredImages.length > 0) {
      setToast({ show: true, message: "Please upload images for required attachments.", type: "warning" });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedData = await Promise.all(
        selectedItemsArray.map(async (id) => {
          const item = delegation.find((x) => x.task_id === id);
          const imageData = uploadedImages[id];
          const file = imageData?.file;
          let base64Image = file ? await fileToBase64(file) : null;

          return {
            task_id: item.task_id,
            department: item.department,
            given_by: item.given_by,
            name: item.name,
            task_description: item.task_description,
            task_start_date: item.task_start_date,
            planned_date: item.planned_date,
            status: statusData[id] === "Done" ? "done" : 
                   statusData[id] === "Partial Done" ? "partial_done" : 
                   statusData[id] === "Extend date" ? "extend" : null,
            next_extend_date: statusData[id] === "Extend date" ? nextTargetDate[id] : null,
            reason: remarksData[id] || "",
            image_base64: base64Image,
          };
        })
      );

      const result = await dispatch(insertDelegationDoneAndUpdate({ selectedDataArray: selectedData }));
      if (result.meta.requestStatus === "fulfilled") {
        setToast({ 
          show: true, 
          message: `Successfully submitted ${selectedItemsArray.length} tasks!`, 
          type: "success" 
        });
        setSelectedItems(new Set());
        setRemarksData({});
        setNextTargetDate({});
        setStatusData({});
        setUploadedImages({});
        setTimeout(() => {
          dispatch(delegationData());
        }, 2000);
      } else {
        throw new Error(result.payload || "Submission failed");
      }
    } catch (error) {
      console.error('Submission error:', error);
      setToast({ 
        show: true, 
        message: `Error: ${error.message}`, 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAll = useCallback((isChecked) => {
    if (isChecked) {
      setSelectedItems(new Set(filteredDelegationTasks.map(t => t.task_id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [filteredDelegationTasks]);

  const isRowSelected = useCallback((item) => selectedItems.has(item.task_id), [selectedItems]);

  const toggleRowSelection = useCallback((item, isChecked) => handleSelectItem(item.task_id, isChecked), [handleSelectItem]);

  return (
    <>
    <AdminLayout>
      <div className="space-y-4 p-2 sm:p-4 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-purple-700">
              {CONFIG.PAGE_CONFIG.title}
            </h1>
            <p className="text-gray-500 text-sm italic">{CONFIG.PAGE_CONFIG.description}</p>
          </div>

          <div className="flex items-center gap-2">
            {hasModifyAccess('delegation') && (
              <button
                onClick={handleSubmit}
                disabled={selectedItems.size === 0 || isSubmitting}
                className="rounded-md bg-purple-600 py-2 px-4 text-white hover:bg-purple-700 disabled:opacity-50 shadow-md text-sm font-bold whitespace-nowrap transition-all active:scale-95"
              >
                {isSubmitting ? "..." : `Submit Tasks (${selectedItems.size})`}
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-purple-500 transition-colors" size={14} />
            </div>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-purple-50/30 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs transition-all"
            >
              <option value="">All Divisions</option>
              {divisionOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-purple-500 transition-colors" size={14} />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-purple-50/30 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs transition-all"
            >
              <option value="">{divisionFilter ? `Departments in ${divisionFilter}` : "All Departments"}</option>
              {deptOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-purple-500 transition-colors" size={14} />
            </div>
            <select
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-purple-50/30 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs transition-all"
            >
              <option value="">All Names</option>
              {nameOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-purple-50/30 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-xs transition-all"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Global Search Searchable Header Row if needed, but since we have Global Search inside filter bar, we'll ensure it is present or unified */}
         <div className="relative group w-full mb-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-purple-500 transition-colors" size={16} />
            </div>
            <input
              type="text"
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-purple-100 rounded-xl shadow-xs focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-sm transition-all"
            />
          </div>


        <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
          <div className="bg-linear-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-3 sm:p-4 flex justify-between items-center">
            <h2 className="text-purple-700 font-bold text-sm sm:text-lg flex items-center gap-2">
              <LayoutDashboard size={18} className="text-purple-500" />
              My Pending Tasks
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-purple-600 text-sm sm:text-base">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {/* Desktop Table */}
              <table className="min-w-full divide-y divide-gray-200 hidden sm:table table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="w-12 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Seq</th>
                    <th className="w-16 px-3 py-4 text-left">
                       <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={unifiedData.length > 0 && unifiedData.every(item => isRowSelected(item))}
                      />
                    </th>
                    <th className="w-32 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="w-64 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remark/Action</th>
                    <th className="w-80 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[250px]">Description</th>
                    <th className="w-40 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="w-32 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Given</th>
                    <th className="w-32 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="w-32 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Division</th>
                    <th className="w-44 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Target Date</th>
                    <th className="w-44 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Submit Date</th>
                    <th className="w-24 px-3 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Task ID</th>
                    <th className="w-20 px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Proof</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unifiedData.length > 0 ? (
                    unifiedData.map((item, index) => {
                      const isSelected = isRowSelected(item);
                      return (
                        <tr key={item.unifiedId} className={`${isSelected ? "bg-purple-50" : "hover:bg-gray-50"} ${getRowColor(item.color_code_for)} transition-colors`}>
                          <td className="px-3 py-4 text-xs text-gray-500 font-medium">{index + 1}</td>
                          <td className="px-3 py-4">
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer shadow-sm"
                              checked={isSelected}
                              onChange={(e) => toggleRowSelection(item, e.target.checked)}
                            />
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={item.status || "pending"} />
                          </td>
                          <td className="px-3 py-4">
                            {isSelected ? (
                              <div className="space-y-2 max-w-[220px]">
                                <select
                                  value={statusData[item.task_id] || "Done"}
                                  onChange={(e) => handleStatusChange(item.task_id, e.target.value)}
                                  className="border border-purple-200 rounded px-2 py-1.5 w-full text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                  <option value="Done">Done</option>
                                  <option value="Extend date">Extend</option>
                                </select>
                                {statusData[item.task_id] === 'Extend date' && (
                                  <input
                                    type="datetime-local"
                                    value={nextTargetDate[item.task_id] || ""}
                                    onChange={(e) => handleNextTargetDateChange(item.task_id, e.target.value)}
                                    className="border border-purple-200 rounded px-2 py-1.5 w-full text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                                  />
                                )}
                                <textarea
                                  placeholder="Type remarks here..."
                                  value={remarksData[item.task_id] || ""}
                                  onChange={(e) => setRemarksData(prev => ({ ...prev, [item.task_id]: e.target.value }))}
                                  className="w-full border border-purple-200 rounded p-2 text-xs h-20 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                                />
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 italic break-words line-clamp-3" title={item.remarks}>
                                {item.remarks || "—"}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4 text-xs text-gray-700">
                             <div className="break-words line-clamp-4 font-medium" title={item.task_description}>
                               {item.task_description}
                             </div>
                          </td>
                          <td className="px-3 py-4 text-xs text-gray-700 font-medium">{item.name}</td>
                          <td className="px-3 py-4 text-xs text-gray-600">{item.given_by || "—"}</td>
                          <td className="px-3 py-4 text-xs text-gray-600">{item.unit || "—"}</td>
                          <td className="px-3 py-4 text-xs text-gray-600">{item.division || "—"}</td>
                          <td className="px-3 py-4 text-xs text-gray-600 whitespace-nowrap bg-purple-50/30">{formatDateTimeForDisplay(item.planned_date)}</td>
                          <td className="px-3 py-4 text-xs text-gray-600 whitespace-nowrap">{formatDateTimeForDisplay(item.submission_date)}</td>
                          <td className="px-3 py-4 text-xs font-bold text-purple-700">{item.task_id}</td>
                          <td className="px-3 py-4 text-center">
                            {isSelected ? (
                              <label className="relative cursor-pointer bg-purple-100 text-purple-700 hover:bg-purple-200 p-2 rounded-full transition-colors inline-flex items-center justify-center min-w-[36px] min-h-[36px]" title={uploadedImages[item.task_id] ? "Image Uploaded" : "Upload Proof"}>
                                {uploadedImages[item.task_id] ? (
                                  <img 
                                    src={uploadedImages[item.task_id].previewUrl} 
                                    alt="Preview" 
                                    className="w-8 h-8 rounded-full object-cover border-2 border-purple-400"
                                  />
                                ) : (
                                <Upload size={18} />
                                )}
                                {uploadedImages[item.task_id] && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(item.task_id, e)} />
                              </label>
                            ) : (
                              item.image && (
                                <button onClick={() => window.open(item.image, "_blank")} className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors" title="View Proof">
                                  <Upload size={18} />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400 italic">No pending tasks found.</td></tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {unifiedData.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={unifiedData.length > 0 && unifiedData.every(item => isRowSelected(item))}
                    />
                    <span className="text-xs font-medium text-purple-700">Select All ({unifiedData.length})</span>
                  </div>
                )}
                {unifiedData.map((item, index) => {
                  const isSelected = isRowSelected(item);
                  return (
                    <div key={item.unifiedId} className={`p-3 border rounded-lg shadow-sm ${isSelected ? "bg-purple-50 border-purple-200" : "bg-white border-gray-200"}`}>
                      <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                           <input type="checkbox" checked={isSelected} onChange={(e) => toggleRowSelection(item, e.target.checked)} className="h-4 w-4 rounded cursor-pointer" />
                           <span className="text-xs font-bold text-gray-400">#{index+1}</span>
                         </div>
                          <StatusBadge status={item.status || "pending"} />
                      </div>
                       <div className="text-sm font-semibold mb-2 text-purple-900 leading-snug">{item.task_description}</div>
                       <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] mb-3">
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-400 uppercase tracking-tighter text-[9px]">Given By</span>
                             <span className="text-gray-700 font-medium truncate" title={item.given_by}>{item.given_by || "—"}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-400 uppercase tracking-tighter text-[9px]">Name</span>
                             <span className="text-gray-700 font-medium truncate" title={item.name}>{item.name || "—"}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-400 uppercase tracking-tighter text-[9px]">Target Date</span>
                             <span className="text-gray-700 font-medium">{formatDateTimeForDisplay(item.planned_date)}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-gray-400 uppercase tracking-tighter text-[9px]">Details</span>
                             <div className="text-gray-600 line-clamp-1">
                                <span className="font-semibold">ID:</span> {item.task_id} | {item.unit || "—"} | {item.division || "—"}
                             </div>
                          </div>
                       </div>
                      {isSelected && (
                        <div className="pt-2 border-t space-y-2">
                            <select value={statusData[item.task_id] || "Done"} className="w-full border rounded text-xs p-1" onChange={(e) => handleStatusChange(item.task_id, e.target.value)}>
                              <option value="Done">Done</option>
                              <option value="Extend date">Extend</option>
                            </select>
                            {statusData[item.task_id] === 'Extend date' && (
                              <input type="datetime-local" value={nextTargetDate[item.task_id] || ""} onChange={(e) => handleNextTargetDateChange(item.task_id, e.target.value)} className="w-full border rounded text-xs p-1" />
                            )}
                            <textarea className="w-full border rounded text-xs p-1" rows="2" placeholder="Remarks..." value={remarksData[item.task_id] || ""} onChange={(e) => setRemarksData(prev => ({ ...prev, [item.task_id]: e.target.value }))} />
                            <div className="mt-2 text-center border border-dashed border-gray-300 rounded p-2 bg-gray-50 flex flex-col items-center gap-2">
                             {uploadedImages[item.task_id] && (
                               <img 
                                 src={uploadedImages[item.task_id].previewUrl} 
                                 alt="Preview" 
                                 className="w-16 h-16 rounded-md object-cover border border-purple-200 shadow-sm"
                               />
                             )}
                             <label className="cursor-pointer text-purple-600 hover:text-purple-800 flex items-center justify-center gap-1">
                               <Upload size={14} />
                               <span className="text-xs font-bold uppercase">{uploadedImages[item.task_id] ? "Change image" : "Upload image"}</span>
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(item.task_id, e)} />
                             </label>
                           </div>
                        </div>
                      )}
                      {!isSelected && item.image && (
                        <div className="mt-2 flex justify-end">
                          <button onClick={() => window.open(item.image, "_blank")} className="text-purple-500 flex items-center gap-1 text-xs font-medium"><Upload size={14} /> View Proof</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
    <Toast 
      isVisible={toast.show} 
      message={toast.message} 
      type={toast.type} 
      onClose={() => setToast({ ...toast, show: false })} 
    />
    </>
  );
}

export default DelegationDataPage;
