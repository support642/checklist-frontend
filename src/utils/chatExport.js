// Builds PDF / Excel files from chatbot export data (tasks or employee summary).
// Heavy libraries are loaded only when the user actually clicks download.

const TASK_COLUMNS = [
    { key: "employee", label: "Employee", width: 22 },
    { key: "department", label: "Department", width: 18 },
    { key: "task_type", label: "Type", width: 12 },
    { key: "task_id", label: "Task ID", width: 10 },
    { key: "task_description", label: "Task Description", width: 50 },
    { key: "task_date", label: "Task Date", width: 12 },
    { key: "current_status", label: "Status", width: 12 },
    { key: "submitted_at", label: "Submitted At", width: 17 },
    { key: "given_by", label: "Given By", width: 18 },
    { key: "frequency", label: "Frequency", width: 11 }
];

const EMPLOYEE_COLUMNS = [
    { key: "employee", label: "Employee", width: 24 },
    { key: "department", label: "Department", width: 20 },
    { key: "total", label: "Total", width: 9 },
    { key: "completed", label: "Completed", width: 11 },
    { key: "pending", label: "Pending", width: 10 },
    { key: "overdue", label: "Overdue", width: 10 },
    { key: "due_today", label: "Due Today", width: 11 },
    { key: "completion_rate_percent", label: "Completion %", width: 13 }
];

const STAFF_COLUMNS = [
    { key: "user_name", label: "Employee", width: 26 },
    { key: "employee_id", label: "Employee ID", width: 13 },
    { key: "department", label: "Department", width: 20 },
    { key: "designation", label: "Designation", width: 24 },
    { key: "unit", label: "Unit", width: 12 },
    { key: "division", label: "Division", width: 14 },
    { key: "role", label: "Role", width: 12 },
    { key: "status", label: "Status", width: 10 }
];

const formatStatus = (value) =>
    String(value || "")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const getDataset = (type, data) => {
    if (type === "employees") {
        const dept = data.filters?.department;
        return {
            title: dept ? `${dept} Employees` : "Employee List",
            columns: STAFF_COLUMNS,
            rows: (data.employees || []).map((e) => ({
                ...e,
                role: formatStatus(e.role),
                status: formatStatus(e.status)
            }))
        };
    }

    if (type === "employee_summary") {
        return {
            title: "Employee-wise Task Summary",
            columns: EMPLOYEE_COLUMNS,
            rows: data.employees || []
        };
    }

    return {
        title: `${formatStatus(data.filters?.status || "all")} Tasks`,
        columns: TASK_COLUMNS,
        rows: (data.tasks || []).map((t) => ({
            ...t,
            task_type: formatStatus(t.task_type),
            current_status: formatStatus(t.current_status)
        }))
    };
};

const describeRowCount = (data, rows) =>
    (data.total_matching || 0) > rows.length
        ? `Rows: first ${rows.length} of ${data.total_matching} (export limit reached - narrow the date range or filter by employee/department)`
        : `Total rows: ${rows.length}`;

const describeFilters = (filters = {}) => {
    const parts = filters.start_date ? [`Period: ${filters.start_date} to ${filters.end_date}`] : [];
    if (filters.query) parts.push(`Name contains: ${filters.query}`);
    if (filters.employee && filters.employee !== "all") parts.push(`Employee: ${filters.employee}`);
    if (filters.department && filters.department !== "all") parts.push(`Department: ${filters.department}`);
    if (filters.unit) parts.push(`Unit: ${filters.unit}`);
    if (filters.division) parts.push(`Division: ${filters.division}`);
    if (filters.task_type && filters.task_type !== "all") parts.push(`Type: ${formatStatus(filters.task_type)}`);
    return parts.join("  |  ");
};

const buildFileName = (title, filters = {}, ext) => {
    const who = filters.employee && filters.employee !== "all" ? `_${filters.employee}` : "";
    const period = filters.start_date ? `_${filters.start_date}_to_${filters.end_date}` : "";
    const base = `${title}${who}${period}`
        .replace(/[^\w.-]+/g, "_")
        .replace(/_+/g, "_");
    return `${base}.${ext}`;
};

const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};


// =====================================================
// PDF
// =====================================================

export const downloadPdf = async (type, data) => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable")
    ]);

    const { title, columns, rows } = getDataset(type, data);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    doc.setFontSize(15);
    doc.text(title, 40, 40);
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(describeFilters(data.filters), 40, 58);
    doc.text(
        `${describeRowCount(data, rows)}   |   Generated: ${new Date().toLocaleString("en-IN")}`,
        40,
        72
    );

    autoTable(doc, {
        startY: 84,
        head: [columns.map((c) => c.label)],
        body: rows.map((r) => columns.map((c) => r[c.key] ?? "")),
        styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        columnStyles: type === "tasks" ? { 4: { cellWidth: 200 } } : {},
        margin: { left: 40, right: 40 }
    });

    doc.save(buildFileName(title, data.filters, "pdf"));
};


// =====================================================
// EXCEL (.xlsx)
// =====================================================

export const downloadExcel = async (type, data) => {
    const { default: ExcelJS } = await import("exceljs");
    const { title, columns, rows } = getDataset(type, data);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title.slice(0, 31));

    sheet.addRow([title]).font = { bold: true, size: 14 };
    sheet.addRow([`${describeFilters(data.filters)}  |  ${describeRowCount(data, rows)}`]).font = {
        italic: true,
        color: { argb: "FF555555" }
    };
    sheet.addRow([]);

    const header = sheet.addRow(columns.map((c) => c.label));
    header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
        cell.alignment = { vertical: "middle" };
    });

    rows.forEach((r) => sheet.addRow(columns.map((c) => r[c.key] ?? "")));

    columns.forEach((c, i) => {
        sheet.getColumn(i + 1).width = c.width;
    });
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }),
        buildFileName(title, data.filters, "xlsx")
    );
};
