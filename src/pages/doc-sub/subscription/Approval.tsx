import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '../../../store/authStore';
import useHeaderStore from '../../../store/headerStore';
import { FileText, X, Save, Search, RefreshCw, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../../utils/doc-utils/dateFormatter';
import {
    fetchPendingApprovals,
    fetchApprovalHistory,
    submitApproval,
    ApprovalItem,
    ApprovalHistoryItem
} from '../../../utils/doc-utils/subscriptionApi';
import { updateSubscription } from '../../../utils/doc-utils/subscriptionApi';

// Frontend display types
interface PendingDisplay {
    id: string;
    sn: string;
    companyName: string;
    subscriberName: string;
    subscriptionName: string;
    price: string;
    frequency: string;
    purpose: string;
    requestedDate: string;
}

interface HistoryDisplay {
    id: string;
    approvalNo: string;
    subscriptionNo: string;
    approval: string;
    note: string;
    approvedBy: string;
    requestedOn: string;
    approvalDate: string;
    subscriberName: string;
}

const SubscriptionApproval = () => {
    const { setTitle } = useHeaderStore();
    const { currentUser } = useAuthStore();
    const isAdmin = currentUser?.role && ['admin', 'super_admin', 'div_admin'].includes(currentUser.role);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [pendingList, setPendingList] = useState<PendingDisplay[]>([]);
    const [historyList, setHistoryList] = useState<HistoryDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    // Update Header
    useEffect(() => {
        setTitle('Subscription Approval');
    }, [setTitle]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<PendingDisplay | null>(null);
    const [approvalAction, setApprovalAction] = useState<'Approved' | 'Rejected' | ''>('');
    const [remarks, setRemarks] = useState('');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Edit State
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        companyName: '',
        subscriberName: '',
        subscriptionName: '',
        price: '',
        frequency: '',
        requestedDate: ''
    });

    const handleStartEdit = (sub: PendingDisplay) => {
        setEditingSubId(sub.id);
        setEditFormData({
            companyName: sub.companyName,
            subscriberName: sub.subscriberName,
            subscriptionName: sub.subscriptionName,
            price: sub.price,
            frequency: sub.frequency,
            requestedDate: sub.requestedDate
        });
    };

    const handleCancelEdit = () => {
        setEditingSubId(null);
    };

    const handleSaveEdit = async (sub: PendingDisplay) => {
        try {
            await updateSubscription(sub.id, {
                companyName: editFormData.companyName,
                subscriberName: editFormData.subscriberName,
                subscriptionName: editFormData.subscriptionName,
                price: editFormData.price,
                frequency: editFormData.frequency,
                timestamp: editFormData.requestedDate
            } as any);
            toast.success('Subscription updated successfully');
            setEditingSubId(null);
            loadData();
        } catch (err) {
            console.error('Failed to update subscription:', err);
            toast.error('Failed to update subscription');
        }
    };

    // Load data from backend
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pending, history] = await Promise.all([
                fetchPendingApprovals(),
                fetchApprovalHistory()
            ]);

            // Map pending approvals
            setPendingList(pending.map((item: ApprovalItem) => ({
                id: String(item.id),
                sn: item.subscription_no,
                companyName: item.company_name || '',
                subscriberName: item.subscriber_name || '',
                subscriptionName: item.subscription_name || '',
                price: item.price || '',
                frequency: item.frequency || '',
                purpose: item.purpose || '',
                requestedDate: item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-CA') : ''
            })));

            // Map history
            setHistoryList(history.map((item: ApprovalHistoryItem, index: number) => ({
                id: String(item.id || index),
                approvalNo: `AP-${String(index + 1).padStart(3, '0')}`,
                subscriptionNo: item.subscription_no,
                approval: item.approval,
                note: item.note || '',
                approvedBy: item.approved_by || '',
                requestedOn: item.requested_on || '',
                approvalDate: item.requested_on ? new Date(item.requested_on).toLocaleDateString('en-GB') : '',
                subscriberName: (item as any).subscriber_name || ''
            })));

        } catch (err) {
            console.error('Failed to load approval data:', err);
            toast.error('Failed to load approval data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter by search AND Role
    const filteredPending = useMemo(() => {
        let data = pendingList;

        // Role Filter
        if (!isAdmin) {
            data = data.filter(s => s.subscriberName === currentUser?.name);
        }

        return data.filter(s =>
            s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.sn.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pendingList, searchTerm, currentUser]);

    const filteredHistory = useMemo(() => {
        let data = historyList;

        // Role Filter
        if (!isAdmin) {
            data = data.filter(s => s.subscriberName === currentUser?.name);
        }

        return data.filter(s =>
            s.subscriptionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.approvedBy.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [historyList, searchTerm, currentUser]);

    const handleActionClick = (sub: PendingDisplay) => {
        setSelectedSub(sub);
        setApprovalAction('');
        setRemarks('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSub(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSub || !approvalAction || isSubmitting) {
            toast.error("Please select an action (Approve/Reject)");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitApproval({
                subscriptionNo: selectedSub.sn,
                approval: approvalAction,
                note: remarks,
                approvedBy: 'Admin', // TODO: get from auth context
                requestedOn: selectedSub.requestedDate,
                companyName: selectedSub.companyName,
                subscriberName: selectedSub.subscriberName,
                subscriptionName: selectedSub.subscriptionName,
                price: selectedSub.price,
                frequency: selectedSub.frequency,
                purpose: selectedSub.purpose
            });

            toast.success(approvalAction === 'Approved'
                ? 'Subscription Approved!'
                : 'Subscription Rejected');
            handleCloseModal();
            loadData(); // Refresh data
        } catch (err) {
            console.error('Failed to submit approval:', err);
            toast.error('Failed to submit approval');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Approval</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and approve pending subscription requests</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg transition-all"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'pending'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'history'
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-3 text-gray-600">Loading...</span>
                </div>
            )}

            {/* Content - Pending Tab */}
            {!loading && activeTab === 'pending' && (
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-210px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold whitespace-nowrap">
                                <tr>
                                    <th className="p-3">Action</th>
                                    <th className="p-3">Edit</th>
                                    <th className="p-3">Serial No</th>
                                    <th className="p-3">Company</th>
                                    <th className="p-3">Subscriber</th>
                                    <th className="p-3">Subscription</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3">Frequency</th>
                                    <th className="p-3">Requested On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredPending.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleActionClick(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                                            >
                                                <FileText size={14} />
                                                Action
                                            </button>
                                        </td>
                                        <td className="p-3 text-center">
                                            {editingSubId === item.id ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleSaveEdit(item)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartEdit(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-sm font-bold text-gray-700">{item.sn}</td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-gray-900" value={editFormData.companyName} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} />
                                            ) : (
                                                <span className="font-medium text-gray-900">{item.companyName}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-gray-700" value={editFormData.subscriberName} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} />
                                            ) : (
                                                <span className="text-gray-700">{item.subscriberName}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-indigo-600 font-medium" value={editFormData.subscriptionName} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} />
                                            ) : (
                                                <span className="text-indigo-600 font-medium">{item.subscriptionName}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-gray-900" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} />
                                            ) : (
                                                <span className="font-medium text-gray-900">{item.price}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-gray-500" value={editFormData.frequency} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})} />
                                            ) : (
                                                <span className="text-gray-500">{item.frequency}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {editingSubId === item.id ? (
                                                <input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-gray-500" value={editFormData.requestedDate} onChange={e => setEditFormData({...editFormData, requestedDate: e.target.value})} />
                                            ) : (
                                                <span className="text-gray-500 whitespace-nowrap">{formatDate(item.requestedDate)}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredPending.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-gray-500">
                                            No pending subscriptions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content - History Tab */}
            {!loading && activeTab === 'history' && (
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-210px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold whitespace-nowrap">
                                <tr>
                                    <th className="p-3">Approval No</th>
                                    <th className="p-3">Subscription No</th>
                                    <th className="p-3">Approved By</th>
                                    <th className="p-3">Approval Date</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-3 font-mono font-bold text-gray-700 text-xs">{item.approvalNo}</td>
                                        <td className="p-3 font-mono text-sm font-bold text-gray-700">{item.subscriptionNo}</td>
                                        <td className="p-3 text-gray-700">{item.approvedBy}</td>
                                        <td className="p-3 text-gray-500 whitespace-nowrap">{formatDate(item.approvalDate)}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-sm font-bold uppercase ${item.approval === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {item.approval}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500 max-w-xs truncate" title={item.note}>{item.note || '-'}</td>
                                    </tr>
                                ))}
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500">
                                            No approval history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Mobile Cards - Pending */}
            {!loading && activeTab === 'pending' && (
                <div className="md:hidden flex flex-col gap-4">
                    {filteredPending.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                            {editingSubId === item.id ? (
                                <>
                                    <div className="space-y-2">
                                        <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.sn}</span>
                                        <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Company</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.companyName} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} /></div>
                                        <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Subscriber</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.subscriberName} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} /></div>
                                        <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Subscription</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.subscriptionName} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} /></div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Price</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} /></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Frequency</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.frequency} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})} /></div>
                                        </div>
                                        <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Requested Date</label><input type="date" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.requestedDate} onChange={e => setEditFormData({...editFormData, requestedDate: e.target.value})} /></div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                        <button onClick={handleCancelEdit} className="px-3 py-1.5 text-gray-500 text-xs font-bold rounded-lg border border-gray-200">Cancel</button>
                                        <button onClick={() => handleSaveEdit(item)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">Save</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3 items-start">
                                            <div className="h-10 w-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.sn}</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.subscriptionName}</h3>
                                                <p className="text-sm text-gray-500 mt-0.5 font-medium">{item.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleActionClick(item)}
                                                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-200"
                                            >
                                                Action
                                            </button>
                                            <button
                                                onClick={() => handleStartEdit(item)}
                                                className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold rounded-lg flex items-center gap-1"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-dashed border-gray-100">
                                        <div>
                                            <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Subscriber</span>
                                            <span className="font-semibold text-gray-700">{item.subscriberName}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Price / Freq</span>
                                            <span className="font-bold text-gray-900">{item.price} <span className="text-gray-400 font-normal text-[10px]">/ {item.frequency}</span></span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3 text-[10px] border border-gray-100 text-center">
                                        <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Req. Date</span>
                                        <span className="font-mono text-gray-600 font-bold">{formatDate(item.requestedDate)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {filteredPending.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <FileText size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No pending subscriptions</p>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Cards - History */}
            {!loading && activeTab === 'history' && (
                <div className="md:hidden flex flex-col gap-4">
                    {filteredHistory.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3 items-start">
                                    <div className="h-10 w-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.subscriptionNo}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${item.approval === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                                }`}>
                                                {item.approval}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.approvalNo}</h3>
                                        <p className="text-sm text-gray-500 mt-0.5 font-medium">{item.approvedBy}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 text-[10px] border border-gray-100">
                                <div>
                                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Approval Date</span>
                                    <span className="font-mono text-gray-600 font-bold">{formatDate(item.approvalDate)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <FileText size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No approval history</p>
                        </div>
                    )}
                </div>
            )}

            {/* Approval Action Modal */}
            {isModalOpen && selectedSub && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Subscription Approval</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Approve or Reject Subscription Request</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            {/* Pre-filled Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Subscription No</label>
                                    <div className="font-mono text-gray-700 font-medium">{selectedSub.sn}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Company</label>
                                    <div className="text-gray-900 font-medium">{selectedSub.companyName}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Subscriber</label>
                                    <div className="text-gray-700">{selectedSub.subscriberName}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Subscription</label>
                                    <div className="text-gray-700">{selectedSub.subscriptionName}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Price</label>
                                    <div className="text-gray-900 font-bold">{selectedSub.price}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Frequency</label>
                                    <div className="text-gray-700">{selectedSub.frequency}</div>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-200 mt-2">
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Requested Date</label>
                                    <div className="text-amber-600 font-bold text-sm">{formatDate(selectedSub.requestedDate)}</div>
                                </div>
                            </div>

                            {/* Approval Action Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Approval Action</label>
                                <div className="relative">
                                    <select
                                        value={approvalAction}
                                        onChange={(e) => setApprovalAction(e.target.value as 'Approved' | 'Rejected')}
                                        className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    >
                                        <option value="" disabled>Select Action</option>
                                        <option value="Approved">Approve</option>
                                        <option value="Rejected">Reject</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Remarks</label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Add any remarks or notes (optional)"
                                    rows={3}
                                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save size={16} />
                                    {isSubmitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default SubscriptionApproval;
