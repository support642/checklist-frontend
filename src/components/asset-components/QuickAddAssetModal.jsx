import React, { useState, useMemo } from 'react';
import { 
  X, Zap, Mic, MicOff, Check, AlertCircle, Search, 
  ChevronDown, Cpu, Sparkles, ExternalLink, RefreshCw 
} from 'lucide-react';
import { useAddProductMutation, useGetProductsQuery, useGetMachinePartsListQuery } from '../../redux/asset-redux/slices/productApi';
import { toast } from 'react-hot-toast';

export default function QuickAddAssetModal({ isOpen, onClose, onOpenFullDetails }) {
  const [addProduct, { isLoading }] = useAddProductMutation();
  const { data: allProducts = [] } = useGetProductsQuery();
  const { data: machinePartsList = [], isLoading: isLoadingMachines } = useGetMachinePartsListQuery();

  const [formData, setFormData] = useState({
    productName: '',
    category: 'Machinery',
    brand: '',
    model: '',
    serialNo: '',
    status: 'Active',
    // Machine Link & Location info from machine_parts
    machineId: null,
    machineArea: '',
    division: '',
    department: '',
    specs: []
  });

  // Search & Selector states for Existing Machine
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [pendingMachineToSelect, setPendingMachineToSelect] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceParsed, setVoiceParsed] = useState(null);

  // Map machine_id to linked asset for duplicate detection
  const machineToAssetMap = useMemo(() => {
    const map = new Map();
    for (const p of allProducts) {
      if (p.machineId) {
        map.set(String(p.machineId), p);
      }
    }
    return map;
  }, [allProducts]);

  // Filter machines based on search query
  const filteredMachines = useMemo(() => {
    if (!machineSearchQuery.trim()) return machinePartsList;
    const q = machineSearchQuery.toLowerCase();
    return machinePartsList.filter(m => 
      (m.machine_name && m.machine_name.toLowerCase().includes(q)) ||
      (m.machine_area && m.machine_area.toLowerCase().includes(q)) ||
      (m.machine_division && m.machine_division.toLowerCase().includes(q)) ||
      (m.machine_department && m.machine_department.toLowerCase().includes(q))
    );
  }, [machinePartsList, machineSearchQuery]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUserEdited(true);
  };

  // Populate form from a selected machine object
  const applyMachineSelection = (machine) => {
    setSelectedMachine(machine);
    setIsDropdownOpen(false);
    setMachineSearchQuery('');

    // Format parts into structured specs
    const partSpecs = Array.isArray(machine.part_name) 
      ? machine.part_name.filter(Boolean).map(p => ({ name: typeof p === 'string' ? p : (p.name || p.value || ''), value: '' }))
      : (machine.part_name ? [{ name: typeof machine.part_name === 'string' ? machine.part_name : (machine.part_name.name || machine.part_name.value || ''), value: '' }] : []);

    setFormData(prev => ({
      ...prev,
      productName: machine.machine_name || prev.productName,
      category: 'Machinery',
      machineId: machine.id,
      initialEntryDate: machine.created_at || prev.initialEntryDate || new Date().toISOString(),
      machineArea: machine.machine_area || '',
      division: machine.machine_division || '',
      department: machine.machine_department || '',
      specs: partSpecs
    }));
    setHasUserEdited(false);
    toast.success(`Imported data from ${machine.machine_name}`);
  };

  const handleSelectMachineClick = (machine) => {
    if (hasUserEdited) {
      setPendingMachineToSelect(machine);
      setShowOverwriteConfirm(true);
    } else {
      applyMachineSelection(machine);
    }
  };

  const confirmMachineOverwrite = () => {
    if (pendingMachineToSelect) {
      applyMachineSelection(pendingMachineToSelect);
    }
    setShowOverwriteConfirm(false);
    setPendingMachineToSelect(null);
  };

  const handleClearMachine = () => {
    setSelectedMachine(null);
    setFormData(prev => ({
      ...prev,
      machineId: null,
      machineArea: '',
      division: '',
      department: '',
      specs: []
    }));
    setHasUserEdited(false);
  };

  // Simple Speech Recognition handler
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎙️ Listening... Say asset name, category, brand, and serial number', { duration: 4000 });
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        parseSpokenAsset(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        setIsListening(false);
        toast.error('Could not capture audio clearly. Please try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const parseSpokenAsset = (text) => {
    let extractedName = text;
    let extractedBrand = '';
    let extractedModel = '';
    let extractedSerial = '';
    let extractedCategory = 'Machinery';

    if (/laptop|computer|printer|server|monitor|it/i.test(text)) extractedCategory = 'IT';
    else if (/chair|table|desk|cabinet|furniture/i.test(text)) extractedCategory = 'Furniture';
    else if (/drill|wrench|welder|tool/i.test(text)) extractedCategory = 'Tools';
    else if (/pump|motor|excavator|dumper|generator|compressor|machine/i.test(text)) extractedCategory = 'Machinery';

    const snMatch = text.match(/serial(?:\s+number)?\s+([a-zA-Z0-9_-]+)/i);
    if (snMatch) {
      extractedSerial = snMatch[1];
    }

    const brandList = ['CAT', 'Caterpillar', 'Tata', 'Komatsu', 'Dell', 'HP', 'Lenovo', 'Bosch', 'Siemens', 'Toyota'];
    for (const b of brandList) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
        extractedBrand = b;
        break;
      }
    }

    setVoiceParsed({
      transcript: text,
      productName: extractedName.replace(/serial(?:\s+number)?\s+[a-zA-Z0-9_-]+/i, '').trim(),
      category: extractedCategory,
      brand: extractedBrand,
      model: extractedModel,
      serialNo: extractedSerial
    });
  };

  const applyVoiceData = () => {
    if (voiceParsed) {
      setFormData(prev => ({
        ...prev,
        productName: voiceParsed.productName || prev.productName,
        category: voiceParsed.category || prev.category,
        brand: voiceParsed.brand || prev.brand,
        serialNo: voiceParsed.serialNo || prev.serialNo
      }));
      setVoiceParsed(null);
      setHasUserEdited(true);
      toast.success('Voice details applied!');
    }
  };

  const handleSubmit = async (e, fillMoreDetails = false) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      toast.error('Asset Name is required');
      return;
    }

    try {
      const res = await addProduct(formData).unwrap();
      toast.success('Asset created successfully!');
      onClose();
      if (fillMoreDetails && onOpenFullDetails && res?.id) {
        onOpenFullDetails(res);
      }
    } catch (err) {
      console.error('Failed to create asset:', err);
      toast.error('Failed to create asset. Please try again.');
    }
  };

  // Check if current selected machine is already linked to an existing asset
  const existingLinkedAsset = selectedMachine ? machineToAssetMap.get(String(selectedMachine.id)) : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b border-purple-800 text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 50%, #4f46e5 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner flex items-center justify-center">
              <Zap size={20} className="text-amber-300 fill-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-tight">Quick Add Asset</h2>
              <p className="text-xs text-purple-200 font-medium opacity-95">Create in seconds • Fill details anytime</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500 text-white border-red-400 animate-pulse'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
              }`}
              title="Voice Dictate Asset"
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Overwrite Confirmation Dialog */}
        {showOverwriteConfirm && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="text-amber-600" />
              <span>Replace manually edited fields?</span>
            </div>
            <p className="text-amber-800">
              Selecting "{pendingMachineToSelect?.machine_name}" will replace your current edits with this machine's details.
            </p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => { setShowOverwriteConfirm(false); setPendingMachineToSelect(null); }}
                className="px-3 py-1 bg-white border border-amber-300 rounded-lg font-semibold hover:bg-amber-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMachineOverwrite}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
              >
                Replace
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          {/* SECTION: Create From Existing Machine */}
          <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu size={14} className="text-purple-600" />
                <span>Create From Existing Machine</span>
              </label>
              {selectedMachine && (
                <button
                  type="button"
                  onClick={handleClearMachine}
                  className="text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <X size={13} /> Clear Machine
                </button>
              )}
            </div>

            {selectedMachine ? (
              /* Selected Machine Card */
              <div className="p-2.5 bg-white border border-purple-200 rounded-lg shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    {selectedMachine.machine_name}
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-semibold">
                    ID #{selectedMachine.id}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <div><span className="text-slate-400">Area:</span> {selectedMachine.machine_area || '—'}</div>
                  <div><span className="text-slate-400">Div:</span> {selectedMachine.machine_division || '—'}</div>
                  <div><span className="text-slate-400">Dept:</span> {selectedMachine.machine_department || '—'}</div>
                </div>

                {selectedMachine.created_at && (
                  <div className="text-[10px] text-purple-700 bg-purple-50/70 px-2 py-1 rounded flex items-center justify-between">
                    <span>Initial Entry in Machine Parts:</span>
                    <span className="font-semibold">{new Date(selectedMachine.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}

                {/* Duplicate Asset Detection Warning */}
                {existingLinkedAsset && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold">Already linked to Asset: {existingLinkedAsset.sn}</p>
                      <p className="text-amber-700">An asset record ({existingLinkedAsset.productName}) already references this machine.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Searchable Dropdown / Selector */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                >
                  <span className="text-slate-500 flex items-center gap-2">
                    <Search size={14} /> Search & select existing machine...
                  </span>
                  <ChevronDown size={15} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in-50 duration-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={machineSearchQuery}
                        onChange={(e) => setMachineSearchQuery(e.target.value)}
                        placeholder="Filter by name, area, department..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-purple-500"
                        autoFocus
                      />
                    </div>

                    <div className="divide-y divide-slate-100">
                      {filteredMachines.length > 0 ? (
                        filteredMachines.map((m) => {
                          const isAlreadyLinked = machineToAssetMap.has(String(m.id));
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectMachineClick(m)}
                              className="w-full text-left p-2 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
                                  {m.machine_name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {[m.machine_area, m.machine_department, m.machine_division].filter(Boolean).join(' • ') || 'No location details'}
                                </p>
                              </div>
                              {isAlreadyLinked && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
                                  Linked
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {isLoadingMachines ? 'Loading machines...' : 'No matching machines found.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {selectedMachine ? 'Asset Details (Auto-Populated)' : 'Or Enter Manually'}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Form Fields */}
          <form id="quick-add-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {/* Asset Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Asset / Equipment Name <span className="text-red-500">*</span></span>
                {selectedMachine && (
                  <span className="text-[10px] text-purple-600 font-semibold lowercase">from machine</span>
                )}
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="e.g. CAT 320D Excavator, Dell Laptop"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all cursor-pointer"
                >
                  <option value="Machinery">Machinery</option>
                  <option value="IT">IT</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Tools">Tools</option>
                  <option value="Vehicles">Vehicles</option>
                </select>
              </div>

              {/* Lifecycle Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Brand / Make
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g. Caterpillar, Dell"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                />
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Model Number
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g. 320D, Latitude 5420"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* Serial Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Manufacturer Serial Number
              </label>
              <input
                type="text"
                name="serialNo"
                value={formData.serialNo}
                onChange={handleChange}
                placeholder="e.g. SN-89481249"
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">System Asset ID will be auto-generated sequentially.</p>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              Save & Fill More
            </button>
            <button
              type="submit"
              form="quick-add-form"
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 50%, #4338ca 100%)' }}
              className="flex-1 sm:flex-none px-6 py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} className="text-white" />
              <span>{isLoading ? 'Saving...' : 'Save Asset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
