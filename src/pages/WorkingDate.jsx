import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { 
  Calendar, Clock, Search, ChevronDown, Plus, Trash2, 
  Image as ImageIcon, X, Save, RefreshCw, Edit, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../utils/authFetch';
import { toast } from 'react-hot-toast';
import { 
  useGetWorkingHistoryQuery, 
  useSubmitWorkingDateMutation,
  useUpdateWorkingDateMutation,
  useDeleteWorkingDateMutation
} from '../redux/slice/workingDateHistoryApi';

// --- Searchable Dropdown Component ---
const TableSearchableSelect = ({ value, onChange, options, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (disabled) {
    return (
      <div className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-400 cursor-not-allowed">
        {value || placeholder}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-sm bg-white border border-slate-200 hover:border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2.5 cursor-pointer flex items-center justify-between transition-all"
      >
        <span className={`${value ? "text-slate-700 font-medium" : "text-slate-400"} truncate`}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-4 py-2 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 cursor-pointer font-medium ${value === opt ? 'bg-purple-50 text-purple-700' : ''}`}
                  >
                    {opt}
                  </div>
                ))
              ) : (
                <div className="px-4 py-4 text-center text-slate-400 text-[11px] italic">No results</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WorkingDate = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [queuedEntries, setQueuedEntries] = useState([]);

  // Default values
  const userRole = (localStorage.getItem('role') || 'user').toUpperCase();
  const userName = localStorage.getItem('user-name') || 'User';
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "DIV_ADMIN"].includes(userRole);

  const getFormattedTime = () => {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const [entry, setEntry] = useState({
    date: new Date(selectedDate).toLocaleDateString('en-GB'),
    time: manualTime || getFormattedTime(),
    workDetail: "",
    assignBy: "",
    userName: userName,
    status: "Completed",
    duration: "",
    image: null,
    imagePreview: null
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when other filters change
  useEffect(() => {
    setPage(1);
  }, [filterStartDate, filterEndDate, filterUser]);

  // API Hooks
  const { data: historyRes, isFetching: isHistoryFetching, isLoading: isHistoryLoading, refetch: refetchHistory } = useGetWorkingHistoryQuery(
    { 
      search: debouncedSearch, 
      page, 
      limit: 20, 
      startDate: filterStartDate, 
      endDate: filterEndDate, 
      filterUser: filterUser 
    }
  );

  const [submitWorkMutation, { isLoading: isSubmitting }] = useSubmitWorkingDateMutation();
  const [updateWorkMutation, { isLoading: isUpdating }] = useUpdateWorkingDateMutation();
  const [deleteWorkMutation] = useDeleteWorkingDateMutation();

  const historyEntries = historyRes?.data || [];
  const hasMore = historyRes?.hasMore || false;
  const loaderRef = useRef(null);

  // Sync entry clock or initial state
  useEffect(() => {
    if (!editingId && !manualTime) {
      const timer = setInterval(() => {
        setEntry(prev => {
          if (editingId || manualTime) return prev;
          return { ...prev, time: getFormattedTime() };
        });
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [editingId, manualTime]);

  // Infinite Scroll Observer for Main Table
  useEffect(() => {
    if (!hasMore || isHistoryFetching) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isHistoryFetching]);

  // Fetch Users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';
        const res = await authFetch(`${API_BASE}/tasks/users`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data.map(u => u.user_name).sort());
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleUpdateEntry = (field, value) => {
    setEntry(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEntry(prev => ({ ...prev, imagePreview: reader.result, image: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearEntry = () => {
    setEditingId(null);
    setManualTime("");
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setEntry({
      date: new Date().toLocaleDateString('en-GB'),
      time: getFormattedTime(),
      workDetail: "",
      assignBy: "",
      userName: userName,
      status: "Completed",
      duration: "",
      image: null,
      imagePreview: null
    });
  };

  const refreshHistoryList = () => {
    if (page === 1) {
      refetchHistory();
    } else {
      setPage(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry.workDetail.trim()) {
      toast.error("Please enter work details");
      return;
    }

    try {
      const payload = {
        selectedDate,
        time: entry.time,
        workDetail: entry.workDetail,
        assignBy: entry.assignBy,
        userName: entry.userName || userName,
        status: entry.status,
        duration: entry.duration,
        image_base64: entry.image && entry.imagePreview ? entry.imagePreview : undefined,
        image_url: (!entry.image && entry.imagePreview) ? entry.imagePreview : null
      };

      if (editingId) {
        const res = await updateWorkMutation({ id: editingId, payload }).unwrap();
        toast.success(res.message || "Record updated successfully");
      } else {
        const submitPayload = {
          selectedDate,
          entries: [{
            time: entry.time,
            workDetail: entry.workDetail,
            assignBy: entry.assignBy,
            userName: entry.userName || userName,
            status: entry.status,
            duration: entry.duration,
            image_base64: entry.imagePreview
          }]
        };
        const res = await submitWorkMutation(submitPayload).unwrap();
        toast.success(res.message || "Record saved successfully");
      }

      handleClearEntry();
      refreshHistoryList();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to submit work details");
    }
  };

  const handleAddToQueue = (e) => {
    e.preventDefault();
    if (!entry.workDetail.trim()) {
      toast.error("Please enter work details");
      return;
    }

    const newQueued = {
      localId: Date.now() + Math.random(),
      time: entry.time,
      workDetail: entry.workDetail,
      assignBy: entry.assignBy,
      userName: entry.userName || userName,
      status: entry.status,
      duration: entry.duration,
      imagePreview: entry.imagePreview,
      image: entry.image
    };

    setQueuedEntries(prev => [...prev, newQueued]);
    toast.success("Entry added to submission queue");

    // Clear detail-specific fields, but preserve Date, Person Name, Assign By, and Status
    setEntry(prev => ({
      ...prev,
      workDetail: "",
      duration: "",
      image: null,
      imagePreview: null
    }));
  };

  const handleSubmitQueue = async () => {
    if (queuedEntries.length === 0) return;
    const loadingToast = toast.loading(`Submitting ${queuedEntries.length} queued entries...`);

    try {
      const submitPayload = {
        selectedDate,
        entries: queuedEntries.map(e => ({
          time: e.time,
          workDetail: e.workDetail,
          assignBy: e.assignBy,
          userName: e.userName,
          status: e.status,
          duration: e.duration,
          image_base64: e.imagePreview
        }))
      };

      const res = await submitWorkMutation(submitPayload).unwrap();
      toast.dismiss(loadingToast);
      toast.success(res.message || `Successfully submitted ${queuedEntries.length} entries!`);
      
      setQueuedEntries([]);
      refreshHistoryList();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err?.data?.error || "Failed to submit queued entries");
    }
  };

  const handleEdit = (item) => {
    let ymd = new Date().toISOString().split('T')[0];
    try {
      if (item.date) {
        const [day, month, year] = item.date.split('/');
        ymd = `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn("Failed to parse date in edit mode:", item.date);
    }

    setSelectedDate(ymd);
    setManualTime(item.time || "");
    setEditingId(item.id);

    setEntry({
      date: item.date,
      time: item.time || getFormattedTime(),
      workDetail: item.workDetail || "",
      assignBy: item.assignBy || "",
      userName: item.userName || userName,
      status: item.status || "Completed",
      duration: item.duration || "",
      image: null,
      imagePreview: item.image || null
    });

    toast.success("Loaded entry into form for editing.");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      const res = await deleteWorkMutation(id).unwrap();
      toast.success(res.message || "Record deleted successfully");
      refreshHistoryList();
    } catch (err) {
      toast.error(err?.data?.error || "Failed to delete record");
    }
  };

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return "";
    if (!timeStr) return dateStr;
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const amampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const padZero = (n) => String(n).padStart(2, '0');
      return `${dateStr} ${padZero(formattedHours)}:${padZero(minutes)} ${amampm}`;
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const getStatusBadge = (statusStr) => {
    const lower = (statusStr || "").toLowerCase();
    if (lower === "completed") {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">● Completed</span>;
    } else if (lower === "in progress" || lower === "in-progress") {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">● In Progress</span>;
    } else if (lower === "pending") {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">● Pending</span>;
    } else if (statusStr) {
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">● {statusStr}</span>;
    }
    return <span className="text-gray-400 italic text-xs">—</span>;
  };

  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const loadingToast = toast.loading("Fetching all ledger records from database for export...");

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';
      const res = await authFetch(`${API_BASE}/working-date-history/list?search=${encodeURIComponent(debouncedSearch)}&export=true&startDate=${filterStartDate}&endDate=${filterEndDate}&filterUser=${filterUser}`);
      if (!res.ok) {
        throw new Error("Failed to fetch export data");
      }
      const result = await res.json();
      const exportEntries = result?.data || [];

      if (exportEntries.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No entries available to export");
        return;
      }

      const headers = ["Date", "Employee Name", "Task Detail", "Assigned By", "Status", "Duration"];
      const rows = exportEntries.map(item => [
        formatDateTime(item.date, item.time),
        item.userName || "",
        item.workDetail ? `"${item.workDetail.replace(/"/g, '""')}"` : "",
        item.assignBy || "",
        item.status || "",
        item.duration || ""
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ledger_history_${new Date().toLocaleDateString('en-CA')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(loadingToast);
      toast.success(`Exported ${exportEntries.length} entries successfully`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    refreshHistoryList();
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Daily Work Ledger</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Submit daily work logs and check working history records.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportCSV}
              disabled={isExporting}
              className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 transition-all shadow-md ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download size={14} className={isExporting ? 'animate-spin' : ''} />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold uppercase rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw size={14} className={isHistoryFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stacked Layout: Form (Top) and Ledger Table (Bottom) */}
        <div className="flex flex-col gap-6">
          
          {/* Top Section: Entry Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Plus className="text-indigo-600" size={18} />
                {editingId ? "Edit Work Entry" : "New Work Entry"}
              </h3>
              {editingId && (
                <button 
                  onClick={handleClearEntry}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      const formatted = new Date(e.target.value).toLocaleDateString('en-GB');
                      handleUpdateEntry('date', formatted);
                    }}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                <input 
                  type="time"
                  value={entry.time}
                  onChange={(e) => {
                    setManualTime(e.target.value);
                    handleUpdateEntry('time', e.target.value);
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-slate-50/50" 
                />
              </div>

              {/* Person Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Person Name</label>
                <TableSearchableSelect 
                  value={entry.userName}
                  onChange={(val) => handleUpdateEntry('userName', val)}
                  options={users}
                  placeholder="Select employee..."
                  disabled={!isAdmin}
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                <select
                  value={entry.status}
                  onChange={(e) => handleUpdateEntry('status', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-white"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Duration / Hours</label>
                <input 
                  type="text"
                  placeholder="e.g. 2 Hours, 45 Mins"
                  value={entry.duration}
                  onChange={(e) => handleUpdateEntry('duration', e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-white" 
                />
              </div>

              {/* Assign By */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Assign By</label>
                <TableSearchableSelect 
                  value={entry.assignBy}
                  onChange={(val) => handleUpdateEntry('assignBy', val)}
                  options={users}
                  placeholder="Who assigned this work?..."
                />
              </div>

              {/* Proof Image */}
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase">Proof Image (Optional)</label>
                <div className="relative group/img">
                  <label className="cursor-pointer block">
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleImageChange(e.target.files[0])}
                    />
                    {entry.imagePreview ? (
                      <div className="h-24 w-full rounded-lg overflow-hidden border-2 border-indigo-100 ring-2 ring-white max-w-md">
                        <img src={entry.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    ) : (
                      <div className="h-12 w-full flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-100/55 transition-all">
                        <ImageIcon size={18} />
                        <span className="ml-2 text-[10px] font-bold uppercase">Upload Proof Image</span>
                      </div>
                    )}
                  </label>
                  {entry.imagePreview && (
                    <button 
                      type="button"
                      onClick={() => {
                        handleUpdateEntry('image', null);
                        handleUpdateEntry('imagePreview', null);
                      }}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Description */}
              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-500 uppercase">Task Description</label>
                <textarea 
                  placeholder="Describe your work/tasks completed..."
                  value={entry.workDetail}
                  onChange={(e) => handleUpdateEntry('workDetail', e.target.value)}
                  required
                  rows="3"
                  className="w-full p-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-600 resize-none min-h-[90px]"
                />
              </div>

              {/* Submit / Update Buttons */}
              <div className="md:col-span-2 lg:col-span-3">
                {editingId ? (
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-white font-bold transition-all shadow-md active:scale-98 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 disabled:opacity-50"
                  >
                    <Save size={18} />
                    <span>Update Entry</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button"
                      onClick={handleAddToQueue}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 font-bold transition-all hover:bg-indigo-100 active:scale-98 shadow-sm"
                    >
                      <Plus size={18} />
                      <span>Add to Queue</span>
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-white font-bold transition-all shadow-md active:scale-98 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 disabled:opacity-50"
                    >
                      <Save size={18} />
                      <span>Save Directly</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Middle Section: Queue Preview (if any items) */}
          <AnimatePresence>
            {queuedEntries.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md flex flex-col gap-4 bg-gradient-to-br from-white to-slate-50/20"
              >
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-xs">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 uppercase tracking-wider">
                        Submission Queue ({queuedEntries.length} {queuedEntries.length === 1 ? 'Entry' : 'Entries'})
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">Review and submit your queued work entries in bulk.</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setQueuedEntries([])}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 rounded-lg hover:bg-rose-100/70"
                  >
                    <Trash2 size={13} />
                    Clear Queue
                  </button>
                </div>

                {/* Queue Items List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queuedEntries.map((item, index) => (
                    <div 
                      key={item.localId}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between group"
                    >
                      <div>
                        {/* Queue Card Header */}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            #{index + 1} at {item.time}
                          </span>
                          <div className="flex gap-1">
                            <button 
                              type="button"
                              onClick={() => {
                                // Load item back to form to edit
                                setEntry({
                                  date: new Date(selectedDate).toLocaleDateString('en-GB'),
                                  time: item.time,
                                  workDetail: item.workDetail,
                                  assignBy: item.assignBy,
                                  userName: item.userName,
                                  status: item.status,
                                  duration: item.duration,
                                  image: item.image,
                                  imagePreview: item.imagePreview
                                });
                                setQueuedEntries(prev => prev.filter(q => q.localId !== item.localId));
                                toast.success("Queued entry loaded into form");
                              }}
                              className="p-1 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                              title="Edit entry"
                            >
                              <Edit size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setQueuedEntries(prev => prev.filter(q => q.localId !== item.localId));
                                toast.success("Entry removed from queue");
                              }}
                              className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                              title="Remove entry"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Detail fields */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-3">
                            {item.workDetail}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
                            {item.duration && (
                              <span className="bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/30">
                                ⏱️ {item.duration}
                              </span>
                            )}
                            {item.assignBy && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                👤 By: {item.assignBy}
                              </span>
                            )}
                            {item.status && (
                              <span className={`px-2 py-0.5 rounded ${
                                item.status.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 'bg-amber-50 text-amber-700 border border-amber-100/50'
                              }`}>
                                ● {item.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Image Thumbnail */}
                      {item.imagePreview && (
                        <div className="mt-3 h-14 w-full rounded-lg overflow-hidden border border-slate-150">
                          <img src={item.imagePreview} className="w-full h-full object-cover" alt="Proof thumbnail" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Queue Action Button */}
                <div className="mt-2 border-t border-slate-100 pt-4">
                  <button 
                    type="button"
                    onClick={handleSubmitQueue}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 gradient-blue text-white font-bold text-sm uppercase rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-98 disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>Submit All {queuedEntries.length} Entries in Queue</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Section: Ledger Table */}
          <div className="gradient-card-purple rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Search and Filters Header */}
            <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* Search Term */}
                <div className="flex-1 min-w-[200px] space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Search Details</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/3 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search ledger records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-white shadow-sm"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Start Date */}
                <div className="w-full sm:w-auto min-w-[140px] space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-white shadow-sm"
                  />
                </div>

                {/* End Date */}
                <div className="w-full sm:w-auto min-w-[140px] space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 bg-white shadow-sm"
                  />
                </div>

                {/* Employee Name Filter (Admins Only) */}
                {isAdmin && (
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Filter by Employee</label>
                    <div className="relative">
                      <TableSearchableSelect 
                        value={filterUser}
                        onChange={(val) => setFilterUser(val)}
                        options={users}
                        placeholder="All Employees"
                      />
                      {filterUser && (
                        <button 
                          onClick={() => setFilterUser("")}
                          className="absolute right-8 top-1/2 -translate-y-1/4 text-slate-400 hover:text-slate-600 z-10"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Reset Filters */}
                {(searchTerm || filterStartDate || filterEndDate || filterUser) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterUser("");
                    }}
                    className="h-9 px-3 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw size={12} />
                    Reset
                  </button>
                )}
              </div>

              {/* Total Records Counter */}
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Showing logs for: <span className="font-semibold text-slate-700">
                    {filterUser || "All Users"} 
                    {filterStartDate && ` from ${filterStartDate}`}
                    {filterEndDate && ` to ${filterEndDate}`}
                  </span>
                </span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md shadow-sm">
                  Records Count: {historyRes?.totalCount || 0}
                </span>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-200 sticky top-0 bg-white z-10">
                    <th className="px-5 py-4">Date 📅</th>
                    <th className="px-5 py-4">Person Name 👤</th>
                    <th className="px-5 py-4 min-w-[250px]">Task / Work Done 📝</th>
                    <th className="px-5 py-4 w-[150px]">Status ⚙️</th>
                    <th className="px-5 py-4 text-center w-[120px]">Action 🛠️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyEntries.length > 0 ? (
                    historyEntries.map((item, idx) => (
                      <tr key={`ledger-${item.id}-${idx}`} className="hover:bg-slate-50/45 transition-colors">
                        {/* Date & Time */}
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-600">
                          {formatDateTime(item.date, item.time)}
                        </td>
                        
                        {/* Person Name */}
                        <td className="px-5 py-4 font-bold text-slate-800">
                          {item.userName || "N/A"}
                        </td>

                        {/* Task / Work Details */}
                        <td className="px-5 py-4">
                          <p className="text-slate-700 leading-relaxed font-medium mb-1">
                            {item.workDetail}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {item.assignBy && (
                              <span className="inline-flex items-center text-[10px] bg-slate-100 text-slate-500 font-bold uppercase px-2 py-0.5 rounded border border-slate-200/50">
                                Assigned By: {item.assignBy}
                              </span>
                            )}
                            {item.image && (
                              <button 
                                onClick={() => setActiveImageModal(item.image)}
                                className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold uppercase px-2 py-0.5 rounded border border-indigo-100/50 transition-colors"
                              >
                                <ImageIcon size={10} />
                                View Proof Image
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status / Duration */}
                        <td className="px-5 py-4 space-y-1">
                          <div>{getStatusBadge(item.status)}</div>
                          {item.duration && (
                            <div className="text-[11px] text-slate-400 font-bold tracking-tight">
                              Duration: <span className="text-slate-600">{item.duration}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleEdit(item)}
                              title="Edit record"
                              className="p-1.5 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors border border-transparent hover:border-indigo-100 shadow-sm"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              title="Delete record"
                              className="p-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded-lg transition-colors border border-transparent hover:border-rose-100 shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-20 text-center text-slate-400 italic">
                        {!isHistoryLoading ? "No ledger entries found" : "Loading logs..."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={loaderRef} className="py-6 flex flex-col items-center justify-center gap-2 bg-slate-50/50 border-t border-slate-100">
              {isHistoryFetching ? (
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading more entries...</span>
                </div>
              ) : !hasMore && historyEntries.length > 0 ? (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  End of Ledger Records
                </span>
              ) : null}
            </div>
          </div>

        </div>
      </div>

      {/* Sleek Image Lightbox Preview Modal */}
      <AnimatePresence>
        {activeImageModal && (
          <div 
            onClick={() => setActiveImageModal(null)}
            className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-zoom-out"
          >
            {/* Close Button on Screen (Top-Right) */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageModal(null);
              }}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-rose-600/90 text-white/80 hover:text-white rounded-full transition-all border border-white/10 hover:border-transparent hover:scale-105 active:scale-95 shadow-lg z-10"
              title="Close Preview"
            >
              <X size={20} />
            </button>

            {/* Lightbox Body (stops click propagation to avoid auto-closing) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full flex flex-col items-center gap-4 cursor-default"
            >
              {/* The Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/5 max-h-[75vh]">
                <img 
                  src={activeImageModal} 
                  alt="Proof Document" 
                  className="max-h-[75vh] max-w-full object-contain bg-slate-900"
                />
              </div>

              {/* Download Action below the image */}
              <a 
                href={activeImageModal}
                download="proof_image.png"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xl shadow-indigo-950/40 hover:scale-105 active:scale-98"
              >
                <Download size={14} />
                Download Proof Image
              </a>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default WorkingDate;
