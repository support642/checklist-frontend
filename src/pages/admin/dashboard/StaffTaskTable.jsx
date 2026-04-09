"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Download, FileText, Search, X, User, ExternalLink, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from "lucide-react"
import { fetchStaffTasksDataApi, getStaffTasksCountApi, getTotalUsersCountApi, fetchStaffDetailsApi } from "../../../redux/api/dashboardApi"
import Papa from "papaparse"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import EmployeePerformanceReportModal from "../../../components/modals/EmployeePerformanceReportModal"
import { hasSystemAccess } from "../../../utils/permissionUtils"

export default function StaffTasksTable({
  dashboardType,
  dashboardStaffFilter,
  departmentFilter,
  divisionFilter,
  unitFilter,
  parseTaskStartDate,
  startDate,
  endDate
}) {
  const [staffMembers, setStaffMembers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalStaffCount, setTotalStaffCount] = useState(0)
  const [totalUsersCount, setTotalUsersCount] = useState(0)
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  })
  const [tillDate, setTillDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [monthYearOptions, setMonthYearOptions] = useState([])
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStaffName, setSelectedStaffName] = useState("")
  const [selectedStaffData, setSelectedStaffData] = useState(null)
  const [staffTaskDetails, setStaffTaskDetails] = useState([])
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [isMobile, setIsMobile] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportRange, setReportRange] = useState({
    from: startDate || "",
    to: endDate || new Date().toLocaleDateString('en-CA')
  })
  const [modalRange, setModalRange] = useState({ 
    from: startDate || "", 
    to: endDate || new Date().toLocaleDateString('en-CA') 
  })
  
  // Dashboard Pagination & Search State
  const [dashboardPage, setDashboardPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const dashboardPageSize = 20;

  const dashboardTopRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isFirstMount = useRef(true);

  // Scroll to top when page changes (skip initial mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (dashboardTopRef.current) {
      dashboardTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [dashboardPage]);

  // Reset page when filters change
  useEffect(() => {
    setDashboardPage(1);
  }, [dashboardType, dashboardStaffFilter, departmentFilter, divisionFilter, unitFilter, selectedMonthYear, tillDate, startDate, endDate, debouncedSearch]);

  // Module permission flags
  const hasMaintenanceAccess = hasSystemAccess('maintenance');

  // Sync local month and till-date filters with parent date range filters
  useEffect(() => {
    if (startDate && endDate) {
      // If a parent date range is selected, update sub-filters to match
      const [year, month] = startDate.split('-').slice(0, 2);
      setSelectedMonthYear(`${year}-${month}`);
      setTillDate(endDate);
    } else if (startDate === "" && endDate === "") {
      // If parent range is explicitly cleared (Reset), revert to defaults
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setSelectedMonthYear(`${year}-${month}`);
      setTillDate(new Date().toLocaleDateString('en-CA'));
    }
  }, [startDate, endDate]);

  // Sync report range with props
  useEffect(() => {
    if (startDate || endDate) {
      setReportRange({
        from: startDate || "",
        to: endDate || new Date().toLocaleDateString('en-CA')
      });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate month-year options (last 12 months + current month)
  const generateMonthYearOptions = useCallback(() => {
    const options = []
    const today = new Date()
    const currentMonth = today.getMonth() // 0-11
    const currentYear = today.getFullYear()
    
    // Add current month as default
    const currentMonthYear = `${today.toLocaleString('default', { month: 'long' })} ${currentYear}`
    
    // Generate options for last 12 months (including current)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1)
      const monthName = date.toLocaleString('default', { month: 'long' })
      const year = date.getFullYear()
      const monthYear = `${monthName} ${year}`
      
      options.push({
        value: `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        label: monthYear,
        isCurrent: i === 0 // Current month
      })
    }
    
    setMonthYearOptions(options)
    
    // Set default selection to current month
    if (options.length > 0 && !selectedMonthYear) {
      const currentOption = options.find(opt => opt.isCurrent)
      if (currentOption) {
        setSelectedMonthYear(currentOption.value)
      }
    }
  }, [selectedMonthYear])

  useEffect(() => {
    generateMonthYearOptions()
  }, [generateMonthYearOptions])

  // Reset when filters change
  useEffect(() => {
    setStaffMembers([])
    setTotalStaffCount(0)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonthYear, tillDate, startDate, endDate])

  const handleOpenModal = useCallback(async (staffOrName, customFrom = null, customTo = null) => {
    const staffName = typeof staffOrName === 'string' ? staffOrName : staffOrName.name;
    const staffData = typeof staffOrName === 'string' ? null : staffOrName;

    setSelectedStaffName(staffName);
    if (staffData) {
      setSelectedStaffData(staffData);
    } else {
      // If we only have a name (e.g. from refresh), try to find it in current list
      const found = staffMembers.find(s => s.name === staffName);
      if (found) setSelectedStaffData(found);
    }

    setIsModalOpen(true);
    setIsModalLoading(true);
    setStaffTaskDetails([]);
    
    // Use dashboard defaults unless custom dates are provided
    const fromDate = customFrom || startDate;
    const toDate = customTo || endDate;
    
    // Update local modal range state for tracking
    setModalRange({ from: fromDate, to: toDate });

    try {
      // Fetch Checklist, Delegation, and conditionally Maintenance tasks for the report
      const fetchPromises = [
        fetchStaffDetailsApi('checklist', staffName, selectedMonthYear, tillDate, fromDate, toDate),
        fetchStaffDetailsApi('delegation', staffName, selectedMonthYear, tillDate, fromDate, toDate),
      ];
      if (hasMaintenanceAccess) {
        fetchPromises.push(fetchStaffDetailsApi('maintenance', staffName, selectedMonthYear, tillDate, fromDate, toDate));
      }
      const [checklistDetails, delegationDetails, maintenanceDetails] = await Promise.all(fetchPromises);

      // Safety check: Ensure responses are arrays before mapping
      const combined = [
        ...(Array.isArray(checklistDetails) ? checklistDetails : []).map(t => ({ ...t, type: 'checklist' })),
        ...(Array.isArray(delegationDetails) ? delegationDetails : []).map(t => ({ ...t, type: 'delegation' })),
        ...(hasMaintenanceAccess && Array.isArray(maintenanceDetails) ? maintenanceDetails : []).map(t => ({ ...t, type: 'maintenance' }))
      ];

      setStaffTaskDetails(combined);
    } catch (error) {
      console.error("Error fetching staff details:", error);
      setStaffTaskDetails([]);
    } finally {
      setIsModalLoading(false);
    }
  }, [dashboardType, selectedMonthYear, tillDate, startDate, endDate, hasMaintenanceAccess, staffMembers]);
  
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

  const handleDownloadCSV = (customFrom = null, customTo = null, customStaffInfo = null) => {
    if (!staffTaskDetails.length) return;
    
    const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
    
    // Determine the reporting range
    const queryFrom = (typeof customFrom === 'string') ? customFrom : (modalRange.from || startDate || defaultStart);
    const queryTo = (typeof customTo === 'string') ? customTo : (modalRange.to || endDate || new Date().toLocaleDateString('en-CA'));

    const fromDateVal = queryFrom;
    const toDateVal = queryTo;
    
    // Categorize and Process Data (Matches UI Modal Logic)
    const checklistTasks = getUniqueTasksCSV(staffTaskDetails.filter(t => t.type === 'checklist'))
      .map(t => ({ taskType: 'Checklist', description: t.task_description, frequency: t.frequency || 'N/A' }));

    const delegationTasks = staffTaskDetails.filter(t => t.type === 'delegation' || t.is_delegated)
      .map(t => ({ taskType: 'Delegation', description: t.task_description, frequency: 'Delegated' }));
    // No unique filter for delegation as they are usually distinct occurrences, but let's be consistent if needed.
    // Actually, getUniqueTasksCSV is good for de-duplicating by description+frequency.
    const uniqueDelegation = getUniqueTasksCSV(staffTaskDetails.filter(t => t.type === 'delegation' || t.is_delegated))
      .map(t => ({ taskType: 'Delegation', description: t.task_description, frequency: 'One Time' }));

    const maintenanceTasks = hasMaintenanceAccess 
      ? getUniqueTasksCSV(staffTaskDetails.filter(t => t.type === 'maintenance'))
          .map(t => ({ taskType: 'Maintenance', description: t.task_description, frequency: t.frequency || 'N/A' }))
      : [];

    const allSortedTasks = [...checklistTasks, ...uniqueDelegation, ...maintenanceTasks];

    // Stats Calculation
    const calculateStats = (taskList) => {
      const total = taskList.length;
      const completed = taskList.filter(t => t.is_completed || t.status?.toLowerCase() === 'yes' || t.status === 'Done').length;
      const onTime = taskList.filter(t => t.is_on_time || t.color_code_for === '1' || t.color_code_for === 1).length;
      const workDoneScore = total > 0 ? Math.round((completed / total) * 100) : 0;
      const onTimeScore = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
      return { total, completed, score: workDoneScore, onTime: onTimeScore };
    };

    const checklistStats = calculateStats(staffTaskDetails.filter(t => t.type === 'checklist'));
    const delegationStats = calculateStats(staffTaskDetails.filter(t => t.type === 'delegation' || t.is_delegated));
    const maintenanceStats = calculateStats(staffTaskDetails.filter(t => t.type === 'maintenance'));

    const staffInfo = staffMembers.find(s => s.name === selectedStaffName) || {};

    // Build CSV Content as 2D array
    const csvData = [];
    
    // Header
    csvData.push(["RAMA UDYOG PVT LTD."]);
    csvData.push(["EMPLOYEE PERFORMANCE REPORT"]);
    csvData.push([]);

    // Profile Info
    csvData.push(["Name", selectedStaffName, "Emp ID", staffInfo.employee_id || "—", "Designation", staffInfo.designation || "—"]);
    csvData.push(["Division", staffInfo.division || "Admin", "Department", staffInfo.department || "HR"]);
    csvData.push(["From", formatDateForDisplay(fromDateVal), "To", formatDateForDisplay(toDateVal)]);
    csvData.push([]);

    // Performance Summary
    csvData.push(["PERFORMANCE SUMMARY"]);
    csvData.push(["Category", "Assigned", "Completed", "Score (%)", "On-Time (%)"]);
    csvData.push(["Checklist", checklistStats.total, checklistStats.completed, checklistStats.score, checklistStats.onTime]);
    csvData.push(["Delegation", delegationStats.total, delegationStats.completed, delegationStats.score, delegationStats.onTime]);
    if (hasMaintenanceAccess) {
      csvData.push(["Maintenance", maintenanceStats.total, maintenanceStats.completed, maintenanceStats.score, maintenanceStats.onTime]);
    }
    csvData.push([]);

    // Task Table Header
    const tableHeader = ["Sno.", "Task Type", "Task Description", "Frequency"];
    csvData.push(tableHeader);

    // Task Rows
    allSortedTasks.forEach((task, idx) => {
      csvData.push([
        idx + 1,
        task.taskType,
        task.description || "N/A",
        task.frequency
      ]);
    });

    csvData.push([]);

    // Generate CSV
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedStaffName}_Performance_Report_${new Date().toLocaleDateString('en-CA')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async (customFrom = null, customTo = null, customStaffInfo = null) => {
    if (!staffTaskDetails.length) return;
    
    // Determine the reporting range - matching modal priority logic
    const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA');
    
    // Ensure we don't accidentally treat event objects as date strings
    const pdfFromDate = formatDateForDisplay((typeof customFrom === 'string') ? customFrom : (modalRange.from || startDate || defaultStart));
    const pdfToDate = formatDateForDisplay((typeof customTo === 'string') ? customTo : (modalRange.to || endDate || new Date().toLocaleDateString('en-CA')));

    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4: 210mm x 297mm
    const pageW = 210;
    const marginX = 10;
    const usableW = pageW - 2 * marginX; // 190mm
    const centerX = pageW / 2; // 105mm
    
    // Helper to get unique tasks by description + frequency (matches modal logic)
    const getUniqueTasksPDF = (taskList) => {
      const seen = new Set();
      return taskList.filter(t => {
        const key = `${t.task_description}-${t.frequency || ''}`;
        if (!t.task_description || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    // Categorize and Process Data (Matches UI Modal Logic)
    const freqOrderPDF = { 'DAILY': 1, 'WEEKLY': 2, 'MONTHLY': 3, 'ONE TIME': 4, 'N/A': 5 };
    const sortByFreqPDF = (a, b) => {
      const orderA = freqOrderPDF[(a.frequency || '').toUpperCase()] || 99;
      const orderB = freqOrderPDF[(b.frequency || '').toUpperCase()] || 99;
      return orderA - orderB;
    };
    const checklistTasks = getUniqueTasksPDF(staffTaskDetails.filter(t => t.type === 'checklist'))
      .map(t => ({ taskType: 'Checklist', description: t.task_description, frequency: t.frequency || 'N/A' }))
      .sort(sortByFreqPDF);

    const delegationTasks = getUniqueTasksPDF(staffTaskDetails.filter(t => t.type === 'delegation' || t.is_delegated))
      .map(t => ({ taskType: 'Delegation', description: t.task_description, frequency: 'One Time' }))
      .sort(sortByFreqPDF);

    const maintenanceTasks = hasMaintenanceAccess 
      ? getUniqueTasksPDF(staffTaskDetails.filter(t => t.type === 'maintenance'))
          .map(t => ({ taskType: 'Maintenance', description: t.task_description, frequency: t.frequency || 'N/A' }))
          .sort(sortByFreqPDF)
      : [];

    const allSortedTasks = [...checklistTasks, ...delegationTasks, ...maintenanceTasks];

    const calculateStats = (taskList) => {
      const total = taskList.length;
      const completed = taskList.filter(t => t.is_completed || t.status?.toLowerCase() === 'yes' || t.status === 'Done').length;
      const onTime = taskList.filter(t => t.is_on_time || t.color_code_for === '1' || t.color_code_for === 1).length;
      const workDoneScore = total > 0 ? Math.round((completed / total) * 100) : 0;
      const onTimeScore = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
      return { total, completed, onTime, workDoneScore, onTimeScore };
    };

    const checklistTasksAll = staffTaskDetails.filter(t => t.type === 'checklist');
    const delegationTasksAll = staffTaskDetails.filter(t => t.type === 'delegation' || t.is_delegated);
    const maintenanceTasksAll = hasMaintenanceAccess 
      ? staffTaskDetails.filter(t => t.type === 'maintenance')
      : [];

    const checklistStats = calculateStats(checklistTasksAll);
    const delegationStats = calculateStats(delegationTasksAll);
    const maintenanceStats = calculateStats(maintenanceTasksAll);

    const staffInfo = staffMembers.find(s => s.name === selectedStaffName) || {};

    // Use local PDF dates for the header

    // 1. Header Section (scaled for portrait A4 - 190mm usable width)
    const logoW = 25;
    const logoH = 20;
    const bannerW = usableW - 2 * logoW; // 140mm
    
    // Yellow Banner
    doc.setFillColor(255, 255, 0); 
    doc.rect(marginX + logoW, 10, bannerW, logoH, 'F');
    // Left & Right Borders for logos
    doc.setDrawColor(200);
    doc.rect(marginX, 10, logoW, logoH);
    doc.rect(marginX + logoW + bannerW, 10, logoW, logoH);
    
    // Try to add Logos if available
    try {
      doc.addImage("/Rama_logo_pdf.png", "PNG", marginX + 2, 12, 21, 16);
      doc.addImage("/Rama_logo_pdf.png", "PNG", marginX + logoW + bannerW + 2, 12, 21, 16);
    } catch(e) {
      console.warn("Logos could not be loaded into PDF", e);
    }

    // Header Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text("Rama Udyog pvt ltd.", centerX, 23, { align: "center" });

    // 2. Sub-header (Blue Banner)
    const subHeaderY = 30;
    doc.setFillColor(217, 234, 247);
    doc.rect(marginX, subHeaderY, usableW, 8, 'F');
    doc.rect(marginX, subHeaderY, usableW, 8);
    doc.setFontSize(11);
    doc.text("EMPLOYEE PERFORMANCE REPORT", centerX, subHeaderY + 5.5, { align: "center" });

    // 3. Employee Info Grid (New 2-Row Layout)
    const startY = 38;
    const row1H = 12;
    const row2H = 20;
    const rightColW = 45; 
    const mainColW = usableW - rightColW;

    // Helper: Draw a detail block (Label top, Value bottom)
    const drawDetailBlock = (x, y, w, h, label, value) => {
      doc.setFillColor(248, 249, 250);
      doc.rect(x, y, w, h / 3, 'F');
      doc.setDrawColor(200);
      doc.rect(x, y, w, h);
      doc.line(x, y + h / 3, x + w, y + h / 3);
      
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120);
      doc.text(label.toUpperCase(), x + w / 2, y + 2.8, { align: "center" });
      
      doc.setTextColor(0);
      const valStr = String(value || "—");
      const baseFontSize = 8.5;
      const minFontSize = 6;
      let fontSize = valStr.length > 20 ? 7 : baseFontSize;
      doc.setFontSize(fontSize);
      
      let lines = doc.splitTextToSize(valStr, w - 2);
      // If still too many lines, try minor font reduction
      if (lines.length > 2 && fontSize > minFontSize) {
        fontSize = minFontSize;
        doc.setFontSize(fontSize);
        lines = doc.splitTextToSize(valStr, w - 2);
      }

      const lineStep = fontSize * 0.3528 * 1.1; // roughly 1.1x font size in mm
      const totalTextH = lines.length * lineStep;
      const startTextY = (y + h / 3) + (2 * h / 3 - totalTextH) / 2 + (lineStep * 0.8);
      
      lines.forEach((line, i) => {
        doc.text(line, x + w / 2, startTextY + (i * lineStep), { align: "center" });
      });
    };

    // Helper: Draw a Stat block
    const drawStatBlock = (x, y, w, h, title, stats) => {
      doc.setFillColor(245, 245, 245);
      doc.rect(x, y, w, 6, 'F');
      doc.setDrawColor(200);
      doc.rect(x, y, w, h);
      doc.line(x, y + 6, x + w, y + 6);
      doc.line(x + w / 2, y + 6, x + w / 2, y + h);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text(title.toUpperCase(), x + w / 2, y + 4, { align: "center" });

      doc.setTextColor(120);
      doc.setFontSize(5.5);
      doc.text("ASSIGNED / DONE", x + w / 4, y + 10, { align: "center" });
      doc.text("SCORE / ON-TIME", x + 3 * w / 4, y + 10, { align: "center" });

      doc.setTextColor(0);
      doc.setFontSize(9);
      doc.text(`${stats.total} / ${stats.completed}`, x + w / 4, y + 16, { align: "center" });
      doc.text(`${stats.workDoneScore}% | ${stats.onTimeScore}%`, x + 3 * w / 4, y + 16, { align: "center" });
    };

    // --- ROW 1: Employee Details (Full Width - Redistributed) ---
    const nameW = 55;
    const desgW = 45;
    const deptW = 35;
    const divW = 30;
    const idW = 25;
    
    drawDetailBlock(marginX, startY, nameW, row1H, "Name", selectedStaffName);
    drawDetailBlock(marginX + nameW, startY, desgW, row1H, "Designation", staffInfo.designation);
    drawDetailBlock(marginX + nameW + desgW, startY, deptW, row1H, "Department", staffInfo.department || "Account");
    drawDetailBlock(marginX + nameW + desgW + deptW, startY, divW, row1H, "Division", staffInfo.division || "Admin");
    drawDetailBlock(marginX + nameW + desgW + deptW + divW, startY, idW, row1H, "Emp ID", staffInfo.employee_id);

    // --- ROW 2: Performance Stats & Range (Split) ---
    const statW = mainColW / (hasMaintenanceAccess ? 3 : 2);
    drawStatBlock(marginX, startY + row1H, statW, row2H, "Checklist", checklistStats);
    drawStatBlock(marginX + statW, startY + row1H, statW, row2H, "Delegation", delegationStats);
    if (hasMaintenanceAccess) {
      drawStatBlock(marginX + 2 * statW, startY + row1H, statW, row2H, "Maintenance", maintenanceStats);
    }

    // From / To (Right)
    const dateY = startY + row1H;
    const labelW_Date = 12;
    doc.setDrawColor(200);
    doc.rect(marginX + mainColW, dateY, rightColW, row2H);
    doc.line(marginX + mainColW, dateY + row2H/2, marginX + mainColW + rightColW, dateY + row2H/2);
    doc.line(marginX + mainColW + labelW_Date, dateY, marginX + mainColW + labelW_Date, dateY + row2H);
    
    doc.setFontSize(6); doc.setTextColor(120);
    doc.text("FROM", marginX + mainColW + labelW_Date / 2, dateY + row2H / 4 + 1, { align: "center" });
    doc.text("TO", marginX + mainColW + labelW_Date / 2, dateY + 3 * row2H / 4 + 1, { align: "center" });
    
    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(pdfFromDate, marginX + mainColW + labelW_Date + (rightColW - labelW_Date) / 2, dateY + row2H / 4 + 1.5, { align: "center" });
    doc.text(pdfToDate, marginX + mainColW + labelW_Date + (rightColW - labelW_Date) / 2, dateY + 3 * row2H / 4 + 1.5, { align: "center" });

    // 4. Categorized Table (sized for portrait A4)
    const tableHeader = ["Sno.", "Task Type", "Task Description", "Frequency"];
    const tableBody = [];
    allSortedTasks.forEach((task, idx) => {
      // Frequency Separator Row
      if (idx > 0 && allSortedTasks[idx - 1].frequency !== task.frequency) {
        tableBody.push([{ content: '', colSpan: 4, styles: { minCellHeight: 2, fillColor: [245, 245, 245] } }]);
      }
      tableBody.push([
        idx + 1,
        task.taskType,
        task.description || "N/A",
        task.frequency
      ]);
    });

    // Column widths: distribute evenly across available data columns
    const tableFoot = [allSortedTasks.length, "TOTAL", "", "Tasks"];

    const columnStyles = { 
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
      2: { cellWidth: 'auto' }, 
      3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' } 
    };

    autoTable(doc, {
      head: [tableHeader],
      body: tableBody,
      startY: startY + row1H + row2H + 3,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 8.5, cellPadding: 2, lineWidth: 0.1, lineColor: [200, 200, 200] },
      headStyles: { fillColor: [233, 242, 233], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9 },
      footStyles: { fillColor: [254, 249, 231], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 7 },
      bodyStyles: { textColor: [50, 50, 50], minCellHeight: 7 },
      columnStyles,
    });

    // Footer: "Powered By Botivate" at the bottom of the last page
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 10;
      // Divider line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY - 3, marginX + usableW, footerY - 3);
      // Footer text - measure widths for true centering
      // Footer timestamp: Print Date & Time at bottom right
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(150);
      const timestamp = `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      doc.text(timestamp, marginX + usableW, footerY, { align: "right" });

      // Footer: "Powered By Botivate" centered
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const prefixText = "Powered By  ";
      const brandText = "Botivate";
      const prefixW = doc.getTextWidth(prefixText);
      doc.setFont("helvetica", "bold");
      const brandW = doc.getTextWidth(brandText);
      const totalW = prefixW + brandW;
      const startX = centerX - totalW / 2;
      // Draw prefix
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(prefixText, startX, footerY);
      // Draw brand name
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 58, 237); // Purple-600
      doc.text(brandText, startX + prefixW, footerY);
    }
    
    doc.save(`${selectedStaffName}_Performance_Report_${new Date().toLocaleDateString('en-CA')}.pdf`);
  };

  const getVisiblePages = () => {
    const totalPages = Math.ceil(staffTaskDetails.length / pageSize);
    const visibleCount = isMobile ? 2 : 5;
    
    if (totalPages <= visibleCount) {
      return [...Array(totalPages).keys()].map(i => i + 1);
    }
    
    let start = Math.max(1, currentPage - (isMobile ? 0 : 2));
    let end = start + visibleCount - 1;
    
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - visibleCount + 1);
    }
    
    if (start < 1) {
      start = 1;
      end = Math.min(totalPages, start + visibleCount - 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Hold-to-paginate timer refs
  const holdTimerRef = useRef(null)
  const holdIntervalRef = useRef(null)

  const startAutoPaginate = (direction) => {
    // Stop any existing timers first
    stopAutoPaginate();
    
    holdTimerRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        setCurrentPage(prev => {
          const totalPages = Math.ceil(staffTaskDetails.length / pageSize);
          if (direction === 1) {
            if (prev >= totalPages) {
              stopAutoPaginate();
              return prev;
            }
            return prev + 1;
          } else {
            if (prev <= 1) {
              stopAutoPaginate();
              return prev;
            }
            return prev - 1;
          }
        });
      }, 100); // 100ms repeating
    }, 500); // 2s delay as requested
  };

  const stopAutoPaginate = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  };

