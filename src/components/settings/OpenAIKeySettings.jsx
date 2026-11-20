import { useCallback, useEffect, useState } from "react";
import { Bot, Eye, EyeOff, KeyRound, Loader2, Lock, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { getOpenAIKeyStatus, saveOpenAIKey, deleteOpenAIKey } from "../../api/chatbotApi";

// Super admin only (the tab is hidden for others and the backend enforces it too).
// The saved key can never be displayed again: only a masked form (last 4 chars) is shown.
export default function OpenAIKeySettings() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [keyInput, setKeyInput] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: "success" | "error", text }

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getOpenAIKeyStatus();
            setStatus(res.data);
            setEditing(!res.data.configured);
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (e) => {
        e.preventDefault();
        setMessage(null);
        setSaving(true);
        try {
            const res = await saveOpenAIKey(keyInput.trim());
            setStatus(res.data);
            setEditing(false);
            setMessage({ type: "success", text: "OpenAI key saved. The AI assistant will use it from now on." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            // Never keep the key in component state longer than needed
            setKeyInput("");
            setShowInput(false);
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!window.confirm("Remove the saved OpenAI key? The AI assistant will stop working until a new key is added.")) return;
        setMessage(null);
        setSaving(true);
        try {
            const res = await deleteOpenAIKey();
            setStatus(res.data);
            setEditing(true);
            setMessage({ type: "success", text: "OpenAI key removed." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setEditing(false);
        setKeyInput("");
        setShowInput(false);
        setMessage(null);
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-purple-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 px-6 py-4 flex items-center gap-3">
                <Bot className="text-purple-600" size={24} />
                <h2 className="text-lg font-medium text-purple-700">AI Assistant - OpenAI Key</h2>
            </div>

            <div className="p-6 sm:p-8">
                <div className="max-w-2xl mx-auto space-y-5">
                    <p className="text-sm text-gray-600">
                        The AI assistant uses this OpenAI API key. It is stored encrypted on the server.
                        Once saved, <b>it cannot be viewed again</b> - only the last 4 characters are shown.
                        Only a super admin can see or change this page.
                    </p>

                    {message && (
                        <div
                            className={`rounded-lg px-4 py-3 text-sm border ${
                                message.type === "success"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                            }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <Loader2 className="animate-spin" size={16} /> Loading...
                        </div>
                    ) : editing ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                                {status?.configured ? "New OpenAI API key" : "OpenAI API key"}
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type={showInput ? "text" : "password"}
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder="sk-..."
                                    autoComplete="new-password"
                                    spellCheck={false}
                                    required
                                    className="w-full pl-10 pr-11 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowInput((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    title={showInput ? "Hide" : "Show while typing"}
                                >
                                    {showInput ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Lock size={12} /> The key is checked with OpenAI before saving.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={saving || !keyInput.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {saving ? "Verifying..." : "Save key"}
                                </button>
                                {status?.configured && (
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                                <ShieldCheck className="text-green-600 shrink-0" size={20} />
                                <div className="min-w-0">
                                    <div className="font-mono text-sm text-gray-800 break-all">{status?.masked}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {status?.source === "server_env"
                                            ? "Set in the server configuration (.env). Add a key here to override it."
                                            : `Last updated by ${status?.updated_by || "unknown"}${
                                                  status?.updated_at
                                                      ? " on " + new Date(status.updated_at).toLocaleString()
                                                      : ""
                                              }`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(true);
                                        setMessage(null);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                                >
                                    <RefreshCw size={16} /> Replace key
                                </button>
                                {status?.source === "database" && (
                                    <button
                                        type="button"
                                        onClick={handleRemove}
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <Trash2 size={16} /> Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
