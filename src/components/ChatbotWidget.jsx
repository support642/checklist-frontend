import { useEffect, useRef, useState } from "react";
import { X, Send, Minus, Maximize2, Minimize2, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { sendChatMessage, confirmWorkReport, exportChatData } from "../api/chatbotApi";
import { downloadPdf, downloadExcel } from "../utils/chatExport";

// Tailwind styling for markdown elements inside assistant bubbles
const markdownComponents = {
    p: ({ node, ...props }) => <p className="my-1.5 first:mt-0 last:mb-0" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
    h1: ({ node, ...props }) => <h3 className="font-bold text-base mt-3 mb-1 first:mt-0" {...props} />,
    h2: ({ node, ...props }) => <h3 className="font-bold text-base mt-3 mb-1 first:mt-0" {...props} />,
    h3: ({ node, ...props }) => <h4 className="font-semibold text-sm mt-3 mb-1 first:mt-0" {...props} />,
    h4: ({ node, ...props }) => <h4 className="font-semibold text-sm mt-2 mb-1 first:mt-0" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...props} />,
    li: ({ node, ...props }) => <li className="leading-6" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-600 underline" target="_blank" rel="noreferrer" {...props} />,
    hr: () => <hr className="my-2 border-gray-200" />,
    code: ({ node, ...props }) => <code className="bg-gray-100 rounded px-1 text-[12px]" {...props} />,
    table: ({ node, ...props }) => (
        <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
            <table className="w-full text-xs border-collapse" {...props} />
        </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-indigo-50 text-gray-700" {...props} />,
    th: ({ node, ...props }) => <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap border-b border-gray-200" {...props} />,
    td: ({ node, ...props }) => <td className="px-2 py-1.5 border-b border-gray-100 align-top" {...props} />
};

// PDF / Excel buttons shown under an assistant reply that has exportable data
const ExportButtons = ({ exportRequest }) => {
    const [busy, setBusy] = useState(null);
    const [exportError, setExportError] = useState("");

    const handleExport = async (format) => {
        if (busy) return;
        setBusy(format);
        setExportError("");

        try {
            const response = await exportChatData(exportRequest.type, exportRequest.filters);
            const data = response?.data;
            if (!data) throw new Error("No data received.");

            if (format === "pdf") await downloadPdf(exportRequest.type, data);
            else await downloadExcel(exportRequest.type, data);
        } catch (err) {
            setExportError(err.message || "Download failed.");
        } finally {
            setBusy(null);
        }
    };

    const label = exportRequest.type === "tasks" ? "tasks" : "employees";

    return (
        <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 mb-1.5">
                Download all {exportRequest.total} {label}:
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => handleExport("pdf")}
                    disabled={Boolean(busy)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                    {busy === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    PDF
                </button>
                <button
                    onClick={() => handleExport("excel")}
                    disabled={Boolean(busy)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-60"
                >
                    {busy === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Excel
                </button>
            </div>
            {exportError && <p className="text-[11px] text-red-600 mt-1">{exportError}</p>}
        </div>
    );
};

const WELCOME_MESSAGE = {
    role: "assistant",
    content:
        "Hello! I'm your Rama AI Assistant. Ask me about your tasks, work history, or system data."
};

const BRAND_GRADIENT = "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)";

// Colourful robot illustration (self-contained colours so it never blends into the page)
const RobotAvatar = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        {/* antenna */}
        <line x1="32" y1="6" x2="32" y2="14" stroke="#e0e7ff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="6" r="4" fill="#facc15" />
        {/* ears */}
        <rect x="6" y="28" width="6" height="14" rx="3" fill="#c7d2fe" />
        <rect x="52" y="28" width="6" height="14" rx="3" fill="#c7d2fe" />
        {/* head */}
        <rect x="11" y="14" width="42" height="38" rx="12" fill="#ffffff" />
        {/* visor */}
        <rect x="16" y="22" width="32" height="18" rx="9" fill="#1e1b4b" />
        {/* eyes */}
        <circle cx="25" cy="31" r="4" fill="#22d3ee" />
        <circle cx="39" cy="31" r="4" fill="#22d3ee" />
        <circle cx="26.2" cy="29.8" r="1.3" fill="#ffffff" />
        <circle cx="40.2" cy="29.8" r="1.3" fill="#ffffff" />
        {/* smile */}
        <path d="M26 45 Q32 49 38 45" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
);

// Floating robot button (bottom-right) that opens the AI assistant as a popup.
const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [pendingConfirmation, setPendingConfirmation] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading, isOpen]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    // Close with Escape key
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => e.key === "Escape" && setIsOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();

        const question = input.trim();
        if (!question || loading || pendingConfirmation) return;

        const updatedMessages = [...messages, { role: "user", content: question }];

        setMessages(updatedMessages);
        setInput("");
        setLoading(true);
        setError("");

        try {
            // The most recent list shown in chat, so "give me pdf / full list"
            // follow-ups can offer the same download again.
            const previousExport =
                [...messages].reverse().find((m) => m.exportRequest)?.exportRequest || null;

            // Backend accepts at most 20 messages, so send only the latest ones.
            const response = await sendChatMessage(
                updatedMessages
                    .filter((m) => m.role === "user" || m.role === "assistant")
                    .slice(-20)
                    .map(({ role, content }) => ({ role, content })),
                previousExport
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

            const exportRequest = response?.data?.export_request || null;

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: aiReply, exportRequest }
            ]);
            setPendingConfirmation(confirmation);
        } catch (err) {
            setError(err.message || "Unable to connect to the chatbot.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReport = async () => {
        const token =
            pendingConfirmation?.confirmation_token ||
            pendingConfirmation?.confirmationToken ||
            pendingConfirmation?.token;

        if (!token || submitting) return;

        setSubmitting(true);
        setError("");

        try {
            const response = await confirmWorkReport(token);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `✓ ${response?.message || "Your work report was submitted successfully."}`
                }
            ]);
            setPendingConfirmation(null);
        } catch (err) {
            setError(err.message || "Unable to submit your work report. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelConfirmation = () => {
        setPendingConfirmation(null);
        setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Report confirmation cancelled. Nothing was submitted." }
        ]);
    };

    const handleClearChat = () => {
        setMessages([WELCOME_MESSAGE]);
        setPendingConfirmation(null);
        setError("");
    };

    const report = pendingConfirmation?.report;

    return (
        <>
            {/* Chat popup */}
            {isOpen && (
                <div
                    role="dialog"
                    aria-label="AI Assistant"
                    className={`fixed bottom-24 right-4 sm:right-6 z-[60] flex flex-col w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden transition-all ${
                        isExpanded
                            ? "sm:w-[min(900px,calc(100vw-3rem))] h-[calc(100vh-8rem)]"
                            : "sm:w-[420px] h-[min(600px,calc(100vh-8rem))]"
                    }`}
                >
                    {/* Header */}
                    <div
                        className="flex items-center gap-3 px-4 py-3 text-white"
                        style={{ background: BRAND_GRADIENT }}
                    >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <RobotAvatar size={30} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-tight">AI Assistant</p>
                            <p className="text-xs text-white/80">● Online</p>
                        </div>
                        <button
                            onClick={handleClearChat}
                            className="text-xs px-2 py-1 rounded-md hover:bg-white/20"
                            title="Clear chat"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setIsExpanded((v) => !v)}
                            className="hidden sm:block p-1 rounded-md hover:bg-white/20"
                            aria-label={isExpanded ? "Shrink" : "Expand"}
                            title={isExpanded ? "Shrink" : "Expand"}
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-md hover:bg-white/20"
                            aria-label="Minimize"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {message.role === "user" ? (
                                    <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2 whitespace-pre-wrap break-words text-sm leading-6 bg-blue-600 text-white">
                                        {message.content}
                                    </div>
                                ) : (
                                    <div className="max-w-[92%] min-w-0 rounded-2xl rounded-bl-sm px-4 py-2 break-words text-sm leading-6 bg-white border text-gray-800 shadow-sm">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                            {message.content}
                                        </ReactMarkdown>
                                        {message.exportRequest && (
                                            <ExportButtons exportRequest={message.exportRequest} />
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border rounded-2xl px-4 py-2 text-sm text-gray-500 flex gap-1">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce [animation-delay:150ms]">●</span>
                                    <span className="animate-bounce [animation-delay:300ms]">●</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-xs">
                                {error}
                            </div>
                        )}

                        {pendingConfirmation && report && (
                            <div className="bg-white border border-blue-200 rounded-xl shadow-sm p-3 text-sm">
                                <p className="font-semibold text-gray-800 mb-2">Confirm Work Report</p>
                                <p className="text-gray-500 text-xs">Work Details</p>
                                <p className="text-gray-800 mb-2">{report.work_details}</p>
                                <p className="text-gray-500 text-xs">Status / Duration</p>
                                <p className="text-gray-800 mb-3">
                                    {report.status} · {report.duration}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleConfirmReport}
                                        disabled={submitting}
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                                    >
                                        {submitting ? "Submitting..." : "Confirm & Submit"}
                                    </button>
                                    <button
                                        onClick={handleCancelConfirmation}
                                        disabled={submitting}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="flex gap-2 p-3 border-t bg-white">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                pendingConfirmation
                                    ? "Confirm or cancel the report above..."
                                    : "Ask something..."
                            }
                            disabled={loading || pendingConfirmation !== null}
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim() || pendingConfirmation !== null}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-xl"
                            aria-label="Send"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Floating robot button */}
            <div className="fixed bottom-5 right-4 sm:right-6 z-[60] flex items-center gap-3">
                {!isOpen && (
                    <span className="hidden sm:block bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-full shadow-md border border-gray-200">
                        Ask AI 🤖
                    </span>
                )}
                <button
                    onClick={() => setIsOpen((open) => !open)}
                    style={{
                        background: BRAND_GRADIENT,
                        width: 64,
                        height: 64,
                        padding: 0,
                        boxShadow: "0 8px 24px rgba(79, 70, 229, 0.45)"
                    }}
                    className="relative rounded-full text-white hover:scale-110 transition-transform flex items-center justify-center ring-4 ring-white"
                    aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
                    title="AI Assistant"
                >
                    {!isOpen && (
                        <span
                            className="absolute inset-0 rounded-full animate-ping opacity-30"
                            style={{ background: BRAND_GRADIENT }}
                        />
                    )}
                    {isOpen ? <X className="w-7 h-7 relative" /> : <span className="relative"><RobotAvatar size={42} /></span>}
                    {!isOpen && (
                        <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                    )}
                </button>
            </div>
        </>
    );
};

export default ChatbotWidget;