// Function to load staff data from server
const loadStaffData = useCallback(async () => {
  if (isLoading) return;

  try {
    setIsLoading(true)

    // Fetch paginated staff data
    const data = await fetchStaffTasksDataApi(
      dashboardType,
      dashboardStaffFilter,
      dashboardPage,
      dashboardPageSize,
      selectedMonthYear,
      tillDate,
      startDate,
      endDate,
      debouncedSearch,
      departmentFilter,
      divisionFilter,
      unitFilter
    )

    // Get total counts respecting search and dates
    const [staffCount, usersCount] = await Promise.all([
      getStaffTasksCountApi(
        dashboardType, 
        dashboardStaffFilter, 
        debouncedSearch,
        selectedMonthYear,
        tillDate,
        startDate,
        endDate,
        departmentFilter,
        divisionFilter,
        unitFilter
      ),
      getTotalUsersCountApi()
    ]);
    setTotalStaffCount(staffCount)
    setTotalUsersCount(usersCount)

    if (!data || data.length === 0) {
      setStaffMembers([])
      return
    }

    setStaffMembers(data)

  } catch (error) {
    console.error('Error loading staff data:', error)
  } finally {
    setIsLoading(false)
  }
}, [dashboardType, dashboardStaffFilter, departmentFilter, divisionFilter, unitFilter, selectedMonthYear, tillDate, startDate, endDate, dashboardPage, debouncedSearch])

  // Initial load when component mounts or dependencies change
  useEffect(() => {
    loadStaffData()
  }, [loadStaffData]) // Added loadStaffData to dependency array


  const renderOnTimeScore = (score) => {
    let bgColor = "bg-red-100"
    let textColor = "text-red-800"
    
    if (score >= 80) {
      bgColor = "bg-green-100"
      textColor = "text-green-800"
    } else if (score >= 20) {
      bgColor = "bg-yellow-100"
      textColor = "text-yellow-800"
    }
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
        {score}%
      </span>
    )
  }

  // Role check for report access
  const userRole = localStorage.getItem("role") || "";
  const canExportReport = ["super_admin", "admin", "div_admin"].includes(userRole.toLowerCase());
  const isSuperAdmin = userRole.toLowerCase() === "super_admin";

  const handleExportCSV = async (customRange = null) => {
    try {
      setIsLoading(true);
      const exportFrom = customRange?.from || reportRange.from || startDate;
      const exportTo = customRange?.to || reportRange.to || endDate || tillDate;

      // Fetch data with a very large limit to get all filtered records for export
      const allData = await fetchStaffTasksDataApi(
        dashboardType,
        dashboardStaffFilter,
        1,
        10000, 
        selectedMonthYear,
        tillDate,
        exportFrom,
        exportTo
      );
      if (!allData || allData.length === 0) {
        alert("No data available to export.");
        return;
      }

      // Define CSV headers
      const headers = ["SEQ NO.", "NAME", "DIVISION", "DEPARTMENT", "TOTAL TASKS", "COMPLETED", "PENDING", "OVERDUE", "DONE ON TIME", "WORK DONE SCORE"];
      
      // Map data to rows
      const rows = allData.map((staff, index) => {
        const score = staff.completedTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0;
        return [
          index + 1,
          staff.name,
          staff.division || "N/A",
          staff.department || "N/A",
          staff.totalTasks,
          staff.completedTasks,
          staff.pendingTasks,
          staff.overdueTasks || 0,
          staff.doneOnTime || 0,
          `${score}%`
        ];
      });

      // Assemble CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(value => `"${value}"`).join(","))
      ].join("\n");

      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
      link.setAttribute("download", `Work_Done_Report_${dashboardType}_${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export report.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (customRange = null) => {
    try {
      setIsLoading(true);
      const exportFrom = customRange?.from || reportRange.from || startDate;
      const exportTo = customRange?.to || reportRange.to || endDate || tillDate;

      // Fetch data with a very large limit to get all filtered records for export
      const allData = await fetchStaffTasksDataApi(
        dashboardType,
        dashboardStaffFilter,
        1,
        10000, 
        selectedMonthYear,
        tillDate,
        exportFrom,
        exportTo
      );
      if (!allData || allData.length === 0) {
        alert("No data available to export.");
        return;
      }

      const doc = new jsPDF('l', 'mm', 'a4'); 
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235); // Blue-600
      doc.text(`Work Done Summary Report - ${dashboardType.toUpperCase()}`, 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${selectedMonthYear || 'All Months'} (Till: ${formatDateForDisplay(tillDate) || 'N/A'})`, 14, 22);
      doc.text(`${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString()}`, 14, 27);
      
      // Define table headers
      const tableColumn = ["Seq", "Name", "Division", "Department", "Total", "Done", "Pending", "Overdue", "On Time", "Score"];
      
      // Map data to rows
      const tableRows = allData.map((staff, index) => {
        const score = staff.completedTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0;
        return [
          index + 1,
          staff.name,
          staff.division || "N/A",
          staff.department || "N/A",
          staff.totalTasks,
          staff.completedTasks,
          staff.pendingTasks,
          staff.overdueTasks || 0,
          staff.doneOnTime || 0,
          `${score}%`
        ];
      });

      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 249, 255] },
        margin: { top: 35 }
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
        // Footer text - measure widths for true centering
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const prefixText = "Powered By  ";
        const brandText = "Botivate";
        const prefixW = doc.getTextWidth(prefixText);
        doc.setFont("helvetica", "bold");
        const brandW = doc.getTextWidth(brandText);
        const totalW = prefixW + brandW;
        const startX = pageW / 2 - totalW / 2;
        // Draw prefix
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(prefixText, startX, footerY);
        // Draw brand name
        doc.setFont("helvetica", "bold");
        doc.setTextColor(124, 58, 237); // Purple-600
        doc.text(brandText, startX + prefixW, footerY);
      }
      
      const filenameDate = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
      doc.save(`Work_Done_Report_${dashboardType}_${filenameDate}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={dashboardTopRef} className="space-y-4">
      {/* Show total count and active filters */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
        <div className="flex flex-col space-y-4 w-full md:w-auto">
          {/* Filters Group */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4">
            {/* Month-Year Dropdown */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label htmlFor="monthYearFilter" className="text-sm font-medium text-gray-700 min-w-[50px]">Month:</label>
              <select
                id="monthYearFilter"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Months</option>
                {monthYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.isCurrent && "(Current)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Till Date Filter */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label htmlFor="tillDateFilter" className="text-sm font-medium text-gray-700 min-w-[50px]">Till:</label>
              <input
                type="date"
                id="tillDateFilter"
                value={tillDate}
                onChange={(e) => setTillDate(e.target.value)}
                className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Name Search Box */}
            <div className="relative group w-full sm:min-w-[200px] sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm placeholder-gray-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          {totalStaffCount > 0 && (
            <div className="text-xs text-gray-500 font-medium">
              Total staff found: {totalStaffCount} | Showing {staffMembers.length} on this page
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          {canExportReport && (
            <div className="relative">
              <button
                disabled={isLoading}
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
              >
                <Download size={18} />
                Work done report
              </button>
            </div>
          )}

          {/* Show active filters */}
          <div className="flex flex-wrap gap-2 justify-end">
            {dashboardStaffFilter !== "all" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                Staff: {dashboardStaffFilter}
              </span>
            )}
            {departmentFilter !== "all" && dashboardType === "checklist" && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                Dept Filter: {departmentFilter}
              </span>
            )}
            {selectedMonthYear && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                Month: {monthYearOptions.find(opt => opt.value === selectedMonthYear)?.label || selectedMonthYear}
              </span>
            )}
            {tillDate && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                Till: {formatDateForDisplay(tillDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      {staffMembers.length === 0 && !isLoading ? (
        <div className="text-center p-8 text-gray-500">
          <p>No staff data found for the selected filters.</p>
          {selectedMonthYear && (
            <p className="text-sm mt-2">Try selecting "All Months" to see more results.</p>
          )}
          {dashboardStaffFilter !== "all" && (
            <p className="text-sm mt-2">Try selecting "All Staff Members" to see more results.</p>
          )}
        </div>
      ) : (
        <div
          className="staff-table-container rounded-md border border-gray-200 overflow-auto"
          style={{ maxHeight: "400px" }}
        >
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seq No.
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Division
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tasks
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overdue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Done on Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Done Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffMembers.map((staff, index) => (
                <tr key={`${staff.name}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className={`${isSuperAdmin ? 'cursor-pointer group' : ''} flex items-center gap-2`}
                      onClick={() => isSuperAdmin && handleOpenModal(staff)}
                    >
                      <div className={`p-1.5 rounded-full ${isSuperAdmin ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors' : 'bg-gray-100 text-gray-400'}`}>
                        <User size={14} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium transition-colors ${isSuperAdmin ? 'text-gray-900 group-hover:text-purple-700 border-b border-transparent group-hover:border-purple-200' : 'text-gray-500'}`}>
                          {staff.name}
                        </div>
                        {staff.email && !staff.email.includes('example.com') && (
                          <div className="text-xs text-gray-500">{staff.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.division || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.department || "N/A"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.totalTasks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.completedTasks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.pendingTasks}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">{staff.overdueTasks || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {staff.doneOnTime || 0}
                    {staff.completedTasks > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({Math.round((staff.doneOnTime / staff.completedTasks) * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderOnTimeScore(staff.completedTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-3">
            {staffMembers.map((staff, index) => (
              <div key={`mobile-${staff.name}-${index}`} className="p-3 border rounded-lg shadow-sm bg-white border-gray-200">
                <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                   </div>
                   <div>
                     {renderOnTimeScore(staff.completedTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0)}
                   </div>
                </div>
                
                <div 
                  className={`text-sm font-medium mb-1 flex items-center gap-1 ${isSuperAdmin ? 'text-gray-800 cursor-pointer hover:text-purple-700' : 'text-gray-500'}`}
                  onClick={() => isSuperAdmin && handleOpenModal(staff)}
                >
                  <User size={12} className={isSuperAdmin ? 'text-purple-600' : 'text-gray-400'} />
                  {staff.name} 
                  <span className="text-[10px] text-gray-500 font-normal ml-1">
                    ({staff.division || "N/A"} - {staff.department || "N/A"})
                  </span>
                  {isSuperAdmin && <ExternalLink size={10} className="text-gray-400 ml-auto" />}
                </div>
                
                {staff.email && !staff.email.includes('example.com') && (
                  <div className="text-[10px] text-gray-500 mb-2 truncate">{staff.email}</div>
                )}

                <div className="flex justify-between text-[10px] text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                   <div className="text-center">
                      <div className="font-semibold text-gray-800">{staff.totalTasks}</div>
                      <div>Total</div>
                   </div>
                   <div className="text-center">
                      <div className="font-semibold text-green-600">{staff.completedTasks}</div>
                      <div>Completed</div>
                   </div>
                   <div className="text-center">
                      <div className="font-semibold text-yellow-600">{staff.pendingTasks}</div>
                      <div>Pending</div>
                   </div>
                   <div className="text-center">
                      <div className="font-semibold text-red-500">{staff.overdueTasks || 0}</div>
                      <div>Overdue</div>
                   </div>
                </div>
                
                <div className="flex justify-between text-[10px] mt-2 px-1">
                   <span className="text-gray-600">Done on Time:</span>
                   <span className="font-medium text-gray-800">
                      {staff.doneOnTime || 0}
                      {staff.completedTasks > 0 && (
                        <span className="text-gray-500 ml-1 whitespace-nowrap">
                          ({Math.round((staff.doneOnTime / staff.completedTasks) * 100)}%)
                        </span>
                      )}
                   </span>
                </div>
              </div>
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 mt-2">Loading staff data...</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setDashboardPage(prev => Math.max(prev - 1, 1))}
            disabled={dashboardPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setDashboardPage(prev => prev + 1)}
            disabled={staffMembers.length < dashboardPageSize || (dashboardPage * dashboardPageSize >= totalStaffCount)}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(dashboardPage - 1) * dashboardPageSize + 1}</span> to <span className="font-medium">{Math.min(dashboardPage * dashboardPageSize, totalStaffCount)}</span> of{' '}
              <span className="font-medium">{totalStaffCount}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setDashboardPage(1)}
                disabled={dashboardPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setDashboardPage(prev => Math.max(prev - 1, 1))}
                disabled={dashboardPage === 1}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              
              {(() => {
                const totalPages = Math.ceil(totalStaffCount / dashboardPageSize);
                let start = Math.max(1, dashboardPage - 2);
                let end = Math.min(totalPages, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);
                if (start < 1) start = 1;
                
                const pages = [];
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map(p => (
                  <button
                    key={p}
                    onClick={() => setDashboardPage(p)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      p === dashboardPage 
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' 
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}

              <button
                onClick={() => setDashboardPage(prev => prev + 1)}
                disabled={dashboardPage >= Math.ceil(totalStaffCount / dashboardPageSize)}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setDashboardPage(Math.ceil(totalStaffCount / dashboardPageSize))}
                disabled={dashboardPage >= Math.ceil(totalStaffCount / dashboardPageSize)}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronsRight size={16} />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Report Date Selection Modal */}
      {isReportModalOpen && createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Generate Report</h3>
                  <p className="text-xs text-gray-500 font-medium">Configure your work done report</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all text-gray-400 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Select the date range for your report calculations.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="reportFrom" className="text-xs font-bold text-gray-500 uppercase">From</label>
                  <input
                    type="date"
                    id="reportFrom"
                    value={reportRange.from}
                    onChange={(e) => setReportRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reportTo" className="text-xs font-bold text-gray-500 uppercase">To</label>
                  <input
                    type="date"
                    id="reportTo"
                    value={reportRange.to}
                    onChange={(e) => setReportRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleExportPDF();
                    setIsReportModalOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <FileText size={18} />
                  Download PDF Report
                </button>
                <button
                  onClick={() => {
                    handleExportCSV();
                    setIsReportModalOpen(false);
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Download size={18} />
                  Download CSV Report
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    // Export with current dashboard filters
                    handleExportPDF({ from: "", to: "" });
                    setIsReportModalOpen(false);
                  }}
                  className="text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors"
                >
                  Or download using current dashboard filters
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* New Employee Performance Report Modal */}
      {isModalOpen && createPortal(
        <EmployeePerformanceReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          staffName={selectedStaffName}
          staffData={selectedStaffData || staffMembers.find(s => s.name === selectedStaffName) || {}}
          tasks={staffTaskDetails}
          reportDate={tillDate}
          startDate={modalRange.from || startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA')}
          endDate={modalRange.to || endDate || new Date().toLocaleDateString('en-CA')}
          onDownloadPDF={(from, to, info) => handleDownloadPDF(from, to, info || selectedStaffData || staffMembers.find(s => s.name === selectedStaffName))}
          onDownloadCSV={(from, to, info) => handleDownloadCSV(from, to, info || selectedStaffData || staffMembers.find(s => s.name === selectedStaffName))}
          onRefresh={(from, to) => handleOpenModal(selectedStaffName, from, to)}
          hasMaintenanceAccess={hasMaintenanceAccess}
        />,
        document.body
      )}

      {/* Temporarily Disabled Task Detail Modal
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-gray-900/70 backdrop-blur-md">
          ... (old modal content) ...
        </div>,
        document.body
      )}
      */}
    </div>
  )
}