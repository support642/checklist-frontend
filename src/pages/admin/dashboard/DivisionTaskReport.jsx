/* eslint-disable no-unused-vars */
"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Download,
  FileSpreadsheet,
  Layers,
  Inbox
} from "lucide-react";
import { fetchDepartmentReportSummaryApi } from "../../../redux/api/dashboardApi";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatDateForDisplay = (dateStr) => {
  if (!dateStr || dateStr === "N/A" || dateStr === "Range") return dateStr;
  try {
    const parts = dateStr.includes("T")
      ? dateStr.split("T")[0].split("-")
      : dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function DivisionTaskReport({
  dashboardType = "checklist",
  dashboardStaffFilter = "all",
  startDate = "",
  endDate = "",
  departmentFilter = "all",
  divisionFilter = "all",
  unitFilter = "all",
  selectedReportRow = null,
  onSelectRow = () => {}
}) {
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedDivisions, setCollapsedDivisions] = useState({});

  // 1. Fetch division/department counts for the current scope.
  // Uses /dashboard/report-summary, which counts a checklist task as completed only when it is
  // submitted with status 'yes'. (The staff-tasks API also treats status 'yes' — the reminder
  // flag every active task has — as completed, which inflates Completed and hides Overdue.)
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchDepartmentReportSummaryApi({
        dashboardType,
        staffFilter: dashboardStaffFilter || "all",
        departmentFilter: departmentFilter || "all",
        unitFilter: unitFilter || "all",
        divisionFilter: divisionFilter || "all",
        role: localStorage.getItem("role") || "",
        username: localStorage.getItem("user-name") || "",
        unit: localStorage.getItem("unit") || "",
        division: localStorage.getItem("division") || "",
        department: localStorage.getItem("department") || "",
        startDate,
        endDate
      });
      if (Array.isArray(data)) {
        // Map to the shape the aggregation below expects (one row per division + department)
        setRawData(
          data.map((row) => ({
            division: row.division,
            department: row.department,
            totalTasks: row.total,
            completedTasks: row.completed,
            pendingTasks: row.pending,
            overdueTasks: row.overdue
          }))
        );
      } else {
        setRawData([]);
      }
    } catch (err) {
      console.error("Error fetching division report data:", err);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    dashboardType,
    dashboardStaffFilter,
    startDate,
    endDate,
    departmentFilter,
    divisionFilter,
    unitFilter
  ]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // 2. Client-side aggregation via useMemo
  const { divisions, grandTotal } = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return { divisions: [], grandTotal: null };
    }

    const divisionMap = new Map();

    rawData.forEach((staff) => {
      const rawDiv = typeof staff.division === "string" ? staff.division.trim() : "";
      const divName = rawDiv || "N/A";

      const rawDept = typeof staff.department === "string" ? staff.department.trim() : "";
      const deptName = rawDept || "N/A";

      if (!divisionMap.has(divName)) {
        divisionMap.set(divName, new Map());
      }
      const deptMap = divisionMap.get(divName);

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, []);
      }
      deptMap.get(deptName).push(staff);
    });

    const computeGroupStats = (staffList) => {
      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;

      staffList.forEach((s) => {
        totalTasks += Number(s.totalTasks) || 0;
        completedTasks += Number(s.completedTasks) || 0;
        pendingTasks += Number(s.pendingTasks) || 0;
        overdueTasks += Number(s.overdueTasks) || 0;
      });

      // Total Done % = tasks completed out of tasks assigned.
      // Rounded down so it only shows 100% when nothing is left pending (e.g. 99.8% -> 99%)
      const totalDonePct = totalTasks > 0 ? Math.floor((completedTasks / totalTasks) * 100) : 0;

      return {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalDonePct,
        staffCount: staffList.length
      };
    };

    // Sort divisions alphabetically (case-insensitive)
    const sortedDivNames = Array.from(divisionMap.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    const aggregatedDivisions = sortedDivNames.map((divName) => {
      const deptMap = divisionMap.get(divName);
      const sortedDeptNames = Array.from(deptMap.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );

      const allDivStaff = [];
      const departments = sortedDeptNames.map((deptName) => {
        const deptStaff = deptMap.get(deptName);
        allDivStaff.push(...deptStaff);
        const stats = computeGroupStats(deptStaff);
        return {
          name: deptName,
          divisionName: divName,
          ...stats
        };
      });

      const divStats = computeGroupStats(allDivStaff);
      return {
        name: divName,
        departments,
        ...divStats
      };
    });

    const grandTotalStats = computeGroupStats(rawData);

    return {
      divisions: aggregatedDivisions,
      grandTotal: grandTotalStats
    };
  }, [rawData]);

  // Expand / collapse helpers
  const toggleDivision = (divName, e) => {
    e?.stopPropagation();
    setCollapsedDivisions((prev) => ({
      ...prev,
      [divName]: !prev[divName]
    }));
  };

  const areAllExpanded = useMemo(() => {
    if (!divisions.length) return true;
    return divisions.every((d) => !collapsedDivisions[d.name]);
  }, [divisions, collapsedDivisions]);

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      const allCollapsed = {};
      divisions.forEach((d) => {
        allCollapsed[d.name] = true;
      });
      setCollapsedDivisions(allCollapsed);
    } else {
      setCollapsedDivisions({});
    }
  };

  const periodLabel = `${formatDateForDisplay(startDate) || "N/A"} to ${formatDateForDisplay(endDate) || "N/A"}`;

  // Pill color renderer for Total Done %
  const renderScorePill = (score, isGrandTotal = false) => {
    if (isGrandTotal) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300 shadow-xs">
          {score}%
        </span>
      );
    }
    let colorClass = "bg-red-100 text-red-800 border-red-200";
    if (score >= 80) {
      colorClass = "bg-green-100 text-green-800 border-green-200";
    } else if (score >= 50) {
      colorClass = "bg-amber-100 text-amber-800 border-amber-200";
    }
    return (
      <span
        className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${colorClass}`}
      >
        {score}%
      </span>
    );
  };

  // Export to Excel (SpreadsheetML) so division / total rows keep their highlight colours
  const handleExportExcel = () => {
    if (!divisions || divisions.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Each row carries its type so it can be styled: division | dept | grand
    const rows = [];
    divisions.forEach((div) => {
      rows.push({ type: "division", values: [div.name, div.totalTasks, div.completedTasks, div.pendingTasks, div.overdueTasks, `${div.totalDonePct}%`] });
      div.departments.forEach((dept) => {
        rows.push({ type: "dept", values: [dept.name, dept.totalTasks, dept.completedTasks, dept.pendingTasks, dept.overdueTasks, `${dept.totalDonePct}%`] });
      });
    });
    if (grandTotal) {
      rows.push({ type: "grand", values: ["Grand Total", grandTotal.totalTasks, grandTotal.completedTasks, grandTotal.pendingTasks, grandTotal.overdueTasks, `${grandTotal.totalDonePct}%`] });
    }

    const xmlEscape = (val) =>
      String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const cell = (val, style) => {
      const isNum = typeof val === "number";
      return `<Cell ss:StyleID="${style}"><Data ss:Type="${isNum ? "Number" : "String"}">${xmlEscape(val)}</Data></Cell>`;
    };

    const headers = ["Row Labels", "Total Tasks", "Completed", "Pending", "Overdue", "Total Done %"];

    const bodyXml = rows
      .map(({ type, values }) => {
        const cells = values.map((val, col) => {
          if (col === 0) return cell(val, `${type}Label`);
          if (col === 4 && type === "dept" && val > 0) return cell(val, "overdue");
          return cell(val, type);
        });
        return `<Row>${cells.join("")}</Row>`;
      })
      .join("");

    const border = `<Borders>${["Left", "Right", "Top", "Bottom"]
      .map((p) => `<Border ss:Position="${p}" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>`)
      .join("")}</Borders>`;
    const style = (id, { bold = false, fill, color = "#0F172A", align = "Right", size = 10, indent = 0 } = {}) =>
      `<Style ss:ID="${id}"><Alignment ss:Horizontal="${align}" ss:Vertical="Center"${indent ? ` ss:Indent="${indent}"` : ""}/>${border}<Font ss:FontName="Calibri" ss:Size="${size}" ss:Bold="${bold ? 1 : 0}" ss:Color="${color}"/>${fill ? `<Interior ss:Color="${fill}" ss:Pattern="Solid"/>` : ""}</Style>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
${style("title", { bold: true, fill: "#FDE047", align: "Center", size: 14 })}
${style("subtitle", { fill: "#FEF9C3", align: "Center", color: "#475569" })}
${style("header", { bold: true, fill: "#2563EB", color: "#FFFFFF", align: "Center" })}
${style("divisionLabel", { bold: true, fill: "#BFDBFE", align: "Left" })}
${style("division", { bold: true, fill: "#BFDBFE" })}
${style("deptLabel", { align: "Left", indent: 2 })}
${style("dept", {})}
${style("overdue", { bold: true, color: "#DC2626" })}
${style("grandLabel", { bold: true, fill: "#FCD34D", align: "Left" })}
${style("grand", { bold: true, fill: "#FCD34D" })}
</Styles>
<Worksheet ss:Name="Division Report">
<Table>
<Column ss:Width="180"/><Column ss:Width="85"/><Column ss:Width="85"/><Column ss:Width="70"/><Column ss:Width="70"/><Column ss:Width="85"/>
<Row ss:Height="24"><Cell ss:MergeAcross="5" ss:StyleID="title"><Data ss:Type="String">Division wise Task Report - ${xmlEscape(dashboardType.toUpperCase())}</Data></Cell></Row>
<Row><Cell ss:MergeAcross="5" ss:StyleID="subtitle"><Data ss:Type="String">Period: ${xmlEscape(periodLabel)}</Data></Cell></Row>
<Row>${headers.map((h) => cell(h, "header")).join("")}</Row>
${bodyXml}
</Table>
</Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filenameDate = new Date().toLocaleDateString("en-US").replace(/\//g, "-");
    link.setAttribute(
      "download",
      `Division_Wise_Task_Report_${dashboardType}_${filenameDate}.xls`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF using jspdf + jspdf-autotable
  const handleExportPDF = () => {
    if (!divisions || divisions.length === 0) {
      alert("No data available to export.");
      return;
    }

    const body = [];
    const divisionRowIndices = new Set();

    divisions.forEach((div) => {
      divisionRowIndices.add(body.length);
      body.push([
        div.name,
        div.totalTasks,
        div.completedTasks,
        div.pendingTasks,
        div.overdueTasks,
        `${div.totalDonePct}%`
      ]);
      div.departments.forEach((dept) => {
        body.push([
          `    ${dept.name}`,
          dept.totalTasks,
          dept.completedTasks,
          dept.pendingTasks,
          dept.overdueTasks,
          `${dept.totalDonePct}%`
        ]);
      });
    });

    const grandTotalIndex = body.length;
    if (grandTotal) {
      body.push([
        "Grand Total",
        grandTotal.totalTasks,
        grandTotal.completedTasks,
        grandTotal.pendingTasks,
        grandTotal.overdueTasks,
        `${grandTotal.totalDonePct}%`
      ]);
    }

    const doc = new jsPDF("p", "mm", "a4");

    // Header title
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(`Division wise Task Report - ${dashboardType.toUpperCase()}`, 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Period: ${periodLabel}`, 14, 22);
    doc.text(
      `${new Date().toLocaleDateString("en-US")} ${new Date().toLocaleTimeString()}`,
      14,
      27
    );

    autoTable(doc, {
      head: [["Row Labels", "Total Tasks", "Completed", "Pending", "Overdue", "Total Done %"]],
      body: body,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 2.2 },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" }
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 32, bottom: 20 },
      didParseCell: (data) => {
        if (data.section === "body") {
          if (divisionRowIndices.has(data.row.index)) {
            // Division (group head) rows: blue highlight
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [191, 219, 254];
            data.cell.styles.textColor = [15, 23, 42];
          } else if (data.row.index === grandTotalIndex) {
            // Grand Total row: amber highlight
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [252, 211, 77];
            data.cell.styles.textColor = [15, 23, 42];
          } else {
            if (data.column.index === 4 && Number(data.cell.raw) > 0) {
              data.cell.styles.textColor = [220, 38, 38];
            }
          }
        }
      }
    });

    // Powered By Botivate footer
    const totalPages = doc.internal.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 10;
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
      doc.setTextColor(124, 58, 237);
      doc.text(brandText, startX + prefixW, footerY);
    }

    const filenameDate = new Date().toLocaleDateString("en-US").replace(/\//g, "-");
    doc.save(`Division_Wise_Task_Report_${dashboardType}_${filenameDate}.pdf`);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden my-2">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-600" size={18} />
            <h3 className="text-sm font-bold text-gray-800 tracking-tight">
              Division wise Task Report
            </h3>
          </div>
          {startDate && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              From: {formatDateForDisplay(startDate)}
            </span>
          )}
          {endDate && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              Till: {formatDateForDisplay(endDate)}
            </span>
          )}
          {selectedReportRow && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
              Filtering: {selectedReportRow.division}
              {selectedReportRow.department ? ` › ${selectedReportRow.department}` : ""}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleExpandAll}
            disabled={isLoading || divisions.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title={areAllExpanded ? "Collapse all divisions" : "Expand all divisions"}
          >
            <ChevronsUpDown size={14} className="text-gray-500" />
            <span>{areAllExpanded ? "Collapse all" : "Expand all"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isLoading || divisions.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Download Excel report"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isLoading || divisions.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Download PDF report"
          >
            <Download size={14} className="text-blue-600" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Table Container - Mobile horizontal scroll safe */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-xs">
            <tr className="divide-x divide-gray-200">
              <th
                scope="col"
                className="px-4 py-2.5 text-left font-semibold text-gray-700 uppercase tracking-wider text-[11px]"
              >
                Row Labels
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-wider text-[11px] tabular-nums"
              >
                Total Tasks
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-wider text-[11px] tabular-nums"
              >
                Completed
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-wider text-[11px] tabular-nums"
              >
                Pending
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-wider text-[11px] tabular-nums"
              >
                Overdue
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-semibold text-gray-700 uppercase tracking-wider text-[11px]"
              >
                Total Done %
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse divide-x divide-gray-100">
                  <td className="px-4 py-3">
                    <div className="h-3.5 bg-gray-200 rounded w-40"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3.5 bg-gray-200 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3.5 bg-gray-200 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3.5 bg-gray-200 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-3.5 bg-gray-200 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded-full w-14 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : divisions.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox size={28} className="text-gray-400" />
                    <p className="text-sm font-medium">No data for selected period</p>
                    <p className="text-xs text-gray-400">
                      Try selecting a different month, date range, or clear parent filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              <>
                {divisions.map((div) => {
                  const isCollapsed = !!collapsedDivisions[div.name];
                  const isDivSelected =
                    selectedReportRow?.division === div.name &&
                    !selectedReportRow?.department;

                  return (
                    <Fragment key={`group-${div.name}`}>
                      {/* Division Row */}
                      <tr
                        onClick={() => onSelectRow({ division: div.name, department: null })}
                        className={`divide-x divide-gray-200 cursor-pointer transition-colors ${
                          isDivSelected
                            ? "bg-blue-100/90 text-blue-950 font-bold border-l-4 border-l-blue-600 shadow-xs"
                            : "bg-slate-100/80 hover:bg-blue-50/70 text-gray-900 font-semibold"
                        }`}
                        title={`Click to filter staff by division "${div.name}"`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleDivision(div.name, e)}
                              className="p-1 hover:bg-gray-200/80 rounded transition-colors text-gray-600"
                              title={isCollapsed ? "Expand departments" : "Collapse departments"}
                              aria-label={isCollapsed ? "Expand departments" : "Collapse departments"}
                            >
                              {isCollapsed ? (
                                <ChevronRight size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </button>
                            <span className="font-bold tracking-tight">
                              {div.name}
                            </span>
                            <span className="text-[10px] text-gray-500 font-normal ml-1">
                              ({div.departments.length} {div.departments.length === 1 ? "dept" : "depts"})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-semibold">
                          {div.totalTasks}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-semibold text-emerald-700">
                          {div.completedTasks}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-semibold text-amber-700">
                          {div.pendingTasks}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-semibold ${
                            div.overdueTasks > 0 ? "text-red-600 font-bold" : "text-gray-600"
                          }`}
                        >
                          {div.overdueTasks}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {renderScorePill(div.totalDonePct)}
                        </td>
                      </tr>

                      {/* Department Rows */}
                      {!isCollapsed &&
                        div.departments.map((dept) => {
                          const isDeptSelected =
                            selectedReportRow?.division === div.name &&
                            selectedReportRow?.department === dept.name;

                          return (
                            <tr
                              key={`dept-${div.name}-${dept.name}`}
                              onClick={() =>
                                onSelectRow({
                                  division: div.name,
                                  department: dept.name
                                })
                              }
                              className={`divide-x divide-gray-100 cursor-pointer transition-colors ${
                                isDeptSelected
                                  ? "bg-blue-50 text-blue-950 font-semibold border-l-4 border-l-blue-500 shadow-xs"
                                  : "bg-white hover:bg-gray-50/80 text-gray-700"
                              }`}
                              title={`Click to filter staff by "${div.name} › ${dept.name}"`}
                            >
                              <td className="px-3 py-2 whitespace-nowrap pl-9">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-300 font-mono text-xs">↳</span>
                                  <span className="text-xs text-gray-700 font-medium">
                                    {dept.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-gray-700">
                                {dept.totalTasks}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-emerald-600 font-medium">
                                {dept.completedTasks}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap text-amber-600 font-medium">
                                {dept.pendingTasks}
                              </td>
                              <td
                                className={`px-4 py-2 text-right tabular-nums whitespace-nowrap ${
                                  dept.overdueTasks > 0
                                    ? "text-red-600 font-bold"
                                    : "text-gray-500"
                                }`}
                              >
                                {dept.overdueTasks}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                                {renderScorePill(dept.totalDonePct)}
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}

                {/* Grand Total Row */}
                {grandTotal && (
                  <tr className="bg-slate-200/90 font-bold text-gray-900 border-t-2 border-gray-300 divide-x divide-gray-200">
                    <td className="px-4 py-2.5 whitespace-nowrap font-bold text-gray-900">
                      Grand Total
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-bold">
                      {grandTotal.totalTasks}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-bold text-emerald-800">
                      {grandTotal.completedTasks}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-bold text-amber-800">
                      {grandTotal.pendingTasks}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap font-bold ${
                        grandTotal.overdueTasks > 0 ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {grandTotal.overdueTasks}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {renderScorePill(grandTotal.totalDonePct, true)}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
