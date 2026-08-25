import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, 
    QrCode, FileText, Pencil, Activity, FileSpreadsheet, Download, X, RotateCcw
} from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';
import { useGetProductsQuery } from '../../redux/asset-redux/slices/productApi';
import AddProductModal from '../../components/asset-components/AddProductModal';
import QuickAddAssetModal from '../../components/asset-components/QuickAddAssetModal';
import QRCodeModal from '../../components/asset-components/QRCodeModal';
import BulkQRModal from '../../components/asset-components/BulkQRModal';
import Footer from '../../components/asset-components/Footer';
import { formatTimestampToDDMMYYYY } from '../../utils/dateUtils';

// Helper to calculate live running hours dynamically from initial creation date
export const calculateLiveRunningHours = (initialDate, baseHours = 0, status = 'Active', operationalStatus = 'Running') => {
    const base = Number(baseHours) || 0;
    if (!initialDate) return base.toFixed(1);
    
    // If status is inactive or machine is down, preserve base hours
    if (status === 'Inactive' || operationalStatus === 'Breakdown' || operationalStatus === 'Idle') {
        return base.toFixed(1);
    }

    const start = new Date(initialDate).getTime();
    const now = Date.now();

    if (isNaN(start) || start > now) return base.toFixed(1);

    const elapsedHours = (now - start) / (1000 * 60 * 60);
    const total = base + elapsedHours;
    return total.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

// Product Card for Mobile View - RICH & DETAILED
const ProductCard = ({ product, onShowQR, onEdit }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-4">
        {/* Header: SN & Actions */}
        <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-sm">{product.sn}</span>
            <div className="flex items-center gap-1">
                <button onClick={() => onEdit(product)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
                    <Pencil size={16} />
                </button>
                <button onClick={() => onShowQR(product)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-full">
                    <QrCode size={16} />
                </button>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.status}
                </span>
            </div>
        </div>

        {/* Title & Brand */}
        <div>
            <h3 className="font-bold text-slate-900 text-base leading-tight">{product.productName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{product.brand} • {product.model}</p>
        </div>

        {/* Live Running Hours Pill on Mobile */}
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Running Hours
            </span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
                {calculateLiveRunningHours(product.initialEntryDate, product.runningHours, product.status, product.operationalStatus)} hrs
            </span>
        </div>

        {/* 3-Column Key Stats */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-slate-50">
            <div className="text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Area</p>
                <p className="text-xs font-semibold text-slate-700 truncate">{product.machineArea || product.location || '—'}</p>
            </div>
            <div className="text-center border-l border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Dept / Div</p>
                <p className="text-xs font-semibold text-slate-700 truncate">{product.department || product.division || '—'}</p>
            </div>
            <div className="text-center border-l border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Value</p>
                <p className="text-xs font-semibold text-green-700">{product.assetValue ? `₹${product.assetValue}` : '—'}</p>
            </div>
        </div>

        {/* Details List */}
        <div className="space-y-2 text-xs">
            <div className="flex justify-between">
                <span className="text-slate-500">Initial Entry:</span>
                <span className="text-slate-700 font-medium flex items-center gap-1">
                    {formatTimestampToDDMMYYYY(product.initialEntryDate) || '—'}
                    {product.isFromMachineParts && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-semibold">Machine Parts</span>
                    )}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-500">Asset Date:</span>
                <span className="text-slate-700 font-medium">{formatTimestampToDDMMYYYY(product.assetDate)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-500">Warranty:</span>
                <span className={`font-medium ${product.warrantyAvailable === 'Yes' ? 'text-green-600' : 'text-slate-400'}`}>
                    {product.warrantyAvailable === 'Yes' ? `Yes (Till ${formatTimestampToDDMMYYYY(product.warrantyEnd)})` : 'No'}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-500">Assigned To:</span>
                <span className="text-slate-700 font-medium">{product.assignedTo || '—'}</span>
            </div>

            {/* Repair Highlight Section */}
            <div className="bg-slate-50 rounded-lg p-2 mt-2 space-y-1.5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                    <span className="font-semibold text-slate-600">Repair History</span>
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{product.repairCount} Repairs</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Last Repair:</span>
                    <span className="text-slate-700">{formatTimestampToDDMMYYYY(product.lastRepairDate) || 'Never'}</span>
                </div>
                {product.repairCost && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">Last Cost:</span>
                        <span className="text-red-600 font-medium">₹{product.repairCost}</span>
                    </div>
                )}
                {product.partChanged === 'Yes' && (
                    <div className="pt-1">
                        <span className="text-slate-500 block mb-1">Parts Changed:</span>
                        <div className="flex flex-wrap gap-1">
                            {(product.partNames || []).slice(0, 3).map((p, i) => (
                                <span key={i} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                    {p}
                                </span>
                            ))}
                            {(product.partNames?.length > 3) && <span className="text-[10px] text-slate-400 self-center">+{product.partNames.length - 3} more</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);

const AllProducts = () => {
    const { data: products = [], isLoading, isError, refetch: clearAndReloadDummy } = useGetProductsQuery();
    
    // Live tick state to refresh running hour calculations in real-time
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 30000); // Ticks every 30 seconds
        return () => clearInterval(timer);
    }, []);

    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);
    const [isBulkQROpen, setIsBulkQROpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [divisionFilter, setDivisionFilter] = useState('all');
    const [productNameFilter, setProductNameFilter] = useState('all');

    // Extract unique filter options from products
    const departmentOptions = React.useMemo(() => {
        const set = new Set();
        products.forEach(p => {
            if (p.department && typeof p.department === 'string') {
                const cleaned = p.department.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        return Array.from(set).sort();
    }, [products]);

    const divisionOptions = React.useMemo(() => {
        const set = new Set();
        products.forEach(p => {
            if (p.division && typeof p.division === 'string') {
                const cleaned = p.division.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        return Array.from(set).sort();
    }, [products]);

    const productNameOptions = React.useMemo(() => {
        const set = new Set();
        products.forEach(p => {
            if (p.productName && typeof p.productName === 'string') {
                const cleaned = p.productName.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        return Array.from(set).sort();
    }, [products]);

    const filteredProducts = products.filter(product => {
        // Multi-field search
        const term = searchTerm.trim().toLowerCase();
        const matchesSearch = !term || (
            product.productName?.toLowerCase().includes(term) ||
            product.sn?.toLowerCase().includes(term) ||
            product.category?.toLowerCase().includes(term) ||
            product.brand?.toLowerCase().includes(term) ||
            product.model?.toLowerCase().includes(term) ||
            product.sku?.toLowerCase().includes(term) ||
            product.department?.toLowerCase().includes(term) ||
            product.division?.toLowerCase().includes(term) ||
            product.location?.toLowerCase().includes(term) ||
            product.assignedTo?.toLowerCase().includes(term)
        );

        const matchesDepartment = departmentFilter === 'all' || product.department === departmentFilter;
        const matchesDivision = divisionFilter === 'all' || product.division === divisionFilter;
        const matchesProductName = productNameFilter === 'all' || product.productName === productNameFilter;

        return matchesSearch && matchesDepartment && matchesDivision && matchesProductName;
    });

    const hasActiveFilters = Boolean(searchTerm || departmentFilter !== 'all' || divisionFilter !== 'all' || productNameFilter !== 'all');

    const handleClearFilters = () => {
        setSearchTerm('');
        setDepartmentFilter('all');
        setDivisionFilter('all');
        setProductNameFilter('all');
    };

    // Excel / CSV Export
    const handleExportExcel = () => {
        if (!filteredProducts.length) {
            toast.error('No products available to export');
            return;
        }

        const dataToExport = filteredProducts.map((p, index) => {
            const liveHours = calculateLiveRunningHours(p.initialEntryDate, p.runningHours, p.status, p.operationalStatus);
            const specsList = Array.isArray(p.specs)
                ? p.specs.map(s => typeof s === 'string' ? s : (s.name ? (s.value ? `${s.name}: ${s.value}` : s.name) : s.value || '')).filter(Boolean).join(', ')
                : '';
            const partsChangedList = Array.isArray(p.partNames) ? p.partNames.filter(Boolean).join(', ') : '';

            return {
                'S.No': index + 1,
                'Serial No / Asset Tag': p.sn || '',
                'Product / Equipment Name': p.productName || '',
                'Category': p.category || '',
                'Type': p.type || '',
                'Brand': p.brand || '',
                'Model': p.model || '',
                'Serial Number': p.serialNo || '',
                'SKU': p.sku || '',
                'Manufacturing Date': formatTimestampToDDMMYYYY(p.mfgDate) || '',
                'Origin': p.origin || '',
                'Status': p.status || '',
                'Operational Status': p.operationalStatus || '',
                'Live Running Hours': `${liveHours} hrs`,
                'Initial Entry Date': formatTimestampToDDMMYYYY(p.initialEntryDate) || '',
                'Entry Source': p.isFromMachineParts ? 'Machine Parts Master' : 'Direct Entry',
                'Asset / Purchase Date': formatTimestampToDDMMYYYY(p.assetDate) || '',
                'Invoice No': p.invoiceNo || '',
                'Cost (₹)': p.cost || p.assetValue || '',
                'Quantity': p.quantity || '1',
                'Supplier / Vendor': p.supplierName || '',
                'Supplier Contact': p.supplierPhone || '',
                'Supplier Email': p.supplierEmail || '',
                'Payment Mode': p.paymentMode || '',
                'Location / Plant': p.location || '',
                'Division': p.division || '',
                'Department': p.department || '',
                'Machine Area / Bay': p.machineArea || '',
                'Assigned Custodian': p.assignedTo || '',
                'Responsible Supervisor': p.responsiblePerson || '',
                'Storage Location': p.storageLoc || '',
                'Usage Type': p.usageType || '',
                'Warranty Available': p.warrantyAvailable || '',
                'Warranty Provider': p.warrantyProvider || '',
                'Warranty End Date': formatTimestampToDDMMYYYY(p.warrantyEnd) || '',
                'AMC Available': p.amc || '',
                'AMC Provider': p.amcProvider || '',
                'AMC End Date': formatTimestampToDDMMYYYY(p.amcEnd) || '',
                'Maintenance Required': p.maintenanceRequired || '',
                'Maintenance Type': p.maintenanceType || '',
                'Maintenance Priority': p.priority || '',
                'Maintenance Frequency': p.frequency || '',
                'Next Service Date': formatTimestampToDDMMYYYY(p.nextService) || '',
                'Last Repair Date': formatTimestampToDDMMYYYY(p.lastRepairDate) || 'Never',
                'Last Repair Cost (₹)': p.repairCost || '0',
                'Total Repairs Count': p.repairCount || '0',
                'Total Repair Cost (₹)': p.totalRepairCost || '0',
                'Parts Changed': p.partChanged || 'No',
                'Replaced Parts': partsChangedList,
                'Parts / Specifications': specsList,
                'Depreciation Method': p.depMethod || '',
                'Depreciation Rate (%)': p.depRate || '',
                'Asset Life (Years)': p.assetLife || '',
                'Residual Value (₹)': p.residualValue || '',
                'Condition': p.condition || '',
                'Internal Notes': p.internalNotes || '',
                'Usage Remarks': p.usageRemarks || '',
                'Created By': p.createdBy || '',
                'Created Date': formatTimestampToDDMMYYYY(p.createdDate) || ''
            };
        });

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', url);
        link.setAttribute('download', `Assets_Master_Report_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${dataToExport.length} assets to Excel`);
    };

    const handleReloadDummy = () => {
        if (confirm('This will replace all products with fresh dummy data. Continue?')) {
            clearAndReloadDummy();
        }
    };

    const handleShowQR = (product) => {
        setSelectedProduct(product);
        setIsQRModalOpen(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleAddProduct = () => {
        setIsQuickAddOpen(true);
    };

    const handleOpenFullDetailsFromQuickAdd = (newProduct) => {
        setEditingProduct(newProduct);
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="p-8 text-center flex-1 mt-20">Loading products...</div>;
    if (isError) return <div className="p-8 text-center text-red-500 flex-1">Error fetching products.</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <div className="flex-1 w-full min-h-0 flex flex-col gap-3.5 p-3 sm:p-4 lg:p-6 overflow-hidden">
                {/* Top Toolbar */}
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                        {/* Title hidden on mobile to avoid double header */}
                        <div className="hidden lg:flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">All Products</h1>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                                {filteredProducts.length} of {products.length} Assets
                            </span>
                        </div>

                        {/* Actions Group */}
                        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
                            <button
                                onClick={handleReloadDummy}
                                className="bg-white hover:bg-slate-50 text-slate-600 p-2.5 rounded-xl flex items-center justify-center transition-colors border border-slate-200 shadow-xs cursor-pointer"
                                title="Reload Data"
                            >
                                <RefreshCw size={19} />
                            </button>

                            <button
                                onClick={handleExportExcel}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-emerald-200 shadow-xs font-semibold text-xs sm:text-sm cursor-pointer"
                                title="Download All Products to Excel / CSV"
                            >
                                <FileSpreadsheet size={18} className="text-emerald-600" />
                                <span>Excel Download</span>
                            </button>

                            <button
                                onClick={() => setIsBulkQROpen(true)}
                                className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors border border-purple-200 shadow-xs font-semibold text-xs sm:text-sm cursor-pointer"
                                title="Generate QR PDF"
                            >
                                <FileText size={18} />
                                <span className="hidden sm:inline">QR PDF</span>
                            </button>

                            <button
                                onClick={handleAddProduct}
                                className="flex-1 lg:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors font-medium shadow-purple-200/50 cursor-pointer text-xs sm:text-sm"
                            >
                                <Plus size={18} />
                                <span>Add Product</span>
                            </button>
                        </div>
                    </div>

                    {/* Search & Multi-Dropdown Filter Bar */}
                    <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
                        {/* Text Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, SN, brand, model, staff..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-purple-600 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Filters Group */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
                            {/* Department Filter */}
                            <div className="relative">
                                <select
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                    className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer transition-all ${
                                        departmentFilter !== 'all' 
                                            ? 'bg-purple-50 border-purple-300 text-purple-900' 
                                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <option value="all">All Departments</option>
                                    {departmentOptions.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Division Filter */}
                            <div className="relative">
                                <select
                                    value={divisionFilter}
                                    onChange={(e) => setDivisionFilter(e.target.value)}
                                    className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer transition-all ${
                                        divisionFilter !== 'all' 
                                            ? 'bg-purple-50 border-purple-300 text-purple-900' 
                                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <option value="all">All Divisions</option>
                                    {divisionOptions.map((div) => (
                                        <option key={div} value={div}>{div}</option>
                                    ))}
                                </select>
                                <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Product Name Filter */}
                            <div className="relative">
                                <select
                                    value={productNameFilter}
                                    onChange={(e) => setProductNameFilter(e.target.value)}
                                    className={`w-full px-3 py-2 pr-7 text-xs sm:text-sm font-semibold rounded-xl border appearance-none outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer transition-all ${
                                        productNameFilter !== 'all' 
                                            ? 'bg-purple-50 border-purple-300 text-purple-900' 
                                            : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <option value="all">All Products</option>
                                    {productNameOptions.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <Filter size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Reset Filters Action */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>


            {/* Mobile Card View (Scrollable) */}
            <div className="md:hidden flex-1 overflow-y-auto space-y-4 pr-1">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onShowQR={handleShowQR} onEdit={handleEditProduct} />
                    ))
                ) : (
                    <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                        No products found.
                    </div>
                )}
            </div>

            {/* Desktop Table View - Full Width with Horizontal Scroll */}
            <div className="hidden md:flex flex-1 min-h-0 flex-col bg-white rounded-t-xl shadow-sm border-x border-t border-slate-100 border-b overflow-hidden">
                <div className="flex-1 overflow-auto w-full relative custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 sticky top-0 z-20 shadow-sm">
                            <tr>
                                {/* Actions */}
                                <th className="px-4 py-3 sticky left-0 top-0 z-30 bg-slate-50 drop-shadow-sm">Actions</th>
                                {/* Section 1: Basic Info */}
                                <th className="px-4 py-3">Serial No</th>
                                <th className="px-4 py-3">Product Name</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Brand</th>
                                <th className="px-4 py-3">Model</th>
                                <th className="px-4 py-3">SKU</th>
                                <th className="px-4 py-3">Mfg Date</th>
                                <th className="px-4 py-3">Origin</th>
                                <th className="px-4 py-3">Status</th>
                                {/* Section: Operational & Initial Entry */}
                                <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50/50">Live Running Hours</th>
                                <th className="px-4 py-3">Initial Entry</th>
                                {/* Section 2: Asset Info */}
                                <th className="px-4 py-3">Asset Date</th>
                                <th className="px-4 py-3">Invoice No</th>
                                <th className="px-4 py-3 text-right">Cost</th>
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3">Supplier</th>
                                <th className="px-4 py-3">Payment</th>
                                {/* Section 3: Location */}
                                <th className="px-4 py-3">Location</th>
                                <th className="px-4 py-3">Division</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Machine Area</th>
                                <th className="px-4 py-3">Assigned To</th>
                                <th className="px-4 py-3">Responsible</th>
                                {/* Section 4: Warranty */}
                                <th className="px-4 py-3">Warranty</th>
                                <th className="px-4 py-3">AMC</th>
                                {/* Section 5: Maintenance */}
                                <th className="px-4 py-3">Maintenance</th>
                                <th className="px-4 py-3">Priority</th>
                                {/* Section 10: Repair History */}
                                <th className="px-4 py-3">Last Repair</th>
                                <th className="px-4 py-3 text-right">Last Cost</th>
                                <th className="px-4 py-3">Part Chg?</th>
                                <th className="px-4 py-3">Part 1</th>
                                <th className="px-4 py-3">Part 2</th>
                                <th className="px-4 py-3">Part 3</th>
                                <th className="px-4 py-3">Part 4</th>
                                <th className="px-4 py-3">Part 5</th>
                                <th className="px-4 py-3 text-center">Count</th>
                                <th className="px-4 py-3 text-right">Total Cost</th>
                                {/* Section 8: Financial */}
                                <th className="px-4 py-3 text-right">Asset Value</th>
                                <th className="px-4 py-3">Dep. Method</th>
                                {/* Section 10: System */}
                                <th className="px-4 py-3">Created By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                        {/* Actions - QR Code Button */}
                                        <td className="px-4 py-3 sticky left-0 bg-white flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditProduct(product)}
                                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Edit Product"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleShowQR(product)}
                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                title="View QR Code"
                                            >
                                                <QrCode size={18} />
                                            </button>
                                        </td>
                                        {/* Section 1 */}
                                        <td className="px-4 py-3 font-medium text-purple-700">{product.sn}</td>
                                        <td className="px-4 py-3 text-slate-900 font-medium">{product.productName}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.category}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.type}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.brand}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.model}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatTimestampToDDMMYYYY(product.mfgDate)}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.origin}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        {/* Section: Operational & Initial Entry */}
                                        <td className="px-4 py-3 text-right bg-emerald-50/20">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                {calculateLiveRunningHours(product.initialEntryDate, product.runningHours, product.status, product.operationalStatus)} hrs
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">
                                                    {formatTimestampToDDMMYYYY(product.initialEntryDate) || '—'}
                                                </span>
                                                {product.isFromMachineParts ? (
                                                    <span className="text-[10px] text-purple-600 font-semibold">From Machine Parts</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Direct Entry</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Section 2 */}
                                        <td className="px-4 py-3 text-slate-600">{formatTimestampToDDMMYYYY(product.assetDate)}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.invoiceNo}</td>
                                        <td className="px-4 py-3 text-right text-slate-900">₹{product.cost}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.quantity}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.supplierName}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.paymentMode}</td>
                                        {/* Section 3 */}
                                        <td className="px-4 py-3 text-slate-600">{product.location || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.division || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.department || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.machineArea || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.assignedTo || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.responsiblePerson || '—'}</td>
                                        {/* Section 4 */}
                                        <td className="px-4 py-3 text-slate-600">{product.warrantyAvailable}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.amc}</td>
                                        {/* Section 5 */}
                                        <td className="px-4 py-3 text-slate-600">{product.maintenanceRequired}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.priority || '-'}</td>
                                        {/* Section 10: Repair History */}
                                        <td className="px-4 py-3 text-slate-600">{formatTimestampToDDMMYYYY(product.lastRepairDate)}</td>
                                        <td className="px-4 py-3 text-right text-slate-900">{product.repairCost ? `₹${product.repairCost}` : '-'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.partChanged}</td>

                                        <td className="px-4 py-3 text-slate-600 font-normal border-l border-slate-50">{product.partNames?.[0] || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-normal">{product.partNames?.[1] || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-normal">{product.partNames?.[2] || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-normal">{product.partNames?.[3] || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 font-normal border-r border-slate-50">{product.partNames?.[4] || '-'}</td>

                                        <td className="px-4 py-3 text-center text-slate-600">{product.repairCount}</td>
                                        <td className="px-4 py-3 text-right text-slate-900 font-medium">₹{product.totalRepairCost}</td>
                                        {/* Section 8 */}
                                        <td className="px-4 py-3 text-right text-slate-900">₹{product.assetValue}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.depMethod}</td>
                                        {/* Section 10 */}
                                        <td className="px-4 py-3 text-slate-600">{product.createdBy}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="28" className="px-4 py-12 text-center text-slate-500">
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>



            <QuickAddAssetModal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                onOpenFullDetails={handleOpenFullDetailsFromQuickAdd}
            />
            <AddProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={editingProduct}
            />
            <QRCodeModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                product={selectedProduct}
            />
            <BulkQRModal
                isOpen={isBulkQROpen}
                onClose={() => setIsBulkQROpen(false)}
                products={products}
            />
            </div>
            {/* <Footer className="pb-8 pt-4 shrink-0" /> */}
        </div>
    );
};

export default AllProducts;
