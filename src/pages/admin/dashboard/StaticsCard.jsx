import { ListTodo, CheckCircle2, Clock, AlertTriangle, BarChart3, XCircle, Calendar } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { createPortal } from "react-dom"
import { hasPageAccess } from "../../../utils/permissionUtils"

export default function StatisticsCards({
  dashboardType,
  totalTask,
  completeTask,
  pendingTask,
  overdueTask,
  notDoneTask,
  dateRange = null,
  dashboardStaffFilter = "all",
  allStaffTasks = [],
  pendingToday = 0,
  pendingUpcoming = 0,
  pendingOverdue = 0,
  completedRatingOne = 0,
  completedRatingTwo = 0,
  completedRatingThreePlus = 0,
  isLoading = false,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalTasks, setModalTasks] = useState([]);
  const [visibleTasksCount, setVisibleTasksCount] = useState(100);

  const navigate = useNavigate();

  const completionRate = totalTask > 0 ? (completeTask / totalTask) * 100 : 0;

  // DO NOT calculate notDone here!
  // const notDoneTask = totalTask - completeTask - pendingTask - overdueTask;

  const pendingRate = totalTask > 0 ? (pendingTask / totalTask) * 100 : 0;
  const notDoneRate = totalTask > 0 ? (notDoneTask / totalTask) * 100 : 0;
  const overdueRate = totalTask > 0 ? (overdueTask / totalTask) * 100 : 0;

  // New rates for delegation segments
  // Use ratings if available, regardless of module
  const ratingOneRate = totalTask > 0 ? (completedRatingOne / totalTask) * 100 : completionRate;
  const ratingTwoRate = totalTask > 0 ? (completedRatingTwo / totalTask) * 100 : notDoneRate;
  const ratingThreePlusRate = totalTask > 0 ? (completedRatingThreePlus / totalTask) * 100 : overdueRate;

  // Calculate stroke dash arrays
  const circumference = 251.3;
  const pendingDash = pendingRate * circumference / 100;
  const notDoneDash = (completedRatingTwo > 0 ? ratingTwoRate : notDoneRate) * circumference / 100;
  const overdueDash = (completedRatingThreePlus > 0 ? ratingThreePlusRate : overdueRate) * circumference / 100;
  const completedDash = (completedRatingOne > 0 ? ratingOneRate : completionRate) * circumference / 100;

  // --- On-Time Performance Calculations (Out of Completed Tasks) ---
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const parseTaskDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const filteredTasksForOnTime = allStaffTasks.filter(t => {
    const taskDate = parseTaskDate(t.originalTaskStartDate);
    if (!taskDate) return false;
    return (
      taskDate <= today || 
      dashboardType === "delegation" ||
      t.status === "completed"
    );
  });

  const completedTasksInList = filteredTasksForOnTime.filter(t => t.status === "completed").length;

  const completedOnTimeCount = filteredTasksForOnTime.filter(t => 
    t.status === "completed" && (t.is_on_time || t.rating === 1 || t.rating === "1" || t.rating === 1.0)
  ).length;

  const onTimeRate = completedTasksInList > 0 ? (completedOnTimeCount / completedTasksInList) * 100 : 0;
  const completedLateRate = completedTasksInList > 0 ? (100 - onTimeRate) : 0;

  const onTimeDash = onTimeRate * circumference / 100;
  const completedLateDash = completedLateRate * circumference / 100;

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleCardClick = (type, path) => {
    if ((dashboardStaffFilter !== "all" && dashboardStaffFilter !== "") || dateRange) {
      let filtered = [];
      let title = "";
      const typeLabel = dashboardType === "delegation" ? "Delegation" : "Checklist";
      const staffLabel = dashboardStaffFilter !== "all" && dashboardStaffFilter !== "" ? dashboardStaffFilter : "All Staff";

      const parseDDMMYYYY = (str) => {
        if (!str || typeof str !== "string") return null;
        const parts = str.split("/");
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
      };

      // Apply date range filter to tasks first if dateRange is active
      let targetTasks = allStaffTasks;
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        const start = new Date(dateRange.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.endDate);
        end.setHours(23, 59, 59, 999);

        targetTasks = allStaffTasks.filter((t) => {
          const taskDate = parseDDMMYYYY(t.taskStartDate);
          return taskDate && taskDate >= start && taskDate <= end;
        });
      }

      switch (type) {
        case "total":
          filtered = targetTasks;
          title = `Total ${typeLabel} Tasks for ${staffLabel}`;
          break;
        case "completed":
          if (dashboardType === "delegation") {
            filtered = targetTasks.filter((t) => t.status === "completed" && Number(t.rating) === 1);
            title = `Completed Once (Rating 1) for ${staffLabel}`;
          } else {
            filtered = targetTasks.filter((t) => t.status === "completed");
            title = `Completed Tasks (${typeLabel}) for ${staffLabel}`;
          }
          break;
        case "pending":
          const todayDate = new Date();
          filtered = targetTasks.filter((t) => {
            const taskDate = parseDDMMYYYY(t.taskStartDate);
            const isToday = taskDate &&
              taskDate.getDate() === todayDate.getDate() &&
              taskDate.getMonth() === todayDate.getMonth() &&
              taskDate.getFullYear() === todayDate.getFullYear();

            if (dashboardType === "checklist") {
              return isToday && t.status === "pending";
            } else {
              return t.status === "pending" || t.status === "overdue";
            }
          });
          title = `Pending Tasks (${typeLabel}) for ${staffLabel}`;
          break;
        case "not_done":
          if (dashboardType === "delegation") {
            filtered = targetTasks.filter((t) => t.status === "completed" && Number(t.rating) === 2);
            title = `Completed Twice (Rating 2) for ${staffLabel}`;
          } else {
            filtered = targetTasks.filter((t) => t.status !== "completed" && t.status !== "overdue");
            title = `Not Done (${typeLabel}) for ${staffLabel}`;
          }
          break;
        case "overdue":
          if (dashboardType === "delegation") {
            filtered = targetTasks.filter((t) => t.status === "completed" && Number(t.rating) >= 3);
            title = `Completed Thrice 3+ (Rating 3+) for ${staffLabel}`;
          } else {
            filtered = targetTasks.filter((t) => t.status === "overdue");
            title = `Overdue Tasks (${typeLabel}) for ${staffLabel}`;
          }
          break;
        default:
          break;
      }

      if (dateRange && dateRange.startDate && dateRange.endDate) {
        title += ` [${dateRange.startDate} to ${dateRange.endDate}]`;
      }

      setModalTasks(filtered);
      setModalTitle(title);
      setVisibleTasksCount(100);
      setModalOpen(true);
    } else {
      navigate(path);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Top row - Statistics Cards */}
      <div className={`grid gap-3 sm:gap-4 justify-center ${
        dashboardType === "delegation" 
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" 
          : "grid-cols-2 lg:grid-cols-4"
      }`}>

          {/* Total Tasks - Updated description for date range */}
          <div 
            onClick={() => handleCardClick("total", dashboardType === 'delegation' ? '/dashboard/delegation' : '/dashboard/data/sales')}
            className="rounded-lg border border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-tr-lg p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-blue-700">Total Tasks</h3>
              <ListTodo className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            <div className="hidden sm:block p-3 sm:p-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700">{totalTask}</div>
              <p className="text-xs text-blue-600">
                {dateRange ? (
                  <>Tasks in selected period</>
                ) : dashboardType === "delegation" ? (
                  "All tasks"
                ) : (
                  "Total tasks in checklist"
                )}
              </p>
            </div>

            <div className="sm:hidden p-3 sm:p-4 mt-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-700">{totalTask}</div>
              <p className="text-xs text-blue-600">
                {dateRange ? "Selected period" : "Total tasks"}
              </p>
            </div>
          </div>

          <div 
            onClick={() => handleCardClick("completed", 
              dashboardType === 'delegation' 
                ? (hasPageAccess('admin_approval') ? '/dashboard/history?tab=delegation' : '/dashboard/delegation')
                : '/dashboard/history'
            )}
            className="rounded-lg border border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-50 to-green-100 rounded-tr-lg p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-green-700">
                {dashboardType === "delegation" ? "Completed Once" : "Completed Tasks"}
              </h3>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </div>
            <div className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700">
                {dashboardType === "delegation" ? completedRatingOne : completeTask}
              </div>
              <p className="text-xs text-green-600">
                {dateRange ? (
                  <>Completed in period</>
                ) : dashboardType === "delegation" ? (
                  "Completed tasks"
                ) : (
                  "Total completed"
                )}
              </p>
            </div>
          </div>

          {/* Pending Tasks / Completed Twice */}
          <div 
            onClick={() => handleCardClick("pending", dashboardType === 'delegation' ? '/dashboard/delegation' : '/dashboard/data/sales')}
            className="rounded-lg border border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-tr-lg p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-amber-700">
                {dashboardType === "delegation" ? "Pending Tasks" : "Pending Tasks"}
              </h3>
              {dashboardType === "delegation" ? (
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              ) : (
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              )}
            </div>
            <div className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-700">
                {dashboardType === "checklist" ? pendingToday : pendingTask}
              </div>
              <div className="flex flex-wrap justify-between items-center mt-1 gap-y-2 gap-x-2">
                <p className="text-xs text-amber-600">
                  {dateRange ? (
                    <>Pending in period</>
                  ) : dashboardType === "delegation" ? (
                    "Total Pending"
                  ) : (
                    "Today's Pending"
                  )}
                </p>
                <div className="flex flex-wrap gap-1 md:gap-1.5 text-[10px] sm:text-xs">
                  <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">T:{pendingToday}</span>
                  {dashboardType !== "checklist" && (
                    <>
                      <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">U:{pendingUpcoming}</span>
                      <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">O:{pendingOverdue}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Not Done Tasks - only shown for Delegation as "Completed Twice" */}
          {dashboardType === "delegation" && (
          <div
            onClick={() => handleCardClick("not_done", 
              hasPageAccess('admin_approval') ? '/dashboard/history?tab=delegation' : '/dashboard/delegation'
            )}
            className="rounded-lg border border-l-4 border-l-gray-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-tr-lg p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700">
                Completed Twice
              </h3>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            </div>
            <div className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-700">
                {completedRatingTwo}
              </div>
              <p className="text-xs text-gray-600">
                {dateRange ? "Completed twice in period" : "Rating 2 tasks"}
              </p>
            </div>
          </div>
          )}

          {/* Overdue Tasks / Completed 3+ Times */}
          <div 
            onClick={() => handleCardClick("overdue", 
              dashboardType === 'delegation' 
                ? (hasPageAccess('admin_approval') ? '/dashboard/history?tab=delegation' : '/dashboard/delegation')
                : '/dashboard/data/sales'
            )}
            className="rounded-lg border border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-all bg-white cursor-pointer"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-red-50 to-red-100 rounded-tr-lg p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-red-700">
                {dashboardType === "delegation" ? "Completed Thrice 3+" : "Overdue Tasks"}
              </h3>
              {dashboardType === "delegation" ? (
                <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              )}
            </div>
            <div className="p-3 sm:p-4">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-700">
                {dashboardType === "delegation" ? completedRatingThreePlus : overdueTask}
              </div>
              <p className="text-xs text-red-600">
                {dateRange ? (
                  dashboardType === "delegation" ? "Completed thrice in period" : "Overdue in period"
                ) : dashboardType === "delegation" ? (
                  "Rating 3+ tasks"
                ) : (
                  "Past due"
                )}
              </p>
            </div>
          </div>

      </div>

      {/* Bottom row - Circular Progress Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Overall Progress */}
        <div className="rounded-lg border border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-all bg-white h-auto flex-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-tr-lg p-3">
            <h3 className="text-xs sm:text-sm font-medium text-indigo-700">
              {dateRange ? "Period Progress" : "Overall Progress"}
            </h3>
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500" />
          </div>
          <div className="p-4 sm:p-6">
            {/* Single layout for all screen sizes - Circle left, Legend right */}
            <div className="flex flex-row items-center justify-between">
              {/* Circular Progress - Left */}
              <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 lg:w-48 lg:h-48 xl:w-52 xl:h-52">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Overdue segment - red */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#ef4444"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${overdueDash} ${circumference}`}
                  />
                  {/* Not Done segment - gray */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#6b7280"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${notDoneDash} ${circumference}`}
                    strokeDashoffset={-overdueDash}
                  />
                  {/* Pending segment - amber/yellow */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${pendingDash} ${circumference}`}
                    strokeDashoffset={-(overdueDash + notDoneDash)}
                  />
                  {/* Completed segment - green */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${completedDash} ${circumference}`}
                    strokeDashoffset={-(overdueDash + notDoneDash + pendingDash)}
                  />
                </svg>
                {/* Percentage text in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-700">
                      {completionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dateRange ? "Period" : "Overall"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend - Right */}
              <div className="grid grid-cols-1 gap-1 xs:gap-2 sm:gap-3 text-xs xs:text-sm sm:text-base md:text-lg flex-1 max-w-[200px]">
                <div className="flex items-center space-x-1 xs:space-x-2">
                  <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="font-medium">{dashboardType === "delegation" ? "Once:" : "Completed:"}</span>
                  <span className="text-gray-700">{(dashboardType === "delegation" ? ratingOneRate : completionRate).toFixed(1)}%</span>
                </div>
                {dashboardType === "delegation" ? (
                  <>
                    <div className="flex items-center space-x-1 xs:space-x-2">
                      <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-gray-500 flex-shrink-0"></div>
                      <span className="font-medium">Twice:</span>
                      <span className="text-gray-700">{ratingTwoRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center space-x-1 xs:space-x-2">
                      <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                      <span className="font-medium">Thrice:</span>
                      <span className="text-gray-700">{ratingThreePlusRate.toFixed(1)}%</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-1 xs:space-x-2">
                      <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-gray-500 flex-shrink-0"></div>
                      <span className="font-medium">Not Done:</span>
                      <span className="text-gray-700">{notDoneRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center space-x-1 xs:space-x-2">
                      <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                      <span className="font-medium">Overdue:</span>
                      <span className="text-gray-700">{overdueRate.toFixed(1)}%</span>
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-1 xs:space-x-2">
                  <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-amber-500 flex-shrink-0"></div>
                  <span className="font-medium">Pending:</span>
                  <span className="text-gray-700">{pendingRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Additional info when date range is applied */}
            {dateRange && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 text-center">
                  Analysis based on {totalTask} tasks from selected date range
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Graph 2: On-Time Performance */}
        <div className="rounded-lg border border-l-4 border-l-emerald-500 shadow-md hover:shadow-lg transition-all bg-white h-auto flex-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-tr-lg p-3">
            <h3 className="text-xs sm:text-sm font-medium text-emerald-700">
              {dateRange ? "Period On-Time" : "Overall On-Time"}
            </h3>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
          </div>
          <div className="p-4 sm:p-6">
            {/* Single layout for all screen sizes - Circle left, Legend right */}
            <div className="flex flex-row items-center justify-between">
              {/* Circular Progress - Left */}
              <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 lg:w-48 lg:h-48 xl:w-52 xl:h-52">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Completed Late segment - amber */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${completedLateDash} ${circumference}`}
                  />
                  {/* Completed On-Time segment - green */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="line"
                    strokeDasharray={`${onTimeDash} ${circumference}`}
                    strokeDashoffset={-completedLateDash}
                  />
                </svg>
                {/* Percentage text in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-700">
                      {onTimeRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      On-Time
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend - Right */}
              <div className="grid grid-cols-1 gap-1 xs:gap-2 sm:gap-3 text-xs xs:text-sm sm:text-base md:text-lg flex-1 max-w-[200px]">
                <div className="flex items-center space-x-1 xs:space-x-2">
                  <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="font-medium">On-Time:</span>
                  <span className="text-gray-700">{onTimeRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center space-x-1 xs:space-x-2">
                  <div className="w-2 h-2 xs:w-3 xs:h-3 sm:w-4 sm:h-4 rounded-full bg-amber-500 flex-shrink-0"></div>
                  <span className="font-medium">Late:</span>
                  <span className="text-gray-700">{completedLateRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Additional info when date range is applied */}
            {dateRange && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 text-center">
                  Analysis based on {completedTasksInList} completed tasks from selected date range
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Details Popup Modal - rendered via Portal to escape parent stacking contexts */}
    {modalOpen && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 px-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-purple-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold">{modalTitle}</h2>
            <button
              onClick={() => setModalOpen(false)}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[65vh]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-gray-500 mt-4 font-medium animate-pulse">Loading tasks...</p>
              </div>
            ) : modalTasks.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tasks found for this category.</p>
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <table className="w-full text-sm text-left border-collapse hidden md:table">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Task Description</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalTasks.slice(0, visibleTasksCount).map((task, idx) => (
                      <tr
                        key={task.id ? `${task.id}-${idx}` : idx}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-purple-700">{task.id || "-"}</td>
                        <td className="px-4 py-3 text-gray-800">{task.title || "-"}</td>
                        <td className="px-4 py-3 capitalize">
                           <span
                             className={`px-2 py-1 text-xs rounded-full font-medium border ${
                               task.status === "completed"
                                 ? "bg-green-100 text-green-700 border-green-200"
                                 : task.status === "overdue"
                                 ? "bg-red-100 text-red-700 border-red-200"
                                 : "bg-yellow-100 text-yellow-700 border-yellow-200"
                             }`}
                           >
                             {task.status}
                           </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {task.taskStartDate || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600 capitalize">
                          {task.frequency || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
 
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {modalTasks.slice(0, visibleTasksCount).map((task, idx) => (
                    <div 
                      key={task.id ? `${task.id}-${idx}` : idx} 
                      className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                          ID: {task.id || "-"}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold border ${
                            task.status === "completed"
                              ? "bg-green-50 text-green-600 border-green-100"
                              : task.status === "overdue"
                              ? "bg-red-50 text-red-600 border-red-100"
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 leading-snug">
                          {task.title || "No Description Provided"}
                        </h4>
                      </div>
 
                      <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          <span>{task.taskStartDate || "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-400" />
                          <span className="capitalize">{task.frequency || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Local Load More Button */}
                {visibleTasksCount < modalTasks.length && (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      onClick={() => setVisibleTasksCount((prev) => prev + 200)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-bold shadow-md"
                    >
                      Load More (Showing {visibleTasksCount} of {modalTasks.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>

        </div>
      </div>,
      document.body
    )}
    </>
  )
}