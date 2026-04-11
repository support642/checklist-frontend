import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { X, Save } from 'lucide-react';
import { createSubscription, generateSubscriptionNo } from '../../../utils/doc-utils/subscriptionApi';
import { fetchCompanyNames } from '../../../utils/doc-utils/masterApi';
import SearchableInput from '../../../components/doc-sub-components/SearchableInput';

interface AddSubscriptionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback to refresh parent data
}

const AddSubscription: React.FC<AddSubscriptionProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subscriptionNo, setSubscriptionNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    subscriberName: '',
    subscriptionName: '',
    price: '',
    frequency: '',
    purpose: ''
  });

  // Generate subscription number and fetch company names when modal opens
  useEffect(() => {
    if (isOpen) {
      generateSubscriptionNo()
        .then(no => setSubscriptionNo(no))
        .catch(err => {
          console.error('Failed to generate subscription number:', err);
          toast.error('Failed to generate subscription number');
        });

      // Fetch company names from master table
      fetchCompanyNames()
        .then(names => setCompanyOptions(names.filter((n: string) => n)))
        .catch(err => console.error('Failed to fetch company names:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        subscriptionNo,
        companyName: formData.companyName,
        subscriberName: formData.subscriberName,
        subscriptionName: formData.subscriptionName,
        price: formData.price,
        frequency: formData.frequency,
        purpose: formData.purpose
      };

      console.log("Paylodssss", payload)

      await createSubscription(payload);
      toast.success('Subscription added successfully');

      // Reset form
      setFormData({ companyName: '', subscriberName: '', subscriptionName: '', price: '', frequency: '', purpose: '' });

      // Notify parent to refresh data
      if (onSuccess) onSuccess();

      onClose();
    } catch (err) {
      console.error('Failed to create subscription:', err);
      toast.error('Failed to create subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-input sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Add Subscription</h2>
            {subscriptionNo && (
              <span className="text-sm text-indigo-600 font-medium">{subscriptionNo}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          <form id="add-sub-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SearchableInput
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(val) => setFormData({ ...formData, companyName: val })}
                  options={companyOptions}
                  placeholder="Select or type company..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subscriber Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.subscriberName}
                  onChange={e => setFormData({ ...formData, subscriberName: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subscription Name</label>
              <input
                type="text"
                required
                className="w-full p-3 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={formData.subscriptionName}
                onChange={e => setFormData({ ...formData, subscriptionName: e.target.value })}
                placeholder="e.g. Netflix Premium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g. ₹999"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                <select
                  required
                  className="w-full p-3 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                >
                  <option value="" disabled>Select Frequency</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Purpose</label>
              <textarea
                required
                rows={3}
                className="w-full p-3 shadow-input border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                value={formData.purpose}
                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Why is this subscription needed?"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 p-4 sm:p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl shadow-input border-none text-gray-700 font-medium hover:bg-white hover:border-gray-300 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-sub-form"
            disabled={isSubmitting}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {isSubmitting ? 'Saving...' : 'Save Subscription'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddSubscription;
