import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save } from 'lucide-react';
import { createLoan } from '../../../utils/doc-utils/loanApi';

interface AddLoanProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddLoan: React.FC<AddLoanProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    loanName: '',
    bankName: '',
    amount: '',
    emi: '',
    startDate: '',
    endDate: '',
    providedDocument: '',
    remarks: '',
    file: null as string | null,
    fileContent: ''
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          file: file.name,
          fileContent: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse amount and emi (remove currency symbols and commas)
      const cleanAmount = formData.amount.replace(/[₹,\s]/g, '');
      const cleanEmi = formData.emi.replace(/[₹,\s]/g, '');

      await createLoan({
        loan_name: formData.loanName,
        bank_name: formData.bankName,
        amount: parseFloat(cleanAmount),
        emi: parseFloat(cleanEmi),
        loan_start_date: formData.startDate,
        loan_end_date: formData.endDate,
        provided_document_name: formData.providedDocument || undefined,
        upload_document: formData.fileContent || undefined,
        remarks: formData.remarks || undefined
      });

      toast.success('Loan added successfully');
      onClose();
      setFormData({
        loanName: '',
        bankName: '',
        amount: '',
        emi: '',
        startDate: '',
        endDate: '',
        providedDocument: '',
        remarks: '',
        file: null,
        fileContent: ''
      });

      // Refresh the page to show new data
      window.location.reload();
    } catch (err) {
      console.error('Failed to create loan:', err);
      toast.error('Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-input sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Add New Loan</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          <form id="add-loan-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  value={formData.loanName}
                  onChange={e => setFormData({ ...formData, loanName: e.target.value })}
                  placeholder="e.g. Home Loan"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. ₹50,00,000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">EMI</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  value={formData.emi}
                  onChange={e => setFormData({ ...formData, emi: e.target.value })}
                  placeholder="e.g. ₹45,000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan Start Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Loan End Date</label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Provided Document Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                  value={formData.providedDocument}
                  onChange={e => setFormData({ ...formData, providedDocument: e.target.value })}
                  placeholder="e.g. Property Deed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Upload Document</label>
                <input
                  type="file"
                  className="w-full p-2 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  onChange={handleFileChange}
                />
                {formData.file && <p className="text-xs text-green-600 mt-1">Selected: {formData.file}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks</label>
              <input
                type="text"
                className="w-full p-2.5 shadow-input border-none rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl shadow-input border-none text-gray-700 font-medium hover:bg-white hover:border-gray-300 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-loan-form"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
          >
            <Save size={18} />
            Save Loan
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLoan;
