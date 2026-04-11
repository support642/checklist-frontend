import { useState, useEffect, useCallback } from 'react';
import { Search, Building, Calendar, User, Clock, X } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import { toast } from 'react-hot-toast';
import {
    fetchForeclosureEligibleLoans,
    fetchForeclosureHistory,
    createForeclosureRequest,
    Loan,
    ForeclosureRequest
} from '../../../utils/doc-utils/loanApi';

// Frontend loan item type
interface LoanItem {
    id: number;
    sn: string;
    loanName: string;
    bankName: string;
    amount: string;
    emi: string;
    startDate: string;
    endDate: string;
    providedDocument: string;
    remarks: string;
    requestDate?: string;
    requesterName?: string;
}

const Foreclosure = () => {
    const { setTitle } = useHeaderStore();
    const [pendingLoans, setPendingLoans] = useState<LoanItem[]>([]);
    const [historyLoans, setHistoryLoans] = useState<LoanItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch data from backend
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch eligible loans for foreclosure
            const eligible = await fetchForeclosureEligibleLoans();
            setPendingLoans(eligible.map((loan: Loan) => ({
                id: loan.id,
                sn: `SN-${String(loan.id).padStart(3, '0')}`,
                loanName: loan.loan_name,
                bankName: loan.bank_name,
                amount: `₹${Number(loan.amount).toLocaleString('en-IN')}`,
                emi: `₹${Number(loan.emi).toLocaleString('en-IN')}`,
                startDate: loan.loan_start_date?.split('T')[0] || '',
                endDate: loan.loan_end_date?.split('T')[0] || '',
                providedDocument: loan.provided_document_name || '-',
                remarks: loan.remarks || '-'
            })));

            // Fetch history
            const history = await fetchForeclosureHistory();
            setHistoryLoans(history.map((req: ForeclosureRequest) => ({
                id: req.id,
                sn: req.serial_no,
                loanName: req.loan_name,
                bankName: req.bank_name,
                amount: `₹${Number(req.amount).toLocaleString('en-IN')}`,
                emi: `₹${Number(req.emi).toLocaleString('en-IN')}`,
                startDate: req.loan_start_date?.split('T')[0] || '',
                endDate: req.loan_end_date?.split('T')[0] || '',
                providedDocument: '-',
                remarks: '-',
                requestDate: req.request_date?.split('T')[0] || '',
                requesterName: req.requester_name
            })));
        } catch (err) {
            console.error('Failed to load data:', err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setTitle('Requested Foreclosure');
        loadData();
    }, [setTitle, loadData]);

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null);
    const [formData, setFormData] = useState({
        requestDate: new Date().toLocaleDateString('en-CA'),
        requesterName: 'Admin'
    });

    const filteredPending = pendingLoans.filter(loan =>
        loan.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.loanName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredHistory = historyLoans.filter(loan =>
        loan.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.loanName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleActionClick = (loan: LoanItem) => {
        setSelectedLoan(loan);
        setFormData({
            requestDate: new Date().toLocaleDateString('en-CA'),
            requesterName: 'Admin'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        try {
            // Parse amount and emi back to numbers
            const cleanAmount = selectedLoan.amount.replace(/[₹,\s]/g, '');
            const cleanEmi = selectedLoan.emi.replace(/[₹,\s]/g, '');

            await createForeclosureRequest({
                serial_no: selectedLoan.sn,
                loan_name: selectedLoan.loanName,
                bank_name: selectedLoan.bankName,
                amount: parseFloat(cleanAmount),
                emi: parseFloat(cleanEmi),
                loan_start_date: selectedLoan.startDate,
                loan_end_date: selectedLoan.endDate,
                request_date: formData.requestDate,
                requester_name: formData.requesterName
            });

            toast.success('Foreclosure requested successfully');
            setIsModalOpen(false);
            setSelectedLoan(null);
            loadData(); // Reload data
        } catch (err) {
            console.error('Failed to create request:', err);
            toast.error('Failed to create foreclosure request');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Requested Foreclosure</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage foreclosure requests</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search loans..."
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'pending' ? (
                <>
                    {/* Desktop Table - Pending */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="p-4">Action</th>
                                        <th className="p-4">Serial No.</th>
                                        <th className="p-4">Loan Name</th>
                                        <th className="p-4">Bank Name</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">EMI</th>
                                        <th className="p-4">Loan Start Date</th>
                                        <th className="p-4">Loan End Date</th>
                                        <th className="p-4">Provided Document Name</th>
                                        <th className="p-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-50">
                                    {filteredPending.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleActionClick(item)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                                                >
                                                    Action
                                                </button>
                                            </td>
                                            <td className="p-4 font-medium text-gray-900">{item.sn}</td>
                                            <td className="p-4 font-medium text-gray-900">{item.loanName}</td>
                                            <td className="p-4 text-gray-600">{item.bankName}</td>
                                            <td className="p-4 text-gray-900 font-medium">{item.amount}</td>
                                            <td className="p-4 text-gray-600">{item.emi}</td>
                                            <td className="p-4 text-gray-600">{item.startDate}</td>
                                            <td className="p-4 text-gray-600">{item.endDate}</td>
                                            <td className="p-4 text-gray-600">{item.providedDocument}</td>
                                            <td className="p-4 text-gray-500 italic">{item.remarks}</td>
                                        </tr>
                                    ))}
                                    {filteredPending.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-gray-500">No pending loans found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards - Pending */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {filteredPending.map((item) => (
                            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                                            <Building size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{item.loanName}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.bankName} • {item.sn}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleActionClick(item)}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Action
                                    </button>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Amount:</span>
                                        <span className="font-medium text-gray-900">{item.amount}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>EMI:</span>
                                        <span className="font-medium text-gray-900">{item.emi}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan Start Date:</span>
                                        <span className="font-medium text-gray-900">{item.startDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan End Date:</span>
                                        <span className="font-medium text-gray-900">{item.endDate}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-2 text-xs text-gray-500">
                                        <div className="flex justify-between">
                                            <span className="font-medium">Provided Document Name:</span>
                                            <span>{item.providedDocument}</span>
                                        </div>
                                        {item.remarks && (
                                            <div className="flex justify-between">
                                                <span className="font-medium">Remarks:</span>
                                                <span className="italic">{item.remarks}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* Desktop Table - History */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                        <th className="p-4">Serial No.</th>
                                        <th className="p-4">Loan Name</th>
                                        <th className="p-4">Bank Name</th>
                                        <th className="p-4">Amount</th>
                                        <th className="p-4">EMI</th>
                                        <th className="p-4">Loan Start Date</th>
                                        <th className="p-4">Loan End Date</th>
                                        <th className="p-4">Request Date</th>
                                        <th className="p-4">Requester Name</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-50">
                                    {filteredHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{item.sn}</td>
                                            <td className="p-4 font-medium text-gray-900">{item.loanName}</td>
                                            <td className="p-4 text-gray-600">{item.bankName}</td>
                                            <td className="p-4 text-gray-900 font-medium">{item.amount}</td>
                                            <td className="p-4 text-gray-600">{item.emi}</td>
                                            <td className="p-4 text-gray-600">{item.startDate}</td>
                                            <td className="p-4 text-gray-600">{item.endDate}</td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    {item.requestDate}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <User size={14} className="text-gray-400" />
                                                    {item.requesterName}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-gray-500">No foreclosure history found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Cards - History */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                        {filteredHistory.map((item) => (
                            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-gray-50 text-gray-600 rounded-xl">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{item.loanName}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.bankName} • {item.sn}</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        Requested
                                    </span>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Amount:</span>
                                        <span className="font-medium text-gray-900">{item.amount}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>EMI:</span>
                                        <span className="font-medium text-gray-900">{item.emi}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan Start Date:</span>
                                        <span className="font-medium text-gray-900">{item.startDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan End Date:</span>
                                        <span className="font-medium text-gray-900">{item.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Requester Name:</span>
                                        <span className="font-medium text-gray-900">{item.requesterName}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Request Date:</span>
                                        <span className="font-medium text-gray-900">{item.requestDate}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Action Modal */}
            {isModalOpen && selectedLoan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">Request Foreclosure</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {/* Read Only Fields */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500">Serial No.</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.sn}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Loan Name</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.loanName}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Bank Name</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.bankName}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Amount</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.amount}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">EMI</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.emi}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Loan Start Date</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.startDate}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Loan End Date</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.endDate}</span>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Input Fields */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Request Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    value={formData.requestDate}
                                    onChange={e => setFormData({ ...formData, requestDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Requester Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    value={formData.requesterName}
                                    onChange={e => setFormData({ ...formData, requesterName: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 shadow-md"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Foreclosure;
