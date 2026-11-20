// Dev: http://localhost:4001/api/chatbot
// Prod (Vercel): /chatbot-api  (rewritten to the chatbot-service on EC2, see vercel.json)
const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_BASE_URL;

// keepSessionOnAuthError: settings calls must never log the user out. A 401 from the
// chatbot service can simply mean it cannot see this session (misconfiguration), which is
// not the same as the main login having expired.
async function chatbotRequest(endpoint, { keepSessionOnAuthError = false, ...options } = {}) {
    if (!API_BASE_URL) {
        throw new Error("Chatbot API URL is not configured.");
    }

    // Read the locally issued session ID
    const sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
        throw new Error(
            "Session ID missing. Please configure your local development session."
        );
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            "Content-Type": "application/json",
            "x-session-id": sessionId
        }
    });

    const data = await response.json().catch(() => ({}));

    // Session ended (e.g. backend restart logs everyone out): behave like the
    // rest of the app (authFetch) and send the user back to the login page.
    if (response.status === 401 && data.force_logout && keepSessionOnAuthError) {
        throw new Error(
            "The AI service does not recognise your session. Check that the chatbot service uses the same database as the main backend."
        );
    }

    if (response.status === 401 && data.force_logout) {
        console.warn("Chatbot: session expired. Forcing logout...");
        localStorage.clear();
        window.location.href = "/login";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Chatbot API error: ${response.status}`
        );
    }

    return data;
}


// ==========================================
// Employee APIs
// ==========================================

export async function sendChatMessage(messages, previousExport = null) {
    return chatbotRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ messages, previous_export: previousExport })
    });
}

export async function confirmWorkReport(confirmationToken) {
    if (!confirmationToken) {
        throw new Error("Confirmation token is required.");
    }

    return chatbotRequest("/confirm-work-report", {
        method: "POST",
        body: JSON.stringify({
            confirmation_token: confirmationToken
        })
    });
}


// ==========================================
// Administrator APIs
// ==========================================

// Full (read-only) data behind a chat answer, used for PDF / Excel download.
export async function exportChatData(type, filters) {
    return chatbotRequest("/admin/export", {
        method: "POST",
        body: JSON.stringify({ type, filters })
    });
}

export async function getAdminDashboardSummary() {
    return chatbotRequest("/admin/dashboard-summary");
}

export async function getAdminTaskAnalytics() {
    return chatbotRequest("/admin/task-analytics");
}

export async function getAdminDepartmentAnalytics() {
    return chatbotRequest("/admin/department-analytics");
}

export async function getAdminEmployeeAnalytics() {
    return chatbotRequest("/admin/employee-analytics");
}

export async function getAdminWorkReports() {
    return chatbotRequest("/admin/work-reports");
}


// ==========================================
// Date-Range Work Reports API
// ==========================================

export async function getAdminWorkReportsByDateRange({
    startDate,
    endDate,
    employee,
    page = 1,
    limit = 20
}) {
    if (!startDate || !endDate) {
        throw new Error("Start date and end date are required.");
    }

    const params = new URLSearchParams({
        startDate,
        endDate,
        page: String(page),
        limit: String(limit)
    });

    if (employee?.trim()) {
        params.set("employee", employee.trim());
    }

    return chatbotRequest(
        `/admin/work-reports/date-range?${params.toString()}`
    );
}

// ==========================================
// Super admin: AI settings (OpenAI key)
// The backend never returns the key, only { configured, masked, updated_by, updated_at }.
// ==========================================

export async function getOpenAIKeyStatus() {
    return chatbotRequest("/settings/openai-key", { keepSessionOnAuthError: true });
}

export async function saveOpenAIKey(apiKey) {
    return chatbotRequest("/settings/openai-key", {
        method: "PUT",
        keepSessionOnAuthError: true,
        body: JSON.stringify({ api_key: apiKey })
    });
}

export async function deleteOpenAIKey() {
    return chatbotRequest("/settings/openai-key", { method: "DELETE", keepSessionOnAuthError: true });
}
