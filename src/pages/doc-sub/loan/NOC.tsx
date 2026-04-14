import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Clock, X, FileCheck } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import { toast } from 'react-hot-toast';
import {
    fetchForeclosuresPendingNOC,
    fetchNOCHistory,
    createOrUpdateNOC,
    ForeclosureRequest,
    NOCRecord
} from '../../../utils/doc-utils/loanApi';

// Frontend loan item type for NOC
interface LoanItem {
    id: number;
    sn: string;
    loanName: string;
    bankName: string;
    startDate: string;
    endDate: string;
    requestDate: string;
    documentStatus?: string;
    collectNocStatus?: string;
}

const LoanNOC = () => {
    const { setTitle } = useHeaderStore();
    const [pendingLoans, setPendingLoans] = useState<LoanItem[]>([]);
    const [historyLoans, setHistoryLoans] = useState<LoanItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch data from backend
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch foreclosure requests pending NOC
            const pending = await fetchForeclosuresPendingNOC();
            setPendingLoans(pending.map((req: ForeclosureRequest) => ({
                id: req.id,
                sn: req.serial_no,
                loanName: req.loan_name,
                bankName: req.bank_name,
                startDate: req.loan_start_date?.split('T')[0] || '',
                endDate: req.loan_end_date?.split('T')[0] || '',
                requestDate: req.request_date?.split('T')[0] || '',
                documentStatus: 'Yes'
            })));

            // Fetch NOC history
            const history = await fetchNOCHistory();
            setHistoryLoans(history.map((noc: NOCRecord) => ({
                id: noc.id,
                sn: noc.serial_no,
                loanName: noc.loan_name,
                bankName: noc.bank_name,
                startDate: noc.loan_start_date?.split('T')[0] || '',
                endDate: noc.loan_end_date?.split('T')[0] || '',
                requestDate: noc.closure_request_date?.split('T')[0] || '',
                collectNocStatus: noc.collect_noc ? 'Yes' : 'No'
            })));
        } catch (err) {
            console.error('Failed to load NOC data:', err);
            toast.error('Failed to load NOC data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setTitle('Collect NOC');
        loadData();
    }, [setTitle, loadData]);

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null);
    const [collectNoc, setCollectNoc] = useState('Yes');

    // Filter by search
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
        setCollectNoc('Yes');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLoan) return;

        try {
            await createOrUpdateNOC({
                serial_no: selectedLoan.sn,
                loan_name: selectedLoan.loanName,
                bank_name: selectedLoan.bankName,
                loan_start_date: selectedLoan.startDate,
                loan_end_date: selectedLoan.endDate,
                closure_request_date: selectedLoan.requestDate,
                collect_noc: collectNoc === 'Yes'
            });

            toast.success('NOC status updated successfully');
            setIsModalOpen(false);
            setSelectedLoan(null);
            loadData(); // Reload data
        } catch (err) {
            console.error('Failed to update NOC:', err);
            toast.error('Failed to update NOC status');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Collect NOC</h1>
                    <p className="text-gray-500 text-sm mt-1">Track NOC collection status</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                                        <th className="p-4">Loan Start Date</th>
                                        <th className="p-4">Loan End Date</th>
                                        <th className="p-4">Closer Request Date</th>
                                        <th className="p-4">Document Status</th>
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
                                            <td className="p-4 text-gray-600">{item.startDate}</td>
                                            <td className="p-4 text-gray-600">{item.endDate}</td>
                                            <td className="p-4 text-gray-600">{item.requestDate}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.documentStatus === 'Yes'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.documentStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPending.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">No pending NOC collections</td>
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
                                            <FileCheck size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{item.loanName}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.bankName}</p>
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
                                        <span>Loan Start Date:</span>
                                        <span className="font-medium text-gray-900">{item.startDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan End Date:</span>
                                        <span className="font-medium text-gray-900">{item.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Closer Request Date:</span>
                                        <span className="font-medium text-gray-900">{item.requestDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Document Status:</span>
                                        <span className={`font-medium ${item.documentStatus === 'Yes' ? 'text-green-600' : 'text-red-600'
                                            }`}>{item.documentStatus}</span>
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
                                        <th className="p-4">Loan Start Date</th>
                                        <th className="p-4">Loan End Date</th>
                                        <th className="p-4">Closer Request Date</th>
                                        <th className="p-4">Collect NOC</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-gray-50">
                                    {filteredHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{item.sn}</td>
                                            <td className="p-4 font-medium text-gray-900">{item.loanName}</td>
                                            <td className="p-4 text-gray-600">{item.bankName}</td>
                                            <td className="p-4 text-gray-600">{item.startDate}</td>
                                            <td className="p-4 text-gray-600">{item.endDate}</td>
                                            <td className="p-4 text-gray-600">{item.requestDate}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.collectNocStatus === 'Yes'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.collectNocStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-500">No NOC history found</td>
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
                                            <p className="text-xs text-gray-500 mt-0.5">{item.bankName}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.collectNocStatus === 'Yes'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        NOC: {item.collectNocStatus}
                                    </span>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan Start Date:</span>
                                        <span className="font-medium text-gray-900">{item.startDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Loan End Date:</span>
                                        <span className="font-medium text-gray-900">{item.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Closer Request Date:</span>
                                        <span className="font-medium text-gray-900">{item.requestDate}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Action Modal */}
            {isModalOpen && selectedLoan && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">Collect NOC</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                                    <span className="block text-gray-500">Loan Start Date</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.startDate}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Loan End Date</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.endDate}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500">Closer Request Date</span>
                                    <span className="font-medium text-gray-900">{selectedLoan.requestDate}</span>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Collect NOC</label>
                                <select
                                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                                    value={collectNoc}
                                    onChange={e => setCollectNoc(e.target.value)}
                                >
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 shadow-md transition-all active:scale-[0.98]"
                                >
                                    Save
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

export default LoanNOC;
