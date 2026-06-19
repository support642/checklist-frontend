import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, RotateCw } from 'lucide-react';

const EmployeePerformanceReportModal = ({ 
  isOpen, 
  onClose, 
  staffName, 
  staffData, 
  tasks,
  reportDate,
  startDate,
  endDate,
  onDownloadPDF,
  onDownloadCSV,
  onRefresh,
  hasMaintenanceAccess = true
}) => {
  const today = new Date().toLocaleDateString('en-CA');
  const [localFrom, setLocalFrom] = useState(startDate || "");
  const [localTo, setLocalTo] = useState(endDate || today);

  // Update local state when props change
  useEffect(() => {
    if (startDate) setLocalFrom(startDate);
    if (endDate) setLocalTo(endDate);
    else setLocalTo(today);
  }, [startDate, endDate, today]);

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr || dateStr === "N/A" || dateStr === "Range") return dateStr;
    try {
      // Expected input: yyyy-mm-dd
      const parts = dateStr.includes('T') ? dateStr.split('T')[0].split('-') : dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [year, month, day] = parts;
      // Output: dd/mm/yyyy
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  // Safety check for super_admin access
  const userRole = localStorage.getItem("role") || "";
  if (userRole.toLowerCase() !== "super_admin") return null;

  // Current date for filtering tasks - Use reportDate if provided, fallback to today
  const targetDate = reportDate || new Date().toLocaleDateString('en-CA');
  
  const matchesTargetDate = (t) => 
    t.start_date === targetDate || 
    (t.task_start_date && t.task_start_date.startsWith(targetDate));

  // Helper to get unique tasks by description + frequency for the table view
  const getUniqueTasks = (taskList) => {
    const seen = new Set();
    return taskList.filter(t => {
      const key = `${t.task_description}-${t.frequency || ''}`;
      if (!t.task_description || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Process tasks into categories for the table - Using unique tasks for the listing
  const checklistTasks = getUniqueTasks(tasks.filter(t => t.type === 'checklist'))
    .map(t => ({ ...t, displayType: t.is_ledger ? 'Ledger' : 'Checklist', displayFrequency: t.frequency || 'N/A' }));

  const delegationTasks = getUniqueTasks(tasks.filter(t => t.type === 'delegation' || t.is_delegated))
    .map(t => ({ ...t, displayType: 'Delegation', displayFrequency: 'One Time' }));
  
  const maintenanceTasks = hasMaintenanceAccess 
    ? getUniqueTasks(tasks.filter(t => t.type === 'maintenance'))
        .map(t => ({ ...t, displayType: 'Maintenance', displayFrequency: t.frequency || 'N/A' }))
    : [];

  const frequencyOrder = { 'DAILY': 1, 'WEEKLY': 2, 'MONTHLY': 3, 'ONE TIME': 4, 'N/A': 5 };
  const sortByFreq = (a, b) => {
    const freqA = (a.displayFrequency || '').toUpperCase();
    const freqB = (b.displayFrequency || '').toUpperCase();
    const orderA = frequencyOrder[freqA] || 99;
    const orderB = frequencyOrder[freqB] || 99;
    return orderA - orderB;
  };
  const allSortedTasks = [
    ...checklistTasks.sort(sortByFreq), 
    ...delegationTasks.sort(sortByFreq), 
    ...maintenanceTasks.sort(sortByFreq)
  ];

  // Stats Calculation (Based on TOTAL occurrences for accurate performance)
  const calculateStats = (taskList) => {
    const total = taskList.length;
    const completed = taskList.filter(t => t.is_completed || t.status?.toLowerCase() === 'yes' || t.status === 'Done').length;
    const onTime = taskList.filter(t => t.is_on_time || t.color_code_for === '1' || t.color_code_for === 1).length;
    const workDoneScore = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeScore = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
    return { total, completed, onTime, workDoneScore, onTimeScore };
  };

  const checklistStats = calculateStats(tasks.filter(t => t.type === 'checklist'));
  const ledgerStats = calculateStats(tasks.filter(t => t.type === 'checklist' && t.is_ledger));
  const delegationStats = calculateStats(tasks.filter(t => t.type === 'delegation' || t.is_delegated));
  const maintenanceStats = hasMaintenanceAccess 
    ? calculateStats(tasks.filter(t => t.type === 'maintenance'))
    : { total: 0, completed: 0, onTime: 0, workDoneScore: 0, onTimeScore: 0 };

  // Dynamic grid columns based on maintenance access
  const infoGridCols = hasMaintenanceAccess
    ? 'grid-cols-[1.2fr_1fr_1fr_1.2fr_1fr]'
    : 'grid-cols-[1.5fr_1.2fr_1.2fr_1.2fr]';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-7xl h-auto lg:h-[95vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-300">
        
        {/* Desktop View (Full Report - Exactly same for PDF Parity) */}
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden">
          {/* Header Section */}
          <div className="flex items-stretch border-b border-gray-300 h-24">
            <div className="w-[180px] flex items-center justify-center p-3 border-r border-gray-300">
              <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 bg-[#FFFF00] flex flex-col items-center justify-center px-6 border-r border-gray-300">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tighter text-center uppercase">
                Rama Udyog pvt ltd.
              </h1>
            </div>
            <div className="w-[180px] flex items-center justify-center p-3">
              <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="max-h-full max-w-full object-contain" />
            </div>
          </div>

          {/* Sub-header */}
          <div className="bg-[#D9EAF7] border-b border-gray-300 py-2">
            <h2 className="text-2xl font-bold text-gray-800 text-center uppercase tracking-widest">
              Employee performance report
            </h2>
          </div>

          {/* Employee Info Grid - Dynamic columns based on maintenance access */}
          {/* Employee Info Grid - New 2-Row Layout (Optimized) */}
          <div className="bg-white border-b border-gray-300 text-[10px] divide-y divide-gray-300">
            {/* Row 1: All Details (Full Width - Reorganized) */}
            <div className="grid grid-cols-[1.4fr_1.1fr_1fr_0.8fr_0.7fr] h-14 divide-x divide-gray-300">
              <div className="flex flex-col">
                <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[9px]">Name</div>
                <div className="px-2 flex-1 flex items-center font-bold text-gray-800 truncate leading-tight py-1.5 text-xs">{staffName}</div>
              </div>
              <div className="flex flex-col">
                <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[9px]">Designation</div>
                <div className="px-2 flex-1 flex items-center font-bold text-gray-800 truncate leading-tight py-1.5 text-xs">{staffData.designation || "—"}</div>
              </div>
              <div className="flex flex-col">
                <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[9px]">Department</div>
                <div className="px-2 flex-1 flex items-center font-bold text-gray-800 truncate leading-tight py-1.5 text-xs">{staffData.department || "HR"}</div>
              </div>
              <div className="flex flex-col">
                <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[9px]">Division</div>
                <div className="px-2 flex-1 flex items-center font-bold text-gray-800 truncate leading-tight py-1.5 text-xs">{staffData.division || "Admin"}</div>
              </div>
              <div className="flex flex-col">
                <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[9px]">Emp ID</div>
                <div className="px-2 flex-1 flex items-center font-bold text-gray-800 text-xs">{staffData.employee_id || "—"}</div>
              </div>
            </div>

            {/* Row 2: Stats & Range */}
            <div className="grid grid-cols-[1fr_220px] divide-x divide-gray-300 h-20">
              {/* Left Side: Performance Stats */}
              <div className={`grid ${hasMaintenanceAccess ? 'grid-cols-4' : 'grid-cols-3'} h-full divide-x divide-gray-300`}>
                {/* Checklist Stats */}
                <div className="flex flex-col divide-y divide-gray-200">
                  <div className="bg-gray-100/80 px-2 h-6 flex items-center justify-center font-bold uppercase text-gray-700 text-[10px] tracking-widest">Checklist</div>
                  <div className="flex-1 grid grid-cols-2 divide-x divide-gray-200">
                    <div className="flex flex-col items-center justify-center py-2">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Assigned / Done</span>
                      <span className="text-base font-bold text-gray-800 leading-none">{checklistStats.total} / {checklistStats.completed}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 bg-green-50/20">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Score / OnTime</span>
                      <div className="flex items-center gap-2 font-bold text-base">
                        <span className="text-green-700">{checklistStats.workDoneScore}%</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-blue-600">{checklistStats.onTimeScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ledger Stats */}
                <div className="flex flex-col divide-y divide-gray-200">
                  <div className="bg-gray-100/80 px-2 h-6 flex items-center justify-center font-bold uppercase text-gray-700 text-[10px] tracking-widest">Ledger</div>
                  <div className="flex-1 grid grid-cols-2 divide-x divide-gray-200">
                    <div className="flex flex-col items-center justify-center py-2">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Assigned / Done</span>
                      <span className="text-base font-bold text-gray-800 leading-none">{ledgerStats.total} / {ledgerStats.completed}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 bg-emerald-50/20">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Percentage</span>
                      <span className="text-base font-bold text-emerald-700 leading-none">{ledgerStats.workDoneScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Delegation Stats */}
                <div className="flex flex-col divide-y divide-gray-200">
                  <div className="bg-gray-100/80 px-2 h-6 flex items-center justify-center font-bold uppercase text-gray-700 text-[10px] tracking-widest">Delegation</div>
                  <div className="flex-1 grid grid-cols-2 divide-x divide-gray-200">
                    <div className="flex flex-col items-center justify-center py-2">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Assigned / Done</span>
                      <span className="text-base font-bold text-gray-800 leading-none">{delegationStats.total} / {delegationStats.completed}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-2 bg-blue-50/20">
                      <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Score / OnTime</span>
                      <div className="flex items-center gap-2 font-bold text-base">
                        <span className="text-green-700">{delegationStats.workDoneScore}%</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-blue-600">{delegationStats.onTimeScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Maintenance Stats */}
                {hasMaintenanceAccess && (
                  <div className="flex flex-col divide-y divide-gray-200">
                    <div className="bg-gray-100/80 px-2 h-6 flex items-center justify-center font-bold uppercase text-gray-700 text-[10px] tracking-widest">Maintenance</div>
                    <div className="flex-1 grid grid-cols-2 divide-x divide-gray-200">
                      <div className="flex flex-col items-center justify-center py-2">
                        <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Assigned / Done</span>
                        <span className="text-base font-bold text-gray-800 leading-none">{maintenanceStats.total} / {maintenanceStats.completed}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2 bg-orange-50/20">
                        <span className="text-[9px] text-gray-400 uppercase font-bold mb-1">Score / OnTime</span>
                        <div className="flex items-center gap-2 font-bold text-base">
                          <span className="text-green-700">{maintenanceStats.workDoneScore}%</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-blue-600">{maintenanceStats.onTimeScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Range (From/To) */}
              <div className="grid grid-cols-2 divide-x divide-gray-300">
                <div className="flex flex-col">
                  <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[10px]">From</div>
                  <div className="px-2 flex-1 flex items-center justify-center font-bold text-gray-800 text-sm">{formatDateForDisplay(startDate) || "N/A"}</div>
                </div>
                <div className="flex flex-col">
                  <div className="bg-[#F8F9FA] px-2 h-6 flex items-center font-bold uppercase text-gray-500 border-b border-gray-200 text-[10px]">To</div>
                  <div className="px-2 flex-1 flex items-center justify-center font-bold text-gray-800 text-sm">{formatDateForDisplay(endDate) || "N/A"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Tasks Table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full border-collapse border-b border-gray-300 text-[13px]">
              <thead className="sticky top-0 bg-[#E9F2E9] border-b border-gray-300 z-10">
                <tr>
                  <th className="border border-gray-300 p-2 font-bold w-[60px] text-center">Sno.</th>
                  <th className="border border-gray-300 p-2 font-bold w-[120px] text-center">Task Type</th>
                  <th className="border border-gray-300 p-2 font-bold text-center">Task Description</th>
                  <th className="border border-gray-300 p-2 font-bold w-[120px] text-center">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {allSortedTasks.length > 0 ? (
                  allSortedTasks.map((task, idx) => {
                    // Row background tint per task type
                    const rowBg =
                      task.displayType === 'Checklist' ? 'bg-blue-50/40' :
                      task.displayType === 'Ledger' ? 'bg-emerald-50/10' :
                      task.displayType === 'Delegation' ? 'bg-purple-50/40' :
                      task.displayType === 'Maintenance' ? 'bg-orange-50/40' : '';

                    // Task type badge styles
                    const typeBadge =
                      task.displayType === 'Checklist'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : task.displayType === 'Ledger'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : task.displayType === 'Delegation'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : task.displayType === 'Maintenance'
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200';

                    // Frequency badge styles
                    const freq = (task.displayFrequency || '').toUpperCase();
                    const freqBadge =
                      freq === 'DAILY'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : freq === 'WEEKLY'
                        ? 'bg-teal-100 text-teal-700 border border-teal-200'
                        : freq === 'MONTHLY'
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        : freq === 'ONE TIME'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200';

                    return (
                      <React.Fragment key={idx}>
                        {/* Frequency separator row */}
                        {idx > 0 && allSortedTasks[idx - 1].displayFrequency !== task.displayFrequency && (
                          <tr className="bg-gray-100/60 h-2">
                            <td colSpan="4" className="border-x border-gray-300"></td>
                          </tr>
                        )}
                        <tr className={`h-8 hover:brightness-95 transition-colors border-b border-gray-200 ${rowBg}`}>
                          <td className="border border-gray-300 text-center font-medium text-gray-500">{idx + 1}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight ${typeBadge}`}>
                              {task.displayType}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-3 py-1 text-gray-700 leading-tight font-medium">
                            {task.task_description || 'N/A'}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight ${freqBadge}`}>
                              {task.displayFrequency}
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-400 italic">No tasks found for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="h-6"></div>

          {/* Modal Controls (Desktop) */}
          <div className="p-4 bg-gray-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onDownloadPDF(localFrom, localTo, staffData)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold shadow-sm"
              >
                <FileText size={18} />
                Export PDF
              </button>

              {/* Footer Date Selection Filter */}
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-300 shadow-inner">
                <div className="flex items-center gap-1.5 px-2 py-1 border-r border-gray-100">
                  <Calendar size={13} className="text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">From</span>
                  <input 
                    type="date" 
                    value={localFrom}
                    onChange={(e) => setLocalFrom(e.target.value)}
                    className="text-[11px] font-bold text-gray-700 bg-transparent border-none focus:ring-0 p-0 w-24 outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 border-r border-gray-100">
                  <Calendar size={13} className="text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase">To</span>
                  <input 
                    type="date" 
                    value={localTo}
                    onChange={(e) => setLocalTo(e.target.value)}
                    className="text-[11px] font-bold text-gray-700 bg-transparent border-none focus:ring-0 p-0 w-24 outline-none"
                  />
                </div>
                <button 
                  onClick={() => onRefresh && onRefresh(localFrom, localTo)}
                  className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded transition-colors group flex items-center gap-1"
                  title="Update Report"
                >
                  <RotateCw size={14} className="group-active:rotate-180 transition-transform duration-500" />
                  <span className="text-[10px] font-bold uppercase">Update</span>
                </button>
              </div>

              {/* <button 
                onClick={() => onDownloadCSV(localFrom, localTo)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-sm"
              >
                <Download size={18} />
                Export CSV
              </button> */}
            </div>
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <X size={18} />
              Close Report
            </button>
          </div>
        </div>

        {/* Mobile View Layout (Direct Export Popup) */}
        <div className="lg:hidden flex flex-col w-full max-w-sm mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-[#FFFF00] p-6 text-center">
            <img src="/Rama_TMT_logo.png" alt="Rama Logo" className="h-12 w-auto mx-auto mb-4 object-contain" />
            <h2 className="text-xl font-bold text-gray-900 uppercase leading-tight tracking-tighter">
              Performance Report
            </h2>
            <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-widest mt-1 opacity-70">
              Export Options
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4 text-center">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Employee</p>
                <p className="text-lg font-bold text-gray-800 leading-tight">{staffName}</p>
              </div>

              {/* Date Selection Box (Mobile) */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">From</span>
                  </div>
                  <input 
                    type="date" 
                    value={localFrom}
                    onChange={(e) => setLocalFrom(e.target.value)}
                    className="text-xs font-bold text-blue-700 bg-transparent border-none focus:ring-0 p-0 text-right outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">To</span>
                  </div>
                  <input 
                    type="date" 
                    value={localTo}
                    onChange={(e) => setLocalTo(e.target.value)}
                    className="text-xs font-bold text-blue-700 bg-transparent border-none focus:ring-0 p-0 text-right outline-none"
                  />
                </div>
                
                <button 
                  onClick={() => onRefresh && onRefresh(localFrom, localTo)}
                  className="w-full flex items-center justify-center gap-2 py-2 mt-2 bg-blue-600 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md"
                >
                  <RotateCw size={12} />
                  Update Date Range
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => onDownloadPDF(localFrom, localTo, staffData)}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg active:scale-95 text-sm uppercase tracking-wider"
              >
                <FileText size={20} />
                Download PDF
              </button>
              {/* <button 
                onClick={onDownloadCSV}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-black shadow-lg active:scale-95 text-sm uppercase tracking-wider"
              >
                <Download size={20} />
                Download CSV
              </button> */}
            </div>

            <button 
              onClick={onClose}
              className="w-full py-3 text-gray-500 font-semibold hover:text-gray-800 transition-colors uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <X size={14} />
              Cancel / Close
            </button>
          </div>

          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            <p className="text-[10px] font-medium text-gray-400 uppercase">
              Full interactive report available on desktop
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeePerformanceReportModal;
