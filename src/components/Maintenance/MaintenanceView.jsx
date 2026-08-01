import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hasPageAccess } from '../../utils/permissionUtils';
import { 
  maintenanceData, 
  maintenanceHistoryData, 
  fetchMachinePartsData,
  updateUniqueMaintenanceTask 
} from '../../redux/slice/maintenanceSlice';
import StatsCards from './StatsCards';
import MaintenanceCharts from './MaintenanceCharts';
import MaintenanceTable from './MaintenanceTable';
import MaintenanceReportModal from './MaintenanceReportModal';
import MaintenanceTopPerformersModal from '../modals/MaintenanceTopPerformersModal';
import { fetchUserDetailsApi } from '../../redux/api/settingApi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RefreshCw, ClipboardList, X, Settings2, MapPin, Cog, CheckCircle2, AlertCircle, Clock, Download, Filter, ChevronUp, ChevronDown, ArrowRight, FileText, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';


const MachineModal = ({ isOpen, onClose, machines }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedDivision("all");
      setSelectedDepartment("all");
    }
  }, [isOpen]);

  const uniqueDivisions = useMemo(() => {
    const divs = new Set();
    machines.forEach(m => {
      if (m.machine_division) divs.add(m.machine_division.trim());
    });
    return Array.from(divs).sort();
  }, [machines]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    machines.forEach(m => {
      if (m.machine_department) depts.add(m.machine_department.trim());
    });
    return Array.from(depts).sort();
  }, [machines]);

  const filtered = useMemo(() => {
    return machines.filter(m => {
      // Division filter
      if (selectedDivision !== "all" && m.machine_division?.trim() !== selectedDivision) return false;
      
      // Department filter
      if (selectedDepartment !== "all" && m.machine_department?.trim() !== selectedDepartment) return false;

      // Search term filter (match machine_name, part_name, machine_area, machine_department, machine_division)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase().trim();
        const partsText = Array.isArray(m.part_name) ? m.part_name.join(' ') : (m.part_name || '');
        const match = 
          (m.machine_name && m.machine_name.toLowerCase().includes(query)) ||
          (partsText && partsText.toLowerCase().includes(query)) ||
          (m.machine_area && m.machine_area.toLowerCase().includes(query)) ||
          (m.machine_department && m.machine_department.toLowerCase().includes(query)) ||
          (m.machine_division && m.machine_division.toLowerCase().includes(query));
        
        return match;
      }
      return true;
    });
  }, [machines, searchTerm, selectedDivision, selectedDepartment]);

  const handleExportCSV = () => {
    try {
      if (filtered.length === 0) {
        toast.error("No machines to export");
        return;
      }

      // Sort/categorize alphabetically by Division, then Department, then Area, then Machine Name
      const sorted = [...filtered].sort((a, b) => {
        const divA = (a.machine_division || "").toLowerCase().trim();
        const divB = (b.machine_division || "").toLowerCase().trim();
        if (divA !== divB) return divA.localeCompare(divB);

        const deptA = (a.machine_department || "").toLowerCase().trim();
        const deptB = (b.machine_department || "").toLowerCase().trim();
        if (deptA !== deptB) return deptA.localeCompare(deptB);

        const areaA = (a.machine_area || "").toLowerCase().trim();
        const areaB = (b.machine_area || "").toLowerCase().trim();
        if (areaA !== areaB) return areaA.localeCompare(areaB);

        const nameA = (a.machine_name || "").toLowerCase().trim();
        const nameB = (b.machine_name || "").toLowerCase().trim();
        return nameA.localeCompare(nameB);
      });

      // Helper to escape CSV fields
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
          return `"${str.replace(/"/g, "\"\"")}"`;
        }
        return str;
      };

      const headers = ["Division", "Department", "Area", "Machine Name", "Parts"];
      const rows = sorted.map(m => {
        const partsStr = Array.isArray(m.part_name) 
          ? m.part_name.join(", ") 
          : (m.part_name || "");
        
        return [
          escapeCSV(m.machine_division || "N/A"),
          escapeCSV(m.machine_department || "N/A"),
          escapeCSV(m.machine_area || "N/A"),
          escapeCSV(m.machine_name || "N/A"),
          escapeCSV(partsStr || "N/A")
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `machine_inventory_${new Date().toLocaleDateString('en-CA')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${sorted.length} machines successfully`);
    } catch (err) {
      toast.error(err.message || "Failed to export CSV");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Machine Inventory</h2>
              <p className="text-sm text-gray-500">
                {searchTerm || selectedDivision !== "all" || selectedDepartment !== "all" 
                  ? `Showing ${filtered.length} of ${machines.length} registered assets` 
                  : `Total ${machines.length} registered assets`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search machines, parts, areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
          </div>

          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-full sm:w-48 cursor-pointer"
          >
            <option value="all">All Divisions</option>
            {uniqueDivisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-full sm:w-48 cursor-pointer"
          >
            <option value="all">All Departments</option>
            {uniqueDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95 w-full sm:w-auto hover:shadow-md cursor-pointer duration-150"
            title="Export categorized machines list to CSV (Excel)"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((machine, index) => (
              <div 
                key={machine.id || index} 
                className="group p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                      <Cog className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {machine.machine_name || 'Unnamed Machine'}
                    </h3>
                  </div>
                  {machine.machine_area && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                      {machine.machine_area}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Settings2 className="h-3.5 w-3.5 opacity-60" />
                    <span className="font-medium">Part:</span>
                    <span className="text-gray-900">{Array.isArray(machine.part_name) ? machine.part_name.join(', ') : (machine.part_name || 'N/A')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3.5 w-3.5 opacity-60" />
                    <span className="font-medium">Area:</span>
                    <span className="text-gray-900">{machine.machine_area || 'Not Assigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Dept:</span>
                    <span className="text-gray-900">{machine.machine_department || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Div:</span>
                    <span className="text-gray-900">{machine.machine_division || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filtered.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block p-4 bg-gray-50 rounded-full">
                <Settings2 className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No machines match the selected filters</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>, document.body
  );
};

const TasksByMachineModal = ({ isOpen, onClose, title, tasks, cardCount, cardType }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // Generate unique filter options dynamically from input tasks
  const assignedToOptions = useMemo(() => {
    const names = tasks.map(t => t.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [tasks]);

  const machineNameOptions = useMemo(() => {
    const names = tasks.map(t => t.machine_name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [tasks]);

  const frequencyOptions = useMemo(() => {
    const freqs = tasks.map(t => t.frequency).filter(Boolean);
    return Array.from(new Set(freqs)).sort();
  }, [tasks]);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, assignedFilter, machineFilter, frequencyFilter, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setAssignedFilter('all');
      setMachineFilter('all');
      setFrequencyFilter('all');
      setShowMobileFilters(false);
    }
  }, [isOpen]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      if (visibleCount < filtered.length) {
        setVisibleCount(prev => prev + 20);
      }
    }
  };

  if (!isOpen) return null;

  // Normalise partName into string for display
  const getPartNameDisplay = (partName) => {
    if (Array.isArray(partName)) return partName.join(', ');
    return partName || '-';
  };

  // Helper to parse date from string (same logic as table)
  const parseDateLocal = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return new Date(NaN);
    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parts = dateStr.split(/[ T]/);
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split(/[+-Z]/)[0] : "00:00:00";
      const [y, m, d] = datePart.split("-").map(Number);
      const tUnits = timePart.split(":").map(Number);
      return new Date(y, m - 1, d, tUnits[0] || 0, tUnits[1] || 0, tUnits[2] || 0);
    }
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ");
      const dateComponents = parts[0].split("/");
      if (dateComponents.length !== 3) return new Date(NaN);
      const [d, m, y] = dateComponents.map(Number);
      const date = new Date(y, m - 1, d);
      if (parts.length > 1) {
        const tParts = parts[1].split(":");
        if (tParts.length >= 2) date.setHours(Number(tParts[0]) || 0, Number(tParts[1]) || 0, Number(tParts[2]) || 0);
      } else date.setHours(0, 0, 0, 0);
      return date;
    }
    return new Date(dateStr);
  };

  const getStatusBadge = (task) => {
    const isCompleted = task.submission_date !== null && task.submission_date !== undefined;
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }
    const dStr = task.planned_date || task.dueDate || task.task_start_date;
    const taskDate = parseDateLocal(dStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isNaN(taskDate.getTime())) {
      const compareDate = new Date(taskDate);
      compareDate.setHours(0, 0, 0, 0);
      if (compareDate < today) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" /> Overdue
          </span>
        );
      }
      if (compareDate > today) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <Clock className="h-3 w-3" /> Upcoming
          </span>
        );
      }
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const date = parseDateLocal(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter tasks based on search query and selections
  const filtered = tasks.filter(task => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesSearch = (
        (task.machine_name || '').toLowerCase().includes(q) ||
        (task.task_description || '').toLowerCase().includes(q) ||
        (task.name || '').toLowerCase().includes(q) ||
        (task.machine_department || '').toLowerCase().includes(q) ||
        (task.machine_division || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
    }

    if (assignedFilter !== 'all' && task.name !== assignedFilter) return false;
    if (machineFilter !== 'all' && task.machine_name !== machineFilter) return false;
    if (frequencyFilter !== 'all' && task.frequency !== frequencyFilter) return false;

    return true;
  });

  // Slice tasks for pagination
  const paginatedTasks = filtered.slice(0, visibleCount);

  // Group paginated tasks by machine name
  const grouped = {};
  paginatedTasks.forEach(task => {
    const mName = task.machine_name || 'Unassigned Machine';
    if (!grouped[mName]) grouped[mName] = [];
    grouped[mName].push(task);
  });

  const sortedMachines = Object.keys(grouped).sort();

  const handleExportCSV = () => {
    const headers = [
      'Machine Name',
      'Machine Division',
      'Machine Department',
      'Part Name',
      'Task Description',
      'Assigned To',
      'Planned Date',
      'Frequency',
      'Status'
    ];

    const rows = filtered.map(task => {
      const isCompleted = task.submission_date !== null && task.submission_date !== undefined;
      let statusStr = 'Pending';
      if (isCompleted) {
        statusStr = 'Completed';
      } else {
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDateLocal(dStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isNaN(taskDate.getTime())) {
          const compareDate = new Date(taskDate);
          compareDate.setHours(0, 0, 0, 0);
          if (compareDate < today) statusStr = 'Overdue';
          else if (compareDate > today) statusStr = 'Upcoming';
        }
      }

      const partNameStr = Array.isArray(task.part_name) 
        ? task.part_name.join('; ') 
        : (task.part_name || '-');

      return [
        task.machine_name || '-',
        task.machine_division || '-',
        task.machine_department || '-',
        partNameStr,
        task.task_description || '-',
        task.name || '-',
        formatDateDisplay(task.planned_date || task.task_start_date),
        task.frequency || '-',
        statusStr
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const cleanVal = String(val).replace(/"/g, '""');
          return cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('\r')
            ? `"${cleanVal}"`
            : cleanVal;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const formattedTitle = title.toLowerCase().replace(/\s+/g, '_');
    const dStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${formattedTitle}_export_${dStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-xl shadow-lg shadow-purple-200 text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">Total {cardCount} activities found</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        {/* Search Bar & Filters Controls */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by machine, description, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
            
            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
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

          {/* Filters Row */}
          <div className={`${showMobileFilters ? 'grid' : 'hidden sm:grid'} grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2 duration-200`}>
            {/* Machine Name Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Machine Name</label>
              <select
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 shadow-sm"
              >
                <option value="all">All Machines ({machineNameOptions.length})</option>
                {machineNameOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Assigned To Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Assigned To</label>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 shadow-sm"
              >
                <option value="all">All Staff ({assignedToOptions.length})</option>
                {assignedToOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Frequency Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Frequency</label>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 shadow-sm"
              >
                <option value="all">All Frequencies ({frequencyOptions.length})</option>
                {frequencyOptions.map(freq => (
                  <option key={freq} value={freq}>{freq.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-4 sm:p-6 space-y-6"
        >
          {sortedMachines.map((machineName) => {
            const machineTasks = grouped[machineName];
            const sampleTask = machineTasks[0] || {};
            return (
              <div 
                key={machineName}
                className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Machine Header */}
                <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-purple-100 rounded text-purple-600">
                      <Settings2 className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {machineName}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
                      {machineTasks.length} {machineTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    {sampleTask.machine_department && (
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Dept: {sampleTask.machine_department}
                      </span>
                    )}
                    {sampleTask.machine_division && (
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                        Div: {sampleTask.machine_division}
                      </span>
                    )}
                  </div>
                </div>

                {/* Machine Tasks List */}
                {/* Desktop View: Table layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm text-left">
                    <thead className="bg-gray-50/30 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Part Name</th>
                        <th className="px-4 py-2.5">Task Description</th>
                        <th className="px-4 py-2.5">Assigned To</th>
                        <th className="px-4 py-2.5">Planned Date</th>
                        <th className="px-4 py-2.5">Freq</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                      {machineTasks.map((task, idx) => (
                        <tr key={task.task_id || task.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                            {getPartNameDisplay(task.part_name)}
                          </td>
                          <td className="px-4 py-3 text-gray-800 break-words max-w-[200px]">
                            {task.task_description || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {task.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-600">
                            {formatDateDisplay(task.planned_date || task.task_start_date)}
                          </td>
                          <td className="px-4 py-3 text-xs uppercase tracking-tight text-gray-500">
                            {task.frequency || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(task)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tablet & Mobile View: Single column card list */}
                <div className="block md:hidden divide-y divide-gray-100">
                  {machineTasks.map((task, idx) => (
                    <div 
                      key={task.task_id || task.id || idx} 
                      className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors text-sm"
                    >
                      {/* Part Name & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 font-bold tracking-wide truncate max-w-[70%]">
                          {getPartNameDisplay(task.part_name)}
                        </span>
                        {getStatusBadge(task)}
                      </div>

                      {/* Description */}
                      <p className="text-gray-800 font-bold leading-relaxed break-words">
                        {task.task_description || '-'}
                      </p>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 border-t border-gray-50 pt-2.5 mt-2.5">
                        <div className="space-y-0.5">
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">Assigned To</span>
                          <span className="font-semibold text-gray-700 block truncate">{task.name || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">Frequency</span>
                          <span className="font-semibold text-gray-700 block uppercase">{task.frequency || '-'}</span>
                        </div>
                        <div className="col-span-2 space-y-0.5">
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">Planned Date</span>
                          <span className="font-semibold text-gray-700 block">
                            {formatDateDisplay(task.planned_date || task.task_start_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {sortedMachines.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block p-4 bg-purple-50 rounded-full text-purple-400">
                <ClipboardList className="h-8 w-8" />
              </div>
              <p className="text-gray-500 font-medium">No tasks found matching your search</p>
            </div>
          )}

          {visibleCount < filtered.length && (
            <div className="flex justify-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {(cardType === 'pending' || cardType === 'overdue') && (
            <button
              onClick={() => {
                const targetStatus = cardType === 'pending' ? 'today' : 'overdue';
                navigate(`/dashboard/data/sales?view=maintenance&status=${targetStatus}`);
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 text-sm flex items-center gap-2"
            >
              Go to Maintenance Tasks
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const MaintenanceView = ({ 
  startDate = "", 
  endDate = "", 
  dashboardStaffFilter = "all", 
  departmentFilter = "all", 
  unitFilter = "all", 
  divisionFilter = "all" 
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role")?.toLowerCase();
  const userDivision = localStorage.getItem("division")?.toLowerCase() || '';
  const userDepartment = localStorage.getItem("department")?.toLowerCase() || '';
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTopPerformersModalOpen, setIsTopPerformersModalOpen] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState(null);
  const [userDesignationMap, setUserDesignationMap] = useState({});
  const [tableFilterState, setTableFilterState] = useState({
    filteredTasks: [],
    startDate: '',
    endDate: '',
    timeFilter: 'all'
  });

  useEffect(() => {
    const loadUserDesignations = async () => {
      try {
        const res = await fetchUserDetailsApi(1, 1000);
        if (res && Array.isArray(res.users)) {
          const map = {};
          res.users.forEach(u => {
            const des = u.designation || '';
            if (u.name) map[u.name.trim().toLowerCase()] = des;
            if (u.user_name) map[u.user_name.trim().toLowerCase()] = des;
          });
          setUserDesignationMap(map);
        }
      } catch (err) {
        console.error("Error fetching user designations:", err);
      }
    };
    loadUserDesignations();
  }, []);

  const handleTableFilterChange = React.useCallback((filterData) => {
    setTableFilterState(filterData);
  }, []);
  
  const { 
    maintenance, 
    history, 
    machineParts, 
    loading, 
    error,
    pendingTotalCount,
    historyTotalCount,
    historyApprovedCount,
    todayCount,
    overdueCount: reduxOverdueCount
  } = useSelector((state) => state.maintenance);

  const { historyStartDate, historyEndDate } = useMemo(() => {
    let historyStartDate = startDate;
    let historyEndDate = endDate;

    if (!startDate && !endDate) {
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      
      const formatYMD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      historyStartDate = formatYMD(sixMonthsAgo);
      historyEndDate = formatYMD(today);
    }
    return { historyStartDate, historyEndDate };
  }, [startDate, endDate]);

  useEffect(() => {
    dispatch(maintenanceData({ 
      page: 1, 
      startDate, 
      endDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter 
    }));
    dispatch(maintenanceHistoryData({ 
      startDate: historyStartDate, 
      endDate: historyEndDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter,
      limit: 1000,
      usePlannedDate: true
    }));
    dispatch(fetchMachinePartsData());
  }, [dispatch, startDate, endDate, dashboardStaffFilter, departmentFilter, unitFilter, divisionFilter, historyStartDate, historyEndDate]);

  // --- Helpers ---
  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return new Date(NaN);
    
    // 1. ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parts = dateStr.split(/[ T]/);
      const datePart = parts[0];
      const timePart = parts[1] ? parts[1].split(/[+-Z]/)[0] : "00:00:00";
      const [y, m, d] = datePart.split("-").map(Number);
      const tUnits = timePart.split(":").map(Number);
      return new Date(y, m - 1, d, tUnits[0] || 0, tUnits[1] || 0, tUnits[2] || 0);
    }

    // 2. Regional format (DD/MM/YYYY)
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ");
      const dateComponents = parts[0].split("/");
      if (dateComponents.length !== 3) return new Date(NaN);
      const [d, m, y] = dateComponents.map(Number);
      const date = new Date(y, m - 1, d);
      if (parts.length > 1) {
        const tParts = parts[1].split(":");
        if (tParts.length >= 2) date.setHours(Number(tParts[0]) || 0, Number(tParts[1]) || 0, Number(tParts[2]) || 0);
      } else date.setHours(0, 0, 0, 0);
      return date;
    }
    return new Date(dateStr);
  };

  // --- Memoized Data ---
  const allMaintenanceTasks = useMemo(() => {
    const uniqueMap = new Map();
    [...maintenance, ...history].forEach(task => {
      const id = task.task_id || task.id;
      if (id) uniqueMap.set(id, task);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from(uniqueMap.values()).filter(task => {
      const isCompleted = task.submission_date !== null && task.submission_date !== undefined;
      if (isCompleted) return true;

      const dStr = task.planned_date || task.dueDate || task.task_start_date;
      const taskDate = parseDate(dStr);
      if (isNaN(taskDate.getTime())) return true;

      const compareDate = new Date(taskDate);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate <= today; // Show only today or past tasks (exclude upcoming)
    });
  }, [maintenance, history]);

  // --- Filtered Machine Data based on Role/Division/Dept ---
  const filteredMachines = useMemo(() => {
    if (!machineParts) return [];
    
    return machineParts.filter(machine => {
      // Super admin sees all machines
      if (!userRole || userRole === 'super_admin') return true;
      
      const mDivision = (machine.machine_division || '').toLowerCase().trim();
      const mDepartment = (machine.machine_department || '').toLowerCase().trim();
      
      // User and Admin - Filter by both Division and Department
      if (userRole === 'user' || userRole === 'admin') {
        return mDivision === userDivision.trim() && mDepartment === userDepartment.trim();
      }
      
      // Div Admin - Filter by Division only
      if (userRole === 'div_admin') {
        return mDivision === userDivision.trim();
      }
      
      return true; // Default fallback (e.g. for super_admin)
    });
  }, [machineParts, userRole, userDivision, userDepartment]);

  // --- Aggregate Stats ---
  const stats = useMemo(() => {
    return {
      totalMachines: filteredMachines.length || 0,
      totalTasks: (historyTotalCount || 0) + (todayCount || 0) + (reduxOverdueCount || 0),
      completedTasks: historyTotalCount || 0,
      pendingTasks: todayCount || 0, 
      overdueTasks: reduxOverdueCount || 0
    };
  }, [filteredMachines, historyTotalCount, todayCount, reduxOverdueCount]);

  const modalTasks = useMemo(() => {
    if (!selectedCardType) return [];
    
    return allMaintenanceTasks.filter(task => {
      const isCompleted = task.submission_date !== null && task.submission_date !== undefined;
      
      const dStr = task.planned_date || task.dueDate || task.task_start_date;
      const taskDate = parseDate(dStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let isOverdue = false;
      let isTodayPending = false;
      
      if (!isCompleted && !isNaN(taskDate.getTime())) {
        const compareDate = new Date(taskDate);
        compareDate.setHours(0, 0, 0, 0);
        if (compareDate < today) {
          isOverdue = true;
        } else if (compareDate.getFullYear() === today.getFullYear() &&
                   compareDate.getMonth() === today.getMonth() &&
                   compareDate.getDate() === today.getDate()) {
          isTodayPending = true;
        }
      }
      
      if (selectedCardType === 'total_tasks') return true;
      if (selectedCardType === 'completed') return isCompleted;
      if (selectedCardType === 'pending') return !isCompleted && isTodayPending;
      if (selectedCardType === 'overdue') return !isCompleted && isOverdue;
      
      return false;
    });
  }, [selectedCardType, allMaintenanceTasks]);

  const modalTitle = useMemo(() => {
    switch (selectedCardType) {
      case 'total_tasks': return 'Total Maintenance Tasks';
      case 'completed': return 'Completed Maintenance Tasks';
      case 'pending': return 'Pending Maintenance Tasks';
      case 'overdue': return 'Overdue Maintenance Tasks';
      default: return 'Maintenance Tasks';
    }
  }, [selectedCardType]);

  const modalCardCount = useMemo(() => {
    switch (selectedCardType) {
      case 'total_tasks': return stats.totalTasks;
      case 'completed': return stats.completedTasks;
      case 'pending': return stats.pendingTasks;
      case 'overdue': return stats.overdueTasks;
      default: return 0;
    }
  }, [selectedCardType, stats]);



  // --- Derive Department Data ---
  const deptData = useMemo(() => {
    const deptCounts = {};
    
    allMaintenanceTasks.forEach(task => {
      const dept = task.machine_department || 'Other';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    // Return top 5 or sorted departments
    return Object.keys(deptCounts)
      .map(dept => ({ name: dept, value: deptCounts[dept] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [allMaintenanceTasks]);

  // --- Derive Monthly Data ---
  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Window: Past 6 Months (ending with Current Month)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const window = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      window.push({ 
        month: monthNames[d.getMonth()], 
        year: d.getFullYear(), 
        tasks: 0 
      });
    }

    allMaintenanceTasks.forEach(task => {
      const dateStr = task.planned_date || task.dueDate || task.submission_date || task.task_start_date;
      if (dateStr) {
        const date = parseDate(dateStr);
        if (!isNaN(date.getTime())) {
          const m = date.getMonth();
          const y = date.getFullYear();
          // Find if this date falls into our 6-month window (Checking both Month AND Year)
          const target = window.find(w => w.month === monthNames[m] && w.year === y);
          if (target) {
            target.tasks++;
          }
        }
      }
    });

    return window.map(w => ({
      month: w.month,
      tasks: w.tasks
    }));
  }, [allMaintenanceTasks]);

  // --- Derive Frequency Data ---
  const frequencyData = useMemo(() => {
    const freqMap = {
      'one-time': 0,
      'daily': 0,
      'weekly': 0,
      'monthly': 0,
      'quarterly': 0,
      'half-yearly': 0,
      'yearly': 0
    };

    allMaintenanceTasks.forEach(task => {
      const f = (task.frequency || '').toLowerCase();
      if (freqMap.hasOwnProperty(f)) {
        freqMap[f]++;
      } else if (f.includes('yearly')) {
        freqMap['yearly']++;
      } else if (f.includes('monthly')) {
        freqMap['monthly']++;
      }
    });

    return Object.keys(freqMap).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      count: freqMap[key]
    }));
  }, [allMaintenanceTasks]);

  // --- Handlers ---
  const handleCardClick = (type) => {
    switch (type) {
      case 'machines':
        setIsMachineModalOpen(true);
        break;
      case 'total_tasks':
        setSelectedCardType('total_tasks');
        setIsTasksModalOpen(true);
        break;
      case 'pending':
        setSelectedCardType('pending');
        setIsTasksModalOpen(true);
        break;
      case 'overdue':
        setSelectedCardType('overdue');
        setIsTasksModalOpen(true);
        break;
      case 'completed':
        setSelectedCardType('completed');
        setIsTasksModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleUpdateTask = async (updatedTask) => {
    // We use updateUniqueMaintenanceTask thunk which expects { updatedTask, originalTask }
    // For simplicity here, we'll try to match the API expectation
    const originalTask = allMaintenanceTasks.find(t => (t.task_id || t.id) === (updatedTask.task_id || updatedTask.id));
    
    if (originalTask) {
      return dispatch(updateUniqueMaintenanceTask({ updatedTask, originalTask })).unwrap();
    }
  };

  const handleRefresh = () => {
    dispatch(maintenanceData({ 
      page: 1, 
      startDate, 
      endDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter 
    }));
    dispatch(maintenanceHistoryData({ 
      startDate: historyStartDate, 
      endDate: historyEndDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter,
      limit: 1000,
      usePlannedDate: true
    }));
  };

  // --- Work Done Report Generators (PDF & CSV) ---
  const getStaffSummaryDataForExport = (customRange) => {
    let baseTasks = (tableFilterState.filteredTasks && tableFilterState.filteredTasks.length > 0)
      ? [...tableFilterState.filteredTasks]
      : [...allMaintenanceTasks];

    const todayObj = new Date();
    const year = todayObj.getFullYear();
    const month = String(todayObj.getMonth() + 1).padStart(2, '0');
    const day = String(todayObj.getDate()).padStart(2, '0');

    const defaultFrom = `${year}-${month}-01`;
    const defaultTo = `${year}-${month}-${day}`;

    const exportFrom = customRange?.from || tableFilterState.startDate || startDate || defaultFrom;
    const exportTo = customRange?.to || tableFilterState.endDate || endDate || defaultTo;

    let exportTasks = baseTasks;
    if (customRange?.from || customRange?.to || tableFilterState.startDate || tableFilterState.endDate || startDate || endDate) {
      if (exportFrom || exportTo) {
        exportTasks = exportTasks.filter(task => {
          const dStr = task.planned_date || task.dueDate || task.submission_date || task.task_start_date;
          const taskDate = parseDate(dStr);
          if (isNaN(taskDate.getTime())) return false;
          const ymd = taskDate.toLocaleDateString('en-CA');
          if (exportFrom && ymd < exportFrom) return false;
          if (exportTo && ymd > exportTo) return false;
          return true;
        });
      }
    }

    if (exportTasks.length === 0) {
      return { staffSummaryList: [], exportFrom, exportTo };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const staffMap = new Map();

    exportTasks.forEach(task => {
      const staffName = (task.name || task.assignedTo || "Unassigned").trim();
      const nameKey = staffName.toLowerCase();
      const division = task.machine_division || task.division || "N/A";
      const department = task.machine_department || task.department || "N/A";
      
      const fetchedDesg = userDesignationMap[nameKey];
      const designation = (fetchedDesg && fetchedDesg !== '—')
        ? fetchedDesg
        : (task.designation && task.designation !== '-' && task.designation !== '—')
          ? task.designation
          : "-";

      if (!staffMap.has(staffName)) {
        staffMap.set(staffName, {
          name: staffName,
          designation: designation,
          division: division,
          department: department,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          doneOnTime: 0
        });
      } else {
        const summary = staffMap.get(staffName);
        if ((summary.designation === '-' || summary.designation === '—' || !summary.designation) && designation !== '-' && designation !== '—') {
          summary.designation = designation;
        }
      }

      const summary = staffMap.get(staffName);
      summary.totalTasks += 1;

      const adminDone = task.admin_done === 'true' || task.admin_done === 'Done' || task.admin_done === true;
      const isSubmitted = !!(task.submission_date || task.status === 'yes' || task.status === 'no');

      if (adminDone || isSubmitted) {
        summary.completedTasks += 1;
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDate(dStr);
        if (task.submission_date && !isNaN(taskDate.getTime())) {
          const subDate = parseDate(task.submission_date);
          if (!isNaN(subDate.getTime()) && subDate <= taskDate) {
            summary.doneOnTime += 1;
          } else {
            summary.doneOnTime += 1;
          }
        } else {
          summary.doneOnTime += 1;
        }
      } else {
        const dStr = task.planned_date || task.dueDate || task.task_start_date;
        const taskDate = parseDate(dStr);
        if (!isNaN(taskDate.getTime())) {
          const compareDate = new Date(taskDate);
          compareDate.setHours(0, 0, 0, 0);
          if (compareDate < today) {
            summary.overdueTasks += 1;
          } else {
            summary.pendingTasks += 1;
          }
        } else {
          summary.pendingTasks += 1;
        }
      }
    });

    const staffSummaryList = Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { staffSummaryList, exportFrom, exportTo };
  };

  const handleExportCSV = (customRange = null) => {
    try {
      const { staffSummaryList } = getStaffSummaryDataForExport(customRange);

      if (staffSummaryList.length === 0) {
        toast.error("No maintenance data available for the selected range.");
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
        "SEQ NO.",
        "NAME",
        "DESIGNATION",
        "DIVISION",
        "DEPARTMENT",
        "TOTAL TASKS",
        "COMPLETED",
        "PENDING",
        "OVERDUE",
        "DONE ON TIME",
        "DONE ON TIME SCORE (%)",
        "WORK DONE SCORE"
      ];

      const rows = staffSummaryList.map((staff, index) => {
        const score = staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0;
        const doneOnTimeScore = staff.completedTasks > 0 ? Math.round((staff.doneOnTime / staff.completedTasks) * 100) : 0;

        return [
          index + 1,
          escapeCSV(staff.name),
          escapeCSV((!staff.designation || staff.designation === "—") ? "" : staff.designation),
          escapeCSV(staff.division || "N/A"),
          escapeCSV(staff.department || "N/A"),
          staff.totalTasks,
          staff.completedTasks,
          staff.pendingTasks,
          staff.overdueTasks || 0,
          staff.doneOnTime || 0,
          `${doneOnTimeScore}%`,
          `${score}%`
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
      link.setAttribute("download", `Work_Done_Report_maintenance_${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${staffSummaryList.length} staff records to CSV`);
    } catch (err) {
      console.error("CSV Export error:", err);
      toast.error(err.message || "Failed to export CSV");
    }
  };

  const handleExportPDF = (customRange = null) => {
    try {
      const { staffSummaryList, exportFrom, exportTo } = getStaffSummaryDataForExport(customRange);

      if (staffSummaryList.length === 0) {
        toast.error("No maintenance data available for the selected range.");
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4');

      // Title & Subtitle matching Checklist format
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.text("Work Done Summary Report - MAINTENANCE", 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      const periodStr = (exportFrom || exportTo) ? `Period: ${exportFrom || 'Start'} to ${exportTo || 'End'}` : 'Period: All Months';
      const timestampStr = `${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString()}`;
      doc.text(`${periodStr}`, 14, 22);
      doc.text(`${timestampStr}`, 14, 27);

      // Define table headers matching Checklist
      const tableColumn = ["Seq", "Name", "Designation", "Division", "Department", "Total", "Done", "Pending", "Overdue", "On Time", "On Time Score", "Score"];

      // Map data to rows
      const tableRows = staffSummaryList.map((staff, index) => {
        const score = staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0;
        const doneOnTimeScore = staff.completedTasks > 0 ? Math.round((staff.doneOnTime / staff.completedTasks) * 100) : 0;

        return [
          index + 1,
          staff.name,
          (!staff.designation || staff.designation === "—") ? "" : staff.designation,
          staff.division || "N/A",
          staff.department || "N/A",
          staff.totalTasks,
          staff.completedTasks,
          staff.pendingTasks,
          staff.overdueTasks || 0,
          staff.doneOnTime || 0,
          `${doneOnTimeScore}%`,
          `${score}%`
        ];
      });

      // Generate table matching Checklist autoTable styles
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 33,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { top: 33, bottom: 15 }
      });

      // Footer: "Powered By Botivate" at the bottom of every page
      const totalPages = doc.internal.getNumberOfPages();
      const pageW = doc.internal.pageSize.getWidth();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerY = pageHeight - 10;
        // Divider line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(14, footerY - 3, pageW - 14, footerY - 3);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const prefixText = "Powered By  ";
        const brandText = "Botivate";
        const prefixW = doc.getTextWidth(prefixText);
        doc.setFont("helvetica", "bold");
        const brandW = doc.getTextWidth(brandText);
        const totalW = prefixW + brandW;
        const startX = pageW / 2 - totalW / 2;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(prefixText, startX, footerY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(124, 58, 237); // Purple-600
        doc.text(brandText, startX + prefixW, footerY);
      }

      const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
      doc.save(`Work_Done_Report_maintenance_${filenameDate}.pdf`);
      toast.success(`Exported ${staffSummaryList.length} staff records to PDF`);
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error(err.message || "Failed to export PDF report.");
    }
  };

  const topPerformers = useMemo(() => {
    const activeDateRange = {
      from: tableFilterState.startDate || startDate || "",
      to: tableFilterState.endDate || endDate || ""
    };
    const { staffSummaryList } = getStaffSummaryDataForExport(activeDateRange.from || activeDateRange.to ? activeDateRange : null);

    return [...staffSummaryList].sort((a, b) => {
      const scoreA = a.completedTasks > 0 ? (a.doneOnTime / a.completedTasks) * 100 : 0;
      const scoreB = b.completedTasks > 0 ? (b.doneOnTime / b.completedTasks) * 100 : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
      return b.totalTasks - a.totalTasks;
    });
  }, [allMaintenanceTasks, startDate, endDate, tableFilterState]);

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
        <p className="font-bold">Error loading maintenance data</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 btn bg-red-600 text-white hover:bg-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Machine Inventory Modal */}
      <MachineModal 
        isOpen={isMachineModalOpen} 
        onClose={() => setIsMachineModalOpen(false)} 
        machines={filteredMachines} 
      />

      {/* Tasks By Machine Modal */}
      <TasksByMachineModal
        isOpen={isTasksModalOpen}
        onClose={() => setIsTasksModalOpen(false)}
        title={modalTitle}
        tasks={modalTasks}
        cardCount={modalCardCount}
        cardType={selectedCardType}
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} onCardClick={handleCardClick} />

      {/* Charts Section */}
      <MaintenanceCharts 
        frequencyData={frequencyData} 
        deptData={deptData}
        monthlyData={monthlyData}
      />

      {/* Maintenance Work Done Report Modal */}
      <MaintenanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        isLoading={loading}
        activeFilters={{
          division: divisionFilter,
          department: departmentFilter,
          staff: dashboardStaffFilter,
          startDate: tableFilterState.startDate || startDate,
          endDate: tableFilterState.endDate || endDate
        }}
      />

      {/* Maintenance Top Performers Modal */}
      <MaintenanceTopPerformersModal
        isOpen={isTopPerformersModalOpen}
        onClose={() => setIsTopPerformersModalOpen(false)}
        performers={topPerformers}
        startDate={tableFilterState.startDate || startDate || (getStaffSummaryDataForExport().exportFrom)}
        endDate={tableFilterState.endDate || endDate || (getStaffSummaryDataForExport().exportTo)}
        isCustomRange={!!(tableFilterState.startDate || tableFilterState.endDate || startDate || endDate)}
        monthLabel={new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
      />

      {/* Main Table Section */}
      <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/50 rounded-lg shadow-sm">
                  <ClipboardList className="h-5 w-5 text-purple-600" />
               </div>
               <div>
                  <h3 className="text-purple-700 font-bold">Maintenance Task Summary</h3>
                  <p className="text-purple-600 text-sm">Overview of maintenance activities and machine health</p>
               </div>
            </div>

            {/* Action Buttons: Top Performers & Work Done Report */}
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={() => setIsTopPerformersModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-semibold active:scale-95 cursor-pointer"
              >
                <Trophy size={16} />
                Top Performers
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-semibold active:scale-95 cursor-pointer"
              >
                <Download size={16} />
                Work done report
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <MaintenanceTable 
            tasks={allMaintenanceTasks} 
            onUpdateTask={handleUpdateTask}
            isLoading={loading}
            onRefresh={handleRefresh}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onFilterStateChange={handleTableFilterChange}
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenanceView;
