import { authFetch } from "../../utils/authFetch";
import { useState, useEffect, useMemo } from "react";
import { BellRing, FileCheck, Calendar, Clock, Download, ClipboardList, Users, ArrowLeft, Settings } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { hasPageAccess, hasModifyAccess, canAccessModule } from "../../utils/permissionUtils";
import { pushAssignTaskApi } from "../../redux/api/assignTaskApi";
import { useDispatch, useSelector } from "react-redux";
import { uniqueDoerNameData, uniqueGivenByData } from "../../redux/slice/assignTaskSlice";
import { fetchUserProfile } from "../../redux/slice/userProfileSlice";
import { fetchMachinePartsData } from "../../redux/slice/maintenanceSlice";
import CSVImportModal from "../../components/CSVImportModal";
import Toast from "../../components/Toast";

// Calendar Component (defined outside)
const CalendarComponent = ({ date, onChange, onClose }) => {


  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  // console.log(fetchUniqueDepartmentDataApi())
  // console.log(fetchUniqueGivenByDataApi())
  // console.log(fetchUniqueDoerNameDataApi())


  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    
    // Get today's date for comparison (without time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      currentDate.setHours(0, 0, 0, 0);
      
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();
      
      // Check if date is in the past (before today)
      const isPastDate = currentDate < today;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => !isPastDate && handleDateClick(day)}
          disabled={isPastDate}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
            isPastDate
              ? "text-gray-300 cursor-not-allowed"
              : isSelected
                ? "bg-purple-600 text-white"
                : "hover:bg-purple-100 text-gray-700"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md shadow-md">
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &lt;
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

const formatDateToDDMMYYYY = (date) => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseDateFromDDMMYYYY = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
};

export default function AssignTaskUser() {
  // ── Redux selectors ──
  const { doerName, givenBy } = useSelector((state) => state.assignTask);
  const { profile, loading: profileLoading } = useSelector((state) => state.userProfile);
  const reduxUserData = useSelector((state) => state.login.userData);
  const machineParts = useSelector((state) => state.maintenance?.machineParts) || [];

  // Username: derive from Redux (reactive) with localStorage fallback
  const username = (reduxUserData && !Array.isArray(reduxUserData))
    ? (reduxUserData.user_name || reduxUserData.username || '')
    : (localStorage.getItem('user-name') || '');

  // User role for fallback
  const userRole = localStorage.getItem('role');

  // Derive fields from profile (fetched from DB)
  const userUnit = profile?.unit || '';
  const userDivision = profile?.division || '';
  const userDepartment = profile?.department || '';

  // Filter doer names to only this user unless they have admin task permissions or are an admin
  const canAssignToOthers = hasPageAccess("assign_task_admin") || (userRole === "admin" || userRole === "div_admin") || userRole === "super_admin";

  const filteredDoerNames = canAssignToOthers
    ? doerName
    : (doerName || []).filter(
        (doer) => {
          const nameStr = (typeof doer === 'string' ? doer : doer?.user_name) || '';
          return nameStr.trim().toLowerCase() === (username || '').trim().toLowerCase();
        }
      );

  const dispatch = useDispatch();

  // ── Fetch user profile from DB on mount ──
  useEffect(() => {
    if (username) {
      dispatch(fetchUserProfile(username));
      dispatch(uniqueGivenByData());
      dispatch(fetchMachinePartsData());
    }
  }, [dispatch, username]);

  // ── Fetch doer names when department is known ──
  useEffect(() => {
    if (userDepartment) {
      dispatch(uniqueDoerNameData({
        department: userDepartment,
        unit: userUnit,
        division: userDivision,
      }));
    }
  }, [dispatch, userDepartment, userUnit, userDivision]);

  // ── Utility ──
  const getCurrentTime = () => {
    return "23:59";
  };

  // ── Local states ──
  const [date, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [time, setTime] = useState(getCurrentTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [taskType, setTaskType] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // ── Form state ──
  const [formData, setFormData] = useState({
    unit: "",
    division: "",
    department: "",
    givenBy: "Admin",
    doer: "",
    description: "",
    frequency: "daily",
    enableReminders: true,
    requireAttachment: false,
    machineName: "",
    partName: [],
    partArea: "",
    machineDepartment: "",
    machineDivision: "",
    duration: "",
    machinePartId: null,
  });

  const frequencies = [
    { value: "one-time", label: "One Time (No Recurrence)" },
    { value: "daily", label: "Daily" },
    { value: "tertiary", label: "Tertiary (Every 3 Days)" },
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "half-yearly", label: "Half Yearly" },
    { value: "yearly", label: "Yearly" },
    { value: "end-of-1st-week", label: "End of 1st Week" },
    { value: "end-of-2nd-week", label: "End of 2nd Week" },
    { value: "end-of-3rd-week", label: "End of 3rd Week" },
    { value: "end-of-4th-week", label: "End of 4th Week" },
    { value: "end-of-last-week", label: "End of Last Week" },
  ];

  // Hierarchical Maintenance Data
  const maintenanceDivisions = useMemo(() => {
    return [...new Set(machineParts.map(mp => mp.machine_division).filter(Boolean))];
  }, [machineParts]);

  const maintenanceDepartments = useMemo(() => {
    if (!formData.machineDivision) return [];
    return [...new Set(
      machineParts
        .filter(mp => mp.machine_division === formData.machineDivision)
        .map(mp => mp.machine_department)
        .filter(Boolean)
    )];
  }, [machineParts, formData.machineDivision]);

  const maintenanceNames = useMemo(() => {
    if (!formData.machineDepartment) return [];
    return [...new Set(
      machineParts
        .filter(mp => 
          mp.machine_division === formData.machineDivision && 
          mp.machine_department === formData.machineDepartment
        )
        .map(mp => mp.machine_name)
        .filter(Boolean)
    )];
  }, [machineParts, formData.machineDivision, formData.machineDepartment]);

  const maintenanceAreas = useMemo(() => {
    if (!formData.machineName) return [];
    return [...new Set(
      machineParts
        .filter(mp => 
          mp.machine_division === formData.machineDivision && 
          mp.machine_department === formData.machineDepartment &&
          mp.machine_name === formData.machineName
        )
        .map(mp => mp.machine_area)
        .filter(Boolean)
    )];
  }, [machineParts, formData.machineDivision, formData.machineDepartment, formData.machineName]);

  const maintenancePartsOptions = useMemo(() => {
    if (!formData.partArea) return [];
    const filtered = machineParts
      .filter(mp => 
        mp.machine_division === formData.machineDivision && 
        mp.machine_department === formData.machineDepartment &&
        mp.machine_name === formData.machineName &&
        mp.machine_area === formData.partArea
      );
    // Flatten part_name arrays into individual selectable options
    const parts = [];
    filtered.forEach(mp => {
      const names = Array.isArray(mp.part_name) ? mp.part_name : (mp.part_name ? [mp.part_name] : []);
      names.forEach(name => {
        if (name && !parts.find(p => p.name === name)) {
          parts.push({ id: mp.id, name });
        }
      });
    });
    return parts;
  }, [machineParts, formData.machineDivision, formData.machineDepartment, formData.machineName, formData.partArea]);


  // ── Populate form when profile arrives from DB ──
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        unit: profile.unit || prev.unit,
        division: profile.division || prev.division,
        department: profile.department || prev.department,
        doer: profile.user_name || username || prev.doer,
      }));
    }
  }, [profile, username]);

  const handleUnitChange = (value) => {
    // Read-only, do not allow change
  };

  const handleDivisionChange = (value) => {
    // Read-only, do not allow change
  };

  const handleDepartmentChange = (value) => {
    // Read-only, do not allow change
  };


  // Fetch working days from Supabase on component mount
