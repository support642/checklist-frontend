// ProductView.jsx with Context usage
import React from 'react';
import { useParams } from 'react-router-dom';
import { useGetProductsQuery } from '../../redux/asset-redux/slices/productApi';
import Footer from '../../components/asset-components/Footer';
import { Package, MapPin, Shield, Wrench, DollarSign, FileText, Building2, Tag, Globe, CreditCard, Clock, CheckCircle, XCircle, Calendar, Activity } from 'lucide-react';
import { formatTimestampToDDMMYYYY } from '../../utils/dateUtils';
import { calculateLiveRunningHours } from './AllProducts';

const ProductView = () => {
    const { productId } = useParams();
    const { data: products = [], isLoading } = useGetProductsQuery(); 

    if (isLoading) return <div className="p-8 text-center mt-20 text-slate-500">Loading Product details...</div>;

    const product = products.find(p => p.sn === productId || p.id === parseInt(productId));

    if (!product) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center border border-slate-200">
                    <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Package size={40} className="text-slate-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h1>
                    <p className="text-slate-500 mb-4 text-sm">The product you're looking for doesn't exist or has been removed.</p>
                    <div className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">ID: {productId}</div>
                </div>
            </div>
        );
    }

    const isActive = product.status === 'Active';

    return (
        <div className="w-full bg-slate-50 min-h-full">
            {/* Hero Header - Professional Light Purple Palette */}
            <div className="bg-[#f5f3ff] shadow-sm border-b border-purple-100 relative overflow-hidden">
                {/* Subtle Decorative Pattern */}
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                    <div className="absolute -right-4 -top-8 w-32 h-32 bg-purple-200/50 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left: Product Identity */}
                        <div className="text-left">
                            <h1 className="text-2xl font-black text-purple-950 leading-tight mb-2 tracking-tight">
                                {product.productName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-purple-200 px-3 py-1 rounded-md border border-purple-300/50">
                                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">SN:</span>
                                    <span className="text-purple-900 font-mono text-xs font-bold leading-none">{product.sn}</span>
                                </div>
                                <span className="text-purple-400 text-xs font-bold uppercase tracking-widest leading-none">
                                    {product.brand}
                                </span>
                            </div>
                        </div>

                        {/* Right: Badge & Logo */}
                        <div className="flex flex-col items-end gap-3 shrink-0">
                            <img
                                src="/Rama_TMT_logo.png"
                                alt="Logo"
                                className="h-10 w-auto bg-purple-50 p-1.5 rounded-lg border border-purple-100"
                            />
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-purple-700 border border-purple-100 shadow-sm">
                                {isActive ? (
                                    <CheckCircle size={14} className="text-green-600" />
                                ) : (
                                    <XCircle size={14} className="text-red-600" />
                                )}
                                <span className="text-[11px] font-black uppercase tracking-tight">
                                    {product.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 w-full">

                {/* Key Metrics - 2x2 Grid on Mobile */}
                <div className="grid grid-cols-2 gap-3 relative z-10">
                    <MetricCard
                        label="Cost"
                        value={`₹${parseInt(product.cost).toLocaleString()}`}
                        icon={DollarSign}
                        color="bg-green-500"
                    />
                    <MetricCard
                        label="Asset Value"
                        value={`₹${parseInt(product.assetValue).toLocaleString()}`}
                        icon={TrendingUp}
                        color="bg-purple-600"
                    />
                    <MetricCard
                        label="Quantity"
                        value={product.quantity}
                        icon={Package}
                        color="bg-purple-500"
                    />
                    <MetricCard
                        label="Asset Life"
                        value={`${product.assetLife} Yrs`}
                        icon={Clock}
                        color="bg-amber-500"
                    />
                </div>

                {/* Operational & Live Running Hours Card */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-inner">
                            <Activity size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Running Hours
                            </p>
                            <p className="text-xl font-mono font-bold text-emerald-950">
                                {calculateLiveRunningHours(product.initialEntryDate, product.runningHours, product.status, product.operationalStatus)} hrs
                            </p>
                        </div>
                    </div>
                    <div className="text-right text-xs">
                        <span className="text-slate-500 block">Initial Entry:</span>
                        <span className="font-semibold text-slate-800">{formatTimestampToDDMMYYYY(product.initialEntryDate) || '—'}</span>
                        {product.isFromMachineParts && (
                            <span className="inline-block mt-0.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                                Machine Parts
                            </span>
                        )}
                    </div>
                </div>

                {/* Info Cards - Stacked on Mobile */}
                <InfoCard title="Basic Information" icon={Package} color="bg-purple-600">
                    <InfoRow label="Type" value={product.type} />
                    <InfoRow label="Model" value={product.model} />
                    <InfoRow label="SKU" value={product.sku} />
                    <InfoRow label="Serial No" value={product.serialNo} />
                    <InfoRow label="Mfg Date" value={formatTimestampToDDMMYYYY(product.mfgDate)} />
                    <InfoRow label="Initial Entry" value={formatTimestampToDDMMYYYY(product.initialEntryDate)} />
                </InfoCard>

                <InfoCard title="Asset Details" icon={CreditCard} color="bg-green-500">
                    <InfoRow label="Asset Date" value={formatTimestampToDDMMYYYY(product.assetDate)} />
                    <InfoRow label="Invoice No" value={product.invoiceNo} />
                    <InfoRow label="Supplier" value={product.supplierName} />
                    <InfoRow label="Payment" value={product.paymentMode} />
                    <InfoRow label="Contact" value={product.supplierPhone} />
                </InfoCard>

                <InfoCard title="Location & Ownership" icon={MapPin} color="bg-purple-700">
                    <InfoRow label="Location" value={product.location} />
                    <InfoRow label="Department" value={product.department} />
                    <InfoRow label="Assigned To" value={product.assignedTo} />
                    <InfoRow label="Storage" value={product.storageLoc} />
                    <InfoRow label="Responsible" value={product.responsiblePerson} />
                </InfoCard>

                <InfoCard title="Warranty & Service" icon={Shield} color="bg-teal-500">
                    <InfoRow label="Warranty" value={product.warrantyAvailable} highlight={product.warrantyAvailable === 'Yes'} />
                    <InfoRow label="Provider" value={product.warrantyProvider || '-'} />
                    <InfoRow label="Valid Till" value={formatTimestampToDDMMYYYY(product.warrantyEnd) || '-'} />
                    <InfoRow label="AMC" value={product.amc} highlight={product.amc === 'Yes'} />
                    <InfoRow label="AMC Provider" value={product.amcProvider || '-'} />
                </InfoCard>

                <InfoCard title="Maintenance" icon={Wrench} color="bg-orange-500">
                    <InfoRow label="Required" value={product.maintenanceRequired} highlight={product.maintenanceRequired === 'Yes'} />
                    <InfoRow label="Type" value={product.maintenanceType || '-'} />
                    <InfoRow label="Frequency" value={product.frequency || '-'} />
                    <InfoRow label="Next Service" value={formatTimestampToDDMMYYYY(product.nextService) || '-'} />
                    <InfoRow label="Technician" value={product.technician || '-'} />
                </InfoCard>

                <InfoCard title="Financial" icon={DollarSign} color="bg-emerald-500">
                    <InfoRow label="Asset Value" value={`₹${parseInt(product.assetValue).toLocaleString()}`} />
                    <InfoRow label="Dep Method" value={product.depMethod} />
                    <InfoRow label="Dep Rate" value={`${product.depRate}%`} />
                    <InfoRow label="Residual" value={`₹${parseInt(product.residualValue).toLocaleString()}`} />
                </InfoCard>

                {/* Repair & Parts Details Card */}
                <InfoCard title="Repair & Parts History" icon={Wrench} color="bg-rose-500">
                    <InfoRow label="Last Repair" value={formatTimestampToDDMMYYYY(product.lastRepairDate)} />
                    <InfoRow label="Last Cost" value={product.repairCost ? `₹${product.repairCost}` : '-'} />
                    <InfoRow label="Parts Changed?" value={product.partChanged} highlight={product.partChanged === 'Yes'} />
                    <InfoRow label="Total Repairs" value={product.repairCount} />
                    <InfoRow label="Total Cost" value={product.totalRepairCost ? `₹${product.totalRepairCost}` : '-'} />

                    {product.partNames && product.partNames.length > 0 && (
                        <div className="p-4 border-t border-purple-100">
                            <p className="text-xs text-slate-500 mb-2">Parts Replaced</p>
                            <div className="flex flex-wrap gap-2">
                                {product.partNames.map((part, index) => (
                                    <span key={index} className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-xs font-medium border border-rose-100">
                                        {part}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </InfoCard>

                {/* Notes Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-purple-100 flex items-center gap-3 bg-purple-50/50">
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <FileText size={14} className="text-white" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm uppercase lg:tracking-wider">Notes & Condition</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {product.internalNotes && (
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Internal Notes</p>
                                <p className="text-sm text-slate-800 leading-relaxed">{product.internalNotes}</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Condition</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${product.condition === 'Good' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {product.condition}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Record Info Footer - Simplified */}
                <div className="text-center py-4 mt-6 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mb-1">
                        <Calendar size={12} />
                        Created {formatTimestampToDDMMYYYY(product.createdDate)}
                    </div>
                    <p className="text-slate-300 text-xs">
                        by {product.createdBy}
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
};

// Metric Card Component - Compact for Mobile
const MetricCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 hover:border-purple-200 transition-colors">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-2 shadow-inner group-hover:scale-110 transition-transform`}>
            <Icon size={16} className="text-white" />
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{label}</p>
    </div>
);

// TrendingUp icon component
const TrendingUp = ({ size, className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);

// Info Card Component - Mobile Optimized
const InfoCard = ({ title, icon: Icon, color, children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                <Icon size={14} className="text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        </div>
        <div className="p-4 space-y-2">
            {children}
        </div>
    </div>
);

// Info Row Component - Compact
const InfoRow = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 -mx-2 px-2 rounded transition-colors group">
        <span className="text-slate-700 text-xs sm:text-sm font-medium tracking-tight group-hover:text-slate-900">{label}</span>
        <span className={`text-[11px] sm:text-[13px] font-black text-right uppercase tracking-tight ${highlight ? 'text-green-600' : 'text-slate-800'}`}>
            {value || '-'}
        </span>
    </div>
);

export default ProductView;
