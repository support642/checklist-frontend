import React, { useState, useMemo, useEffect, useCallback } from 'react';
import useAuthStore from '../../../store/authStore';
import useHeaderStore from '../../../store/headerStore';
import { CreditCard, FileText, X, Save, Upload, Download, Search, RefreshCw, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../../utils/doc-utils/dateFormatter';
import {
    fetchPendingPayments,
    fetchPaymentHistory,
    submitPayment,
    PendingPaymentItem,
    PaymentHistoryItem
} from '../../../utils/doc-utils/subscriptionApi';
import { updateSubscription } from '../../../utils/doc-utils/subscriptionApi';

// Frontend display types
interface PendingPaymentDisplay {
    id: string;
    sn: string;
    companyName: string;
    subscriberName: string;
    subscriptionName: string;
    price: string;
    frequency: string;
    purpose: string;
    approvalDate: string;
}

interface PaymentHistoryDisplay {
    id: string;
    subscriptionNo: string;
    paymentMode: string;
    transactionId: string;
    startDate: string;
    insuranceDocument: string | null;
    createdAt: string;
}

const SubscriptionPayment = () => {
    const { setTitle } = useHeaderStore();
    const { currentUser } = useAuthStore();
    const isAdmin = currentUser?.role && ['admin', 'super_admin', 'div_admin'].includes(currentUser.role);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingList, setPendingList] = useState<PendingPaymentDisplay[]>([]);
    const [historyList, setHistoryList] = useState<PaymentHistoryDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTitle('Subscription Payment');
    }, [setTitle]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<PendingPaymentDisplay | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        price: '',
        startDate: '',
        endDate: '',
        paymentMethod: 'Credit Card',
        transactionId: '',
        fileName: '',
        fileContent: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Inline Edit State
    const [editingSubId, setEditingSubId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState({
        companyName: '',
        subscriberName: '',
        subscriptionName: '',
        price: '',
        frequency: ''
    });

    const handleStartEdit = (sub: PendingPaymentDisplay) => {
        setEditingSubId(sub.id);
        setEditFormData({
            companyName: sub.companyName,
            subscriberName: sub.subscriberName,
            subscriptionName: sub.subscriptionName,
            price: sub.price,
            frequency: sub.frequency
        });
    };

    const handleCancelEdit = () => {
        setEditingSubId(null);
    };

    const handleSaveEdit = async (sub: PendingPaymentDisplay) => {
        try {
            await updateSubscription(sub.id, {
                companyName: editFormData.companyName,
                subscriberName: editFormData.subscriberName,
                subscriptionName: editFormData.subscriptionName,
                price: editFormData.price,
                frequency: editFormData.frequency
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
                fetchPendingPayments(),
                fetchPaymentHistory()
            ]);

            // Map pending payments
            setPendingList(pending.map((item: PendingPaymentItem) => ({
                id: String(item.id),
                sn: item.subscription_no,
                companyName: item.company_name || '',
                subscriberName: item.subscriber_name || '',
                subscriptionName: item.subscription_name || '',
                price: item.price || '',
                frequency: item.frequency || '',
                purpose: item.purpose || '',
                approvalDate: item.planned_3 ? new Date(item.planned_3).toLocaleDateString('en-GB') : ''
            })));

            // Map history
            setHistoryList(history.map((item: PaymentHistoryItem) => ({
                id: String(item.id),
                subscriptionNo: item.subscription_no,
                paymentMode: item.payment_mode || '',
                transactionId: item.transaction_id || '',
                startDate: item.start_date || '',
                insuranceDocument: item.insurance_document,
                createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : '',
                subscriberName: (item as any).subscriber_name || ''
            })));

        } catch (err) {
            console.error('Failed to load payment data:', err);
            toast.error('Failed to load payment data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-fill End Date based on Frequency
    useEffect(() => {
        if (paymentForm.startDate && selectedSub?.frequency) {
            const start = new Date(paymentForm.startDate);
            const end = new Date(start);
            const freq = selectedSub.frequency.toLowerCase();

            if (freq.includes('month')) {
                const months = freq.includes('6') ? 6 : 1;
                end.setMonth(end.getMonth() + months);
            } else if (freq.includes('quarter')) {
                end.setMonth(end.getMonth() + 3);
            } else if (freq.includes('year') || freq === 'annual') {
                end.setFullYear(end.getFullYear() + 1);
            }

            // Adjust to end of period (minus 1 day)
            end.setDate(end.getDate() - 1);

            if (!isNaN(end.getTime())) {
                setPaymentForm(prev => ({...prev, endDate: end.toISOString().split('T')[0]}));
            }
        }
    }, [paymentForm.startDate, selectedSub]);

    // Filters
    const filteredPending = useMemo(() => {
        let data = pendingList;

        // Role Filter: If not admin, show only own data
        if (!isAdmin) {
            data = data.filter(item => item.subscriberName === currentUser?.name);
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
            data = data.filter(item => (item as any).subscriberName === currentUser?.name);
        }

        return data.filter(s =>
            s.subscriptionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [historyList, searchTerm, currentUser]);


    const handlePayClick = (sub: PendingPaymentDisplay) => {
        setSelectedSub(sub);
        setPaymentForm({
            price: sub.price || '',
            startDate: '',
            endDate: '',
            paymentMethod: 'Credit Card',
            transactionId: '',
            fileName: '',
            fileContent: ''
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSub(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentForm(prev => ({...prev, fileName: file.name, fileContent: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSub || !paymentForm.startDate || !paymentForm.endDate || isSubmitting) {
            toast.error("Please select Start and End dates");
            return;
        }

        setIsSubmitting(true);
        try {
            await submitPayment({
                subscriptionNo: selectedSub.sn,
                paymentMethod: paymentForm.paymentMethod,
                transactionId: paymentForm.transactionId || `TXN-${Date.now()}`,
                price: paymentForm.price,
                startDate: paymentForm.startDate,
                endDate: paymentForm.endDate,
                planned_1: paymentForm.endDate,
                insuranceDocument: paymentForm.fileContent || undefined,
                companyName: selectedSub.companyName,
                subscriberName: selectedSub.subscriberName,
                subscriptionName: selectedSub.subscriptionName,
                frequency: selectedSub.frequency,
                purpose: selectedSub.purpose
            });

            toast.success("Payment recorded successfully");
            handleCloseModal();
            loadData(); // Refresh data
        } catch (err) {
            console.error('Failed to submit payment:', err);
            toast.error('Failed to submit payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = (content: string | undefined, name: string | undefined) => {
        if (!content) return;
        const link = document.createElement('a');
        link.href = content;
        link.download = name || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscription Payment</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and track subscription payments</p>
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
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-260px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold whitespace-nowrap">
                                <tr>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Edit</th>
                                    <th className="p-4">Subscription No</th>
                                    <th className="p-4">Company</th>
                                    <th className="p-4">Subscriber</th>
                                    <th className="p-4">Subscription</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Frequency</th>
                                    <th className="p-4">Approved On</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredPending.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handlePayClick(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                                            >
                                                <CreditCard size={14} />
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
                                        <td className="p-3 font-mono text-xs font-bold text-gray-700 shrink-0">{item.sn}</td>
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
                                        <td className="p-3"><span className="text-gray-500 whitespace-nowrap">{formatDate(item.approvalDate)}</span></td>
                                    </tr>
                                ))}
                                {filteredPending.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-12 text-center text-gray-500">
                                            No pending payments found.
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
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-260px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold whitespace-nowrap">
                                <tr>
                                    <th className="p-4">Subscription No</th>
                                    <th className="p-4">Payment Mode</th>
                                    <th className="p-4">Transaction ID</th>
                                    <th className="p-4">Start Date</th>
                                    <th className="p-4">Payment Date</th>
                                    <th className="p-4">Document</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {filteredHistory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 font-mono text-sm font-bold text-gray-700">{item.subscriptionNo}</td>
                                        <td className="p-4 text-gray-700">{item.paymentMode}</td>
                                        <td className="p-4 font-mono text-gray-600">{item.transactionId}</td>
                                        <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(item.startDate)}</td>
                                        <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                                        <td className="p-4">
                                            {item.insuranceDocument ? (
                                                <button
                                                    onClick={() => handleDownload(item.insuranceDocument!, 'document')}
                                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                >
                                                    <FileText size={14} /> View
                                                </button>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                    </tr>
                                ))}
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-500">
                                            No payment history found.
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
                                            <div className="h-10 w-10 flex items-center justify-center bg-green-50 text-green-600 rounded-lg shrink-0 mt-0.5">
                                                <CreditCard size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.sn}</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.subscriptionName}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handlePayClick(item)}
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
                                        <div className="col-span-2">
                                            <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Company / Subscription</span>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <span className="font-semibold text-gray-700">{item.companyName}</span>
                                                <span className="text-indigo-600 font-medium">{item.subscriptionName}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Subscriber</span>
                                            <span className="font-semibold text-gray-700">{item.subscriberName}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Frequency</span>
                                            <span className="font-semibold text-gray-700">{item.frequency}</span>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-gray-50 flex justify-between">
                                            <div>
                                                <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Price</span>
                                                <span className="font-bold text-gray-900">{item.price}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-gray-400 mb-0.5 text-[10px] uppercase font-semibold">Approved On</span>
                                                <span className="text-gray-500 font-mono">{formatDate(item.approvalDate)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {filteredPending.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <CreditCard size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No pending payments</p>
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
                                    <div className="h-10 w-10 flex items-center justify-center bg-green-50 text-green-600 rounded-lg shrink-0 mt-0.5">
                                        <CreditCard size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{item.subscriptionNo}</span>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border bg-green-50 text-green-700 border-green-100">
                                                Paid
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{item.paymentMode}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.transactionId}</p>
                                    </div>
                                </div>
                                {item.insuranceDocument && (
                                    <button
                                        onClick={() => handleDownload(item.insuranceDocument!, 'document')}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"
                                    >
                                        <Download size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-[10px] border border-gray-100">
                                <div>
                                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Start Date</span>
                                    <span className="font-mono text-gray-600 font-bold">{formatDate(item.startDate)}</span>
                                </div>
                                <div className="text-right pl-2 border-l border-gray-200">
                                    <span className="block text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Payment Date</span>
                                    <span className="font-mono text-green-600 font-bold">{formatDate(item.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                            <CreditCard size={32} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No payment history</p>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Action Modal */}
            {isModalOpen && selectedSub && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Subscription Payment</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">Record payment for subscription</p>
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
                                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-0.5">Approved On</label>
                                    <div className="text-amber-600 font-bold">{formatDate(selectedSub.approvalDate)}</div>
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Price</label>
                                <input
                                    type="text"
                                    value={paymentForm.price}
                                    onChange={(e) => setPaymentForm({...paymentForm, price: e.target.value})}
                                    placeholder="Enter price"
                                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Payment Method</label>
                                <div className="relative">
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                        className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    >
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction ID */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Transaction ID</label>
                                <input
                                    type="text"
                                    value={paymentForm.transactionId}
                                    onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})}
                                    placeholder="Enter transaction ID (optional)"
                                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Start Date *</label>
                                    <input
                                        type="date"
                                        value={paymentForm.startDate}
                                        onChange={(e) => setPaymentForm({...paymentForm, startDate: e.target.value})}
                                        className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">End Date *</label>
                                    <input
                                        type="date"
                                        value={paymentForm.endDate}
                                        onChange={(e) => setPaymentForm({...paymentForm, endDate: e.target.value})}
                                        className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Upload Receipt</label>
                                <div className="relative">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                                    <div className="w-full py-2.5 px-4 border border-dashed border-indigo-200 rounded-xl text-sm text-indigo-600 flex items-center justify-center gap-2 bg-indigo-50/50 hover:bg-indigo-50 transition-all">
                                        <Upload size={16} /> {paymentForm.fileName ? paymentForm.fileName : 'Choose file (optional)'}
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

export default SubscriptionPayment;
