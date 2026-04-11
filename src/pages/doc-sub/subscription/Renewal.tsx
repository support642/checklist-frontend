import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../../../store/authStore';
import useHeaderStore from '../../../store/headerStore';
import { RotateCcw, X, Check, Save, Search, RefreshCw, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../../utils/doc-utils/dateFormatter';
import {
    fetchPendingRenewals,
    fetchRenewalHistory,
    submitRenewal,
    PendingRenewalItem,
    RenewalHistoryItem
} from '../../../utils/doc-utils/subscriptionApi';
import { updateSubscription } from '../../../utils/doc-utils/subscriptionApi';

// Frontend display types
interface PendingRenewalDisplay {
    id: string;
    sn: string;
    companyName: string;
    subscriberName: string;
    subscriptionName: string;
    price: string;
    frequency: string;
    endDate: string;
}

interface RenewalHistoryDisplay {
    id: string;
    renewalNo: string;
    subscriptionNo: string;
    renewalStatus: string;
    approvedBy: string;
    price: string;
    createdAt: string;
}

const SubscriptionRenewal = () => {
    const { setTitle } = useHeaderStore();
    const { currentUser } = useAuthStore();
    const isAdmin = currentUser?.role && ['admin', 'super_admin', 'div_admin'].includes(currentUser.role);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingList, setPendingList] = useState<PendingRenewalDisplay[]>([]);
    const [historyList, setHistoryList] = useState<RenewalHistoryDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTitle('Subscription Renewal');
    }, [setTitle]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<PendingRenewalDisplay | null>(null);
    const [renewalAction, setRenewalAction] = useState<'Approved' | 'Rejected' | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Edit State
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        companyName: '',
        subscriberName: '',
        subscriptionName: '',
        price: '',
        frequency: '',
        endDate: ''
    });

    const handleStartEdit = (sub: PendingRenewalDisplay) => {
        setEditingSubId(sub.id);
        setEditFormData({
            companyName: sub.companyName,
            subscriberName: sub.subscriberName,
            subscriptionName: sub.subscriptionName,
            price: sub.price,
            frequency: sub.frequency,
            endDate: sub.endDate
        });
    };

    const handleCancelEdit = () => {
        setEditingSubId(null);
    };

    const handleSaveEdit = async (sub: PendingRenewalDisplay) => {
        try {
            await updateSubscription(sub.id, {
                companyName: editFormData.companyName,
                subscriberName: editFormData.subscriberName,
                subscriptionName: editFormData.subscriptionName,
                price: editFormData.price,
                frequency: editFormData.frequency,
                endDate: editFormData.endDate
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
                fetchPendingRenewals(),
                fetchRenewalHistory()
            ]);

            // Map pending renewals
            // Map pending renewals

            setPendingList(pending.map((item: PendingRenewalItem) => ({
                id: String(item.id),
                sn: item.subscription_no,
                companyName: item.company_name || '',
                subscriberName: item.subscriber_name || '',
                subscriptionName: item.subscription_name || '',
                price: item.price || '',
                frequency: item.frequency || '',
                endDate: item.end_date || '',
                reasonForRenewal: item.reason_for_renewal || '',
            }))
                .filter((item: any) => {
                    // Check if planned_1 exists and is valid based on 7-day logic
                    const originalItem = pending.find((p: PendingRenewalItem) => String(p.id) === item.id);

                    if (!originalItem?.planned_1) {

                        return false;
                    }

                    const plannedDate = new Date(originalItem.planned_1);
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() + 7);

                    const isValid = plannedDate <= cutoffDate;


                    return isValid;
                }));

            // Map history
            setHistoryList(history.map((item: RenewalHistoryItem) => ({
                id: String(item.id),
                renewalNo: item.renewal_no,
                subscriptionNo: item.subscription_no,
                renewalStatus: item.renewal_status,
                approvedBy: item.approved_by || '',
                price: item.price || '',
                createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : '',
                subscriberName: (item as any).subscriber_name || ''
            })));

        } catch (err) {
            console.error('Failed to load renewal data:', err);
            toast.error('Failed to load renewal data');
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
            data = data.filter(item => item.subscriberName === currentUser?.name);
        }

        return data.filter(sub =>
            sub.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.sn.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pendingList, searchTerm, currentUser]);

    const filteredHistory = useMemo(() => {
        let data = historyList;

        // Role Filter
        if (!isAdmin) {
            data = data.filter(item => (item as any).subscriberName === currentUser?.name);
        }

        return data.filter(item =>
            item.subscriptionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.renewalNo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [historyList, searchTerm, currentUser]);

    const handleAction = (sub: PendingRenewalDisplay) => {
        setSelectedSub(sub);
        setRenewalAction('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSub(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSub || !renewalAction || isSubmitting) {
            toast.error("Please select an action");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitRenewal({
                subscription_no: selectedSub.sn,
                renewal_status: renewalAction,
                approved_by: 'Admin', // TODO: get from auth context
                price: selectedSub.price
            });

            toast.success(renewalAction === 'Approved'
                ? 'Subscription Renewal Approved!'
                : 'Subscription Renewal Rejected');
            handleCloseModal();
            loadData(); // Refresh data
        } catch (err) {
            console.error('Failed to submit renewal:', err);
            toast.error('Failed to submit renewal');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Renewals</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage pending and history of subscription renewals</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
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
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-350px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="p-3 text-center w-24 bg-gray-50">Action</th>
                                    <th className="p-3 text-center bg-gray-50">Edit</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Subscription No</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Company</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Subscriber</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Subscription</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Frequency</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Price</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">End Date</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredPending.length > 0 ? (
                                    filteredPending.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleAction(sub)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                                                >
                                                    <RotateCcw size={14} />
                                                    Action
                                                </button>
                                            </td>
                                            <td className="p-3 text-center">
                                                {editingSubId === sub.id ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handleSaveEdit(sub)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                                            <Save size={16} />
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Cancel">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleStartEdit(sub)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3 font-mono font-bold text-xs text-gray-700">{sub.sn}</td>
                                            <td className="p-3">
                                                {editingSubId === sub.id ? (
                                                    <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-gray-900" value={editFormData.companyName} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} />
                                                ) : (
                                                    <span className="font-medium text-gray-900">{sub.companyName}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {editingSubId === sub.id ? (
                                                    <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-gray-600" value={editFormData.subscriberName} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} />
                                                ) : (
                                                    <span className="text-gray-600">{sub.subscriberName}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {editingSubId === sub.id ? (
                                                    <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-gray-900" value={editFormData.subscriptionName} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} />
                                                ) : (
                                                    <span className="text-gray-900">{sub.subscriptionName}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {editingSubId === sub.id ? (
                                                    <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-indigo-700 bg-indigo-50 font-medium" value={editFormData.frequency} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})} />
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{sub.frequency}</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {editingSubId === sub.id ? (
                                                    <input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-gray-900" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} />
                                                ) : (
                                                    <span className="font-medium text-gray-900">{sub.price}</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {editingSubId === sub.id ? (
                                                    <input type="date" className="w-full p-1.5 border border-amber-300 rounded text-xs focus:ring-1 focus:ring-amber-500 outline-none" value={editFormData.endDate} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} />
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-medium">
                                                        {formatDate(sub.endDate)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className='p-3 text-center'>
                                                {(sub as any).reasonForRenewal && (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-medium">
                                                        {(sub as any).reasonForRenewal}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="p-12 text-center">
                                            <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                                <div className="h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                                                    <Check size={32} />
                                                </div>
                                                <h3 className="text-gray-900 font-bold text-lg">All Caught Up!</h3>
                                                <p className="text-gray-500 text-sm mt-1">No subscriptions require renewal at this time.</p>
                                            </div>
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
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-350px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Renewal Number</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Subscription No</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Approved By</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Price</th>
                                    <th className="p-3 whitespace-nowrap bg-gray-50">Date</th>
                                    <th className="p-3 whitespace-nowrap text-center bg-gray-50">Renewal Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredHistory.length > 0 ? (
                                    filteredHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-3 font-mono font-bold text-xs text-indigo-600">{item.renewalNo}</td>
                                            <td className="p-3 font-mono text-xs text-gray-700">{item.subscriptionNo}</td>
                                            <td className="p-3 text-gray-600">{item.approvedBy}</td>
                                            <td className="p-3 font-medium text-gray-900">{item.price}</td>
                                            <td className="p-3 text-gray-500 font-mono text-xs">{formatDate(item.createdAt)}</td>
                                            <td className="p-3 text-center">
                                                {item.renewalStatus === 'Approved' ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-100">
                                                        <Check size={12} /> Approved
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-red-100">
                                                        <X size={12} /> Rejected
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500">
                                            <p>No renewal history available</p>
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
                    {filteredPending.length > 0 ? (
                        filteredPending.map((sub) => (
                            <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                                {editingSubId === sub.id ? (
                                    <>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{sub.sn}</span>
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Company</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.companyName} onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} /></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Subscriber</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.subscriberName} onChange={e => setEditFormData({...editFormData, subscriberName: e.target.value})} /></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Subscription</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.subscriptionName} onChange={e => setEditFormData({...editFormData, subscriptionName: e.target.value})} /></div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Price</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} /></div>
                                                <div><label className="text-[10px] text-gray-400 uppercase font-semibold">Frequency</label><input type="text" className="w-full p-1.5 border border-gray-300 rounded text-xs mt-0.5" value={editFormData.frequency} onChange={e => setEditFormData({...editFormData, frequency: e.target.value})} /></div>
                                            </div>
                                            <div><label className="text-[10px] text-gray-400 uppercase font-semibold">End Date</label><input type="date" className="w-full p-1.5 border border-amber-300 rounded text-xs mt-0.5" value={editFormData.endDate} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} /></div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                            <button onClick={handleCancelEdit} className="px-3 py-1.5 text-gray-500 text-xs font-bold rounded-lg border border-gray-200">Cancel</button>
                                            <button onClick={() => handleSaveEdit(sub)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">Save</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-3 items-start">
                                                <div className="h-10 w-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg shrink-0 mt-0.5">
                                                    <RotateCcw size={20} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{sub.sn}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border bg-amber-50 text-amber-700 border-amber-100">
                                                            Expiring
                                                        </span>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{sub.subscriptionName}</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">{sub.companyName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAction(sub)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-200"
                                                >
                                                    Action
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(sub)}
                                                    className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold rounded-lg flex items-center gap-1"
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-dashed border-gray-100">
                                            <div>
                                                <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Subscriber</span>
                                                <span className="font-semibold text-gray-700">{sub.subscriberName}</span>
                                            </div>
                                            <div>
                                                <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Price / Freq</span>
                                                <span className="font-bold text-gray-900">{sub.price} <span className="text-gray-400 font-normal text-[10px]">/ {sub.frequency}</span></span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-lg p-3 text-[10px] border border-gray-100 text-center">
                                            <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">End Date</span>
                                            <span className="font-mono text-amber-600 font-bold">{formatDate(sub.endDate)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <Check size={32} className="mb-2 opacity-50 text-green-500" />
                            <p className="text-sm font-medium">No pending renewals</p>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Cards - History */}
            {!loading && activeTab === 'history' && (
                <div className="md:hidden flex flex-col gap-4">
                    {filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-start">
                                        <div className="h-10 w-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                                            <RotateCcw size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.subscriptionNo}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${item.renewalStatus === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {item.renewalStatus}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.renewalNo}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.approvedBy}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-dashed border-gray-100">
                                    <div>
                                        <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Price</span>
                                        <span className="font-bold text-gray-900">{item.price}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Date</span>
                                        <span className="font-mono text-gray-600 font-medium">{formatDate(item.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <RotateCcw size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No renewal history</p>
                        </div>
                    )}
                </div>
            )}

            {/* Action Popup Modal */}
            {isModalOpen && selectedSub && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Subscription Renewal</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Approve or Reject Subscription Renewal</p>
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
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Frequency</label>
                                    <div className="text-gray-700">{selectedSub.frequency}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Price</label>
                                    <div className="text-gray-900 font-bold">{selectedSub.price}</div>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-200 mt-2">
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Current End Date</label>
                                    <div className="text-amber-600 font-bold text-sm">{formatDate(selectedSub.endDate)}</div>
                                </div>
                            </div>

                            {/* Renewal Subscription Dropdown */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Renewal Subscription</label>
                                <div className="relative">
                                    <select
                                        value={renewalAction}
                                        onChange={(e) => setRenewalAction(e.target.value as 'Approved' | 'Rejected')}
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
                </div>
            )}
        </div>
    );
};

export default SubscriptionRenewal;
