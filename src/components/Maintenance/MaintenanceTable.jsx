import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, X, Download,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

const PartNameCellDesktop = ({ partName }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Normalize partName into an array
  let partsArray = [];
  if (Array.isArray(partName)) {
    partsArray = partName;
  } else if (typeof partName === 'string') {
    partsArray = partName.split(',').map(s => s.trim()).filter(Boolean);
  }

  if (partsArray.length === 0) {
    return <div className="text-sm text-gray-500">-</div>;
  }

  if (partsArray.length <= 1) {
    return <div className="text-sm text-gray-500 w-[190px] min-w-[190px] max-w-[190px] truncate">{partsArray[0]}</div>;
  }

  return (
    <div className="w-[190px] min-w-[190px] max-w-[190px] flex flex-col items-start">
      <div 
        className={`w-full text-sm text-gray-500 transition-all duration-200 ${expanded ? 'whitespace-normal break-words' : 'truncate'}`}
        title={!expanded ? partsArray.join(', ') : ''}
      >
        {partsArray.join(', ')}
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="text-[10px] text-purple-600 hover:text-purple-800 font-bold uppercase tracking-wider mt-1.5 focus:outline-none transition-colors flex items-center gap-1"
      >
        {expanded ? "Show Less" : `Show More (${partsArray.length - 1})`}
      </button>
    </div>
  );
};


