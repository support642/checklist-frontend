import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Download, Edit, MessageCircle, RefreshCw, Save, X, Mail } from 'lucide-react';
import useHeaderStore from '../../../store/headerStore';
import AddDocument from './AddDocument';
import ShareEmailModal from './ShareEmailModal';


import { formatDate } from '../../../utils/doc-utils/dateFormatter';
import { toast } from 'react-hot-toast';
import { 
    fetchAllDocuments, 
    mapBackendToFrontend, 
    updateDocument, 
    createDocument,
    shareEmail,
    BackendDocument
} from '../../../utils/doc-utils/documentApi';
import useAuthStore from '../../../store/authStore';

// Frontend document interface
interface DocumentItem {
    id: string;
    sn: string;
    documentName: string;
    companyName: string;
    documentType: string;
    category: string;
    needsRenewal: boolean;
    renewalDate?: string;
    file: string | null;
    fileContent?: string;
    date: string;
    status: string;
}

const AllDocuments = () => {
    const { setTitle } = useHeaderStore();
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const { currentUser } = useAuthStore();
    const isAdmin = currentUser?.role && ['admin', 'super_admin', 'div_admin'].includes(currentUser.role);

    // Fetch documents from backend
    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllDocuments();
            let filteredData = data;
            
            if (!isAdmin) {
                filteredData = data.filter((doc: BackendDocument) => 
                    (doc.person_name === currentUser?.name) || 
                    (doc.company_department === currentUser?.name)
                );
            }

            setDocuments(filteredData.map((doc: BackendDocument) => mapBackendToFrontend(doc)));
        } catch (err) {
            console.error('Failed to load documents:', err);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [isAdmin, currentUser]);

    useEffect(() => {
        setTitle('All Document');
        loadDocuments();
    }, [setTitle, loadDocuments]);

    const filteredData = documents.filter(item => {
        const matchesSearch = item.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sn.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory ? item.category === filterCategory : true;

        return matchesSearch && matchesCategory;
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredData.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredData.map(d => d.id)));
        }
    };

    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<DocumentItem>>({});
    
    // Share Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
    const [shareMode, setShareMode] = useState<'email' | 'whatsapp'>('email');

    const handleOpenShareModal = (doc: DocumentItem, mode: 'email' | 'whatsapp') => {
        setShareDoc(doc);
        setShareMode(mode);
        setIsEmailModalOpen(true);
    };

    const handleSendEmail = async (recipientName: string, recipientEmail: string, recipientPhone: string, message: string) => {
        if (!shareDoc) return;
        
        try {
            // Call our real email sharing API
            await shareEmail({
                recipientName,
                recipientEmail,
                recipientPhone,
                message,
                documentId: Number(shareDoc.id)
            });
            
            toast.success(`Document shared with ${recipientName} successfully via ${shareMode === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
        } catch (err) {
            console.error('Failed to share document:', err);
            toast.error(`Failed to share document via ${shareMode === 'whatsapp' ? 'WhatsApp' : 'Email'}`);
        }
    };

    const handleEdit = (item: DocumentItem) => {
        setEditingDocId(item.id);
        setEditFormData({ ...item });
    };

    const handleCancelEdit = () => {
        setEditingDocId(null);
        setEditFormData({});
    };

    const handleSaveEdit = async () => {
        if (!editingDocId) return;
        try {
            await updateDocument(parseInt(editingDocId), {
                document_name: editFormData.documentName,
                document_type: editFormData.documentType,
                category: editFormData.category,
                person_name: editFormData.companyName,
                need_renewal: editFormData.needsRenewal ? 'yes' : 'no',
                renewal_date: editFormData.renewalDate,
            });
            toast.success('Document updated successfully');
            setEditingDocId(null);
            loadDocuments();
        } catch (err) {
            console.error('Update failed:', err);
            toast.error('Failed to update document');
        }
    };

    const handleDownload = (fileContent: string | undefined, fileName: string | null) => {
        if (!fileContent) {
            alert("File content not available for download.");
            return;
        }

        // If it's an S3 URL (starts with http), open in new tab
        if (fileContent.startsWith('http://') || fileContent.startsWith('https://')) {
            window.open(fileContent, '_blank');
            return;
        }

        // For base64 data, download as file
        const link = document.createElement('a');
        link.href = fileContent;
        link.download = fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="space-y-3">
                {/* Search and Action Bar */}
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-xl shadow-input">
                    <div className="min-h-[38px] flex items-center">
                        {selectedIds.size > 0 ? (
                            <div className="flex flex-wrap items-center gap-3 animate-fade-in-right w-full sm:w-auto">
                                <span className="text-sm text-purple-600 font-semibold bg-purple-50 px-3 py-1 rounded-full border border-purple-100 whitespace-nowrap">
                                    {selectedIds.size} Selected
                                </span>
                                <div className="hidden sm:block h-4 w-px bg-gray-200 mx-1"></div>
                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">

                                </div>
                            </div>
                        ) : (
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">All Documents</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage your documents repository</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                        <div className="relative flex-1 sm:flex-initial">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Search className="h-5 w-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search documents..."
                                className="pl-10 pr-4 py-2.5 w-full shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="appearance-none pl-4 pr-10 py-2.5 shadow-input border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <option value="">All Categories</option>
                                {/* Dynamic Categories */}
                                {Array.from(new Set(documents.map(d => d.category))).filter(Boolean).sort().map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
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
                            <span>Add New</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:flex flex-col bg-white rounded-xl shadow-input overflow-hidden h-[calc(100vh-350px)]">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="px-3 py-2 w-10 text-center bg-gray-50">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                            checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th className="px-3 py-2 w-12 text-center bg-gray-50">Share</th>
                                    {isAdmin && (
                                        <th className="px-3 py-2 w-20 text-center bg-gray-50">Action</th>
                                    )}
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Serial No</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Document Name</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Document Type</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Category</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Name</th>
                                    <th className="px-3 py-2 whitespace-nowrap text-center bg-gray-50">Renewal</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">Renewal Date</th>
                                    <th className="px-3 py-2 whitespace-nowrap bg-gray-50">File</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {filteredData.map((item) => (
                                    <tr key={item.id} className={`hover:bg-gray-50/80 transition-colors ${selectedIds.has(item.id) ? 'bg-purple-50/30' : ''}`}>
                                        <td className="px-3 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleOpenShareModal(item, 'email')}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Share via Email"
                                                >
                                                    <Mail size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenShareModal(item, 'whatsapp')}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Share via WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-3 py-2 flex justify-center items-center gap-2">
                                                {editingDocId === item.id ? (
                                                    <>
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Save"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-3 py-2 font-bold text-gray-700 text-xs">{item.sn}</td>
                                        <td className="px-3 py-2 text-gray-900">
                                            {editingDocId === item.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 outline-none" 
                                                    value={editFormData.documentName || ''} 
                                                    onChange={e => setEditFormData({...editFormData, documentName: e.target.value})} 
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-gray-400" />
                                                    {item.documentName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {editingDocId === item.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                    value={editFormData.documentType || ''} 
                                                    onChange={e => setEditFormData({...editFormData, documentType: e.target.value})} 
                                                />
                                            ) : item.documentType}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {editingDocId === item.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                    value={editFormData.category || ''} 
                                                    onChange={e => setEditFormData({...editFormData, category: e.target.value})} 
                                                />
                                            ) : (
                                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                                    {item.category}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-gray-900">
                                            {editingDocId === item.id ? (
                                                <input 
                                                    type="text" 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                    value={editFormData.companyName || ''} 
                                                    onChange={e => setEditFormData({...editFormData, companyName: e.target.value})} 
                                                />
                                            ) : item.companyName}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {editingDocId === item.id ? (
                                                <select 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                    value={editFormData.needsRenewal ? 'yes' : 'no'} 
                                                    onChange={e => setEditFormData({...editFormData, needsRenewal: e.target.value === 'yes'})}
                                                >
                                                    <option value="yes">Yes</option>
                                                    <option value="no">No</option>
                                                </select>
                                            ) : (
                                                item.needsRenewal ? (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs font-medium">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-100 rounded text-xs font-medium">
                                                        No
                                                    </span>
                                                )
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                                            {editingDocId === item.id ? (
                                                <input 
                                                    type="date" 
                                                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                                                    value={editFormData.renewalDate || ''} 
                                                    onChange={e => setEditFormData({...editFormData, renewalDate: e.target.value})} 
                                                    disabled={!editFormData.needsRenewal}
                                                />
                                            ) : (
                                                formatDate(item.renewalDate)
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {item.file ? (
                                                <div
                                                    onClick={() => handleDownload(item.fileContent, item.file)}
                                                    className="flex items-center gap-2 text-purple-600 text-xs cursor-pointer hover:underline"
                                                >
                                                    <Download size={14} />
                                                    <span className="truncate max-w-[100px]">View</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredData.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText size={48} className="text-gray-200" />
                                                <p>No documents found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden grid sm:grid-cols-2 gap-4">
                    {filteredData.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-input space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{item.sn}</span>
                                    <h3 className="font-semibold text-gray-900 mt-1">{item.companyName}</h3>
                                    <p className="text-xs text-gray-500">{item.documentType}</p>
                                </div>
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-100">
                                    {item.category}
                                </span>
                            </div>

                            <div className="pt-2 border-t border-gray-50">
                                <div className="flex items-start gap-2 mb-2">
                                    <FileText size={16} className="text-gray-400 mt-0.5 max-w-4" />
                                    <span className="text-sm text-gray-700 font-medium line-clamp-2">{item.documentName}</span>
                                </div>

                                <div className="flex justify-between items-center text-xs mt-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Renewal:</span>
                                        {item.needsRenewal ? (
                                            <span className="text-amber-600 font-medium bg-amber-50 px-1.5 rounded">Yes</span>
                                        ) : (
                                            <span className="text-gray-400 font-medium bg-gray-50 px-1.5 rounded">No</span>
                                        )}
                                    </div>
                                    {item.needsRenewal && (
                                        <span className="font-mono text-red-500 bg-red-50 px-1.5 rounded">{formatDate(item.renewalDate)}</span>
                                    )}
                                </div>

                                <div className="pt-3 mt-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-3">
                                    {item.file ? (
                                        <button
                                            onClick={() => handleDownload(item.fileContent, item.file)}
                                            className="flex items-center gap-1.5 text-purple-600 text-xs font-medium"
                                        >
                                            <Download size={14} />
                                            Download
                                        </button>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )}
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleOpenShareModal(item, 'email')}
                                            className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg"
                                            title="Share via Email"
                                        >
                                            <Mail size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleOpenShareModal(item, 'whatsapp')}
                                            className="p-1.5 text-green-600 bg-green-50 rounded-lg"
                                            title="Share via WhatsApp"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                        {isAdmin && (
                                            editingDocId === item.id ? (
                                                <>
                                                    <button onClick={handleSaveEdit} className="p-1.5 text-green-600 bg-green-50 rounded-lg">
                                                        <Save size={14} />
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 bg-gray-100 rounded-lg">
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-purple-600 bg-purple-50 rounded-lg">
                                                    <Edit size={14} />
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredData.length === 0 && (
                        <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed">
                            <div className="flex flex-col items-center gap-2">
                                <FileText size={40} className="text-gray-200" />
                                <p>No documents found</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <AddDocument isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            
            {shareDoc && (
                <ShareEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => {
                        setIsEmailModalOpen(false);
                        setShareDoc(null);
                    }}
                    onSend={handleSendEmail}
                    documentName={shareDoc.documentName}
                    shareMode={shareMode}
                />
            )}
        </>
    );
};
export default AllDocuments;
