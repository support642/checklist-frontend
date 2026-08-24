import React, { useState, useEffect } from 'react';
import { 
    X, Upload, Plus, Trash2, CheckCircle2, Circle, 
    Layers, DollarSign, MapPin, Shield, Wrench, FileText, 
    Cpu, Activity, FileCheck, ArrowRight, ArrowLeft, Save, Mic, MicOff,
    ChevronDown, Check, DownloadCloud, Sparkles
} from 'lucide-react';
import { useAddProductMutation, useUpdateProductMutation, useGetAssetUsersQuery, useGetMachinePartsListQuery } from '../../redux/asset-redux/slices/productApi';
import SearchableInput from '../doc-sub-components/SearchableInput';
import { toast } from 'react-hot-toast';

const InputField = ({ label, name, type = "text", value, onChange, placeholder, options, required = false, onVoiceInput, isListeningField }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type !== 'select' && onVoiceInput && (
                <button
                    type="button"
                    onClick={() => onVoiceInput(name)}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        isListeningField 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                    }`}
                    title={`Dictate ${label}`}
                >
                    <Mic size={12} />
                    <span>{isListeningField ? 'Listening...' : 'Voice'}</span>
                </button>
            )}
        </div>
        {type === 'select' ? (
            <select
                name={name}
                value={value ?? ""}
                onChange={onChange}
                className="w-full px-3.5 py-3 sm:py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all cursor-pointer shadow-sm min-h-[44px]"
                required={required}
            >
                <option value="">Select {label}</option>
                {options.map((opt, idx) => (
                    <option key={`${opt}-${idx}`} value={opt}>{opt}</option>
                ))}
            </select>
        ) : type === 'textarea' ? (
            <div className="relative">
                <textarea
                    name={name}
                    value={value ?? ""}
                    onChange={onChange}
                    rows="3"
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-sm resize-none"
                    placeholder={placeholder}
                />
            </div>
        ) : (
            <input
                type={type}
                name={name}
                value={value ?? ""}
                onChange={onChange}
                className="w-full px-3.5 py-3 sm:py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-sm min-h-[44px]"
                placeholder={placeholder}
                required={required}
            />
        )}
    </div>
);

const AddProductModal = ({ isOpen, onClose, product = null, defaultSection = 0 }) => {
    const [addProduct, { isLoading: isAdding }] = useAddProductMutation();
    const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
    const { data: users = [] } = useGetAssetUsersQuery();
    const { data: machinePartsList = [] } = useGetMachinePartsListQuery();
    const userOptions = [...new Set(users.map(u => u.user_name).filter(Boolean))];

    const [activeSection, setActiveSection] = useState(defaultSection);
    const [isMobileSectionOpen, setIsMobileSectionOpen] = useState(false);
    const [selectedMachineId, setSelectedMachineId] = useState('');
    const fileInputRef = React.useRef(null);
    const [listeningField, setListeningField] = useState(null);

    const [formData, setFormData] = useState({
        // Section 0: Basic Info
        productName: '', category: 'Machinery', type: 'Asset', brand: '', model: '', serialNo: '', sku: '', mfgDate: '', origin: '', status: 'Active',
        // Section 1: Location & Custody (With Equipment area/division)
        location: '', department: '', division: '', machineArea: '', assignedTo: '', usageType: 'Internal', storageLoc: '', responsiblePerson: '',
        // Section 2: Procurement & Financial (With Equipment purchase date)
        assetDate: '', invoiceNo: '', assetValue: '', quantity: '1', supplierName: '', supplierPhone: '', supplierEmail: '', paymentMode: '',
        depMethod: 'Straight Line', depRate: '', assetLife: '', residualValue: '',
        // Section 3: Warranty & AMC
        warrantyAvailable: 'No', warrantyProvider: '', warrantyStart: '', warrantyEnd: '', amc: 'No', amcProvider: '', amcStart: '', amcEnd: '', serviceContact: '',
        // Section 4: Operational & Maintenance (Unified with Equipment History)
        runningHours: 0, installationDate: '', operationalStatus: 'Running',
        maintenanceRequired: 'No', maintenanceType: 'Preventive', frequency: 'Monthly', nextService: '', priority: 'Medium', technician: '', maintenanceNotes: '',
        // Section 5: Technical Specs (Adaptive)
        specs: [],
        // Section 6: Notes & Remarks
        internalNotes: '', usageRemarks: '', condition: 'Good',
        // Documents
        documents: [],
    });

    // Extract unique, clean departments dynamically from machine_parts table
    const dynamicDepartments = React.useMemo(() => {
        const set = new Set();
        machinePartsList.forEach(m => {
            if (m.machine_department && typeof m.machine_department === 'string') {
                const cleaned = m.machine_department.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        if (formData?.department && formData.department.trim()) {
            set.add(formData.department.trim());
        }
        const arr = Array.from(set).sort();
        return arr.length > 0 ? arr : ['Mechanical', 'Electrical', 'Operation', 'Washery', 'CCM', 'Dispatch', 'Account', 'Auto Mobile'];
    }, [machinePartsList, formData?.department]);

    // Extract unique, clean divisions dynamically from machine_parts table
    const dynamicDivisions = React.useMemo(() => {
        const set = new Set();
        machinePartsList.forEach(m => {
            if (m.machine_division && typeof m.machine_division === 'string') {
                const cleaned = m.machine_division.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        if (formData?.division && formData.division.trim()) {
            set.add(formData.division.trim());
        }
        const arr = Array.from(set).sort();
        return arr.length > 0 ? arr : ['SID', 'SMS', 'CPP', 'Rolling Mill', 'RM', 'Admin'];
    }, [machinePartsList, formData?.division]);

    // Extract unique machine areas from machine_parts table
    const dynamicAreas = React.useMemo(() => {
        const set = new Set();
        machinePartsList.forEach(m => {
            if (m.machine_area && typeof m.machine_area === 'string') {
                const cleaned = m.machine_area.trim();
                if (cleaned) set.add(cleaned);
            }
        });
        if (formData?.machineArea && formData.machineArea.trim()) {
            set.add(formData.machineArea.trim());
        }
        return Array.from(set).sort();
    }, [machinePartsList, formData?.machineArea]);

    useEffect(() => {
        if (isOpen) {
            setActiveSection(defaultSection || 0);
            setIsMobileSectionOpen(false);
            setListeningField(null);
            if (product) {
                setFormData({
                    ...product,
                    category: product.category || 'Machinery',
                    status: product.status || 'Active',
                    operationalStatus: product.operationalStatus || 'Running',
                    runningHours: product.runningHours || 0,
                    specs: product.specs || [],
                    documents: product.documents || []
                });
            } else {
                setFormData({
                    productName: '', category: 'Machinery', type: 'Asset', brand: '', model: '', serialNo: '', sku: '', mfgDate: '', origin: '', status: 'Active',
                    location: '', department: '', division: '', machineArea: '', assignedTo: '', usageType: 'Internal', storageLoc: '', responsiblePerson: '',
                    assetDate: '', invoiceNo: '', assetValue: '', quantity: '1', supplierName: '', supplierPhone: '', supplierEmail: '', paymentMode: '',
                    depMethod: 'Straight Line', depRate: '', assetLife: '', residualValue: '',
                    warrantyAvailable: 'No', warrantyProvider: '', warrantyStart: '', warrantyEnd: '', amc: 'No', amcProvider: '', amcStart: '', amcEnd: '', serviceContact: '',
                    runningHours: 0, installationDate: '', operationalStatus: 'Running',
                    maintenanceRequired: 'No', maintenanceType: 'Preventive', frequency: 'Monthly', nextService: '', priority: 'Medium', technician: '', maintenanceNotes: '',
                    specs: [],
                    internalNotes: '', usageRemarks: '', condition: 'Good',
                    documents: [],
                });
            }
        }
    }, [isOpen, product, defaultSection]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle importing an existing machine from machine_parts master table
    const handleSelectExistingMachine = (machineId) => {
        setSelectedMachineId(machineId);
        if (!machineId) return;

        const found = machinePartsList.find(m => String(m.id) === String(machineId));
        if (found) {
            // Build default specs from parts if available
            const partSpecs = Array.isArray(found.part_name) 
                ? found.part_name.filter(Boolean).map(p => ({ name: 'Part Component', value: p }))
                : (found.part_name ? [{ name: 'Part Component', value: found.part_name }] : []);

            setFormData(prev => ({
                ...prev,
                productName: found.machine_name || prev.productName,
                category: 'Machinery',
                machineId: found.id,
                initialEntryDate: found.created_at || prev.initialEntryDate || new Date().toISOString(),
                division: found.machine_division ? found.machine_division.trim() : prev.division,
                department: found.machine_department ? found.machine_department.trim() : prev.department,
                machineArea: found.machine_area ? found.machine_area.trim() : prev.machineArea,
                specs: prev.specs.length > 0 ? prev.specs : partSpecs,
            }));
            toast.success(`Imported details for ${found.machine_name} (${found.machine_department || ''} - ${found.machine_division || ''})`);
        }
    };

    const handleSpecChange = (index, field, value) => {
        const newSpecs = [...formData.specs];
        newSpecs[index][field] = value;
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const addSpec = () => {
        setFormData(prev => ({ ...prev, specs: [...prev.specs, { name: '', value: '' }] }));
    };

    const removeSpec = (index) => {
        const newSpecs = formData.specs.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, specs: newSpecs }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), ...files] }));
    };

    const removeFile = (index) => {
        setFormData(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }));
    };

    // Universal Voice to Text Dictation for any form field
    const handleVoiceDictate = (fieldName) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice dictation is not supported in this browser.');
            return;
        }

        if (listeningField === fieldName) {
            setListeningField(null);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onstart = () => {
                setListeningField(fieldName);
                toast(`🎙️ Listening for field...`, { duration: 2500 });
            };

            recognition.onresult = (event) => {
                let text = event.results[0][0].transcript;
                
                // For number fields, strip out non-digits/decimals
                if (['cost', 'assetValue', 'quantity', 'depRate', 'assetLife', 'residualValue', 'runningHours'].includes(fieldName)) {
                    const numMatch = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
                    if (numMatch) text = numMatch[0];
                }

                setFormData(prev => {
                    const isLongText = ['internalNotes', 'usageRemarks', 'maintenanceNotes'].includes(fieldName);
                    return {
                        ...prev,
                        [fieldName]: isLongText && prev[fieldName] ? `${prev[fieldName]} ${text}` : text
                    };
                });
                setListeningField(null);
                toast.success('Captured!');
            };

            recognition.onerror = (e) => {
                console.error(e);
                setListeningField(null);
            };
            recognition.onend = () => setListeningField(null);

            recognition.start();
        } catch (e) {
            console.error(e);
            setListeningField(null);
        }
    };

    // Voice dictation specifically for dynamic technical specifications
    const handleVoiceSpec = (index, field) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice dictation not supported.');
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onstart = () => toast('🎙️ Listening for spec...', { duration: 2000 });
            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                handleSpecChange(index, field, text);
                toast.success('Spec captured!');
            };
            recognition.start();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.productName.trim()) {
            toast.error('Asset Name is required');
            setActiveSection(0);
            return;
        }

        try {
            if (product && product.id) {
                await updateProduct({ id: product.id, ...formData }).unwrap();
                toast.success('Asset updated successfully!');
            } else {
                await addProduct(formData).unwrap();
                toast.success('Asset created successfully!');
            }
            onClose();
        } catch (err) {
            console.error('Failed to save product', err);
            toast.error('Error saving asset details');
        }
    };

    // Section Completion Checks
    const isBasicComplete = Boolean(formData.productName && formData.category);
    const isLocationComplete = Boolean(formData.department || formData.location || formData.assignedTo);
    const isFinanceComplete = Boolean(formData.assetValue || formData.invoiceNo || formData.supplierName);
    const isWarrantyComplete = formData.warrantyAvailable === 'No' || Boolean(formData.warrantyProvider && formData.warrantyEnd);
    const isMaintenanceComplete = Boolean(formData.runningHours > 0 || formData.maintenanceRequired === 'No' || formData.technician);
    const isSpecsComplete = formData.specs.length > 0;
    const isDocsComplete = (formData.documents && formData.documents.length > 0) || Boolean(formData.internalNotes);

    const sections = [
        { id: 0, title: 'Basic Information', shortTitle: 'Basic Info', icon: Layers, isComplete: isBasicComplete, desc: 'Name, Category, Brand, Serial' },
        { id: 1, title: 'Location & Custody', shortTitle: 'Location', icon: MapPin, isComplete: isLocationComplete, desc: 'Dept, Division, Assigned Staff' },
        { id: 2, title: 'Financial & Purchase', shortTitle: 'Financial', icon: DollarSign, isComplete: isFinanceComplete, desc: 'Invoice, Cost, Depreciation' },
        { id: 3, title: 'Warranty & Service', shortTitle: 'Warranty & AMC', icon: Shield, isComplete: isWarrantyComplete, desc: 'Warranty, AMC Contracts' },
        { id: 4, title: 'Maintenance & Operations', shortTitle: 'Maintenance', icon: Wrench, isComplete: isMaintenanceComplete, desc: 'Running Hours, Status, Schedule' },
        { id: 5, title: 'Technical Specs', shortTitle: 'Tech Specs', icon: Cpu, isComplete: isSpecsComplete, desc: 'Hardware & Machine Specs' },
        { id: 6, title: 'Documents & Notes', shortTitle: 'Documents', icon: FileText, isComplete: isDocsComplete, desc: 'Uploads, Remarks & Notes' }
    ];

    const completedCount = sections.filter(s => s.isComplete).length;
    const currentSectionObj = sections[activeSection] || sections[0];
    const CurrentSectionIcon = currentSectionObj.icon;

    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[92vh] md:max-h-[850px] flex flex-col overflow-hidden border-0 md:border md:border-slate-200 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header (Compact on Mobile, Rich on Desktop) */}
                <div 
                    className="px-4 py-3 md:px-6 md:py-4 border-b border-purple-800 text-white flex items-center justify-between shrink-0 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 50%, #4f46e5 100%)' }}
                >
                    <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                        <div className="p-2 md:p-2.5 bg-white/20 backdrop-blur-sm rounded-xl text-white shadow-inner flex items-center justify-center shrink-0">
                            <CurrentSectionIcon size={18} className="md:w-[22px] md:h-[22px] text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm md:text-lg font-bold text-white tracking-tight leading-tight truncate">
                                {product ? `Edit Asset: ${product.productName || product.sn}` : 'Add New Asset & Equipment'}
                            </h2>
                            <p className="text-[11px] md:text-xs text-purple-200 font-medium opacity-95 hidden md:block">
                                Progressive Asset Master & Equipment Profile
                            </p>
                            <p className="text-[11px] text-purple-200 font-medium md:hidden">
                                {completedCount} of 7 sections complete
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        {/* Desktop Completion pill */}
                        <div className="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/20 text-white">
                            <span className="text-purple-200">Progress:</span>
                            <span className="text-amber-300 font-bold">{completedCount} of 7 Complete</span>
                        </div>

                        <button 
                            type="button"
                            onClick={onClose} 
                            className="p-1.5 md:p-2 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white cursor-pointer"
                            title="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Mobile Section Selector Bar (Visible only on mobile < md) */}
                <div className="md:hidden bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMobileSectionOpen(!isMobileSectionOpen)}
                        className="flex-1 flex items-center justify-between p-1.5 text-left cursor-pointer"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></div>
                            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                                Section {activeSection + 1} of 7:
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                                {currentSectionObj.title}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-purple-600 shrink-0 ml-2">
                            <span className="text-[11px] font-semibold">Change</span>
                            <ChevronDown size={15} className={`transition-transform duration-200 ${isMobileSectionOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {/* Mobile Section Dropdown / Popover Drawer */}
                    {isMobileSectionOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
                                onClick={() => setIsMobileSectionOpen(false)}
                            />
                            <div className="absolute top-full left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-xl p-3 space-y-1.5 max-h-[65vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150 custom-scrollbar">
                                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Jump to Section
                                </div>
                                {sections.map((sec) => {
                                    const SecIcon = sec.icon;
                                    const isActive = activeSection === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveSection(sec.id);
                                                setIsMobileSectionOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                                                isActive
                                                    ? 'bg-purple-600 text-white font-bold'
                                                    : 'hover:bg-slate-100 text-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <SecIcon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                                                <span className="text-xs font-medium">{sec.id + 1}. {sec.title}</span>
                                            </div>
                                            {sec.isComplete ? (
                                                <CheckCircle2 size={15} className={isActive ? 'text-emerald-300' : 'text-emerald-600'} />
                                            ) : (
                                                <Circle size={14} className={isActive ? 'text-purple-300' : 'text-slate-300'} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Main Content Area (Desktop Sidebar + Section Body) */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    
                    {/* Left Section Navigation (Sidebar) - HIDDEN ON MOBILE */}
                    <div className="hidden md:block w-64 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto space-y-1.5 shrink-0 custom-scrollbar">
                        <div className="px-3 py-1.5 mb-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sections</span>
                        </div>
                        {sections.map((sec) => {
                            const IconComponent = sec.icon;
                            const isActive = activeSection === sec.id;
                            return (
                                <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => setActiveSection(sec.id)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                                        isActive 
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-semibold' 
                                            : 'hover:bg-slate-200/60 text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <IconComponent size={17} className={isActive ? 'text-white shrink-0' : 'text-slate-500 shrink-0'} />
                                        <div className="min-w-0">
                                            <p className={`text-xs truncate ${isActive ? 'font-bold text-white' : 'font-semibold text-slate-800'}`}>
                                                {sec.title}
                                            </p>
                                            <p className={`text-[10px] truncate ${isActive ? 'text-purple-100' : 'text-slate-400'}`}>
                                                {sec.desc}
                                            </p>
                                        </div>
                                    </div>
                                    {sec.isComplete ? (
                                        <CheckCircle2 size={15} className={isActive ? 'text-emerald-300 shrink-0' : 'text-emerald-600 shrink-0'} />
                                    ) : (
                                        <Circle size={14} className={isActive ? 'text-purple-300 shrink-0' : 'text-slate-300 shrink-0'} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Form Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white custom-scrollbar flex flex-col justify-between">
                        <form id="product-full-form" onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

                            {/* SECTION 0: Basic Information */}
                            {activeSection === 0 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                                <Layers className="text-purple-600" size={18} /> Basic Information
                                            </h3>
                                            <p className="text-xs text-slate-500">Core asset identification details</p>
                                        </div>

                                        {/* Optional Quick Machine Importer from machine_parts */}
                                        {!product && machinePartsList && machinePartsList.length > 0 && (
                                            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl shadow-xs">
                                                <Sparkles size={14} className="text-purple-600 shrink-0" />
                                                <label className="text-[11px] font-bold text-purple-900 whitespace-nowrap">
                                                    Copy from Machine:
                                                </label>
                                                <select
                                                    value={selectedMachineId}
                                                    onChange={(e) => handleSelectExistingMachine(e.target.value)}
                                                    className="text-xs bg-white border border-purple-200 text-purple-900 rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                                                >
                                                    <option value="">-- Choose Machine --</option>
                                                    {machinePartsList.map((m) => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.machine_name} {m.machine_division ? `(${m.machine_division})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                                        <InputField label="Asset / Equipment Name" name="productName" value={formData.productName} onChange={handleChange} required placeholder="e.g. Hydraulic Press" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'productName'} />
                                        <InputField label="Category" name="category" type="select" options={['Machinery', 'IT', 'Electronics', 'Furniture', 'Tools', 'Vehicles']} value={formData.category} onChange={handleChange} required />
                                        <InputField label="Type" name="type" type="select" options={['Asset', 'Non-Consumable', 'Consumable']} value={formData.type} onChange={handleChange} />
                                        <InputField label="Brand / Manufacturer" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Caterpillar, Dell" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'brand'} />
                                        <InputField label="Model Number" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. CAT 320D" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'model'} />
                                        <InputField label="Serial Number" name="serialNo" value={formData.serialNo} onChange={handleChange} placeholder="Manufacturer serial plate" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'serialNo'} />
                                        <InputField label="SKU / Asset Code" name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. AST-001" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'sku'} />
                                        <InputField label="Manufacturing Date" name="mfgDate" type="month" value={formData.mfgDate} onChange={handleChange} />
                                        <InputField label="Country of Origin" name="origin" value={formData.origin} onChange={handleChange} placeholder="e.g. India, Japan" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'origin'} />
                                        <InputField label="Lifecycle Status" name="status" type="select" options={['Active', 'Inactive', 'Disposed']} value={formData.status} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                            {/* SECTION 1: Location & Custody */}
                            {activeSection === 1 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <MapPin className="text-purple-600" size={18} /> Location & Custody Assignment
                                        </h3>
                                        <p className="text-xs text-slate-500">Track physical placement and responsible custodians</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                                        <InputField label="Location / Plant" name="location" type="select" options={['Plant 1', 'Plant 2', 'Warehouse', 'Head Office', 'Site A']} value={formData.location} onChange={handleChange} />
                                        <InputField label="Department" name="department" type="select" options={dynamicDepartments} value={formData.department} onChange={handleChange} />
                                        <InputField label="Division" name="division" type="select" options={dynamicDivisions} value={formData.division} onChange={handleChange} />
                                        <InputField label="Machine Area / Bay" name="machineArea" placeholder="e.g. Bay 4, Line 2" value={formData.machineArea} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'machineArea'} />
                                        <SearchableInput 
                                            label="Assigned Custodian" 
                                            options={userOptions} 
                                            value={formData.assignedTo ?? ""} 
                                            onChange={(val) => setFormData(prev => ({ ...prev, assignedTo: val }))} 
                                            placeholder="Select assigned staff" 
                                        />
                                        <SearchableInput 
                                            label="Responsible Supervisor" 
                                            options={userOptions} 
                                            value={formData.responsiblePerson ?? ""} 
                                            onChange={(val) => setFormData(prev => ({ ...prev, responsiblePerson: val }))} 
                                            placeholder="Select supervisor" 
                                        />
                                        <InputField label="Storage Location / Shelf" name="storageLoc" placeholder="e.g. Rack B-12" value={formData.storageLoc} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'storageLoc'} />
                                        <InputField label="Usage Type" name="usageType" type="select" options={['Internal', 'External / Client']} value={formData.usageType} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                            {/* SECTION 2: Financial & Purchase */}
                            {activeSection === 2 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <DollarSign className="text-purple-600" size={18} /> Financial & Procurement Details
                                        </h3>
                                        <p className="text-xs text-slate-500">Invoice, supplier, cost and depreciation parameters</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                                        <InputField label="Purchase / Asset Date" name="assetDate" type="date" value={formData.assetDate} onChange={handleChange} />
                                        <InputField label="Invoice Number" name="invoiceNo" placeholder="e.g. INV-2024-001" value={formData.invoiceNo} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'invoiceNo'} />
                                        <InputField label="Asset Cost (₹)" name="assetValue" type="number" placeholder="e.g. 500000" value={formData.assetValue} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'assetValue'} />
                                        <InputField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'quantity'} />
                                        <InputField label="Supplier / Vendor" name="supplierName" placeholder="e.g. ABC Industrial Supplies" value={formData.supplierName} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierName'} />
                                        <InputField label="Supplier Phone" name="supplierPhone" placeholder="+91..." value={formData.supplierPhone} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierPhone'} />
                                        <InputField label="Supplier Email" name="supplierEmail" type="email" placeholder="vendor@example.com" value={formData.supplierEmail} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierEmail'} />
                                        <InputField label="Payment Mode" name="paymentMode" type="select" options={['Credit / PO', 'Online', 'Cash']} value={formData.paymentMode} onChange={handleChange} />
                                    </div>

                                    <div className="border-t border-slate-100 pt-3.5 mt-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Depreciation Configuration</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                                            <InputField label="Depreciation Method" name="depMethod" type="select" options={['Straight Line', 'Written Down Value (WDV)']} value={formData.depMethod} onChange={handleChange} />
                                            <InputField label="Rate (%)" name="depRate" type="number" placeholder="e.g. 15" value={formData.depRate} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'depRate'} />
                                            <InputField label="Asset Life (Years)" name="assetLife" type="number" placeholder="e.g. 10" value={formData.assetLife} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'assetLife'} />
                                            <InputField label="Residual Value (₹)" name="residualValue" type="number" placeholder="Scrap value" value={formData.residualValue} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'residualValue'} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION 3: Warranty & AMC (Progressive Disclosure) */}
                            {activeSection === 3 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Shield className="text-purple-600" size={18} /> Warranty & AMC Contracts
                                        </h3>
                                        <p className="text-xs text-slate-500">Service coverage and contract dates</p>
                                    </div>

                                    {/* Warranty Group */}
                                    <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                                        <InputField label="Is Warranty Available?" name="warrantyAvailable" type="select" options={['Yes', 'No']} value={formData.warrantyAvailable} onChange={handleChange} />
                                        {formData.warrantyAvailable === 'Yes' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-1 animate-in fade-in">
                                                <InputField label="Warranty Provider" name="warrantyProvider" placeholder="OEM / Dealer Name" value={formData.warrantyProvider} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'warrantyProvider'} />
                                                <InputField label="Start Date" name="warrantyStart" type="date" value={formData.warrantyStart} onChange={handleChange} />
                                                <InputField label="End Date" name="warrantyEnd" type="date" value={formData.warrantyEnd} onChange={handleChange} />
                                            </div>
                                        )}
                                    </div>

                                    {/* AMC Group */}
                                    <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                                        <InputField label="Is under AMC Contract?" name="amc" type="select" options={['Yes', 'No']} value={formData.amc} onChange={handleChange} />
                                        {formData.amc === 'Yes' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-1 animate-in fade-in">
                                                <InputField label="AMC Provider" name="amcProvider" placeholder="Service company" value={formData.amcProvider} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'amcProvider'} />
                                                <InputField label="AMC Start Date" name="amcStart" type="date" value={formData.amcStart} onChange={handleChange} />
                                                <InputField label="AMC End Date" name="amcEnd" type="date" value={formData.amcEnd} onChange={handleChange} />
                                            </div>
                                        )}
                                    </div>

                                    <InputField label="Service Helpline / Contact" name="serviceContact" placeholder="Contact number or email" value={formData.serviceContact} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'serviceContact'} />
                                </div>
                            )}

                            {/* SECTION 4: Maintenance & Operations */}
                            {activeSection === 4 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Wrench className="text-purple-600" size={18} /> Maintenance & Operational Status
                                        </h3>
                                        <p className="text-xs text-slate-500">Shop-floor running hours, machine health, and maintenance configuration</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                                        <InputField label="Running Hours" name="runningHours" type="number" placeholder="e.g. 2500" value={formData.runningHours} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'runningHours'} />
                                        <InputField label="Installation Date" name="installationDate" type="date" value={formData.installationDate} onChange={handleChange} />
                                        <InputField label="Machine Status" name="operationalStatus" type="select" options={['Running', 'Under Repair', 'Breakdown', 'Maintenance Due', 'Inactive']} value={formData.operationalStatus} onChange={handleChange} />
                                    </div>

                                    <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                                        <InputField label="Schedule Preventive Maintenance?" name="maintenanceRequired" type="select" options={['Yes', 'No']} value={formData.maintenanceRequired} onChange={handleChange} />
                                        {formData.maintenanceRequired === 'Yes' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1 animate-in fade-in">
                                                <InputField label="Maintenance Type" name="maintenanceType" type="select" options={['Preventive', 'Breakdown']} value={formData.maintenanceType} onChange={handleChange} />
                                                <InputField label="Frequency" name="frequency" type="select" options={['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']} value={formData.frequency} onChange={handleChange} />
                                                <InputField label="Next Due Date" name="nextService" type="date" value={formData.nextService} onChange={handleChange} />
                                                <InputField label="Priority" name="priority" type="select" options={['Low', 'Medium', 'High']} value={formData.priority} onChange={handleChange} />
                                                <div className="col-span-1 sm:col-span-2">
                                                    <InputField label="Assigned Technician" name="technician" placeholder="Technician name" value={formData.technician} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'technician'} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <InputField label="Maintenance Notes" name="maintenanceNotes" type="textarea" value={formData.maintenanceNotes} onChange={handleChange} placeholder="Special servicing guidelines, oil types, lubrication schedules..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'maintenanceNotes'} />
                                </div>
                            )}

                            {/* SECTION 5: Technical Specs (Category Adaptive) */}
                            {activeSection === 5 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                                <Cpu className="text-purple-600" size={18} /> Technical Specifications
                                            </h3>
                                            <p className="text-xs text-slate-500">Custom technical attributes for {formData.category || 'Asset'}</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={addSpec}
                                            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            <Plus size={14} /> Add Spec
                                        </button>
                                    </div>

                                    {formData.specs.length === 0 ? (
                                        <div className="p-6 sm:p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <Cpu size={28} className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-500 font-medium">No custom technical specs added yet.</p>
                                            <button 
                                                type="button" 
                                                onClick={addSpec}
                                                className="mt-2 text-xs text-purple-600 font-bold hover:underline cursor-pointer"
                                            >
                                                + Add First Specification (e.g. Voltage, Capacity, RAM)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {formData.specs.map((spec, index) => (
                                                <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl border sm:border-0 border-slate-100">
                                                    <div className="flex-1 relative">
                                                        <input 
                                                            type="text"
                                                            value={spec.name}
                                                            onChange={(e) => handleSpecChange(index, 'name', e.target.value)}
                                                            placeholder={formData.category === 'IT' ? 'e.g. RAM, Storage, OS' : 'e.g. Voltage, Power, Capacity'}
                                                            className="w-full pl-3.5 pr-8 py-2.5 bg-white sm:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 min-h-[42px]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVoiceSpec(index, 'name')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 p-1"
                                                            title="Voice input for spec name"
                                                        >
                                                            <Mic size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input 
                                                            type="text"
                                                            value={spec.value}
                                                            onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                                            placeholder="e.g. 32 GB / 415V / 3 Tonnes"
                                                            className="w-full pl-3.5 pr-8 py-2.5 bg-white sm:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 min-h-[42px]"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVoiceSpec(index, 'value')}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-800 p-1"
                                                            title="Voice input for spec value"
                                                        >
                                                            <Mic size={14} />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeSpec(index)}
                                                        className="self-end sm:self-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Spec"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SECTION 6: Documents & Remarks */}
                            {activeSection === 6 && (
                                <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150">
                                    <div className="border-b border-slate-100 pb-2.5">
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                            <FileText className="text-purple-600" size={18} /> Documents, Photos & Remarks
                                        </h3>
                                        <p className="text-xs text-slate-500">Supporting documentation, inspection sheets, and observation notes</p>
                                    </div>

                                    {/* Upload Dropzone */}
                                    <div className="p-4 sm:p-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                                        <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-slate-400 mb-1.5" />
                                        <p className="text-xs font-semibold text-slate-700">Upload Invoices, Manuals, Warranty Cards, Photos</p>
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current.click()}
                                            className="mt-2.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer min-h-[40px]"
                                        >
                                            Select Files to Attach
                                        </button>

                                        {formData.documents && formData.documents.length > 0 && (
                                            <div className="mt-4 text-left">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Attached Files ({formData.documents.length}):</p>
                                                <div className="space-y-1.5">
                                                    {formData.documents.map((file, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                                            <span className="truncate font-medium text-slate-800">{file.name}</span>
                                                            <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 ml-2 p-1 cursor-pointer">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remarks & Condition with Voice Dictation */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                        <InputField label="Internal Notes" name="internalNotes" type="textarea" value={formData.internalNotes} onChange={handleChange} placeholder="Internal procurement or asset observations..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'internalNotes'} />
                                        <InputField label="Usage & Condition Remarks" name="usageRemarks" type="textarea" value={formData.usageRemarks} onChange={handleChange} placeholder="Operating condition, physical status..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'usageRemarks'} />
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Sticky Bottom Navigation & Save Bar */}
                        <div className="pt-3 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-white sticky bottom-0 z-10">
                            <div>
                                {activeSection > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(prev => Math.max(0, prev - 1))}
                                        className="px-3 sm:px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer min-h-[42px]"
                                    >
                                        <ArrowLeft size={15} /> Back
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {activeSection < sections.length - 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveSection(prev => Math.min(sections.length - 1, prev + 1))}
                                        className="px-3 sm:px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shadow-sm min-h-[42px]"
                                    >
                                        Next <ArrowRight size={15} />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={isAdding || isUpdating}
                                    onClick={handleSubmit}
                                    style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 50%, #4338ca 100%)' }}
                                    className="px-4 sm:px-6 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[42px]"
                                >
                                    <Save size={15} className="text-white" />
                                    <span>{isAdding || isUpdating ? 'Saving...' : (product ? 'Update' : 'Save')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;