const MaintenanceTable = ({ 
  tasks, 
  isLoading,
  onRefresh,
  onOpenReportModal,
  onFilterStateChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Helpers ---
  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return new Date(NaN);
    
    // 1. ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Split by ' ' or 'T' to get date and time parts
      const parts = dateStr.split(/[ T]/);
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split(/[+-Z]/)[0] : "00:00:00";
      
      const [y, m, d] = datePart.split("-").map(Number);
      const tUnits = timePart.split(":").map(Number);
      
      // Create a local date object using individual components
      // This ignores the UTC offset if any and treats it as local time
      return new Date(y, m - 1, d, tUnits[0] || 0, tUnits[1] || 0, tUnits[2] || 0);
    }
    
    // 2. Regional format (DD/MM/YYYY or DD/MM/YYYY HH:mm:ss)
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ");
      const datePart = parts[0];
      const dateComponents = datePart.split("/");
      if (dateComponents.length !== 3) return new Date(NaN);
      
      const [day, month, year] = dateComponents.map(Number);
      const date = new Date(year, month - 1, day);
      
      if (parts.length > 1) {
        const timeParts = parts[1].split(":");
        if (timeParts.length >= 2) {
          date.setHours(Number(timeParts[0]) || 0, Number(timeParts[1]) || 0, Number(timeParts[2]) || 0);
        }
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    }
    
    return new Date(dateStr);
  };

  const [selectedMachine, setSelectedMachine] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedPart, setSelectedPart] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract unique options for dropdowns based on tasks
  const uniqueMachineNames = useMemo(() => {
    const names = new Set();
    tasks.forEach(t => {
      if (t.machine_name) names.add(t.machine_name.trim());
    });
    return Array.from(names).sort();
  }, [tasks]);

  const uniqueDivisions = useMemo(() => {
    const divs = new Set();
    tasks.forEach(t => {
      if (t.machine_division) divs.add(t.machine_division.trim());
    });
    return Array.from(divs).sort();
  }, [tasks]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    tasks.forEach(t => {
      if (t.machine_department) depts.add(t.machine_department.trim());
    });
    return Array.from(depts).sort();
  }, [tasks]);

  const uniqueParts = useMemo(() => {
    const parts = new Set();
    tasks.forEach(t => {
      if (Array.isArray(t.part_name)) {
        t.part_name.forEach(p => p && parts.add(p.trim()));
      } else if (typeof t.part_name === 'string' && t.part_name.trim()) {
        t.part_name.split(',').forEach(p => p && parts.add(p.trim()));
      }
    });
    return Array.from(parts).sort();
  }, [tasks]);

  // --- Filtering Logic ---
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Dropdown Filters
    if (selectedMachine !== 'all') {
      result = result.filter(t => (t.machine_name || '').trim() === selectedMachine);
    }
    if (selectedDivision !== 'all') {
      result = result.filter(t => (t.machine_division || '').trim() === selectedDivision);
    }
    if (selectedDepartment !== 'all') {
      result = result.filter(t => (t.machine_department || '').trim() === selectedDepartment);
    }
    if (selectedPart !== 'all') {
      result = result.filter(t => {
        if (Array.isArray(t.part_name)) {
          return t.part_name.some(p => p && p.trim() === selectedPart);
        }
        if (typeof t.part_name === 'string') {
          return t.part_name.split(',').map(s => s.trim()).includes(selectedPart);
        }
        return false;
      });
    }

    // Custom Date Range Filter (Child date selection)
    if (startDate || endDate) {
      result = result.filter(task => {
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDate(dStr);
        if (isNaN(taskDate.getTime())) return false;

        const taskDayStr = taskDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        if (startDate && taskDayStr < startDate) return false;
        if (endDate && taskDayStr > endDate) return false;
        return true;
      });
    }

    // Quick Time Filter preset
    if (timeFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter(task => {
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDate(dStr);
        
        if (isNaN(taskDate.getTime())) return false;

        if (timeFilter === 'today') {
          return taskDate.getFullYear() === now.getFullYear() &&
                 taskDate.getMonth() === now.getMonth() &&
                 taskDate.getDate() === now.getDate();
        }
        
        if (timeFilter === 'week') {
          const monday = new Date(todayStart);
          const day = monday.getDay();
          const diff = (day === 0 ? -6 : 1 - day);
          monday.setDate(monday.getDate() + diff);
          
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          
          return taskDate >= monday && taskDate <= sunday;
        }

        if (timeFilter === 'month') {
          return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
        }
        
        return true;
      });
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        (task.machine_name || '').toLowerCase().includes(query) ||
        (Array.isArray(task.part_name) ? task.part_name.join(', ') : (task.part_name || '')).toLowerCase().includes(query) ||
        (task.task_description || '').toLowerCase().includes(query) ||
        (task.name || '').toLowerCase().includes(query)
      );
    }

    // Sort: Earliest first (Ascending)
    result.sort((a, b) => {
      const dStrA = a.planned_date || a.dueDate || a.submission_date || a.task_start_date;
      const dStrB = b.planned_date || b.dueDate || b.submission_date || b.task_start_date;
      const dateA = parseDate(dStrA);
      const dateB = parseDate(dStrB);
      
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      
      if (timeA !== timeB) return timeA - timeB;
      
      const idA = Number(a.task_id || a.id) || 0;
      const idB = Number(b.task_id || b.id) || 0;
      return idA - idB;
    });

    return result;
  }, [tasks, selectedMachine, selectedDivision, selectedDepartment, selectedPart, startDate, endDate, timeFilter, searchQuery]);

  React.useEffect(() => {
    if (onFilterStateChange) {
      onFilterStateChange({
        filteredTasks,
        startDate,
        endDate,
        timeFilter,
        selectedMachine,
        selectedDivision,
        selectedDepartment,
        selectedPart
      });
    }
  }, [filteredTasks, startDate, endDate, timeFilter, selectedMachine, selectedDivision, selectedDepartment, selectedPart, onFilterStateChange]);

  // --- Pagination ---
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTasks, currentPage]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  // --- Status Badge Helper ---
  const getStatusBadge = (task) => {
    const adminDone = task.admin_done === 'true' || task.admin_done === 'Done' || task.admin_done === true;
    const isSubmitted = !!(task.submission_date || task.status === 'yes' || task.status === 'no');

    if (adminDone) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </span>
      );
    }
    if (isSubmitted) {
      return (
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }
    const dStr = task.planned_date || task.dueDate || task.task_start_date;
    const taskDate = parseDate(dStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isNaN(taskDate.getTime())) {
      const compareDate = new Date(taskDate);
      compareDate.setHours(0, 0, 0, 0);
      if (compareDate < today) {
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" /> Overdue
          </span>
        );
      }
      if (compareDate > today) {
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Clock className="h-3 w-3" /> Upcoming
          </span>
        );
      }
    }

    return (
      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  };

  // Export Tasks to CSV
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      return;
    }

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/"/g, "\"\"")}"`;
      }
      return str;
    };

    const headers = [
      "Task Seq",
      "Machine Name",
      "Part Name",
      "Part Area",
      "Department",
      "Division",
      "Assign From",
      "Assigned To",
      "Task Description",
      "Manpower",
      "Start Date & Time",
      "Frequency",
      "Status"
    ];

    const rows = filteredTasks.map((task, index) => {
      const partsStr = Array.isArray(task.part_name) 
        ? task.part_name.join(", ") 
        : (task.part_name || "");

      let statusText = "Pending";
      const adminDone = task.admin_done === 'true' || task.admin_done === 'Done' || task.admin_done === true;
      const isSubmitted = !!(task.submission_date || task.status === 'yes' || task.status === 'no');
      if (adminDone) statusText = "Approved";
      else if (isSubmitted) statusText = "Completed";
      else {
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDate(dStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isNaN(taskDate.getTime())) {
          const compareDate = new Date(taskDate);
          compareDate.setHours(0, 0, 0, 0);
          if (compareDate < today) statusText = "Overdue";
          else if (compareDate > today) statusText = "Upcoming";
        }
      }

      return [
        index + 1,
        escapeCSV(task.machine_name || ""),
        escapeCSV(partsStr || ""),
        escapeCSV(task.part_area || ""),
        escapeCSV(task.machine_department || ""),
        escapeCSV(task.machine_division || ""),
        escapeCSV(task.givenBy || task.given_by || ""),
        escapeCSV(task.name || ""),
        escapeCSV(task.task_description || ""),
        escapeCSV(task.manpower ?? 0),
        escapeCSV(task.planned_date || task.dueDate || ""),
        escapeCSV(task.frequency || ""),
        escapeCSV(statusText)
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `maintenance_tasks_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasActiveFilters = selectedMachine !== 'all' || selectedDivision !== 'all' || selectedDepartment !== 'all' || selectedPart !== 'all' || startDate !== '' || endDate !== '' || searchQuery !== '' || timeFilter !== 'all';

  const resetAllFilters = () => {
    setSelectedMachine('all');
    setSelectedDivision('all');
    setSelectedDepartment('all');
    setSelectedPart('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setTimeFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search, Dropdown Filters and Date Filter Section */}
      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-purple-100/80 space-y-3">
        {/* Row 1: Dropdown Filters (Machine Name, Division, Department, Machine Part) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Machine Name</label>
            <select
              value={selectedMachine}
              onChange={(e) => { setSelectedMachine(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 cursor-pointer text-gray-700"
            >
              <option value="all">All Machines ({uniqueMachineNames.length})</option>
              {uniqueMachineNames.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Machine Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 cursor-pointer text-gray-700"
            >
              <option value="all">All Divisions ({uniqueDivisions.length})</option>
              {uniqueDivisions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Machine Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 cursor-pointer text-gray-700"
            >
              <option value="all">All Departments ({uniqueDepartments.length})</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">Machine Part</label>
            <select
              value={selectedPart}
              onChange={(e) => { setSelectedPart(e.target.value); setCurrentPage(1); }}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 cursor-pointer text-gray-700"
            >
              <option value="all">All Parts ({uniqueParts.length})</option>
              {uniqueParts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Search, Child Date Range, Time presets, Export CSV & Reset */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-gray-200/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-48 sm:w-56 pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Child Date Range Filter */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-300 text-xs">
              <span className="text-[10px] font-bold uppercase text-gray-500 px-1">Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                title="From Date"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                title="To Date"
              />
            </div>

            {/* Filter by Time Presets */}
            <div className="flex items-center gap-1">
              {['today', 'week', 'month', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => { setTimeFilter(filter); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    timeFilter === filter 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200 bg-white"
                title="Reset all applied filters"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase whitespace-nowrap">
              Showing: {filteredTasks.length} Tasks
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div 
        className="hidden md:block rounded-md border border-gray-200 overflow-auto"
        style={{ maxHeight: "500px" }}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Seq</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Area</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Div</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign From</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manpower</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Start Date & Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freq</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan="13" className="px-6 py-4 animate-pulse bg-gray-50/50"></td>
                </tr>
              ))
            ) : paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan="13" className="px-6 py-12 text-center text-gray-500">
                   <div className="flex flex-col items-center gap-2">
                     <p className="text-sm font-medium">No maintenance data found for the selected filters.</p>
                   </div>
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, index) => {
                return (
                  <tr 
                    key={task.task_id || task.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.machine_name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <PartNameCellDesktop partName={task.part_name} />
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500">
                       {task.part_area || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{task.machine_department || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{task.machine_division || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                       {task.givenBy || task.given_by || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm font-medium text-gray-900">{task.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.task_description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-700 text-center">
                      {task.manpower ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.planned_date || task.dueDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
                        {task.frequency || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(task)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              <div className="h-8 bg-gray-50 rounded w-full"></div>
            </div>
          ))
        ) : paginatedTasks.length === 0 ? (
          <div className="py-12 bg-gray-50 rounded-xl text-center text-gray-500 border border-dashed border-gray-200">
            No maintenance records found.
          </div>
        ) : (
          paginatedTasks.map((task, index) => {
            return (
              <div 
                key={task.task_id || task.id} 
                className="bg-white p-4 rounded-xl border border-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {/* Card Header: Seq & Machine */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">#{ (currentPage - 1) * itemsPerPage + index + 1 }</span>
                    <h4 className="font-bold text-gray-900">
                      {task.machine_name || 'Unnamed Machine'}
                    </h4>
                  </div>
                  {getStatusBadge(task)}
                </div>

                {/* Card Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Part & Area</p>
                    <p className="text-xs font-medium text-gray-700">
                      {Array.isArray(task.part_name) ? task.part_name.join(', ') : (task.part_name || '-')} 
                      <span className="text-gray-400 mx-1">|</span> {task.part_area || '-'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Dept / Div</p>
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {task.machine_department || '-'} / {task.machine_division || '-'}
                    </p>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Assigned To (From: {task.givenBy || task.given_by || '—'})</p>
                    <p className="text-xs font-semibold text-purple-700">{task.name || '-'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Planned Date</p>
                    <p className="text-xs font-medium text-gray-600 flex items-center gap-1 text-[10px]">
                      <Clock className="h-3 w-3" /> {task.planned_date || task.dueDate || '-'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Frequency</p>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                      {task.frequency || '-'}
                    </span>
                  </div>
                </div>

                {/* Task Description */}
                <div className="mb-4 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">Task Description</p>
                  <p className="text-xs text-gray-600 italic line-clamp-2 leading-relaxed">
                    {task.task_description || 'No description provided'}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                  {task.image_url && (
                    <button 
                      onClick={() => setSelectedImage(task.image_url)} 
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg font-bold text-xs hover:bg-purple-100 active:scale-95 transition-all"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Evidence
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Container - Matching Staff style */}
      {!isLoading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 py-4 px-2 border-t border-gray-100 mt-2">
          <p className="text-xs text-gray-500 order-2 sm:order-1">
            Showing <span className="font-medium text-purple-600">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-purple-600">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> of <span className="font-medium text-purple-600">{filteredTasks.length}</span> results
          </p>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 bg-white shadow-sm transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </button>
            <div className="flex items-center gap-1">
              {/* Mobile View with 3 pages max */}
              <div className="flex sm:hidden items-center gap-1">
               {(() => {
                  const max = 3;
                  let start = Math.max(1, currentPage - Math.floor(max / 2));
                  let end = Math.min(totalPages, start + max - 1);
                  if (end - start < max - 1) start = Math.max(1, end - max + 1);
                  const pages = [];
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                        currentPage === page 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>

              {/* Desktop View with 5 pages max */}
              <div className="hidden sm:flex items-center gap-1">
                {(() => {
                  const max = 5;
                  let start = Math.max(1, currentPage - Math.floor(max / 2));
                  let end = Math.min(totalPages, start + max - 1);
                  if (end - start < max - 1) start = Math.max(1, end - max + 1);
                  const pages = [];
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                        currentPage === page 
                        ? 'bg-purple-600 text-white shadow-md' 
                        : 'text-gray-500 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 bg-white shadow-sm transition-all active:scale-95"
            >
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 p-2 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-red-400 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={selectedImage} 
              alt="Evidence" 
              className="w-auto h-auto max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            <div className="mt-2 text-center pb-2">
              <a href={selectedImage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm font-medium">Open Original Image in New Tab</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTable;
