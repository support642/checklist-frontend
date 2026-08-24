import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, Hash, Tag, Building2, Save, Layers, AlertCircle } from 'lucide-react';
import { createEquipmentMasterApi, updateEquipmentMasterApi } from '../../redux/api/equipmentApi';
import { toast } from 'react-hot-toast';

export default function EquipmentMasterModal({
  isOpen,
  onClose,
  equipment = null, // null for create mode, object for edit mode
  onSuccess
}) {
  const [formData, setFormData] = useState({
    equipment_id: '',
    equipment_name: '',
    model: '',
    serial_no: '',
    machine_division: '',
    machine_department: '',
    machine_area: '',
    purchase_date: '',
    installation_date: '',
    running_hours: 0,
    status: 'Running',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (equipment) {
      setFormData({
        equipment_id: equipment.equipment_id || '',
        equipment_name: equipment.equipment_name || '',
        model: equipment.model === '—' ? '' : (equipment.model || ''),
        serial_no: equipment.serial_no === '—' ? '' : (equipment.serial_no || ''),
        machine_division: equipment.division || equipment.machine_division || '',
        machine_department: equipment.department || equipment.machine_department || '',
        machine_area: equipment.machine_area || '',
        purchase_date: equipment.purchase_date === '—' ? '' : (equipment.purchase_date || ''),
        installation_date: equipment.installation_date === '—' ? '' : (equipment.installation_date || ''),
        running_hours: equipment.running_hours || 0,
        status: equipment.status || 'Running',
        remarks: equipment.remarks === 'Good Condition' ? '' : (equipment.remarks || '')
      });
    } else {
      setFormData({
        equipment_id: `EQ-${String(Math.floor(100 + Math.random() * 900))}`,
        equipment_name: '',
        model: '',
        serial_no: '',
        machine_division: '',
        machine_department: '',
        machine_area: '',
        purchase_date: '',
        installation_date: '',
        running_hours: 0,
        status: 'Running',
        remarks: ''
      });
    }
    setErrorMsg('');
  }, [equipment, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.equipment_id.trim() || !formData.equipment_name.trim()) {
      setErrorMsg('Equipment ID and Equipment Name are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let res;
      if (equipment && equipment.master_id) {
        res = await updateEquipmentMasterApi(equipment.master_id, formData);
      } else if (equipment && equipment.id) {
        res = await updateEquipmentMasterApi(equipment.id, formData);
      } else {
        res = await createEquipmentMasterApi(formData);
      }

      if (res && res.success) {
        if (onSuccess) onSuccess();
        toast.success(equipment ? 'Equipment updated successfully!' : 'Equipment created successfully!');
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to save equipment details.');
      }
    } catch (err) {
      console.error("Save error:", err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
      {/* Backdrop overlay isolated from modal content layer to prevent font blur and fixing backdrop-blur effect */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Window Container */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 text-white shrink-0 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4f46e5 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl text-white shadow-inner flex items-center justify-center">
              <Wrench size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                {equipment ? 'Edit Equipment Details' : 'Add New Equipment'}
              </h2>
              <p className="text-xs text-blue-100 font-medium opacity-90">
                Configure equipment master parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all active:scale-95 cursor-pointer"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Wrap */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-slate-50/50">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Equipment ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={14} className="text-blue-600" /> Equipment ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="equipment_id"
                  value={formData.equipment_id}
                  onChange={handleChange}
                  placeholder="e.g. EX-001"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Equipment Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} className="text-blue-600" /> Equipment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="equipment_name"
                  value={formData.equipment_name}
                  onChange={handleChange}
                  placeholder="e.g. Excavator, Dumper"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Make / Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-600" /> Make / Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g. CAT 320D, Tata Signa"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Serial No */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={14} className="text-blue-600" /> Serial Number
                </label>
                <input
                  type="text"
                  name="serial_no"
                  value={formData.serial_no}
                  onChange={handleChange}
                  placeholder="e.g. CAT320D12345"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-blue-600" /> Department
                </label>
                <input
                  type="text"
                  name="machine_department"
                  value={formData.machine_department}
                  onChange={handleChange}
                  placeholder="e.g. Mining, Mechanical"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Division */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-600" /> Division
                </label>
                <input
                  type="text"
                  name="machine_division"
                  value={formData.machine_division}
                  onChange={handleChange}
                  placeholder="e.g. Operations, Logistics"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Purchase Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-600" /> Purchase Date
                </label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Installation Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-600" /> Installation Date
                </label>
                <input
                  type="date"
                  name="installation_date"
                  value={formData.installation_date}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Running Hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Hash size={14} className="text-blue-600" /> Running Hours
                </label>
                <input
                  type="number"
                  name="running_hours"
                  value={formData.running_hours}
                  onChange={handleChange}
                  placeholder="e.g. 2500"
                  min="0"
                  step="0.1"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} className="text-blue-600" /> Machine Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="Running">Running</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Maintenance Due">Maintenance Due</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Remarks / Condition Notes
              </label>
              <textarea
                name="remarks"
                rows={3}
                value={formData.remarks}
                onChange={handleChange}
                placeholder="e.g. Good condition, oil level checked"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm resize-none"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #4f46e5 100%)' }}
            >
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
