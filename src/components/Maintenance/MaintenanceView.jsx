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
import { RefreshCw, ClipboardList, X, Settings2, MapPin, Cog } from 'lucide-react';

const MachineModal = ({ isOpen, onClose, machines }) => {
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
              <p className="text-sm text-gray-500">Total {machines.length} registered assets</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((machine, index) => (
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
          
          {machines.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block p-4 bg-gray-50 rounded-full">
                <Settings2 className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No machines found in the system</p>
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
      startDate, 
      endDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter 
    }));
    dispatch(fetchMachinePartsData());
  }, [dispatch, startDate, endDate, dashboardStaffFilter, departmentFilter, unitFilter, divisionFilter]);

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
    return Array.from(uniqueMap.values());
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
    
    // Window: Current Month + Next 5 Months
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const window = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
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
      case 'pending':
      case 'overdue':
        navigate('/dashboard/data/sales?view=maintenance');
        break;
      case 'completed':
        if (userRole === 'user' || 'admin' ||!hasPageAccess('admin_approval')) {
          navigate('/dashboard/data/sales?view=maintenance');
        } else {
          navigate('/dashboard/history?tab=maintenance');
        }
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
      startDate, 
      endDate, 
      name: dashboardStaffFilter, 
      departmentFilter, 
      unitFilter, 
      division: divisionFilter 
    }));
  };

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

      {/* Stats Cards */}
      <StatsCards stats={stats} onCardClick={handleCardClick} />

      {/* Charts Section */}
      <MaintenanceCharts 
        frequencyData={frequencyData} 
        deptData={deptData}
        monthlyData={monthlyData}
      />

      {/* Main Table Section */}
      <div className="rounded-lg border border-purple-200 shadow-md bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/50 rounded-lg shadow-sm">
                <ClipboardList className="h-5 w-5 text-purple-600" />
             </div>
             <div>
                <h3 className="text-purple-700 font-bold">Maintenance Task Summary</h3>
                <p className="text-purple-600 text-sm">Overview of maintenance activities and machine health</p>
             </div>
          </div>
        </div>
        <div className="p-4">
          <MaintenanceTable 
            tasks={allMaintenanceTasks} 
            onUpdateTask={handleUpdateTask}
            isLoading={loading}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenanceView;
