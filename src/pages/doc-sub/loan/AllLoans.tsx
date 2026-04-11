import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Banknote, Calendar, DollarSign, Building, FileText } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import AddLoan from './AddLoan';
import { toast } from 'react-hot-toast';
import { fetchAllLoans, Loan } from '../../../utils/doc-utils/loanApi';

// Frontend adapted loan item
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
    file: string | null;
    fileContent?: string;
    remarks: string;
}

const AllLoans = () => {
    const { setTitle } = useHeaderStore();
    const [loans, setLoans] = useState<LoanItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch loans from backend
    const loadLoans = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllLoans();
            // Map backend format to frontend format
            setLoans(data.map((loan: Loan) => ({
                id: loan.id,
                sn: `SN-${String(loan.id).padStart(3, '0')}`,
                loanName: loan.loan_name,
                bankName: loan.bank_name,
                amount: `₹${Number(loan.amount).toLocaleString('en-IN')}`,
                emi: `₹${Number(loan.emi).toLocaleString('en-IN')}`,
                startDate: loan.loan_start_date?.split('T')[0] || '',
                endDate: loan.loan_end_date?.split('T')[0] || '',
                providedDocument: loan.provided_document_name || '-',
                file: loan.upload_document ? getFileName(loan.upload_document) : null,
                fileContent: loan.upload_document || undefined,
                remarks: loan.remarks || '-'
            })));
        } catch (err) {
            console.error('Failed to load loans:', err);
            toast.error('Failed to load loans');
        } finally {
            setLoading(false);
        }
    }, []);

    // Extract filename from URL or path
    const getFileName = (url: string): string => {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1] || 'document';
    };

    useEffect(() => {
        setTitle('All Loans');
        loadLoans();
    }, [setTitle, loadLoans]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterBank, setFilterBank] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const filteredData = loans.filter(item => {
        const matchesSearch = item.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.loanName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBank = filterBank ? item.bankName === filterBank : true;

        return matchesSearch && matchesBank;
    });

    return (
        <>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">All Loans</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage your outstanding loans</p>
                    </div>
                    <div className="flex w-full sm:w-auto gap-3">
                        <div className="relative flex-1 sm:flex-initial">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search loans..."
                                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={filterBank}
                                onChange={(e) => setFilterBank(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors w-full sm:w-auto"
                            >
                                <option value="">All Banks</option>
                                {Array.from(new Set(loans.map(l => l.bankName))).filter(Boolean).sort().map(bank => (
                                    <option key={bank} value={bank}>{bank}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Add New</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input overflow-hidden h-[calc(100vh-250px)]">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50">
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="px-3 py-2">Serial No.</th>
                                    <th className="px-3 py-2">Loan Name</th>
                                    <th className="px-3 py-2">Bank Name</th>
                                    <th className="px-3 py-2">Amount</th>
                                    <th className="px-3 py-2">EMI</th>
                                    <th className="px-3 py-2">Loan Start Date</th>
                                    <th className="px-3 py-2">Loan End Date</th>
                                    <th className="px-3 py-2">Provided Document Name</th>
                                    <th className="px-3 py-2">File</th>
                                    <th className="px-3 py-2">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.sn}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.loanName}</td>
                                        <td className="px-3 py-2 text-gray-600 flex items-center gap-2">
                                            <Building size={16} className="text-purple-500" />
                                            {item.bankName}
                                        </td>
                                        <td className="px-3 py-2 text-gray-900 font-medium">{item.amount}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.emi}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.startDate}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.endDate}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.providedDocument}</td>
                                        <td className="px-3 py-2">
                                            {item.file ? (
                                                <a href={item.fileContent || '#'} download={item.file} className="flex items-center gap-2 text-purple-600 hover:text-purple-800" title={item.file}>
                                                    <FileText size={18} />
                                                    <span className="text-xs truncate max-w-[100px] hidden xl:inline">{item.file}</span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 italic">{item.remarks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden grid grid-cols-1 gap-4">
                    {filteredData.map((item) => (
                        <div key={item.id} className="bg-white p-5 rounded-xl shadow-input hover:shadow-md transition-shadow">
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
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                    Active
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <span>Serial No.</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.sn}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <DollarSign size={16} />
                                        <span>Amount</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.amount}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Banknote size={16} />
                                        <span>EMI</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.emi}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Calendar size={16} />
                                        <span>Loan Start Date</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.startDate}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Calendar size={16} />
                                        <span>Loan End Date</span>
                                    </div>
                                    <span className="font-medium text-gray-900">{item.endDate}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 text-xs text-gray-500">
                                    <div className="flex justify-between">
                                        <span className="font-medium">Provided Document Name:</span>
                                        <span>{item.providedDocument}</span>
                                    </div>
                                    {item.file && (
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">File:</span>
                                            <a href={item.fileContent || '#'} download={item.file} className="flex items-center gap-1 text-purple-600">
                                                <FileText size={14} />
                                                <span>{item.file}</span>
                                            </a>
                                        </div>
                                    )}
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
                    {filteredData.length === 0 && (
                        <div className="text-center p-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                            No loans found
                        </div>
                    )}
                </div>
            </div>
            <AddLoan isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </>
    );
};

export default AllLoans;
