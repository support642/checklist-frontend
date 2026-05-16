import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  ClipboardList, User, Database, Settings, 
  CheckSquare, Loader2, Plus, Save, X, Search, ChevronDown 
} from 'lucide-react';
import { authFetch } from '../../utils/authFetch';
import { motion, AnimatePresence } from 'framer-motion';

const SearchableSelect = ({ label, icon: Icon, options, value, onChange, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-purple-700">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-md border border-purple-200 p-2.5 pl-10 pr-10 cursor-pointer focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-medium text-slate-700 relative flex items-center min-h-[44px]
          ${isOpen ? 'ring-2 ring-purple-100 border-purple-500' : ''}`}
      >
        <Icon className="absolute left-3 top-3 h-5 w-5 text-purple-400" />
        <span className={value ? "text-slate-700" : "text-slate-400 font-normal"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`absolute right-3 top-3 h-5 w-5 text-purple-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-purple-100 rounded-xl shadow-2xl max-h-60 overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-purple-50 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border-0 focus:ring-0 bg-slate-50 rounded-lg outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-purple-50 hover:text-purple-700 cursor-pointer font-medium"
                  >
                    {opt}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-xs italic">
                  No results found
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RequestForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [addedRequests, setAddedRequests] = useState([]);

  // Live Data State
  const [users, setUsers] = useState([]);
  const [allMachines, setAllMachines] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const initialFormState = {
    filled_by: "",
    assigned_person: "",
    machine_division: "",
    machine_department: "",
    machine_name: "",
    issue_description: "",
    duration: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, machinesRes] = await Promise.all([
          authFetch(`${import.meta.env.VITE_API_BASE_URL}/settings/users?limit=1000`),
          authFetch(`${import.meta.env.VITE_API_BASE_URL}/settings/machines`)
        ]);

        if (usersRes.ok && machinesRes.ok) {
          const usersData = await usersRes.json();
          const machinesData = await machinesRes.json();
          
          // API now returns { users: [], totalCount: ... } after pagination update
          const userList = Array.isArray(usersData) ? usersData : (usersData.users || []);
          setUsers(userList.map(u => u.user_name).sort());
          setAllMachines(machinesData);
        }
      } catch (err) {
        console.error("Fetch Data Error:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const uniqueDivisions = [...new Set(allMachines.map(m => m.machine_division?.trim()).filter(Boolean))].sort();
  const availableDepartments = [...new Set(allMachines
    .filter(m => !formData.machine_division || m.machine_division === formData.machine_division)
    .map(m => m.machine_department?.trim())
    .filter(Boolean)
  )].sort();
  const availableMachines = [...new Set(allMachines
    .filter(m => !formData.machine_division || m.machine_division === formData.machine_division)
    .filter(m => !formData.machine_department || m.machine_department === formData.machine_department)
    .map(m => m.machine_name?.trim())
    .filter(Boolean)
  )].sort();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddAnother = (e) => {
    if (e) e.preventDefault();
    if (!formData.machine_name || !formData.issue_description) {
      setSubmitStatus({ type: 'error', message: 'Please fill in the machine name and issue description.' });
      return;
    }
    setAddedRequests(prev => [...prev, { ...formData, submission_date: new Date().toISOString(), status: 'Pending' }]);
    setFormData(initialFormState);
    setSubmitStatus({ type: 'success', message: 'Request added to the queue.' });
    setTimeout(() => {
      setSubmitStatus({ type: '', message: '' });
    }, 2000);
  };

  const handleCancel = () => {
    setAddedRequests([]);
    setFormData(initialFormState);
    setSubmitStatus({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    let finalRequests = [...addedRequests];
    
    // If the form is currently being filled, add it too (if valid)
    if (formData.machine_name && formData.issue_description) {
      finalRequests.push({ ...formData, submission_date: new Date().toISOString(), status: 'Pending' });
    }

    if (finalRequests.length === 0) {
      setSubmitStatus({ type: 'error', message: 'No requests to submit.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      const response = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/repair`, {
        method: 'POST',
        body: JSON.stringify(finalRequests)
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: `${finalRequests.length} request(s) submitted successfully!` });
        setAddedRequests([]);
        setFormData(initialFormState);
      } else {
        setSubmitStatus({ type: 'error', message: data.error || 'Failed to submit requests.' });
      }
    } catch (error) {
      console.error("Submission Error:", error);
      setSubmitStatus({ type: 'error', message: 'Connection error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg shadow-md">
              <ClipboardList className="text-white h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-purple-800">Request Form</h1>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
            <div className="bg-purple-600 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Submit New Repair Request
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <AnimatePresence>
                {submitStatus.message && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`p-4 rounded-lg mb-4 shadow-sm ${submitStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                  >
                    {submitStatus.message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assign From */}
                <SearchableSelect 
                  label="Assign From"
                  icon={User}
                  options={users}
                  value={formData.filled_by}
                  onChange={(val) => setFormData(prev => ({ ...prev, filled_by: val }))}
                  placeholder="Select sender..."
                  required
                />

                {/* Assign To */}
                <SearchableSelect 
                  label="Assign To"
                  icon={User}
                  options={users}
                  value={formData.assigned_person}
                  onChange={(val) => setFormData(prev => ({ ...prev, assigned_person: val }))}
                  placeholder="Select technician..."
                  required
                />

                {/* Machine Division */}
                <div className="space-y-2">
                  <label htmlFor="machine_division" className="block text-sm font-medium text-purple-700">
                    Machine Division
                  </label>
                  <div className="relative">
                    <select
                      id="machine_division"
                      name="machine_division"
                      value={formData.machine_division}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        machine_division: e.target.value,
                        machine_department: "",
                        machine_name: ""
                      }))}
                      required
                      className="w-full rounded-md border border-purple-200 p-2.5 pl-10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none bg-white font-medium text-slate-700"
                    >
                      <option value="">Select Division</option>
                      {uniqueDivisions.map((div, i) => <option key={`${div}-${i}`} value={div}>{div}</option>)}
                    </select>
                    <Database className="absolute left-3 top-2.5 h-5 w-5 text-purple-400" />
                  </div>
                </div>

                {/* Machine Department */}
                <div className="space-y-2">
                  <label htmlFor="machine_department" className="block text-sm font-medium text-purple-700">
                    Machine Department
                  </label>
                  <div className="relative">
                    <select
                      id="machine_department"
                      name="machine_department"
                      value={formData.machine_department}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        machine_department: e.target.value,
                        machine_name: ""
                      }))}
                      required
                      className="w-full rounded-md border border-purple-200 p-2.5 pl-10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none bg-white font-medium text-slate-700"
                    >
                      <option value="">Select Department</option>
                      {availableDepartments.map((dept, i) => <option key={`${dept}-${i}`} value={dept}>{dept}</option>)}
                    </select>
                    <Settings className="absolute left-3 top-2.5 h-5 w-5 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Machine Name */}
              <div className="space-y-2">
                <label htmlFor="machine_name" className="block text-sm font-medium text-purple-700">
                  Machine Name
                </label>
                <div className="relative">
                  <select
                    id="machine_name"
                    name="machine_name"
                    value={formData.machine_name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-purple-200 p-2.5 pl-10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none bg-white font-medium text-slate-700"
                  >
                    <option value="">Select Machine</option>
                    {availableMachines.map((name, i) => <option key={`${name}-${i}`} value={name}>{name}</option>)}
                  </select>
                  <CheckSquare className="absolute left-3 top-2.5 h-5 w-5 text-purple-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issue Details */}
                <div className="space-y-2">
                  <label htmlFor="issue_description" className="block text-sm font-medium text-purple-700">
                    Issue Details
                  </label>
                  <textarea
                    id="issue_description"
                    name="issue_description"
                    value={formData.issue_description}
                    onChange={handleChange}
                    placeholder="Provide detailed information about the issue..."
                    rows={4}
                    required
                    className="w-full rounded-md border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-medium text-slate-700"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label htmlFor="duration" className="block text-sm font-medium text-purple-700">
                    Duration
                  </label>
                  <input
                    type="text"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 2 hours"
                    className="w-full rounded-md border border-purple-200 p-3 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddAnother}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Add Request
                </button>
              </div>
            </form>
          </div>

          {/* Queued Requests List */}
          {addedRequests.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="text-purple-600" size={20} />
                Queued Requests ({addedRequests.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {addedRequests.map((req, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 text-purple-600 font-bold h-10 w-10 rounded-lg flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{req.machine_name}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{req.issue_description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setAddedRequests(prev => prev.filter((_, i) => i !== index))}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Summary Footer */}
          {addedRequests.length > 0 && (
            <div className="mt-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 h-full w-1 text-purple-500 bg-purple-500 opacity-50" />
                
                <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <h4 className="text-lg font-bold text-slate-800">
                       {addedRequests.length} request{addedRequests.length > 1 ? 's' : ''} ready to submit
                     </h4>
                   </div>
                   <p className="text-slate-500 text-sm">
                     Admin will fill in additional details after submission
                   </p>
                </div>

                <div className="flex w-full md:w-auto mt-4 md:mt-0 md:pr-2">
                  <div className="flex w-full sm:w-auto items-center gap-3">
                    <button
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all whitespace-nowrap"
                    >
                      <X size={18} /> Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 py-3 rounded-xl bg-purple-600 text-white font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-purple-300 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Submit {addedRequests.length} <span className="hidden sm:inline">Request{addedRequests.length > 1 ? 's' : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default RequestForm;