useEffect(() => {
  const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/assign-task`;
  const fetchWorkingDays = async () => {
    try {
      // const res = await authFetch("http://localhost:5050/api/assign-task/working-days");
      const res = await authFetch(`${BASE_URL}/working-days`);
      const data = await res.json();

      const formattedDays = data.map((day) => {
        const date = new Date(day.working_date);
        return formatDateToDDMMYYYY(date);
      });

      setWorkingDays(formattedDays);
    } catch (error) {
      console.error("Error fetching working days:", error);
    }
  };

  fetchWorkingDays();
}, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    return formatDate(date);
  };

  const formatDateTimeForStorage = (date, time) => {
    if (!date || !time) return "";
    // Use local time components to avoid UTC conversion shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    // Construct simplified ISO string that DB expects (e.g., "2026-01-08T18:00:00")
    // Since DB is TIMESTAMP WITHOUT TIMEZONE, this will store "2026-01-08 18:00:00"
    return `${dateString}T${time}:00`;
  };

  const findNextWorkingDay = (targetDate) => {
    const targetDateStr = formatDateToDDMMYYYY(targetDate);

    // If target date is a working day, return it
    if (workingDays.includes(targetDateStr)) {
      return targetDateStr;
    }

    // Find the next working day after target date
    const targetDateObj = parseDateFromDDMMYYYY(targetDateStr);
    const nextWorkingDay = workingDays.find((day) => {
      const dayObj = parseDateFromDDMMYYYY(day);
      return dayObj > targetDateObj;
    });

    // Return null if no working day found (beyond calendar range)
    return nextWorkingDay || null;
  };

  const findEndOfWeekDate = (date, weekNumber) => {
    const [targetDay, targetMonth, targetYear] = formatDateToDDMMYYYY(date)
      .split("/")
      .map(Number);

    // Filter working days for the target month
    const monthDays = workingDays.filter((day) => {
      const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
      return dayYear === targetYear && dayMonth === targetMonth;
    });

    if (weekNumber === -1) {
      // Last week of month
      return monthDays[monthDays.length - 1];
    }

    // Group by weeks (assuming week_num from Supabase is correct)
    const weeks = {};
    monthDays.forEach((day) => {
      const [dayDay, dayMonth, dayYear] = day.split("/").map(Number);
      const dayObj = new Date(dayYear, dayMonth - 1, dayDay);
      const weekNum = Math.ceil(dayDay / 7);
      if (!weeks[weekNum]) weeks[weekNum] = [];
      weeks[weekNum].push(day);
    });

    // Get the last day of the requested week
    const weekDays = weeks[weekNumber];
    return weekDays ? weekDays[weekDays.length - 1] : monthDays[monthDays.length - 1];
  };

  const generateTasks = async () => {
    if (
      !date ||
      !time ||
      !formData.doer ||
      !formData.description ||
      !formData.frequency
    ) {
      setToast({ 
        show: true, 
        message: "Please fill in all required fields including date and time.", 
        type: "warning" 
      });
      return;
    }

    if (workingDays.length === 0) {
      setToast({ 
        show: true, 
        message: "Working days data not loaded yet. Please try again.", 
        type: "info" 
      });
      return;
    }

    const selectedDate = new Date(date);
    const tasks = [];

    const selectedDoerObj = doerName.find(d => (d.user_name || d) === formData.doer);

    // For one-time tasks
    if (formData.frequency === "one-time") {
      const taskDateStr = findNextWorkingDay(selectedDate);
      const taskDateTimeStr = formatDateTimeForStorage(
        parseDateFromDDMMYYYY(taskDateStr),
        time
      );

      // For delegation, include the user-selected task start date
      const taskStartDateStr = startDate
        ? formatDateTimeForStorage(startDate, time)
        : taskDateTimeStr;

      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateTimeStr,
        taskStartDate: taskStartDateStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
        unit: formData.unit,
        division: formData.division,
        taskType: taskType,
        ...(taskType === 'maintenance' && {
          machineName: formData.machineName,
          partName: formData.partName,
          partArea: formData.partArea,
          machine_department: formData.machineDepartment,
          machine_division: formData.machineDivision,
          duration: formData.duration
        })
      });
    } else {
      // For recurring tasks
      let currentDate = new Date(selectedDate);
      const endDate = addYears(currentDate, 2); // Generate up to 2 years ahead
      let taskCount = 0;
      const maxTasks = 365; // Safety limit

      while (currentDate <= endDate && taskCount < maxTasks) {
        // Day-off skipping removed

        let taskDate;

        switch (formData.frequency) {
          case "daily":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 1);
            break;

          case "tertiary":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 3);
            break;

          case "weekly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 7);
            break;

          case "fortnightly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 14);
            break;

          case "monthly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
            break;

          case "quarterly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 3);
            break;

          case "half-yearly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 6);
            break;

          case "yearly":
            taskDate = findNextWorkingDay(currentDate);
            if (!taskDate) break; // No more working days available
            currentDate = addYears(parseDateFromDDMMYYYY(taskDate), 1);
            break;

          case "end-of-1st-week":
          case "end-of-2nd-week":
          case "end-of-3rd-week":
          case "end-of-4th-week": {
            const weekNum = parseInt(formData.frequency.split("-")[2]);
            taskDate = findEndOfWeekDate(currentDate, weekNum);
            if (!taskDate) break; // No more working days available
            currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
            break;
          }

          case "end-of-last-week":
            taskDate = findEndOfWeekDate(currentDate, -1);
            if (!taskDate) break; // No more working days available
            currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
            break;

          default:
            currentDate = endDate; // Exit loop for unknown frequencies
            break;
        }

        // Stop generating tasks if no more working days are available
        if (!taskDate) {
          break;
        }

        const taskDateTimeStr = formatDateTimeForStorage(
          parseDateFromDDMMYYYY(taskDate),
          time
        );

        tasks.push({
          description: formData.description,
          department: formData.department,
          givenBy: formData.givenBy,
          doer: formData.doer,
          dueDate: taskDateTimeStr,
          status: "pending",
          frequency: formData.frequency,
          enableReminders: formData.enableReminders,
          requireAttachment: formData.requireAttachment,
          unit: formData.unit,
          division: formData.division,
          taskType: taskType,
          ...(taskType === 'maintenance' && {
            machinePartId: formData.machinePartId,
            machineName: formData.machineName,
            partName: formData.partName,
            partArea: formData.partArea,
            machine_department: formData.machineDepartment,
            machine_division: formData.machineDivision,
            duration: formData.duration
          })
        });

        taskCount++;
      }
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (
        !date ||
        !time ||
        !formData.doer ||
        !formData.description ||
        !formData.frequency
      ) {
        setToast({ 
          show: true, 
          message: "Please fill in all required fields including date and time.", 
          type: "warning" 
        });
        setIsSubmitting(false);
        return;
      }

      if (workingDays.length === 0) {
        setToast({ 
          show: true, 
          message: "Working days data not loaded yet. Please try again.", 
          type: "info" 
        });
        setIsSubmitting(false);
        return;
      }

      // Always generate fresh tasks from current form data (don't reuse preview)
      const selectedDate = new Date(date);
      const tasks = [];

      const selectedDoerObj = doerName.find(d => (d.user_name || d) === formData.doer);

      // For one-time tasks
      if (formData.frequency === "one-time") {
        const taskDateStr = findNextWorkingDay(selectedDate);
        const taskDateTimeStr = formatDateTimeForStorage(
          parseDateFromDDMMYYYY(taskDateStr),
          time
        );

        // For delegation, include the user-selected task start date
        const taskStartDateStr = startDate
          ? formatDateTimeForStorage(startDate, time)
          : taskDateTimeStr;

        tasks.push({
          description: formData.description,
          department: formData.department,
          givenBy: formData.givenBy,
          doer: formData.doer,
          dueDate: taskDateTimeStr,
          taskStartDate: taskStartDateStr,
          status: "pending",
          frequency: formData.frequency,
          enableReminders: formData.enableReminders,
          requireAttachment: formData.requireAttachment,
          unit: formData.unit,
          division: formData.division,
          taskType: taskType,
          ...(taskType === 'maintenance' && {
            machinePartId: formData.machinePartId,
            machineName: formData.machineName,
            partName: formData.partName,
            partArea: formData.partArea,
            machine_department: formData.machineDepartment,
            machine_division: formData.machineDivision,
            duration: formData.duration
          })
        });
      } else {
        // For recurring tasks
        let currentDate = new Date(selectedDate);
        const endDate = addYears(currentDate, 2); // Generate up to 2 years ahead
        let taskCount = 0;
        const maxTasks = 365; // Safety limit

        while (currentDate <= endDate && taskCount < maxTasks) {
          // Day-off skipping removed

          let taskDate;

          switch (formData.frequency) {
            case "daily":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 1);
              break;

            case "tertiary":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 3);
              break;

            case "weekly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 7);
              break;

            case "fortnightly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addDays(parseDateFromDDMMYYYY(taskDate), 14);
              break;

            case "monthly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
              break;

            case "quarterly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 3);
              break;

            case "half-yearly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 6);
              break;

            case "yearly":
              taskDate = findNextWorkingDay(currentDate);
              if (!taskDate) break; // No more working days available
              currentDate = addYears(parseDateFromDDMMYYYY(taskDate), 1);
              break;

            case "end-of-1st-week":
            case "end-of-2nd-week":
            case "end-of-3rd-week":
            case "end-of-4th-week": {
              const weekNum = parseInt(formData.frequency.split("-")[2]);
              taskDate = findEndOfWeekDate(currentDate, weekNum);
              if (!taskDate) break; // No more working days available
              currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
              break;
            }

            case "end-of-last-week":
              taskDate = findEndOfWeekDate(currentDate, -1);
              if (!taskDate) break; // No more working days available
              currentDate = addMonths(parseDateFromDDMMYYYY(taskDate), 1);
              break;

            default:
              currentDate = endDate; // Exit loop for unknown frequencies
              break;
          }

          // Stop generating tasks if no more working days are available
          if (!taskDate) {
            break;
          }

          const taskDateTimeStr = formatDateTimeForStorage(
            parseDateFromDDMMYYYY(taskDate),
            time
          );

          tasks.push({
            description: formData.description,
            department: formData.department,
            givenBy: formData.givenBy,
            doer: formData.doer,
            dueDate: taskDateTimeStr,
            status: "pending",
            frequency: formData.frequency,
            enableReminders: formData.enableReminders,
            requireAttachment: formData.requireAttachment,
            unit: formData.unit,
            division: formData.division,
            taskType: taskType,
            ...(taskType === 'maintenance' && {
              machinePartId: formData.machinePartId,
              machineName: formData.machineName,
              partName: formData.partName,
              partArea: formData.partArea,
              machine_department: formData.machineDepartment,
              machine_division: formData.machineDivision,
              duration: formData.duration
            })
          });

          taskCount++;
        }
      }

      const tasksToSubmit = tasks;

      if (tasksToSubmit.length === 0) {
        setToast({ 
          show: true, 
          message: "No tasks could be generated. Please check your inputs.", 
          type: "warning" 
        });
        setIsSubmitting(false);
        return;
      }

      await pushAssignTaskApi(tasksToSubmit);
      setToast({ 
        show: true, 
        message: `Successfully submitted ${tasksToSubmit.length} tasks!`, 
        type: "success" 
      });

      const isAdminRole = userRole === 'super_admin' || userRole === 'admin' || userRole === 'div_admin';
      
      if (!isAdminRole) {
        // Reset form for non-admin users
        setFormData({
          unit: formData.unit,
          division: formData.division,
          department: formData.department,
          givenBy: "Admin",
          doer: username || "",
          description: "",
          frequency: taskType === 'delegation' ? 'one-time' : 'daily',
          enableReminders: true,
          requireAttachment: false,
          machineName: "",
          partName: [],
          partArea: "",
          machinePartId: null,
          machineDepartment: "",
          machineDivision: "",
          duration: "",
        });
        setSelectedDate(new Date()); 
        setStartDate(new Date());
        setTime(getCurrentTime());
      }
      
      setGeneratedTasks([]);
      setAccordionOpen(false);
    } catch (error) {
      console.error("Submission error:", error);
      setToast({ 
        show: true, 
        message: "Failed to assign tasks. Please try again.", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateTimeStr) => {
    return dateTimeStr;
  };

  const getFormattedDateTime = () => {
    if (!date) return "Select date and time";
    const dateStr = formatDate(date);
    const timeStr = time || "10:00";
    return `${dateStr} at ${timeStr}`;
  };





  // UPDATED: Date formatting function to return DD/MM/YYYY format (for working days comparison)
  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };


  useEffect(() => {
    if (formData.department) {
      dispatch(uniqueDoerNameData({
        department: formData.department,
        unit: formData.unit,
        division: formData.division,
      }));
    }
  }, [dispatch, formData.department, formData.unit, formData.division]);
  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-purple-500 flex items-center gap-2">
            {taskType && (
              <button 
                onClick={() => setTaskType(null)}
                className="p-1 hover:bg-purple-100 rounded-full transition-colors"
                title="Back to selection"
              >
                <ArrowLeft className="h-6 w-6 text-purple-500" />
              </button>
            )}
            Assign New Task {taskType ? `(${taskType === 'checklist' ? 'Checklist' : taskType === 'maintenance' ? 'Maintenance' : 'Delegation'})` : ''}
          </h1>
{/*<button
            onClick={() => setShowImportModal(true)}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(to right, #9333ea, #db2777)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #7e22ce, #be185d)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to right, #9333ea, #db2777)';
            }}
          >
            <Download className="h-4 w-4" style={{ flexShrink: 0 }} />
            Import Tasks
          </button>*/}
        </div>
        {!taskType ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            {/* Checklist Card */}
            {canAccessModule("checklist") && (
              <div 
                onClick={() => {
                  setTaskType('checklist');
                  setFormData(prev => ({ ...prev, frequency: 'daily' }));
                }}
                className="group cursor-pointer bg-white rounded-xl border-2 border-purple-100 p-8 shadow-sm hover:shadow-xl hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                  <ClipboardList className="h-12 w-12 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Checklist</h3>
                  <p className="text-gray-500 mt-2">Create recurring tasks with daily, weekly, or monthly frequencies.</p>
                </div>
              </div>
            )}

            {/* Delegation Card */}
            {canAccessModule("delegation") && (
              <div 
                onClick={() => {
                  setTaskType('delegation');
                  setFormData(prev => ({ ...prev, frequency: 'one-time' }));
                }}
                className="group cursor-pointer bg-white rounded-xl border-2 border-purple-100 p-8 shadow-sm hover:shadow-xl hover:border-purple-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-pink-50 rounded-full group-hover:bg-pink-100 transition-colors">
                  <Users className="h-12 w-12 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Delegation</h3>
                  <p className="text-gray-500 mt-2">Assign one-time tasks to staff members with specific deadlines.</p>
                </div>
              </div>
            )}

            {/* NEW: Maintenance Card */}
            {canAccessModule("maintenance") && (
              <div 
                onClick={() => {
                  setTaskType('maintenance');
                  setFormData(prev => ({ ...prev, frequency: 'one-time' }));
                }}
                className="group cursor-pointer bg-white rounded-xl border-2 border-blue-100 p-8 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center text-center space-y-4"
              >
                <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Settings className="h-12 w-12 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Maintenance</h3>
                  <p className="text-gray-500 mt-2">Assign one-time maintenance tasks for machines and parts.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`rounded-lg border border-purple-200 bg-white shadow-md transition-all duration-300 ${showCalendar || showStartCalendar ? 'pb-10' : 'overflow-hidden'}`}>
            <form onSubmit={handleSubmit}>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 border-b border-purple-100">
                <h2 className="text-base font-semibold text-purple-700">
                  {taskType === 'checklist' ? 'Checklist Task Details' : 'Delegation Task Details'}
                </h2>
                <p className="text-xs text-purple-600">
                  Fill in the details to assign a new {taskType} task.
                </p>
              </div>
              <div className="p-3 space-y-2">
                {/* Row 1: Unit, Division, Department (Read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">Unit</label>
                    <div className="w-full rounded-md border border-purple-200 bg-gray-50 p-2 text-gray-700">
                      {formData.unit || "N/A"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">Division</label>
                    <div className="w-full rounded-md border border-purple-200 bg-gray-50 p-2 text-gray-700">
                      {formData.division || "N/A"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">Department</label>
                    <div className="w-full rounded-md border border-purple-200 bg-gray-50 p-2 text-gray-700">
                      {formData.department || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Row 2: Given By and Doer's Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Given By Dropdown */}
                  <div className="space-y-2">
                    <label
                      htmlFor="givenBy"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Given By
                    </label>
                    <select
                      id="givenBy"
                      name="givenBy"
                      value={formData.givenBy}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Given By</option>
                      {givenBy
                        .filter(person => person && person.trim() !== '')
                        .map((person, index) => (
                          <option key={index} value={person}>
                            {person}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Doer's Name Dropdown */}
                  <div className="space-y-2">
                    <label
                      htmlFor="doer"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Doer's Name
                    </label>
                    <select
                      id="doer"
                      name="doer"
                      value={formData.doer}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select Doer</option>
                      {Array.isArray(filteredDoerNames) && filteredDoerNames.map((d, index) => (
                        <option key={index} value={d?.user_name || d}>
                          {typeof d === 'object' ? d?.user_name : d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-purple-700"
                  >
                    Task Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter task description"
                    rows={1}
                    required
                    className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Hierarchical Maintenance Selection */}
                {taskType === 'maintenance' && (
                  <div className="space-y-4 border border-purple-200 p-4 rounded-md mt-4 bg-purple-50/30">
                    <h3 className="text-sm font-semibold text-purple-700 mb-2 font-bold uppercase tracking-wider">Machine Selection Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Division Selection */}
                      <div className="space-y-1">
                        <label htmlFor="machineDivision" className="block text-xs font-medium text-purple-600 font-semibold">
                          Machine Division
                        </label>
                        <select
                          id="machineDivision"
                          name="machineDivision"
                          value={formData.machineDivision}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              machineDivision: e.target.value,
                              machineDepartment: "",
                              machineName: "",
                              partArea: "",
                              partName: [],
                              machinePartId: null,
                            }));
                          }}
                          required
                          className="w-full rounded-md border border-purple-200 p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">Select Division</option>
                          {maintenanceDivisions.map((div, idx) => (
                            <option key={idx} value={div}>{div}</option>
                          ))}
                        </select>
                      </div>

                      {/* Department Selection */}
                      <div className="space-y-1">
                        <label htmlFor="machineDepartment" className="block text-xs font-medium text-purple-600 font-semibold">
                          Machine Department
                        </label>
                        <select
                          id="machineDepartment"
                          name="machineDepartment"
                          value={formData.machineDepartment}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              machineDepartment: e.target.value,
                              machineName: "",
                              partArea: "",
                              partName: [],
                              machinePartId: null,
                            }));
                          }}
                          disabled={!formData.machineDivision}
                          required
                          className="w-full rounded-md border border-purple-200 p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Department</option>
                          {maintenanceDepartments.map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Machine Name Selection */}
                      <div className="space-y-1">
                        <label htmlFor="machineName" className="block text-xs font-medium text-purple-600 font-semibold">
                          Machine Name
                        </label>
                        <select
                          id="machineName"
                          name="machineName"
                          value={formData.machineName}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              machineName: e.target.value,
                              partArea: "",
                              partName: [],
                              machinePartId: null,
                            }));
                          }}
                          disabled={!formData.machineDepartment}
                          required
                          className="w-full rounded-md border border-purple-200 p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Machine</option>
                          {maintenanceNames.map((name, idx) => (
                            <option key={idx} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Machine Area Selection */}
                      <div className="space-y-1">
                        <label htmlFor="partArea" className="block text-xs font-medium text-purple-600 font-semibold">
                          Machine Area
                        </label>
                        <select
                          id="partArea"
                          name="partArea"
                          value={formData.partArea}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              partArea: e.target.value,
                              partName: [],
                              machinePartId: null,
                            }));
                          }}
                          disabled={!formData.machineName}
                          required
                          className="w-full rounded-md border border-purple-200 p-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Area</option>
                          {maintenanceAreas.map((area, idx) => (
                            <option key={idx} value={area}>{area}</option>
                          ))}
                        </select>
                      </div>

                      {/* Machine Part Selection */}
                      <div className="space-y-1 md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-purple-600 font-semibold">
                            Machine Part (Select Multiple)
                          </label>
                          {maintenancePartsOptions.length > 0 && (
                            <label className="flex items-center gap-2 px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded-md cursor-pointer transition-colors border border-purple-100 group">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                checked={maintenancePartsOptions.length > 0 && formData.partName.length === maintenancePartsOptions.length}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setFormData(prev => ({
                                    ...prev,
                                    partName: isChecked ? maintenancePartsOptions.map(p => p.name) : [],
                                    machinePartId: isChecked ? maintenancePartsOptions[maintenancePartsOptions.length - 1]?.id : null
                                  }));
                                }}
                              />
                              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-tight group-hover:text-purple-800">Select All</span>
                            </label>
                          )}
                        </div>
                        {!formData.partArea ? (
                          <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-md">
                            Select Machine Area first to see available parts
                          </div>
                        ) : maintenancePartsOptions.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-md">
                            No parts found for this machine area
                          </div>
                        ) : (
                          <div className="border border-purple-100 rounded-md bg-white p-3 max-h-48 overflow-y-auto shadow-inner">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                              {maintenancePartsOptions.map((p, idx) => {
                                const isChecked = formData.partName.includes(p.name);
                                return (
                                  <label 
                                    key={idx} 
                                    className={`flex items-center space-x-2 p-2 rounded-md transition-colors cursor-pointer border ${
                                      isChecked 
                                        ? "bg-purple-50 border-purple-200 text-purple-700" 
                                        : "bg-white border-transparent hover:bg-gray-50 text-gray-600"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                                      checked={isChecked}
                                      onChange={() => {
                                        setFormData(prev => {
                                          const newPartNames = isChecked
                                            ? prev.partName.filter(name => name !== p.name)
                                            : [...prev.partName, p.name];
                                          
                                          // Update machinePartId to the most recently added part's ID, or null if list is empty
                                          const lastPartName = newPartNames[newPartNames.length - 1];
                                          const match = maintenancePartsOptions.find(part => part.name === lastPartName);
                                          
                                          return {
                                            ...prev,
                                            partName: newPartNames,
                                            machinePartId: match?.id || null,
                                          };
                                        });
                                      }}
                                    />
                                    <span className="text-xs font-semibold truncate" title={p.name}>
                                      {p.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {formData.partName.length > 0 && (
                          <div className="mt-2 text-xs text-purple-600 font-bold">
                            {formData.partName.length} part(s) selected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Date, Time and Frequency */}
                <div className={`grid gap-3 ${taskType === 'delegation' || taskType === 'maintenance' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                  {/* Task Start Date Picker (Delegation only) */}
                  {taskType === 'delegation' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-purple-700">
                        Task Start Date
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowStartCalendar(!showStartCalendar)}
                          className="w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                          {startDate ? getFormattedDate(startDate) : "Select a date"}
                        </button>
                        {showStartCalendar && (
                          <div className="absolute z-10 mt-1">
                            <CalendarComponent
                              date={startDate}
                              onChange={setStartDate}
                              onClose={() => setShowStartCalendar(false)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task End Date Picker */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">
                      Task End Date
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full flex justify-start items-center rounded-md border border-purple-200 p-2 text-left focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                        {date ? getFormattedDate(date) : "Select a date"}
                      </button>
                      {showCalendar && (
                        <div className="absolute z-10 mt-1">
                          <CalendarComponent
                            date={date}
                            onChange={setSelectedDate}
                            onClose={() => setShowCalendar(false)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* NEW: Time Picker */}
                  <div className="space-y-2">
                    <label
                      htmlFor="time"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        id="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 pl-8"
                      />
                      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-purple-500" />
                    </div>
                  </div>

                  {/* NEW: Duration Field (Maintenance only) placed next to Time */}
                  {taskType === 'maintenance' && (
                    <div className="space-y-2">
                      <label htmlFor="duration" className="block text-sm font-medium text-purple-700">
                        Duration
                      </label>
                      <input
                        type="text"
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        placeholder="e.g. 2 hours"
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label
                      htmlFor="frequency"
                      className="block text-sm font-medium text-purple-700"
                    >
                      Frequency
                    </label>
                    {taskType === 'delegation' ? (
                      <div className="w-full rounded-md border border-purple-200 p-2 bg-gray-50 text-gray-700">
                        One Time (No Recurrence)
                      </div>
                    ) : (
                      <select
                        id="frequency"
                        name="frequency"
                        value={formData.frequency}
                        onChange={handleChange}
                        className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {frequencies
                          .filter(f => taskType === 'maintenance' ? true : f.value !== 'one-time')
                          .map((freq) => (
                            <option key={freq.value} value={freq.value}>
                              {freq.label}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* NEW: DateTime Display */}
                {date && time && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                    <p className="text-sm text-purple-700">
                      <strong>Selected Date & Time:</strong> {getFormattedDateTime()}
                    </p>
                  </div>
                )}

                {/* Additional Options */}
                <div className="space-y-2 pt-2 border-t border-purple-100">
                  <h3 className="text-sm font-medium text-purple-700">
                    Additional Options
                  </h3>

                  <div className="flex items-center justify-between">
                    <div>
                      <label
                        htmlFor="enable-reminders"
                        className="text-sm text-purple-700 font-medium"
                      >
                        Enable Reminders
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BellRing className="h-4 w-4 text-purple-500" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="enable-reminders"
                          checked={formData.enableReminders}
                          onChange={(e) =>
                            handleSwitchChange("enableReminders", e)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-16 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label
                        htmlFor="require-attachment"
                        className="text-sm text-purple-700 font-medium"
                      >
                        Require Attachment
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileCheck className="h-4 w-4 text-purple-500" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="require-attachment"
                          checked={formData.requireAttachment}
                          onChange={(e) =>
                            handleSwitchChange("requireAttachment", e)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-16 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Preview and Submit Buttons */}
                {/* <div className="space-y-2">
                  <button
                    type="button"
                    onClick={generateTasks}
                    className="w-full rounded-md border border-purple-200 bg-purple-50 py-2 px-4 text-purple-700 hover:bg-purple-100 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Preview Generated Tasks
                  </button>

                  {generatedTasks.length > 0 && (
                    <div className="w-full">
                      <div className="border border-purple-200 rounded-md">
                        <button
                          type="button"
                          onClick={() => setAccordionOpen(!accordionOpen)}
                          className="w-full flex justify-between items-center p-4 text-purple-700 hover:bg-purple-50 focus:outline-none"
                        >
                          <span className="font-medium">
                            {generatedTasks.length} Tasks Generated
                            {taskType === 'maintenance'
                              ? " (Will be stored in Maintenance sheet)"
                              : taskType === 'delegation' || formData.frequency === "one-time"
                              ? " (Will be stored in DELEGATION sheet)"
                              : " (Will be stored in Checklist sheet)"
                            }
                          </span>
                          <svg
                            className={`w-5 h-5 transition-transform ${accordionOpen ? "rotate-180" : ""
                              }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {accordionOpen && (
                          <div className="p-3 border-t border-purple-200">
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {generatedTasks.slice(0, 20).map((task, index) => (
                                <div
                                  key={index}
                                  className="text-sm p-2 border rounded-md border-purple-200 bg-purple-50"
                                >
                                  <div className="font-medium text-purple-700">
                                    {task.description}
                                  </div>
                                  <div className="text-xs text-purple-600">
                                    Due: {formatDateForDisplay(task.dueDate)} | Department: {task.department}
                                  </div>
                                  <div className="flex space-x-2 mt-1">
                                    {task.enableReminders && (
                                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                        <BellRing className="h-3 w-3 mr-1" />{" "}
                                        Reminders
                                      </span>
                                    )}
                                    {task.requireAttachment && (
                                      <span className="inline-flex items-center text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                        <FileCheck className="h-3 w-3 mr-1" />{" "}
                                        Attachment Required
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {generatedTasks.length > 20 && (
                                <div className="text-sm text-center text-purple-600 py-2">
                                  ...and {generatedTasks.length - 20} more tasks
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div> */}
              </div>

              <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      unit: userUnit,
                      division: userDivision,
                      department: userDepartment,
                      givenBy: "",
                      doer: username || "",
                      description: "",
                      frequency: "daily",
                      enableReminders: true,
                      requireAttachment: false,
                      machineName: "",
                      partName: [],
                      partArea: "",
                      duration: "",
                      machinePartId: null,
                    });
                    setSelectedDate(null);
                    setStartDate(new Date());
                    setTime(getCurrentTime());
                    setGeneratedTasks([]);
                    setAccordionOpen(false);
                    setTaskType(null);
                  }}
                  className="rounded-md border border-purple-200 py-2 px-4 text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                {hasModifyAccess('assign_task') && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md gradient-bg py-2 px-4 text-white hover:gradient-bg:hover focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Assigning..." : "Assign Task"}
                </button>
              )}
              </div>
            </form>
          </div>
        )}
      </div>
      
      {/* CSV Import Modal */}
      {/*<CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          // Optionally refresh data or show success message
          console.log('Import successful!');
        }}
      />*/}
        <Toast 
          isVisible={toast.show} 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ ...toast, show: false })} 
        />
    </AdminLayout>
  );
}