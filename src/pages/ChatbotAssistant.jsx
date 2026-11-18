import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import {
    sendChatMessage,
    confirmWorkReport,
    getAdminDashboardSummary,
    getAdminTaskAnalytics,
    getAdminDepartmentAnalytics,
    getAdminEmployeeAnalytics,
    getAdminWorkReports,
    getAdminWorkReportsByDateRange
} from "../api/chatbotApi";


// ==========================================
// HELPERS
// ==========================================

const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getDaysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return getLocalDateString(date);
};

const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
};

const formatLabel = (value) => {
    if (!value) return "Unknown";

    return String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusClass = (status) => {
    const normalized = String(status || "").toLowerCase().trim();

    if (["completed", "done", "yes"].includes(normalized)) {
        return "bg-green-100 text-green-700";
    }

    if (normalized === "pending" || normalized === "no") {
        return "bg-yellow-100 text-yellow-700";
    }

    if (normalized === "in progress") {
        return "bg-blue-100 text-blue-700";
    }

    return "bg-gray-100 text-gray-700";
};

const StatCard = ({ title, value, description }) => (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
        <p className="text-sm text-gray-500">{title}</p>

        <h3 className="text-2xl font-bold text-gray-800 mt-2">
            {value ?? 0}
        </h3>

        {description && (
            <p className="text-xs text-gray-400 mt-2">
                {description}
            </p>
        )}
    </div>
);

const SectionCard = ({ title, children }) => (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-gray-800">
                {title}
            </h3>
        </div>

        <div className="p-5">
            {children}
        </div>
    </div>
);

const EmptyState = ({ message }) => (
    <div className="text-center py-8 text-sm text-gray-400">
        {message}
    </div>
);


// ==========================================
// MAIN COMPONENT
// ==========================================

const ChatbotAssistant = () => {

    // ======================================
    // AUTHORIZATION / ROLE
    // ======================================

    const reduxUserData = useSelector(
        (state) => state.login?.userData
    );

    const role = (
        reduxUserData?.role ||
        localStorage.getItem("role") ||
        ""
    ).toLowerCase();

    const isAdmin = [
        "admin",
        "div_admin",
        "super_admin"
    ].includes(role);


    // ======================================
    // GENERAL VIEW
    // ======================================

    const [activeView, setActiveView] = useState("chat");


    // ======================================
    // EMPLOYEE CHATBOT STATE
    // ======================================

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content:
                "Hello! I'm your Rama Metallics AI Assistant. I can help you view assigned tasks, check work history, and prepare daily work reports."
        }
    ]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [pendingConfirmation, setPendingConfirmation] =
        useState(null);

    const [submitting, setSubmitting] = useState(false);

    const messagesEndRef = useRef(null);


    // ======================================
    // ADMIN DASHBOARD STATE
    // ======================================

    const [dashboardData, setDashboardData] = useState(null);
    const [taskAnalytics, setTaskAnalytics] = useState(null);
    const [departmentAnalytics, setDepartmentAnalytics] = useState(null);
    const [employeeAnalytics, setEmployeeAnalytics] = useState(null);
    const [recentReports, setRecentReports] = useState([]);

    const [adminLoading, setAdminLoading] = useState(false);
    const [adminErrors, setAdminErrors] = useState([]);

    // Date-range filters
    const [startDate, setStartDate] = useState(getDaysAgo(7));
    const [endDate, setEndDate] = useState(getLocalDateString());
    const [employeeFilter, setEmployeeFilter] = useState("");

    const [dateReports, setDateReports] = useState([]);
    const [pagination, setPagination] = useState(null);

    const [dateReportsLoading, setDateReportsLoading] =
        useState(false);

    const [dateReportsError, setDateReportsError] = useState("");


    // ======================================
    // SCROLL CHAT TO BOTTOM
    // ======================================

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages, loading]);


    // ======================================
    // EMPLOYEE: SEND MESSAGE
    // ======================================

    const handleSendMessage = async (e) => {
        e?.preventDefault();

        const question = input.trim();

        if (!question || loading || pendingConfirmation) {
            return;
        }

        const updatedMessages = [
            ...messages,
            {
                role: "user",
                content: question
            }
        ];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);
        setError("");

        try {
            const response = await sendChatMessage(
                updatedMessages.filter(
                    (message) =>
                        message.role === "user" ||
                        message.role === "assistant"
                )
            );

            const aiReply =
                response?.data?.reply ||
                response?.reply ||
                "I couldn't generate a response. Please try again.";

            const confirmation =
                response?.data?.pending_confirmation ||
                response?.pendingConfirmation ||
                response?.pending_confirmation ||
                null;

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content: aiReply
                }
            ]);

            setPendingConfirmation(confirmation);

        } catch (err) {
            setError(
                err.message ||
                "Unable to connect to the chatbot."
            );

        } finally {
            setLoading(false);
        }
    };


    // ======================================
    // EMPLOYEE: CONFIRM WORK REPORT
    // ======================================

    const handleConfirmReport = async () => {
        const token =
            pendingConfirmation?.confirmation_token ||
            pendingConfirmation?.confirmationToken ||
            pendingConfirmation?.token;

        if (!token || submitting) {
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const response = await confirmWorkReport(token);

            const successMessage =
                response?.message ||
                "Your work report was submitted successfully.";

            setMessages((previous) => [
                ...previous,
                {
                    role: "assistant",
                    content: `✓ ${successMessage}`
                }
            ]);

            setPendingConfirmation(null);

        } catch (err) {
            setError(
                err.message ||
                "Unable to submit your work report. Please try again."
            );

        } finally {
            setSubmitting(false);
        }
    };


    // ======================================
    // EMPLOYEE: CANCEL CONFIRMATION
    // ======================================

    const handleCancelConfirmation = () => {
        setPendingConfirmation(null);

        setMessages((previous) => [
            ...previous,
            {
                role: "assistant",
                content:
                    "Report confirmation cancelled. No work report was submitted."
            }
        ]);
    };


    // ======================================
    // ADMIN: LOAD DASHBOARD
    // ======================================

    const loadAdminDashboard = async () => {
        if (!isAdmin) return;

        setAdminLoading(true);
        setAdminErrors([]);

        const results = await Promise.allSettled([
            getAdminDashboardSummary(),
            getAdminTaskAnalytics(),
            getAdminDepartmentAnalytics(),
            getAdminEmployeeAnalytics(),
            getAdminWorkReports()
        ]);

        const errors = [];

        const [
            dashboardResult,
            taskResult,
            departmentResult,
            employeeResult,
            reportsResult
        ] = results;

        if (dashboardResult.status === "fulfilled") {
            setDashboardData(
                dashboardResult.value?.data || null
            );
        } else {
            errors.push(
                `Dashboard summary: ${dashboardResult.reason?.message || "Failed"}`
            );
        }

        if (taskResult.status === "fulfilled") {
            setTaskAnalytics(
                taskResult.value?.data || null
            );
        } else {
            errors.push(
                `Task analytics: ${taskResult.reason?.message || "Failed"}`
            );
        }

        if (departmentResult.status === "fulfilled") {
            setDepartmentAnalytics(
                departmentResult.value?.data || null
            );
        } else {
            errors.push(
                `Department analytics: ${departmentResult.reason?.message || "Failed"}`
            );
        }

        if (employeeResult.status === "fulfilled") {
            setEmployeeAnalytics(
                employeeResult.value?.data || null
            );
        } else {
            errors.push(
                `Employee analytics: ${employeeResult.reason?.message || "Failed"}`
            );
        }

        if (reportsResult.status === "fulfilled") {
            setRecentReports(
                reportsResult.value?.data?.reports || []
            );
        } else {
            errors.push(
                `Recent reports: ${reportsResult.reason?.message || "Failed"}`
            );
        }

        setAdminErrors(errors);
        setAdminLoading(false);
    };


    // ======================================
    // ADMIN: INITIAL DASHBOARD LOAD
    // ======================================

    useEffect(() => {
        if (isAdmin) {
            loadAdminDashboard();
        }
    }, [isAdmin]);


    // ======================================
    // ADMIN: DATE-RANGE REPORTS
    // ======================================

    const loadDateReports = async (page = 1) => {
        if (!startDate || !endDate) {
            setDateReportsError(
                "Please select both start date and end date."
            );
            return;
        }

        if (startDate > endDate) {
            setDateReportsError(
                "Start date cannot be later than end date."
            );
            return;
        }

        setDateReportsLoading(true);
        setDateReportsError("");

        try {
            const response =
                await getAdminWorkReportsByDateRange({
                    startDate,
                    endDate,
                    employee: employeeFilter,
                    page,
                    limit: 20
                });

            const result = response?.data || {};

            setDateReports(result.reports || []);
            setPagination(result.pagination || null);

        } catch (err) {
            setDateReports([]);
            setPagination(null);

            setDateReportsError(
                err.message ||
                "Unable to retrieve date-range reports."
            );

        } finally {
            setDateReportsLoading(false);
        }
    };


    // ======================================
    // ADMIN: DATE FILTER SUBMISSION
    // ======================================

    const handleDateFilterSubmit = (e) => {
        e.preventDefault();
        loadDateReports(1);
    };


    // ======================================
    // REPORT DATA
    // ======================================

    const report = pendingConfirmation?.report;

    const summary = dashboardData?.summary || {};

    const taskSummary = taskAnalytics?.summary || {};

    const taskBreakdown = taskAnalytics?.task_breakdown || [];

    const departments = departmentAnalytics?.departments || [];

    const employees = employeeAnalytics?.employees || [];


    // ======================================
    // EMPLOYEE CHAT VIEW
    // ======================================

    const renderChatView = () => (
        <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] bg-gray-50 border rounded-xl overflow-hidden">

            {/* Chat Header */}
            <div className="bg-white border-b px-6 py-4 shadow-sm">

                <div className="flex items-center gap-3">

                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
                        AI
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Rama Metallics AI Assistant
                        </h2>

                        <p className="text-sm text-green-600">
                            ● Assistant available
                        </p>
                    </div>

                </div>

            </div>


            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                        }`}
                    >

                        <div
                            className={`max-w-[80%] rounded-2xl px-5 py-3 whitespace-pre-wrap text-sm leading-6 ${
                                message.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-sm"
                                    : "bg-white border text-gray-800 shadow-sm rounded-bl-sm"
                            }`}
                        >
                            {message.content}
                        </div>

                    </div>
                ))}


                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border rounded-xl px-5 py-3 text-sm text-gray-500">
                            AI is thinking...
                        </div>
                    </div>
                )}


                {error && (
                    <div className="mx-auto max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                        {error}
                    </div>
                )}


                {/* Work Report Confirmation */}
                {pendingConfirmation && report && (
                    <div className="max-w-xl mx-auto bg-white border border-blue-200 rounded-xl shadow-sm p-5">

                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Confirm Work Report
                        </h3>

                        <p className="text-sm text-gray-500 mb-4">
                            Review the details below. The report will only
                            be saved after you explicitly confirm.
                        </p>

                        <div className="space-y-3 text-sm">

                            <div>
                                <p className="text-gray-500">
                                    Work Details
                                </p>

                                <p className="font-medium text-gray-800">
                                    {report.work_details}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-500">
                                    Status
                                </p>

                                <p className="font-medium text-gray-800">
                                    {report.status}
                                </p>
                            </div>

                            <div>
                                <p className="text-gray-500">
                                    Duration
                                </p>

                                <p className="font-medium text-gray-800">
                                    {report.duration}
                                </p>
                            </div>

                        </div>


                        <div className="flex gap-3 mt-5">

                            <button
                                onClick={handleConfirmReport}
                                disabled={submitting}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
                            >
                                {submitting
                                    ? "Submitting..."
                                    : "Confirm & Submit"}
                            </button>

                            <button
                                onClick={handleCancelConfirmation}
                                disabled={submitting}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium"
                            >
                                Cancel
                            </button>

                        </div>

                    </div>
                )}


                <div ref={messagesEndRef} />

            </div>


            {/* Chat Input */}
            <div className="bg-white border-t p-4">

                <form
                    onSubmit={handleSendMessage}
                    className="max-w-5xl mx-auto flex gap-3"
                >

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            pendingConfirmation
                                ? "Confirm or cancel the report above..."
                                : "Ask about your tasks or work history..."
                        }
                        disabled={
                            loading ||
                            pendingConfirmation !== null
                        }
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            !input.trim() ||
                            pendingConfirmation !== null
                        }
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-7 py-3 rounded-xl font-medium"
                    >
                        Send
                    </button>

                </form>

                <p className="text-center text-xs text-gray-400 mt-2">
                    Verify generated work reports before submitting.
                </p>

            </div>

        </div>
    );


    // ======================================
    // ADMIN DASHBOARD VIEW
    // ======================================

    const renderAdminDashboard = () => (
        <div className="space-y-6">

            {/* Dashboard Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        Administrator Dashboard
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                        Work reporting and task analytics
                    </p>
                </div>

                <button
                    onClick={loadAdminDashboard}
                    disabled={adminLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                    {adminLoading ? "Refreshing..." : "Refresh Dashboard"}
                </button>

            </div>


            {/* Errors */}
            {adminErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">

                    <p className="text-sm font-semibold text-red-700 mb-2">
                        Some dashboard data could not be loaded.
                    </p>

                    {adminErrors.map((item, index) => (
                        <p
                            key={index}
                            className="text-sm text-red-600"
                        >
                            • {item}
                        </p>
                    ))}

                </div>
            )}


            {/* Dashboard Summary */}
            <div>

                <h3 className="font-semibold text-gray-800 mb-3">
                    Today's Work Reports
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                    <StatCard
                        title="Total Reports"
                        value={summary.total_reports_today}
                        description="Reports submitted today"
                    />

                    <StatCard
                        title="Employees Reported"
                        value={summary.employees_reported}
                        description="Unique employees"
                    />

                    <StatCard
                        title="Completed"
                        value={summary.completed_reports}
                        description="Completed reports"
                    />

                    <StatCard
                        title="In Progress"
                        value={summary.in_progress_reports}
                        description="Ongoing reports"
                    />

                    <StatCard
                        title="Pending"
                        value={summary.pending_reports}
                        description="Pending reports"
                    />

                </div>

            </div>


            {/* Task Analytics */}
            <SectionCard title="Consolidated Task Analytics">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

                    <StatCard
                        title="Total Tasks"
                        value={taskSummary.total_tasks}
                    />

                    <StatCard
                        title="Completed Tasks"
                        value={taskSummary.completed_tasks}
                    />

                    <StatCard
                        title="Pending Tasks"
                        value={taskSummary.pending_tasks}
                    />

                    <StatCard
                        title="Other Tasks"
                        value={taskSummary.other_tasks}
                    />

                </div>


                <h4 className="font-medium text-gray-700 mb-3">
                    Task Source Breakdown
                </h4>

                <div className="overflow-x-auto">

                    <table className="w-full text-sm text-left">

                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">Source</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Completed</th>
                                <th className="p-3">Pending</th>
                                <th className="p-3">Other</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {taskBreakdown.map((item) => (
                                <tr key={item.source}>

                                    <td className="p-3 font-medium">
                                        {formatLabel(item.source)}
                                    </td>

                                    <td className="p-3">
                                        {item.total_tasks}
                                    </td>

                                    <td className="p-3 text-green-700">
                                        {item.completed_tasks}
                                    </td>

                                    <td className="p-3 text-yellow-700">
                                        {item.pending_tasks}
                                    </td>

                                    <td className="p-3">
                                        {item.other_tasks}
                                    </td>

                                </tr>
                            ))}

                            {taskBreakdown.length === 0 && (
                                <tr>
                                    <td colSpan="5">
                                        <EmptyState message="No task analytics available." />
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </SectionCard>


            {/* Department Analytics */}
            <SectionCard title="Department-wise Work Analytics">

                <div className="overflow-x-auto">

                    <table className="w-full text-sm text-left">

                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">Department</th>
                                <th className="p-3">Reports</th>
                                <th className="p-3">Employees</th>
                                <th className="p-3">Completed</th>
                                <th className="p-3">In Progress</th>
                                <th className="p-3">Pending</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {departments.map((item, index) => (
                                <tr key={`${item.department}-${index}`}>

                                    <td className="p-3 font-medium">
                                        {item.department}
                                    </td>

                                    <td className="p-3">
                                        {item.total_reports}
                                    </td>

                                    <td className="p-3">
                                        {item.employees_reported}
                                    </td>

                                    <td className="p-3 text-green-700">
                                        {item.completed_reports}
                                    </td>

                                    <td className="p-3 text-blue-700">
                                        {item.in_progress_reports}
                                    </td>

                                    <td className="p-3 text-yellow-700">
                                        {item.pending_reports}
                                    </td>

                                </tr>
                            ))}

                            {departments.length === 0 && (
                                <tr>
                                    <td colSpan="6">
                                        <EmptyState message="No department analytics available for today." />
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </SectionCard>


            {/* Employee Analytics */}
            <SectionCard title="Employee-wise Task Analytics">

                <div className="overflow-x-auto">

                    <table className="w-full text-sm text-left">

                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">Employee</th>
                                <th className="p-3">Employee ID</th>
                                <th className="p-3">Department</th>
                                <th className="p-3">Designation</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Completed</th>
                                <th className="p-3">Pending</th>
                                <th className="p-3">Other</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {employees.map((item, index) => (
                                <tr key={item.username || index}>

                                    <td className="p-3 font-medium">
                                        {item.employee_name}
                                    </td>

                                    <td className="p-3">
                                        {item.employee_id || "—"}
                                    </td>

                                    <td className="p-3">
                                        {item.department || "—"}
                                    </td>

                                    <td className="p-3">
                                        {item.designation || "—"}
                                    </td>

                                    <td className="p-3">
                                        {item.total_tasks}
                                    </td>

                                    <td className="p-3 text-green-700">
                                        {item.completed_tasks}
                                    </td>

                                    <td className="p-3 text-yellow-700">
                                        {item.pending_tasks}
                                    </td>

                                    <td className="p-3">
                                        {item.other_tasks}
                                    </td>

                                </tr>
                            ))}

                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan="8">
                                        <EmptyState message="No employee task analytics available." />
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </SectionCard>


            {/* Recent Work Reports */}
            <SectionCard title="Recent Employee Work Reports">

                <div className="overflow-x-auto">

                    <table className="w-full text-sm text-left">

                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">Date & Time</th>
                                <th className="p-3">Employee</th>
                                <th className="p-3">Employee ID</th>
                                <th className="p-3">Department</th>
                                <th className="p-3">Work Details</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Duration</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {recentReports.map((item) => (
                                <tr key={item.id}>

                                    <td className="p-3 whitespace-nowrap">
                                        {formatDateTime(item.work_datetime)}
                                    </td>

                                    <td className="p-3">
                                        {item.user_name}
                                    </td>

                                    <td className="p-3">
                                        {item.employee_id || "—"}
                                    </td>

                                    <td className="p-3">
                                        {item.department || "—"}
                                    </td>

                                    <td className="p-3 min-w-[220px] max-w-sm">
                                        <p className="whitespace-pre-wrap break-words">
                                            {item.work_details}
                                        </p>
                                    </td>

                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {item.duration || "—"}
                                    </td>

                                </tr>
                            ))}

                            {recentReports.length === 0 && (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState message="No recent work reports available." />
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                </div>

            </SectionCard>


            {/* Date Range Reports */}
            <SectionCard title="Search Work Reports by Date Range">

                <form
                    onSubmit={handleDateFilterSubmit}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
                >

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>

                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>

                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Employee Username (Optional)
                        </label>

                        <input
                            type="text"
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            placeholder="e.g. aditya.jha"
                            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>


                    <button
                        type="submit"
                        disabled={dateReportsLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        {dateReportsLoading
                            ? "Searching..."
                            : "Search Reports"}
                    </button>

                </form>


                {dateReportsError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                        {dateReportsError}
                    </div>
                )}


                {/* Results Summary */}
                {pagination && (
                    <div className="flex flex-wrap justify-between gap-3 mt-6 mb-3 text-sm text-gray-600">

                        <p>
                            Total matching reports:{" "}
                            <strong>
                                {pagination.total_count}
                            </strong>
                        </p>

                        <p>
                            Page {pagination.page} of{" "}
                            {Math.max(pagination.total_pages, 1)}
                        </p>

                    </div>
                )}


                {/* Date Report Table */}
                <div className="overflow-x-auto mt-5">

                    <table className="w-full text-sm text-left">

                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">Date & Time</th>
                                <th className="p-3">Employee</th>
                                <th className="p-3">Employee ID</th>
                                <th className="p-3">Department</th>
                                <th className="p-3">Work Details</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Duration</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {dateReports.map((item) => (
                                <tr key={item.id}>

                                    <td className="p-3 whitespace-nowrap">
                                        {formatDateTime(item.work_datetime)}
                                    </td>

                                    <td className="p-3">
                                        {item.user_name}
                                    </td>

                                    <td className="p-3">
                                        {item.employee_id || "—"}
                                    </td>

                                    <td className="p-3">
                                        {item.department || "—"}
                                    </td>

                                    <td className="p-3 min-w-[220px] max-w-sm">
                                        <p className="whitespace-pre-wrap break-words">
                                            {item.work_details}
                                        </p>
                                    </td>

                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {item.duration || "—"}
                                    </td>

                                </tr>
                            ))}


                            {!dateReportsLoading &&
                                dateReports.length === 0 &&
                                !dateReportsError && (
                                    <tr>
                                        <td colSpan="7">
                                            <EmptyState message="Select a date range and search to view reports." />
                                        </td>
                                    </tr>
                                )}

                        </tbody>

                    </table>

                </div>


                {/* Pagination */}
                {pagination && pagination.total_pages > 0 && (
                    <div className="flex justify-between items-center mt-5">

                        <button
                            onClick={() => loadDateReports(pagination.page - 1)}
                            disabled={
                                dateReportsLoading ||
                                pagination.page <= 1
                            }
                            className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
                        >
                            Previous
                        </button>


                        <span className="text-sm text-gray-500">
                            Page {pagination.page} / {pagination.total_pages}
                        </span>


                        <button
                            onClick={() => loadDateReports(pagination.page + 1)}
                            disabled={
                                dateReportsLoading ||
                                !pagination.has_more
                            }
                            className="border rounded-lg px-4 py-2 text-sm disabled:opacity-40 hover:bg-gray-50"
                        >
                            Next
                        </button>

                    </div>
                )}

            </SectionCard>

        </div>
    );


    // ======================================
    // MAIN RENDER
    // ======================================

    return (
        <div className="p-4 md:p-6 space-y-6">

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Rama Metallics AI Assistant
                </h1>

                <p className="text-sm text-gray-500 mt-1">
                    Employee assistance and work reporting
                </p>
            </div>


            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b">

                <button
                    onClick={() => setActiveView("chat")}
                    className={`px-5 py-3 text-sm font-medium border-b-2 ${
                        activeView === "chat"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    AI Chat
                </button>


                {isAdmin && (
                    <button
                        onClick={() => setActiveView("admin")}
                        className={`px-5 py-3 text-sm font-medium border-b-2 ${
                            activeView === "admin"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-800"
                        }`}
                    >
                        Admin Dashboard
                    </button>
                )}

            </div>


            {/* Active View */}
            {activeView === "admin" && isAdmin
                ? renderAdminDashboard()
                : renderChatView()}

        </div>
    );
};

export default ChatbotAssistant;