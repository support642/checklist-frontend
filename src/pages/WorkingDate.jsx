import React, { useState, useEffect, useRef, useMemo } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { 
  Calendar, Clock, Search, ChevronDown, Plus, Trash2, 
  Upload, Image as ImageIcon, X, Save, RefreshCw, CheckCircle2, Database,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authFetch } from '../utils/authFetch';
import { toast } from 'react-hot-toast';
import { 
  useGetWorkingHistoryQuery, 
  useGetEmployeeHistoryDetailQuery, 
  useSubmitWorkingDateMutation 
} from '../redux/slice/workingDateHistoryApi';

// --- Components ---

const TableSearchableSelect = ({ value, onChange, options, placeholder }) => {
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

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-sm bg-white border border-slate-200 hover:border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 cursor-pointer flex items-center justify-between transition-all"
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [manualTime, setManualTime] = useState(null);
  const [users, setUsers] = useState([]);
  
  // Debounce search to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Hooks
  const { data: historyRes, isFetching: isHistoryFetching, isLoading: isHistoryLoading, refetch: refetchHistory } = useGetWorkingHistoryQuery(
    { search: debouncedSearch, page, limit: 10 }
  );
  const [submitWorkMutation, { isLoading: isSubmitting }] = useSubmitWorkingDateMutation();

  const historyEntries = historyRes?.data || [];
  const hasMore = historyRes?.hasMore || false;

  const loaderRef = useRef(null);

  // Role & Session Info
  const userRole = (localStorage.getItem('role') || 'user').toUpperCase();
  const userName = localStorage.getItem('user-name') || 'User';
  
  // Modal State for Super Admin Detail View
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const modalLoaderRef = useRef(null);

  // Detail Query for specific employee history
  const { 
    currentData: employeeHistoryRes, 
    isFetching: isDetailLoading 
  } = useGetEmployeeHistoryDetailQuery({ 
      targetUsername: selectedEmployee?.userName, 
      page: modalPage, 
      limit: 10 
  }, {
    skip: !isModalOpen || !selectedEmployee?.userName,
    refetchOnMountOrArgChange: true // Ensure fresh data when modal opens
  });

  const employeeHistory = employeeHistoryRes?.data || [];
  const hasMoreModal = employeeHistoryRes?.hasMore || false;

  // Helper to get formatted current time
  const getFormattedTime = () => {
    return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleExportCSV = () => {
    if (!employeeHistory || employeeHistory.length === 0) {
      toast.error("No data to export");
      return;
    }

    // CSV Headers
    const headers = ["User Name", "Working Details", "Assign By", "Image URL", "Date", "Time", "ID"];
    
    // CSV Rows
    const rows = employeeHistory.map(item => [
      selectedEmployee.userName || "",
      item.workDetail ? `"${item.workDetail.replace(/"/g, '""')}"` : "",
      item.assignBy ? `"${item.assignBy.replace(/"/g, '""')}"` : "",
      item.image || "",
      item.date || "",
      item.time || "",
      item.id || ""
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedEmployee.name}_working_history.csv`);
    link.className = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV Exported successfully");
  };

  const [entry, setEntry] = useState({
    date: new Date(selectedDate).toLocaleDateString('en-GB'),
    time: (manualTime || getFormattedTime()),
    workDetail: "",
    assignBy: "",
    image: null,
    imagePreview: null
  });


  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Refresh on mount
  useEffect(() => {
    refetchHistory();
  }, [refetchHistory]);

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

  // Infinite Scroll Observer for Modal
  useEffect(() => {
    if (!hasMoreModal || isDetailLoading) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setModalPage(prev => prev + 1);
      }
    }, { threshold: 0.1 });

    if (modalLoaderRef.current) {
      observer.observe(modalLoaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreModal, isDetailLoading]);


  // Fetch Users for "Assign By"
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
    setEntry({
      date: new Date(selectedDate).toLocaleDateString('en-GB'),
      time: (manualTime || getFormattedTime()),
      workDetail: "",
      assignBy: "",
      image: null,
      imagePreview: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entry.workDetail.trim()) {
      toast.error("Please add work detail");
      return;
    }

    try {
      const payload = {
        selectedDate,
        entries: [{
          time: entry.time,
          workDetail: entry.workDetail,
          assignBy: entry.assignBy,
          image_base64: entry.imagePreview
        }]
      };

      const res = await submitWorkMutation(payload).unwrap();
      
      toast.success(res.message || "Successfully submitted working detail");
      
      // Clear entry after success
      handleClearEntry();
      // Manual refetch for better UX
      refetchHistory();
      
    } catch (err) {
      toast.error(err?.data?.error || "Failed to submit work details");
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50 relative">
        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        </div>
        
        <div className="relative z-10 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Daily Working Management</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              <p className="text-slate-500 text-sm font-medium">Daily Task Submission & Tracking</p>
            </div>
          </div>
        </div>

            {/* Quick Task Submission Section */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Live Clock Card */}
                <div className="lg:col-span-4 xl:col-span-3">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)' }}
                    className="p-6 rounded-3xl shadow-xl shadow-purple-100/50 relative overflow-hidden group h-full border border-purple-200"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-500 text-purple-950">
                      <Clock size={120} />
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1 rounded-full backdrop-blur-sm border border-purple-500/10">
                          <Calendar size={14} className="text-purple-700" />
                          <span className="text-purple-700 text-[10px] font-semibold uppercase tracking-wider">Current Time</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                          <span className="text-purple-700/80 text-[10px] font-semibold uppercase tracking-wider">Live</span>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-purple-900 text-lg font-bold tracking-tight">
                          {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-purple-950 text-5xl font-bold tracking-tighter drop-shadow-sm">
                            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).split(' ')[0]}
                          </span>
                          <span className="text-purple-800 text-xl font-semibold uppercase tracking-widest">
                            {currentTime.toLocaleTimeString('en-GB', { hour12: true }).split(' ')[1]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Date Selection Card */}
                <div className="lg:col-span-8 xl:col-span-9">
                  <div className="bg-[#f8fafc] p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    
                    <div className="flex-1 space-y-4 w-full relative z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-2">
                          <Database size={14} className="text-purple-500" />
                          Date Details
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold uppercase border border-amber-200 shadow-sm">Editable</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                            Date
                          </label>
                          <div className="relative group">
                            <Calendar className="absolute left-4 top-[65%] -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                            <input 
                              type="date"
                              value={selectedDate}
                              onChange={(e) => {
                                setSelectedDate(e.target.value);
                                const newDateFormatted = new Date(e.target.value).toLocaleDateString('en-GB');
                                handleUpdateEntry('date', newDateFormatted);
                              }}
                              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all font-semibold text-slate-700 shadow-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                            Time
                          </label>
                          <div className="relative group">
                            <Clock className="absolute left-4 top-[65%] -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                            <input 
                              type="text"
                              placeholder="e.g. 09:00 AM"
                              value={manualTime || currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              onChange={(e) => {
                                const newTime = e.target.value;
                                setManualTime(newTime);
                                handleUpdateEntry('time', newTime);
                              }}
                              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all font-semibold text-slate-700 shadow-sm" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-slate-400 text-[11px] font-medium italic mt-2 ml-1">
                        Select the date and time for your working details submission
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Entry Builder (Single Row) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative z-20"
              >
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 rounded-t-[2rem]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Quick Task Submission</h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleClearEntry}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-500 flex items-center gap-2 px-4 py-2 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <RefreshCw size={14} />
                    Reset Form
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    {/* Work Detail */}
                    <div className="md:col-span-5 space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Work Detail</label>
                      <textarea 
                        placeholder="Describe the work done..."
                        className="w-full p-3 text-sm bg-slate-50/50 border border-slate-100 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-medium text-slate-600 resize-none min-h-[50px]"
                        value={entry.workDetail}
                        onChange={(e) => handleUpdateEntry('workDetail', e.target.value)}
                      />
                    </div>

                    {/* Assign By */}
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Assign By</label>
                      <TableSearchableSelect 
                        value={entry.assignBy}
                        onChange={(val) => handleUpdateEntry('assignBy', val)}
                        options={users}
                        placeholder="Search person..."
                      />
                    </div>

                    {/* Image Proof */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Proof Image</label>
                      <div className="relative group/img">
                        <label className="cursor-pointer block">
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleImageChange(e.target.files[0])}
                          />
                          {entry.imagePreview ? (
                            <div className="h-10 w-full rounded-lg overflow-hidden border-2 border-indigo-100 ring-2 ring-white">
                              <img src={entry.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                          ) : (
                            <div className="h-10 w-full flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg border border-dashed border-slate-300 hover:border-purple-400 hover:bg-slate-50 transition-all">
                              <ImageIcon size={18} />
                              <span className="ml-2 text-[10px] font-bold uppercase">Upload</span>
                            </div>
                          )}
                        </label>
                        {entry.imagePreview && (
                          <button 
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

                    {/* Submit Button */}
                    <div className="md:col-span-2">
                      <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className={`w-full flex items-center justify-center gap-3 px-6 py-3 text-purple-900 font-bold rounded-xl transition-all shadow-lg border border-purple-200 transform ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-2xl active:scale-95'}`}
                        style={{ background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)' }}
                      >
                        <Save size={18} className={`text-purple-700 ${isSubmitting ? 'animate-pulse' : ''}`} />
                        <span className="truncate">{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

        {/* History Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 relative z-10"
        >
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-visible">
              {/* History Header */}
              <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {userRole === 'SUPER_ADMIN' ? 'Global Employee Directory' : 
                     userRole === 'ADMIN' ? 'Departmental Work Records' : 
                     userRole === 'DIV_ADMIN' ? 'Division Work Records' : 
                     'Submission History'}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {userRole === 'SUPER_ADMIN' ? 'Manage global employee work records' :
                     userRole === 'ADMIN' ? 'Manage your department\'s work records' :
                     userRole === 'DIV_ADMIN' ? 'Manage your division\'s work records' :
                     'View your previous working date submissions'}
                  </p>
                </div>
                
                 <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Search Box */}
                  <div className="relative group w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="text-slate-400 group-focus-within:text-purple-500 transition-colors" size={16} />
                    </div>
                    <input 
                      type="text"
                      placeholder={userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'DIV_ADMIN' 
                        ? "Search name or ID..." 
                        : "Search work details..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all placeholder:text-slate-400"
                    />
                    {searchTerm && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="text-slate-300 hover:text-rose-500 transition-colors focus:outline-none"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none flex items-center justify-center bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-purple-100 shadow-sm whitespace-nowrap">
                      {historyEntries.length} {userRole === 'SUPER_ADMIN' ? 'employees' : 'entries'}
                    </div>
                    <button 
                      onClick={() => refetchHistory()}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-purple-900 text-[11px] font-bold uppercase rounded-xl hover:shadow-xl transition-all shadow-lg shadow-purple-100 border border-purple-200 tracking-wider whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)' }}
                    >
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        whileTap={{ scale: 0.8 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className={isHistoryLoading ? 'animate-spin' : ''}
                      >
                        <RefreshCw size={14} className="text-purple-700" />
                      </motion.div>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Table Rendering based on Role */}
              <div className="min-h-[400px]">
                {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'DIV_ADMIN') ? (
                  /* Admin/Editor View: Employee Directory list based on jurisdiction */
                  <>
                    {/* Mobile Admin List */}
                    <div className="md:hidden divide-y divide-slate-50">
                      {historyEntries.map((emp, idx) => (
                        <div key={`emp-mob-${emp.empId || 'none'}-${idx}`} className="p-4 space-y-4 active:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-purple-200">
                              ID: {emp.empId && emp.empId !== 'NA' ? emp.empId : 'N/A'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
                              <Calendar size={12} className="text-purple-500 opacity-50" />
                              Active: {new Date(emp.lastActive).toLocaleDateString('en-GB')}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between group">
                            <h4 className="text-base font-bold text-slate-800 tracking-tight">{emp.name}</h4>
                            <button 
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsModalOpen(true);
                                setModalPage(1); // Reset modal pagination
                              }}
                              className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[11px] font-bold uppercase border border-purple-100 active:scale-95 transition-all"
                            >
                              View Records
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Admin Table */}
                    <table className="hidden md:table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
                          <th className="px-8 py-5">Last Active Entry</th>
                          <th className="px-8 py-5">Employee Name</th>
                          <th className="px-8 py-5">Employee ID</th>
                          <th className="px-8 py-5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {historyEntries.map((emp, idx) => (
                          <tr key={`emp-${emp.empId || 'none'}-${idx}`} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                <Calendar size={14} className="text-purple-500 opacity-60" />
                                <span className="text-sm">
                                  {new Date(emp.lastActive).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <button 
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setIsModalOpen(true);
                                }}
                                className="text-sm font-bold text-slate-800 hover:text-purple-600 transition-colors tracking-tight text-left"
                              >
                                {emp.name}
                              </button>
                            </td>
                            <td className="px-8 py-6">
                              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[11px] font-bold border border-slate-200 uppercase">
                                {emp.empId && emp.empId !== 'NA' ? emp.empId : 'N/A'}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <button 
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setIsModalOpen(true);
                                }}
                                className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold uppercase hover:bg-purple-100 transition-all border border-purple-100"
                              >
                                View Records
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  /* Regular User: Personal History */
                  <>
                    {/* Mobile User List */}
                    <div className="md:hidden divide-y divide-slate-50">
                      {historyEntries.map((item, idx) => (
                        <div key={`hist-mob-${item.id || 'na'}-${idx}`} className="p-5 space-y-4 bg-white active:bg-slate-50 transition-colors">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-slate-700">{item.date}</span>
                                 <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                 <span className="text-[10px] font-semibold text-purple-600">{item.time}</span>
                              </div>
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                                 #{item.id}
                              </span>
                           </div>

                           <div className="space-y-1.5">
                              <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                "{item.workDetail}"
                              </p>
                           </div>

                           <div className="flex items-center justify-between gap-4 pt-2">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">BY: {item.assignBy}</span>
                              </div>
                              
                              {item.image && (
                                <a 
                                  href={item.image} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="h-10 w-10 flex-shrink-0 rounded-lg border border-purple-100 overflow-hidden shadow-sm"
                                >
                                  <img src={item.image} className="w-full h-full object-cover" alt="Proof" />
                                </a>
                              )}
                           </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop User Table */}
                    <table className="hidden md:table w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Time</th>
                          <th className="px-8 py-5">ID</th>
                          <th className="px-8 py-5 min-w-[300px]">Working Details</th>
                          <th className="px-8 py-5">Assign By</th>
                          <th className="px-8 py-5 text-center">Image</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {historyEntries.map((item, idx) => (
                          <tr key={`hist-${item.id || 'na'}-${idx}`} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <span className="text-sm font-bold text-slate-700">{item.date}</span>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2 text-purple-600 font-semibold">
                                 <Clock size={14} className="opacity-50" />
                                 <span className="text-sm">{item.time}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[11px] font-bold border border-indigo-100 uppercase">
                                {item.id}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-medium text-slate-600 leading-relaxed tracking-tight">
                                {item.workDetail}
                              </p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-sm font-semibold text-slate-700">{item.assignBy}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                               {item.image ? (
                                 <a 
                                   href={item.image} 
                                   target="_blank" 
                                   rel="noreferrer" 
                                   className="h-10 w-10 mx-auto block rounded-lg border border-purple-100 overflow-hidden hover:opacity-80 transition-all shadow-sm"
                                 >
                                    <img 
                                      src={item.image} 
                                      alt="Work proof" 
                                      className="h-full w-full object-cover"
                                    />
                                 </a>
                               ) : (
                                 <div className="h-10 w-10 mx-auto flex items-center justify-center bg-slate-50 text-slate-300 rounded-lg border border-slate-200">
                                    <ImageIcon size={18} />
                                 </div>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              
              {/* Infinite Scroll Loader Sentinel */}
              <div ref={loaderRef} className="py-8 flex flex-col items-center justify-center gap-4 bg-slate-50/10">
                {(isHistoryFetching) ? (
                  <>
                    <div className="animate-spin text-purple-500">
                      <RefreshCw size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading more entries...</p>
                  </>
                ) : !hasMore && historyEntries.length > 0 ? (
                  <div className="p-6 bg-slate-50/30 border-t border-slate-50 text-center">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                      {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'DIV_ADMIN') ? 'End of Directory List' : 'End of History Record'}
                    </p>
                  </div>
                ) : historyEntries.length === 0 && !isHistoryLoading ? (
                  <div className="py-10 text-center">
                    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100 shadow-sm text-slate-300">
                      <Search size={20} />
                    </div>
                    <p className="text-slate-400 text-xs font-semibold italic">No records found matching your search</p>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        

        </div>
      </div>
      

      {/* --- Super Admin Employee Detail Modal --- */}
      <AnimatePresence>
        {isModalOpen && selectedEmployee && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f3e8ff, #d8b4fe)' }}>
                <div>
                  <div className="flex items-center gap-3">
                   <span className="bg-white/40 text-purple-950 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-white/40">Employee Profile</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-700"></span>
                    <span className="text-purple-900 text-xs font-semibold uppercase tracking-widest">{selectedEmployee.empId && selectedEmployee.empId !== 'NA' ? selectedEmployee.empId : 'N/A'}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-purple-950 mt-1 tracking-tight">{selectedEmployee.name}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/40 hover:bg-white/60 text-purple-950 rounded-2xl transition-all border border-white/20 font-bold text-xs uppercase tracking-wider shadow-sm"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Export CSV</span>
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-3 bg-white/20 hover:bg-white/40 text-purple-950 rounded-2xl transition-all border border-white/20"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content - History Table */}
              <div className="p-0 md:p-2 overflow-y-auto">
                <div className="bg-slate-50/50 md:rounded-[1.5rem] overflow-hidden">
                  {/* Mobile Modal History List */}
                  <div className="md:hidden divide-y divide-white">
                    {employeeHistory.map((item, idx) => (
                      <div key={`detail-mob-${item.id || 'na'}-${idx}`} className="p-5 space-y-4 bg-white/60 active:bg-white transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{item.date}</span>
                            <span className="h-1 w-1 rounded-full bg-purple-300"></span>
                            <span className="text-[10px] font-semibold text-purple-600">{item.time}</span>
                          </div>
                          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">#{item.id}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{item.workDetail}"</p>
                        <div className="flex items-center justify-between pt-2">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <span className="text-[10px] font-semibold text-slate-400 uppercase">Assigned: {item.assignBy}</span>
                           </div>
                           {item.image && (
                             <a href={item.image} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-lg overflow-hidden border border-purple-100 shadow-sm">
                               <img src={item.image} className="w-full h-full object-cover" alt="Proof" />
                             </a>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Modal History Table */}
                  <table className="hidden md:table w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                        <th className="px-8 py-5 min-w-[200px]">Working Details</th>
                        <th className="px-8 py-5">Assign By</th>
                        <th className="px-8 py-5 text-center">Image</th>
                        <th className="px-8 py-5">Date</th>
                        <th className="px-8 py-5">Time</th>
                        <th className="px-8 py-5">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white">
                      {employeeHistory.map((item, idx) => (
                        <tr key={`detail-${item.id || 'na'}-${idx}`} className="group hover:bg-white transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-sm font-medium text-slate-600 leading-relaxed tracking-tight">
                              {item.workDetail}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="text-sm font-semibold text-slate-700">{item.assignBy}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                             {item.image ? (
                               <a 
                                 href={item.image} 
                                 target="_blank" 
                                 rel="noreferrer" 
                                 className="h-10 w-10 mx-auto block rounded-lg border border-slate-100 overflow-hidden shadow-sm hover:opacity-80 transition-all"
                               >
                                  <img 
                                    src={item.image} 
                                    alt="Work proof" 
                                    className="h-full w-full object-cover"
                                  />
                               </a>
                             ) : (
                               <div className="h-10 w-10 mx-auto flex items-center justify-center bg-white text-slate-300 rounded-lg border border-slate-100 shadow-sm">
                                  <ImageIcon size={18} />
                               </div>
                             )}
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-slate-700">{item.date}</span>
                          </td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2 text-purple-600 font-semibold">
                               <Clock size={14} className="opacity-50" />
                               <span className="text-sm">{item.time}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[11px] font-bold border border-indigo-100 uppercase">
                              {item.id}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {employeeHistory.length === 0 && !isDetailLoading && (
                    <div className="py-20 text-center">
                      <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm text-slate-300">
                        <Search size={24} />
                      </div>
                      <p className="text-slate-500 font-bold italic">No records found for this employee</p>
                    </div>
                  )}


                  {/* Modal Infinite Scroll Sentinel */}
                  <div ref={modalLoaderRef} className="py-8 flex flex-col items-center justify-center gap-4 bg-slate-50/10">
                    {(isDetailLoading) ? (
                      <>
                        <div className="animate-spin text-purple-500">
                          <RefreshCw size={24} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading more records...</p>
                      </>
                    ) : !hasMoreModal && employeeHistory.length > 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          End of employee records
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-white text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
                >
                  Close Records
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </AdminLayout>
  );
};

export default WorkingDate;
