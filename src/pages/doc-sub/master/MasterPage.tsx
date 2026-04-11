import { useState, useEffect, useCallback } from 'react';
import { Search, Database, Layers, Tag, Building2, Plus } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import AddMaster from './AddMaster';
import { toast } from 'react-hot-toast';
import { fetchAllMasterData, MasterRecord, mapToFrontend, MasterItem } from '../../../utils/doc-utils/masterApi';

const MasterPage = () => {
    const { setTitle } = useHeaderStore();
    const [masterData, setMasterData] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Fetch master data from backend
    const loadMasterData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllMasterData();
            setMasterData(data.map((record: MasterRecord) => mapToFrontend(record)));
        } catch (err) {
            console.error('Failed to load master data:', err);
            toast.error('Failed to load master data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setTitle('Master Data');
        loadMasterData();
    }, [setTitle, loadMasterData]);

    const filteredData = masterData.filter(item =>
        item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="space-y-6 pb-20">
                {/* Unified Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage master data records</p>
                    </div>
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-center">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 whitespace-nowrap font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            Add New
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="p-4 whitespace-nowrap">Company Name</th>
                                    <th className="p-4 whitespace-nowrap">Document Type</th>
                                    <th className="p-4 whitespace-nowrap">Category</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                <Building2 size={18} />
                                            </div>
                                            {item.companyName}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Layers size={16} className="text-gray-400" />
                                                {item.documentType}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                                                <Tag size={14} />
                                                {item.category}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Database size={48} className="text-gray-200" />
                                                <p>No records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <AddMaster isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </>
    );
};

export default MasterPage;
